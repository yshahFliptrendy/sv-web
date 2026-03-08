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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, error } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 })

  const { id } = await params

  try {
    const body = await request.json()
    const {
      title, slug, excerpt, html_body, cover_image,
      status, published_at,
      seo_title, seo_description,
      tag_names,
      embedded_product_ids,
    } = body

    // Fetch current article to preserve published_at if already set
    const { data: existing } = await supabase
      .from('articles')
      .select('published_at, status')
      .eq('id', id)
      .single()

    let resolvedPublishedAt: string | null = existing?.published_at ?? null
    if (status === 'published' && !resolvedPublishedAt) {
      resolvedPublishedAt = new Date().toISOString()
    } else if (status === 'scheduled') {
      resolvedPublishedAt = published_at ?? resolvedPublishedAt
    } else if (status === 'draft') {
      resolvedPublishedAt = null
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
      status,
      published_at: resolvedPublishedAt,
    }
    if (title !== undefined) updates.title = title
    if (slug !== undefined) updates.slug = slug || slugify(title)
    if (excerpt !== undefined) updates.excerpt = excerpt || null
    if (html_body !== undefined) updates.body = html_body
    if (cover_image !== undefined) updates.cover_image = cover_image || null
    if (seo_title !== undefined) updates.seo_title = seo_title || null
    if (seo_description !== undefined) updates.seo_description = seo_description || null

    const { error: updateError } = await supabase
      .from('articles')
      .update(updates)
      .eq('id', id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    // Sync tags
    if (Array.isArray(tag_names)) {
      await syncTags(supabase, id, tag_names)
    }

    // Sync embedded products
    if (Array.isArray(embedded_product_ids)) {
      await syncEmbeddedProducts(supabase, id, embedded_product_ids)
    }

    // Sync with Algolia
    if (status === 'published' || status === 'scheduled') {
      await indexArticle({
        id,
        title: updates.title ?? title,
        slug: updates.slug ?? slug,
        excerpt: updates.excerpt,
        body: html_body || null,
        cover_image: updates.cover_image,
        published_at: resolvedPublishedAt,
        tag_names: Array.isArray(tag_names) ? tag_names : [],
      }).catch(() => {})
    } else {
      // draft → remove from index
      await deleteArticleFromIndex(id).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, error } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 })

  const { id } = await params
  const { error: deleteError } = await supabase.from('articles').delete().eq('id', id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  await deleteArticleFromIndex(id).catch(() => {})

  return NextResponse.json({ success: true })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function syncTags(supabase: any, articleId: string, tagNames: string[]) {
  const tagIds: string[] = []
  for (const name of tagNames) {
    const { data } = await supabase
      .from('tags')
      .upsert({ name, slug: slugify(name) }, { onConflict: 'slug' })
      .select('id')
      .single()
    if (data?.id) tagIds.push(data.id)
  }
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
