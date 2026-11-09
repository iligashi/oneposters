'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { BarChart3, ExternalLink, LayoutDashboard, LogOut, Menu, Package, Percent, Settings, ShieldCheck, ShoppingBag, Sparkles, Users, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AdminUser } from './admin-api'
import { Overview } from './sections/overview'
import { Products } from './sections/products'
import { Orders } from './sections/orders'
import { Customers } from './sections/customers'
import { StudioQueue } from './sections/studio'
import { Discounts } from './sections/discounts'
import { Content } from './sections/content'
import { Staff } from './sections/staff'
import { AdminSettings } from './sections/settings'
import styles from './admin.module.css'

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'studio', label: 'Studio queue', icon: Sparkles },
  { id: 'discounts', label: 'Discounts', icon: Percent, roles: ['owner', 'manager'] },
  { id: 'content', label: 'Content', icon: BarChart3 },
  { id: 'staff', label: 'Staff', icon: ShieldCheck, roles: ['owner'] },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const

type Section = (typeof NAV)[number]['id']

export default function AdminDashboard({ user }: { user: AdminUser }) {
  const supabase = useMemo(() => createClient(), [])
  const [section, setSection] = useState<Section>('overview')
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const notify = useCallback((message: string) => setNotice(message), [])
  const nav = NAV.filter(item => !('roles' in item) || (item.roles as readonly string[]).includes(user.role))
  const title = nav.find(item => item.id === section)?.label || 'Overview'
  const go = (id: string) => { setSection(id as Section); setOpen(false); setNotice('') }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return <div className={styles.shell}>
    <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
      <div className={styles.brand}><span>oneposters</span><small>admin / studio</small><button className={styles.close} onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button></div>
      <nav>{nav.map(({ id, label, icon: Icon }) => <button key={id} className={section === id ? styles.active : ''} onClick={() => go(id)}><Icon />{label}</button>)}</nav>
      <div className={styles.sideBottom}><Link href="/" target="_blank"><ExternalLink /> View store</Link><button onClick={signOut}><LogOut /> Sign out</button></div>
    </aside>
    {open && <button className={styles.backdrop} onClick={() => setOpen(false)} aria-label="Close navigation" />}
    <main className={styles.main}>
      <header className={styles.header}>
        <button className={styles.menu} onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button>
        <div><p className={styles.eyebrow}>oneposters / admin</p><h1>{title}</h1></div>
        <div className={styles.headerActions}><span className={styles.avatar} title={`${user.email} (${user.role})`}>{(user.full_name || user.email || 'A')[0].toUpperCase()}</span></div>
      </header>
      <div className={styles.content}>
        {notice && <div className={styles.notice} role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X /></button></div>}
        {section === 'overview' && <Overview user={user} go={go} />}
        {section === 'products' && <Products user={user} notify={notify} />}
        {section === 'orders' && <Orders user={user} notify={notify} />}
        {section === 'customers' && <Customers user={user} notify={notify} />}
        {section === 'studio' && <StudioQueue user={user} notify={notify} />}
        {section === 'discounts' && <Discounts notify={notify} />}
        {section === 'content' && <Content user={user} notify={notify} />}
        {section === 'staff' && <Staff user={user} notify={notify} />}
        {section === 'settings' && <AdminSettings user={user} />}
      </div>
    </main>
  </div>
}
