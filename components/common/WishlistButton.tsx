'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWishlist } from './WishlistProvider'

interface Props {
  productId: string
  size?: 'sm' | 'default'
}

export function WishlistButton({ productId, size = 'default' }: Props) {
  const { savedIds, toggle } = useWishlist()
  const [loading, setLoading] = useState(false)
  const saved = savedIds.has(productId)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    try {
      await toggle(productId)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      className={cn(
        'flex items-center justify-center rounded-full bg-background border border-border shadow-sm hover:border-primary transition-colors disabled:opacity-50',
        size === 'sm' ? 'h-9 w-9' : 'h-10 w-10'
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
