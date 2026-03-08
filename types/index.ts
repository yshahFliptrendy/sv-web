// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
}

// ─── Categories ──────────────────────────────────────────────────────────────

export interface Category {
  id: string
  slug: string
  name: string
  parent_id: string | null
  image_url: string | null
  children?: Category[]
}

// ─── Brands ──────────────────────────────────────────────────────────────────

export interface Brand {
  id: string
  slug: string
  name: string
  description: string | null
  logo_url: string | null
  website: string | null
  is_verified: boolean
  created_at: string
}

// ─── Certifications ──────────────────────────────────────────────────────────

export interface Certification {
  id: string
  slug: string
  name: string
  icon_url: string | null
}

// ─── Ingredients ─────────────────────────────────────────────────────────────

export interface Ingredient {
  id: string
  slug: string
  name: string
  description: string | null
  is_vegan: boolean
  is_cruelty_free: boolean
}

// ─── Products ─────────────────────────────────────────────────────────────────

export type ProductStatus = 'draft' | 'published' | 'archived'

export interface Product {
  id: string
  slug: string
  name: string
  description: string | null
  image_url: string | null
  price: number | null
  currency: string
  brand_id: string
  brand?: Brand
  affiliate_url: string | null
  skimlinks_url: string | null
  amazon_asin: string | null
  source_url: string | null
  status: ProductStatus
  categories?: Category[]
  ingredients?: Ingredient[]
  certifications?: Certification[]
  created_at: string
  updated_at: string
}

// Algolia hit shape
export interface ProductHit {
  objectID: string
  slug: string
  name: string
  description: string
  image_url: string
  price: number
  currency: string
  brand_name: string
  brand_slug: string
  category_names: string[]
  category_slugs: string[]
  certification_names: string[]
  ingredient_names: string[]
}

// ─── Articles ─────────────────────────────────────────────────────────────────

export type ArticleStatus = 'draft' | 'published'

export interface Tag {
  id: string
  slug: string
  name: string
}

export interface Article {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body: string
  cover_image: string | null
  author_id: string
  author?: Profile
  status: ArticleStatus
  published_at: string | null
  seo_title: string | null
  seo_description: string | null
  tags?: Tag[]
  created_at: string
  updated_at: string
}

export interface ArticleComment {
  id: string
  article_id: string
  author_id: string
  author?: Profile
  parent_id: string | null
  body: string
  created_at: string
  replies?: ArticleComment[]
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export interface WishlistItem {
  id: string
  user_id: string
  product_id: string
  product?: Product
  created_at: string
}

// ─── Forum ────────────────────────────────────────────────────────────────────

export interface ForumCommunity {
  id: string
  slug: string
  name: string
  description: string | null
  icon_url: string | null
  post_count: number
}

export interface ForumPost {
  id: string
  community_id: string
  community?: ForumCommunity
  author_id: string
  author?: Profile
  title: string
  body: string
  vote_count: number
  comment_count: number
  user_vote?: number // +1 | -1 | 0
  created_at: string
  updated_at: string
}

export interface ForumComment {
  id: string
  post_id: string
  author_id: string
  author?: Profile
  parent_id: string | null
  body: string
  vote_count: number
  user_vote?: number
  created_at: string
  replies?: ForumComment[]
}

// ─── Newsletter ───────────────────────────────────────────────────────────────

export interface NewsletterSubscriber {
  id: string
  email: string
  confirmed_at: string | null
  created_at: string
}

// ─── Affiliate ────────────────────────────────────────────────────────────────

export interface AffiliateClick {
  id: string
  product_id: string
  user_id: string | null
  ip: string | null
  created_at: string
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}
