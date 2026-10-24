import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!profile || !['owner', 'manager'].includes(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let form: FormData
  try { form = await request.formData() } catch { return NextResponse.json({ error: 'Invalid upload form' }, { status: 400 }) }
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'Use JPG, PNG, WebP, or AVIF' }, { status: 400 })
  if (file.size === 0) return NextResponse.json({ error: 'Image file is empty' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image must be smaller than 10MB' }, { status: 400 })

  const suppliedProductId = form.get('productId')
  const productId = typeof suppliedProductId === 'string' && suppliedProductId ? suppliedProductId : crypto.randomUUID()
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/(^-|-$)/g, '') || 'image'
  const path = `${productId}/${crypto.randomUUID()}-${safeName}`
  let blob
  try {
    blob = await put(`products/${path}`, file, { access: 'public', addRandomSuffix: false, contentType: file.type })
  } catch (error) {
    console.error('[v0] Product Blob upload failed:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 400 })
  }

  if (suppliedProductId) {
    const { data: existingImages, error: lookupError } = await supabase.from('product_images').select('id').eq('product_id', productId).order('sort_order', { ascending: true }).limit(1)
    if (lookupError) return NextResponse.json({ error: 'Image uploaded but could not update the product image' }, { status: 400 })
    const image = { url: blob.url, alt: String(form.get('alt') || '') }
    const result = existingImages?.length
      ? await supabase.from('product_images').update(image).eq('id', existingImages[0].id)
      : await supabase.from('product_images').insert({ ...image, product_id: productId, sort_order: 0 })
    if (result.error) return NextResponse.json({ error: 'Image uploaded but could not attach it to the product' }, { status: 400 })
  }
  return NextResponse.json({ url: blob.url, path: blob.pathname })
}
