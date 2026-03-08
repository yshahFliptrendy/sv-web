import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Vegan Brands',
  description: 'Browse all vegan and cruelty-free brands on ShoppingVegan.',
}

export const revalidate = 3600

export default async function BrandsPage() {
  const supabase = await createClient()
  const { data: brands } = await supabase
    .from('brands')
    .select('id, slug, name, logo_url, is_verified')
    .order('name')

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Vegan Brands</h1>
      <p className="text-muted-foreground mb-8">
        Discover ethical brands committed to vegan and cruelty-free products.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {(brands ?? []).map((brand) => (
          <Link
            key={brand.id}
            href={`/brands/${brand.slug}`}
            className="group flex flex-col items-center rounded-xl border border-border p-4 hover:border-primary hover:shadow-sm transition-all"
          >
            <div className="relative h-16 w-16 mb-3">
              {brand.logo_url ? (
                <Image
                  src={brand.logo_url}
                  alt={brand.name}
                  fill
                  className="object-contain"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl">
                  {brand.name[0]}
                </div>
              )}
            </div>
            <span className="text-sm font-medium text-center group-hover:text-primary transition-colors">
              {brand.name}
            </span>
            {brand.is_verified && (
              <span className="mt-1 text-xs text-primary">✓ Verified</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
