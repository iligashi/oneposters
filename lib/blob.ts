import { get } from '@vercel/blob'

export type BlobAccess = 'public' | 'private'

/**
 * Access mode for new customer studio uploads. Customer artwork is private by
 * default: it is only readable through /api/studio/artwork by its owner or
 * staff, never through a guessable public URL. STUDIO_BLOB_ACCESS=public is an
 * explicit opt-out for stores that cannot hold private blobs.
 */
export function studioBlobAccess(): BlobAccess {
  return process.env.STUDIO_BLOB_ACCESS === 'public' ? 'public' : 'private'
}

/**
 * Reads a studio artwork blob. Files uploaded before the private default was
 * introduced are public blobs, so fall back to the other access mode when the
 * configured one does not find the file.
 */
export async function getStudioArtwork(pathname: string, fetchBlob: typeof get = get) {
  const primary = studioBlobAccess()
  const fallback: BlobAccess = primary === 'private' ? 'public' : 'private'
  for (const access of [primary, fallback]) {
    try {
      const blob = await fetchBlob(pathname, { access })
      if (blob && blob.statusCode === 200) return blob
    } catch {
      // try the other access mode
    }
  }
  return null
}

export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'image'
}
