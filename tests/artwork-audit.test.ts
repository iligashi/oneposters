import { describe, expect, it } from 'vitest'
import { auditStudioArtwork, type ArtworkStorage, type ListedBlob } from '@/lib/artwork-audit'

const blob = (pathname: string): ListedBlob => ({ pathname, url: `https://blob.test/${pathname}`, size: 10, uploadedAt: new Date(0) })

function fakeStorage(publicPaths: string[], { failOn = '', stickyPublic = '' } = {}) {
  const reachable = new Set(publicPaths.map((p) => `https://blob.test/${p}`))
  const madePrivate: string[] = []
  const blobs = [blob('studio/u1/old.png'), blob('studio/u2/new.png'), blob('products/hero.webp'), blob('studio/u3/cached.png')]
  const storage: ArtworkStorage = {
    async *listStudioBlobs() {
      yield* blobs
    },
    async isPubliclyReachable(url) {
      return reachable.has(url)
    },
    async makePrivate(b) {
      if (b.pathname === failOn) throw new Error('store rejected private upload')
      madePrivate.push(b.pathname)
      if (b.pathname !== stickyPublic) reachable.delete(b.url)
    },
  }
  return { storage, madePrivate }
}

describe('auditStudioArtwork', () => {
  it('reports public artwork without changing anything in a dry run', async () => {
    const { storage, madePrivate } = fakeStorage(['studio/u1/old.png', 'studio/u3/cached.png'])
    const report = await auditStudioArtwork(storage)

    expect(madePrivate).toEqual([])
    expect(report.scanned).toBe(3) // non-studio blobs are ignored
    expect(report.publicBefore).toBe(2)
    expect(report.stillPublic).toBe(2)
    expect(report.entries.find((e) => e.pathname === 'studio/u2/new.png')?.status).toBe('private')
  })

  it('migrates public artwork and verifies the old URL stopped working', async () => {
    const { storage, madePrivate } = fakeStorage(['studio/u1/old.png'])
    const report = await auditStudioArtwork(storage, { migrate: true })

    expect(madePrivate).toEqual(['studio/u1/old.png'])
    expect(report.migrated).toBe(1)
    expect(report.stillPublic).toBe(0)
  })

  it('flags artwork that is still reachable after migration', async () => {
    const { storage } = fakeStorage(['studio/u3/cached.png'], { stickyPublic: 'studio/u3/cached.png' })
    const report = await auditStudioArtwork(storage, { migrate: true })

    expect(report.entries.find((e) => e.pathname === 'studio/u3/cached.png')?.status).toBe('still-public')
    expect(report.stillPublic).toBe(1)
  })

  it('keeps going when one file fails and reports it', async () => {
    const { storage } = fakeStorage(['studio/u1/old.png', 'studio/u3/cached.png'], { failOn: 'studio/u1/old.png' })
    const report = await auditStudioArtwork(storage, { migrate: true })

    expect(report.failed).toBe(1)
    expect(report.migrated).toBe(1)
    expect(report.entries.find((e) => e.status === 'failed')?.error).toContain('store rejected')
  })
})
