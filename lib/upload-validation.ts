const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

export async function isAllowedRasterImage(file: File): Promise<boolean> {
  if (!allowedImageTypes.has(file.type) || file.size === 0) return false
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (file.type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (file.type === 'image/png') return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  const signature = String.fromCharCode(...bytes)
  if (file.type === 'image/webp') return signature.slice(0, 4) === 'RIFF' && signature.slice(8, 12) === 'WEBP'
  return signature.slice(4, 8) === 'ftyp' && ['avif', 'avis'].includes(signature.slice(8, 12))
}
