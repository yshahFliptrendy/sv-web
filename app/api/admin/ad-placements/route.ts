import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { supabase, user, error: 'Forbidden' }
  return { supabase, user, error: null }
}

export async function GET() {
  const { supabase, error } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 })

  const { data } = await supabase
    .from('ad_placements')
    .select('*, category:categories(id, name, slug), article:articles(id, title, slug)')
    .order('sort_order')

  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 })

  try {
    const body = await request.json()
    const { name, placement, image_url, link_url, alt_text, category_id, article_id, is_active, start_date, end_date, sort_order } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!article_id && (!image_url || !link_url)) {
      return NextResponse.json({ error: 'Banner placements require image URL and link URL' }, { status: 400 })
    }

    const { data, error: dbError } = await supabase
      .from('ad_placements')
      .insert({
        name,
        placement: placement ?? 'category_sidebar',
        image_url: image_url || null,
        link_url: link_url || null,
        alt_text: alt_text ?? '',
        category_id: category_id || null,
        article_id: article_id || null,
        is_active: is_active ?? true,
        start_date: start_date || null,
        end_date: end_date || null,
        sort_order: sort_order ?? 0,
      })
      .select('id')
      .single()

    if (dbError) throw dbError

    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create' }, { status: 500 })
  }
}
