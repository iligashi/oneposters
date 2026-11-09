'use client'

import type { ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import styles from './admin.module.css'

export function Intro({ kicker, heading, action }: { kicker: string; heading: string; action?: ReactNode }) {
  return <div className={styles.intro}><div><p className={styles.eyebrow}>{kicker}</p><h2>{heading}</h2></div>{action}</div>
}

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className={styles.search}><Search /><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></label>
}

export function Field({ label, value, onChange, textarea = false, type = 'text', placeholder, disabled }: {
  label: string; value: string | number | null | undefined; onChange: (value: string) => void; textarea?: boolean; type?: string; placeholder?: string; disabled?: boolean
}) {
  return <label className={styles.field}>{label}{textarea
    ? <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} rows={4} placeholder={placeholder} disabled={disabled} />
    : <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} />}</label>
}

export function Select({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (value: string) => void; options: readonly (readonly [string, string] | string)[]; disabled?: boolean }) {
  return <label className={styles.field}>{label}<select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}>
    {options.map(option => { const [v, l] = typeof option === 'string' ? [option, option] : option; return <option key={v} value={v}>{l}</option> })}
  </select></label>
}

export function Modal({ title, children, close, wide = false }: { title: string; children: ReactNode; close: () => void; wide?: boolean }) {
  return <div className={styles.modalBackdrop} onClick={close}><section className={`${styles.modal} ${wide ? styles.modalWide : ''}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
    <div className={styles.modalHead}><h3>{title}</h3><button onClick={close} aria-label="Close"><X /></button></div>{children}
  </section></div>
}

export function ListState({ loading, error, empty, count, shown, hasMore, loadMore }: { loading: boolean; error: string; empty: boolean; count: number | null; shown: number; hasMore: boolean; loadMore: () => void }) {
  return <div className={styles.pager}>
    {error && <p className={styles.error}>{error}</p>}
    {!loading && !error && empty && <p className={styles.helper}>Nothing here yet.</p>}
    {count !== null && !empty && <small className={styles.helper}>Showing {shown} of {count}</small>}
    {hasMore && <button className={styles.secondary} onClick={loadMore} disabled={loading}>{loading ? 'Loading…' : 'Load more'}</button>}
    {loading && !hasMore && <small className={styles.helper}>Loading…</small>}
  </div>
}

export function Status({ children }: { children: ReactNode }) {
  return <span className={styles.status}>{children}</span>
}
