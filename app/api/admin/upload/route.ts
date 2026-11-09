import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { detectRasterImageType, EXTENSION_FOR_TYPE } from '@/lib/upload-validation'
import { MAX_IMAGE_BYTES, safeFileName } from '@/lib/blob'
import { crossOriginResponse, isSameOrigin } from '@/lib/security'
import { EDITOR_ROLES, requireStaffApi } from '@/lib/staff'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function reject(message: string, file?: File) {
  console.warn('[oneposters] Product image rejected:', message, file ? { name: file.name, type: file.type, size: file.size } : '')
  return NextResponse.json({ error: message }, { status: 400 })
}

function withExtension(name: string, extension: string) {
  return `${name.replace(/\.[a-z0-9]{1,5}$/i, '') || 'image'}.${extension}`
}

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
  if (file.size === 0) return reject('Image file is empty', file)
  if (file.size > MAX_IMAGE_BYTES) return reject('Image must be smaller than 10 MB', file)
  // Trust the file's contents, not its name: a WebP saved as ".png" is still a valid image.
  const imageType = await detectRasterImageType(file)
  if (!imageType) return reject('This file is not a JPG, PNG, WebP or AVIF image', file)

  const { data: product } = await supabase.from('products').select('id').eq('id', productId).maybeSingle()
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  let blob
  try {
    blob = await put(`products/${productId}/${crypto.randomUUID()}-${safeFileName(withExtension(file.name, EXTENSION_FOR_TYPE[imageType]))}`, file, { access: 'public', addRandomSuffix: false, contentType: imageType })
  } catch (error) {
    console.error('[oneposters] Product image upload failed:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 502 })
  }

  const { data: last } = await supabase.from('product_images').select('sort_order').eq('product_id', productId).order('sort_order', { ascending: false }).limit(1)
  const sortOrder = (last?.[0]?.sort_order ?? -1) + 1
  const alt = String(form.get('alt') || '').trim().slice(0, 500)
  const { data: image, error } = await supabase.from('product_images').insert({ product_id: productId, url: blob.url, alt, sort_order: sortOrder }).select().single()
  if (error) {
    console.error('[oneposters] Could not attach product image:', error.message)
    return NextResponse.json({ error: 'Image uploaded but could not be attached to the product' }, { status: 400 })
  }

  const { error: auditError } = await supabase.from('audit_log').insert({ actor_id: profile.id, action: 'create', entity_type: 'product_images', entity_id: image.id, after: image })
  if (auditError) console.error('[oneposters] Audit log write failed:', auditError.message)
  return NextResponse.json({ data: image }, { status: 201 })
}
