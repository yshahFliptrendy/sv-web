/**
 * One-time script to configure the sv_articles Algolia index.
 * Run with: npx tsx scripts/setup-algolia-articles.ts
 */
import { algoliasearch } from 'algoliasearch'

const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
)

const indexName = process.env.ALGOLIA_ARTICLES_INDEX ?? 'sv_articles'

async function main() {
  await client.setSettings({
    indexName,
    indexSettings: {
      searchableAttributes: ['title', 'excerpt', 'tags', 'body_text', 'author_name'],
      attributesForFaceting: ['searchable(tags)'],
      customRanking: ['desc(published_at)'],
      attributesToSnippet: ['excerpt:20'],
    },
  })
  console.log(`✓ Configured Algolia index: ${indexName}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
