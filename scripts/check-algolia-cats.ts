import { algoliasearch } from 'algoliasearch'
const c = algoliasearch(process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? '', process.env.ALGOLIA_ADMIN_KEY ?? '')

async function main() {
  const res = await c.searchSingleIndex({
    indexName: 'sv_products',
    searchParams: {
      query: '',
      hitsPerPage: 5,
      facets: ['categories.lvl0', 'categories.lvl1', 'category_names'],
      attributesToRetrieve: ['name', 'categories.lvl0', 'categories.lvl1', 'category_names']
    }
  })
  console.log('Total hits:', res.nbHits)
  console.log('\ncategories.lvl0 facets:', res.facets?.['categories.lvl0'])
  console.log('\ncategories.lvl1 facets:', res.facets?.['categories.lvl1'])
  console.log('\ncategory_names facets:', res.facets?.['category_names'])
  console.log('\nSample hit:', JSON.stringify(res.hits[0], null, 2))
}

main().then(() => process.exit(0))
