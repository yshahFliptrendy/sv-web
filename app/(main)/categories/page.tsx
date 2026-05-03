import type { Metadata } from 'next'
import { ProductSearch } from '@/components/products/ProductSearch'
import { getCategoryTree } from '@/lib/categories'

export const metadata: Metadata = {
  title: 'Browse Categories — Vegan Products',
  description: 'Browse vegan, cruelty-free products by category.',
}

export default async function CategoriesPage() {
  const categoryTree = await getCategoryTree()
  return <ProductSearch categoryTree={categoryTree} />
}
