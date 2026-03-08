import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArticleEditor } from '@/components/admin/ArticleEditor'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: article }, { data: tags }, { data: products }] = await Promise.all([
    supabase
      .from('articles')
      .select(`
        *,
        article_tags(tag:tags(id, slug, name)),
        article_products(product_id, sort_order, product:products(id, name, brand:brands(name)))
      `)
      .eq('id', id)
      .single(),
    supabase.from('tags').select('id, slug, name').order('name'),
    supabase
      .from('products')
      .select('id, name, brand:brands(name)')
      .eq('status', 'published')
      .order('name')
      .limit(200),
  ])

  if (!article) notFound()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Article</h1>
      <ArticleEditor
        mode="edit"
        article={article as any}
        availableTags={tags ?? []}
        availableProducts={(products ?? []) as any}
      />
    </div>
  )
}
