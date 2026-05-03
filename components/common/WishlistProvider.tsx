'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface WishlistContextValue {
  savedIds: Set<string>
  userId: string | null
  toggle: (productId: string) => Promise<void>
}

const WishlistContext = createContext<WishlistContextValue>({
  savedIds: new Set(),
  userId: null,
  toggle: async () => {},
})

export function useWishlist() {
  return useContext(WishlistContext)
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Use getSession() (reads cookie, no network call) instead of getUser()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return
      setUserId(session.user.id)
      supabase
        .from('wishlists')
        .select('product_id')
        .eq('user_id', session.user.id)
        .then(({ data }) => {
          if (data) {
            setSavedIds(new Set(data.map((row) => row.product_id)))
          }
        })
    })
  }, [])

  const toggle = useCallback(async (productId: string) => {
    if (!userId) {
      window.location.href = `/login?next=/wishlist`
      return
    }

    const isSaved = savedIds.has(productId)
    const method = isSaved ? 'DELETE' : 'POST'

    // Optimistic update
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (isSaved) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })

    try {
      await fetch('/api/wishlist', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId }),
      })
    } catch {
      // Revert on error
      setSavedIds((prev) => {
        const next = new Set(prev)
        if (isSaved) {
          next.add(productId)
        } else {
          next.delete(productId)
        }
        return next
      })
    }
  }, [userId, savedIds])

  return (
    <WishlistContext.Provider value={{ savedIds, userId, toggle }}>
      {children}
    </WishlistContext.Provider>
  )
}
