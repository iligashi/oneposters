'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, ChevronDown, ImagePlus, Minus, Move, Plus, Redo2, RotateCcw, RotateCw, Save, Sparkles, Type, Undo2, Upload } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { CartDrawer } from '@/components/cart'
import { frameAddons, paperAddons, sizePrices, useStudioStore, type Filter, type Frame, type Paper, type StudioState } from '@/lib/studio-store'
import styles from './studio.module.css'

const demo = 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1200&q=88'
const filters: { id: Filter; label: string }[] = [
  { id: 'original', label: 'Original' }, { id: 'bw', label: 'Mono' }, { id: 'warm', label: 'Warm' },
  { id: 'grain', label: 'Grain' }, { id: 'duotone', label: 'Blue tone' },
]
const sizes = Object.keys(sizePrices) as (keyof typeof sizePrices)[]
const frames: { id: Frame; label: string }[] = [
  { id: 'none', label: 'No frame' }, { id: 'black', label: 'Black' }, { id: 'white', label: 'White' },
  { id: 'oak', label: 'Oak' }, { id: 'colored', label: 'Custom' },
]
const papers: { id: Paper; label: string; detail: string }[] = [
  { id: 'matte', label: 'Matte', detail: 'Soft, low-glare finish' },
  { id: 'satin', label: 'Satin', detail: 'A little more colour depth' },
  { id: 'fine-art', label: 'Fine art', detail: 'Textured cotton paper' },
]
type Snapshot = Omit<StudioState, 'set' | 'reset'>
type EditorTab = 'artwork' | 'layout' | 'finish'

export default function StudioPage() {
  const state = useStudioStore()
  const set = state.set
  const addToCart = useCartStore(value => value.add)
  const fileRef = useRef<HTMLInputElement>(null)
  const drag = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null)
  const [history, setHistory] = useState<Snapshot[]>([])
  const [future, setFuture] = useState<Snapshot[]>([])
  const [tab, setTab] = useState<EditorTab>('artwork')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('Draft saved on this device')
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const total = sizePrices[state.size] + frameAddons[state.frame] + paperAddons[state.paper]
  const quality = useMemo(() => {
    const dimensions: Record<string, [number, number]> = {
      A4: [8.27, 11.7], A3: [11.69, 16.5], '30×40': [11.8, 15.7], '50×70': [19.7, 27.5], '70×100': [27.5, 39.3],
    }
    const [w, h] = dimensions[state.size] || dimensions.A3
    const dpi = Math.min(state.imageWidth / w, state.imageHeight / h)
    return dpi >= 220 ? { label: 'Excellent', detail: 'Your image is ready for a crisp print.', level: 'good' }
      : dpi >= 150 ? { label: 'Good', detail: 'Looks good at normal viewing distance.', level: 'okay' }
        : { label: 'Low resolution', detail: 'A larger image will print more clearly.', level: 'low' }
  }, [state.imageWidth, state.imageHeight, state.size])
  const filterStyle = state.filter === 'bw' ? 'grayscale(1)' : state.filter === 'warm' ? 'sepia(.28) saturate(1.2)'
    : state.filter === 'grain' ? 'contrast(1.1) saturate(.85)' : state.filter === 'duotone' ? 'grayscale(1) sepia(1) hue-rotate(175deg) saturate(2.6)' : ''
  const frameColor = state.frame === 'colored' ? state.frameColor : state.frame === 'white' ? '#f5f1e9'
    : state.frame === 'oak' ? '#a77d54' : state.frame === 'black' ? '#181816' : 'transparent'

  function snapshot(): Snapshot {
    const { set: _set, reset: _reset, ...current } = useStudioStore.getState()
    return current
  }
  function patch(next: Partial<StudioState>) {
    setHistory(items => [...items.slice(-29), snapshot()]); setFuture([]); set(next); setMessage('Unsaved changes')
  }
  function undo() {
    const previous = history.at(-1); if (!previous) return
    setFuture(items => [snapshot(), ...items]); set(previous); setHistory(items => items.slice(0, -1)); setMessage('Change undone')
  }
  function redo() {
    const next = future[0]; if (!next) return
    setHistory(items => [...items, snapshot()]); set(next); setFuture(items => items.slice(1)); setMessage('Change restored')
  }
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo() }
      if (event.key.toLowerCase() === 'y') { event.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [history, future])
  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setMessage('Choose a JPG, PNG, WebP or AVIF image under 10 MB'); event.target.value = ''; return
    }
    setUploading(true)
    const localUrl = URL.createObjectURL(file); const image = new Image()
    image.onload = () => patch({ image: localUrl, imageWidth: image.naturalWidth, imageHeight: image.naturalHeight }); image.src = localUrl
    const form = new FormData(); form.append('file', file)
    try {
      const response = await fetch('/api/studio/upload', { method: 'POST', body: form }); const result = await response.json().catch(() => ({}))
      if (response.status === 401) { setNeedsSignIn(true); patch({ artworkPath: '' }); setMessage('Sign in to upload your image and order this print'); return }
      if (!response.ok) throw new Error(result.error || 'Upload failed')
      const previewUrl = result.url || `/api/studio/artwork?path=${encodeURIComponent(result.pathname)}`
      setNeedsSignIn(false)
      patch({ image: previewUrl, artworkPath: result.pathname, imageWidth: image.naturalWidth, imageHeight: image.naturalHeight }); URL.revokeObjectURL(localUrl); setMessage('Image uploaded')
    } catch (error) { patch({ artworkPath: '' }); setMessage(error instanceof Error ? error.message : 'Upload failed. Please try again') }
    finally { setUploading(false); event.target.value = '' }
  }
  function beginPan(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offsetX: state.offsetX, offsetY: state.offsetY }
    setHistory(items => [...items.slice(-29), snapshot()]); setFuture([])
  }
  function pan(event: React.PointerEvent<HTMLDivElement>) {
    const start = drag.current; if (!start || start.pointerId !== event.pointerId) return
    set({ offsetX: start.offsetX + (event.clientX - start.x) / 3, offsetY: start.offsetY + (event.clientY - start.y) / 3 }); setMessage('Unsaved changes')
  }
  function saveDraft() {
    const savedAt = new Date().toISOString(); set({ savedAt }); localStorage.setItem('oneposters-studio-saved', savedAt); setMessage('Draft saved on this device')
  }
  function addToBag() {
    if (!state.artworkPath) { setMessage(needsSignIn ? 'Sign in and upload your image to order this print' : 'Upload your own image to order a custom print'); return }
    const { set: _set, reset: _reset, image: _image, artworkPath, savedAt: _savedAt, size, frame, paper, ...settings } = useStudioStore.getState()
    addToCart({ id: `custom-${Date.now()}`, title: state.title.trim() || 'Custom poster', image: state.image, price: total, category: 'Custom', custom: { size, frame, paper, mockup: state.image, artworkPath, settings } })
  }

  return <main className={styles.studio}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.brand}><span className={styles.brandMark}>o</span><span>oneposters<small>PRINT STUDIO</small></span></Link>
      <div className={styles.project}><span className={styles.liveDot} /> Untitled poster <ChevronDown size={14} /></div>
      <div className={styles.topActions}><span className={styles.saveState}><span />{message}</span>
        <button className={styles.iconButton} onClick={undo} disabled={!history.length} aria-label="Undo" title="Undo"><Undo2 size={17} /></button>
        <button className={styles.iconButton} onClick={redo} disabled={!future.length} aria-label="Redo" title="Redo"><Redo2 size={17} /></button>
        <button className={styles.saveButton} onClick={saveDraft}><Save size={15} /> Save draft</button>
      </div>
    </header>
    <section className={styles.workspace}>
      <div className={styles.headingRow}><div><Link href="/shop" className={styles.backLink}><ArrowLeft size={14} /> Back to collection</Link><h1>Make it <em>yours.</em></h1><p>Build a print that feels like it belongs on your wall.</p></div>
        <button className={styles.resetButton} onClick={() => { if (window.confirm('Reset your poster design?')) { useStudioStore.getState().reset(); setHistory([]); setFuture([]); setMessage('Design reset') } }}><RotateCcw size={14} /> Reset design</button>
      </div>
      <div className={styles.editor}>
        <section className={styles.canvasColumn} aria-label="Poster preview">
          <div className={styles.canvasHeader}><div><span className={styles.canvasEyebrow}>LIVE PREVIEW</span><span className={styles.canvasStatus}><Sparkles size={13} /> Print preview</span></div><span className={styles.canvasHint}><Move size={13} /> Drag artwork to reposition</span></div>
          <div className={styles.stage}>
            <div className={`${styles.posterFrame} ${state.frame !== 'none' ? styles.framed : ''}`} style={{ '--frame-color': frameColor } as React.CSSProperties}>
              <div className={styles.poster} onPointerDown={beginPan} onPointerMove={pan} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} style={{ backgroundColor: state.accent, padding: `${state.border}px`, filter: `${filterStyle} brightness(${state.brightness}%) contrast(${state.contrast}%)`, transform: `rotate(${state.rotate}deg)`, aspectRatio: state.orientation === 'portrait' ? '4 / 5' : '5 / 4' }}>
                <img src={state.image || demo} alt="Poster artwork preview" draggable={false} style={{ objectFit: state.fit === 'fill' ? 'cover' : 'contain', transform: `scale(${state.zoom / 100}) translate(${state.offsetX}px, ${state.offsetY}px)` }} />
                {state.showText && <div className={styles.posterTitle} style={{ color: state.titleColor, fontFamily: state.titleFont, fontSize: `clamp(12px, ${state.titleSize / 8}cqw, 56px)`, left: `${state.titleX}%`, top: `${state.titleY}%` }}>{state.title || 'YOUR POSTER'}</div>}
              </div>
            </div>
            <div className={styles.stageShadow} />
            <span className={`${styles.corner} ${styles.cornerTopLeft}`} /><span className={`${styles.corner} ${styles.cornerTopRight}`} /><span className={`${styles.corner} ${styles.cornerBottomLeft}`} /><span className={`${styles.corner} ${styles.cornerBottomRight}`} />
          </div>
          <div className={styles.canvasFooter}><div><span className={styles.qualityDot} data-level={quality.level} /><div><strong>{quality.label}</strong><span>{quality.detail}</span></div></div><span>{state.size} · {state.frame === 'none' ? 'Unframed' : `${state.frame} frame`} · {state.paper}</span></div>
          <div className={styles.canvasTools}><div className={styles.toolGroup}><button onClick={() => patch({ zoom: Math.max(80, state.zoom - 10) })} aria-label="Zoom out"><Minus size={15} /></button><input type="range" min="80" max="180" value={state.zoom} onChange={event => patch({ zoom: Number(event.target.value) })} aria-label="Artwork zoom"/><button onClick={() => patch({ zoom: Math.min(180, state.zoom + 10) })} aria-label="Zoom in"><Plus size={15} /></button><span>{state.zoom}%</span></div>
            <span className={styles.toolDivider} /><button className={styles.fitButton} onClick={() => patch({ fit: state.fit === 'fill' ? 'fit' : 'fill', offsetX: 0, offsetY: 0 })}>{state.fit === 'fill' ? 'Fill' : 'Fit'} image</button><button className={styles.fitButton} onClick={() => patch({ rotate: (state.rotate + 90) % 360 })}><RotateCw size={14} /> Rotate</button>
          </div>
        </section>
        <aside className={styles.panel} aria-label="Poster settings">
          <div className={styles.panelHeading}><div><span className={styles.panelEyebrow}>YOUR CANVAS</span><h2>Design details</h2></div><span className={styles.stepCount}>01 <i>/</i> 03</span></div>
          <div className={styles.tabs} role="tablist" aria-label="Editor sections">{([['artwork', 'Artwork', ImagePlus], ['layout', 'Layout', Type], ['finish', 'Finish', Sparkles]] as const).map(([id, label, Icon], index) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? styles.tabActive : ''} onClick={() => setTab(id)}><span>{String(index + 1).padStart(2, '0')}</span><Icon size={15} />{label}</button>)}</div>
          <div className={styles.controls}>
            {tab === 'artwork' && <>
              <section className={styles.controlSection}><div className={styles.sectionTitle}><div><h3>Your image</h3><p>Start with a photo or artwork.</p></div></div>
                <button className={styles.uploadCard} onClick={() => fileRef.current?.click()} disabled={uploading}><span className={styles.uploadIcon}><Upload size={18} /></span><span><strong>{uploading ? 'Uploading image…' : 'Upload an image'}</strong><small>JPG, PNG, WebP or AVIF · up to 10 MB</small></span><Plus size={17} /></button><input ref={fileRef} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={upload} />
                {needsSignIn && <p className={styles.demoLink}><a href="/auth/login?next=/studio">Sign in</a> or <a href="/auth/sign-up">create an account</a> to upload your image.</p>}
                <button className={styles.demoLink} onClick={() => patch({ image: demo, artworkPath: '', imageWidth: 1200, imageHeight: 1200 })}>Try the sample artwork <ArrowLeft size={13} /></button>
              </section>
              <section className={styles.controlSection}><div className={styles.sectionTitle}><div><h3>Image treatment</h3><p>Set a mood with one tap.</p></div></div><div className={styles.filterGrid}>{filters.map((filter, index) => <button key={filter.id} className={state.filter === filter.id ? styles.filterActive : ''} onClick={() => patch({ filter: filter.id })}><span className={`${styles.filterSwatch} ${styles[`swatch${index}`]}`} /><span>{filter.label}</span></button>)}</div></section>
            </>}
            {tab === 'layout' && <>
              <section className={styles.controlSection}><div className={styles.sectionTitle}><div><h3>Print size</h3><p>Every size is printed to order.</p></div></div><div className={styles.sizeList}>{sizes.map(value => <button key={value} className={state.size === value ? styles.sizeActive : ''} onClick={() => patch({ size: value })}><span className={styles.sizeIcon} data-size={value === 'A4' ? 'small' : value === 'A3' ? 'medium' : 'large'} /><span><strong>{value}</strong><small>{value === 'A4' ? '21 × 29.7 cm' : value === 'A3' ? '29.7 × 42 cm' : value.startsWith('30') && value.endsWith('40') ? '30 × 40 cm' : value.startsWith('50') && value.endsWith('70') ? '50 × 70 cm' : '70 × 100 cm'}</small></span><strong className={styles.sizePrice}>€{sizePrices[value]}</strong><span className={styles.radio} /></button>)}</div></section>
              <section className={styles.controlSection}><div className={styles.sectionTitle}><div><h3>Image placement</h3><p>Choose how your image fills the print.</p></div></div><div className={styles.segment}><button className={state.fit === 'fill' ? styles.segmentActive : ''} onClick={() => patch({ fit: 'fill' })}>Fill the print</button><button className={state.fit === 'fit' ? styles.segmentActive : ''} onClick={() => patch({ fit: 'fit' })}>Show all</button></div><label className={styles.rangeLabel}>White border <span>{state.border}px</span></label><input className={styles.range} type="range" min="0" max="32" value={state.border} onChange={event => patch({ border: Number(event.target.value) })} /></section>
            </>}
            {tab === 'finish' && <>
              <section className={styles.controlSection}><div className={styles.sectionTitle}><div><h3>Choose a frame</h3><p>Give your print a finished edge.</p></div></div><div className={styles.frameGrid}>{frames.map(({ id, label }) => <button key={id} className={state.frame === id ? styles.frameActive : ''} onClick={() => patch({ frame: id })}><span className={`${styles.frameSample} ${styles[`frame${id}`]}`} /><strong>{label}</strong><small>{frameAddons[id] ? `+€${frameAddons[id]}` : 'Included'}</small></button>)}</div>{state.frame === 'colored' && <label className={styles.colorChoice}>Frame colour<input type="color" value={state.frameColor} onChange={event => patch({ frameColor: event.target.value })} /></label>}</section>
              <section className={styles.controlSection}><div className={styles.sectionTitle}><div><h3>Paper finish</h3><p>Feel the difference in the details.</p></div></div><div className={styles.paperList}>{papers.map(({ id, label, detail }) => <button key={id} className={state.paper === id ? styles.paperActive : ''} onClick={() => patch({ paper: id })}><span className={styles.radio} /><span><strong>{label}</strong><small>{detail}</small></span><b>{paperAddons[id] ? `+€${paperAddons[id]}` : 'Included'}</b></button>)}</div></section>
            </>}
          </div>
          <section className={styles.titleSection}><div className={styles.titleToggle}><span className={styles.titleIcon}><Type size={16} /></span><div><strong>Poster text</strong><small>Add a title to your artwork</small></div><button className={`${styles.switch} ${state.showText ? styles.switchOn : ''}`} role="switch" aria-checked={state.showText} aria-label="Show poster text" onClick={() => patch({ showText: !state.showText })}><span /></button></div>{state.showText && <><input className={styles.titleInput} value={state.title} maxLength={60} onChange={event => patch({ title: event.target.value })} aria-label="Poster title" placeholder="Add your title"/><div className={styles.titleOptions}><select value={state.titleFont} onChange={event => patch({ titleFont: event.target.value })} aria-label="Title font"><option>Arial</option><option>Georgia</option><option>Courier New</option></select><input type="color" value={state.titleColor} onChange={event => patch({ titleColor: event.target.value })} aria-label="Title colour"/><label><span>Size</span><input type="range" min="18" max="100" value={state.titleSize} onChange={event => patch({ titleSize: Number(event.target.value) })} aria-label="Title size"/></label></div><div className={styles.titlePosition}><span>Position</span><label>X<input type="range" min="10" max="90" value={state.titleX} onChange={event => patch({ titleX: Number(event.target.value) })}/></label><label>Y<input type="range" min="10" max="90" value={state.titleY} onChange={event => patch({ titleY: Number(event.target.value) })}/></label></div></>}</section>
          <div className={styles.panelBottom}><div className={styles.total}><span>Total <i>incl. VAT</i></span><strong>€{total.toFixed(2)}</strong></div><button className={styles.addButton} onClick={addToBag} disabled={uploading}>Add custom print to bag <Plus size={17} /></button>{!state.artworkPath && <p>Upload your own image to order this print.</p>}<p><Check size={13} /> Made to order · Secure checkout</p></div>
        </aside>
      </div>
      <footer className={styles.footer}><span>Thoughtfully made, just for you.</span><Link href="/shipping-returns">Print & delivery details <ArrowLeft size={13} /></Link></footer>
    </section>
    <CartDrawer />
  </main>
}

