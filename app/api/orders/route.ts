import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCustomPrintPriceCents } from '@/lib/pricing'

type OrderItemInput = {
  productId?: unknown
  productSlug?: unknown
  title?: unknown
  price?: unknown
  quantity?: unknown
  size?: unknown
  frame?: unknown
  paper?: unknown
  isCustom?: unknown
}

const text = (value: unknown, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const productFrameAddonsCents: Record<string, number> = { none: 0, black: 1200, white: 1200, oak: 1800 }

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Cross-origin request denied' }, { status: 403 })
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 64 * 1024) return NextResponse.json({ error: 'Request is too large' }, { status: 413 })
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return NextResponse.json({ error: 'Expected a JSON request' }, { status: 415 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const email = text(body.email, 254).toLowerCase()
  const name = text(body.name, 120)
  const address = text(body.address, 240)
  const city = text(body.city, 120)
  const zip = text(body.zip, 32)
  const items = body.items
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || !address || !city || !zip) {
    return NextResponse.json({ error: 'Enter valid contact and delivery details' }, { status: 400 })
  }
  if (!Array.isArray(items) || items.length < 1 || items.length > 20 || items.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
    return NextResponse.json({ error: 'Your order must contain between 1 and 20 valid items' }, { status: 400 })
  }

  const delivery = body.delivery
  if (delivery !== 'standard' && delivery !== 'express') return NextResponse.json({ error: 'Choose a valid delivery option' }, { status: 400 })
  if (body.promo && body.promo !== 'WELCOME10') return NextResponse.json({ error: 'That promo code is not valid' }, { status: 400 })

  try {
    const supabase = await createClient()
    const normalized = await Promise.all((items as OrderItemInput[]).map(async (item) => {
      const quantity = Number(item.quantity)
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return null

      if (item.isCustom === true) {
        const priceCents = getCustomPrintPriceCents(text(item.size, 40), text(item.frame, 40), text(item.paper, 40))
        if (item.productId || priceCents === null) return null
        return {
          product_id: null,
          title_snapshot: text(item.title, 160) || 'Custom poster',
          size_label: text(item.size, 40),
          frame_name: text(item.frame, 40),
          paper_name: text(item.paper, 40),
          unit_price_cents: priceCents,
          quantity,
        }
      }

      const productSlug = text(item.productSlug, 160)
      const productLookup = supabase.from('products')
        .select('id, title, product_sizes(label, price_cents)')
        .eq('status', 'published')
      const productQuery = typeof item.productId === 'string' && item.productId
        ? productLookup.eq('id', item.productId)
        : productSlug ? productLookup.eq('slug', productSlug) : null
      if (!productQuery) return null
      const { data: product, error } = await productQuery.maybeSingle()
      if (error || !product) return null

      const sizes = (product.product_sizes || []) as Array<{ label: string; price_cents: number }>
      const requestedSize = text(item.size, 40)
      const selectedSize = requestedSize ? sizes.find(size => size.label === requestedSize) : [...sizes].sort((a, b) => a.price_cents - b.price_cents)[0]
      const frame = text(item.frame || 'none', 40)
      const frameAddon = productFrameAddonsCents[frame]
      if (!selectedSize || !Number.isSafeInteger(selectedSize.price_cents) || selectedSize.price_cents < 1 || frameAddon === undefined) return null

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

    if (normalized.some(item => item === null)) return NextResponse.json({ error: 'One or more items are no longer available or have invalid options' }, { status: 400 })
    const orderItems = normalized.filter((item): item is NonNullable<typeof item> => item !== null)
    const subtotalCents = orderItems.reduce((sum, item) => sum + item.unit_price_cents * item.quantity, 0)
    if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 1 || subtotalCents > 2_000_000) return NextResponse.json({ error: 'Order total is outside the allowed range' }, { status: 400 })

    const shippingCents = subtotalCents >= 7500 ? 0 : delivery === 'express' ? 990 : 490
    const discountCents = body.promo === 'WELCOME10' ? Math.round(subtotalCents * 0.1) : 0
    const totalCents = subtotalCents - discountCents + shippingCents

    const { data: customer, error: customerError } = await supabase.from('customers').upsert({ email, name }, { onConflict: 'email' }).select('id').single()
    if (customerError) throw customerError
    const orderNumber = `OP-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`
    const { data: order, error: orderError } = await supabase.from('orders').insert({
      order_number: orderNumber,
      customer_id: customer.id,
      status: 'pending',
      payment_status: 'pending',
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      discount_cents: discountCents,
      tax_cents: 0,
      total_cents: totalCents,
      currency: 'EUR',
      shipping_address: { name, email, address, city, zip },
    }).select('id,order_number').single()
    if (orderError) throw orderError
    const { error: itemsError } = await supabase.from('order_items').insert(orderItems.map(item => ({ ...item, order_id: order.id })))
    if (itemsError) {
      await supabase.from('orders').delete().eq('id', order.id)
      throw itemsError
    }
    return NextResponse.json({ orderNumber: order.order_number, subtotalCents, shippingCents, discountCents, totalCents, currency: 'EUR' }, { status: 201 })
  } catch (error) {
    console.error('[oneposters] Order request failed:', error)
    return NextResponse.json({ error: 'Could not create order request' }, { status: 500 })
  }
}
