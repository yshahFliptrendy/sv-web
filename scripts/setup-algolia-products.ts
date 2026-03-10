/**
 * One-time script to configure the sv_products Algolia index.
 * Run with: npx tsx --env-file=.env.local scripts/setup-algolia-products.ts
 */
import { algoliasearch } from 'algoliasearch'

const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
)

const indexName = process.env.ALGOLIA_PRODUCTS_INDEX ?? 'sv_products'

async function main() {
  await client.setSettings({
    indexName,
    indexSettings: {
      searchableAttributes: ['name', 'brand_name', 'description', 'category_names', 'certification_names', 'ingredient_names'],
      attributesForFaceting: ['searchable(brand_name)', 'searchable(category_names)', 'searchable(certification_names)'],
      customRanking: ['desc(created_at)'],
      attributesToSnippet: ['description:20'],
    },
  })
  console.log(`✓ Configured Algolia index: ${indexName}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
