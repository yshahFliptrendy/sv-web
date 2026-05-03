import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProductSearch, type SidebarItem } from '@/components/products/ProductSearch'
import { buildCategoryPaths, categoryPath, getCategoryTree } from '@/lib/categories'

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string[] }>
}

// Load all categories and build path map (cached per request via React cache)
async function loadCategoryMap() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('id, slug, name, description, parent_id')
  return { categories: data ?? [], pathMap: buildCategoryPaths(data ?? []) }
}

// Resolve a URL path like ['nails', 'nail-polish', 'gel'] to a category
function findCategoryByPath(
  categories: { id: string; slug: string; name: string; description: string | null; parent_id: string | null }[],
  pathMap: Map<string, string[]>,
  slugSegments: string[]
) {
  for (const cat of categories) {
    const catPath = pathMap.get(cat.id)
    if (catPath && catPath.length === slugSegments.length && catPath.every((s, i) => s === slugSegments[i])) {
      return cat
    }
  }
  return null
}

export async function generateStaticParams() {
  const { createClient: createDirectClient } = await import('@supabase/supabase-js')
  const supabase = createDirectClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data } = await supabase.from('categories').select('id, slug, name, description, parent_id')
  const pathMap = buildCategoryPaths(data ?? [])
  return (data ?? []).map((c) => ({ slug: pathMap.get(c.id) ?? [c.slug] }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: slugSegments } = await params
  const { categories, pathMap } = await loadCategoryMap()
  const category = findCategoryByPath(categories, pathMap, slugSegments)

  if (!category) return {}

  const parent = category.parent_id
    ? categories.find((c) => c.id === category.parent_id)
    : null

  const title = parent
    ? `${category.name} — ${parent.name} — Vegan Products`
    : `${category.name} — Vegan Products`

  const description = category.description ?? parent?.description ?? undefined

  return {
    title,
    ...(description ? { description } : {}),
    alternates: { canonical: categoryPath(slugSegments) },
  }
}

export default async function CategoryPage({ params }: Props) {
  const { slug: slugSegments } = await params
  const { categories: allCategories, pathMap } = await loadCategoryMap()
  const category = findCategoryByPath(allCategories, pathMap, slugSegments)

  if (!category) notFound()

  const currentPath = categoryPath(slugSegments)
  const categoryTree = await getCategoryTree()

  // Build hierarchical filter path for Algolia: ["Nails", "Nails > Nail Polish", "Nails > Nail Polish > Gel"]
  function buildHierarchyChain(catId: string): string[] {
    const chain: string[] = []
    let current = allCategories.find((c) => c.id === catId)
    while (current) {
      chain.unshift(current.name)
      current = current.parent_id ? allCategories.find((c) => c.id === current!.parent_id) : undefined
    }
    return chain.map((_, i) => chain.slice(0, i + 1).join(' > '))
  }
  const categoryHierarchy = buildHierarchyChain(category.id)

  // Parent info
  const parent = category.parent_id
    ? allCategories.find((c) => c.id === category.parent_id)
    : null
  const parentPath = parent ? categoryPath(pathMap.get(parent.id) ?? [parent.slug]) : null

  // Grandparent for deep breadcrumbs
  const grandparent = parent?.parent_id
    ? allCategories.find((c) => c.id === parent.parent_id)
    : null
  const grandparentPath = grandparent ? categoryPath(pathMap.get(grandparent.id) ?? [grandparent.slug]) : null

  // Fetch active sidebar placement for this category (or its ancestors, then global fallback)
  const supabase = await createClient()
  const categoryChain = [category.id, category.parent_id, parent?.parent_id, null].filter((id): id is string | null => id !== undefined)
  let sidebarItem: SidebarItem | undefined
  for (const catId of categoryChain) {
    const query = supabase
      .from('ad_placements')
      .select('image_url, link_url, alt_text, article_id, article:articles(title, excerpt, slug, cover_image)')
      .eq('placement', 'category_sidebar')
      .eq('is_active', true)
      .order('sort_order')
      .limit(1)

    if (catId === null) {
      query.is('category_id', null)
    } else {
      query.eq('category_id', catId)
    }

    const { data } = await query
    if (data && data.length > 0) {
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
      break
    }
  }

  return (
    <div>
      {/* Breadcrumb + Subcategory nav */}
      <div className="border-b border-border bg-muted/50">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          {/* Breadcrumb */}
          <nav className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/products" className="hover:text-foreground">Products</Link>
            {grandparent && grandparentPath && (
              <>
                <span className="mx-2">/</span>
                <Link href={grandparentPath} className="hover:text-foreground">{grandparent.name}</Link>
              </>
            )}
            {parent && parentPath && (
              <>
                <span className="mx-2">/</span>
                <Link href={parentPath} className="hover:text-foreground">{parent.name}</Link>
              </>
            )}
            <span className="mx-2">/</span>
            <span className="text-foreground font-medium">{category.name}</span>
          </nav>
        </div>
      </div>

      {/* Category description blurb — falls back to parent's description */}
      {(category.description || parent?.description) && (
        <div className="border-b border-border">
          <div className="container mx-auto max-w-7xl px-4 py-3">
            <p className="text-sm text-muted-foreground line-clamp-3">
              {category.description ?? parent?.description}
            </p>
          </div>
        </div>
      )}

      <ProductSearch category={category.name} categoryHierarchy={categoryHierarchy} title={category.name} categoryTree={categoryTree} activeCategoryPath={currentPath} sidebarItem={sidebarItem} />
    </div>
  )
}
