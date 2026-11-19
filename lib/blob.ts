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
 * Whether artwork uploaded as public before the private default may still be
 * served. On by default so existing orders keep working; set
 * STUDIO_ARTWORK_PUBLIC_FALLBACK=off once `pnpm audit:artwork --migrate`
 * reports no public artwork left, which retires the legacy path entirely.
 */
export function legacyPublicFallbackEnabled(): boolean {
  const value = process.env.STUDIO_ARTWORK_PUBLIC_FALLBACK?.trim().toLowerCase()
  return !(value === 'off' || value === 'false' || value === '0')
}

/**
 * Reads a studio artwork blob in the configured access mode. Falling back to
 * private storage is always allowed (it is never weaker); falling back to
 * public storage only while the legacy fallback is enabled.
 */
export async function getStudioArtwork(pathname: string, fetchBlob: typeof get = get) {
  const primary = studioBlobAccess()
  const modes: BlobAccess[] = [primary]
  if (primary === 'public') modes.push('private')
  else if (legacyPublicFallbackEnabled()) modes.push('public')

  for (const access of modes) {
    try {
      const blob = await fetchBlob(pathname, { access })
      if (blob && blob.statusCode === 200) {
        if (access === 'public' && primary === 'private') {
          // Counts how often the legacy path is still needed; no customer data logged
          console.warn('[oneposters] Served legacy public studio artwork; run pnpm audit:artwork')
        }
        return blob
      }
    } catch {
      // try the next access mode
    }
  }
  return null
}

export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'image'
}
