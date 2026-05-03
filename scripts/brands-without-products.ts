/**
 * List DB brands whose name/slug does NOT appear in the Algolia products index ("cache").
 * Run with: npx tsx --env-file=.env.local scripts/brands-without-products.ts
 */
import { createClient } from '@supabase/supabase-js'
import { algoliasearch } from 'algoliasearch'
import { writeFileSync } from 'node:fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const algolia = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
)

const indexName = process.env.ALGOLIA_PRODUCTS_INDEX ?? 'sv_products'

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function main() {
  const { data: brands, error } = await supabase
    .from('brands')
    .select('id, slug, name')
    .order('name')
  if (error) throw error
  console.log(`DB brands: ${brands?.length ?? 0}`)

  // Browse every product in the Algolia index and collect distinct brand identifiers.
  const algoliaBrandSlugs = new Set<string>()
  const algoliaBrandNames = new Set<string>()
  const brandSlugCount = new Map<string, number>()
  let scanned = 0

  await algolia.browseObjects({
    indexName,
    browseParams: { attributesToRetrieve: ['brand_name', 'brand_slug'] },
    aggregator: (response) => {
      for (const hit of response.hits as Array<{ brand_name?: string; brand_slug?: string }>) {
        scanned++
        if (hit.brand_slug) {
          algoliaBrandSlugs.add(hit.brand_slug)
          brandSlugCount.set(hit.brand_slug, (brandSlugCount.get(hit.brand_slug) ?? 0) + 1)
        }
        if (hit.brand_name) algoliaBrandNames.add(norm(hit.brand_name))
      }
    },
  })
  console.log(`Algolia products scanned: ${scanned}`)
  console.log(`Distinct brand_slug in Algolia:  ${algoliaBrandSlugs.size}`)
  console.log(`Distinct brand_name in Algolia:  ${algoliaBrandNames.size}`)

  // A DB brand is considered "in cache" if its slug OR its (normalised) name appears in Algolia.
  const orphans = (brands ?? []).filter(
    (b) => !algoliaBrandSlugs.has(b.slug) && !algoliaBrandNames.has(norm(b.name))
  )
  console.log(`\nBrands with no products in Algolia: ${orphans.length}`)

  const csv = [
    'name,slug,id',
    ...orphans.map((b) => `"${b.name.replace(/"/g, '""')}",${b.slug},${b.id}`),
  ].join('\n')
  writeFileSync('brands-without-products.csv', csv)
  console.log('Wrote brands-without-products.csv')

  // Sanity log: top 10 brands by Algolia product count.
  const top = [...brandSlugCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  console.log('\nTop brand_slugs in Algolia (sanity check):')
  for (const [slug, count] of top) console.log(`  ${count.toString().padStart(5)}  ${slug}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
