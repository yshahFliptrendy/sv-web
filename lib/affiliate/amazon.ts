/**
 * Amazon Product Advertising API (PAAPI) helpers.
 * Docs: https://webservices.amazon.com/paapi5/documentation/
 */

const ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG ?? ''
const MARKETPLACE = process.env.AMAZON_MARKETPLACE ?? 'www.amazon.com'

/**
 * Build a simple affiliate link from an ASIN.
 * For full PAAPI signed requests, use the amazon-paapi npm package.
 */
export function buildAmazonAffiliateUrl(asin: string): string {
  return `https://${MARKETPLACE}/dp/${asin}?tag=${ASSOCIATE_TAG}`
}

/**
 * Extract ASIN from an Amazon product URL.
 */
export function extractAsin(url: string): string | null {
  const match = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)
  return match ? match[1] : null
}
