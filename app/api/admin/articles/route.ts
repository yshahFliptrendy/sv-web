import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import { indexArticle, deleteArticleFromIndex } from '@/lib/algolia/syncArticle'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { supabase, user, error: 'Forbidden' }
  return { supabase, user, error: null }
}

export async function POST(request: Request) {
  const { supabase, user, error } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 })

  try {
    const body = await request.json()
    const {
      title, slug, excerpt, html_body, cover_image,
      status, published_at,
      seo_title, seo_description,
      tag_names = [],
      embedded_product_ids = [],
    } = body

    // Build published_at value
    let resolvedPublishedAt: string | null = null
    if (status === 'published') {
      resolvedPublishedAt = published_at ?? new Date().toISOString()
    } else if (status === 'scheduled') {
      resolvedPublishedAt = published_at ?? null
    }

    const { data: article, error: insertError } = await supabase
      .from('articles')
      .insert({
        title,
        slug: slug || slugify(title),
        excerpt: excerpt || null,
        body: html_body || '',
        cover_image: cover_image || null,
        author_id: user!.id,
        status,
        published_at: resolvedPublishedAt,
        seo_title: seo_title || null,
        seo_description: seo_description || null,
      })
      .select('id, slug')
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    // Sync tags
    if (tag_names.length > 0) {
      await syncTags(supabase, article.id, tag_names)
    }

    // Sync embedded products
    if (embedded_product_ids.length > 0) {
      await syncEmbeddedProducts(supabase, article.id, embedded_product_ids)
    }

    // Index in Algolia if published or scheduled
    if (status === 'published' || status === 'scheduled') {
      await indexArticle({
        id: article.id,
        title,
        slug: article.slug,
        excerpt: excerpt || null,
        body: html_body || null,
        cover_image: cover_image || null,
        published_at: resolvedPublishedAt,
        tag_names,
      }).catch(() => {}) // non-fatal
    }

    return NextResponse.json({ id: article.id, slug: article.slug }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 })
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function syncTags(supabase: any, articleId: string, tagNames: string[]) {
  // Upsert tags by name, get ids
  const tagIds: string[] = []
  for (const name of tagNames) {
    const slug = slugify(name)
    const { data } = await supabase
      .from('tags')
      .upsert({ name, slug }, { onConflict: 'slug' })
      .select('id')
      .single()
    if (data?.id) tagIds.push(data.id)
  }

  // Delete existing article_tags and reinsert
  await supabase.from('article_tags').delete().eq('article_id', articleId)
  if (tagIds.length > 0) {
    await supabase.from('article_tags').insert(
      tagIds.map((tag_id) => ({ article_id: articleId, tag_id }))
    )
  }
}

async function syncEmbeddedProducts(supabase: any, articleId: string, productIds: string[]) {
  await supabase.from('article_products').delete().eq('article_id', articleId)
  if (productIds.length > 0) {
    await supabase.from('article_products').insert(
      productIds.map((product_id, i) => ({ article_id: articleId, product_id, sort_order: i }))
    )
  }
}
