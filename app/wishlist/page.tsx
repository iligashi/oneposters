'use client'

import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import { Header, ProductCard } from '@/components/store'
import { Heart } from 'lucide-react'
import { products, type Product } from '@/data/products'
import { fetchPublishedProducts, toStoreProduct } from '@/lib/catalog'

export default function WishlistPage() {
  const [slugs, setSlugs] = useState<string[]>([])
  const { data: remoteProducts } = useSWR('published-products-wishlist', fetchPublishedProducts, { revalidateOnFocus: false })

  useEffect(() => {
    const sync = () => {
      try { setSlugs(JSON.parse(localStorage.getItem('oneposters-wishlist') || '[]')) } catch { setSlugs([]) }
    }
    sync()
    window.addEventListener('wishlist-updated', sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener('wishlist-updated', sync); window.removeEventListener('storage', sync) }
  }, [])

  const catalog: Product[] = remoteProducts !== undefined ? remoteProducts.map(toStoreProduct) : products
  const items = useMemo(() => catalog.filter(product => slugs.includes(product.slug)), [catalog, slugs])

  return <main className="storefront shop-page wishlist-page">
    <Header />
    <section className="shop-hero wishlist-hero">
      <p className="kicker">Saved for later</p>
      <h1>Your<br /><i>wall list.</i></h1>
      <p>{items.length} {items.length === 1 ? 'piece' : 'pieces'} with a place in mind.</p>
    </section>
    {items.length ? <div className="poster-grid shop-grid">{items.map(product => <ProductCard key={product.slug} product={product} />)}</div> : <section className="empty-wishlist" aria-live="polite">
      <Heart aria-hidden="true" size={32} />
      <p>Your wishlist is waiting for its first print.</p>
      <a className="blue-button" href="/shop">Explore the collection</a>
    </section>}
  </main>
}

