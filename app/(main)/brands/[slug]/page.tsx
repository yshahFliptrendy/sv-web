import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { ProductGrid } from '@/components/products/ProductGrid'
import { ExternalLink } from 'lucide-react'

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: brand } = await supabase
    .from('brands')
    .select('name, description')
    .eq('slug', slug)
    .single()

  if (!brand) return {}
  return { title: `${brand.name} — Vegan Products`, description: brand.description ?? undefined }
}

export default async function BrandPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!brand) notFound()

  const { data: products } = await supabase
    .from('products')
    .select('*, brand:brands(id, slug, name, logo_url)')
    .eq('brand_id', brand.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

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
                    ✓ Verified Vegan
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

      {/* Products */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <h2 className="text-xl font-semibold mb-6">
          {products?.length ?? 0} Products from {brand.name}
        </h2>
        <ProductGrid products={products ?? []} />
      </div>
    </div>
  )
}
