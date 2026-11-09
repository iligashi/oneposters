'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { customFrameAddons, customPaperAddons, customSizePrices, normalizeSizeLabel } from '@/lib/pricing'

export type Frame = 'none' | 'black' | 'white' | 'oak' | 'colored'
export type Paper = 'matte' | 'satin' | 'fine-art'
export type Filter = 'original' | 'bw' | 'warm' | 'grain' | 'duotone'
export type Fit = 'fit' | 'fill'
export type Orientation = 'portrait' | 'landscape'

export const sizePrices = customSizePrices
export const frameAddons = customFrameAddons
export const paperAddons = customPaperAddons

export type StudioState = {
  image: string; artworkPath: string; imageWidth: number; imageHeight: number; title: string; titleFont: string; titleSize: number; titleColor: string; titleX: number; titleY: number; showText: boolean
  accent: string; size: keyof typeof sizePrices; frame: Frame; frameColor: string; paper: Paper; filter: Filter; fit: Fit; orientation: Orientation; zoom: number; rotate: number; offsetX: number; offsetY: number; border: number; brightness: number; contrast: number; savedAt?: string
  set: (patch: Partial<StudioState>) => void; reset: () => void
}

const initial = { image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1000&q=85', artworkPath: '', imageWidth: 1000, imageHeight: 1000, title: 'MAKE IT YOURS', titleFont: 'Arial', titleSize: 52, titleColor: '#ffffff', titleX: 50, titleY: 76, showText: true, accent: '#0A14FF', size: 'A3' as const, frame: 'black' as Frame, frameColor: '#111111', paper: 'matte' as Paper, filter: 'original' as Filter, fit: 'fill' as Fit, orientation: 'portrait' as Orientation, zoom: 100, rotate: 0, offsetX: 0, offsetY: 0, border: 0, brightness: 100, contrast: 100 }

export const useStudioStore = create<StudioState>()(persist((set) => ({ ...initial, set: (patch) => set(patch), reset: () => set(initial) }), {
  name: 'oneposters-studio-draft',
  version: 2,
  // v1 stored mis-encoded size keys and had no uploaded-artwork path.
  migrate: (persisted) => {
    const state = (persisted || {}) as Partial<StudioState>
    const size = normalizeSizeLabel(String(state.size || 'A3'))
    return { ...state, artworkPath: state.artworkPath || '', size: (size in sizePrices ? size : 'A3') as StudioState['size'] } as StudioState
  },
  partialize: (state) => Object.fromEntries(Object.entries(state).filter(([key]) => key !== 'set' && key !== 'reset')) as StudioState }))

