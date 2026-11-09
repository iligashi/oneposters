'use client'

import { useEffect, useState } from 'react'
import { Plus, Settings, Trash2 } from 'lucide-react'
import { api, canEdit, euro, fromCents, list, PRODUCT_STATUSES, slugify, toCents, useList, type AdminUser, type Row } from '../admin-api'
import { Field, Intro, ListState, Modal, SearchBar, Select } from '../ui'
import styles from '../admin.module.css'

export function Products({ user, notify }: { user: AdminUser; notify: (message: string) => void }) {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const products = useList('products', { status })
  const [categories, setCategories] = useState<Row[]>([])
  const [editing, setEditing] = useState<Row | null | undefined>(undefined)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const editable = canEdit(user)

  const loadCategories = () => list('categories', { limit: 200 }).then(r => setCategories(r.data)).catch(() => {})
  useEffect(() => { loadCategories() }, [])

  async function setProductStatus(id: string, value: string) {
    try { await api('products', 'PATCH', { id, status: value }); notify('Status updated.'); products.refresh() } catch (e: any) { notify(e.message) }
  }
  async function remove(product: Row) {
    if (!confirm(`Delete "${product.title}"? This cannot be undone.`)) return
    try { await api(`products?id=${product.id}`, 'DELETE'); notify('Product deleted.'); products.refresh() } catch (e: any) { notify(e.message) }
  }

  const rows = products.rows.filter(p => `${p.title} ${p.slug}`.toLowerCase().includes(search.toLowerCase()))
  return <>
    <Intro kicker="Catalog / products" heading="Your collection." action={editable && <button className={styles.primary} onClick={() => setEditing(null)}><Plus /> New product</button>} />
    <div className={styles.toolbar}>
      <SearchBar value={search} onChange={setSearch} placeholder="Search loaded products" />
      <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{PRODUCT_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
      {editable && <button className={styles.secondary} onClick={() => setCategoriesOpen(true)}><Settings /> Categories</button>}
    </div>
    <div className={styles.table}>{rows.map(p => <div className={styles.tableRow} key={p.id}>
      <div className={styles.grow}><strong>{p.title}</strong><small>/{p.slug} · {categories.find(c => c.id === p.category_id)?.name || 'Uncategorized'}</small></div>
      <select value={p.status} disabled={!editable} onChange={e => setProductStatus(p.id, e.target.value)} aria-label={`Status of ${p.title}`}>{PRODUCT_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
      <button className={styles.iconButton} onClick={() => setEditing(p)}>{editable ? 'Edit' : 'View'}</button>
      {editable && <button className={styles.deleteButton} onClick={() => remove(p)} aria-label={`Delete ${p.title}`}><Trash2 /></button>}
    </div>)}</div>
    <ListState loading={products.loading} error={products.error} empty={!rows.length} count={products.count} shown={products.rows.length} hasMore={products.hasMore} loadMore={products.loadMore} />
    {editing !== undefined && <ProductEditor product={editing} categories={categories} editable={editable} notify={notify} close={() => { setEditing(undefined); products.refresh() }} />}
    {categoriesOpen && <CategoryManager categories={categories} notify={notify} close={() => setCategoriesOpen(false)} refresh={loadCategories} />}
  </>
}

function ProductEditor({ product, categories, editable, notify, close }: { product: Row | null; categories: Row[]; editable: boolean; notify: (m: string) => void; close: () => void }) {
  const [saved, setSaved] = useState<Row | null>(product)
  const [form, setForm] = useState({
    title: product?.title || '', slug: product?.slug || '', description: product?.description || '', category_id: product?.category_id || '',
    status: product?.status || 'draft', seo_title: product?.seo_title || '', seo_description: product?.seo_description || '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }))

  async function save() {
    setSaving(true); setError('')
    try {
      const payload = { ...form, slug: form.slug || slugify(form.title), category_id: form.category_id || null }
      if (!payload.title.trim()) throw new Error('Title is required')
      const result = await api<{ data: Row }>('products', saved ? 'PATCH' : 'POST', saved ? { id: saved.id, ...payload } : payload)
      setSaved(result.data); notify('Product saved.')
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return <Modal title={saved ? `Edit: ${saved.title}` : 'New product'} close={close} wide>
    <div className={styles.detailGrid}>
      <div>
        <Field label="Title" value={form.title} onChange={v => set('title', v)} disabled={!editable} />
        <Field label="Slug" value={form.slug} onChange={v => set('slug', slugify(v))} placeholder={slugify(form.title)} disabled={!editable} />
        <Field label="Description" value={form.description} onChange={v => set('description', v)} textarea disabled={!editable} />
        <Select label="Category" value={form.category_id} onChange={v => set('category_id', v)} options={[['', 'Uncategorized'], ...categories.map(c => [c.id, c.name] as const)]} disabled={!editable} />
        <Select label="Status" value={form.status} onChange={v => set('status', v)} options={PRODUCT_STATUSES} disabled={!editable} />
        <Field label="SEO title" value={form.seo_title} onChange={v => set('seo_title', v)} disabled={!editable} />
        <Field label="SEO description" value={form.seo_description} onChange={v => set('seo_description', v)} textarea disabled={!editable} />
        {error && <p className={styles.error}>{error}</p>}
        {editable && <button className={styles.primary} disabled={saving} onClick={save}>{saving ? 'Saving…' : saved ? 'Save changes' : 'Create product'}</button>}
      </div>
      <div>
        {saved ? <><SizesEditor productId={saved.id} editable={editable} notify={notify} /><ImagesEditor productId={saved.id} title={form.title} editable={editable} notify={notify} /></>
          : <p className={styles.helper}>Create the product first, then add sizes, prices and images. A product needs at least one size before customers can order it.</p>}
      </div>
    </div>
  </Modal>
}

function SizesEditor({ productId, editable, notify }: { productId: string; editable: boolean; notify: (m: string) => void }) {
  const sizes = useList('product_sizes', { product_id: productId }, 100)
  const [draft, setDraft] = useState({ label: '', width_cm: '', height_cm: '', price: '' })
  const [error, setError] = useState('')

  async function add() {
    setError('')
    const price_cents = toCents(draft.price)
    if (!draft.label.trim() || !(price_cents > 0)) { setError('Enter a size label and a price.'); return }
    try {
      await api('product_sizes', 'POST', { product_id: productId, label: draft.label.trim(), width_cm: draft.width_cm ? Number(draft.width_cm) : null, height_cm: draft.height_cm ? Number(draft.height_cm) : null, price_cents })
      setDraft({ label: '', width_cm: '', height_cm: '', price: '' }); sizes.refresh(); notify('Size added.')
    } catch (e: any) { setError(e.message) }
  }
  async function updatePrice(size: Row, value: string) {
    const price_cents = toCents(value)
    if (!(price_cents > 0) || price_cents === size.price_cents) return
    try { await api('product_sizes', 'PATCH', { id: size.id, price_cents }); sizes.refresh(); notify('Price updated.') } catch (e: any) { notify(e.message) }
  }
  async function remove(size: Row) {
    if (!confirm(`Remove size ${size.label}?`)) return
    try { await api(`product_sizes?id=${size.id}`, 'DELETE'); sizes.refresh() } catch (e: any) { notify(e.message) }
  }

  return <section className={styles.subPanel}>
    <h4>Sizes &amp; prices</h4>
    {!sizes.loading && !sizes.rows.length && <p className={styles.error}>No sizes yet — this product cannot be ordered.</p>}
    {sizes.rows.map(size => <div className={styles.inlineRow} key={size.id}>
      <strong>{size.label}</strong><small>{size.width_cm && size.height_cm ? `${size.width_cm} × ${size.height_cm} cm` : ''}</small>
      {editable ? <label className={styles.priceInput}>€<input defaultValue={fromCents(size.price_cents)} onBlur={e => updatePrice(size, e.target.value)} aria-label={`Price for ${size.label}`} /></label> : <b>{euro(size.price_cents)}</b>}
      {editable && <button className={styles.deleteButton} onClick={() => remove(size)} aria-label={`Remove ${size.label}`}><Trash2 /></button>}
    </div>)}
    {editable && <div className={styles.inlineForm}>
      <input placeholder="Label (e.g. A3)" value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} />
      <input placeholder="W cm" inputMode="decimal" value={draft.width_cm} onChange={e => setDraft(d => ({ ...d, width_cm: e.target.value }))} />
      <input placeholder="H cm" inputMode="decimal" value={draft.height_cm} onChange={e => setDraft(d => ({ ...d, height_cm: e.target.value }))} />
      <input placeholder="Price €" inputMode="decimal" value={draft.price} onChange={e => setDraft(d => ({ ...d, price: e.target.value }))} />
      <button className={styles.secondary} onClick={add}><Plus /> Add</button>
    </div>}
    {error && <p className={styles.error}>{error}</p>}
  </section>
}

function ImagesEditor({ productId, title, editable, notify }: { productId: string; title: string; editable: boolean; notify: (m: string) => void }) {
  const images = useList('product_images', { product_id: productId }, 50)
  const [uploading, setUploading] = useState(false)

  async function upload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const body = new FormData(); body.append('file', file); body.append('productId', productId); body.append('alt', title)
        const response = await fetch('/api/admin/upload', { method: 'POST', body })
        const json = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(json.error || `Could not upload ${file.name}`)
      }
      notify('Images uploaded.')
    } catch (e: any) { notify(e.message) } finally { setUploading(false); images.refresh() }
  }
  async function makeCover(image: Row) {
    try {
      const others = images.rows.filter(i => i.id !== image.id)
      await api('product_images', 'PATCH', { id: image.id, sort_order: 0 })
      await Promise.all(others.map((other, index) => api('product_images', 'PATCH', { id: other.id, sort_order: index + 1 })))
      images.refresh()
    } catch (e: any) { notify(e.message) }
  }
  async function remove(image: Row) {
    if (!confirm('Remove this image from the product?')) return
    try { await api(`product_images?id=${image.id}`, 'DELETE'); images.refresh() } catch (e: any) { notify(e.message) }
  }

  return <section className={styles.subPanel}>
    <h4>Images</h4>
    <div className={styles.thumbs}>{images.rows.map((image, index) => <figure key={image.id}>
      <img src={image.url} alt={image.alt || ''} />
      <figcaption>{index === 0 ? 'Cover' : editable ? <button className={styles.textButton} onClick={() => makeCover(image)}>Make cover</button> : null}
        {editable && <button className={styles.textButton} onClick={() => remove(image)}>Remove</button>}</figcaption>
    </figure>)}</div>
    {editable && <label className={styles.field}>{uploading ? 'Uploading…' : 'Add images (JPG, PNG, WebP, AVIF · max 10 MB)'}<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} onChange={e => { upload(e.target.files); e.target.value = '' }} /></label>}
  </section>
}

function CategoryManager({ categories, notify, close, refresh }: { categories: Row[]; notify: (m: string) => void; close: () => void; refresh: () => void }) {
  const [name, setName] = useState('')
  async function add() {
    if (!name.trim()) return
    try { await api('categories', 'POST', { name: name.trim(), slug: slugify(name), sort_order: categories.length }); setName(''); refresh() } catch (e: any) { notify(e.message) }
  }
  async function remove(category: Row) {
    if (!confirm(`Delete category "${category.name}"?`)) return
    try { await api(`categories?id=${category.id}`, 'DELETE'); refresh() } catch (e: any) { notify(e.message) }
  }
  return <Modal title="Categories" close={close}>
    <div className={styles.categoryForm}><input placeholder="Category name" value={name} onChange={e => setName(e.target.value)} /><button className={styles.primary} onClick={add}>Add</button></div>
    <div className={styles.categoryList}>{categories.map(c => <div key={c.id}><span>{c.name}</span><small>/{c.slug}</small><button onClick={() => remove(c)} aria-label={`Delete ${c.name}`}><Trash2 /></button></div>)}</div>
  </Modal>
}
