import { describe, expect, it } from 'vitest'
import { discountCents, discountProblem, isArtworkOwnedBy, isStudioArtworkPath, normalizePromoCode, parseContact, parseQuantity, sanitizeDesignSettings, type DiscountRule } from '@/lib/orders'
import { getCustomPrintPriceCents, normalizeSizeLabel, shippingCents } from '@/lib/pricing'

const USER = '0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d'
const FILE = '11111111-2222-4333-8444-555555555555'

describe('pricing', () => {
  it('prices custom prints in cents', () => {
    expect(getCustomPrintPriceCents('A3', 'none', 'matte')).toBe(3400)
    expect(getCustomPrintPriceCents('50×70', 'oak', 'fine-art')).toBe(10200)
  })
  it('accepts the legacy mis-encoded size key', () => {
    expect(normalizeSizeLabel('30Ã—40')).toBe('30×40')
    expect(getCustomPrintPriceCents('30Ã—40', 'black', 'satin')).toBe(6700)
  })
  it('rejects unknown options', () => {
    expect(getCustomPrintPriceCents('A0', 'none', 'matte')).toBeNull()
    expect(getCustomPrintPriceCents('A4', 'gold', 'matte')).toBeNull()
  })
  it('gives free shipping from €75', () => {
    expect(shippingCents(7499, 'standard')).toBe(490)
    expect(shippingCents(7500, 'express')).toBe(0)
  })
})

describe('order input', () => {
  it('validates contact details', () => {
    expect(parseContact({ email: ' A@B.co ', name: 'Ana', address: 'Street 1', city: 'Tirana', zip: '1001' })?.email).toBe('a@b.co')
    expect(parseContact({ email: 'nope', name: 'Ana', address: 'x', city: 'y', zip: 'z' })).toBeNull()
    expect(parseContact({ email: 'a@b.co', name: '', address: 'x', city: 'y', zip: 'z' })).toBeNull()
  })
  it('limits quantity to 1-10 whole items', () => {
    expect(parseQuantity(3)).toBe(3)
    expect(parseQuantity(0)).toBeNull()
    expect(parseQuantity(11)).toBeNull()
    expect(parseQuantity(1.5)).toBeNull()
  })
  it('only accepts studio artwork paths', () => {
    expect(isStudioArtworkPath(`studio/${USER}/${FILE}-photo.jpg`)).toBe(true)
    expect(isStudioArtworkPath(`products/${USER}/${FILE}-photo.jpg`)).toBe(false)
    expect(isStudioArtworkPath(`studio/${USER}/../secret`)).toBe(false)
    expect(isStudioArtworkPath('https://evil.example/x.jpg')).toBe(false)
    expect(isArtworkOwnedBy(`studio/${USER}/${FILE}-photo.jpg`, USER)).toBe(true)
    expect(isArtworkOwnedBy(`studio/${USER}/${FILE}-photo.jpg`, FILE)).toBe(false)
  })
  it('keeps only known design settings and clamps numbers', () => {
    expect(sanitizeDesignSettings({ zoom: 9999, title: 'x'.repeat(100), evil: '<script>', showText: true })).toEqual({ zoom: 300, title: 'x'.repeat(60), showText: true })
    expect(sanitizeDesignSettings('nope')).toEqual({})
  })
})

describe('discounts', () => {
  const base: DiscountRule = { id: '1', code: 'WELCOME10', type: 'percent', value: 10, min_order_cents: null, usage_limit: null, used_count: 0, starts_at: null, ends_at: null, active: true }
  it('normalises codes and strips wildcard characters', () => {
    expect(normalizePromoCode(' welcome 10% ')).toBe('WELCOME10')
    expect(normalizePromoCode('a_b')).toBe('AB')
  })
  it('computes percent and fixed discounts, never above the subtotal', () => {
    expect(discountCents(base, 5000)).toBe(500)
    expect(discountCents({ type: 'fixed', value: 700 }, 5000)).toBe(700)
    expect(discountCents({ type: 'fixed', value: 9000 }, 5000)).toBe(5000)
    expect(discountCents({ type: 'percent', value: 250 }, 5000)).toBe(5000)
  })
  it('reports why a code cannot be used', () => {
    const now = new Date('2026-06-01T00:00:00Z')
    expect(discountProblem(base, 5000, now)).toBeNull()
    expect(discountProblem({ ...base, active: false }, 5000, now)).toMatch(/not active/)
    expect(discountProblem({ ...base, ends_at: '2026-01-01T00:00:00Z' }, 5000, now)).toMatch(/expired/)
    expect(discountProblem({ ...base, starts_at: '2026-12-01T00:00:00Z' }, 5000, now)).toMatch(/not active yet/)
    expect(discountProblem({ ...base, usage_limit: 5, used_count: 5 }, 5000, now)).toMatch(/fully redeemed/)
    expect(discountProblem({ ...base, min_order_cents: 6000 }, 5000, now)).toMatch(/at least/)
  })
})
