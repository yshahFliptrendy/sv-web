import { getAdminClient, ARTICLES_INDEX } from './client'

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000)
}

interface ArticleIndexRecord {
  objectID: string
  title: string
  slug: string
  excerpt: string | null
  body_text: string
  cover_image: string | null
  published_at: number | null
  tags: string[]
  author_name: string
}

export async function indexArticle(article: {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  body?: string | null
  cover_image?: string | null
  published_at?: string | null
  tag_names?: string[]
  author_name?: string
}) {
  const client = getAdminClient()
  const record: ArticleIndexRecord = {
    objectID: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt ?? null,
    body_text: article.body ? stripHtml(article.body) : '',
    cover_image: article.cover_image ?? null,
    published_at: article.published_at
      ? Math.floor(new Date(article.published_at).getTime() / 1000)
      : null,
    tags: article.tag_names ?? [],
    author_name: article.author_name ?? 'ShoppingVegan',
  }
  await client.saveObject({ indexName: ARTICLES_INDEX, body: record })
}

export async function deleteArticleFromIndex(articleId: string) {
  const client = getAdminClient()
  await client.deleteObject({ indexName: ARTICLES_INDEX, objectID: articleId })
}
