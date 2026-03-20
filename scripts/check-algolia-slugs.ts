import { algoliasearch } from 'algoliasearch'

const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? '',
  process.env.ALGOLIA_ADMIN_KEY ?? ''
)

async function main() {
  const res = await client.searchSingleIndex({
    indexName: 'sv_products',
    searchParams: { query: '', hitsPerPage: 5, attributesToRetrieve: ['slug', 'name'] }
  })
  console.log('Algolia hits:')
  for (const hit of res.hits) {
    console.log(`  slug: "${(hit as any).slug}" | name: "${(hit as any).name}"`)
  }
}

main().then(() => process.exit(0))
