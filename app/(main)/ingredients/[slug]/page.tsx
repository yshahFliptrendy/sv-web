import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ProductGrid } from '@/components/products/ProductGrid'

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

const getIngredient = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('ingredients')
    .select('id, slug, name, description, is_vegan')
    .eq('slug', slug)
    .single()
  return data
})

export async function generateStaticParams() {
  const { createClient: createDirectClient } = await import('@supabase/supabase-js')
  const supabase = createDirectClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data } = await supabase.from('ingredients').select('slug')
  return (data ?? []).map((i) => ({ slug: i.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const ingredient = await getIngredient(slug)

  if (!ingredient) return {}
  return {
    title: `${ingredient.name} — Vegan Ingredient`,
    description: ingredient.description ?? undefined,
    alternates: { canonical: `/ingredients/${slug}` },
  }
}

export default async function IngredientPage({ params }: Props) {
  const { slug } = await params
  const ingredient = await getIngredient(slug)

  if (!ingredient) notFound()

  // Single query with join instead of N+1 waterfall
  const supabase = await createClient()
  const { data: productLinks } = await supabase
    .from('product_ingredients')
    .select('product:products(id, slug, name, image_url, price, currency, brand:brands(id, slug, name, logo_url))')
    .eq('ingredient_id', ingredient.id)

  const products = (productLinks ?? [])
    .map((pl: any) => pl.product)
    .filter((p: any) => p !== null)

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{ingredient.name}</h1>
          {ingredient.is_vegan && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              Vegan
            </span>
          )}
        </div>
        {ingredient.description && (
          <p className="text-muted-foreground max-w-2xl">{ingredient.description}</p>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-6">
        Products containing {ingredient.name}
      </h2>
      <ProductGrid products={products ?? []} />
    </div>
  )
}
