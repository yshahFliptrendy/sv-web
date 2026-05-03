import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const limiter = rateLimit({ key: 'forum-votes', limit: 60, windowMs: 60 * 60 * 1000 })

const voteSchema = z.object({
  post_id: z.string().uuid().optional(),
  comment_id: z.string().uuid().optional(),
  value: z.union([z.literal(1), z.literal(-1)]),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await limiter.check(user.id)
  if (!rl.success) return rateLimitResponse(rl.retryAfter)

  try {
    const body = await request.json()
    const { post_id, comment_id, value } = voteSchema.parse(body)

    if (!post_id && !comment_id) {
      return NextResponse.json({ error: 'post_id or comment_id required' }, { status: 400 })
    }

    // Upsert vote
    const { error } = await supabase.from('forum_votes').upsert(
      { user_id: user.id, post_id: post_id ?? null, comment_id: comment_id ?? null, value },
      { onConflict: post_id ? 'user_id,post_id' : 'user_id,comment_id' }
    )

    if (error) return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 })
    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
