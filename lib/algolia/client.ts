import { algoliasearch } from 'algoliasearch'
import { liteClient } from 'algoliasearch/lite'

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!
const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!

// Browser-safe search client (lite — no admin operations)
export const searchClient = liteClient(appId, searchKey)

// Server-side admin client (for indexing)
export function getAdminClient() {
  return algoliasearch(appId, process.env.ALGOLIA_ADMIN_KEY!)
}

export const PRODUCTS_INDEX = process.env.ALGOLIA_PRODUCTS_INDEX ?? 'sv_products'
export const ARTICLES_INDEX = process.env.ALGOLIA_ARTICLES_INDEX ?? 'sv_articles'
