'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, Search, SlidersHorizontal, X, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { Product } from '@/data/products'
import { CartButton, CartDrawer } from '@/components/cart'
import { useCartStore } from '@/lib/cart-store'
import { ThemeToggle, VisualEnhancements } from '@/components/visual-enhancements'
import catalogStyles from './store-catalog.module.css'

export function Header({ onSearch }: { onSearch?: () => void }) { return <><VisualEnhancements /><header className="store-header"><Link className="store-logo" href="/"><span>one</span><small>posters</small></Link><nav><Link href="/shop">Shop</Link><Link href="/shop?category=Art">Collections</Link><Link href="/studio">Create your own</Link><Link href="/about">Our story</Link></nav><div className="header-actions"><button className="icon-button" aria-label="Search" onClick={onSearch}><Search /></button><Link className="icon-button" aria-label="Wishlist" href="/wishlist"><Heart /></Link><ThemeToggle /><CartButton /></div></header><CartDrawer /></> }
export function ProductCard({ product, layoutId = true }: { product: Product; layoutId?: boolean }) {
  const [liked, setLiked] = useState(false)
  const add = useCartStore(state => state.add)
  useEffect(() => { try { setLiked(JSON.parse(localStorage.getItem('oneposters-wishlist') || '[]').includes(product.slug)) } catch {} }, [product.slug])
  function toggle() {
    try {
      const current = JSON.parse(localStorage.getItem('oneposters-wishlist') || '[]') as string[]
      const next = liked ? current.filter(slug => slug !== product.slug) : [...new Set([...current, product.slug])]
      localStorage.setItem('oneposters-wishlist', JSON.stringify(next)); setLiked(!liked); window.dispatchEvent(new Event('wishlist-updated'))
    } catch {}
  }
  return <motion.article layout className={catalogStyles.card}>
    <div className={catalogStyles.visual}>
      <Link className={catalogStyles.artLink} href={`/product/${product.slug}`} aria-label={`View ${product.title}`}>
        <motion.img layoutId={layoutId ? `poster-${product.slug}` : undefined} src={product.image} alt={product.title} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/admin-poster-placeholder.png' }} />
      </Link>
      <span className={catalogStyles.edition}>ONE / PRINT</span>
      <button className={`${catalogStyles.heart} ${liked ? catalogStyles.hearted : ''}`} onClick={toggle} aria-label={`${liked ? 'Remove' : 'Add'} ${product.title} ${liked ? 'from' : 'to'} wishlist`}><Heart size={16} fill={liked ? 'currentColor' : 'none'} /></button>
      <button className={catalogStyles.quickAdd} onClick={() => add({ id: product.slug, productId: (product as Product & { id?: string }).id, title: product.title, image: product.image, price: product.price, category: product.category })}><span>Add to bag</span><ArrowRight size={15} /></button>
    </div>
    <Link href={`/product/${product.slug}`} className={catalogStyles.details}>
      <span className={catalogStyles.category}>{product.category}</span><h3>{product.title}</h3>
      <span className={catalogStyles.price}>{'\u20AC'}{product.price.toFixed(2)} <small>from</small></span>
    </Link>
  </motion.article>
}
export function SearchPalette({ open, close }: { open:boolean; close:()=>void }) { const [query,setQuery]=useState(''); const [items,setItems]=useState<Product[]>([]); useEffect(()=>{ import('@/data/products').then(({products})=>setItems(products.filter(p=>`${p.title} ${p.category}`.toLowerCase().includes(query.toLowerCase())).slice(0,6))) },[query]); return <AnimatePresence>{open && <motion.div className="search-palette-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={close}><motion.div className="search-palette" initial={{y:-30,opacity:0}} animate={{y:0,opacity:1}} onClick={e=>e.stopPropagation()}><button className="palette-close" onClick={close}><X/></button><p className="kicker">Search the collection <span>⌘K</span></p><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try blue, Tokyo, botanical..."/>{items.map(item=><Link key={item.slug} href={`/product/${item.slug}`} onClick={close}><img src={item.image} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/admin-poster-placeholder.png' }}/><span>{item.title}<small>{item.category} · €{item.price}</small></span><ArrowRight/></Link>)}</motion.div></motion.div>}</AnimatePresence> }
export function FilterDrawer({ open, close, values, setValues }: { open:boolean; close:()=>void; values:any; setValues:(v:any)=>void }) { const set=(key:string,value:string)=>setValues({...values,[key]:values[key]===value?'':value}); return <AnimatePresence>{open&&<motion.aside className="filter-drawer" initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}}><div className="drawer-head"><h3>Filter by</h3><button onClick={close}><X/></button></div>{[['category',['All','Fashion','Japanese','Art','Kitchen','Kids','Botanical','Typography']],['size',['All','A4','A3','30×40','50×70']],['orientation',['All','Portrait','Landscape']],['color',['All','Blue','Cream','Red','Green']]].map(([key,options])=><div className="filter-block" key={key as string}><label>{key as string}</label><div>{(options as string[]).map(option=><button key={option} className={values[key as string]===option || (!values[key as string]&&option==='All')?'selected':''} onClick={()=>set(key as string,option==='All'?'':option)}>{option}</button>)}</div></div>)}<div className="filter-block"><label>Price range · up to €{values.price}</label><input type="range" min="28" max="48" value={values.price} onChange={e=>setValues({...values,price:e.target.value})}/></div><button className="blue-button" onClick={close}>Show results <SlidersHorizontal/></button></motion.aside>}</AnimatePresence> }
