import Link from 'next/link'
import Image from 'next/image'
import { WishlistButton } from '@/components/common/WishlistButton'
import { formatPrice } from '@/lib/utils'
import { ShoppingBag } from 'lucide-react'
import type { Product, ProductHit } from '@/types'

interface Props {
  product: Product | ProductHit | any
}

export function ProductCard({ product }: Props) {
  // Normalise between DB product and Algolia hit shapes
  const slug = product.slug
  const name = product.name
  const imageUrl = product.image_url ?? product.imageUrl
  const price = product.price ? Number(product.price) : null
  const currency = product.currency ?? 'USD'
  const brandName = product.brand?.name ?? product.brand_name ?? ''
  const brandSlug = product.brand?.slug ?? product.brand_slug ?? ''
  const productId = product.id ?? product.objectID
  const buyUrl = `/api/go/${productId}`

  return (
    <div className="product-card group relative">
      {/* Image — links to brand website via affiliate */}
      <a href={buyUrl} target="_blank" rel="noopener noreferrer sponsored" className="block">
        <div className="relative overflow-hidden rounded-xl bg-muted aspect-[4/5] mb-3">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="product-card-image object-contain p-4"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
              No image
            </div>
          )}

          {/* Buy button overlay on hover */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg">
              <ShoppingBag className="h-3.5 w-3.5" />
              Buy Now
            </span>
          </div>

          {/* Wishlist button overlay */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <WishlistButton productId={productId} size="sm" />
          </div>
        </div>
      </a>

      {/* Info — links to product detail page */}
      <Link href={`/products/${slug}`}>
        <div>
          {brandSlug ? (
            <p className="text-xs font-medium uppercase tracking-wider text-primary truncate">
              {brandName}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground truncate">{brandName}</p>
          )}
          <p className="mt-0.5 text-sm font-medium text-foreground line-clamp-2 leading-snug hover:text-primary transition-colors">
            {name}
          </p>
          {price !== null && (
            <p className="mt-1 text-sm font-semibold">{formatPrice(price, currency)}</p>
          )}
        </div>
      </Link>
    </div>
  )
}
