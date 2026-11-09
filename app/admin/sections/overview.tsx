'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, CircleDollarSign, Package, Plus, ShoppingBag, Sparkles, Users } from 'lucide-react'
import { api, canEdit, date, euro, list, useList, type AdminUser, type Row } from '../admin-api'
import { Intro, Status } from '../ui'
import styles from '../admin.module.css'

type Stats = { revenueCents: number; orders: number; pendingOrders: number; products: number; customers: number; openDesigns: number }

export function Overview({ user, go }: { user: AdminUser; go: (section: string) => void }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')
  const orders = useList('orders', {}, 6)
  const [designs, setDesigns] = useState<Row[]>([])

  useEffect(() => {
    api<{ data: Stats }>('stats').then(r => setStats(r.data)).catch(e => setError(e.message))
    list('designs', { status: 'received', limit: 5 }).then(r => setDesigns(r.data)).catch(() => {})
  }, [])

  const cards = [
    ['Revenue (paid orders)', stats ? euro(stats.revenueCents) : '…', CircleDollarSign],
    ['Orders', stats ? `${stats.orders} · ${stats.pendingOrders} pending` : '…', ShoppingBag],
    ['Products', stats?.products ?? '…', Package],
    ['Customers', stats?.customers ?? '…', Users],
  ] as const

  return <>
    <Intro kicker="Today / workspace" heading="Good work, ahead." action={canEdit(user) && <button className={styles.primary} onClick={() => go('products')}><Plus /> Add product</button>} />
    {error && <p className={styles.error}>{error}</p>}
    <div className={styles.metrics}>{cards.map(([label, value, Icon]) => <article key={label}><Icon /><span>{label}</span><strong>{value}</strong><small>All time</small></article>)}</div>
    <div className={styles.grid}>
      <section className={styles.panel}>
        <div className={styles.panelHead}><div><p className={styles.eyebrow}>Recent activity</p><h3>Latest orders</h3></div><button className={styles.textButton} onClick={() => go('orders')}>View all <ChevronRight /></button></div>
        {orders.rows.map(o => <div className={styles.listRow} key={o.id}><span className={styles.orderMark}>OP</span><div><strong>{o.order_number}</strong><small>{date(o.created_at)}</small></div><Status>{o.status}</Status><b>{euro(o.total_cents)}</b></div>)}
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHead}><div><p className={styles.eyebrow}>Production · {stats?.openDesigns ?? '…'} open</p><h3>Studio queue</h3></div><button className={styles.textButton} onClick={() => go('studio')}>Open queue <ChevronRight /></button></div>
        {designs.map(d => <div className={styles.listRow} key={d.id}><span className={styles.designMark}><Sparkles /></span><div><strong>{d.size_label} print</strong><small>{d.frame || 'No frame'} / {d.paper || 'matte'}</small></div><Status>{d.status}</Status></div>)}
        {!designs.length && <p className={styles.helper}>No new custom prints.</p>}
      </section>
    </div>
  </>
}
