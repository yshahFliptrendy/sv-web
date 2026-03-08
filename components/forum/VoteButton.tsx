'use client'

import { useState } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  type: 'post' | 'comment'
  id: string
  count: number
  userVote: number  // 1 | -1 | 0
}

export function VoteButton({ type, id, count: initialCount, userVote: initialVote }: Props) {
  const [count, setCount] = useState(initialCount)
  const [userVote, setUserVote] = useState(initialVote)
  const [loading, setLoading] = useState(false)

  async function vote(value: 1 | -1) {
    setLoading(true)
    const newVote = userVote === value ? 0 : value

    // Optimistic update
    setCount(count + newVote - userVote)
    setUserVote(newVote)

    try {
      await fetch('/api/forum/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [`${type}_id`]: id,
          value: newVote === 0 ? value : newVote,
        }),
      })
    } catch {
      // Revert on failure
      setCount(initialCount)
      setUserVote(initialVote)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <button
        onClick={() => vote(1)}
        disabled={loading}
        aria-label="Upvote"
        className={cn(
          'rounded p-1 transition-colors',
          userVote === 1
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
        )}
      >
        <ArrowUp className="h-4 w-4" />
      </button>
      <span className={cn('text-xs font-semibold', userVote !== 0 && 'text-primary')}>
        {count}
      </span>
      <button
        onClick={() => vote(-1)}
        disabled={loading}
        aria-label="Downvote"
        className={cn(
          'rounded p-1 transition-colors',
          userVote === -1
            ? 'text-destructive bg-destructive/10'
            : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
        )}
      >
        <ArrowDown className="h-4 w-4" />
      </button>
    </div>
  )
}
