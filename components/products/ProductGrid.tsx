import { ProductCard } from './ProductCard'

interface Props {
  products: any[]
}

export function ProductGrid({ products }: Props) {
  if (!products.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
        No products found.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id ?? product.objectID} product={product} />
      ))}
    </div>
  )
}
