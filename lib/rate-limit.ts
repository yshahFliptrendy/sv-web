import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

interface RateLimitEntry {
  count: number
  resetTime: number
}

const stores = new Map<string, Map<string, RateLimitEntry>>()

// Clean expired entries every 5 minutes
let lastCleanup = Date.now()
function cleanup(store: Map<string, RateLimitEntry>) {
  const now = Date.now()
  if (now - lastCleanup < 300_000) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetTime) store.delete(key)
  }
}

export function rateLimit(options: { key: string; limit: number; windowMs: number }) {
  const { key, limit, windowMs } = options

  if (!stores.has(key)) stores.set(key, new Map())
  const store = stores.get(key)!
  cleanup(store)

  return {
    async check(identifier?: string): Promise<{ success: boolean; remaining: number; retryAfter: number }> {
      const headersList = await headers()
      const id = identifier ?? headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
      const now = Date.now()
      const entry = store.get(id)

      if (!entry || now > entry.resetTime) {
        store.set(id, { count: 1, resetTime: now + windowMs })
        return { success: true, remaining: limit - 1, retryAfter: 0 }
      }

      if (entry.count >= limit) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
        return { success: false, remaining: 0, retryAfter }
      }

      entry.count++
      return { success: true, remaining: limit - entry.count, retryAfter: 0 }
    },
  }
}

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )
}
