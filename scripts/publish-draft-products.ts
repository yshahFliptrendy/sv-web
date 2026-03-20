/**
 * Publish recently added draft products and sync them to Algolia.
 *
 * Options:
 *   --days <n>     Only drafts created in the last N days (default: 7)
 *   --dry-run      Preview without making changes
 *
 * Run with: npx tsx --env-file=.env.local scripts/publish-draft-products.ts
 *           npx tsx --env-file=.env.local scripts/publish-draft-products.ts --days 30
 *           npx tsx --env-file=.env.local scripts/publish-draft-products.ts --dry-run
 */
import { createClient } from '@supabase/supabase-js'
import { algoliasearch } from 'algoliasearch'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const algolia = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
)

const indexName = process.env.ALGOLIA_PRODUCTS_INDEX ?? 'sv_products'

function parseArgs() {
  const args = process.argv.slice(2)
  let days = 7
  let dryRun = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) {
      days = parseInt(args[i + 1], 10)
      i++
    }
    if (args[i] === '--dry-run') {
      dryRun = true
    }
  }

  return { days, dryRun }
}

async function main() {
  const { days, dryRun } = parseArgs()

  const since = new Date()
  since.setDate(since.getDate() - days)

  console.log(`Finding draft products created in the last ${days} days (since ${since.toISOString()})...`)
  if (dryRun) console.log('(dry run — no changes will be made)\n')

  // Fetch draft products created recently
  const { data: drafts, error } = await supabase
    .from('products')
    .select(`
      id, slug, name, description, image_url, price, original_price, currency, created_at,
      brand:brands(name, slug),
      categories:product_categories(category:categories(name, slug)),
      certifications:product_certifications(certification:certifications(name)),
      ingredients:product_ingredients(ingredient:ingredients(name))
    `)
    .eq('status', 'draft')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!drafts || drafts.length === 0) {
    console.log('No draft products found in that period.')
    return
  }

  console.log(`Found ${drafts.length} draft product(s):\n`)
  for (const p of drafts as any[]) {
    console.log(`  - ${p.name} (${p.slug}) | brand: ${p.brand?.name ?? 'N/A'} | created: ${p.created_at}`)
  }
  console.log()

  if (dryRun) {
    console.log('Dry run complete. Re-run without --dry-run to publish.')
    return
  }

  // Update status to published
  const ids = (drafts as any[]).map((p) => p.id)
  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('products')
    .update({ status: 'published', updated_at: now })
    .in('id', ids)

  if (updateError) throw updateError
  console.log(`Updated ${ids.length} product(s) to "published".`)

  // Sync to Algolia
  const records = (drafts as any[]).map((p) => ({
    objectID: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description ?? '',
    image_url: p.image_url ?? null,
    price: p.price ?? null,
    original_price: p.original_price ?? null,
    currency: p.currency ?? 'USD',
    brand_name: p.brand?.name ?? '',
    brand_slug: p.brand?.slug ?? '',
    category_names: (p.categories ?? []).map((c: any) => c.category?.name).filter(Boolean),
    category_slugs: (p.categories ?? []).map((c: any) => c.category?.slug).filter(Boolean),
    certification_names: (p.certifications ?? []).map((c: any) => c.certification?.name).filter(Boolean),
    ingredient_names: (p.ingredients ?? []).map((i: any) => i.ingredient?.name).filter(Boolean),
    created_at: Math.floor(new Date(p.created_at).getTime() / 1000),
  }))

  await algolia.saveObjects({ indexName, objects: records })

  // Update algolia_synced_at
  await supabase
    .from('products')
    .update({ algolia_synced_at: now })
    .in('id', ids)

  console.log(`Synced ${records.length} product(s) to Algolia index "${indexName}".`)
  console.log('\nDone!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
