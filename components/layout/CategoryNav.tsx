import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const FALLBACK_CATEGORIES = [
  { slug: 'food', name: 'Food & Drink' },
  { slug: 'beauty', name: 'Beauty' },
  { slug: 'home', name: 'Home' },
  { slug: 'fashion', name: 'Fashion' },
  { slug: 'supplements', name: 'Supplements' },
  { slug: 'pets', name: 'Pet Care' },
  { slug: 'cleaning', name: 'Cleaning' },
  { slug: 'baby', name: 'Baby' },
]

export async function CategoryNav() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('slug, name')
    .is('parent_id', null)
    .order('sort_order')
    .limit(10)

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
