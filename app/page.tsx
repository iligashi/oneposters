'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, ChevronDown, Heart, Menu, MoveRight, Search, ShoppingBag, Sparkles, Upload } from 'lucide-react'
import { CartButton, CartDrawer } from '@/components/cart'
import { useCartStore } from '@/lib/cart-store'

const posters = [
  { id: 1, title: 'Soft Geometry', category: 'Abstract', price: 32, image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=900&q=85', color: 'blue' },
  { id: 2, title: 'After Hours', category: 'Photography', price: 38, image: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=85', color: 'night' },
  { id: 3, title: 'Tokyo Study 03', category: 'Japanese', price: 29, image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=900&q=85', color: 'cream' },
  { id: 4, title: 'Form / Function', category: 'Typography', price: 34, image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=85', color: 'red' },
  { id: 5, title: 'Blue Hour', category: 'Photography', price: 36, image: 'https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=900&q=85', color: 'green' },
]

const categories = ['Fashion', 'Japanese', 'Art', 'Kitchen', 'Kids', 'Botanical', 'Typography']

export default function Home() {
  const addToCart = useCartStore((state) => state.add)
  const [liked, setLiked] = useState<number[]>([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchOpen, setSearchOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const filtered = useMemo(() => activeCategory === 'All' ? posters : posters.filter((poster) => poster.category === activeCategory), [activeCategory])

  return (
    <main className="storefront">
      <div className="store-topbar"><span>Free shipping on orders over €75</span><span>Designed to make a room feel like yours</span><span>EN / EUR</span></div>
      <header className="store-header">
        <button className="icon-button mobile-only" aria-label="Open menu"><Menu /></button>
        <a className="store-logo" href="#top"><span>one</span><small>posters</small></a>
        <nav><a href="#shop">Shop</a><a href="#categories">Collections</a><a href="#studio">Create your own</a><a href="#story">Our story</a></nav>
        <div className="header-actions"><button className="icon-button" aria-label="Search" onClick={() => setSearchOpen(true)}><Search /></button><CartButton /></div>
      </header>
      <CartDrawer />
      {searchOpen && <div className="search-overlay"><button className="icon-button close-search" onClick={() => setSearchOpen(false)} aria-label="Close search">×</button><p className="kicker">Search the collection</p><input autoFocus placeholder="Try ‘blue’, ‘abstract’ or ‘Tokyo’" onChange={() => {}} /><p className="search-hint">Press escape to close</p></div>}

      <section id="top" className="store-hero"><div className="hero-sticker">NEW<br />DROP<br /><span>→ 01</span></div><div className="hero-copy-store"><p className="kicker">Art for the everyday</p><h1>Make your<br /><i>space</i> speak.</h1><p>Poster-sized ideas for walls with something to say. Curated, printed and shipped from our studio.</p><div className="hero-actions"><a className="blue-button" href="#shop">Shop the collection <ArrowRight /></a><a className="text-link" href="#studio">Make your own <MoveRight /></a></div></div><div className="hero-poster hero-poster-back"><img src={posters[2].image} alt="Japanese-inspired poster" /></div><div className="hero-poster hero-poster-front"><img src={posters[0].image} alt="Abstract blue poster" /><div className="poster-label">oneposters / 001</div></div><div className="hero-scroll">SCROLL TO EXPLORE <span>↓</span></div></section>

      <div className="marquee"><div>ART · COLOR · FORM · CULTURE · YOUR WALL · ART · COLOR · FORM · CULTURE · YOUR WALL · </div></div>

      <section id="shop" className="store-section"><div className="section-topline"><div><p className="kicker">The edit</p><h2>New arrivals<span>.</span></h2></div><a className="text-link" href="#shop">View all <ArrowRight /></a></div><div className="category-tabs"><button className={activeCategory === 'All' ? 'active' : ''} onClick={() => setActiveCategory('All')}>All</button>{['Abstract', 'Photography', 'Japanese', 'Typography'].map((category) => <button key={category} className={activeCategory === category ? 'active' : ''} onClick={() => setActiveCategory(category)}>{category}</button>)}</div><div className="poster-grid">{filtered.map((poster) => <article className="poster-card" key={poster.id}><div className="poster-image"><img src={poster.image} alt={poster.title} /><button aria-label={`Add ${poster.title} to wishlist`} onClick={() => setLiked((items) => items.includes(poster.id) ? items.filter((id) => id !== poster.id) : [...items, poster.id])} className="heart-button"><Heart fill={liked.includes(poster.id) ? 'currentColor' : 'none'} /></button><button className="quick-add" onClick={() => addToCart({id: String(poster.id), title: poster.title, image: poster.image, price: poster.price, category: poster.category})}>Quick add <PlusIcon /></button></div><div className="poster-meta"><div><h3>{poster.title}</h3><p>{poster.category}</p></div><strong>€{poster.price}</strong></div></article>)}</div></section>

      <section id="studio" className="studio-banner"><div><p className="kicker">Your wall, your rules</p><h2>Upload a little<br /><i>more you.</i></h2><p>Turn a photo, a sketch or a feeling into a poster made just for your space.</p><a className="cream-button" href="/studio"><Upload /> Open the poster studio</a></div><div className="studio-stack"><div className="studio-card card-one">DRAG<br />YOUR<br /><span>ART</span></div><div className="studio-card card-two"><Sparkles /><span>MADE<br />BY YOU</span></div></div></section>

      <section id="categories" className="store-section categories-section"><div className="section-topline"><div><p className="kicker">Find your frequency</p><h2>Shop by mood<span>.</span></h2></div></div><div className="category-grid">{categories.map((category, index) => <a key={category} href="#shop" className={`category-tile tile-${index + 1}`}><span>0{index + 1}</span><h3>{category}</h3><ArrowRight /></a>)}</div></section>

      <section id="story" className="story-section"><div className="story-image"><img src="https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1200&q=85" alt="Gallery wall with art" /></div><div className="story-copy"><p className="kicker">Made to live with</p><h2>Good walls<br /><i>change things.</i></h2><p>We believe art should feel less like a decision and more like a reflex. oneposters is a growing archive of images, objects and ideas that make the everyday a little more yours.</p><a className="text-link" href="#footer">Read our story <ArrowRight /></a></div></section>

      <section className="club-section"><div><p className="kicker">The oneposters Art Club</p><h2>Good things<br />in your inbox.</h2></div>{subscribed ? <div className="success-message">You&apos;re on the list.<br /><span>See you in the good stuff.</span></div> : <form onSubmit={(event) => { event.preventDefault(); if (email) setSubscribed(true) }}><label htmlFor="email">New drops, studio notes and 10% off your first order.</label><div className="email-row"><input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" /><button aria-label="Subscribe"><ArrowRight /></button></div></form>}</section>

      <footer id="footer" className="store-footer"><a className="store-logo" href="#top"><span>one</span><small>posters</small></a><div><p>Posters for people with places to go.</p><a href="mailto:hello@oneposters.studio">hello@oneposters.studio</a></div><div className="footer-links"><a href="#shop">Shop</a><a href="/studio">Create</a><a href="#story">About</a><a href="#top">Instagram ↗</a></div><small>© oneposters 2025</small></footer>
    </main>
  )
}

function PlusIcon() { return <span aria-hidden="true">+</span> }
