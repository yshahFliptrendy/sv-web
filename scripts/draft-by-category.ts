import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '')

async function main() {
  // Get all categories
  const { data: categories } = await s.from('categories').select('id, name, parent_id').order('name')

  // Get all draft product IDs
  const PAGE_SIZE = 1000
  let draftIds: string[] = []
  let offset = 0
  while (true) {
    const { data } = await s.from('products').select('id').eq('status', 'draft').range(offset, offset + PAGE_SIZE - 1).order('id')
    if (!data || data.length === 0) break
    draftIds = draftIds.concat(data.map(p => p.id))
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  console.log(`Total draft products: ${draftIds.length}\n`)

  // Get product_categories for draft products
  let pcMappings: any[] = []
  offset = 0
  while (true) {
    const { data } = await s.from('product_categories').select('product_id, category_id').in('product_id', draftIds.slice(offset, offset + PAGE_SIZE)).order('product_id')
    if (!data || data.length === 0) { offset += PAGE_SIZE; if (offset >= draftIds.length) break; continue }
    pcMappings = pcMappings.concat(data)
    offset += PAGE_SIZE
    if (offset >= draftIds.length) break
  }

  // Count by category
  const catCounts = new Map<string, number>()
  for (const pc of pcMappings) {
    catCounts.set(pc.category_id, (catCounts.get(pc.category_id) ?? 0) + 1)
  }

  // Build parent lookup
  const catMap = new Map<string, { name: string; parent_id: string | null }>()
  for (const c of categories ?? []) {
    catMap.set(c.id, { name: c.name, parent_id: c.parent_id })
  }

  // Group by parent category
  const parentCounts = new Map<string, { total: number; subs: Map<string, number> }>()
  for (const [catId, count] of catCounts) {
    const cat = catMap.get(catId)
    if (!cat) continue

    let parentName: string
    let subName: string | null = null

    if (cat.parent_id) {
      const parent = catMap.get(cat.parent_id)
      parentName = parent?.name ?? 'Unknown'
      subName = cat.name
    } else {
      parentName = cat.name
    }

    if (!parentCounts.has(parentName)) {
      parentCounts.set(parentName, { total: 0, subs: new Map() })
    }
    const entry = parentCounts.get(parentName)!
    entry.total += count
    if (subName) {
      entry.subs.set(subName, (entry.subs.get(subName) ?? 0) + count)
    }
  }

  // Sort and print
  const sorted = [...parentCounts.entries()].sort((a, b) => b[1].total - a[1].total)
  for (const [parent, { total, subs }] of sorted) {
    console.log(`${parent}: ${total}`)
    const sortedSubs = [...subs.entries()].sort((a, b) => b[1] - a[1])
    for (const [sub, count] of sortedSubs) {
      console.log(`  └ ${sub}: ${count}`)
    }
  }
}

main().then(() => process.exit(0))
