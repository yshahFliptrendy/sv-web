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
  const { data: ing } = await supabase
    .from('ingredients')
    .select('name, description')
    .eq('slug', slug)
    .single()

  if (!ing) return {}
  return { title: `${ing.name} — Vegan Ingredient`, description: ing.description ?? undefined }
}

export default async function IngredientPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: ingredient } = await supabase
    .from('ingredients')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!ingredient) notFound()

  const { data: products } = await supabase
    .from('products')
    .select('*, brand:brands(id, slug, name, logo_url)')
    .eq('status', 'published')
    .in(
      'id',
      (
        await supabase
          .from('product_ingredients')
          .select('product_id')
          .eq('ingredient_id', ingredient.id)
      ).data?.map((r: any) => r.product_id) ?? []
    )

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
