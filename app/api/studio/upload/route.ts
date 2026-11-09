import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAllowedRasterImage } from '@/lib/upload-validation'
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, safeFileName, studioBlobAccess } from '@/lib/blob'
import { crossOriginResponse, isSameOrigin, rateLimit, rateLimitResponse } from '@/lib/security'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse()
  if (Number(request.headers.get('content-length') || 0) > MAX_IMAGE_BYTES + 64 * 1024) return NextResponse.json({ error: 'Upload request is too large.' }, { status: 413 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to upload an image.', signIn: true }, { status: 401 })

  const limited = rateLimit(`studio-upload:${user.id}`, 20, 60 * 60 * 1000)
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSeconds)

  let form: FormData
  try { form = await request.formData() } catch { return NextResponse.json({ error: 'Invalid upload form.' }, { status: 400 }) }
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Image file is required.' }, { status: 400 })
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return NextResponse.json({ error: 'Use JPG, PNG, WebP, or AVIF.' }, { status: 400 })
  if (file.size === 0) return NextResponse.json({ error: 'Image file is empty.' }, { status: 400 })
  if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Image must be smaller than 10MB.' }, { status: 400 })
  if (!(await isAllowedRasterImage(file))) return NextResponse.json({ error: 'Image content does not match its file type.' }, { status: 400 })

  try {
    const access = studioBlobAccess()
    const blob = await put(`studio/${user.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`, file, { access, addRandomSuffix: false, contentType: file.type })
    return NextResponse.json({ pathname: blob.pathname, url: access === 'public' ? blob.url : null })
  } catch (error) {
    console.error('[oneposters] Studio upload failed:', error)
    return NextResponse.json({ error: 'Could not store the image.' }, { status: 500 })
  }
}
