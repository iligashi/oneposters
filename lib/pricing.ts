export const customSizePrices = { A4: 24, A3: 34, '30×40': 42, '50×70': 58, '70×100': 78 } as const
export const customFrameAddons = { none: 0, black: 18, white: 18, oak: 28, colored: 24 } as const
export const customPaperAddons = { matte: 0, satin: 7, 'fine-art': 16 } as const

/** Frame add-ons for catalog prints, in cents. Shared by the product page and the order API. */
export const productFrameAddonsCents = { none: 0, black: 1200, white: 1200, oak: 1800 } as const

export const FREE_SHIPPING_THRESHOLD_CENTS = 7500
export const SHIPPING_CENTS = { standard: 490, express: 990 } as const

export type CustomSize = keyof typeof customSizePrices
export type CustomFrame = keyof typeof customFrameAddons
export type CustomPaper = keyof typeof customPaperAddons

/** Older carts stored the size keys with a mis-encoded multiplication sign. */
export function normalizeSizeLabel(size: string) {
  return size.replace('Ã—', '×')
}

export function getCustomPrintPriceCents(size: string, frame: string, paper: string) {
  const label = normalizeSizeLabel(size)
  if (!(label in customSizePrices) || !(frame in customFrameAddons) || !(paper in customPaperAddons)) return null
  return Math.round((customSizePrices[label as CustomSize] + customFrameAddons[frame as CustomFrame] + customPaperAddons[paper as CustomPaper]) * 100)
}

export function shippingCents(subtotalCents: number, delivery: keyof typeof SHIPPING_CENTS) {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_CENTS[delivery]
}
