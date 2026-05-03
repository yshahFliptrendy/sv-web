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

const BATCH_SIZE = 500

async function main() {
  // 1. Load all categories to build a parent lookup
  const { data: allCategories, error: catError } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id')
  if (catError) throw catError

  const catById = new Map(allCategories!.map((c) => [c.id, c]))

  function buildHierarchy(categoryId: string): string[] {
    const chain: string[] = []
    let current = catById.get(categoryId)
    while (current) {
      chain.unshift(current.name)
      current = current.parent_id ? catById.get(current.parent_id) : undefined
    }
    return chain.map((_, i) => chain.slice(0, i + 1).join(' > '))
  }

  // 2. Load all brands into a lookup
  const { data: allBrands } = await supabase.from('brands').select('id, name, slug')
  const brandById = new Map((allBrands ?? []).map((b) => [b.id, b]))

  // 3. Load all junction tables in bulk (faster than joining per-product)
  console.log('Loading junction tables...')

  const { data: allProductCategories } = await supabase
    .from('product_categories')
    .select('product_id, category_id')
  const prodCatMap = new Map<string, string[]>()
  for (const pc of allProductCategories ?? []) {
    const arr = prodCatMap.get(pc.product_id) ?? []
    arr.push(pc.category_id)
    prodCatMap.set(pc.product_id, arr)
  }

  const { data: allProductCerts } = await supabase
    .from('product_certifications')
    .select('product_id, certification:certifications(name)')
  const prodCertMap = new Map<string, string[]>()
  for (const pc of (allProductCerts ?? []) as any[]) {
    const name = pc.certification?.name
    if (!name) continue
    const arr = prodCertMap.get(pc.product_id) ?? []
    arr.push(name)
    prodCertMap.set(pc.product_id, arr)
  }

  const { data: allProductIngredients } = await supabase
    .from('product_ingredients')
    .select('product_id, ingredient:ingredients(name)')
  const prodIngMap = new Map<string, string[]>()
  for (const pi of (allProductIngredients ?? []) as any[]) {
    const name = pi.ingredient?.name
    if (!name) continue
    const arr = prodIngMap.get(pi.product_id) ?? []
    arr.push(name)
    prodIngMap.set(pi.product_id, arr)
  }

  console.log('Junction tables loaded. Indexing products...')

  // 4. Fetch and index products in batches using cursor-based pagination (avoids deep offset timeouts)
  let totalIndexed = 0
  let lastId: string | null = null

  while (true) {
    let query = supabase
      .from('products')
      .select('id, slug, name, description, image_url, price, currency, brand_id, created_at')
      .eq('status', 'published')
      .order('id', { ascending: true })
      .limit(BATCH_SIZE)

    if (lastId) {
      query = query.gt('id', lastId)
    }

    const { data: products, error } = await query

    if (error) throw error
    if (!products || products.length === 0) break

    lastId = products[products.length - 1].id

    const records = products.map((p) => {
      const brand = brandById.get(p.brand_id)
      const categoryIds = prodCatMap.get(p.id) ?? []

      const lvl0 = new Set<string>()
      const lvl1 = new Set<string>()
      const lvl2 = new Set<string>()
      const categoryNames: string[] = []
      const categorySlugs: string[] = []

      for (const catId of categoryIds) {
        const cat = catById.get(catId)
        if (cat) {
          categoryNames.push(cat.name)
          categorySlugs.push(cat.slug)
        }
        const paths = buildHierarchy(catId)
        if (paths[0]) lvl0.add(paths[0])
        if (paths[1]) lvl1.add(paths[1])
        if (paths[2]) lvl2.add(paths[2])
      }

      return {
        objectID: p.id,
        slug: p.slug,
        name: p.name,
        description: (p.description ?? '').slice(0, 500),
        image_url: p.image_url ?? null,
        price: p.price ?? null,
        currency: p.currency ?? 'USD',
        brand_name: brand?.name ?? '',
        brand_slug: brand?.slug ?? '',
        category_names: categoryNames,
        category_slugs: categorySlugs,
        categories: {
          lvl0: [...lvl0],
          lvl1: [...lvl1],
          lvl2: [...lvl2],
        },
        certification_names: prodCertMap.get(p.id) ?? [],
        ingredient_names: (prodIngMap.get(p.id) ?? []).slice(0, 30),
        created_at: Math.floor(new Date(p.created_at).getTime() / 1000),
      }
    })

    await algolia.saveObjects({ indexName, objects: records })
    totalIndexed += records.length
    console.log(`  ✓ indexed ${records.length} products (total: ${totalIndexed})`)

    if (products.length < BATCH_SIZE) break
  }

  console.log(`\n✓ Reindexed ${totalIndexed} products into ${indexName}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
