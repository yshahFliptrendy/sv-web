import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { WishlistButton } from '@/components/common/WishlistButton'
import { ProductGrid } from '@/components/products/ProductGrid'
import { formatPrice } from '@/lib/utils'
import { ShoppingBag, ExternalLink } from 'lucide-react'

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const { createClient: createDirectClient } = await import('@supabase/supabase-js')
  const supabase = createDirectClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await supabase.from('products').select('slug').eq('status', 'published')
  return (data ?? []).map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: product } = await supabase
    .from('products')
    .select('name, description, image_url, price, currency, brand:brands(name)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!product) return {}

  const brandName = (product.brand as any)?.name
  const title = `${product.name} by ${brandName}`

  return {
    title,
    description: product.description ?? undefined,
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      title,
      description: product.description ?? undefined,
      ...(product.image_url ? { images: [product.image_url] } : {}),
    },
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select(`
      *,
      brand:brands(*),
      product_categories(category:categories(id, slug, name)),
      product_ingredients(ingredient:ingredients(id, slug, name, is_vegan)),
      product_certifications(certification:certifications(id, slug, name, icon_url))
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!product) notFound()

  const affiliateHref = `/api/go/${product.id}`
  const brand = product.brand as any
  const ingredients = (product.product_ingredients as any[])?.map((pi: any) => pi.ingredient) ?? []
  const certifications = (product.product_certifications as any[])?.map((pc: any) => pc.certification) ?? []
  const categories = (product.product_categories as any[])?.map((pc: any) => pc.category) ?? []

  // Related products from same brand
  const { data: relatedProducts } = await supabase
    .from('products')
    .select('*, brand:brands(id, slug, name, logo_url)')
    .eq('brand_id', product.brand_id)
    .eq('status', 'published')
    .neq('id', product.id)
    .limit(4)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shoppingvegan.com'

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    image: product.image_url ?? undefined,
    url: `${baseUrl}/products/${slug}`,
    brand: brand ? { '@type': 'Brand', name: brand.name } : undefined,
    ...(product.price ? {
      offers: {
        '@type': 'Offer',
        price: Number(product.price),
        priceCurrency: product.currency ?? 'USD',
        availability: 'https://schema.org/InStock',
        url: `${baseUrl}/products/${slug}`,
      },
    } : {}),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${baseUrl}/products` },
      ...(categories[0] ? [{
        '@type': 'ListItem', position: 3,
        name: categories[0].name, item: `${baseUrl}/categories/${categories[0].slug}`,
      }] : []),
      { '@type': 'ListItem', position: categories[0] ? 4 : 3, name: product.name },
    ],
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-foreground">Products</Link>
        {categories[0] && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/categories/${categories[0].slug}`} className="hover:text-foreground">
              {categories[0].name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Product Image */}
        <div className="overflow-hidden rounded-xl bg-muted aspect-square relative">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-contain p-8"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              No image available
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Brand */}
          <Link
            href={`/brands/${brand?.slug}`}
            className="text-sm font-medium text-primary hover:underline uppercase tracking-wider"
          >
            {brand?.name}
          </Link>

          {/* Name */}
          <h1 className="text-3xl font-bold">{product.name}</h1>

          {/* Price */}
          {product.price && (
            <p className="text-2xl font-semibold">
              {formatPrice(Number(product.price), product.currency)}
            </p>
          )}

          {/* Certifications */}
          {certifications.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {certifications.map((cert: any) => (
                <span
                  key={cert.id}
                  className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {cert.name}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {product.description && (
            <p className="text-muted-foreground leading-relaxed">{product.description}</p>
          )}

          {/* CTA Buttons */}
          <div className="flex gap-3">
            <a
              href={affiliateHref}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              Shop Now
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
            <WishlistButton productId={product.id} />
          </div>

          {/* Ingredients */}
          {ingredients.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Key Ingredients</h3>
              <div className="flex flex-wrap gap-2">
                {ingredients.map((ing: any) => (
                  <Link
                    key={ing.id}
                    href={`/ingredients/${ing.slug}`}
                    className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted transition-colors"
                  >
                    {ing.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-semibold mb-6">More from {brand?.name}</h2>
          <ProductGrid products={relatedProducts} />
        </div>
      )}
    </div>
  )
}
