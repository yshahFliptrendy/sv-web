import { createClient } from '@/lib/supabase/server'
import { ArticleEditor } from '@/components/admin/ArticleEditor'

export default async function NewArticlePage() {
  const supabase = await createClient()

  const [{ data: tags }, { data: products }] = await Promise.all([
    supabase.from('tags').select('id, slug, name').order('name'),
    supabase
      .from('products')
      .select('id, name, brand:brands(name)')
      .eq('status', 'published')
      .order('name')
      .limit(200),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Article</h1>
      <ArticleEditor
        mode="create"
        availableTags={tags ?? []}
        availableProducts={(products ?? []) as any}
      />
    </div>
  )
}
