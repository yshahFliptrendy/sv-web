import type { Metadata } from 'next'
import { ProductSearch } from '@/components/products/ProductSearch'

export const metadata: Metadata = {
  title: 'Shop Vegan Products',
  description: 'Browse thousands of vegan, cruelty-free products across all categories.',
}

export default function ProductsPage() {
  return <ProductSearch />
}
