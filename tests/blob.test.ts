import { afterEach, describe, expect, it } from 'vitest'
import { getStudioArtwork, studioBlobAccess, type BlobAccess } from '@/lib/blob'

const original = process.env.STUDIO_BLOB_ACCESS
afterEach(() => {
  if (original === undefined) delete process.env.STUDIO_BLOB_ACCESS
  else process.env.STUDIO_BLOB_ACCESS = original
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

  it('returns null when the file does not exist', async () => {
    const { fetchBlob } = store({})
    expect(await getStudioArtwork('studio/u1/missing.png', fetchBlob)).toBeNull()
  })
})
