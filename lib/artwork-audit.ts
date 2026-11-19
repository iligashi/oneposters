/**
 * Finds customer studio artwork that is still publicly reachable (uploaded
 * before artwork became private by default) and, when asked, moves it to
 * private storage at the same pathname so existing order references keep
 * working through /api/studio/artwork.
 *
 * Storage access is injected so the logic can be tested without Vercel Blob.
 */

export type ListedBlob = { pathname: string; url: string; size: number; uploadedAt: Date }

export type ArtworkStorage = {
  /** Every blob under the studio/ prefix, across all pages. */
  listStudioBlobs(): AsyncIterable<ListedBlob>
  /** True when the URL can be fetched without any credentials. */
  isPubliclyReachable(url: string): Promise<boolean>
  /** Re-store the blob as private at the same pathname. */
  makePrivate(blob: ListedBlob): Promise<void>
}

export type AuditEntry = ListedBlob & { status: 'public' | 'private' | 'migrated' | 'still-public' | 'failed'; error?: string }

export type AuditReport = {
  scanned: number
  publicBefore: number
  migrated: number
  failed: number
  stillPublic: number
  entries: AuditEntry[]
}

export async function auditStudioArtwork(storage: ArtworkStorage, { migrate = false } = {}): Promise<AuditReport> {
  const entries: AuditEntry[] = []

  for await (const blob of storage.listStudioBlobs()) {
    if (!blob.pathname.startsWith('studio/')) continue
    if (!(await storage.isPubliclyReachable(blob.url))) {
      entries.push({ ...blob, status: 'private' })
      continue
    }
    if (!migrate) {
      entries.push({ ...blob, status: 'public' })
      continue
    }
    try {
      await storage.makePrivate(blob)
      // Verify instead of assuming: the old URL must stop serving the file
      const stillPublic = await storage.isPubliclyReachable(blob.url)
      entries.push({ ...blob, status: stillPublic ? 'still-public' : 'migrated' })
    } catch (error) {
      entries.push({ ...blob, status: 'failed', error: error instanceof Error ? error.message : String(error) })
    }
  }

  const count = (...statuses: AuditEntry['status'][]) => entries.filter((e) => statuses.includes(e.status)).length
  return {
    scanned: entries.length,
    publicBefore: count('public', 'migrated', 'still-public', 'failed'),
    migrated: count('migrated'),
    failed: count('failed'),
    stillPublic: count('public', 'still-public', 'failed'),
    entries,
  }
}
