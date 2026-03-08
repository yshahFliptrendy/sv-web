import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PostCard } from '@/components/forum/PostCard'
import { MessageSquare, Plus } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Vegan Community Forum',
  description: 'Join the ShoppingVegan community. Discuss products, share tips, and connect with other vegans.',
}

export default async function ForumPage() {
  const supabase = await createClient()

  const [{ data: communities }, { data: posts }] = await Promise.all([
    supabase.from('forum_communities').select('*').order('name'),
    supabase
      .from('forum_posts')
      .select('*, author:profiles(id, display_name, avatar_url), community:forum_communities(id, slug, name)')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Community</h1>
          <p className="text-muted-foreground mt-1">Connect with the vegan community</p>
        </div>
        <Link
          href="/forum/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Post
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar: Communities */}
        <aside className="lg:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Communities
          </h2>
          <nav className="space-y-1">
            <Link
              href="/forum"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-primary/10 text-primary"
            >
              <MessageSquare className="h-4 w-4" />
              All Posts
            </Link>
            {(communities ?? []).map((community) => (
              <Link
                key={community.id}
                href={`/forum/c/${community.slug}`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                {community.name}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main: Posts feed */}
        <div className="lg:col-span-3 space-y-3">
          {(posts ?? []).map((post) => (
            <PostCard key={post.id} post={post as any} />
          ))}
          {(!posts || posts.length === 0) && (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
              No posts yet. Be the first to start a discussion!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
