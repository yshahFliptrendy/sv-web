import { createClient } from '@supabase/supabase-js'

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
)

async function main() {
  const { data } = await s.from('products').select('slug').eq('status', 'published').limit(5)
  console.log('DB slugs:', data)

  // Try fetching one product page
  if (data && data[0]) {
    const slug = data[0].slug
    console.log(`\nTesting /products/${slug}`)
    const res = await fetch(`http://localhost:3000/products/${slug}`)
    console.log('Status:', res.status)
  }
}

main().then(() => process.exit(0))
