import { createClient } from '@supabase/supabase-js'

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
)

async function main() {
  const { data } = await s.from('products').select('slug').eq('slug', 'www-mykitsch-com-blush-contour-pillow-eye-mask').single()
  console.log('Exact match:', data)

  const { data: like } = await s.from('products').select('slug').ilike('slug', '%blush-contour-pillow-eye-mask%').limit(3)
  console.log('Like match:', like)
}

main().then(() => process.exit(0))
