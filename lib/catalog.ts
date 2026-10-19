import { createClient } from '@/lib/supabase/client'

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
}

export async function fetchPublishedProducts() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, slug, title, description, category_id, product_images(url, alt, sort_order), product_sizes(price_cents), categories(name)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((product: any) => ({
    ...product,
    image: product.product_images?.sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.url,
    category: product.categories?.name ?? 'Art',
    price: (product.product_sizes?.[0]?.price_cents ?? 3200) / 100,
  })) as CatalogProduct[]
}
