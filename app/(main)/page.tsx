import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { CategoryNav } from '@/components/layout/CategoryNav'
import { ProductGrid } from '@/components/products/ProductGrid'
import { ArticleGrid } from '@/components/articles/ArticleGrid'
import { NewsletterSignup } from '@/components/common/NewsletterSignup'

export const metadata: Metadata = {
  title: 'ShoppingVegan — Discover Vegan Products',
}

const getHomeData = unstable_cache(
  async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const [{ data: products }, { data: articles }] = await Promise.all([
      supabase
        .from('products')
        .select('id, slug, name, image_url, price, currency, brand:brands(name, slug)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('articles')
        .select('id, slug, title, excerpt, cover_image, published_at, author:profiles(display_name, avatar_url)')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(6),
    ])

    return { products, articles }
  },
  ['home-data'],
  { revalidate: 600 } // cache for 10 minutes
)

export default async function HomePage() {
  const { products: featuredProducts, articles: featuredArticles } = await getHomeData()

  return (
    <div>
      {/* Hero */}
      <section className="bg-muted border-b">
        <div className="container mx-auto max-w-7xl px-4 py-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Discover the Best
            <span className="text-primary"> Vegan Products</span>
          </h1>
          <p className="mt-2 mx-auto max-w-2xl text-sm text-muted-foreground">
            Browse thousands of vegan, cruelty-free products
          </p>
        </div>
      </section>

      {/* Category Navigation */}
      <CategoryNav />

      {/* Featured Products */}
      <section className="container mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-2xl font-semibold">New Arrivals</h2>
          <a href="/products" className="text-sm text-primary hover:underline">
            View all →
          </a>
        </div>
        <ProductGrid products={featuredProducts ?? []} />
      </section>

      {/* Featured Articles */}
      <section className="bg-muted border-y">
        <div className="container mx-auto max-w-7xl px-4 py-12">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-2xl font-semibold">From the Blog</h2>
            <a href="/articles" className="text-sm text-primary hover:underline">
              View all →
            </a>
          </div>
          <ArticleGrid articles={featuredArticles ?? []} />
        </div>
      </section>

      {/* Newsletter */}
      <section className="container mx-auto max-w-7xl px-4 py-12">
        <NewsletterSignup />
      </section>
    </div>
  )
}
