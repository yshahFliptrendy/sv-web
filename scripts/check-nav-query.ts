/**
 * Run the exact CategoryNav query with the anon key to see what the homepage gets.
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function main() {
  const { data, error } = await sb
    .from('categories')
    .select('slug, name, is_active')
    .is('parent_id', null)
    .eq('is_active', true)
    .neq('slug', 'other')
    .order('sort_order')
    .limit(10)

  if (error) console.error('Error:', error)
  console.log('Nav query result:', data)
}

main().catch(console.error)
