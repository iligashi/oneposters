'use client'

import { useEffect, useState } from 'react'
import { api, canEdit, date, euro, list, ORDER_STATUSES, useList, type AdminUser, type Row } from '../admin-api'
import { Field, Intro, ListState, Modal, SearchBar, Status } from '../ui'
import { OrderDetail } from './orders'
import styles from '../admin.module.css'

export function Customers({ user, notify }: { user: AdminUser; notify: (message: string) => void }) {
  const [search, setSearch] = useState('')
  const customers = useList('customers')
  const [open, setOpen] = useState<Row | null>(null)
  const rows = customers.rows.filter(c => `${c.name} ${c.email}`.toLowerCase().includes(search.toLowerCase()))

  return <>
    <Intro kicker="Relationships / customers" heading="People who care." />
    <div className={styles.toolbar}><SearchBar value={search} onChange={setSearch} placeholder="Search loaded customers" /></div>
    <div className={styles.table}>{rows.map(c => <button className={`${styles.tableRow} ${styles.rowButton}`} key={c.id} onClick={() => setOpen(c)}>
      <span className={styles.avatar}>{(c.name || c.email || '?')[0].toUpperCase()}</span>
      <div className={styles.grow}><strong>{c.name || 'Unnamed customer'}</strong><small>{c.email}</small></div>
      {(c.tags || []).slice(0, 2).map((tag: string) => <span className={styles.tag} key={tag}>{tag}</span>)}
    </button>)}</div>
    <ListState loading={customers.loading} error={customers.error} empty={!rows.length} count={customers.count} shown={customers.rows.length} hasMore={customers.hasMore} loadMore={customers.loadMore} />
    {open && <CustomerDetail customer={open} user={user} notify={notify} close={() => { setOpen(null); customers.refresh() }} />}
  </>
}

function CustomerDetail({ customer, user, notify, close }: { customer: Row; user: AdminUser; notify: (m: string) => void; close: () => void }) {
  const editable = canEdit(user)
  const [form, setForm] = useState({ name: customer.name || '', phone: customer.phone || '', notes: customer.notes || '', tags: ((customer.tags || []) as string[]).join(', ') as string })
  const [orders, setOrders] = useState<Row[]>([])
  const [openOrder, setOpenOrder] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { list('orders', { customer_id: customer.id, limit: 100 }).then(r => setOrders(r.data)).catch(() => notify('Could not load orders.')) }, [customer.id, notify])

  async function save() {
    setSaving(true)
    try {
      await api('customers', 'PATCH', { id: customer.id, name: form.name, phone: form.phone || null, notes: form.notes || null, tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) })
      notify('Customer saved.')
    } catch (e: any) { notify(e.message) } finally { setSaving(false) }
  }

  const lifetime = orders.filter(o => ['paid', 'printing', 'shipped', 'delivered'].includes(o.status)).reduce((sum, o) => sum + (o.total_cents || 0), 0)
  return <Modal title={customer.name || customer.email} close={close} wide>
    <div className={styles.detailGrid}>
      <div>
        <p className={styles.address}>{customer.email}</p>
        <Field label="Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} disabled={!editable} />
        <Field label="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} disabled={!editable} />
        <Field label="Tags (comma separated)" value={form.tags} onChange={v => setForm(f => ({ ...f, tags: v }))} disabled={!editable} />
        <Field label="Internal notes" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} textarea disabled={!editable} />
        {editable && <button className={styles.primary} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save customer'}</button>}
      </div>
      <div>
        <h4>Orders ({orders.length}) · lifetime {euro(lifetime)}</h4>
        {orders.map(o => <button className={`${styles.inlineRow} ${styles.rowButton}`} key={o.id} onClick={() => setOpenOrder(o.id)}>
          <div className={styles.grow}><strong>{o.order_number}</strong><small>{date(o.created_at)}</small></div>
          <Status>{ORDER_STATUSES.find(([v]) => v === o.status)?.[1] ?? o.status}</Status><b>{euro(o.total_cents)}</b>
        </button>)}
        {!orders.length && <p className={styles.helper}>No orders yet.</p>}
      </div>
    </div>
    {openOrder && <OrderDetail id={openOrder} user={user} notify={notify} close={() => setOpenOrder(null)} />}
  </Modal>
}
