import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Vegan Ingredients',
  description: 'Learn about vegan and cruelty-free ingredients used in products.',
}

export const revalidate = 3600

export default async function IngredientsPage() {
  const supabase = await createClient()
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, slug, name, is_vegan, is_cruelty_free')
    .order('name')

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Ingredient Guide</h1>
      <p className="text-muted-foreground mb-8">
        Understand what goes into your vegan products.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(ingredients ?? []).map((ing) => (
          <Link
            key={ing.id}
            href={`/ingredients/${ing.slug}`}
            className="flex items-center justify-between rounded-lg border border-border p-4 hover:border-primary hover:bg-muted/50 transition-all group"
          >
            <span className="font-medium group-hover:text-primary transition-colors">
              {ing.name}
            </span>
            <div className="flex gap-1">
              {ing.is_vegan && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                  Vegan
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
