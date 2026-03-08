import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VoteButton } from '@/components/forum/VoteButton'
import { CommentThread } from '@/components/forum/CommentThread'
import { formatDate } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: post } = await supabase
    .from('forum_posts')
    .select('title')
    .eq('id', id)
    .single()

  return { title: post?.title ?? 'Forum Post' }
}

export default async function ForumPostPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: post }, { data: comments }, { data: { user } }] = await Promise.all([
    supabase
      .from('forum_posts')
      .select('*, author:profiles(id, display_name, avatar_url), community:forum_communities(id, slug, name)')
      .eq('id', id)
      .single(),
    supabase
      .from('forum_comments')
      .select('*, author:profiles(id, display_name, avatar_url)')
      .eq('post_id', id)
      .is('parent_id', null)
      .order('vote_count', { ascending: false }),
    supabase.auth.getUser(),
  ])

  if (!post) notFound()

  const author = (post as any).author
  const community = (post as any).community

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/forum" className="hover:text-foreground">Forum</Link>
        {community && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/forum/c/${community.slug}`} className="hover:text-foreground">
              {community.name}
            </Link>
          </>
        )}
      </nav>

      {/* Post */}
      <div className="rounded-xl border border-border p-6 mb-6">
        <div className="flex gap-4">
          {/* Vote */}
          <VoteButton
            type="post"
            id={post.id}
            count={(post as any).vote_count}
            userVote={0}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold mb-3">{post.title}</h1>
            <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
              {author?.avatar_url && (
                <Image src={author.avatar_url} alt="" width={20} height={20} className="rounded-full" />
              )}
              <span>{author?.display_name ?? 'Anonymous'}</span>
              <span>·</span>
              <span>{formatDate((post as any).created_at)}</span>
            </div>
            <div className="prose prose-neutral max-w-none text-sm">
              <p>{(post as any).body}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comments */}
      <CommentThread
        postId={post.id}
        comments={(comments ?? []) as any}
        currentUserId={user?.id}
      />
    </div>
  )
}
