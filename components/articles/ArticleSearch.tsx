'use client'

import { useState } from 'react'
import { InstantSearchNext } from 'react-instantsearch-nextjs'
import { Configure, Hits, RefinementList, Pagination, Stats, useInstantSearch } from 'react-instantsearch'
import { searchClient, ARTICLES_INDEX } from '@/lib/algolia/client'
import { ArticleCard } from '@/components/articles/ArticleCard'
import { SlidersHorizontal, X } from 'lucide-react'

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

function ArticleHitComponent({ hit }: { hit: ArticleHit }) {
  // Normalize Algolia hit to the shape ArticleCard expects
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

function EmptyState() {
  const { results } = useInstantSearch()
  if (!results.query || results.nbHits > 0) return null
  return (
    <p className="col-span-full text-center text-muted-foreground py-16">
      No articles found for &ldquo;{results.query}&rdquo;.
    </p>
  )
}

export function ArticleSearch() {
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <InstantSearchNext indexName={ARTICLES_INDEX} searchClient={searchClient as any}>
      <Configure hitsPerPage={20} />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Vegan Blog</h1>
        <p className="text-muted-foreground mb-6">
          Guides, news, and inspiration for vegan living.
        </p>

        <div className="flex gap-8">
          {/* Desktop tag filter sidebar */}
          <aside className="hidden w-52 shrink-0 lg:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Filter by Tag
            </p>
            <RefinementList
              attribute="tags"
              sortBy={['name:asc']}
              classNames={{
                list: 'space-y-1',
                item: 'flex items-center gap-2 text-sm',
                checkbox: 'rounded border-border',
                label: 'flex items-center gap-2 cursor-pointer',
                count: 'ml-auto text-xs text-muted-foreground',
                selectedItem: 'font-medium text-primary',
              }}
            />
          </aside>

          {/* Mobile filter drawer */}
          {filtersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
              <aside className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-background shadow-xl overflow-y-auto">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="text-sm font-bold">Filter by Tag</h2>
                  <button onClick={() => setFiltersOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="px-4 py-4">
                  <RefinementList
                    attribute="tags"
                    sortBy={['name:asc']}
                    classNames={{
                      list: 'space-y-1',
                      item: 'flex items-center gap-2 text-sm',
                      checkbox: 'rounded border-border',
                      label: 'flex items-center gap-2 cursor-pointer',
                      count: 'ml-auto text-xs text-muted-foreground',
                      selectedItem: 'font-medium text-primary',
                    }}
                  />
                </div>
              </aside>
            </div>
          )}

          {/* Results */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setFiltersOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Tags
              </button>
              <Stats
                classNames={{ root: 'text-sm text-muted-foreground' }}
              />
            </div>

            <Hits
              hitComponent={ArticleHitComponent as any}
              classNames={{
                root: 'w-full',
                list: 'grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3',
                emptyRoot: 'w-full',
              }}
            />
            <EmptyState />

            <div className="mt-10 flex justify-center">
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
        </div>
      </div>
    </InstantSearchNext>
  )
}
