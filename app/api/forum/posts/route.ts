import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { forumPostSchema } from '@/lib/validations'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const limiter = rateLimit({ key: 'forum-posts', limit: 10, windowMs: 60 * 60 * 1000 })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await limiter.check(user.id)
  if (!rl.success) return rateLimitResponse(rl.retryAfter)

  try {
    const body = await request.json()
    const { title, body: postBody, community_id } = forumPostSchema.parse(body)

    const { data, error } = await supabase
      .from('forum_posts')
      .insert({ title, body: postBody, community_id, author_id: user.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
