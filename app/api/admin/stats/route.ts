import { NextResponse } from 'next/server'
import { requireStaffApi } from '@/lib/staff'

const REVENUE_STATUSES = ['paid', 'printing', 'shipped', 'delivered']

/** Dashboard totals computed over all rows, not just the first page. */
export async function GET() {
  const auth = await requireStaffApi()
  if (!auth.ok) return auth.response
  const { supabase } = auth

  const count = (table: string, filter?: (q: any) => any) => {
    let query = supabase.from(table).select('*', { count: 'exact', head: true })
    if (filter) query = filter(query)
    return query.then(({ count }: { count: number | null }) => count ?? 0)
  }

  let revenueCents = 0
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('orders').select('total_cents').in('status', REVENUE_STATUSES).range(from, from + 999)
    if (error) return NextResponse.json({ error: 'Could not load stats' }, { status: 500 })
    revenueCents += (data ?? []).reduce((sum, row) => sum + (row.total_cents || 0), 0)
    if (!data || data.length < 1000) break
  }

  const [orders, pendingOrders, products, customers, openDesigns] = await Promise.all([
    count('orders'),
    count('orders', q => q.eq('status', 'pending')),
    count('products'),
    count('customers'),
    count('studio_designs', q => q.in('status', ['received', 'approved', 'printing'])),
  ])
  return NextResponse.json({ data: { revenueCents, orders, pendingOrders, products, customers, openDesigns } })
}
