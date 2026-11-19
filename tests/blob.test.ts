import { afterEach, describe, expect, it } from 'vitest'
import { getStudioArtwork, legacyPublicFallbackEnabled, studioBlobAccess, type BlobAccess } from '@/lib/blob'

const original = { access: process.env.STUDIO_BLOB_ACCESS, fallback: process.env.STUDIO_ARTWORK_PUBLIC_FALLBACK }
const restore = (name: string, value: string | undefined) => {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}
afterEach(() => {
  restore('STUDIO_BLOB_ACCESS', original.access)
  restore('STUDIO_ARTWORK_PUBLIC_FALLBACK', original.fallback)
})

describe('studioBlobAccess', () => {
  it('keeps customer artwork private by default', () => {
    delete process.env.STUDIO_BLOB_ACCESS
    expect(studioBlobAccess()).toBe('private')
  })

  it('treats anything but an explicit "public" as private', () => {
    for (const value of ['', 'private', 'PUBLIC', 'yes']) {
      process.env.STUDIO_BLOB_ACCESS = value
      expect(studioBlobAccess()).toBe('private')
    }
  })

  it('allows an explicit public opt-out', () => {
    process.env.STUDIO_BLOB_ACCESS = 'public'
    expect(studioBlobAccess()).toBe('public')
  })
})

describe('getStudioArtwork', () => {
  // Fake blob store holding one file per access mode
  const store = (files: Partial<Record<BlobAccess, string>>) => {
    const calls: BlobAccess[] = []
    const fetchBlob = (async (pathname: string, { access }: { access: BlobAccess }) => {
      calls.push(access)
      if (files[access] !== pathname) throw new Error('not found')
      return { statusCode: 200, stream: null, blob: { contentType: 'image/png' } }
    }) as unknown as Parameters<typeof getStudioArtwork>[1]
    return { calls, fetchBlob }
  }

  it('reads private artwork without touching public storage', async () => {
    delete process.env.STUDIO_BLOB_ACCESS
    const { calls, fetchBlob } = store({ private: 'studio/u1/a.png' })
    expect(await getStudioArtwork('studio/u1/a.png', fetchBlob)).not.toBeNull()
    expect(calls).toEqual(['private'])
  })

  it('still serves artwork uploaded as public before the default changed', async () => {
    delete process.env.STUDIO_BLOB_ACCESS
    const { calls, fetchBlob } = store({ public: 'studio/u1/old.png' })
    expect(await getStudioArtwork('studio/u1/old.png', fetchBlob)).not.toBeNull()
    expect(calls).toEqual(['private', 'public'])
  })

  it('stops serving public artwork once the legacy fallback is switched off', async () => {
    delete process.env.STUDIO_BLOB_ACCESS
    for (const value of ['off', 'false', '0', ' OFF ']) {
      process.env.STUDIO_ARTWORK_PUBLIC_FALLBACK = value
      const { calls, fetchBlob } = store({ public: 'studio/u1/old.png' })
      expect(await getStudioArtwork('studio/u1/old.png', fetchBlob)).toBeNull()
      expect(calls).toEqual(['private'])
    }
  })

  it('keeps the legacy fallback on unless explicitly switched off', async () => {
    delete process.env.STUDIO_BLOB_ACCESS
    for (const value of [undefined, '', 'on', 'true']) {
      restore('STUDIO_ARTWORK_PUBLIC_FALLBACK', value)
      expect(legacyPublicFallbackEnabled()).toBe(true)
    }
  })

  it('always allows falling back from public to private storage', async () => {
    process.env.STUDIO_BLOB_ACCESS = 'public'
    process.env.STUDIO_ARTWORK_PUBLIC_FALLBACK = 'off'
    const { calls, fetchBlob } = store({ private: 'studio/u1/a.png' })
    expect(await getStudioArtwork('studio/u1/a.png', fetchBlob)).not.toBeNull()
    expect(calls).toEqual(['public', 'private'])
  })

  it('returns null when the file does not exist', async () => {
    const { fetchBlob } = store({})
    expect(await getStudioArtwork('studio/u1/missing.png', fetchBlob)).toBeNull()
  })
})
