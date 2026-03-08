import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProductGrid } from '@/components/products/ProductGrid'
import { formatDate } from '@/lib/utils'

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: article } = await supabase
    .from('articles')
    .select('title, seo_title, seo_description, excerpt, cover_image')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!article) return {}

  return {
    title: article.seo_title ?? article.title,
    description: article.seo_description ?? article.excerpt ?? undefined,
    openGraph: article.cover_image ? { images: [article.cover_image] } : undefined,
  }
}

export default async function ArticlePage({ params, searchParams }: Props) {
  const { slug } = await params
  const { preview } = await searchParams
  const supabase = await createClient()

  // Allow admins to preview any status via ?preview=1
  let isAdminPreview = false
  if (preview === '1') {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      isAdminPreview = profile?.role === 'admin'
    }
  }

  const now = new Date().toISOString()
  const query = supabase
    .from('articles')
    .select(`
      *,
      author:profiles(id, display_name, avatar_url),
      article_tags(tag:tags(id, slug, name)),
      article_products(product:products(*, brand:brands(id, slug, name, logo_url)))
    `)
    .eq('slug', slug)

  const { data: article } = await (isAdminPreview
    ? query
    : query.or(`status.eq.published,and(status.eq.scheduled,published_at.lte.${now})`)
  ).single()

  if (!article) notFound()

  const author = article.author as any
  const tags = (article.article_tags as any[])?.map((at: any) => at.tag) ?? []
  const embeddedProducts = (article.article_products as any[])
    ?.sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((ap: any) => ap.product) ?? []

  return (
    <article className="container mx-auto max-w-3xl px-4 py-8">
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
        dangerouslySetInnerHTML={{ __html: article.body }}
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
