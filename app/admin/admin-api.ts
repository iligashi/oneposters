'use client'

import { useCallback, useEffect, useState } from 'react'

export type Row = Record<string, any>
export type Role = 'owner' | 'manager' | 'support'
export type AdminUser = { id: string; full_name: string | null; email: string | null; role: Role }

export class ApiError extends Error {}

/** Calls /api/admin/<resource>. Throws ApiError with the server's message on failure. */
export async function api<T = any>(resource: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET', body?: Row): Promise<T> {
  const response = await fetch(`/api/admin/${resource}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await response.json().catch(() => ({}))
  if (response.status === 403 && json.error === 'Two-factor authentication required') window.location.href = '/admin/mfa'
  if (!response.ok) throw new ApiError(json.error || 'Request failed')
  return json as T
}

export async function list<T = Row>(resource: string, params: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') query.set(key, String(value))
  return api<{ data: T[]; count: number | null }>(`${resource}?${query}`)
}

/** Paginated list with "load more", refresh and a filter object. */
export function useList<T = Row>(resource: string, filters: Record<string, string | undefined> = {}, pageSize = 50) {
  const [rows, setRows] = useState<T[]>([])
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const key = JSON.stringify(filters)

  const load = useCallback(async (offset: number) => {
    setLoading(true)
    setError('')
    try {
      const result = await list<T>(resource, { ...JSON.parse(key), limit: pageSize, offset })
      setRows(current => (offset === 0 ? result.data : [...current, ...result.data]))
      setCount(result.count)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load data')
    } finally {
      setLoading(false)
    }
  }, [resource, key, pageSize])

  useEffect(() => { load(0) }, [load])

  return {
    rows, count, loading, error,
    refresh: () => load(0),
    loadMore: () => load(rows.length),
    hasMore: count !== null && rows.length < count,
  }
}

export const euro = (cents = 0) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100)
export const toCents = (value: string) => {
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n * 100) : NaN
}
export const fromCents = (cents?: number | null) => (cents || cents === 0 ? (cents / 100).toFixed(2) : '')
export const date = (value?: string | null) => (value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
export const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
export const artworkUrl = (path: string, download = false) => `/api/studio/artwork?path=${encodeURIComponent(path)}${download ? '&download=1' : ''}`
export const canEdit = (user: AdminUser) => user.role === 'owner' || user.role === 'manager'

export const ORDER_STATUSES = [['pending', 'Pending'], ['paid', 'Paid'], ['printing', 'In production'], ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['refunded', 'Refunded']] as const
export const PAYMENT_STATUSES = ['pending', 'paid', 'refunded', 'failed'] as const
export const DESIGN_STATUSES = ['received', 'approved', 'printing', 'shipped', 'delivered', 'rejected'] as const
export const PRODUCT_STATUSES = ['draft', 'published', 'scheduled', 'archived'] as const
