/**
 * Access mode for customer studio uploads. Set STUDIO_BLOB_ACCESS=private once the
 * project's Blob store supports private blobs; artwork is then only readable
 * through /api/studio/artwork by its owner or staff.
 */
export function studioBlobAccess(): 'public' | 'private' {
  return process.env.STUDIO_BLOB_ACCESS === 'private' ? 'private' : 'public'
}

export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'image'
}
