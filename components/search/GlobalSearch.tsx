'use client'

import { useState } from 'react'
import { InstantSearchNext } from 'react-instantsearch-nextjs'
import { SearchBox, Hits, Index, Configure, useHits, Pagination, Stats } from 'react-instantsearch'
import { searchClient, PRODUCTS_INDEX, ARTICLES_INDEX } from '@/lib/algolia/client'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { ProductCard } from '@/components/products/ProductCard'
import { ProductFilters, type CategoryNode } from '@/components/products/ProductFilters'
import { ArticleCard } from '@/components/articles/ArticleCard'
import type { ProductHit } from '@/types'

type Tab = 'products' | 'articles'

interface ArticleHit {
  objectID: string
  title: string
  slug: string
  excerpt: string | null
  cover_image: string | null
  published_at: number | null
  tags: string[]
  author_name: string
}

function ProductHitComponent({ hit }: { hit: ProductHit }) {
  return <ProductCard product={hit} />
}

function ArticleHitComponent({ hit }: { hit: ArticleHit }) {
  const article = {
    id: hit.objectID,
    slug: hit.slug,
    title: hit.title,
    excerpt: hit.excerpt,
    cover_image: hit.cover_image,
    published_at: hit.published_at ? new Date(hit.published_at * 1000).toISOString() : null,
    author: { display_name: hit.author_name },
    article_tags: hit.tags.map((name) => ({ tag: { id: name, name } })),
  }
  return <ArticleCard article={article} />
}


function ArticleSection({ show }: { show: boolean }) {
  const { items } = useHits<ArticleHit>()
  if (!show || items.length === 0) return null
  return (
    <section className="mb-10">
      <h2 className="text-base font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
        Articles
      </h2>
      <Hits
        hitComponent={ArticleHitComponent as any}
        classNames={{
          list: 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3',
        }}
      />
    </section>
  )
}

const routing = {
  stateMapping: {
    stateToRoute(uiState: any) {
      const query = uiState[PRODUCTS_INDEX]?.query ?? ''
      return query ? { q: query } : {}
    },
    routeToState(routeState: any) {
      const query = (routeState.q as string) ?? ''
      return {
        [PRODUCTS_INDEX]: { query },
        [ARTICLES_INDEX]: { query },
      }
    },
  },
}

const TABS: { value: Tab; label: string }[] = [
  { value: 'products', label: 'Products' },
  { value: 'articles', label: 'Articles' },
]

export function GlobalSearch({ categoryTree }: { categoryTree?: CategoryNode[] }) {
  const [tab, setTab] = useState<Tab>('products')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState<[number | null, number | null]>([null, null])

  // Build Algolia filter string for products
  const filterParts: string[] = []
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
  const filters = filterParts.length > 0 ? filterParts.join(' AND ') : ''

  return (
    <InstantSearchNext
      indexName={PRODUCTS_INDEX}
      searchClient={searchClient as any}
      routing={routing}
    >
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Search</h1>

        {/* Search box */}
        <div className="relative max-w-xl mb-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <SearchBox
            placeholder="Search products & articles…"
            classNames={{
              root: 'w-full',
              input: 'w-full rounded-full border border-border pl-9 pr-4 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary',
              submit: 'hidden',
              reset: 'hidden',
            }}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-border">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Results */}
        <Index indexName={PRODUCTS_INDEX}>
          <Configure
            hitsPerPage={20}
            facets={['categories.lvl0', 'categories.lvl1', 'categories.lvl2']}
            maxValuesPerFacet={50}
            filters={filters}
          />
          {tab === 'products' && (
            <div className="flex gap-8">
              {/* Desktop sidebar */}
              <aside className="hidden w-64 shrink-0 lg:block">
                <ProductFilters
                  categoryTree={categoryTree}
                  onCategoryFilter={setCategoryFilter}
                  activeCategoryFilter={categoryFilter}
                  onPriceChange={setPriceRange}
                  priceRange={priceRange}
                />
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
                      <ProductFilters
                        categoryTree={categoryTree}
                        onCategoryFilter={setCategoryFilter}
                        activeCategoryFilter={categoryFilter}
                        onPriceChange={setPriceRange}
                        priceRange={priceRange}
                      />
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
                      classNames={{ root: 'text-sm text-muted-foreground' }}
                      translations={{
                        rootElementText({ nbHits }) {
                          return `${nbHits.toLocaleString()} results`
                        },
                      }}
                    />
                  </div>
                </div>
                <Hits
                  hitComponent={ProductHitComponent as any}
                  classNames={{
                    list: 'grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4',
                  }}
                />
                <div className="mt-8 flex justify-center">
                  <Pagination
                    classNames={{
                      list: 'flex gap-1',
                      item: 'rounded-md border border-border',
                      link: 'flex h-9 w-9 items-center justify-center text-sm hover:bg-muted',
                      selectedItem: 'bg-primary text-primary-foreground border-primary',
                      disabledItem: 'opacity-40 pointer-events-none',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </Index>

        <Index indexName={ARTICLES_INDEX}>
          <Configure hitsPerPage={20} />
          <ArticleSection show={tab === 'articles'} />
        </Index>
      </div>
    </InstantSearchNext>
  )
}
