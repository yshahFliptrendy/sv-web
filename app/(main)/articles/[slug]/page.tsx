import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { cache } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import { createClient } from '@/lib/supabase/server'
import { ProductGrid } from '@/components/products/ProductGrid'
import { formatDate } from '@/lib/utils'

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}

// Deduplicated fetch — React cache ensures one query per request
const getArticle = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('articles')
    .select(`
      *,
      author:profiles(id, display_name, avatar_url),
      article_tags(tag:tags(id, slug, name)),
      article_products(product:products(*, brand:brands(id, slug, name, logo_url)))
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()
  return data
})

export async function generateStaticParams() {
  const { createClient: createDirectClient } = await import('@supabase/supabase-js')
  const supabase = createDirectClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data } = await supabase
    .from('articles')
    .select('slug')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(100)
  return (data ?? []).map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) return {}

  const title = article.seo_title ?? article.title
  const description = article.seo_description ?? article.excerpt ?? undefined

  return {
    title,
    description,
    alternates: { canonical: `/articles/${slug}` },
    openGraph: {
      title,
      description,
      ...(article.cover_image ? { images: [article.cover_image] } : {}),
    },
  }
}

export default async function ArticlePage({ params, searchParams }: Props) {
  const { slug } = await params
  const { preview } = await searchParams

  let article: any = null
  let isAdminPreview = false

  if (preview === '1') {
    // Admin preview — bypass cache, allow any status
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      isAdminPreview = profile?.role === 'admin'
    }
    if (isAdminPreview) {
      const { data } = await supabase
        .from('articles')
        .select(`
          *,
          author:profiles(id, display_name, avatar_url),
          article_tags(tag:tags(id, slug, name)),
          article_products(product:products(*, brand:brands(id, slug, name, logo_url)))
        `)
        .eq('slug', slug)
        .single()
      article = data
    }
  }

  // Normal request — use cached fetch
  if (!article) {
    article = await getArticle(slug)
  }

  if (!article) notFound()

  const author = article.author as any
  const tags = (article.article_tags as any[])?.map((at: any) => at.tag) ?? []
  const embeddedProducts = (article.article_products as any[])
    ?.sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((ap: any) => ap.product) ?? []

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shoppingvegan.com'

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt ?? undefined,
    image: article.cover_image ?? undefined,
    url: `${baseUrl}/articles/${slug}`,
    datePublished: article.published_at ?? undefined,
    dateModified: article.updated_at ?? article.published_at ?? undefined,
    author: {
      '@type': 'Person',
      name: author?.display_name ?? 'ShoppingVegan',
    },
    publisher: {
      '@type': 'Organization',
      name: 'ShoppingVegan',
      url: baseUrl,
    },
  }

  return (
    <article className="container mx-auto max-w-3xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      {isAdminPreview && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Preview mode — this article is <strong>{article.status}</strong> and not publicly visible.
        </div>
      )}
      {/* Cover Image */}
      {article.cover_image && (
        <div className="relative mb-8 h-72 w-full overflow-hidden rounded-xl sm:h-96">
          <Image
            src={article.cover_image}
            alt={article.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {tags.map((tag: any) => (
            <span
              key={tag.id}
              className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h1 className="text-3xl font-bold sm:text-4xl">{article.title}</h1>

      {/* Author + Date */}
      <div className="mt-4 mb-8 flex items-center gap-3 text-sm text-muted-foreground">
        {author?.avatar_url && (
          <Image
            src={author.avatar_url}
            alt={author.display_name ?? ''}
            width={32}
            height={32}
            className="rounded-full"
          />
        )}
        <span>{author?.display_name ?? 'ShoppingVegan'}</span>
        <span>·</span>
        {article.published_at && <span>{formatDate(article.published_at)}</span>}
      </div>

      {/* Body */}
      <div
        className="prose prose-neutral max-w-none"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.body) }}
      />

      {/* Embedded Products */}
      {embeddedProducts.length > 0 && (
        <div className="mt-12 border-t pt-8">
          <h2 className="text-xl font-semibold mb-4">Featured Products</h2>
          <ProductGrid products={embeddedProducts} />
        </div>
      )}

      {/* Comments */}
      <div className="mt-12 border-t pt-8">
        <h2 className="text-xl font-semibold mb-6">Comments</h2>
        <p className="text-muted-foreground text-sm">
          Comments component goes here.{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>{' '}
          to leave a comment.
        </p>
      </div>
    </article>
  )
}
