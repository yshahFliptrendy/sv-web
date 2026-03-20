import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '')

async function main() {
  const { data } = await s.rpc('', {}).maybeSingle()  // won't use this

  // Get all distinct statuses and counts
  const statuses = ['published', 'draft', 'inactive', 'archived', 'deleted']
  for (const status of statuses) {
    const { count } = await s.from('products').select('id', { count: 'exact', head: true }).eq('status', status)
    if (count && count > 0) console.log(`${status}: ${count}`)
  }

  // Total
  const { count: total } = await s.from('products').select('id', { count: 'exact', head: true })
  console.log(`\nTotal: ${total}`)
}

main().then(() => process.exit(0))
