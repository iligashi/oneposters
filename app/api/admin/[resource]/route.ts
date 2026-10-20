import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const resources = {
  products: ['id', 'title', 'slug', 'description', 'category_id', 'tags', 'status', 'publish_at', 'seo_title', 'seo_description', 'og_image_url'],
  categories: ['id', 'name', 'slug', 'sort_order'],
  orders: ['id', 'order_number', 'customer_id', 'status', 'payment_status', 'tracking_number', 'notes'],
  customers: ['id', 'email', 'name', 'phone', 'notes', 'tags'],
  designs: ['id', 'customer_id', 'original_image_url', 'settings', 'size_label', 'frame', 'paper', 'mockup_url', 'status', 'print_file_url'],
  discounts: ['id', 'code', 'type', 'value', 'min_order_cents', 'usage_limit', 'starts_at', 'ends_at', 'active'],
  posts: ['id', 'title', 'slug', 'body', 'cover_url', 'status', 'publish_at'],
  social_posts: ['id', 'caption', 'image_url', 'scheduled_at', 'status', 'product_id'],
  site_content: ['key', 'value'],
} as const
const tables = { designs: 'studio_designs' as const, products: 'products' as const, categories: 'categories' as const, orders: 'orders' as const, customers: 'customers' as const, discounts: 'discounts' as const, posts: 'posts' as const, social_posts: 'social_posts' as const, site_content: 'site_content' as const }

async function staff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!profile || !['owner', 'manager', 'support'].includes(profile.role)) return { supabase, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { supabase }
}

export async function GET(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params
  if (!(resource in tables)) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })
  const auth = await staff(); if (auth.response) return auth.response
  const url = new URL(request.url); const limit = Math.min(Number(url.searchParams.get('limit') || 100), 200)
  let query = auth.supabase.from(tables[resource as keyof typeof tables]).select('*').limit(limit)
  if (resource !== 'categories' && resource !== 'site_content') query = query.order('created_at', { ascending: false })
  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Could not load resource' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params; const keys = resources[resource as keyof typeof resources]
  if (!keys || !(resource in tables)) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })
  const auth = await staff(); if (auth.response) return auth.response
  const body = await request.json(); const payload = Object.fromEntries(Object.entries(body).filter(([key]) => keys.includes(key as never)))
  const { data, error } = await auth.supabase.from(tables[resource as keyof typeof tables]).insert(payload).select().single()
  if (error) return NextResponse.json({ error: 'Could not create resource' }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params; const keys = resources[resource as keyof typeof resources]
  if (!keys || !(resource in tables)) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })
  const auth = await staff(); if (auth.response) return auth.response
  const body = await request.json(); const id = body.id; if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  const payload = Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'id' && keys.includes(key as never)))
  const { data, error } = await auth.supabase.from(tables[resource as keyof typeof tables]).update(payload).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: 'Could not update resource' }, { status: 400 })
  return NextResponse.json({ data })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params
  if (!(resource in tables)) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })
  const auth = await staff(); if (auth.response) return auth.response
  const id = new URL(request.url).searchParams.get('id'); if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  const { error } = await auth.supabase.from(tables[resource as keyof typeof tables]).delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Could not delete resource' }, { status: 400 })
  return NextResponse.json({ ok: true })
}
