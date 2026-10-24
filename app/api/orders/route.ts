import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type OrderItemInput = {
  productId?: unknown
  title?: unknown
  price?: unknown
  quantity?: unknown
  size?: unknown
  frame?: unknown
  paper?: unknown
}

const text = (value: unknown, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : ''

export async function POST(request: Request) {
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
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) return NextResponse.json({ error: 'Your order must contain between 1 and 20 items' }, { status: 400 })

  const normalized = (items as OrderItemInput[]).map((item) => {
    const price = Number(item?.price)
    const quantity = Number(item?.quantity)
    return {
      product_id: typeof item?.productId === 'string' ? item.productId : null,
      title_snapshot: text(item?.title, 160),
      size_label: text(item?.size, 40) || null,
      frame_name: text(item?.frame, 40) || null,
      paper_name: text(item?.paper, 40) || null,
      unit_price_cents: Math.round(price * 100),
      quantity,
    }
  })
  if (normalized.some(item => !item.title_snapshot || !Number.isFinite(item.unit_price_cents) || item.unit_price_cents < 1 || item.unit_price_cents > 100000 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)) {
    return NextResponse.json({ error: 'One or more order items are invalid' }, { status: 400 })
  }
  const subtotalCents = normalized.reduce((sum, item) => sum + item.unit_price_cents * item.quantity, 0)
  const submittedShipping = Number(body.shippingCents)
  const shippingCents = subtotalCents >= 7500 ? 0 : submittedShipping
  if (shippingCents !== 0 && shippingCents !== 490 && shippingCents !== 990) return NextResponse.json({ error: 'Invalid delivery option' }, { status: 400 })
  const totalCents = Number(body.totalCents)
  const submittedSubtotal = Number(body.subtotalCents)
  const permittedTotals = body.promo === 'WELCOME10'
    ? [subtotalCents + shippingCents, Math.round(subtotalCents * 0.9) + shippingCents]
    : [subtotalCents + shippingCents]
  if (submittedSubtotal !== subtotalCents || !permittedTotals.includes(totalCents) || submittedShipping !== shippingCents) {
    return NextResponse.json({ error: 'Order totals changed. Refresh checkout and try again.' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
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
      discount_cents: subtotalCents + shippingCents - totalCents,
      tax_cents: 0,
      total_cents: totalCents,
      currency: 'EUR',
      shipping_address: { name, email, address, city, zip },
    }).select('id,order_number').single()
    if (orderError) throw orderError
    const { error: itemsError } = await supabase.from('order_items').insert(normalized.map(item => ({ ...item, order_id: order.id })))
    if (itemsError) {
      await supabase.from('orders').delete().eq('id', order.id)
      throw itemsError
    }
    return NextResponse.json({ orderNumber: order.order_number }, { status: 201 })
  } catch (error) {
    console.error('[oneposters] Order request failed:', error)
    return NextResponse.json({ error: 'Could not create order request' }, { status: 500 })
  }
}
