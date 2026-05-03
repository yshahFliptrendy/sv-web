/**
 * One-time script to configure the sv_products Algolia index + replica indices for sorting.
 * Run with: npx tsx --env-file=.env.local scripts/setup-algolia-products.ts
 */
import { algoliasearch } from 'algoliasearch'

const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
)

const indexName = process.env.ALGOLIA_PRODUCTS_INDEX ?? 'sv_products'

async function main() {
  // 1. Configure primary index with replicas
  await client.setSettings({
    indexName,
    indexSettings: {
      searchableAttributes: ['name', 'brand_name', 'description', 'category_names', 'certification_names', 'ingredient_names'],
      attributesForFaceting: ['searchable(brand_name)', 'searchable(category_names)', 'searchable(certification_names)', 'categories.lvl0', 'categories.lvl1', 'categories.lvl2', 'filterOnly(price)'],
      customRanking: ['desc(created_at)'],
      attributesToSnippet: ['description:20'],
      replicas: [
        `${indexName}_price_asc`,
        `${indexName}_price_desc`,
        `${indexName}_newest`,
      ],
    },
  })
  console.log(`✓ Configured primary index: ${indexName} (with replicas)`)

  // 2. Configure replica: Price Low to High
  await client.setSettings({
    indexName: `${indexName}_price_asc`,
    indexSettings: {
      ranking: ['asc(price)', 'typo', 'geo', 'words', 'filters', 'proximity', 'attribute', 'exact', 'custom'],
      attributesForFaceting: ['searchable(brand_name)', 'searchable(category_names)', 'searchable(certification_names)', 'categories.lvl0', 'categories.lvl1', 'categories.lvl2', 'filterOnly(price)'],
    },
  })
  console.log(`✓ Configured replica: ${indexName}_price_asc`)

  // 3. Configure replica: Price High to Low
  await client.setSettings({
    indexName: `${indexName}_price_desc`,
    indexSettings: {
      ranking: ['desc(price)', 'typo', 'geo', 'words', 'filters', 'proximity', 'attribute', 'exact', 'custom'],
      attributesForFaceting: ['searchable(brand_name)', 'searchable(category_names)', 'searchable(certification_names)', 'categories.lvl0', 'categories.lvl1', 'categories.lvl2', 'filterOnly(price)'],
    },
  })
  console.log(`✓ Configured replica: ${indexName}_price_desc`)

  // 4. Configure replica: Newest First
  await client.setSettings({
    indexName: `${indexName}_newest`,
    indexSettings: {
      ranking: ['desc(created_at)', 'typo', 'geo', 'words', 'filters', 'proximity', 'attribute', 'exact', 'custom'],
      attributesForFaceting: ['searchable(brand_name)', 'searchable(category_names)', 'searchable(certification_names)', 'categories.lvl0', 'categories.lvl1', 'categories.lvl2', 'filterOnly(price)'],
    },
  })
  console.log(`✓ Configured replica: ${indexName}_newest`)

  console.log('\n✓ All done! Replicas will sync data from the primary index automatically.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
