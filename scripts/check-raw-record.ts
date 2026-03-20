import { algoliasearch } from 'algoliasearch'
const c = algoliasearch(process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? '', process.env.ALGOLIA_ADMIN_KEY ?? '')

async function main() {
  const res = await c.searchSingleIndex({
    indexName: 'sv_products',
    searchParams: {
      query: '',
      hitsPerPage: 1,
      filters: 'category_names:Skincare',
      attributesToRetrieve: ['*']
    }
  })
  const hit = res.hits[0] as any
  console.log('All keys:', Object.keys(hit))
  console.log('\ncategories:', hit.categories)
  console.log('categories.lvl0:', hit['categories.lvl0'])
}

main().then(() => process.exit(0))
