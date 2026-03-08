import type { Metadata } from 'next'
import { CategoryNav } from '@/components/layout/CategoryNav'
import { ProductGrid } from '@/components/products/ProductGrid'
import { ArticleGrid } from '@/components/articles/ArticleGrid'
import { NewsletterSignup } from '@/components/common/NewsletterSignup'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'ShoppingVegan — Discover Vegan Products',
}

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: featuredProducts }, { data: featuredArticles }] = await Promise.all([
    supabase
      .from('products')
      .select('*, brand:brands(id, slug, name, logo_url)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('articles')
      .select('*, author:profiles(id, display_name, avatar_url)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(6),
  ])

  return (
    <div>
      {/* Hero */}
      <section className="bg-muted border-b">
        <div className="container mx-auto max-w-7xl px-4 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Discover the Best
            <span className="text-primary block">Vegan Products</span>
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-lg text-muted-foreground">
            Browse thousands of vegan, cruelty-free products — from food and beauty
            to home and fashion. All in one place.
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
