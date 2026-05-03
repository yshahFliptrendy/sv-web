import type { Metadata } from 'next'
import { Suspense } from 'react'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { getCategoryTree } from '@/lib/categories'

export const metadata: Metadata = {
  title: 'Search — ShoppingVegan',
  description: 'Search vegan products and articles.',
  alternates: { canonical: '/search' },
  robots: { index: false, follow: true },
}

export default async function SearchPage() {
  const categoryTree = await getCategoryTree()
  return (
    <Suspense>
      <GlobalSearch categoryTree={categoryTree} />
    </Suspense>
  )
}
