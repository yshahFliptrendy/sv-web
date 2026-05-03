import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const limiter = rateLimit({ key: 'wishlist', limit: 60, windowMs: 60 * 60 * 1000 })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await limiter.check(user.id)
  if (!rl.success) return rateLimitResponse(rl.retryAfter)

  const { product_id } = await request.json()
  if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 })

  const { error } = await supabase
    .from('wishlists')
    .insert({ user_id: user.id, product_id })

  if (error?.code === '23505') {
    return NextResponse.json({ status: 'already_saved' })
  }
  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })

  return NextResponse.json({ status: 'saved' })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await limiter.check(user.id)
  if (!rl.success) return rateLimitResponse(rl.retryAfter)

  const { product_id } = await request.json()
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('user_id', user.id)
    .eq('product_id', product_id)

  if (error) return NextResponse.json({ error: 'Failed to remove' }, { status: 500 })
  return NextResponse.json({ status: 'removed' })
}
