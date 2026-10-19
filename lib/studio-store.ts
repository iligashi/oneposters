'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Frame = 'none' | 'black' | 'white' | 'oak' | 'colored'
export type Paper = 'matte' | 'satin' | 'fine-art'
export type Filter = 'original' | 'bw' | 'warm' | 'grain' | 'duotone'
export type Fit = 'fit' | 'fill'
export type Orientation = 'portrait' | 'landscape'

export const sizePrices = { A4: 24, A3: 34, '30×40': 42, '50×70': 58, '70×100': 78 } as const
export const frameAddons = { none: 0, black: 18, white: 18, oak: 28, colored: 24 } as const
export const paperAddons = { matte: 0, satin: 7, 'fine-art': 16 } as const

export type StudioState = {
  image: string; imageWidth: number; imageHeight: number; title: string; titleFont: string; titleSize: number; titleColor: string; titleX: number; titleY: number; showText: boolean
  accent: string; size: keyof typeof sizePrices; frame: Frame; frameColor: string; paper: Paper; filter: Filter; fit: Fit; orientation: Orientation; zoom: number; rotate: number; offsetX: number; offsetY: number; border: number; brightness: number; contrast: number; savedAt?: string
  set: (patch: Partial<StudioState>) => void; reset: () => void
}

const initial = { image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1000&q=85', imageWidth: 1000, imageHeight: 1000, title: 'MAKE IT YOURS', titleFont: 'Arial', titleSize: 52, titleColor: '#ffffff', titleX: 50, titleY: 76, showText: true, accent: '#0A14FF', size: 'A3' as const, frame: 'black' as Frame, frameColor: '#111111', paper: 'matte' as Paper, filter: 'original' as Filter, fit: 'fill' as Fit, orientation: 'portrait' as Orientation, zoom: 100, rotate: 0, offsetX: 0, offsetY: 0, border: 0, brightness: 100, contrast: 100 }

export const useStudioStore = create<StudioState>()(persist((set) => ({ ...initial, set: (patch) => set(patch), reset: () => set(initial) }), { name: 'oneposters-studio-draft', partialize: (state) => Object.fromEntries(Object.entries(state).filter(([key]) => key !== 'set' && key !== 'reset')) as StudioState }))
