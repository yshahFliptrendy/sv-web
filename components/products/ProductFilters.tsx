'use client'

import { RefinementList, ClearRefinements } from 'react-instantsearch'

export function ProductFilters() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Filters
        </h2>
        <ClearRefinements
          classNames={{
            button: 'text-xs text-primary hover:underline disabled:opacity-40 disabled:no-underline',
            disabledButton: 'opacity-40',
          }}
          translations={{ resetButtonText: 'Clear all' }}
        />
      </div>

      <FilterSection title="Category">
        <RefinementList
          attribute="category_names"
          classNames={refinementClasses}
          searchable
          searchablePlaceholder="Search categories…"
        />
      </FilterSection>

      <FilterSection title="Brand">
        <RefinementList
          attribute="brand_name"
          classNames={refinementClasses}
          searchable
          searchablePlaceholder="Search brands…"
          limit={10}
          showMore
        />
      </FilterSection>

      <FilterSection title="Certifications">
        <RefinementList
          attribute="certification_names"
          classNames={refinementClasses}
        />
      </FilterSection>

      <FilterSection title="Ingredients">
        <RefinementList
          attribute="ingredient_names"
          classNames={refinementClasses}
          searchable
          searchablePlaceholder="Search ingredients…"
          limit={8}
          showMore
        />
      </FilterSection>
    </div>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {title}
      </h3>
      {children}
    </div>
  )
}

const refinementClasses = {
  root: 'space-y-1.5',
  item: 'flex items-center gap-2 text-sm',
  checkbox: 'rounded border-border accent-primary',
  label: 'flex-1 cursor-pointer',
  count: 'ml-auto text-xs text-muted-foreground',
  selectedItem: 'font-medium text-primary',
  searchBox: 'mb-2 w-full rounded border border-border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary',
  showMore: 'mt-2 text-xs text-primary hover:underline',
}
