import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // All categories
  const { data: cats } = await sb.from('categories').select('id, slug, name, parent_id').order('name')
  console.log('=== ALL CATEGORIES ===')
  cats?.forEach(c => console.log(`  ${c.slug} ${c.parent_id ? '(sub)' : '(TOP)'} - ${c.name} - ${c.id}`))

  // product_categories count
  const { count } = await sb.from('product_categories').select('*', { count: 'exact', head: true })
  console.log(`\n=== PRODUCT_CATEGORIES total rows: ${count}`)

  // Sample links
  const { data: sample } = await sb.from('product_categories').select('product_id, category_id').limit(5)
  console.log('Sample:', JSON.stringify(sample, null, 2))

  // Find eyes-related categories
  const { data: eyes } = await sb.from('categories').select('id, slug, name').ilike('name', '%eye%')
  console.log(`\n=== "Eye" categories:`, eyes)

  if (eyes?.length) {
    for (const eye of eyes) {
      const { data: subs } = await sb.from('categories').select('id, slug').eq('parent_id', eye.id)
      const allIds = [eye.id, ...(subs?.map(s => s.id) ?? [])]
      const { data: links } = await sb.from('product_categories').select('product_id').in('category_id', allIds)
      console.log(`  "${eye.name}" (${eye.slug}): ${subs?.length ?? 0} subcats, ${links?.length ?? 0} products`)
    }
  }
}

main().catch(console.error)