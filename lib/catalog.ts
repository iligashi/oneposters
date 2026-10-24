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
}

export function toStoreProduct(product: CatalogProduct): Product & { id?: string } {
  return {
    id: product.id, slug: product.slug, title: product.title, description: product.description || '',
    category: product.category || 'Art', price: product.price ?? 32,
    image: product.image || '/images/admin-poster-placeholder.png',
    colors: product.colors || [], sizes: product.sizes || [], orientation: product.orientation || 'Portrait',
  }
}

export async function fetchPublishedProduct(slug: string) {
  const supabase = createClient()
  const { data, error } = await supabase.from('products').select('id, slug, title, description, category_id, product_images(id,url,alt,sort_order), product_sizes(id,label,width_cm,height_cm,price_cents), categories(name)').eq('slug', slug).eq('status', 'published').maybeSingle()
  if (error) throw error
  if (!data) return null
  return { ...data, image: data.product_images?.sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.url || getProduct(data.slug)?.image || '/images/admin-poster-placeholder.png', category: data.categories?.name ?? 'Art', price: (data.product_sizes?.[0]?.price_cents ?? 3200) / 100 } as any
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
    const sizeLabels = product.product_sizes?.map((size: any) => size.label).filter(Boolean) ?? []
    return {
      ...product,
      image: product.product_images?.sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.url || fallback?.image || '/images/admin-poster-placeholder.png',
      category: product.categories?.name ?? 'Art',
      price: (product.product_sizes?.[0]?.price_cents ?? 3200) / 100,
      sizes: sizeLabels.length ? sizeLabels : fallback?.sizes ?? [],
      colors: fallback?.colors ?? [], orientation: fallback?.orientation ?? 'Portrait',
    } as CatalogProduct
  })
}
