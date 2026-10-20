import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to upload an image.' }, { status: 401 })
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Image file is required.' }, { status: 400 })
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'Use JPG, PNG, WebP, or AVIF.' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image must be smaller than 10MB.' }, { status: 400 })

  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/(^-|-$)/g, '') || 'image'
  const path = `${user.id}/${crypto.randomUUID()}-${safeName}`
  const { error } = await supabase.storage.from('studio-media').upload(path, file, { contentType: file.type, upsert: false })
  if (error) return NextResponse.json({ error: 'Could not store the image.' }, { status: 400 })
  const { data } = supabase.storage.from('studio-media').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
