import type { Metadata } from 'next'
import { ProductSearch } from '@/components/products/ProductSearch'

export const metadata: Metadata = {
  title: 'Browse Categories — Vegan Products',
  description: 'Browse vegan, cruelty-free products by category.',
}

export default function CategoriesPage() {
  return <ProductSearch />
}
