'use client'

import { useState } from 'react'
import { InstantSearchNext } from 'react-instantsearch-nextjs'
import { SearchBox, Hits, Index, Configure, useHits } from 'react-instantsearch'
import { searchClient, PRODUCTS_INDEX, ARTICLES_INDEX } from '@/lib/algolia/client'
import { ProductCard } from '@/components/products/ProductCard'
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

function ProductSection({ show }: { show: boolean }) {
  const { items } = useHits<ProductHit>()
  if (!show || items.length === 0) return null
  return (
    <section className="mb-10">
      <h2 className="text-base font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
        Products
      </h2>
      <Hits
        hitComponent={ProductHitComponent as any}
        classNames={{
          list: 'grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4',
        }}
      />
    </section>
  )
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

export function GlobalSearch() {
  const [tab, setTab] = useState<Tab>('products')

  return (
    <InstantSearchNext
      indexName={PRODUCTS_INDEX}
      searchClient={searchClient}
      routing={routing}
    >
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Search</h1>

        {/* Search box */}
        <SearchBox
          placeholder="Search products & articles…"
          classNames={{
            root: 'w-full max-w-2xl mb-5',
            input: 'w-full rounded-xl border border-border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary',
            submit: 'hidden',
            reset: 'hidden',
          }}
        />

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-border">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
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
          <Configure hitsPerPage={20} />
          <ProductSection show={tab === 'products'} />
        </Index>

        <Index indexName={ARTICLES_INDEX}>
          <Configure hitsPerPage={20} />
          <ArticleSection show={tab === 'articles'} />
        </Index>
      </div>
    </InstantSearchNext>
  )
}
