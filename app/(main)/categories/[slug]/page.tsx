import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductGrid } from '@/components/products/ProductGrid'

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: category } = await supabase
    .from('categories')
    .select('name')
    .eq('slug', slug)
    .single()

  if (!category) return {}
  return { title: `${category.name} — Vegan Products` }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!category) notFound()

  const { data: products } = await supabase
    .from('products')
    .select('*, brand:brands(id, slug, name, logo_url)')
    .eq('status', 'published')
    .in(
      'id',
      (
        await supabase
          .from('product_categories')
          .select('product_id')
          .eq('category_id', category.id)
      ).data?.map((r: any) => r.product_id) ?? []
    )

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
      <p className="text-muted-foreground mb-8">{products?.length ?? 0} vegan products</p>
      <ProductGrid products={products ?? []} />
    </div>
  )
}
