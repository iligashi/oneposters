'use client'
import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import { Header, ProductCard } from '@/components/store'
import { products, type Product } from '@/data/products'
import { fetchPublishedProducts, toStoreProduct } from '@/lib/catalog'
export default function WishlistPage(){ const [slugs,setSlugs]=useState<string[]>([]); const { data: remoteProducts } = useSWR('published-products-wishlist', fetchPublishedProducts, { revalidateOnFocus:false }); useEffect(()=>{ try { setSlugs(JSON.parse(localStorage.getItem('oneposters-wishlist')||'[]')) } catch { setSlugs([]) } },[]); const catalog: Product[] = remoteProducts?.length ? remoteProducts.map(toStoreProduct) : products; const items=useMemo(()=>catalog.filter((p:any)=>slugs.includes(p.slug)),[catalog,slugs]); return <main className="storefront shop-page"><Header/><section className="shop-hero wishlist-hero"><p className="kicker">Saved for later</p><h1>Your<br/><i>wall list.</i></h1><p>{items.length} pieces with a place in mind.</p></section>{items.length?<div className="poster-grid shop-grid">{items.map(p=><ProductCard key={p.slug} product={p}/>)}</div>:<div className="empty-wishlist"><p>Nothing saved yet.</p><a className="blue-button" href="/shop">Explore the collection</a></div>}</main> }
