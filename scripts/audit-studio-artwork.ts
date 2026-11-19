/**
 * Audit (and optionally migrate) legacy public customer artwork.
 *
 *   Dry run (read-only, default):
 *     BLOB_READ_WRITE_TOKEN=... pnpm audit:artwork
 *   Move public artwork to private storage at the same pathname:
 *     BLOB_READ_WRITE_TOKEN=... pnpm audit:artwork --migrate
 *
 * Prints a summary and writes artwork-audit-<timestamp>.json (pathnames,
 * sizes, upload dates and status; no customer data). Run the dry run first
 * and review the report before migrating. After migrating, any public URL
 * that is still reachable (e.g. cached at the CDN) is reported as
 * "still-public" so it can be followed up.
 */
import { writeFileSync } from 'node:fs'
import { get, list, put } from '@vercel/blob'
import { auditStudioArtwork, type ArtworkStorage, type ListedBlob } from '../lib/artwork-audit'

const migrate = process.argv.includes('--migrate')

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is required.')
  process.exit(1)
}

const storage: ArtworkStorage = {
  async *listStudioBlobs() {
    let cursor: string | undefined
    do {
      const page = await list({ prefix: 'studio/', cursor, limit: 1000 })
      for (const blob of page.blobs) yield { pathname: blob.pathname, url: blob.url, size: blob.size, uploadedAt: blob.uploadedAt }
      cursor = page.hasMore ? page.cursor : undefined
    } while (cursor)
  },

  async isPubliclyReachable(url: string) {
    // Deliberately unauthenticated: this is what anyone with the link can do
    const response = await fetch(url, { method: 'HEAD', cache: 'no-store' })
    return response.ok
  },

  async makePrivate(blob: ListedBlob) {
    const source = await get(blob.pathname, { access: 'public' })
    if (!source || source.statusCode !== 200) throw new Error('could not read the public blob')
    await put(blob.pathname, source.stream, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: source.blob.contentType,
    })
  },
}

async function main() {
  const report = await auditStudioArtwork(storage, { migrate })
  const file = `artwork-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  writeFileSync(file, JSON.stringify(report, null, 2))

  console.log(`Mode:            ${migrate ? 'MIGRATE' : 'dry run (read-only)'}`)
  console.log(`Scanned:         ${report.scanned}`)
  console.log(`Public before:   ${report.publicBefore}`)
  if (migrate) {
    console.log(`Migrated:        ${report.migrated}`)
    console.log(`Failed:          ${report.failed}`)
  }
  console.log(`Still public:    ${report.stillPublic}`)
  console.log(`Report:          ${file}`)
  if (report.stillPublic > 0) process.exitCode = 2
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
