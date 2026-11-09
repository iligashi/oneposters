'use client'

import { useState } from 'react'
import { api, list, useList, type AdminUser, type Row } from '../admin-api'
import { Intro, ListState } from '../ui'
import styles from '../admin.module.css'

const ROLE_OPTIONS = [['owner', 'Owner — everything, including staff'], ['manager', 'Manager — catalog, orders, content'], ['support', 'Support — read-only'], ['customer', 'Remove staff access']] as const

export function Staff({ user, notify }: { user: AdminUser; notify: (message: string) => void }) {
  const staff = useList('staff')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('support')

  async function changeRole(profile: Row, value: string) {
    if (value === 'customer' && !confirm(`Remove staff access for ${profile.email}?`)) return
    try { await api('staff', 'PATCH', { id: profile.id, role: value }); notify('Role updated.'); staff.refresh() } catch (e: any) { notify(e.message) }
  }

  async function invite() {
    const address = email.trim().toLowerCase()
    if (!address) return
    try {
      const found = await list('staff', { email: address, role: 'customer', limit: 1 })
      const profile = found.data[0]
      if (!profile) { notify('No customer account with that email. Ask them to sign up first, then add them here.'); return }
      await api('staff', 'PATCH', { id: profile.id, role })
      setEmail(''); notify(`${address} is now ${role}. They will set up two-factor on first admin sign-in.`); staff.refresh()
    } catch (e: any) { notify(e.message) }
  }

  return <>
    <Intro kicker="Workspace / staff" heading="Who can do what." />
    <div className={styles.inlineForm}>
      <input type="email" placeholder="Existing account email" value={email} onChange={e => setEmail(e.target.value)} />
      <select value={role} onChange={e => setRole(e.target.value)} aria-label="Role">{ROLE_OPTIONS.slice(0, 3).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <button className={styles.primary} onClick={invite}>Add staff</button>
    </div>
    <div className={styles.table}>{staff.rows.map(p => <div className={styles.tableRow} key={p.id}>
      <span className={styles.avatar}>{(p.full_name || p.email || '?')[0].toUpperCase()}</span>
      <div className={styles.grow}><strong>{p.full_name || p.email}</strong><small>{p.email}{p.id === user.id ? ' · you' : ''}</small></div>
      <select value={p.role} disabled={p.id === user.id} onChange={e => changeRole(p, e.target.value)} aria-label={`Role for ${p.email}`}>{ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </div>)}</div>
    <ListState loading={staff.loading} error={staff.error} empty={!staff.rows.length} count={staff.count} shown={staff.rows.length} hasMore={staff.hasMore} loadMore={staff.loadMore} />
  </>
}
