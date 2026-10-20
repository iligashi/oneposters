import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!profile || !['owner', 'manager', 'support'].includes(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'Use JPG, PNG, WebP, or AVIF' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image must be smaller than 10MB' }, { status: 400 })

  const productId = String(form.get('productId') || crypto.randomUUID())
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/(^-|-$)/g, '') || 'image'
  const path = `${productId}/${crypto.randomUUID()}-${safeName}`
  const { error: uploadError } = await supabase.storage.from('product-media').upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ error: 'Upload failed' }, { status: 400 })

  const { data: publicUrl } = supabase.storage.from('product-media').getPublicUrl(path)
  if (form.get('productId')) {
    const { error } = await supabase.from('product_images').insert({ product_id: productId, url: publicUrl.publicUrl, alt: String(form.get('alt') || ''), sort_order: Number(form.get('sortOrder') || 0) })
    if (error) return NextResponse.json({ error: 'Image uploaded but could not attach it to the product' }, { status: 400 })
  }
  return NextResponse.json({ url: publicUrl.publicUrl, path })
}
