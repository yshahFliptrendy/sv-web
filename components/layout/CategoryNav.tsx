import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'

const FALLBACK_CATEGORIES = [
  { slug: 'beauty', name: 'Beauty' },
  { slug: 'home', name: 'Home' },
  { slug: 'fashion', name: 'Fashion' },
  { slug: 'supplements', name: 'Supplements' },
  { slug: 'pets', name: 'Pet Care' },
  { slug: 'cleaning', name: 'Cleaning' },
  { slug: 'baby', name: 'Baby' },
]

const getCategories = unstable_cache(
  async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('categories')
      .select('slug, name')
      .is('parent_id', null)
      .eq('is_active', true)
      .neq('slug', 'other')
      .order('sort_order')
      .limit(10)
    return data
  },
  ['category-nav'],
  { revalidate: 3600, tags: ['categories'] }
)

export async function CategoryNav() {
  const categories = await getCategories()
  const items = categories?.length ? categories : FALLBACK_CATEGORIES

  return (
    <div className="border-b border-border bg-background">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide">
          <Link
            href="/products"
            className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
          >
            All
          </Link>
          {items.map((cat) => (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="shrink-0 rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
