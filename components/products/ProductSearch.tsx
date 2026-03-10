'use client'

import { InstantSearchNext } from 'react-instantsearch-nextjs'
import { SearchBox, Hits, SortBy, Pagination, Stats } from 'react-instantsearch'
import { searchClient, PRODUCTS_INDEX } from '@/lib/algolia/client'
import { ProductCard } from '@/components/products/ProductCard'
import { ProductFilters } from '@/components/products/ProductFilters'
import type { ProductHit } from '@/types'

function ProductHitComponent({ hit }: { hit: ProductHit }) {
  return <ProductCard product={hit} />
}

export function ProductSearch() {
  return (
    <InstantSearchNext
      indexName={PRODUCTS_INDEX}
      searchClient={searchClient}
      routing
    >
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <SearchBox
            placeholder="Search vegan products…"
            classNames={{
              root: 'w-full',
              input: 'w-full rounded-lg border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
              submit: 'hidden',
              reset: 'hidden',
            }}
          />
        </div>

        <div className="flex gap-8">
          <aside className="hidden w-64 shrink-0 lg:block">
            <ProductFilters />
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <Stats
                classNames={{
                  root: 'text-sm text-muted-foreground',
                }}
              />
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
                list: 'grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4',
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
        </div>
      </div>
    </InstantSearchNext>
  )
}
