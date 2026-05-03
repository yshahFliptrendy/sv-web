'use client'

import { useState, useRef, useCallback } from 'react'
import * as Slider from '@radix-ui/react-slider'
import Link from 'next/link'
import { ClearRefinements, useRefinementList, useCurrentRefinements, useInstantSearch } from 'react-instantsearch'
import { ChevronDown } from 'lucide-react'

export interface CategoryNode {
  name: string
  path: string
  count?: number
  children?: CategoryNode[]
}

interface ProductFiltersProps {
  categoryTree?: CategoryNode[]
  activeCategoryPath?: string
  hideBrandFilter?: boolean
  onCategoryFilter?: (hierName: string | null) => void
  activeCategoryFilter?: string | null
  onPriceChange?: (range: [number | null, number | null]) => void
  priceRange?: [number | null, number | null]
}

export function ProductFilters({ categoryTree, activeCategoryPath, hideBrandFilter, onCategoryFilter, activeCategoryFilter, onPriceChange, priceRange }: ProductFiltersProps) {
  return (
    <div className="space-y-1">
      {/* Active filters summary */}
      <ActiveFilters />

      <FilterSection title="Price" defaultOpen>
        <PriceFilter onPriceChange={onPriceChange} priceRange={priceRange} />
      </FilterSection>

      <Divider />

      {/* Category - real links for SEO, or inline filter buttons on brand pages */}
      <FilterSection title="Category" defaultOpen>
        <CategoryNav tree={categoryTree ?? []} activePath={activeCategoryPath} onCategoryFilter={onCategoryFilter} activeCategoryFilter={activeCategoryFilter} />
      </FilterSection>

      {!hideBrandFilter && (
        <>
          <Divider />
          <FilterSection title="Brand" defaultOpen>
            <BrandFilter />
          </FilterSection>
        </>
      )}

    </div>
  )
}

function CategoryNav({ tree, activePath, onCategoryFilter, activeCategoryFilter }: { tree: CategoryNode[]; activePath?: string; onCategoryFilter?: (hierName: string | null) => void; activeCategoryFilter?: string | null }) {
  // Read live facet counts from Algolia search state so counts update when filters change
  const { results } = useInstantSearch()
  const liveCounts: Record<string, number> = {
    ...(results?.facets?.find((f) => f.name === 'categories.lvl0')?.data ?? {}),
    ...(results?.facets?.find((f) => f.name === 'categories.lvl1')?.data ?? {}),
    ...(results?.facets?.find((f) => f.name === 'categories.lvl2')?.data ?? {}),
  }
  const hasLiveCounts = Object.keys(liveCounts).length > 0

  if (tree.length === 0) {
    return <p className="text-xs text-muted-foreground">No categories available</p>
  }

  // Build a map from category name to its hierarchical name for facet lookup
  // e.g., node at path /categories/nails/nail-polish has hierName "Nails > Nail Polish"
  function buildHierNameMap(nodes: CategoryNode[], ancestors: string[] = []): Map<string, string> {
    const map = new Map<string, string>()
    for (const node of nodes) {
      const hierName = [...ancestors, node.name].join(' > ')
      map.set(node.path, hierName)
      if (node.children) {
        for (const [k, v] of buildHierNameMap(node.children, [...ancestors, node.name])) {
          map.set(k, v)
        }
      }
    }
    return map
  }
  const hierNameMap = (hasLiveCounts || onCategoryFilter) ? buildHierNameMap(tree) : new Map<string, string>()

  function getCount(node: CategoryNode): number | undefined {
    if (hasLiveCounts) {
      const hierName = hierNameMap.get(node.path)
      return hierName ? liveCounts[hierName] : undefined
    }
    return node.count
  }

  function hasProducts(node: CategoryNode): boolean {
    const count = getCount(node)
    if ((count ?? 0) > 0) return true
    return node.children?.some((c) => hasProducts(c)) ?? false
  }

  // Determine which paths should be expanded (ancestors of active category)
  const expandedPaths = new Set<string>()
  if (activePath) {
    function markAncestors(nodes: CategoryNode[]): boolean {
      for (const node of nodes) {
        if (node.path === activePath || (node.children && markAncestors(node.children))) {
          expandedPaths.add(node.path)
          return true
        }
      }
      return false
    }
    markAncestors(tree)
  }

  function renderNodes(nodes: CategoryNode[], depth = 0) {
    const indent = depth === 0 ? '' : depth === 1 ? 'ml-4' : 'ml-8'
    return (
      <div className={`${indent} ${depth > 0 ? 'mt-0.5' : ''} space-y-0.5`}>
        {nodes.filter((node) => hasProducts(node)).map((node) => {
          const hierName = hierNameMap.get(node.path)
          const isActive = onCategoryFilter
            ? activeCategoryFilter === hierName
            : activePath === node.path
          const hasChildren = node.children && node.children.length > 0
          const isExpanded = onCategoryFilter
            ? hasChildren && (isActive || (node.children?.some((c) => activeCategoryFilter === hierNameMap.get(c.path)) ?? false))
            : expandedPaths.has(node.path)
          const count = getCount(node)

          return (
            <div key={node.path}>
              {onCategoryFilter ? (
                <button
                  onClick={() => onCategoryFilter(isActive ? null : hierName ?? null)}
                  className={`flex w-full items-center justify-between text-sm py-0.5 ${
                    isActive ? 'font-bold text-foreground' : 'text-foreground hover:text-blue-600'
                  }`}
                >
                  <span>{node.name}</span>
                  {count != null && count > 0 && (
                    <span className="text-xs text-muted-foreground">({count.toLocaleString()})</span>
                  )}
                </button>
              ) : (
                <Link
                  href={node.path}
                  className={`flex items-center justify-between text-sm py-0.5 ${
                    isActive ? 'font-bold text-foreground' : 'text-foreground hover:text-blue-600'
                  }`}
                >
                  <span>{node.name}</span>
                  {count != null && count > 0 && (
                    <span className="text-xs text-muted-foreground">({count.toLocaleString()})</span>
                  )}
                </Link>
              )}
              {hasChildren && isExpanded && renderNodes(node.children!, depth + 1)}
            </div>
          )
        })}
      </div>
    )
  }

  return renderNodes(tree)
}

function ActiveFilters() {
  const { items } = useCurrentRefinements()
  if (items.length === 0) return null

  return (
    <div className="pb-3 mb-1 border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-foreground">Active Filters</span>
        <ClearRefinements
          classNames={{
            button: 'text-xs text-blue-600 hover:text-blue-800 hover:underline disabled:hidden',
          }}
          translations={{ resetButtonText: 'Clear all' }}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.flatMap((item) =>
          item.refinements.map((r) => (
            <button
              key={`${item.attribute}-${r.label}`}
              onClick={() => item.refine(r)}
              className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-foreground hover:bg-muted/70"
            >
              {r.label}
              <span className="text-muted-foreground ml-0.5">&times;</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}


function FilterSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="py-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between"
      >
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            open ? '' : '-rotate-90'
          }`}
        />
      </button>
      <div className={open ? 'mt-2' : 'hidden'}>{children}</div>
    </div>
  )
}

function BrandFilter() {
  const { items, refine, searchForItems } = useRefinementList({
    attribute: 'brand_name',
    limit: 200,
    sortBy: ['count:desc'],
  })

  const [query, setQuery] = useState('')
  const [showMore, setShowMore] = useState(false)
  const debounceRef = useRef<number>(0)
  const refined = items.filter((i) => i.isRefined)
  const unrefined = items.filter((i) => !i.isRefined)
  const filtered = query
    ? unrefined.slice(0, 15)
    : showMore ? unrefined.slice(0, 20) : unrefined.slice(0, 10)

  return (
    <div>
      {refined.length > 0 && (
        <div className="mb-2 space-y-1">
          {refined.map((item) => (
            <button
              key={item.value}
              onClick={() => refine(item.value)}
              className="flex items-center gap-2 text-sm font-semibold text-foreground w-full text-left"
            >
              <input type="checkbox" checked readOnly className="rounded border-gray-300 accent-primary h-3.5 w-3.5" />
              {item.label}
            </button>
          ))}
        </div>
      )}
      <input
        type="text"
        value={query}
        onChange={(e) => {
          const val = e.target.value
          setQuery(val)
          clearTimeout(debounceRef.current)
          debounceRef.current = window.setTimeout(() => {
            searchForItems(val)
          }, 300)
        }}
        placeholder="Search brands…"
        className="mb-2 w-full rounded border border-border px-2 py-1.5 text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
      />
      <div className="space-y-1">
        {filtered.map((item) => (
          <button
            key={item.value}
            onClick={() => refine(item.value)}
            className="flex items-center gap-2 text-sm text-foreground hover:text-blue-600 w-full text-left"
          >
            <input type="checkbox" checked={false} readOnly className="rounded border-gray-300 h-3.5 w-3.5" />
            <span className="flex-1 truncate">{item.label}</span>
            <span className="text-xs text-muted-foreground">({item.count.toLocaleString()})</span>
          </button>
        ))}
      </div>
      {!query && unrefined.length > 10 && (
        <button
          onClick={() => setShowMore(!showMore)}
          className="mt-2 text-xs text-blue-600 hover:underline"
        >
          {showMore ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}

const PRICE_MIN = 0
const PRICE_MAX = 500
const PRICE_STEP = 5

function PriceFilter({ onPriceChange, priceRange }: { onPriceChange?: (range: [number | null, number | null]) => void; priceRange?: [number | null, number | null] }) {
  const [values, setValues] = useState([PRICE_MIN, PRICE_MAX])
  const debounceRef = useRef<number>(0)

  const hasActiveFilter = values[0] > PRICE_MIN || values[1] < PRICE_MAX

  const applyFilter = useCallback((newValues: number[]) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      const lo = newValues[0] > PRICE_MIN ? newValues[0] : null
      const hi = newValues[1] < PRICE_MAX ? newValues[1] : null
      onPriceChange?.([lo, hi])
    }, 300)
  }, [onPriceChange])

  const handleChange = (newValues: number[]) => {
    setValues(newValues)
    applyFilter(newValues)
  }

  const clear = () => {
    setValues([PRICE_MIN, PRICE_MAX])
    clearTimeout(debounceRef.current)
    onPriceChange?.([null, null])
  }

  return (
    <div>
      <Slider.Root
        className="relative flex w-full touch-none select-none items-center h-5"
        min={PRICE_MIN}
        max={PRICE_MAX}
        step={PRICE_STEP}
        value={values}
        onValueChange={handleChange}
      >
        <Slider.Track className="relative h-1 w-full grow rounded-full bg-muted">
          <Slider.Range className="absolute h-full rounded-full bg-primary" />
        </Slider.Track>
        <Slider.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 cursor-grab active:cursor-grabbing" />
        <Slider.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 cursor-grab active:cursor-grabbing" />
      </Slider.Root>
      <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
        <span>${values[0]}</span>
        <span>{values[1] >= PRICE_MAX ? `$${PRICE_MAX}+` : `$${values[1]}`}</span>
      </div>
      {hasActiveFilter && (
        <button
          onClick={clear}
          className="mt-1.5 text-xs text-blue-600 hover:underline"
        >
          Clear price filter
        </button>
      )}
    </div>
  )
}

function Divider() {
  return <div className="border-b border-border" />
}
