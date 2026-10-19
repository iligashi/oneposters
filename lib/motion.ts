import type { Transition } from 'framer-motion'

export const easings = {
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  soft: [0.16, 1, 0.3, 1] as const,
}

export const durations = { fast: 0.2, base: 0.45, slow: 0.8 }
export const springs: Record<string, Transition> = {
  soft: { type: 'spring', stiffness: 240, damping: 24 },
  magnetic: { type: 'spring', stiffness: 420, damping: 28 },
}
export const reveal = (delay = 0): Transition => ({ duration: durations.slow, ease: easings.out, delay })
