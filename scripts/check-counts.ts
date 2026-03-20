import { createClient } from '@supabase/supabase-js'

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
)

async function main() {
  const { count: published } = await s.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published')
  const { count: draft } = await s.from('products').select('id', { count: 'exact', head: true }).eq('status', 'draft')
  const { count: total } = await s.from('products').select('id', { count: 'exact', head: true })
  console.log(`Total: ${total}, Published: ${published}, Draft: ${draft}`)
}

main().then(() => process.exit(0))
