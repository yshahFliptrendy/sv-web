import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'

export async function GET() {
  const supabase = await createClient()
  const { data: tags } = await supabase.from('tags').select('id, slug, name').order('name')
  return NextResponse.json(tags ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const slug = slugify(name.trim())
  const { data, error } = await supabase
    .from('tags')
    .upsert({ name: name.trim(), slug }, { onConflict: 'slug' })
    .select('id, slug, name')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
