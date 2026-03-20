import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '')

async function main() {
  // Check DB
  const { data: dbProduct } = await s.from('products').select('slug, status').eq('slug', 'www-wonderblush-com-la-lumiere').single()
  console.log('DB:', dbProduct)

  // Check without status filter
  const { data: noFilter } = await s.from('products').select('slug, status').ilike('slug', '%wonderblush%la-lumiere%').limit(3)
  console.log('Like:', noFilter)
}

main().then(() => process.exit(0))
