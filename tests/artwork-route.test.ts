import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ checkStaff: vi.fn(), getUser: vi.fn(), getStudioArtwork: vi.fn() }))

vi.mock('@/lib/staff', () => ({ checkStaff: mocks.checkStaff }))
vi.mock('@/lib/blob', () => ({ getStudioArtwork: mocks.getStudioArtwork }))

import { GET } from '@/app/api/studio/artwork/route'

const OWNER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const FILE = '33333333-3333-4333-8333-333333333333-poster.png'
const ownerPath = `studio/${OWNER}/${FILE}`

const request = (path: string | null, extra = '') =>
  new Request(`https://oneposters.test/api/studio/artwork${path === null ? '' : `?path=${encodeURIComponent(path)}`}${extra}`)

const signedInAs = (userId: string | null) => {
  mocks.getUser.mockResolvedValue({ data: { user: userId ? { id: userId } : null } })
  mocks.checkStaff.mockResolvedValue({ status: userId ? 'forbidden' : 'signed-out', supabase: { auth: { getUser: mocks.getUser } } })
}

const asStaff = () => mocks.checkStaff.mockResolvedValue({ status: 'ok', supabase: { auth: { getUser: mocks.getUser } } })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getStudioArtwork.mockResolvedValue({ statusCode: 200, stream: 'png-bytes', blob: { contentType: 'image/png' } })
})

describe('GET /api/studio/artwork', () => {
  it('returns 401 when nobody is signed in', async () => {
    signedInAs(null)
    const res = await GET(request(ownerPath))
    expect(res.status).toBe(401)
    expect(mocks.getStudioArtwork).not.toHaveBeenCalled()
  })

  it("returns 403 for another customer's artwork", async () => {
    signedInAs(OTHER)
    const res = await GET(request(ownerPath))
    expect(res.status).toBe(403)
    expect(mocks.getStudioArtwork).not.toHaveBeenCalled()
  })

  it('serves artwork to its owner without public caching', async () => {
    signedInAs(OWNER)
    const res = await GET(request(ownerPath))
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('private, max-age=300')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(mocks.getStudioArtwork).toHaveBeenCalledWith(ownerPath)
  })

  it('serves any artwork to staff', async () => {
    asStaff()
    const res = await GET(request(ownerPath, '&download=1'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).toBe(`attachment; filename="${FILE}"`)
    expect(mocks.getUser).not.toHaveBeenCalled()
  })

  it.each([
    ['missing path', null],
    ['traversal', `studio/${OWNER}/../${OTHER}/${FILE}`],
    ['encoded traversal', `studio/${OWNER}/..%2F${OTHER}%2F${FILE}`],
    ['other prefix', `products/${OWNER}/${FILE}`],
    ['absolute URL', `https://evil.test/studio/${OWNER}/${FILE}`],
    ['owner id prefix trick', `studio/${OWNER}x/${FILE}`],
    ['header injection in name', `studio/${OWNER}/${FILE}"\r\nSet-Cookie: x=1`],
  ])('rejects path manipulation (%s) before any lookup', async (_name, path) => {
    asStaff()
    const res = await GET(request(path))
    expect(res.status).toBe(400)
    expect(mocks.checkStaff).not.toHaveBeenCalled()
    expect(mocks.getStudioArtwork).not.toHaveBeenCalled()
  })

  it('returns 404 when the artwork does not exist (e.g. legacy fallback switched off)', async () => {
    signedInAs(OWNER)
    mocks.getStudioArtwork.mockResolvedValue(null)
    expect((await GET(request(ownerPath))).status).toBe(404)
  })

  it('returns 404 instead of a server error when storage fails', async () => {
    signedInAs(OWNER)
    mocks.getStudioArtwork.mockRejectedValue(new Error('blob store down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await GET(request(ownerPath))).status).toBe(404)
  })
})
