import { algoliasearch } from 'algoliasearch'
import { liteClient } from 'algoliasearch/lite'

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!
const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!

// Browser-safe search client (lite — no admin operations)
// Wrapped to suppress AbortError "Lock broken by steal" from concurrent InstantSearch requests
const baseClient = liteClient(appId, searchKey)
export const searchClient = {
  ...baseClient,
  search: async (...args: Parameters<typeof baseClient.search>) => {
    try {
      return await baseClient.search(...args)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { results: [] }
      }
      throw err
    }
  },
}

// Server-side admin client (for indexing)
export function getAdminClient() {
  return algoliasearch(appId, process.env.ALGOLIA_ADMIN_KEY!)
}

export const PRODUCTS_INDEX = process.env.ALGOLIA_PRODUCTS_INDEX ?? 'sv_products'
export const ARTICLES_INDEX = process.env.ALGOLIA_ARTICLES_INDEX ?? 'sv_articles'
