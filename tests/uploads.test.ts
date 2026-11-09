import { describe, expect, it } from 'vitest'
import { isAllowedRasterImage } from '@/lib/upload-validation'

const file = (bytes: number[], type: string) => new File([new Uint8Array([...bytes, ...new Array(16).fill(0)])], 'x', { type })

describe('isAllowedRasterImage', () => {
  it('accepts real image signatures', async () => {
    expect(await isAllowedRasterImage(file([0xff, 0xd8, 0xff], 'image/jpeg'))).toBe(true)
    expect(await isAllowedRasterImage(file([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'image/png'))).toBe(true)
    expect(await isAllowedRasterImage(file([...'RIFF'].map(c => c.charCodeAt(0)).concat([0, 0, 0, 0], [...'WEBP'].map(c => c.charCodeAt(0))), 'image/webp'))).toBe(true)
  })
  it('rejects mismatched content and other types', async () => {
    expect(await isAllowedRasterImage(file([...'<svg'].map(c => c.charCodeAt(0)), 'image/png'))).toBe(false)
    expect(await isAllowedRasterImage(file([0xff, 0xd8, 0xff], 'image/svg+xml'))).toBe(false)
    expect(await isAllowedRasterImage(new File([], 'empty.jpg', { type: 'image/jpeg' }))).toBe(false)
  })
})
