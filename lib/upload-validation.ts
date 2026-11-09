const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

export type RasterImageType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'

export const EXTENSION_FOR_TYPE: Record<RasterImageType, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif',
}

/**
 * Works out the real image format from the file's first bytes, ignoring its name
 * and the browser-reported type. Images saved from the web are often renamed
 * (a WebP saved as ".png"), so the extension can't be trusted either way.
 * Returns null for anything that is not a JPEG, PNG, WebP or AVIF image.
 */
export async function detectRasterImageType(file: Blob): Promise<RasterImageType | null> {
  if (file.size === 0) return null
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png'
  const signature = String.fromCharCode(...bytes)
  if (signature.slice(0, 4) === 'RIFF' && signature.slice(8, 12) === 'WEBP') return 'image/webp'
  if (signature.slice(4, 8) === 'ftyp' && ['avif', 'avis'].includes(signature.slice(8, 12))) return 'image/avif'
  return null
}

/** Strict check: the declared type is allowed AND matches the file's contents. */
export async function isAllowedRasterImage(file: File): Promise<boolean> {
  if (!allowedImageTypes.has(file.type)) return false
  return (await detectRasterImageType(file)) === file.type
}
