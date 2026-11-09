import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { discountCents, discountProblem, normalizePromoCode, type DiscountRule } from '@/lib/orders'
import { clientIp, crossOriginResponse, isSameOrigin, rateLimit, rateLimitResponse } from '@/lib/security'

/** Checks a promo code for the cart. The order API re-checks it when the order is placed. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse()
  const limited = rateLimit(`promo:${clientIp(request)}`, 10, 10 * 60 * 1000)
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSeconds)

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }
  const code = normalizePromoCode(body?.code)
  const subtotalCents = Number(body?.subtotalCents)
  if (!code || !Number.isSafeInteger(subtotalCents) || subtotalCents < 0) return NextResponse.json({ error: 'Enter a promo code' }, { status: 400 })

  try {
    const { data } = await createAdminClient().from('discounts').select('*').eq('code', code).maybeSingle()
    const problem = data ? discountProblem(data as DiscountRule, subtotalCents) : 'That promo code is not valid'
    if (problem) return NextResponse.json({ error: problem }, { status: 400 })
    const rule = data as DiscountRule
    return NextResponse.json({ code: rule.code, type: rule.type, value: Number(rule.value), minOrderCents: rule.min_order_cents ?? 0, discountCents: discountCents(rule, subtotalCents) })
  } catch (error) {
    console.error('[oneposters] Promo check failed:', error)
    return NextResponse.json({ error: 'Could not check that promo code' }, { status: 500 })
  }
}
