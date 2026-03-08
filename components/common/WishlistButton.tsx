'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface Props {
  productId: string
  size?: 'sm' | 'default'
}

export function WishlistButton({ productId, size = 'default' }: Props) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      // Check if already in wishlist
      supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle()
        .then(({ data }) => setSaved(!!data))
    })
  }, [productId])

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!userId) {
      window.location.href = `/login?next=/wishlist`
      return
    }

    setLoading(true)
    const method = saved ? 'DELETE' : 'POST'
    setSaved(!saved) // optimistic

    try {
      await fetch('/api/wishlist', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId }),
      })
    } catch {
      setSaved(saved) // revert
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      className={cn(
        'flex items-center justify-center rounded-full bg-background border border-border shadow-sm hover:border-primary transition-colors disabled:opacity-50',
        size === 'sm' ? 'h-7 w-7' : 'h-10 w-10'
      )}
    >
      <Heart
        className={cn(
          'transition-colors',
          size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5',
          saved ? 'fill-primary stroke-primary' : 'stroke-muted-foreground'
        )}
      />
    </button>
  )
}
