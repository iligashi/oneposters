import { get } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { studioBlobAccess } from '@/lib/blob'
import { isArtworkOwnedBy, isStudioArtworkPath } from '@/lib/orders'
import { checkStaff } from '@/lib/staff'

/** Streams a studio artwork file to its owner or to staff (works for private blobs). */
export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get('path')
  if (!isStudioArtworkPath(path)) return NextResponse.json({ error: 'Invalid artwork path' }, { status: 400 })

  const staff = await checkStaff()
  if (staff.status !== 'ok') {
    const { data: { user } } = await staff.supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isArtworkOwnedBy(path, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const blob = await get(path, { access: studioBlobAccess() })
    if (!blob || blob.statusCode !== 200) return NextResponse.json({ error: 'Artwork not found' }, { status: 404 })
    const download = new URL(request.url).searchParams.get('download') === '1'
    return new Response(blob.stream, {
      headers: {
        'Content-Type': blob.blob.contentType || 'application/octet-stream',
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        ...(download ? { 'Content-Disposition': `attachment; filename="${path.split('/').pop()}"` } : {}),
      },
    })
  } catch (error) {
    console.error('[oneposters] Artwork download failed:', error)
    return NextResponse.json({ error: 'Artwork not found' }, { status: 404 })
  }
}
