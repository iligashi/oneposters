import { describe, expect, it } from 'vitest'
import { safeNextPath } from '@/lib/redirect'
import { isSameOrigin, rateLimit, rateLimitLocal, type RateLimitStore } from '@/lib/security'

describe('safeNextPath', () => {
  it('keeps same-site paths with query and hash', () => {
    expect(safeNextPath('/admin')).toBe('/admin')
    expect(safeNextPath('/shop?category=Art#top')).toBe('/shop?category=Art#top')
  })

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/\\/evil.example',
    '\\\\evil.example',
    '/\tevil.example',
    'javascript:alert(1)',
    '',
    null,
    undefined,
  ])('rejects %j', value => {
    expect(safeNextPath(value as string, '/fallback')).toBe('/fallback')
  })
})

describe('isSameOrigin', () => {
  const request = (headers: Record<string, string>) => new Request('https://oneposters.studio/api/orders', { method: 'POST', headers })
  it('accepts matching or missing origins', () => {
    expect(isSameOrigin(request({ origin: 'https://oneposters.studio' }))).toBe(true)
    expect(isSameOrigin(request({}))).toBe(true)
  })
  it('rejects other origins and cross-site fetches', () => {
    expect(isSameOrigin(request({ origin: 'https://evil.example' }))).toBe(false)
    expect(isSameOrigin(request({ 'sec-fetch-site': 'cross-site' }))).toBe(false)
  })
})

describe('rateLimitLocal', () => {
  it('allows up to the limit within a window, then blocks until reset', () => {
    const key = `test-${Math.random()}`
    const now = 1_000_000
    expect(rateLimitLocal(key, 2, 1000, now).ok).toBe(true)
    expect(rateLimitLocal(key, 2, 1000, now + 1).ok).toBe(true)
    const blocked = rateLimitLocal(key, 2, 1000, now + 2)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSeconds).toBe(1)
    expect(rateLimitLocal(key, 2, 1000, now + 1001).ok).toBe(true)
  })
})

describe('rateLimit (shared)', () => {
  it('uses the shared store so limits hold across instances', async () => {
    const store: RateLimitStore = async () => ({ ok: false, remaining: 0, retryAfterSeconds: 42 })
    const result = await rateLimit(`shared-${Math.random()}`, 5, 60_000, store)
    expect(result).toEqual({ ok: false, remaining: 0, retryAfterSeconds: 42 })
  })

  it('passes the window to the store in seconds', async () => {
    const calls: unknown[][] = []
    const store: RateLimitStore = async (...args) => {
      calls.push(args)
      return { ok: true, remaining: 4, retryAfterSeconds: 0 }
    }
    await rateLimit('orders:1.2.3.4', 5, 10 * 60 * 1000, store)
    expect(calls).toEqual([['orders:1.2.3.4', 5, 600]])
  })

  it('falls back to the in-memory limiter instead of failing open', async () => {
    const down: RateLimitStore = async () => null
    const key = `down-${Math.random()}`
    expect((await rateLimit(key, 1, 60_000, down)).ok).toBe(true)
    expect((await rateLimit(key, 1, 60_000, down)).ok).toBe(false)
  })

  it('keeps blocking a client the local limiter has blocked', async () => {
    const lenient: RateLimitStore = async () => ({ ok: true, remaining: 1, retryAfterSeconds: 0 })
    const key = `burst-${Math.random()}`
    await rateLimit(key, 1, 60_000, lenient)
    expect((await rateLimit(key, 1, 60_000, lenient)).ok).toBe(false)
  })
})
