/**
 * Bulk reindex all published/scheduled articles from Supabase into Algolia.
 * Run with: npx tsx --env-file=.env.local scripts/reindex-articles.ts
 */
import { createClient } from '@supabase/supabase-js'
import { algoliasearch } from 'algoliasearch'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const algolia = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
)

const indexName = process.env.ALGOLIA_ARTICLES_INDEX ?? 'sv_articles'

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000)
}

async function main() {
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, body, cover_image, published_at, status, author:profiles(display_name)')
    .in('status', ['published', 'scheduled'])
    .order('published_at', { ascending: false })

  if (error) throw error
  if (!articles || articles.length === 0) {
    console.log('No published articles found.')
    return
  }

  const records = articles.map((a: any) => ({
    objectID: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt ?? null,
    body_text: a.body ? stripHtml(a.body) : '',
    cover_image: a.cover_image ?? null,
    published_at: a.published_at ? Math.floor(new Date(a.published_at).getTime() / 1000) : null,
    tags: [],
    author_name: a.author?.display_name ?? 'ShoppingVegan',
  }))

  // Fetch tags for each article
  const { data: articleTags } = await supabase
    .from('article_tags')
    .select('article_id, tag:tags(name)')
    .in('article_id', articles.map((a: any) => a.id))

  if (articleTags) {
    for (const at of articleTags as any[]) {
      const record = records.find((r) => r.objectID === at.article_id)
      if (record && at.tag?.name) record.tags.push(at.tag.name)
    }
  }

  await algolia.saveObjects({ indexName, objects: records })
  console.log(`✓ Reindexed ${records.length} articles into ${indexName}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
