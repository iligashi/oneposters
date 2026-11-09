import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { isAllowedRasterImage } from '@/lib/upload-validation'
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, safeFileName } from '@/lib/blob'
import { crossOriginResponse, isSameOrigin } from '@/lib/security'
import { EDITOR_ROLES, requireStaffApi } from '@/lib/staff'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Uploads a product image and appends it to the product's gallery. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse()
  if (Number(request.headers.get('content-length') || 0) > MAX_IMAGE_BYTES + 64 * 1024) return NextResponse.json({ error: 'Upload request is too large' }, { status: 413 })
  const auth = await requireStaffApi(EDITOR_ROLES)
  if (!auth.ok) return auth.response
  const { supabase, profile } = auth

  let form: FormData
  try { form = await request.formData() } catch { return NextResponse.json({ error: 'Invalid upload form' }, { status: 400 }) }
  const file = form.get('file')
  const productId = form.get('productId')
  if (typeof productId !== 'string' || !UUID.test(productId)) return NextResponse.json({ error: 'Save the product before adding images' }, { status: 400 })
  if (!(file instanceof File)) return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return NextResponse.json({ error: 'Use JPG, PNG, WebP, or AVIF' }, { status: 400 })
  if (file.size === 0) return NextResponse.json({ error: 'Image file is empty' }, { status: 400 })
  if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Image must be smaller than 10MB' }, { status: 400 })
  if (!(await isAllowedRasterImage(file))) return NextResponse.json({ error: 'Image content does not match its file type' }, { status: 400 })

  const { data: product } = await supabase.from('products').select('id').eq('id', productId).maybeSingle()
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  let blob
  try {
    blob = await put(`products/${productId}/${crypto.randomUUID()}-${safeFileName(file.name)}`, file, { access: 'public', addRandomSuffix: false, contentType: file.type })
  } catch (error) {
    console.error('[oneposters] Product image upload failed:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 502 })
  }

  const { data: last } = await supabase.from('product_images').select('sort_order').eq('product_id', productId).order('sort_order', { ascending: false }).limit(1)
  const sortOrder = (last?.[0]?.sort_order ?? -1) + 1
  const alt = String(form.get('alt') || '').trim().slice(0, 500)
  const { data: image, error } = await supabase.from('product_images').insert({ product_id: productId, url: blob.url, alt, sort_order: sortOrder }).select().single()
  if (error) return NextResponse.json({ error: 'Image uploaded but could not be attached to the product' }, { status: 400 })

  const { error: auditError } = await supabase.from('audit_log').insert({ actor_id: profile.id, action: 'create', entity_type: 'product_images', entity_id: image.id, after: image })
  if (auditError) console.error('[oneposters] Audit log write failed:', auditError.message)
  return NextResponse.json({ data: image }, { status: 201 })
}
