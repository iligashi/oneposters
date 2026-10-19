'use client'
import { useEffect, useState } from 'react'
import { Header, ProductCard } from '@/components/store'
import { products } from '@/data/products'
export default function WishlistPage(){ const [slugs,setSlugs]=useState<string[]>([]); useEffect(()=>setSlugs(JSON.parse(localStorage.getItem('oneposters-wishlist')||'[]')),[]); const items=products.filter(p=>slugs.includes(p.slug)); return <main className="storefront shop-page"><Header/><section className="shop-hero wishlist-hero"><p className="kicker">Saved for later</p><h1>Your<br/><i>wall list.</i></h1><p>{items.length} pieces with a place in mind.</p></section>{items.length?<div className="poster-grid shop-grid">{items.map(p=><ProductCard key={p.slug} product={p}/>)}</div>:<div className="empty-wishlist"><p>Nothing saved yet.</p><a className="blue-button" href="/shop">Explore the collection</a></div>}</main> }
