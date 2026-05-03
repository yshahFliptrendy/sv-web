/**
 * List all top-level categories and their is_active status.
 * Run with: npx tsx --env-file=.env.local scripts/check-category-active.ts
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data, error } = await sb
    .from('categories')
    .select('slug, name, parent_id, is_active')
    .is('parent_id', null)
    .order('sort_order')

  if (error) throw error

  console.log('Top-level categories:')
  for (const c of data ?? []) {
    console.log(`  ${c.is_active ? '✓' : '✗'}  ${c.name.padEnd(20)} (${c.slug})`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
