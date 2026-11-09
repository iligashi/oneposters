/**
 * Returns a same-site path that is safe to redirect to, or the fallback.
 * Rejects absolute URLs, protocol-relative URLs and backslash tricks such as
 * `/\evil.com`, which browsers normalise to `//evil.com`.
 */
export function safeNextPath(value: string | null | undefined, fallback = '/'): string {
  if (!value || typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback
  try {
    const base = 'https://oneposters.invalid'
    const parsed = new URL(value, base)
    if (parsed.origin !== base) return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}
