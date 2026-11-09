'use client'

import { useState } from 'react'
import { api, artworkUrl, canEdit, date, DESIGN_STATUSES, useList, type AdminUser, type Row } from '../admin-api'
import { Intro, ListState } from '../ui'
import { OrderDetail } from './orders'
import styles from '../admin.module.css'

export function StudioQueue({ user, notify }: { user: AdminUser; notify: (message: string) => void }) {
  const [status, setStatus] = useState('received')
  const designs = useList('designs', { status })
  const [openOrder, setOpenOrder] = useState<string | null>(null)
  const editable = canEdit(user)

  async function update(design: Row, value: string) {
    try { await api('designs', 'PATCH', { id: design.id, status: value }); notify('Design updated.'); designs.refresh() } catch (e: any) { notify(e.message) }
  }

  return <>
    <Intro kicker="Production / custom work" heading="Make it personal." />
    <div className={styles.toolbar}>
      <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All designs</option>{DESIGN_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
    </div>
    <div className={styles.table}>{designs.rows.map(d => {
      const settings = d.settings || {}
      return <div className={styles.tableRow} key={d.id}>
        <a href={artworkUrl(d.original_image_url)} target="_blank" rel="noreferrer" className={styles.productThumb}><img src={artworkUrl(d.original_image_url)} alt="Customer artwork" /></a>
        <div className={styles.grow}>
          <strong>{d.size_label} custom print{settings.quantity > 1 ? ` × ${settings.quantity}` : ''}</strong>
          <small>{d.frame || 'No frame'} · {d.paper || 'matte'} · {settings.orientation || 'portrait'}{settings.showText && settings.title ? ` · title “${settings.title}”` : ''} · {date(d.created_at)}</small>
          <small><a className={styles.textButton} href={artworkUrl(d.original_image_url, true)}>Download original</a>{d.order_id && <button className={styles.textButton} onClick={() => setOpenOrder(d.order_id)}>Open order</button>}</small>
        </div>
        <select value={d.status} disabled={!editable} onChange={e => update(d, e.target.value)} aria-label="Design status">{DESIGN_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
      </div>
    })}</div>
    <ListState loading={designs.loading} error={designs.error} empty={!designs.rows.length} count={designs.count} shown={designs.rows.length} hasMore={designs.hasMore} loadMore={designs.loadMore} />
    {openOrder && <OrderDetail id={openOrder} user={user} notify={notify} close={() => setOpenOrder(null)} />}
  </>
}
