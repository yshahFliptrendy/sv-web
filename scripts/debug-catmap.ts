import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '')

async function main() {
  // Get a published product that has categories
  const { data: sample } = await s.from('product_categories')
    .select('product_id, category_id, product:products(status), category:categories(name, parent_id)')
    .limit(5)
  console.log('Sample product_categories:', JSON.stringify(sample, null, 2))

  // Check how many products have categories
  const { count } = await s.from('product_categories')
    .select('product_id', { count: 'exact', head: true })
  console.log('\nTotal product_category mappings:', count)

  // Check how many published products have categories
  const { data: pubWithCats } = await s.rpc('', {}).maybeSingle() // skip rpc

  // Manual check: get some published product IDs and see if they're in prodCatMap
  const { data: pubProducts } = await s.from('products').select('id').eq('status', 'published').limit(5)
  for (const p of pubProducts ?? []) {
    const { data: cats } = await s.from('product_categories').select('category_id, category:categories(name, parent_id)').eq('product_id', p.id)
    console.log(`Product ${p.id}: ${cats?.length} categories`, cats?.map((c: any) => `${c.category?.name} (parent: ${c.category?.parent_id})`))
  }
}

main().then(() => process.exit(0))
