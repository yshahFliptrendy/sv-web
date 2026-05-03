'use client'

import { useState } from 'react'
import { InstantSearchNext } from 'react-instantsearch-nextjs'
import { Configure, Hits, SortBy, Pagination, Stats } from 'react-instantsearch'
import { searchClient, PRODUCTS_INDEX } from '@/lib/algolia/client'
import { ProductCard } from '@/components/products/ProductCard'
import { ProductFilters, type CategoryNode } from '@/components/products/ProductFilters'
import { SlidersHorizontal, X } from 'lucide-react'
import type { ProductHit } from '@/types'

function ProductHitComponent({ hit }: { hit: ProductHit }) {
  return <ProductCard product={hit} />
}

export interface BrandBanner {
  imageUrl: string
  href: string
  alt: string
}

export interface ArticleLink {
  title: string
  excerpt: string
  href: string
  coverImage?: string
}

export type SidebarItem =
  | { type: 'banner'; banner: BrandBanner }
  | { type: 'article'; article: ArticleLink }

interface ProductSearchProps {
  category?: string
  /** Hierarchical category path for Algolia filtering, e.g. ["Bath"] or ["Nails", "Nails > Nail Polish"] */
  categoryHierarchy?: string[]
  brand?: string
  title?: string
  categoryTree?: CategoryNode[]
  activeCategoryPath?: string
  /** @deprecated Use sidebarItem instead */
  brandBanner?: BrandBanner
  sidebarItem?: SidebarItem
}

export function ProductSearch({ category, categoryHierarchy, brand, title, categoryTree, activeCategoryPath, brandBanner, sidebarItem: sidebarItemProp }: ProductSearchProps) {
  // Support both old brandBanner prop and new sidebarItem prop
  const sidebarItem: SidebarItem | undefined = sidebarItemProp ?? (brandBanner ? { type: 'banner', banner: brandBanner } : undefined)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState<[number | null, number | null]>([null, null])

  // Build Algolia filter strings
  const filterParts: string[] = []
  if (brand) {
    filterParts.push(`brand_name:'${brand.replace(/'/g, "\\'")}'`)
  }
  if (categoryHierarchy && categoryHierarchy.length > 0) {
    const lastPath = categoryHierarchy[categoryHierarchy.length - 1]
    const level = categoryHierarchy.length - 1
    filterParts.push(`categories.lvl${level}:'${lastPath.replace(/'/g, "\\'")}'`)
  }
  if (categoryFilter) {
    const level = categoryFilter.split(' > ').length - 1
    filterParts.push(`categories.lvl${level}:'${categoryFilter.replace(/'/g, "\\'")}'`)
  }
  if (priceRange[0] != null) {
    filterParts.push(`price >= ${priceRange[0]}`)
  }
  if (priceRange[1] != null) {
    filterParts.push(`price <= ${priceRange[1]}`)
  }
  const filters = filterParts.length > 0 ? filterParts.join(' AND ') : undefined

  // Disable Algolia URL routing when category/brand is pre-set via the page route,
  // since the URL already represents the filter state (e.g., /categories/bath).
  // Only enable routing on the generic /products page where users apply filters dynamically.
  const enableRouting = !category && !brand

  return (
    <InstantSearchNext
      indexName={PRODUCTS_INDEX}
      searchClient={searchClient as any}
      routing={enableRouting}
      future={{ preserveSharedStateOnUnmount: true }}
      stalledSearchDelay={300}
    >
      <Configure
        facets={['categories.lvl0', 'categories.lvl1', 'categories.lvl2']}
        maxValuesPerFacet={50}
        filters={filters ?? ''}
      />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {title && <h1 className="text-3xl font-bold mb-6">{title}</h1>}

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <ProductFilters categoryTree={categoryTree} activeCategoryPath={activeCategoryPath} hideBrandFilter={!!brand} onCategoryFilter={brand ? setCategoryFilter : undefined} activeCategoryFilter={categoryFilter} onPriceChange={setPriceRange} priceRange={priceRange} />
          </aside>

          {/* Mobile filter drawer */}
          {filtersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
              <aside className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-background shadow-xl overflow-y-auto">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="text-sm font-bold">Filters</h2>
                  <button onClick={() => setFiltersOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="px-4 py-4">
                  <ProductFilters categoryTree={categoryTree} activeCategoryPath={activeCategoryPath} hideBrandFilter={!!brand} onCategoryFilter={brand ? setCategoryFilter : undefined} activeCategoryFilter={categoryFilter} onPriceChange={setPriceRange} priceRange={priceRange} />
                </div>
              </aside>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </button>
                <Stats
                  classNames={{
                    root: 'text-sm text-muted-foreground',
                  }}
                  translations={{
                    rootElementText({ nbHits }) {
                      return `${nbHits.toLocaleString()} results`
                    },
                  }}
                />
              </div>
              <SortBy
                items={[
                  { label: 'Most Relevant', value: PRODUCTS_INDEX },
                  { label: 'Price: Low to High', value: `${PRODUCTS_INDEX}_price_asc` },
                  { label: 'Price: High to Low', value: `${PRODUCTS_INDEX}_price_desc` },
                  { label: 'Newest First', value: `${PRODUCTS_INDEX}_newest` },
                ]}
                classNames={{
                  select: 'rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                }}
              />
            </div>

            <Hits
              hitComponent={ProductHitComponent}
              classNames={{
                root: 'w-full',
                list: `grid grid-cols-2 gap-4 sm:grid-cols-3 ${sidebarItem ? '' : 'xl:grid-cols-4'}`,
              }}
            />

            <div className="mt-8 flex justify-center">
              <Pagination
                classNames={{
                  root: '',
                  list: 'flex gap-1',
                  item: 'rounded-md border border-border',
                  link: 'flex h-9 w-9 items-center justify-center text-sm hover:bg-muted',
                  selectedItem: 'bg-primary text-primary-foreground border-primary',
                  disabledItem: 'opacity-40 pointer-events-none',
                }}
              />
            </div>
          </div>

          {/* Sidebar: sponsored banner or article link */}
          {sidebarItem && (
            <aside className="hidden w-48 shrink-0 xl:block">
              <div className="sticky top-20">
                {sidebarItem.type === 'banner' ? (
                  <>
                    <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Sponsored</p>
                    <a
                      href={sidebarItem.banner.href}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="block overflow-hidden rounded-xl border border-border hover:border-primary transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sidebarItem.banner.imageUrl}
                        alt={sidebarItem.banner.alt}
                        className="w-full object-cover"
                      />
                    </a>
                  </>
                ) : (
                  <a
                    href={sidebarItem.article.href}
                    className="block rounded-xl border border-border p-3 hover:border-primary transition-colors"
                  >
                    {sidebarItem.article.coverImage && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={sidebarItem.article.coverImage}
                        alt={sidebarItem.article.title}
                        className="w-full rounded-lg object-cover mb-2"
                      />
                    )}
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Related Article</p>
                    <h3 className="text-sm font-semibold leading-snug line-clamp-2">{sidebarItem.article.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{sidebarItem.article.excerpt}</p>
                    <span className="mt-2 inline-block text-xs font-medium text-primary">Read more &rarr;</span>
                  </a>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </InstantSearchNext>
  )
}
