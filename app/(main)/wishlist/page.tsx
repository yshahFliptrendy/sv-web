import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ProductGrid } from '@/components/products/ProductGrid'
import { Heart } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'My Wishlist',
}

export default async function WishlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: items } = await supabase
    .from('wishlists')
    .select('*, product:products(*, brand:brands(id, slug, name, logo_url))')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const products = (items ?? []).map((item: any) => item.product).filter(Boolean)

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Heart className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">My Wishlist</h1>
        <span className="text-muted-foreground">({products.length} items)</span>
      </div>

      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <div className="rounded-xl border border-dashed border-border p-16 text-center">
          <Heart className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Your wishlist is empty.</p>
          <Link
            href="/products"
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Browse Products
          </Link>
        </div>
      )}
    </div>
  )
}
