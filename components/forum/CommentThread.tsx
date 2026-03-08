'use client'

import { useState } from 'react'
import Image from 'next/image'
import { VoteButton } from './VoteButton'
import { formatRelativeTime } from '@/lib/utils'
import type { ForumComment } from '@/types'
import Link from 'next/link'

interface Props {
  postId: string
  comments: ForumComment[]
  currentUserId?: string
}

export function CommentThread({ postId, comments, currentUserId }: Props) {
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim()) return
    setSubmitting(true)
    try {
      await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, body: newComment }),
      })
      setNewComment('')
      window.location.reload()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
      </h2>

      {/* Comment form */}
      {currentUserId ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts…"
            rows={3}
            className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? 'Posting…' : 'Comment'}
          </button>
        </form>
      ) : (
        <p className="mb-6 text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">Sign in</Link> to leave a comment.
        </p>
      )}

      {/* Comment list */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} currentUserId={currentUserId} />
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">No comments yet. Start the discussion!</p>
        )}
      </div>
    </div>
  )
}

function CommentItem({ comment, currentUserId, depth = 0 }: {
  comment: ForumComment | any
  currentUserId?: string
  depth?: number
}) {
  const author = (comment as any).author
  const [showReply, setShowReply] = useState(false)

  return (
    <div className={depth > 0 ? 'ml-8 border-l border-border pl-4' : ''}>
      <div className="flex gap-3">
        <VoteButton
          type="comment"
          id={comment.id}
          count={comment.vote_count ?? 0}
          userVote={comment.user_vote ?? 0}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {author?.avatar_url && (
              <Image src={author.avatar_url} alt="" width={18} height={18} className="rounded-full" />
            )}
            <span className="text-xs font-medium">{author?.display_name ?? 'Anonymous'}</span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.created_at)}
            </span>
          </div>
          <p className="text-sm">{comment.body}</p>
          {currentUserId && depth < 2 && (
            <button
              onClick={() => setShowReply(!showReply)}
              className="mt-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Reply
            </button>
          )}
        </div>
      </div>
      {comment.replies?.map((reply: any) => (
        <CommentItem key={reply.id} comment={reply} currentUserId={currentUserId} depth={depth + 1} />
      ))}
    </div>
  )
}
