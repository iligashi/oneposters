export const customSizePrices = { A4: 24, A3: 34, '30Ã—40': 42, '50Ã—70': 58, '70Ã—100': 78 } as const
export const customFrameAddons = { none: 0, black: 18, white: 18, oak: 28, colored: 24 } as const
export const customPaperAddons = { matte: 0, satin: 7, 'fine-art': 16 } as const

export type CustomSize = keyof typeof customSizePrices
export type CustomFrame = keyof typeof customFrameAddons
export type CustomPaper = keyof typeof customPaperAddons

export function getCustomPrintPriceCents(size: string, frame: string, paper: string) {
  if (!(size in customSizePrices) || !(frame in customFrameAddons) || !(paper in customPaperAddons)) return null
  return Math.round((customSizePrices[size as CustomSize] + customFrameAddons[frame as CustomFrame] + customPaperAddons[paper as CustomPaper]) * 100)
}
