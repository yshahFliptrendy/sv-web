/**
 * One-shot cleanup: recompute product slugs from `${brand.slug}-${slugify(name)}`.
 *
 * Many products were imported with brand domains (e.g. "colourpop.com") leaking into
 * the slug — resulting in URLs like /products/colourpop-com-bring-the-heat-...
 * This script rewrites those slugs to the intended `<brand-slug>-<product-name>` form.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/fix-product-slugs.ts            # dry-run (default)
 *   npx tsx --env-file=.env.local scripts/fix-product-slugs.ts --apply    # write changes
 *
 * After --apply, run `npx tsx --env-file=.env.local scripts/reindex-products.ts`
 * to refresh Algolia with the new slugs.
 */
import { createClient } from '@supabase/supabase-js'
import { slugify } from '../lib/utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const APPLY = process.argv.includes('--apply')
const BATCH_SIZE = 500

type ProductRow = {
  id: string
  slug: string
  name: string
  brand_id: string
}

type BrandRow = {
  id: string
  slug: string
  name: string
}

async function main() {
  console.log(APPLY ? '→ APPLY mode (will write changes)' : '→ DRY RUN (no changes will be written)')
  console.log('')

  const { data: brands, error: brandErr } = await supabase
    .from('brands')
    .select('id, slug, name')
  if (brandErr) throw brandErr
  const brandById = new Map<string, BrandRow>((brands ?? []).map((b) => [b.id, b]))

  // Cursor-paginate through all products (not just published — cleanup should hit drafts too).
  const allProducts: ProductRow[] = []
  let lastId: string | null = null
  while (true) {
    let q = supabase
      .from('products')
      .select('id, slug, name, brand_id')
      .order('id', { ascending: true })
      .limit(BATCH_SIZE)
    if (lastId) q = q.gt('id', lastId)
    const { data, error } = await q
    if (error) throw error
    if (!data || data.length === 0) break
    allProducts.push(...(data as ProductRow[]))
    lastId = data[data.length - 1].id
    if (data.length < BATCH_SIZE) break
  }

  console.log(`Loaded ${allProducts.length} products across ${brandById.size} brands.`)
  console.log('')

  // Reserve all currently-used slugs so new ones don't collide.
  const takenSlugs = new Set<string>(allProducts.map((p) => p.slug))

  const renames: Array<{ id: string; oldSlug: string; newSlug: string }> = []

  for (const p of allProducts) {
    const brand = brandById.get(p.brand_id)
    if (!brand || !brand.slug) continue

    const expectedBase = `${brand.slug}-${slugify(p.name)}`
    if (p.slug === expectedBase) continue

    // If expected is free (or belongs to this same product), use it directly.
    let candidate = expectedBase
    if (takenSlugs.has(candidate) && candidate !== p.slug) {
      let n = 2
      while (takenSlugs.has(`${expectedBase}-${n}`)) n++
      candidate = `${expectedBase}-${n}`
    }

    // Reserve the new slug, release the old one so sibling products can reuse it if needed.
    takenSlugs.delete(p.slug)
    takenSlugs.add(candidate)

    renames.push({ id: p.id, oldSlug: p.slug, newSlug: candidate })
  }

  if (renames.length === 0) {
    console.log('✓ Nothing to rename. All slugs already match the expected format.')
    return
  }

  console.log(`Found ${renames.length} slug(s) to rename:`)
  console.log('')
  const preview = renames.slice(0, 30)
  for (const r of preview) {
    console.log(`  ${r.oldSlug}`)
    console.log(`    → ${r.newSlug}`)
  }
  if (renames.length > preview.length) {
    console.log(`  ... and ${renames.length - preview.length} more`)
  }
  console.log('')

  if (!APPLY) {
    console.log('Dry run complete. Re-run with --apply to write changes.')
    return
  }

  console.log('Applying renames...')
  let done = 0
  for (const r of renames) {
    const { error } = await supabase
      .from('products')
      .update({ slug: r.newSlug })
      .eq('id', r.id)
    if (error) {
      console.error(`  ✗ failed to rename ${r.oldSlug}: ${error.message}`)
      continue
    }
    done++
    if (done % 50 === 0) console.log(`  ...${done}/${renames.length}`)
  }
  console.log('')
  console.log(`✓ Renamed ${done}/${renames.length} products.`)
  console.log('  Next: npx tsx --env-file=.env.local scripts/reindex-products.ts')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
