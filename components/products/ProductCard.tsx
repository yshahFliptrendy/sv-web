import Link from 'next/link'
import Image from 'next/image'
import { WishlistButton } from '@/components/common/WishlistButton'
import { formatPrice } from '@/lib/utils'
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

  return (
    <div className="product-card group relative">
      <Link href={`/products/${slug}`} className="block">
        {/* Image */}
        <div className="relative overflow-hidden rounded-xl bg-muted aspect-square mb-3">
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

          {/* Wishlist button overlay */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <WishlistButton productId={productId} size="sm" />
          </div>
        </div>

        {/* Info */}
        <div>
          {brandSlug ? (
            <p className="text-xs font-medium uppercase tracking-wider text-primary truncate">
              {brandName}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground truncate">{brandName}</p>
          )}
          <p className="mt-0.5 text-sm font-medium text-foreground line-clamp-2 leading-snug">
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
