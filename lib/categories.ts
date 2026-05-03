/**
 * Shared utilities for building SEO-friendly nested category paths.
 *
 * Category URLs follow: /categories/nails/nail-polish/gel
 * Each segment is the category's own simple slug (not the composite DB slug).
 */
import { unstable_cache } from 'next/cache'

export interface CategoryRow {
  id: string
  slug: string
  name: string
  description?: string | null
  parent_id: string | null
}

/**
 * Build a map of category ID → full path segments by walking parent chains.
 * Call once with all categories, then look up any category by ID.
 */
export function buildCategoryPaths(allCategories: CategoryRow[]): Map<string, string[]> {
  const byId = new Map(allCategories.map((c) => [c.id, c]))
  const cache = new Map<string, string[]>()

  function resolve(id: string): string[] {
    if (cache.has(id)) return cache.get(id)!
    const cat = byId.get(id)
    if (!cat) return []

    // Extract simple slug: last segment of the composite slug
    // e.g., "nails-nail-polish-gel-nail-polish" → parent is "nails-nail-polish" → simple is "gel-nail-polish"
    const simpleSlug = getSimpleSlug(cat, byId)

    const segments = cat.parent_id
      ? [...resolve(cat.parent_id), simpleSlug]
      : [simpleSlug]

    cache.set(id, segments)
    return segments
  }

  for (const cat of allCategories) {
    resolve(cat.id)
  }

  return cache
}

/**
 * Get the simple slug for a category by stripping the parent's slug prefix.
 */
function getSimpleSlug(cat: CategoryRow, byId: Map<string, CategoryRow>): string {
  if (!cat.parent_id) return cat.slug

  const parent = byId.get(cat.parent_id)
  if (parent && cat.slug.startsWith(parent.slug + '-')) {
    return cat.slug.slice(parent.slug.length + 1)
  }
  return cat.slug
}

/**
 * Convert path segments to a URL: ['nails', 'nail-polish', 'gel'] → '/categories/nails/nail-polish/gel'
 */
export function categoryPath(segments: string[]): string {
  return `/categories/${segments.join('/')}`
}

/**
 * Fetch all categories and build the tree. Cached for 1 hour.
 */
export function getCategoryTree(filters?: string) {
  return unstable_cache(
    async () => {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data } = await supabase
        .from('categories')
        .select('id, slug, name, parent_id')
        .eq('is_active', true)

      // Fetch facet counts from Algolia for all 3 levels
      let facetCounts: Record<string, number> = {}
      try {
        const { algoliasearch } = await import('algoliasearch')
        const algolia = algoliasearch(
          process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
          process.env.ALGOLIA_ADMIN_KEY ?? process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
        )
        const indexName = process.env.ALGOLIA_PRODUCTS_INDEX ?? 'sv_products'
        const result = await algolia.searchSingleIndex({
          indexName,
          searchParams: {
            query: '',
            hitsPerPage: 0,
            facets: ['categories.lvl0', 'categories.lvl1', 'categories.lvl2'],
            ...(filters ? { filters } : {}),
          },
        })
        // Merge all level facets into one flat map: "Nails" → 62, "Nails > Nail Polish" → 48, etc.
        facetCounts = {
          ...(result.facets?.['categories.lvl0'] ?? {}),
          ...(result.facets?.['categories.lvl1'] ?? {}),
          ...(result.facets?.['categories.lvl2'] ?? {}),
        }
      } catch {
        // If Algolia fails, build tree without counts
      }

      return buildCategoryTree(data ?? [], facetCounts)
    },
    ['category-tree', filters ?? ''],
    { revalidate: 3600, tags: ['categories'] }
  )()
}

/**
 * Build a nested tree structure for the category sidebar navigation.
 * Excludes "Other" category. Returns nodes with { name, path, children }.
 */
export interface CategoryNode {
  name: string
  path: string
  count?: number
  children?: CategoryNode[]
}

export function buildCategoryTree(
  allCategories: CategoryRow[],
  facetCounts?: Record<string, number>
): CategoryNode[] {
  const pathMap = buildCategoryPaths(allCategories)

  // Build hierarchical name for a category (e.g., "Nails > Nail Polish")
  function buildHierName(catId: string): string {
    const chain: string[] = []
    let current = allCategories.find((c) => c.id === catId)
    while (current) {
      chain.unshift(current.name)
      current = current.parent_id ? allCategories.find((c) => c.id === current!.parent_id) : undefined
    }
    return chain.join(' > ')
  }

  // Build tree from root categories
  function buildChildren(parentId: string | null): CategoryNode[] {
    return allCategories
      .filter((c) => c.parent_id === parentId && c.name !== 'Other')
      .map((c) => {
        const segments = pathMap.get(c.id) ?? [c.slug]
        const children = buildChildren(c.id)
        const hierName = buildHierName(c.id)
        const count = facetCounts?.[hierName]
        return {
          name: c.name,
          path: categoryPath(segments),
          ...(count != null ? { count } : {}),
          ...(children.length > 0 ? { children } : {}),
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  return buildChildren(null)
}
