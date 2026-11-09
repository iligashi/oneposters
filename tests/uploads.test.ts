import { describe, expect, it } from 'vitest'
import { detectRasterImageType, isAllowedRasterImage } from '@/lib/upload-validation'

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

describe('detectRasterImageType', () => {
  const bytesOf = (text: string) => [...text].map(c => c.charCodeAt(0))
  it('uses the file contents, not the name or declared type', async () => {
    const webpNamedPng = new File([new Uint8Array([...bytesOf('RIFF'), 0, 0, 0, 0, ...bytesOf('WEBP')])], 'poster.png', { type: 'image/png' })
    expect(await detectRasterImageType(webpNamedPng)).toBe('image/webp')
    expect(await detectRasterImageType(new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], 'photo.jfif', { type: '' }))).toBe('image/jpeg')
  })
  it('rejects non-images and empty files', async () => {
    expect(await detectRasterImageType(new File([new Uint8Array(bytesOf('<svg xmlns'))], 'x.png', { type: 'image/png' }))).toBeNull()
    expect(await detectRasterImageType(new File([], 'empty.jpg', { type: 'image/jpeg' }))).toBeNull()
  })
})
