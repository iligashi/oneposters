import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { crossOriginResponse, isSameOrigin } from '@/lib/security'
import { EDITOR_ROLES, requireStaffApi, type StaffRole, type SupabaseServerClient } from '@/lib/staff'

type ResourceConfig = {
  table: string
  /** Fields staff may write. Empty means read-only. */
  writable: readonly string[]
  /** Query-string filters allowed on GET (exact match). */
  filters?: readonly string[]
  orderBy?: string
  key?: 'id' | 'key'
  read?: StaffRole[]
  write?: StaffRole[]
  select?: string
}

const resources: Record<string, ResourceConfig> = {
  products: { table: 'products', writable: ['title', 'slug', 'description', 'category_id', 'tags', 'status', 'publish_at', 'seo_title', 'seo_description', 'og_image_url'], filters: ['status', 'category_id'], orderBy: 'created_at' },
  product_sizes: { table: 'product_sizes', writable: ['product_id', 'label', 'width_cm', 'height_cm', 'price_cents'], filters: ['product_id'] },
  product_images: { table: 'product_images', writable: ['product_id', 'url', 'alt', 'sort_order'], filters: ['product_id'] },
  frame_options: { table: 'frame_options', writable: ['name', 'color', 'price_cents', 'active'] },
  paper_options: { table: 'paper_options', writable: ['name', 'price_cents', 'active'] },
  categories: { table: 'categories', writable: ['name', 'slug', 'sort_order'] },
  orders: { table: 'orders', writable: ['status', 'payment_status', 'tracking_number', 'notes'], filters: ['id', 'customer_id', 'status', 'payment_status'], orderBy: 'created_at' },
  order_items: { table: 'order_items', writable: [], filters: ['order_id'] },
  customers: { table: 'customers', writable: ['email', 'name', 'phone', 'notes', 'tags'], filters: ['id', 'email'] },
  designs: { table: 'studio_designs', writable: ['status', 'print_file_url', 'mockup_url'], filters: ['customer_id', 'order_id', 'status'], orderBy: 'created_at' },
  discounts: { table: 'discounts', writable: ['code', 'type', 'value', 'min_order_cents', 'usage_limit', 'starts_at', 'ends_at', 'active'], orderBy: 'created_at', read: EDITOR_ROLES },
  posts: { table: 'posts', writable: ['title', 'slug', 'body', 'cover_url', 'status', 'publish_at'], filters: ['status'], orderBy: 'created_at' },
  social_posts: { table: 'social_posts', writable: ['caption', 'image_url', 'scheduled_at', 'status', 'product_id'], orderBy: 'created_at' },
  site_content: { table: 'site_content', writable: ['key', 'value'], key: 'key' },
  staff: { table: 'profiles', writable: ['role'], filters: ['role', 'email'], read: ['owner'], write: ['owner'], select: 'id, full_name, email, role' },
  audit_log: { table: 'audit_log', writable: [], filters: ['entity_type', 'entity_id', 'actor_id'], orderBy: 'created_at', read: EDITOR_ROLES },
}

const ROLES = new Set(['owner', 'manager', 'support', 'customer'])

function config(resource: string) {
  return Object.prototype.hasOwnProperty.call(resources, resource) ? resources[resource] : null
}

function revalidateStore(resource: string) {
  revalidatePath('/')
  revalidatePath('/shop')
  if (resource.startsWith('product')) revalidateTag('catalog', 'max')
}

async function audit(supabase: SupabaseServerClient, actorId: string, action: string, entityType: string, entityId: string | null, after: unknown) {
  const { error } = await supabase.from('audit_log').insert({ actor_id: actorId, action, entity_type: entityType, entity_id: entityId, after })
  if (error) console.error('[oneposters] Audit log write failed:', error.message)
}

async function readJson(request: Request) {
  try {
    const body = await request.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function pick(body: Record<string, unknown>, fields: readonly string[], exclude?: string) {
  return Object.fromEntries(Object.entries(body).filter(([key]) => key !== exclude && fields.includes(key)))
}

function validate(resource: string, payload: Record<string, unknown>): string | null {
  if (resource === 'staff' && 'role' in payload && !ROLES.has(String(payload.role))) return 'Unknown role'
  if (resource === 'discounts') {
    if ('code' in payload) payload.code = String(payload.code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '')
    if ('code' in payload && !payload.code) return 'Discount code is required'
    if ('type' in payload && !['percent', 'fixed'].includes(String(payload.type))) return 'Discount type must be percent or fixed'
    if ('value' in payload && !(Number(payload.value) > 0)) return 'Discount value must be greater than zero'
    if (payload.type === 'percent' && Number(payload.value) > 100) return 'A percentage discount cannot exceed 100'
  }
  if (resource === 'product_sizes' && 'price_cents' in payload && !(Number.isSafeInteger(Number(payload.price_cents)) && Number(payload.price_cents) > 0)) return 'Price must be a positive amount'
  return null
}

export async function GET(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params
  const cfg = config(resource)
  if (!cfg) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })
  const auth = await requireStaffApi(cfg.read)
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const limit = Math.max(1, Math.min(Math.floor(Number(url.searchParams.get('limit')) || 50), 200))
  const offset = Math.max(0, Math.floor(Number(url.searchParams.get('offset')) || 0))
  let query = auth.supabase.from(cfg.table).select(cfg.select ?? '*', { count: 'exact' }).range(offset, offset + limit - 1)
  for (const field of cfg.filters ?? []) {
    const value = url.searchParams.get(field)
    if (value) query = query.eq(field, value)
  }
  if (resource === 'staff' && !url.searchParams.get('role')) query = query.in('role', ['owner', 'manager', 'support'])
  if (cfg.orderBy) query = query.order(cfg.orderBy, { ascending: false })
  else if (resource === 'product_images') query = query.order('sort_order', { ascending: true })
  else if (resource === 'customers') query = query.order('email', { ascending: true })

  const { data, error, count } = await query
  if (error) {
    console.error(`[oneposters] Admin GET ${resource} failed:`, error.message)
    return NextResponse.json({ error: 'Could not load resource' }, { status: 500 })
  }
  return NextResponse.json({ data, count, limit, offset })
}

export async function POST(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  if (!isSameOrigin(request)) return crossOriginResponse()
  const { resource } = await params
  const cfg = config(resource)
  if (!cfg || !cfg.writable.length || resource === 'staff') return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })
  const auth = await requireStaffApi(cfg.write ?? EDITOR_ROLES)
  if (!auth.ok) return auth.response
  const body = await readJson(request)
  if (!body) return NextResponse.json({ error: 'A JSON object is required' }, { status: 400 })
  const payload = pick(body, cfg.writable)
  if (!Object.keys(payload).length) return NextResponse.json({ error: 'No supported fields provided' }, { status: 400 })
  const problem = validate(resource, payload)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const table = auth.supabase.from(cfg.table)
  const { data, error } = cfg.key === 'key'
    ? await table.upsert(payload, { onConflict: 'key' }).select().single()
    : await table.insert(payload).select().single()
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'That value is already in use' : 'Could not create resource' }, { status: 400 })
  await audit(auth.supabase, auth.profile.id, 'create', resource, data?.id ?? data?.key ?? null, data)
  revalidateStore(resource)
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  if (!isSameOrigin(request)) return crossOriginResponse()
  const { resource } = await params
  const cfg = config(resource)
  if (!cfg || !cfg.writable.length) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })
  const auth = await requireStaffApi(cfg.write ?? EDITOR_ROLES)
  if (!auth.ok) return auth.response
  const body = await readJson(request)
  if (!body) return NextResponse.json({ error: 'A JSON object is required' }, { status: 400 })
  const keyField = cfg.key ?? 'id'
  const id = body[keyField]
  if (typeof id !== 'string' || !id) return NextResponse.json({ error: `${keyField} is required` }, { status: 400 })
  if (resource === 'staff' && id === auth.profile.id) return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 })
  const payload = pick(body, cfg.writable, keyField)
  if (!Object.keys(payload).length) return NextResponse.json({ error: 'No supported fields provided' }, { status: 400 })
  const problem = validate(resource, payload)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const { data: before } = await auth.supabase.from(cfg.table).select(cfg.select ?? '*').eq(keyField, id).maybeSingle()
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data, error } = await auth.supabase.from(cfg.table).update(payload).eq(keyField, id).select(cfg.select ?? '*').single()
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'That value is already in use' : 'Could not update resource' }, { status: 400 })
  await audit(auth.supabase, auth.profile.id, 'update', resource, id, { before, after: data })
  revalidateStore(resource)
  return NextResponse.json({ data })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  if (!isSameOrigin(request)) return crossOriginResponse()
  const { resource } = await params
  const cfg = config(resource)
  if (!cfg || !cfg.writable.length || resource === 'staff' || resource === 'orders' || resource === 'customers') {
    return NextResponse.json({ error: 'This record cannot be deleted' }, { status: 405 })
  }
  const auth = await requireStaffApi(cfg.write ?? EDITOR_ROLES)
  if (!auth.ok) return auth.response
  const keyField = cfg.key ?? 'id'
  const url = new URL(request.url)
  const id = url.searchParams.get(keyField) || url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: `${keyField} is required` }, { status: 400 })

  if (resource === 'products') {
    const { count } = await auth.supabase.from('order_items').select('*', { count: 'exact', head: true }).eq('product_id', id)
    if (count) return NextResponse.json({ error: 'This product has orders. Archive it instead of deleting it.' }, { status: 409 })
  }

  const { data: before } = await auth.supabase.from(cfg.table).select('*').eq(keyField, id).maybeSingle()
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { error } = await auth.supabase.from(cfg.table).delete().eq(keyField, id)
  if (error) return NextResponse.json({ error: error.code === '23503' ? 'Other records still use this item' : 'Could not delete resource' }, { status: 400 })
  await audit(auth.supabase, auth.profile.id, 'delete', resource, id, { before })
  revalidateStore(resource)
  return NextResponse.json({ ok: true })
}
