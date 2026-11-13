import { createClient } from '@/lib/supabase/client'
import { getProduct, type Product } from '@/data/products'

export type CatalogProduct = {
  id: string
  slug: string
  title: string
  description: string | null
  status: string
  category_id: string | null
  image?: string
  category?: string
  price?: number
  colors?: string[]
  sizes?: string[]
  orientation?: Product['orientation']
  /** False when the product has no sizes in the database, so it cannot be ordered. */
  orderable?: boolean
}

export function toStoreProduct(product: CatalogProduct): Product & { id?: string } {
  return {
    id: product.id, slug: product.slug, title: product.title, description: product.description || '',
    category: product.category || 'Art', price: product.price ?? 32,
    image: product.image || '/images/admin-poster-placeholder.png',
    colors: product.colors || [], sizes: product.sizes || [], orientation: product.orientation || 'Portrait',
    orderable: product.orderable ?? true,
  }
}

type SizeRow = { label?: string | null; price_cents?: number | null }

/** Sizes cheapest first, so the "from" price is the lowest price a customer can pay. */
export function sortSizesByPrice<T extends SizeRow>(sizes: T[] | null | undefined): T[] {
  return [...(sizes ?? [])].sort((a, b) => (a.price_cents ?? Infinity) - (b.price_cents ?? Infinity))
}

export function fromPrice(sizes: SizeRow[] | null | undefined, fallbackCents = 3200) {
  return (sortSizesByPrice(sizes)[0]?.price_cents ?? fallbackCents) / 100
}

export async function fetchPublishedProduct(slug: string) {
  const supabase = createClient()
  const { data, error } = await supabase.from('products').select('id, slug, title, description, category_id, product_images(id,url,alt,sort_order), product_sizes(id,label,width_cm,height_cm,price_cents), categories(name)').eq('slug', slug).eq('status', 'published').maybeSingle()
  if (error) throw error
  if (!data) return null
  return { ...data, image: data.product_images?.sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.url || getProduct(data.slug)?.image || '/images/admin-poster-placeholder.png', category: data.categories?.name ?? 'Art', product_sizes: sortSizesByPrice(data.product_sizes), price: fromPrice(data.product_sizes) } as any
}

export async function fetchPublishedProducts(): Promise<CatalogProduct[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, slug, title, description, category_id, product_images(url, alt, sort_order), product_sizes(label, price_cents), categories(name)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((product: any) => {
    const fallback = getProduct(product.slug)
    const sizeLabels = sortSizesByPrice(product.product_sizes).map((size: any) => size.label).filter(Boolean) ?? []
    return {
      ...product,
      image: product.product_images?.sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.url || fallback?.image || '/images/admin-poster-placeholder.png',
      category: product.categories?.name ?? 'Art',
      price: fromPrice(product.product_sizes),
      sizes: sizeLabels,
      orderable: sizeLabels.length > 0,
      colors: fallback?.colors ?? [], orientation: fallback?.orientation ?? 'Portrait',
    } as CatalogProduct
  })
}
