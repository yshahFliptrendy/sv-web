import { z } from 'zod'

export const newsletterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  display_name: z.string().min(2, 'Name must be at least 2 characters'),
})

export const articleCommentSchema = z.object({
  body: z.string().min(1, 'Comment cannot be empty').max(2000),
  parent_id: z.string().uuid().optional(),
})

export const forumPostSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(300),
  body: z.string().min(10, 'Post body must be at least 10 characters'),
  community_id: z.string().uuid(),
})

export const forumCommentSchema = z.object({
  body: z.string().min(1).max(2000),
  parent_id: z.string().uuid().optional(),
})

export const productAdminSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal('')),
  price: z.coerce.number().positive().optional(),
  brand_id: z.string().uuid(),
  affiliate_url: z.string().url().optional().or(z.literal('')),
  amazon_asin: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']),
})

export const articleAdminSchema = z.object({
  title: z.string().min(5),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  excerpt: z.string().max(300).optional(),
  body: z.string().min(10),
  cover_image: z.string().url().optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'scheduled']),
  published_at: z.string().optional(),
  seo_title: z.string().max(60).optional(),
  seo_description: z.string().max(160).optional(),
  tag_names: z.array(z.string()).optional(),
  embedded_product_ids: z.array(z.string().uuid()).optional(),
})

export type NewsletterInput = z.infer<typeof newsletterSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ArticleCommentInput = z.infer<typeof articleCommentSchema>
export type ForumPostInput = z.infer<typeof forumPostSchema>
export type ForumCommentInput = z.infer<typeof forumCommentSchema>
export type ProductAdminInput = z.infer<typeof productAdminSchema>
export type ArticleAdminInput = z.infer<typeof articleAdminSchema>
