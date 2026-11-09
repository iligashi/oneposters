import { head } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCustomPrintPriceCents, normalizeSizeLabel, productFrameAddonsCents, shippingCents } from '@/lib/pricing'
import { discountCents, discountProblem, isStudioArtworkPath, normalizePromoCode, parseContact, parseQuantity, sanitizeDesignSettings, text, type DiscountRule } from '@/lib/orders'
import { clientIp, crossOriginResponse, isSameOrigin, rateLimit, rateLimitResponse, verifyTurnstile } from '@/lib/security'

type OrderItemInput = {
  productId?: unknown
  productSlug?: unknown
  title?: unknown
  quantity?: unknown
  size?: unknown
  frame?: unknown
  paper?: unknown
  isCustom?: unknown
  artworkPath?: unknown
  settings?: unknown
}

type OrderItemRow = {
  product_id: string | null
  title_snapshot: string
  size_label: string
  frame_name: string | null
  paper_name: string | null
  unit_price_cents: number
  quantity: number
}

type DesignRow = { original_image_url: string; settings: Record<string, unknown>; size_label: string; frame: string; paper: string; status: 'received' }

class OrderInputError extends Error {}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse()
  const ip = clientIp(request)
  const limited = rateLimit(`orders:${ip}`, 5, 10 * 60 * 1000)
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSeconds)

  if (Number(request.headers.get('content-length') || 0) > 64 * 1024) return NextResponse.json({ error: 'Request is too large' }, { status: 413 })
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return NextResponse.json({ error: 'Expected a JSON request' }, { status: 415 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  if (!(await verifyTurnstile(body.captchaToken, ip))) return NextResponse.json({ error: 'Please complete the security check and try again' }, { status: 400 })

  const contact = parseContact(body)
  if (!contact) return NextResponse.json({ error: 'Enter valid contact and delivery details' }, { status: 400 })
  const items = body.items
  if (!Array.isArray(items) || items.length < 1 || items.length > 20 || items.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
    return NextResponse.json({ error: 'Your order must contain between 1 and 20 valid items' }, { status: 400 })
  }
  const delivery = body.delivery
  if (delivery !== 'standard' && delivery !== 'express') return NextResponse.json({ error: 'Choose a valid delivery option' }, { status: 400 })

  try {
    const supabase = createAdminClient()
    const designs: DesignRow[] = []

    const orderItems: OrderItemRow[] = await Promise.all((items as OrderItemInput[]).map(async (item): Promise<OrderItemRow> => {
      const quantity = parseQuantity(item.quantity)
      if (!quantity) throw new OrderInputError('One or more items have an invalid quantity')

      if (item.isCustom === true) {
        const size = normalizeSizeLabel(text(item.size, 40))
        const frame = text(item.frame, 40)
        const paper = text(item.paper, 40)
        const priceCents = getCustomPrintPriceCents(size, frame, paper)
        if (item.productId || priceCents === null) throw new OrderInputError('A custom print has invalid options')
        if (!isStudioArtworkPath(item.artworkPath)) throw new OrderInputError('Upload your artwork in the studio before ordering a custom print')
        const stored = await head(item.artworkPath).catch(() => null)
        if (!stored) throw new OrderInputError('We could not find the artwork for a custom print. Please upload it again')
        designs.push({ original_image_url: item.artworkPath, settings: { ...sanitizeDesignSettings(item.settings), quantity }, size_label: size, frame, paper, status: 'received' })
        return { product_id: null, title_snapshot: text(item.title, 160) || 'Custom poster', size_label: size, frame_name: frame, paper_name: paper, unit_price_cents: priceCents, quantity }
      }

      const productSlug = text(item.productSlug, 160)
      const lookup = supabase.from('products').select('id, title, product_sizes(label, price_cents)').eq('status', 'published')
      const query = typeof item.productId === 'string' && item.productId ? lookup.eq('id', item.productId) : productSlug ? lookup.eq('slug', productSlug) : null
      if (!query) throw new OrderInputError('One or more items are no longer available')
      const { data: product, error } = await query.maybeSingle()
      if (error || !product) throw new OrderInputError('One or more items are no longer available')

      const sizes = (product.product_sizes || []) as Array<{ label: string; price_cents: number }>
      const requestedSize = normalizeSizeLabel(text(item.size, 40))
      const selectedSize = requestedSize ? sizes.find(size => size.label === requestedSize) : [...sizes].sort((a, b) => a.price_cents - b.price_cents)[0]
      const frame = text(item.frame || 'none', 40)
      const frameAddon = productFrameAddonsCents[frame as keyof typeof productFrameAddonsCents]
      if (!selectedSize || !Number.isSafeInteger(selectedSize.price_cents) || selectedSize.price_cents < 1 || frameAddon === undefined) {
        throw new OrderInputError(`"${product.title}" is not available in the selected size or frame`)
      }
      return {
        product_id: product.id,
        title_snapshot: product.title,
        size_label: selectedSize.label,
        frame_name: frame === 'none' ? null : frame,
        paper_name: text(item.paper, 40) || null,
        unit_price_cents: selectedSize.price_cents + frameAddon,
        quantity,
      }
    }))

    const subtotalCents = orderItems.reduce((sum, item) => sum + item.unit_price_cents * item.quantity, 0)
    if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 1 || subtotalCents > 2_000_000) return NextResponse.json({ error: 'Order total is outside the allowed range' }, { status: 400 })

    let discount: DiscountRule | null = null
    const promo = normalizePromoCode(body.promo)
    if (promo) {
      const { data } = await supabase.from('discounts').select('*').eq('code', promo).maybeSingle()
      const problem = data ? discountProblem(data as DiscountRule, subtotalCents) : 'That promo code is not valid'
      if (problem) return NextResponse.json({ error: problem }, { status: 400 })
      discount = data as DiscountRule
    }

    const discount_cents = discount ? discountCents(discount, subtotalCents) : 0
    const shipping_cents = shippingCents(subtotalCents, delivery)
    const total_cents = subtotalCents - discount_cents + shipping_cents
    const orderNumber = `OP-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`

    const { data: created, error } = await supabase.rpc('create_order', {
      p_customer: { email: contact.email, name: contact.name },
      p_order: {
        order_number: orderNumber, status: 'pending', payment_status: 'pending',
        subtotal_cents: subtotalCents, shipping_cents, discount_cents, tax_cents: 0, total_cents, currency: 'EUR',
        shipping_address: contact, discount_code: discount?.code ?? null,
      },
      p_items: orderItems,
      p_designs: designs,
      p_discount_id: discount ? String(discount.id) : null,
    })
    if (error) {
      if (error.message?.includes('discount_exhausted')) return NextResponse.json({ error: 'That promo code has been fully redeemed' }, { status: 400 })
      throw error
    }
    const result = created as { order_number: string }
    return NextResponse.json({ orderNumber: result.order_number, subtotalCents, shippingCents: shipping_cents, discountCents: discount_cents, totalCents: total_cents, currency: 'EUR' }, { status: 201 })
  } catch (error) {
    if (error instanceof OrderInputError) return NextResponse.json({ error: error.message }, { status: 400 })
    console.error('[oneposters] Order request failed:', error)
    return NextResponse.json({ error: 'Could not create order request' }, { status: 500 })
  }
}
