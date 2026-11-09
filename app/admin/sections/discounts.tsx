'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api, date, euro, fromCents, toCents, useList, type Row } from '../admin-api'
import { Field, Intro, ListState, Modal, Select, Status } from '../ui'
import styles from '../admin.module.css'

export function Discounts({ notify }: { notify: (message: string) => void }) {
  const discounts = useList('discounts')
  const [editing, setEditing] = useState<Row | null | undefined>(undefined)

  async function toggle(discount: Row) {
    try { await api('discounts', 'PATCH', { id: discount.id, active: !discount.active }); discounts.refresh() } catch (e: any) { notify(e.message) }
  }
  async function remove(discount: Row) {
    if (!confirm(`Delete promo code ${discount.code}?`)) return
    try { await api(`discounts?id=${discount.id}`, 'DELETE'); discounts.refresh() } catch (e: any) { notify(e.message) }
  }

  return <>
    <Intro kicker="Commerce / discounts" heading="Reasons to come back." action={<button className={styles.primary} onClick={() => setEditing(null)}><Plus /> New code</button>} />
    <div className={styles.table}>{discounts.rows.map(d => <div className={styles.tableRow} key={d.id}>
      <div className={styles.grow}>
        <strong>{d.code}</strong>
        <small>{d.type === 'percent' ? `${d.value}% off` : `${euro(d.value)} off`}{d.min_order_cents ? ` · min ${euro(d.min_order_cents)}` : ''} · used {d.used_count ?? 0}{d.usage_limit ? ` / ${d.usage_limit}` : ''} · {d.starts_at ? date(d.starts_at) : 'now'} → {d.ends_at ? date(d.ends_at) : 'no end'}</small>
      </div>
      <button className={styles.secondary} onClick={() => toggle(d)}>{d.active ? 'Active' : 'Paused'}</button>
      <button className={styles.iconButton} onClick={() => setEditing(d)}>Edit</button>
      <button className={styles.deleteButton} onClick={() => remove(d)} aria-label={`Delete ${d.code}`}><Trash2 /></button>
    </div>)}</div>
    <ListState loading={discounts.loading} error={discounts.error} empty={!discounts.rows.length} count={discounts.count} shown={discounts.rows.length} hasMore={discounts.hasMore} loadMore={discounts.loadMore} />
    {editing !== undefined && <DiscountEditor discount={editing} notify={notify} close={() => { setEditing(undefined); discounts.refresh() }} />}
  </>
}

function DiscountEditor({ discount, notify, close }: { discount: Row | null; notify: (m: string) => void; close: () => void }) {
  const [form, setForm] = useState({
    code: discount?.code || '', type: discount?.type === 'fixed' ? 'fixed' : 'percent',
    value: discount ? (discount.type === 'fixed' ? fromCents(discount.value) : String(discount.value)) : '',
    min: fromCents(discount?.min_order_cents), limit: discount?.usage_limit ? String(discount.usage_limit) : '',
    starts: discount?.starts_at?.slice(0, 10) || '', ends: discount?.ends_at?.slice(0, 10) || '', active: discount?.active ?? true,
  })
  const [error, setError] = useState('')
  const set = (key: keyof typeof form, value: string | boolean) => setForm(f => ({ ...f, [key]: value }))

  async function save() {
    setError('')
    const value = form.type === 'fixed' ? toCents(form.value) : Math.round(Number(form.value))
    if (!(value > 0)) { setError('Enter a discount value greater than zero.'); return }
    const payload = {
      code: form.code, type: form.type, value, active: form.active,
      min_order_cents: form.min ? toCents(form.min) : null,
      usage_limit: form.limit ? Math.max(1, Math.round(Number(form.limit))) : null,
      starts_at: form.starts ? new Date(`${form.starts}T00:00:00`).toISOString() : null,
      ends_at: form.ends ? new Date(`${form.ends}T23:59:59`).toISOString() : null,
    }
    try { await api('discounts', discount ? 'PATCH' : 'POST', discount ? { id: discount.id, ...payload } : payload); notify('Promo code saved.'); close() } catch (e: any) { setError(e.message) }
  }

  return <Modal title={discount ? `Edit ${discount.code}` : 'New promo code'} close={close}>
    <Field label="Code" value={form.code} onChange={v => set('code', v.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} placeholder="WELCOME10" />
    <Select label="Type" value={form.type} onChange={v => set('type', v)} options={[['percent', 'Percentage off'], ['fixed', 'Fixed amount off (€)']]} />
    <Field label={form.type === 'percent' ? 'Percent off' : 'Amount off (€)'} value={form.value} onChange={v => set('value', v)} />
    <Field label="Minimum order (€, optional)" value={form.min} onChange={v => set('min', v)} />
    <Field label="Usage limit (optional)" value={form.limit} onChange={v => set('limit', v)} type="number" />
    <Field label="Starts (optional)" value={form.starts} onChange={v => set('starts', v)} type="date" />
    <Field label="Ends (optional)" value={form.ends} onChange={v => set('ends', v)} type="date" />
    <label className={styles.field}><input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} style={{ width: 'auto', display: 'inline' }} /> Active</label>
    {error && <p className={styles.error}>{error}</p>}
    <Status>Codes are checked on the server at checkout; usage counts update when an order is placed.</Status>
    <p><button className={styles.primary} onClick={save}>Save code</button></p>
  </Modal>
}
