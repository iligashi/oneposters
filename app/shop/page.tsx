'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { ArrowRight, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { categories, products as fallbackProducts, type Product } from '@/data/products'
import { fetchPublishedProducts, toStoreProduct } from '@/lib/catalog'
import { FilterDrawer, Header, ProductCard, SearchPalette } from '@/components/store'
import styles from './shop.module.css'

type ShopFilters = { category: string; size: string; color: string; maxPrice: number }
const initialFilters: ShopFilters = { category: '', size: '', color: '', maxPrice: 60 }

export default function ShopPage() {
  const { data: remoteProducts } = useSWR('published-products', fetchPublishedProducts, { revalidateOnFocus: false })
  const catalog: Product[] = remoteProducts?.length ? remoteProducts.map(toStoreProduct) : fallbackProducts
  const [filters, setFilters] = useState(initialFilters)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('featured')
  const [showFilters, setShowFilters] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const filtered = useMemo(() => {
    const result = catalog.filter(product => {
      const matchesQuery = `${product.title} ${product.category}`.toLowerCase().includes(query.trim().toLowerCase())
      return matchesQuery && (!filters.category || product.category === filters.category)
        && (!filters.size || product.sizes.includes(filters.size))
        && (!filters.color || product.colors.includes(filters.color))
        && product.price <= filters.maxPrice
    })
    if (sort === 'price-low') result.sort((a, b) => a.price - b.price)
    if (sort === 'price-high') result.sort((a, b) => b.price - a.price)
    if (sort === 'name') result.sort((a, b) => a.title.localeCompare(b.title))
    return result
  }, [catalog, filters, query, sort])
  const activeFilters = Number(Boolean(filters.category)) + Number(Boolean(filters.size)) + Number(Boolean(filters.color)) + Number(filters.maxPrice < 60)
  const setFilter = (key: keyof ShopFilters, value: string | number) => setFilters(current => ({ ...current, [key]: value }))
  const clearFilters = () => setFilters(initialFilters)

  return <main className={styles.shop}>
    <Header onSearch={() => setSearchOpen(true)} />
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}><i /> THE PRINT COLLECTION · 2026</span>
        <h1>Art for walls<br /><em>with a point of view.</em></h1>
        <p>Small editions, considered colour, and something worth looking at every day.</p>
        <a href="#collection" className={styles.heroLink}>Explore the collection <ArrowRight size={15} /></a>
      </div>
      <div className={styles.heroArt} aria-label="Featured print collection">
        <div className={`${styles.heroPrint} ${styles.heroPrintBack}`}><img src={catalog[1]?.image || catalog[0]?.image} alt="Featured abstract print" /></div>
        <div className={`${styles.heroPrint} ${styles.heroPrintFront}`}><img src={catalog[0]?.image} alt="Featured poster" /><span>ONE / 001</span></div>
        <div className={styles.heroSeal}><span>MADE<br />TO LIVE<br />WITH</span><i>✳</i></div>
      </div>
      <div className={styles.heroFoot}><span>01 — 20</span><span>Printed to order in our studio</span><span>EU / EUR</span></div>
    </section>

    <section id="collection" className={styles.collection}>
      <div className={styles.collectionHeading}>
        <div><span className={styles.eyebrow}>FIND YOUR FREQUENCY</span><h2>The collection<span>.</span></h2></div>
        <button className={styles.searchTrigger} onClick={() => setSearchOpen(true)}><Search size={15} /> Search prints <span>⌘ K</span></button>
      </div>
      <div className={styles.categoryRail} aria-label="Filter by collection">
        <button className={!filters.category ? styles.categoryActive : ''} onClick={() => setFilter('category', '')}>All prints <span>{catalog.length}</span></button>
        {categories.map(category => <button key={category} className={filters.category === category ? styles.categoryActive : ''} onClick={() => setFilter('category', filters.category === category ? '' : category)}>{category}</button>)}
      </div>
      <div className={styles.resultsBar}>
        <div className={styles.resultsLeft}><button className={styles.filterButton} onClick={() => setShowFilters(true)}><SlidersHorizontal size={15} /> Filters {activeFilters > 0 && <b>{activeFilters}</b>}</button><span>{filtered.length} {filtered.length === 1 ? 'print' : 'prints'}</span></div>
        <label className={styles.sortControl}><span>Sort</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name</option></select><ChevronDown size={13} /></label>
      </div>
      <div className={styles.shopBody}>
        <aside className={styles.sidebar}>
          <FilterContents filters={filters} setFilter={setFilter} clear={clearFilters} />
        </aside>
        <div className={styles.results}>
          {query && <div className={styles.searchTerm}>Results for “{query}” <button onClick={() => setQuery('')} aria-label="Clear search"><X size={13} /></button></div>}
          {filtered.length ? <div className={styles.grid}>{filtered.map(product => <ProductCard key={product.slug} product={product} />)}</div> : <div className={styles.empty}><span>NO MATCHES</span><h3>Nothing on this wall yet.</h3><p>Try a different search or loosen your filters.</p><button onClick={() => { clearFilters(); setQuery('') }}>Clear filters <ArrowRight size={14} /></button></div>}
        </div>
      </div>
    </section>
    <footer className={styles.shopFooter}><span>Objects for the everyday.</span><a href="/studio">Make a print of your own <ArrowRight size={14} /></a></footer>
    {showFilters && <div className={styles.mobileFilterOverlay} onClick={() => setShowFilters(false)}><aside className={styles.mobileFilterPanel} onClick={event => event.stopPropagation()}><div className={styles.mobileFilterHead}><div><span className={styles.eyebrow}>REFINE THE EDIT</span><h2>Filters</h2></div><button onClick={() => setShowFilters(false)} aria-label="Close filters"><X size={18} /></button></div><FilterContents filters={filters} setFilter={setFilter} clear={clearFilters} /><button className={styles.showResults} onClick={() => setShowFilters(false)}>Show {filtered.length} prints <ArrowRight size={15} /></button></aside></div>}
    <SearchPalette open={searchOpen} close={() => setSearchOpen(false)} />
  </main>
}

function FilterContents({ filters, setFilter, clear }: { filters: ShopFilters; setFilter: (key: keyof ShopFilters, value: string | number) => void; clear: () => void }) {
  return <>
    <div className={styles.filterHeading}><span>Refine by</span><button onClick={clear}>Reset</button></div>
    <FilterGroup title="Size"><div className={styles.optionList}>{['A4', 'A3', '30×40', '50×70', '70×100'].map(size => <button key={size} className={filters.size === size ? styles.optionActive : ''} onClick={() => setFilter('size', filters.size === size ? '' : size)}><span>{size}</span><i>{filters.size === size ? '−' : '+'}</i></button>)}</div></FilterGroup>
    <FilterGroup title="Colour"><div className={styles.colorOptions}>{[['Blue','#6d83a7'],['Cream','#dbd0b9'],['Red','#bd6658'],['Green','#71836d']].map(([name, color]) => <button key={name} aria-label={name} title={name} className={`${styles.colorOption} ${filters.color === name ? styles.colorActive : ''}`} onClick={() => setFilter('color', filters.color === name ? '' : name)} style={{ '--swatch': color } as React.CSSProperties}><span />{name}</button>)}</div></FilterGroup>
    <FilterGroup title="Price"><label className={styles.priceLabel}>Up to <strong>€{filters.maxPrice}</strong></label><input className={styles.priceRange} type="range" min="28" max="60" step="1" value={filters.maxPrice} onChange={event => setFilter('maxPrice', Number(event.target.value))} /></FilterGroup>
  </>
}
function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) { return <section className={styles.filterGroup}><h3>{title}</h3>{children}</section> }
