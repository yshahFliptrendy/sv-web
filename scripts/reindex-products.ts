/**
 * Bulk reindex all published products from Supabase into Algolia.
 * Run with: npx tsx --env-file=.env.local scripts/reindex-products.ts
 */
import { createClient } from '@supabase/supabase-js'
import { algoliasearch } from 'algoliasearch'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const algolia = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
)

const indexName = process.env.ALGOLIA_PRODUCTS_INDEX ?? 'sv_products'

async function main() {
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id, slug, name, description, image_url, price, currency, created_at,
      brand:brands(name, slug),
      categories:product_categories(category:categories(name, slug)),
      certifications:product_certifications(certification:certifications(name)),
      ingredients:product_ingredients(ingredient:ingredients(name))
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!products || products.length === 0) {
    console.log('No published products found.')
    return
  }

  const records = (products as any[]).map((p) => ({
    objectID: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description ?? '',
    image_url: p.image_url ?? null,
    price: p.price ?? null,
    currency: p.currency ?? 'USD',
    brand_name: p.brand?.name ?? '',
    brand_slug: p.brand?.slug ?? '',
    category_names: (p.categories ?? []).map((c: any) => c.category?.name).filter(Boolean),
    category_slugs: (p.categories ?? []).map((c: any) => c.category?.slug).filter(Boolean),
    certification_names: (p.certifications ?? []).map((c: any) => c.certification?.name).filter(Boolean),
    ingredient_names: (p.ingredients ?? []).map((i: any) => i.ingredient?.name).filter(Boolean),
    created_at: Math.floor(new Date(p.created_at).getTime() / 1000),
  }))

  await algolia.saveObjects({ indexName, objects: records })
  console.log(`✓ Reindexed ${records.length} products into ${indexName}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
