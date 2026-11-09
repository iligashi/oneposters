'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { ArrowRight } from 'lucide-react'
import { products, type Product } from '@/data/products'
import { fetchPublishedProducts, toStoreProduct } from '@/lib/catalog'
import { readRecentlyViewed } from '@/lib/recently-viewed'
import { ProductCard } from '@/components/store'

export function RecentlyViewed({ excludeSlug }: { excludeSlug?: string }) {
  const [slugs, setSlugs] = useState<string[]>([])
  const { data: remoteProducts } = useSWR('published-products-recently-viewed', fetchPublishedProducts, { revalidateOnFocus: false })
  const catalog: Product[] = remoteProducts !== undefined ? remoteProducts.map(toStoreProduct) : products

  useEffect(() => {
    const sync = () => setSlugs(readRecentlyViewed())
    sync()
    window.addEventListener('recently-viewed-updated', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('recently-viewed-updated', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const items = useMemo(() => slugs
    .filter(slug => slug !== excludeSlug)
    .map(slug => catalog.find(product => product.slug === slug))
    .filter((product): product is Product => Boolean(product))
    .slice(0, 4), [catalog, excludeSlug, slugs])

  if (!items.length) return null

  return <section className="recently-viewed" aria-labelledby="recently-viewed-heading">
    <div className="recently-viewed-heading">
      <div><p className="kicker">A little memory</p><h2 id="recently-viewed-heading">Recently viewed<span>.</span></h2></div>
      <a href="/shop">All prints <ArrowRight size={14} /></a>
    </div>
    <div className="poster-grid shop-grid recently-viewed-grid">
      {items.map(product => <ProductCard key={product.slug} product={product} layoutId={false} />)}
    </div>
  </section>
}
