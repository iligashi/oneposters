'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api, canEdit, date, slugify, useList, type AdminUser, type Row } from '../admin-api'
import { Field, Intro, ListState, Modal, Select, Status } from '../ui'
import styles from '../admin.module.css'

export function Content({ user, notify }: { user: AdminUser; notify: (message: string) => void }) {
  const editable = canEdit(user)
  const posts = useList('posts')
  const social = useList('social_posts')
  const site = useList('site_content', {}, 100)
  const [post, setPost] = useState<Row | null | undefined>(undefined)
  const [entry, setEntry] = useState<Row | null | undefined>(undefined)
  const [caption, setCaption] = useState('')

  async function remove(resource: string, query: string, refresh: () => void) {
    if (!confirm('Delete this item?')) return
    try { await api(`${resource}?${query}`, 'DELETE'); refresh(); notify('Deleted.') } catch (e: any) { notify(e.message) }
  }
  async function addSocial() {
    if (!caption.trim()) return
    try { await api('social_posts', 'POST', { caption: caption.trim(), status: 'draft' }); setCaption(''); social.refresh() } catch (e: any) { notify(e.message) }
  }

  return <>
    <Intro kicker="Brand / content" heading="Shape the story." action={editable && <button className={styles.primary} onClick={() => setPost(null)}><Plus /> New post</button>} />

    <h3 className={styles.sectionTitle}>Editorial posts</h3>
    <div className={styles.table}>{posts.rows.map(p => <div className={styles.tableRow} key={p.id}>
      <div className={styles.grow}><strong>{p.title}</strong><small>/{p.slug} · {date(p.created_at)}</small></div>
      <Status>{p.status}</Status>
      <button className={styles.iconButton} onClick={() => setPost(p)}>{editable ? 'Edit' : 'View'}</button>
      {editable && <button className={styles.deleteButton} onClick={() => remove('posts', `id=${p.id}`, posts.refresh)} aria-label={`Delete ${p.title}`}><Trash2 /></button>}
    </div>)}</div>
    <ListState loading={posts.loading} error={posts.error} empty={!posts.rows.length} count={posts.count} shown={posts.rows.length} hasMore={posts.hasMore} loadMore={posts.loadMore} />

    <h3 className={styles.sectionTitle}>Social drafts</h3>
    {editable && <div className={styles.inlineForm}><input placeholder="Draft caption" value={caption} onChange={e => setCaption(e.target.value)} /><button className={styles.secondary} onClick={addSocial}><Plus /> Add draft</button></div>}
    <div className={styles.table}>{social.rows.map(s => <div className={styles.tableRow} key={s.id}>
      <div className={styles.grow}><strong>{s.caption}</strong><small>{s.scheduled_at ? `Scheduled ${date(s.scheduled_at)}` : 'Not scheduled'}</small></div>
      <Status>{s.status}</Status>
      {editable && <button className={styles.deleteButton} onClick={() => remove('social_posts', `id=${s.id}`, social.refresh)} aria-label="Delete draft"><Trash2 /></button>}
    </div>)}</div>
    <ListState loading={social.loading} error={social.error} empty={!social.rows.length} count={social.count} shown={social.rows.length} hasMore={social.hasMore} loadMore={social.loadMore} />

    <h3 className={styles.sectionTitle}>Site content</h3>
    {editable && <button className={styles.secondary} onClick={() => setEntry(null)}><Plus /> Add value</button>}
    <div className={styles.table}>{site.rows.map(c => <div className={styles.tableRow} key={c.key}>
      <div className={styles.grow}><strong>{c.key}</strong><small>{typeof c.value === 'string' ? c.value.slice(0, 120) : JSON.stringify(c.value).slice(0, 120)}</small></div>
      {editable && <><button className={styles.iconButton} onClick={() => setEntry(c)}>Edit</button><button className={styles.deleteButton} onClick={() => remove('site_content', `key=${encodeURIComponent(c.key)}`, site.refresh)} aria-label={`Delete ${c.key}`}><Trash2 /></button></>}
    </div>)}</div>
    <ListState loading={site.loading} error={site.error} empty={!site.rows.length} count={site.count} shown={site.rows.length} hasMore={site.hasMore} loadMore={site.loadMore} />

    {post !== undefined && <PostEditor post={post} editable={editable} notify={notify} close={() => { setPost(undefined); posts.refresh() }} />}
    {entry !== undefined && <SiteContentEditor entry={entry} notify={notify} close={() => { setEntry(undefined); site.refresh() }} />}
  </>
}

function PostEditor({ post, editable, notify, close }: { post: Row | null; editable: boolean; notify: (m: string) => void; close: () => void }) {
  const [form, setForm] = useState({ title: post?.title || '', slug: post?.slug || '', body: post?.body || '', cover_url: post?.cover_url || '', status: post?.status || 'draft' })
  const [error, setError] = useState('')
  const set = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }))
  async function save() {
    if (!form.title.trim()) { setError('Title is required.'); return }
    const payload = { ...form, slug: form.slug || slugify(form.title), cover_url: form.cover_url || null }
    try { await api('posts', post ? 'PATCH' : 'POST', post ? { id: post.id, ...payload } : payload); notify('Post saved.'); close() } catch (e: any) { setError(e.message) }
  }
  return <Modal title={post ? 'Edit post' : 'New post'} close={close} wide>
    <Field label="Title" value={form.title} onChange={v => set('title', v)} disabled={!editable} />
    <Field label="Slug" value={form.slug} onChange={v => set('slug', slugify(v))} placeholder={slugify(form.title)} disabled={!editable} />
    <Field label="Cover image URL" value={form.cover_url} onChange={v => set('cover_url', v)} disabled={!editable} />
    <Field label="Body" value={form.body} onChange={v => set('body', v)} textarea disabled={!editable} />
    <Select label="Status" value={form.status} onChange={v => set('status', v)} options={['draft', 'published', 'archived']} disabled={!editable} />
    {error && <p className={styles.error}>{error}</p>}
    {editable && <button className={styles.primary} onClick={save}>Save post</button>}
  </Modal>
}

function SiteContentEditor({ entry, notify, close }: { entry: Row | null; notify: (m: string) => void; close: () => void }) {
  const [key, setKey] = useState(entry?.key || '')
  const [value, setValue] = useState(entry ? (typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value, null, 2)) : '')
  const [error, setError] = useState('')
  async function save() {
    if (!key.trim()) { setError('Key is required.'); return }
    try { await api('site_content', entry ? 'PATCH' : 'POST', { key: key.trim(), value }); notify('Saved.'); close() } catch (e: any) { setError(e.message) }
  }
  return <Modal title={entry ? `Edit ${entry.key}` : 'New site content value'} close={close}>
    <Field label="Key" value={key} onChange={setKey} disabled={Boolean(entry)} placeholder="homepage.hero.title" />
    <Field label="Value" value={value} onChange={setValue} textarea />
    {error && <p className={styles.error}>{error}</p>}
    <button className={styles.primary} onClick={save}>Save</button>
  </Modal>
}
