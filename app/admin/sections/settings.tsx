'use client'

import { canEdit, date, useList, type AdminUser } from '../admin-api'
import { Intro, ListState, Status } from '../ui'
import styles from '../admin.module.css'

export function AdminSettings({ user }: { user: AdminUser }) {
  return <>
    <Intro kicker="Workspace / settings" heading="Make it yours." />
    <div className={styles.settings}>
      <p className={styles.eyebrow}>Signed in as</p>
      <h3>{user.full_name || user.email}</h3>
      <p>{user.email}</p>
      <span className={styles.role}>{user.role}</span>
      <div className={styles.settingRow}><span>Two-factor authentication</span><b>Verified for this session</b></div>
      <div className={styles.settingRow}><span>Currency</span><b>EUR</b></div>
      <div className={styles.settingRow}><span>Payments</span><b>Manual (order requests)</b></div>
    </div>
    {canEdit(user) && <AuditLog />}
  </>
}

function AuditLog() {
  const log = useList('audit_log', {}, 25)
  return <>
    <h3 className={styles.sectionTitle}>Audit log</h3>
    <div className={styles.table}>{log.rows.map((entry, index) => <div className={styles.tableRow} key={entry.id ?? index}>
      <div className={styles.grow}><strong>{entry.action} · {entry.entity_type}</strong><small>{entry.entity_id} · {date(entry.created_at)} · by {String(entry.actor_id).slice(0, 8)}</small></div>
      <Status>{entry.action}</Status>
    </div>)}</div>
    <ListState loading={log.loading} error={log.error} empty={!log.rows.length} count={log.count} shown={log.rows.length} hasMore={log.hasMore} loadMore={log.loadMore} />
  </>
}
