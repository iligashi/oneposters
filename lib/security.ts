import { NextResponse } from 'next/server'

export { safeNextPath } from './redirect'

/** True when the request has no Origin header (same-origin GET/navigation) or a matching one. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return request.headers.get('sec-fetch-site') !== 'cross-site'
  return origin === new URL(request.url).origin
}

export function crossOriginResponse() {
  return NextResponse.json({ error: 'Cross-origin request denied' }, { status: 403 })
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number }

/** Shared counter store; returns null when it is unavailable. */
export type RateLimitStore = (key: string, limit: number, windowSeconds: number) => Promise<RateLimitResult | null>

/** Postgres-backed store (public.rate_limit_hit), shared by every server instance. */
export const supabaseRateLimitStore: RateLimitStore = async (key, limit, windowSeconds) => {
  try {
    const { createAdminClient } = await import('./supabase/admin')
    const { data, error } = await createAdminClient().rpc('rate_limit_hit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    const row = Array.isArray(data) ? data[0] : data
    if (error || !row) {
      if (error) console.error('[oneposters] Shared rate limit unavailable:', error.message)
      return null
    }
    return { ok: row.allowed === true, remaining: Number(row.remaining), retryAfterSeconds: Number(row.retry_after_seconds) }
  } catch (error) {
    console.error('[oneposters] Shared rate limit unavailable:', error)
    return null
  }
}

/**
 * Rate limit shared across serverless instances. If the shared store is down
 * it degrades to the per-instance in-memory limiter rather than failing open.
 * Both counters are updated, so a store outage cannot reset a client's budget.
 */
export async function rateLimit(key: string, limit: number, windowMs: number, store: RateLimitStore = supabaseRateLimitStore): Promise<RateLimitResult> {
  const local = rateLimitLocal(key, limit, windowMs)
  const shared = await store(key, limit, Math.max(1, Math.ceil(windowMs / 1000)))
  if (!shared) return local
  if (!local.ok && shared.ok) return local
  return shared
}

/**
 * Fixed-window rate limiter kept in memory per server instance. It stops bursts
 * from a single client; on its own it is not a global limit across instances.
 */
export function rateLimitLocal(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
    }
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }
  bucket.count += 1
  const ok = bucket.count <= limit
  return { ok, remaining: Math.max(0, limit - bucket.count), retryAfterSeconds: ok ? 0 : Math.ceil((bucket.resetAt - now) / 1000) }
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  )
}

/** Verifies a Cloudflare Turnstile token when TURNSTILE_SECRET_KEY is configured. */
export async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (typeof token !== 'string' || !token || token.length > 2048) return false
  try {
    const body = new URLSearchParams({ secret, response: token })
    if (ip !== 'unknown') body.set('remoteip', ip)
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
    const result = (await response.json()) as { success?: boolean }
    return result.success === true
  } catch {
    return false
  }
}
