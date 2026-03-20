import { algoliasearch } from 'algoliasearch'
const c = algoliasearch(process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? '', process.env.ALGOLIA_ADMIN_KEY ?? '')

async function main() {
  for (const idx of ['sv_products', 'sv_products_price_asc', 'sv_products_price_desc', 'sv_products_newest']) {
    await c.clearObjects({ indexName: idx })
    console.log(`Cleared: ${idx}`)
  }
}

main().then(() => process.exit(0))
