/** Pure order helpers shared by the order and promo routes (no I/O, unit tested). */

export const text = (value: unknown, max = 200) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

export type ContactDetails = { email: string; name: string; address: string; city: string; zip: string }

export function parseContact(body: Record<string, unknown>): ContactDetails | null {
  const contact = {
    email: text(body.email, 254).toLowerCase(),
    name: text(body.name, 120),
    address: text(body.address, 240),
    city: text(body.city, 120),
    zip: text(body.zip, 32),
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) return null
  if (!contact.name || !contact.address || !contact.city || !contact.zip) return null
  return contact
}

export function parseQuantity(value: unknown): number | null {
  const quantity = Number(value)
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= 10 ? quantity : null
}

/** Studio artwork lives at studio/<user uuid>/<uuid>-<safe name>. */
const ARTWORK_PATH = /^studio\/[0-9a-f-]{36}\/[0-9a-f-]{36}-[a-z0-9.-]{1,120}$/

export function isStudioArtworkPath(value: unknown): value is string {
  return typeof value === 'string' && ARTWORK_PATH.test(value)
}

export function isArtworkOwnedBy(path: string, userId: string) {
  return isStudioArtworkPath(path) && path.split('/')[1] === userId
}

/** Keeps only the known studio design settings, clamped to sane ranges. */
export function sanitizeDesignSettings(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const input = value as Record<string, unknown>
  const out: Record<string, string | number | boolean> = {}
  const strings: Record<string, number> = { title: 60, titleFont: 40, titleColor: 9, accent: 9, frameColor: 9, filter: 20, fit: 10, orientation: 12 }
  const numbers: Record<string, [number, number]> = {
    titleSize: [18, 100], titleX: [0, 100], titleY: [0, 100], zoom: [50, 300], rotate: [0, 360],
    offsetX: [-2000, 2000], offsetY: [-2000, 2000], border: [0, 64], brightness: [0, 200], contrast: [0, 200],
    imageWidth: [1, 50000], imageHeight: [1, 50000],
  }
  for (const [key, max] of Object.entries(strings)) if (typeof input[key] === 'string') out[key] = (input[key] as string).slice(0, max)
  for (const [key, [min, max]] of Object.entries(numbers)) {
    const n = Number(input[key])
    if (Number.isFinite(n)) out[key] = Math.min(max, Math.max(min, n))
  }
  if (typeof input.showText === 'boolean') out.showText = input.showText
  return out
}

export type DiscountRule = {
  id: string
  code: string
  type: string
  value: number
  min_order_cents: number | null
  usage_limit: number | null
  used_count: number | null
  starts_at: string | null
  ends_at: string | null
  active: boolean | null
}

export function normalizePromoCode(value: unknown) {
  return text(value, 40).toUpperCase().replace(/[^A-Z0-9-]/g, '')
}

const PERCENT_TYPES = new Set(['percent', 'percentage'])
const FIXED_TYPES = new Set(['fixed', 'amount', 'fixed_amount'])

/** Why a discount cannot be used for this subtotal, or null when it applies. */
export function discountProblem(rule: DiscountRule, subtotalCents: number, now = new Date()): string | null {
  if (!rule.active) return 'That promo code is not active'
  if (rule.starts_at && new Date(rule.starts_at) > now) return 'That promo code is not active yet'
  if (rule.ends_at && new Date(rule.ends_at) < now) return 'That promo code has expired'
  if (rule.usage_limit !== null && rule.usage_limit !== undefined && (rule.used_count ?? 0) >= rule.usage_limit) return 'That promo code has been fully redeemed'
  if (rule.min_order_cents && subtotalCents < rule.min_order_cents) return `That promo code needs an order of at least €${(rule.min_order_cents / 100).toFixed(2)}`
  if (!PERCENT_TYPES.has(rule.type) && !FIXED_TYPES.has(rule.type)) return 'That promo code is not valid'
  return null
}

/** Discount in cents. Percent values are whole percentages; fixed values are cents. */
export function discountCents(rule: Pick<DiscountRule, 'type' | 'value'>, subtotalCents: number) {
  const value = Number(rule.value)
  if (!Number.isFinite(value) || value <= 0) return 0
  const raw = PERCENT_TYPES.has(rule.type) ? Math.round(subtotalCents * Math.min(value, 100) / 100) : FIXED_TYPES.has(rule.type) ? Math.round(value) : 0
  return Math.min(raw, subtotalCents)
}
