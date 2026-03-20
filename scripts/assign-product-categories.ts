/**
 * Assigns categories to products based on brand category or keyword matching.
 * Run with: npx tsx --env-file=.env.local scripts/assign-product-categories.ts
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Keywords mapped to category slugs — adjust these to match your actual category slugs
const KEYWORD_MAP: Record<string, string[]> = {
  'food': ['snack', 'chocolate', 'candy', 'protein bar', 'granola', 'cereal', 'cookie', 'chip', 'cracker', 'jerky', 'cheese', 'milk', 'yogurt', 'butter', 'cream', 'ice cream', 'frozen', 'meal', 'soup', 'sauce', 'pasta', 'rice', 'bread', 'flour', 'sugar', 'honey', 'syrup', 'jam', 'spread', 'nut', 'seed', 'tofu', 'tempeh', 'seitan', 'burger', 'sausage', 'bacon', 'meat', 'chicken', 'fish', 'egg', 'mayo', 'dressing', 'condiment', 'spice', 'seasoning', 'oil', 'vinegar', 'baking'],
  'drinks': ['drink', 'beverage', 'juice', 'smoothie', 'tea', 'coffee', 'water', 'soda', 'kombucha', 'beer', 'wine', 'spirit', 'latte', 'matcha', 'cocoa'],
  'beauty': ['lipstick', 'mascara', 'foundation', 'concealer', 'blush', 'eyeshadow', 'eyeliner', 'primer', 'makeup', 'cosmetic', 'serum', 'moisturizer', 'cleanser', 'toner', 'face wash', 'face mask', 'skincare', 'skin care', 'sunscreen', 'spf', 'anti-aging', 'retinol', 'vitamin c', 'hyaluronic', 'highlighter', 'bronzer', 'contour', 'setting spray', 'lip gloss', 'lip balm', 'nail polish', 'beauty'],
  'hair-care': ['shampoo', 'conditioner', 'hair', 'scalp', 'hair oil', 'hair mask', 'hair spray', 'gel', 'mousse', 'hair color', 'hair dye'],
  'body-care': ['body wash', 'body lotion', 'body butter', 'body scrub', 'soap', 'hand cream', 'hand soap', 'deodorant', 'perfume', 'fragrance', 'cologne', 'bath bomb', 'bath salt', 'shower', 'lotion'],
  'supplements': ['vitamin', 'supplement', 'probiotic', 'omega', 'collagen', 'protein powder', 'bcaa', 'creatine', 'pre-workout', 'multivitamin', 'iron', 'zinc', 'magnesium', 'calcium', 'b12', 'vitamin d', 'ashwagandha', 'turmeric', 'capsule', 'gummy', 'tablet'],
  'fashion': ['shirt', 't-shirt', 'dress', 'jacket', 'coat', 'pants', 'jeans', 'shorts', 'skirt', 'sweater', 'hoodie', 'sock', 'underwear', 'bra', 'legging', 'shoe', 'boot', 'sandal', 'sneaker', 'bag', 'purse', 'wallet', 'belt', 'hat', 'scarf', 'glove', 'sunglasses', 'watch', 'jewelry', 'necklace', 'bracelet', 'earring', 'ring', 'clothing', 'apparel', 'wear'],
  'home': ['candle', 'diffuser', 'cleaning', 'detergent', 'dish soap', 'laundry', 'sponge', 'towel', 'bedding', 'pillow', 'blanket', 'curtain', 'rug', 'mat', 'storage', 'organizer', 'decor', 'plant', 'garden', 'kitchen', 'utensil', 'container', 'wrap', 'bag'],
  'pets': ['dog', 'cat', 'pet', 'puppy', 'kitten', 'treat', 'kibble', 'pet food', 'leash', 'collar', 'toy'],
  'baby': ['baby', 'infant', 'toddler', 'diaper', 'wipe', 'formula', 'pacifier', 'teether', 'onesie'],
}

async function main() {
  // Fetch all categories
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('id, slug, name')

  if (catError) throw catError
  if (!categories?.length) {
    console.log('No categories found in database. Please create categories first.')
    return
  }

  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]))
  console.log(`Found ${categories.length} categories: ${categories.map((c) => c.slug).join(', ')}`)

  // Fetch all products
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name, description')
    .eq('status', 'published')

  if (prodError) throw prodError
  if (!products?.length) {
    console.log('No published products found.')
    return
  }

  console.log(`Processing ${products.length} products...`)

  let assigned = 0
  let skipped = 0
  const inserts: { product_id: string; category_id: string }[] = []

  for (const product of products) {
    const text = `${product.name} ${product.description ?? ''}`.toLowerCase()
    const matchedCategories = new Set<string>()

    for (const [catSlug, keywords] of Object.entries(KEYWORD_MAP)) {
      const category = categoryBySlug.get(catSlug)
      if (!category) continue

      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          matchedCategories.add(category.id)
          break
        }
      }
    }

    if (matchedCategories.size === 0) {
      skipped++
      continue
    }

    for (const categoryId of matchedCategories) {
      inserts.push({ product_id: product.id, category_id: categoryId })
    }
    assigned++
  }

  if (inserts.length > 0) {
    // Upsert to avoid duplicates
    const { error: insertError } = await supabase
      .from('product_categories')
      .upsert(inserts, { onConflict: 'product_id,category_id' })

    if (insertError) throw insertError
  }

  console.log(`✓ Assigned categories to ${assigned} products (${inserts.length} total links)`)
  console.log(`⚠ ${skipped} products had no keyword match — review manually`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})