import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { WishlistButton } from '@/components/common/WishlistButton'
import { ProductGrid } from '@/components/products/ProductGrid'
import { formatPrice } from '@/lib/utils'
import { ShoppingBag, ExternalLink } from 'lucide-react'
import { buildCategoryPaths, categoryPath } from '@/lib/categories'

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

// Deduplicated fetch — React cache ensures this runs once per request
// even though both generateMetadata and the page component call it
const getProduct = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select(`
      *,
      brand:brands(*),
      product_categories(category:categories(id, slug, name, parent_id)),
      product_ingredients(ingredient:ingredients(id, slug, name, is_vegan)),
      product_certifications(certification:certifications(id, slug, name, icon_url)),
      product_attributes(attribute_name, attribute_value)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()
  return data
})

export async function generateStaticParams() {
  const { createClient: createDirectClient } = await import('@supabase/supabase-js')
  const supabase = createDirectClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data } = await supabase
    .from('products')
    .select('slug')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(1000)
  return (data ?? []).map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) return {}

  const brandName = (product.brand as any)?.name
  const defaultTitle = brandName ? `${brandName} ${product.name}` : product.name
  const defaultDescription =
    product.description ??
    `Shop ${defaultTitle} — a vegan product on ShoppingVegan. Cruelty-free, plant-based, and curated for ethical living.`

  const title = (product as any).seo_title ?? defaultTitle
  const description = (product as any).seo_description ?? defaultDescription
  const image = product.image_url ?? undefined

  return {
    title,
    description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) notFound()

  const affiliateHref = `/api/go/${product.id}`
  const brand = product.brand as any
  const ingredients = (product.product_ingredients as any[])?.map((pi: any) => pi.ingredient) ?? []
  const certifications = (product.product_certifications as any[])?.map((pc: any) => pc.certification) ?? []
  const categories = (product.product_categories as any[])?.map((pc: any) => pc.category) ?? []
  const attrs = (product as any).product_attributes?.reduce((acc: Record<string, string>, a: any) => {
    acc[a.attribute_name] = a.attribute_value
    return acc
  }, {} as Record<string, string>) ?? {}

  // Build category paths for SEO-friendly URLs
  const catPathMap = buildCategoryPaths(categories)
  const primaryCat = categories[0]
  const primaryCatUrl = primaryCat ? categoryPath(catPathMap.get(primaryCat.id) ?? [primaryCat.slug]) : null

  const categoryIds = categories.map((c: any) => c.id).filter(Boolean)

  // Related + similar products — fetched in parallel
  const supabase = await createClient()
  const [{ data: relatedProducts }, { data: similarRaw }] = await Promise.all([
    // Same brand
    supabase
      .from('products')
      .select('id, slug, name, image_url, price, currency, brand:brands(id, slug, name, logo_url)')
      .eq('brand_id', product.brand_id)
      .eq('status', 'published')
      .neq('id', product.id)
      .limit(4),
    // Same category — prefer other brands
    categoryIds.length > 0
      ? supabase
          .from('product_categories')
          .select('product:products!inner(id, slug, name, image_url, price, currency, brand_id, brand:brands(id, slug, name, logo_url))')
          .in('category_id', categoryIds)
          .neq('product_id', product.id)
          .eq('product.status', 'published')
          .limit(20)
      : Promise.resolve({ data: [] as any[] }),
  ])

  // Deduplicate, exclude "More from brand" overlap, sort other-brands first
  const similarProducts = (() => {
    if (!similarRaw || similarRaw.length === 0) return []
    const relatedIds = new Set((relatedProducts ?? []).map((p: any) => p.id))
    const seen = new Set<string>()
    const items: any[] = []
    for (const row of similarRaw) {
      const p = (row as any).product
      if (!p || seen.has(p.id) || relatedIds.has(p.id)) continue
      seen.add(p.id)
      items.push(p)
    }
    items.sort((a, b) => {
      const aOwn = a.brand_id === product.brand_id ? 1 : 0
      const bOwn = b.brand_id === product.brand_id ? 1 : 0
      return aOwn - bOwn
    })
    return items.slice(0, 4)
  })()

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
      ...(primaryCat && primaryCatUrl ? [{
        '@type': 'ListItem', position: 3,
        name: primaryCat.name, item: `${baseUrl}${primaryCatUrl}`,
      }] : []),
      { '@type': 'ListItem', position: primaryCat ? 4 : 3, name: product.name },
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
        {primaryCat && primaryCatUrl && (
          <>
            <span className="mx-2">/</span>
            <Link href={primaryCatUrl} className="hover:text-foreground">
              {primaryCat.name}
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
              alt={brand?.name ? `${brand.name} ${product.name}` : product.name}
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
          <h1 className="text-2xl font-bold sm:text-3xl">
            {brand?.name ? `${brand.name} ${product.name}` : product.name}
          </h1>

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

          {/* Product Attributes */}
          {Object.keys(attrs).length > 0 && (
            <div className="space-y-2 text-sm">
              {attrs.type && (
                <p>💅 <span className="font-medium">Type:</span> {attrs.type}</p>
              )}
              {attrs.finish && (
                <p>✨ <span className="font-medium">Finish:</span> {attrs.finish}</p>
              )}
              {attrs.vegan && (
                <p>🌱 <span className="font-medium">Vegan:</span> {attrs.vegan}</p>
              )}
              {attrs.cruelty_free && (
                <p>🐰 <span className="font-medium">Cruelty-Free:</span> {attrs.cruelty_free}</p>
              )}
              {attrs.sensitivity && (
                <p>
                  ⚠️ <span className="font-medium">Sensitivity:</span>{' '}
                  <span className={
                    attrs.sensitivity.startsWith('Suitable') ? 'text-green-600' :
                    attrs.sensitivity.startsWith('May not suit') ? 'text-yellow-600' :
                    attrs.sensitivity.startsWith('Not suitable') ? 'text-red-600' :
                    'text-muted-foreground'
                  }>
                    {attrs.sensitivity}
                  </span>
                </p>
              )}
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

          {/* Ingredient Summary */}
          {attrs.ingredient_animal && (
            <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-2 text-sm">
              <h3 className="font-semibold mb-2">Ingredient Summary</h3>
              <p className="text-green-600">✔️ {attrs.ingredient_animal}</p>
              {attrs.ingredient_concerns && (
                <p className={
                  attrs.ingredient_concerns === 'Ingredient information not available'
                    ? 'text-muted-foreground'
                    : 'text-yellow-600'
                }>
                  ⚠️ {attrs.ingredient_concerns}
                </p>
              )}
              {attrs.ingredient_sensitivity && (
                <p className={
                  attrs.ingredient_sensitivity.startsWith('No known irritants') ? 'text-green-600' :
                  attrs.ingredient_sensitivity.startsWith('May not be ideal') ? 'text-yellow-600' :
                  'text-muted-foreground'
                }>
                  🧪 {attrs.ingredient_sensitivity}
                </p>
              )}
            </div>
          )}

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

      {/* Similar Products */}
      {similarProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-semibold mb-6">Similar Vegan Alternatives</h2>
          <ProductGrid products={similarProducts} />
        </div>
      )}

      {/* More from Brand */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-semibold mb-6">More from {brand?.name}</h2>
          <ProductGrid products={relatedProducts} />
        </div>
      )}
    </div>
  )
}
