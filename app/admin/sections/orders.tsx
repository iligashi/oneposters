'use client'

import { useEffect, useState } from 'react'
import { api, artworkUrl, canEdit, date, euro, list, ORDER_STATUSES, PAYMENT_STATUSES, useList, type AdminUser, type Row } from '../admin-api'
import { Field, Intro, ListState, Modal, SearchBar, Select, Status } from '../ui'
import styles from '../admin.module.css'

export function Orders({ user, notify }: { user: AdminUser; notify: (message: string) => void }) {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const orders = useList('orders', { status })
  const [open, setOpen] = useState<string | null>(null)
  const rows = orders.rows.filter(o => `${o.order_number} ${o.shipping_address?.name ?? ''} ${o.shipping_address?.email ?? ''}`.toLowerCase().includes(search.toLowerCase()))

  return <>
    <Intro kicker="Commerce / orders" heading="Keep things moving." />
    <div className={styles.toolbar}>
      <SearchBar value={search} onChange={setSearch} placeholder="Search order number, name or email" />
      <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{ORDER_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <button className={styles.secondary} onClick={() => exportCsv(orders.rows)}>Export CSV</button>
    </div>
    <div className={styles.table}>{rows.map(o => <button className={`${styles.tableRow} ${styles.rowButton}`} key={o.id} onClick={() => setOpen(o.id)}>
      <span className={styles.orderMark}>OP</span>
      <div className={styles.grow}><strong>{o.order_number}</strong><small>{date(o.created_at)} · {o.shipping_address?.name || 'Guest'}</small></div>
      <Status>{ORDER_STATUSES.find(([v]) => v === o.status)?.[1] ?? o.status}</Status>
      <Status>payment: {o.payment_status}</Status>
      <b>{euro(o.total_cents)}</b>
    </button>)}</div>
    <ListState loading={orders.loading} error={orders.error} empty={!rows.length} count={orders.count} shown={orders.rows.length} hasMore={orders.hasMore} loadMore={orders.loadMore} />
    {open && <OrderDetail id={open} user={user} notify={notify} close={() => { setOpen(null); orders.refresh() }} />}
  </>
}

function exportCsv(rows: Row[]) {
  const header = ['order_number', 'created_at', 'status', 'payment_status', 'name', 'email', 'city', 'subtotal', 'discount', 'shipping', 'total', 'discount_code', 'tracking_number']
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const lines = rows.map(o => [o.order_number, o.created_at, o.status, o.payment_status, o.shipping_address?.name, o.shipping_address?.email, o.shipping_address?.city,
    (o.subtotal_cents / 100).toFixed(2), ((o.discount_cents || 0) / 100).toFixed(2), ((o.shipping_cents || 0) / 100).toFixed(2), (o.total_cents / 100).toFixed(2), o.discount_code, o.tracking_number].map(escape).join(','))
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' })
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `oneposters-orders-${new Date().toISOString().slice(0, 10)}.csv`; link.click()
  URL.revokeObjectURL(link.href)
}

export function OrderDetail({ id, user, notify, close }: { id: string; user: AdminUser; notify: (m: string) => void; close: () => void }) {
  const [order, setOrder] = useState<Row | null>(null)
  const [items, setItems] = useState<Row[]>([])
  const [designs, setDesigns] = useState<Row[]>([])
  const [form, setForm] = useState({ status: '', payment_status: '', tracking_number: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const editable = canEdit(user)

  useEffect(() => {
    Promise.all([list('orders', { id, limit: 1 }), list('order_items', { order_id: id, limit: 100 }), list('designs', { order_id: id, limit: 50 })])
      .then(([orderRows, itemRows, designRows]) => {
        const found = orderRows.data[0]
        if (!found) { notify('Order not found.'); return }
        setOrder(found)
        setForm({ status: found.status, payment_status: found.payment_status, tracking_number: found.tracking_number || '', notes: found.notes || '' })
        setItems(itemRows.data)
        setDesigns(designRows.data)
      })
      .catch(() => notify('Could not load this order.'))
  }, [id, notify])

  async function save() {
    if (!order) return
    setSaving(true)
    try { const result = await api<{ data: Row }>('orders', 'PATCH', { id: order.id, ...form }); setOrder(result.data); notify('Order updated.') } catch (e: any) { notify(e.message) } finally { setSaving(false) }
  }

  if (!order) return <Modal title="Order" close={close}><p className={styles.helper}>Loading…</p></Modal>
  const address = order.shipping_address || {}
  return <Modal title={`Order ${order.order_number}`} close={close} wide>
    <div className={styles.detailGrid}>
      <div>
        <h4>Items</h4>
        {items.map(item => <div className={styles.inlineRow} key={item.id ?? `${item.title_snapshot}-${item.size_label}`}>
          <div className={styles.grow}><strong>{item.title_snapshot}</strong><small>{[item.size_label, item.frame_name && `${item.frame_name} frame`, item.paper_name].filter(Boolean).join(' · ')}</small></div>
          <span>× {item.quantity}</span><b>{euro(item.unit_price_cents * item.quantity)}</b>
        </div>)}
        {designs.length > 0 && <><h4>Custom artwork</h4><div className={styles.thumbs}>{designs.map(d => <figure key={d.id}>
          <img src={artworkUrl(d.original_image_url)} alt="Customer artwork" />
          <figcaption>{d.size_label} · {d.status} <a className={styles.textButton} href={artworkUrl(d.original_image_url, true)}>Download</a></figcaption>
        </figure>)}</div></>}
        <div className={styles.summaryTable}>
          <span>Subtotal</span><b>{euro(order.subtotal_cents)}</b>
          {order.discount_cents > 0 && <><span>Discount {order.discount_code ? `(${order.discount_code})` : ''}</span><b>−{euro(order.discount_cents)}</b></>}
          <span>Shipping</span><b>{euro(order.shipping_cents)}</b>
          <strong>Total</strong><strong>{euro(order.total_cents)}</strong>
        </div>
      </div>
      <div>
        <h4>Customer &amp; delivery</h4>
        <p className={styles.address}>{address.name}<br />{address.email}<br />{address.address}<br />{address.zip} {address.city}</p>
        <small className={styles.helper}>Placed {date(order.created_at)}</small>
        <Select label="Order status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={ORDER_STATUSES} disabled={!editable} />
        <Select label="Payment status" value={form.payment_status} onChange={v => setForm(f => ({ ...f, payment_status: v }))} options={PAYMENT_STATUSES} disabled={!editable} />
        <Field label="Tracking number" value={form.tracking_number} onChange={v => setForm(f => ({ ...f, tracking_number: v }))} disabled={!editable} />
        <Field label="Internal notes" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} textarea disabled={!editable} />
        {editable && <button className={styles.primary} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save order'}</button>}
      </div>
    </div>
  </Modal>
}
