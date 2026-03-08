import Link from 'next/link'
import Image from 'next/image'
import { ArrowUp, MessageSquare } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { ForumPost } from '@/types'

interface Props {
  post: ForumPost | any
}

export function PostCard({ post }: Props) {
  const author = post.author as any
  const community = post.community as any

  return (
    <div className="group flex gap-3 rounded-xl border border-border bg-background p-4 hover:border-primary/30 transition-colors">
      {/* Vote count */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <ArrowUp className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold">{post.vote_count ?? 0}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
          {community && (
            <Link
              href={`/forum/c/${community.slug}`}
              className="font-medium text-foreground hover:text-primary"
            >
              {community.name}
            </Link>
          )}
          <span>·</span>
          <span>Posted by {author?.display_name ?? 'Anonymous'}</span>
          <span>·</span>
          <span>{formatRelativeTime(post.created_at)}</span>
        </div>

        <Link href={`/forum/${post.id}`}>
          <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>
          {post.body && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{post.body}</p>
          )}
        </Link>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <Link
            href={`/forum/${post.id}`}
            className="flex items-center gap-1 hover:text-foreground"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {post.comment_count ?? 0} comments
          </Link>
        </div>
      </div>
    </div>
  )
}
