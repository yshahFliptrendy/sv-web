import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ProductSearch } from '@/components/products/ProductSearch'
import { getCategoryTree } from '@/lib/categories'
import { ExternalLink } from 'lucide-react'

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

const getBrand = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('brands')
    .select('id, slug, name, description, logo_url, website, is_verified')
    .eq('slug', slug)
    .single()
  return data
})

export async function generateStaticParams() {
  const { createClient: createDirectClient } = await import('@supabase/supabase-js')
  const supabase = createDirectClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data } = await supabase.from('brands').select('slug')
  return (data ?? []).map((b) => ({ slug: b.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const brand = await getBrand(slug)

  if (!brand) return {}

  const title = `${brand.name} — Vegan Products`

  return {
    title,
    description: brand.description ?? undefined,
    alternates: { canonical: `/brands/${slug}` },
    openGraph: {
      title,
      description: brand.description ?? undefined,
      ...(brand.logo_url ? { images: [brand.logo_url] } : {}),
    },
  }
}

export default async function BrandPage({ params }: Props) {
  const { slug } = await params
  const brand = await getBrand(slug)

  if (!brand) notFound()

  return (
    <div>
      {/* Brand Hero */}
      <div className="bg-muted border-b">
        <div className="container mx-auto max-w-7xl px-4 py-10">
          <div className="flex items-center gap-6">
            {brand.logo_url && (
              <div className="relative h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-white border">
                <Image src={brand.logo_url} alt={brand.name} fill className="object-contain p-2" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{brand.name}</h1>
                {brand.is_verified && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Verified Vegan
                  </span>
                )}
              </div>
              {brand.description && (
                <p className="mt-2 text-muted-foreground max-w-2xl">{brand.description}</p>
              )}
              {brand.website && (
                <a
                  href={brand.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Visit website <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Products with filters — pass brand filter so category counts reflect this brand */}
      <ProductSearch brand={brand.name} categoryTree={await getCategoryTree(`brand_name:'${brand.name.replace(/'/g, "\\'")}'`)} />
    </div>
  )
}
