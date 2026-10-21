import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name, address, city, zip, items, subtotalCents, totalCents } = body
    if (!email || !name || !items?.length) return NextResponse.json({ error: 'Missing checkout details' }, { status: 400 })
    const supabase = await createClient()
    const { data: customer, error: customerError } = await supabase.from('customers').upsert({ email, name }, { onConflict: 'email' }).select('id').single()
    if (customerError) throw customerError
    const orderNumber = `OP-${Date.now().toString().slice(-8)}`
    const { data: order, error: orderError } = await supabase.from('orders').insert({ order_number: orderNumber, customer_id: customer.id, status: 'pending', payment_status: 'pending', subtotal_cents: subtotalCents, shipping_cents: 0, discount_cents: 0, tax_cents: 0, total_cents: totalCents, currency: 'EUR', shipping_address: { name, email, address, city, zip } }).select('id,order_number').single()
    if (orderError) throw orderError
    const { error: itemsError } = await supabase.from('order_items').insert(items.map((item: any) => ({ order_id: order.id, product_id: item.productId || null, title_snapshot: item.title, size_label: item.size || null, frame_name: item.frame || null, paper_name: item.paper || null, unit_price_cents: Math.round(item.price * 100), quantity: item.quantity })))
    if (itemsError) throw itemsError
    return NextResponse.json({ orderNumber }, { status: 201 })
  } catch (error) {
    console.error('[v0] Order creation failed:', error)
    return NextResponse.json({ error: 'Could not create order' }, { status: 500 })
  }
}
