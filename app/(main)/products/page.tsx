import type { Metadata } from 'next'
import { ProductSearch, type SidebarItem } from '@/components/products/ProductSearch'
import { getCategoryTree } from '@/lib/categories'
import { createClient } from '@/lib/supabase/server'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const hasFilters = Object.keys(params).length > 0

  return {
    title: 'Shop Vegan Products',
    description: 'Browse thousands of vegan, cruelty-free products across all categories.',
    alternates: { canonical: '/products' },
    robots: hasFilters
      ? { index: false, follow: true }
      : { index: true, follow: true },
  }
}

export default async function ProductsPage(_props: Props) {
  const categoryTree = await getCategoryTree()

  // Fetch global sidebar placement (no specific category)
  const supabase = await createClient()
  const { data } = await supabase
    .from('ad_placements')
    .select('image_url, link_url, alt_text, article_id, article:articles(title, excerpt, slug, cover_image)')
    .eq('placement', 'category_sidebar')
    .eq('is_active', true)
    .is('category_id', null)
    .order('sort_order')
    .limit(1)

  let sidebarItem: SidebarItem | undefined
  if (data?.[0]) {
    const row = data[0] as any
    if (row.article_id && row.article) {
      sidebarItem = {
        type: 'article',
        article: {
          title: row.article.title,
          excerpt: row.article.excerpt ?? '',
          href: `/articles/${row.article.slug}`,
          coverImage: row.article.cover_image ?? undefined,
        },
      }
    } else if (row.image_url && row.link_url) {
      sidebarItem = {
        type: 'banner',
        banner: { imageUrl: row.image_url, href: row.link_url, alt: row.alt_text },
      }
    }
  }

  return <ProductSearch categoryTree={categoryTree} sidebarItem={sidebarItem} />
}
