import { algoliasearch } from 'algoliasearch'
const c = algoliasearch(process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? '', process.env.ALGOLIA_ADMIN_KEY ?? '')

async function main() {
  // Search for a product we know has categories
  const res = await c.searchSingleIndex({
    indexName: 'sv_products',
    searchParams: {
      query: '',
      hitsPerPage: 3,
      filters: 'category_names:Skincare',
      attributesToRetrieve: ['name', 'categories.lvl0', 'categories.lvl1', 'category_names']
    }
  })
  for (const hit of res.hits) {
    console.log({
      name: (hit as any).name,
      lvl0: (hit as any)['categories.lvl0'],
      lvl1: (hit as any)['categories.lvl1'],
      category_names: (hit as any).category_names,
    })
  }
}

main().then(() => process.exit(0))
