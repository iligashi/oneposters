import { describe, expect, it } from 'vitest'
import { safeNextPath } from '@/lib/redirect'
import { isSameOrigin, rateLimit } from '@/lib/security'

describe('safeNextPath', () => {
  it('keeps same-site paths with query and hash', () => {
    expect(safeNextPath('/admin')).toBe('/admin')
    expect(safeNextPath('/shop?category=Art#top')).toBe('/shop?category=Art#top')
  })

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/\\/evil.example',
    '\\\\evil.example',
    '/\tevil.example',
    'javascript:alert(1)',
    '',
    null,
    undefined,
  ])('rejects %j', value => {
    expect(safeNextPath(value as string, '/fallback')).toBe('/fallback')
  })
})

describe('isSameOrigin', () => {
  const request = (headers: Record<string, string>) => new Request('https://oneposters.studio/api/orders', { method: 'POST', headers })
  it('accepts matching or missing origins', () => {
    expect(isSameOrigin(request({ origin: 'https://oneposters.studio' }))).toBe(true)
    expect(isSameOrigin(request({}))).toBe(true)
  })
  it('rejects other origins and cross-site fetches', () => {
    expect(isSameOrigin(request({ origin: 'https://evil.example' }))).toBe(false)
    expect(isSameOrigin(request({ 'sec-fetch-site': 'cross-site' }))).toBe(false)
  })
})

describe('rateLimit', () => {
  it('allows up to the limit within a window, then blocks until reset', () => {
    const key = `test-${Math.random()}`
    const now = 1_000_000
    expect(rateLimit(key, 2, 1000, now).ok).toBe(true)
    expect(rateLimit(key, 2, 1000, now + 1).ok).toBe(true)
    const blocked = rateLimit(key, 2, 1000, now + 2)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSeconds).toBe(1)
    expect(rateLimit(key, 2, 1000, now + 1001).ok).toBe(true)
  })
})
