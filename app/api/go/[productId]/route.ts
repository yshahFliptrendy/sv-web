import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const [{ data: { user } }, { data: product }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('products')
      .select('affiliate_url, skimlinks_url, amazon_asin, source_url')
      .eq('id', productId)
      .eq('status', 'published')
      .single(),
  ])

  if (!product) {
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL!))
  }

  // Log click (non-blocking)
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? null
  const userAgent = headersList.get('user-agent') ?? null

  serviceClient.from('affiliate_clicks').insert({
    product_id: productId,
    user_id: user?.id ?? null,
    ip,
    user_agent: userAgent,
  }).then(() => {}) // fire-and-forget

  // Redirect priority: skimlinks_url → affiliate_url → amazon → source_url
  const destination =
    product.skimlinks_url ??
    product.affiliate_url ??
    (product.amazon_asin
      ? `https://www.amazon.com/dp/${product.amazon_asin}?tag=${process.env.AMAZON_ASSOCIATE_TAG}`
      : null) ??
    product.source_url

  if (!destination) {
    return NextResponse.redirect(new URL('/products', process.env.NEXT_PUBLIC_APP_URL!))
  }

  return NextResponse.redirect(destination)
}
