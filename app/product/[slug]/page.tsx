'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { ArrowLeft, ArrowRight, Check, Heart, Image as ImageIcon, ShieldCheck, Truck } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getProduct, products, type Product } from '@/data/products'
import { useCartStore } from '@/lib/cart-store'
import { fetchPublishedProduct } from '@/lib/catalog'
import { Header, ProductCard, SearchPalette } from '@/components/store'
import styles from './product.module.css'

type RemoteImage = { id?: string; url: string; alt?: string | null }
type RemoteSize = { id?: string; label: string; width_cm?: number; height_cm?: number; price_cents: number }
type ProductRecord = Product & { id?: string; product_images?: RemoteImage[]; product_sizes?: RemoteSize[] }
type PrintSize = { label: string; dimensions: string; price: number }
const sizeAddons: Record<string, number> = { A4: 0, A3: 8, '30×40': 14, '50×70': 22, '70×100': 30 }
const frames = [{ name: 'No frame', value: 'none', price: 0 }, { name: 'Black ash', value: 'black', price: 12 }, { name: 'Soft white', value: 'white', price: 12 }, { name: 'Natural oak', value: 'oak', price: 18 }]
const dimensions: Record<string, string> = { A4: '21 × 29.7 cm', A3: '29.7 × 42 cm', '30×40': '30 × 40 cm', '50×70': '50 × 70 cm', '70×100': '70 × 100 cm' }

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { data: remoteProduct, isLoading } = useSWR(['published-product', slug], () => fetchPublishedProduct(slug))
  const fallback = getProduct(slug)
  const product = (remoteProduct || fallback) as ProductRecord | undefined
  const addToCart = useCartStore(state => state.add)
  const [size, setSize] = useState('A3')
  const [frame, setFrame] = useState('none')
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [liked, setLiked] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [detailTab, setDetailTab] = useState<'story' | 'print' | 'delivery'>('story')
  const [openFaq, setOpenFaq] = useState<string | null>(null)

  const sizeOptions: PrintSize[] = useMemo(() => {
    if (product?.product_sizes?.length) return product.product_sizes.map(row => ({
      label: row.label,
      dimensions: row.width_cm && row.height_cm ? `${row.width_cm} × ${row.height_cm} cm` : dimensions[row.label] || row.label,
      price: row.price_cents / 100,
    }))
    return (product?.sizes || []).map(label => ({ label, dimensions: dimensions[label] || label, price: (product?.price || 32) + (sizeAddons[label] || 0) }))
  }, [product])
  const activeSize = sizeOptions.find(option => option.label === size) || sizeOptions[0]
  const activeFrame = frames.find(option => option.value === frame) || frames[0]
  const price = (activeSize?.price ?? product?.price ?? 32) + activeFrame.price
  const images = product ? (product.product_images?.length ? product.product_images.map(image => ({ src: image.url, alt: image.alt || product.title })) : [{ src: product.image, alt: product.title }]) : []
  const related = products.filter(item => item.category === product?.category && item.slug !== slug).slice(0, 4)

  useEffect(() => {
    if (!product) return
    try { setLiked((JSON.parse(localStorage.getItem('oneposters-wishlist') || '[]') as string[]).includes(slug)) } catch { setLiked(false) }
    setGalleryIndex(0)
  }, [slug, product?.image])
  useEffect(() => { if (sizeOptions.length && !sizeOptions.some(option => option.label === size)) setSize(sizeOptions[0].label) }, [sizeOptions, size])

  if (!product && isLoading) return <main className={styles.loading}><Header /><div><span className={styles.loadingMark}><ImageIcon size={20} /></span><p>Finding your print…</p></div></main>
  if (!product) return notFound()

  function toggleWishlist() {
    try {
      const current = JSON.parse(localStorage.getItem('oneposters-wishlist') || '[]') as string[]
      const next = liked ? current.filter(item => item !== slug) : [...new Set([...current, slug])]
      localStorage.setItem('oneposters-wishlist', JSON.stringify(next)); setLiked(!liked); window.dispatchEvent(new Event('wishlist-updated'))
    } catch {}
  }
  function add() {
    addToCart({ id: `${slug}-${activeSize?.label || size}-${frame}`, productId: product!.id, title: product!.title, image: images[galleryIndex]?.src || product!.image, price, category: product!.category, custom: { size: activeSize?.label || size, frame, paper: 'matte' } })
  }

  return <main className={styles.productPage}>
    <Header onSearch={() => setSearchOpen(true)} />
    <div className={styles.breadcrumb}><Link href="/shop"><ArrowLeft size={13} /> All prints</Link><span>/</span><span>{product.category}</span><span>/</span><span>{product.title}</span></div>
    <section className={styles.productLayout}>
      <div className={styles.gallery}>
        <div className={styles.mainImage}><img src={images[galleryIndex]?.src || product.image} alt={images[galleryIndex]?.alt || product.title} /><span className={styles.imageCount}>{String(galleryIndex + 1).padStart(2, '0')} <i>/</i> {String(images.length).padStart(2, '0')}</span><span className={styles.imageBadge}>MADE TO ORDER</span></div>
        {images.length > 1 && <div className={styles.thumbnails}>{images.map((image, index) => <button key={`${image.src}-${index}`} className={galleryIndex === index ? styles.thumbnailActive : ''} onClick={() => setGalleryIndex(index)} aria-label={`View image ${index + 1}`}><img src={image.src} alt="" /></button>)}</div>}
        <div className={styles.galleryNote}><span>01 — 04</span><span>Printed with care in our studio</span></div>
      </div>

      <div className={styles.info}>
        <div className={styles.titleBlock}><span className={styles.eyebrow}>{product.category} <i>·</i> ONEPOSTERS EDITION</span><div className={styles.titleRow}><h1>{product.title}</h1><button className={`${styles.wishlist} ${liked ? styles.wishlisted : ''}`} onClick={toggleWishlist} aria-label={liked ? 'Remove from wishlist' : 'Save to wishlist'}><Heart size={18} fill={liked ? 'currentColor' : 'none'} /></button></div><p>{product.description}</p></div>
        <div className={styles.priceLine}><strong>€{price.toFixed(2)}</strong><span>Shipping calculated at checkout</span></div>

        <section className={styles.optionBlock}><div className={styles.optionHeading}><h2>Choose your size</h2><button onClick={() => setOpenFaq(openFaq === 'size' ? null : 'size')}>Size guide <ArrowRight size={12} /></button></div><div className={styles.sizeChoices}>{sizeOptions.map(option => <button key={option.label} className={activeSize?.label === option.label ? styles.sizeSelected : ''} onClick={() => setSize(option.label)}><span className={styles.sizeName}>{option.label}</span><span className={styles.sizeDimensions}>{option.dimensions}</span><span className={styles.sizePrice}>€{option.price.toFixed(2)}</span></button>)}</div>{openFaq === 'size' && <p className={styles.sizeHelp}>All measurements refer to the finished print. Choose a size that leaves room for a frame or mat if you plan to add one.</p>}</section>

        <section className={styles.optionBlock}><div className={styles.optionHeading}><h2>Frame</h2><span className={styles.quietLabel}>Optional</span></div><div className={styles.frameChoices}>{frames.map(option => <button key={option.value} className={frame === option.value ? styles.frameSelected : ''} onClick={() => setFrame(option.value)}><span className={`${styles.frameSample} ${styles[`frame_${option.value}`]}`}><i /></span><span>{option.name}</span><small>{option.price ? `+€${option.price}` : 'Print only'}</small></button>)}</div></section>

        <div className={styles.actionRow}><button className={styles.addButton} onClick={add}>Add to bag <span>€{price.toFixed(2)}</span><ArrowRight size={16} /></button></div>
        <div className={styles.promise}><span><Truck size={15} /> Ships in 2–4 working days</span><span><ShieldCheck size={15} /> Secure checkout</span></div>

        <div className={styles.details}>
          <div className={styles.detailTabs} role="tablist"><button role="tab" aria-selected={detailTab === 'story'} className={detailTab === 'story' ? styles.detailTabActive : ''} onClick={() => setDetailTab('story')}>The story</button><button role="tab" aria-selected={detailTab === 'print'} className={detailTab === 'print' ? styles.detailTabActive : ''} onClick={() => setDetailTab('print')}>Print details</button><button role="tab" aria-selected={detailTab === 'delivery'} className={detailTab === 'delivery' ? styles.detailTabActive : ''} onClick={() => setDetailTab('delivery')}>Delivery</button></div>
          {detailTab === 'story' && <p>{product.description} Made to bring a little more character to the everyday.</p>}
          {detailTab === 'print' && <p>Printed to order on heavyweight archival paper with rich pigment inks. Each print is checked and packed by hand.</p>}
          {detailTab === 'delivery' && <p>Carefully wrapped and shipped with tracking. Returns are accepted within 30 days in original condition.</p>}
        </div>
      </div>
    </section>

    {related.length > 0 && <section className={styles.related}><div className={styles.relatedHeading}><div><span className={styles.eyebrow}>KEEP LOOKING</span><h2>Works well <em>with.</em></h2></div><Link href="/shop">All prints <ArrowRight size={14} /></Link></div><div className={styles.relatedGrid}>{related.map(item => <ProductCard key={item.slug} product={item} layoutId={false} />)}</div></section>}
    <div className={styles.mobileBuy}><div><span>Total</span><strong>€{price.toFixed(2)}</strong></div><button onClick={add}>Add to bag <ArrowRight size={15} /></button></div>
    <SearchPalette open={searchOpen} close={() => setSearchOpen(false)} />
  </main>
}
