'use client'

import { useState, useRef } from 'react'
import { ClearRefinements, useRefinementList, useCurrentRefinements, useRange } from 'react-instantsearch'
import { ChevronDown } from 'lucide-react'

export function ProductFilters() {
  return (
    <div className="space-y-1">
      {/* Active filters summary */}
      <ActiveFilters />

      <FilterSection title="Price" defaultOpen>
        <PriceFilter />
      </FilterSection>

      <Divider />

      {/* Category - shown as plain links like Amazon */}
      <FilterSection title="Category" defaultOpen>
        <CategoryLinks />
      </FilterSection>

      <Divider />

      <FilterSection title="Brand" defaultOpen>
        <BrandFilter />
      </FilterSection>

    </div>
  )
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

const CATEGORY_TREE: Record<string, string[]> = {
  'Makeup': ['Foundation', 'Concealer', 'Blush', 'Bronzer', 'Highlighter', 'Powder', 'Primer', 'Setting Spray', 'Contour', 'Palette'],
  'Eyes': ['Eyeshadow', 'Mascara', 'Eyeliner', 'Brow', 'Lashes', 'Eye Primer', 'Eye Pencil'],
  'Lips': ['Lipstick', 'Lip Gloss', 'Lip Liner', 'Lip Balm', 'Lip Oil', 'Lip Tint', 'Lip Care'],
  'Skincare': ['Serum', 'Moisturizer', 'Cleanser', 'Toner', 'Face Mask', 'Sunscreen', 'Eye Cream', 'Essence', 'Exfoliator', 'Retinol', 'Acne', 'Face Mist', 'Face Oil', 'Skin Cream', 'Skin Treatment'],
  'Body Care': ['Body Lotion', 'Body Butter', 'Body Oil', 'Body Wash', 'Body Scrub', 'Soap', 'Deodorant', 'Hand Cream', 'Body Cream', 'Body Mist', 'Foot Care', 'Shaving', 'Stretch Mark'],
  'Hair Care': ['Shampoo', 'Conditioner', 'Hair Mask', 'Hair Oil', 'Styling', 'Dry Shampoo', 'Leave-In', 'Hair Spray', 'Hair Color', 'Scalp Care'],
  'Bath': ['Bath Bomb', 'Bath Soak', 'Shower'],
  'Fragrance': ['Eau de Parfum', 'Eau de Toilette', 'Perfume', 'Cologne'],
  'Nails': ['Nail Polish', 'Nail Care', 'Nail Art', 'Nail Tools', 'Dip & Acrylic'],
  'Tools & Accessories': ['Brushes', 'Sponges', 'Mirrors', 'Rollers', 'Cases', 'Tweezers', 'Devices', 'Hair Tools', 'Wipes'],
  'Sets & Bundles': ['Gift Set', 'Kit', 'Bundle', 'Travel Size', 'Sample'],
  'Home': ['Candles', 'Diffusers', 'Household', 'Essential Oils', 'Incense'],
}

function CategoryLinks() {
  const { items, refine } = useRefinementList({
    attribute: 'category_names',
    limit: 200,
    sortBy: ['count:desc'],
  })

  const [showAll, setShowAll] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const itemMap = new Map(items.map((i) => [i.label, i]))

  // Find which parents are active (refined)
  const activeParent = Object.keys(CATEGORY_TREE).find((p) => itemMap.get(p)?.isRefined)

  // Auto-expand active parent
  const parentNames = Object.keys(CATEGORY_TREE)
  const visible = showAll ? parentNames : parentNames.slice(0, 8)

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">No categories available</p>
  }

  const toggleExpand = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  // Check if any subcategory of a parent is refined
  const hasRefinedChild = (parentName: string) => {
    const subs = CATEGORY_TREE[parentName] || []
    return subs.some((sub) => itemMap.get(sub)?.isRefined)
  }

  const handleSubClick = (subName: string, parentName: string) => {
    const parentItem = itemMap.get(parentName)
    const subItem = itemMap.get(subName)
    if (!subItem) return

    // If parent is refined and we're clicking a subcategory, deselect parent first
    if (parentItem?.isRefined) {
      refine(parentItem.value)
    }
    refine(subItem.value)
  }

  const handleParentClick = (parentName: string) => {
    const parentItem = itemMap.get(parentName)
    if (!parentItem) return

    // If clicking parent while subcategories are selected, clear subcategories first
    const subs = CATEGORY_TREE[parentName] || []
    for (const sub of subs) {
      const subItem = itemMap.get(sub)
      if (subItem?.isRefined) {
        refine(subItem.value)
      }
    }
    refine(parentItem.value)
  }

  return (
    <div className="space-y-0.5">
      {visible.map((parentName) => {
        const parentItem = itemMap.get(parentName)
        if (!parentItem) return null
        const isExpanded = expanded.has(parentName) || parentItem.isRefined || hasRefinedChild(parentName)
        const subcategories = CATEGORY_TREE[parentName] || []

        return (
          <div key={parentName}>
            <div className="flex items-center gap-1">
              {subcategories.length > 0 && (
                <button
                  onClick={() => toggleExpand(parentName)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                </button>
              )}
              <button
                onClick={() => handleParentClick(parentName)}
                className={`flex-1 flex items-center justify-between text-left text-sm py-0.5 ${
                  parentItem.isRefined ? 'font-bold text-foreground' : 'text-foreground hover:text-blue-600'
                }`}
              >
                <span>{parentName}</span>
                <span className="text-xs text-muted-foreground">({parentItem.count.toLocaleString()})</span>
              </button>
            </div>
            {isExpanded && (
              <div className="ml-5 space-y-0.5">
                {subcategories.map((subName) => {
                  const subItem = itemMap.get(subName)
                  if (!subItem || subItem.count === 0) return null
                  return (
                    <button
                      key={subName}
                      onClick={() => handleSubClick(subName, parentName)}
                      className={`flex items-center justify-between w-full text-left text-sm py-0.5 ${
                        subItem.isRefined ? 'font-bold text-foreground' : 'text-muted-foreground hover:text-blue-600'
                      }`}
                    >
                      <span>{subName}</span>
                      <span className="text-xs text-muted-foreground">({subItem.count.toLocaleString()})</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      {parentNames.length > 8 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-1 text-xs text-blue-600 hover:underline"
        >
          {showAll ? 'Show less' : 'Show more'}
        </button>
      )}
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
        className="mb-2 w-full rounded border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
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

function PriceFilter() {
  const { range, start, refine } = useRange({ attribute: 'price' })
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const debounceRef = useRef<number>(0)

  const rangeMin = range.min ?? 0
  const rangeMax = range.max ?? 1000

  const currentMin = (start[0] != null && start[0] !== -Infinity) ? start[0] : rangeMin
  const currentMax = (start[1] != null && start[1] !== Infinity) ? start[1] : rangeMax

  const apply = (newMin: string, newMax: string) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      const lo = newMin === '' ? undefined : Number(newMin)
      const hi = newMax === '' ? undefined : Number(newMax)
      refine([lo, hi])
    }, 500)
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <input
            type="number"
            min={rangeMin}
            max={rangeMax}
            placeholder={`$${rangeMin}`}
            value={min}
            onChange={(e) => {
              setMin(e.target.value)
              apply(e.target.value, max)
            }}
            className="w-full rounded border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <span className="text-sm text-muted-foreground">to</span>
        <div className="flex-1">
          <input
            type="number"
            min={rangeMin}
            max={rangeMax}
            placeholder={`$${rangeMax}`}
            value={max}
            onChange={(e) => {
              setMax(e.target.value)
              apply(min, e.target.value)
            }}
            className="w-full rounded border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      {((currentMin ?? rangeMin) > rangeMin || (currentMax ?? rangeMax) < rangeMax) && (
        <button
          onClick={() => {
            setMin('')
            setMax('')
            refine([undefined, undefined])
          }}
          className="mt-2 text-xs text-blue-600 hover:underline"
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
