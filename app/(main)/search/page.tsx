import type { Metadata } from 'next'
import { Suspense } from 'react'
import { GlobalSearch } from '@/components/search/GlobalSearch'

export const metadata: Metadata = {
  title: 'Search — ShoppingVegan',
  description: 'Search vegan products and articles.',
}

export default function SearchPage() {
  return (
    <Suspense>
      <GlobalSearch />
    </Suspense>
  )
}
