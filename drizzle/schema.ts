import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  integer,
  smallint,
  timestamp,
  pgEnum,
  primaryKey,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['user', 'admin'])
export const productStatusEnum = pgEnum('product_status', ['draft', 'published', 'archived'])
export const articleStatusEnum = pgEnum('article_status', ['draft', 'published'])

// ─── Profiles ─────────────────────────────────────────────────────────────────

export const profiles = pgTable('profiles', {
  id:           uuid('id').primaryKey(),
  email:        text('email').notNull(),
  displayName:  text('display_name'),
  avatarUrl:    text('avatar_url'),
  role:         userRoleEnum('role').notNull().default('user'),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Categories ───────────────────────────────────────────────────────────────

export const categories = pgTable('categories', {
  id:        uuid('id').primaryKey().defaultRandom(),
  slug:      text('slug').notNull().unique(),
  name:      text('name').notNull(),
  parentId:  uuid('parent_id').references((): any => categories.id),
  imageUrl:  text('image_url'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Brands ───────────────────────────────────────────────────────────────────

export const brands = pgTable('brands', {
  id:          uuid('id').primaryKey().defaultRandom(),
  slug:        text('slug').notNull().unique(),
  name:        text('name').notNull(),
  description: text('description'),
  logoUrl:     text('logo_url'),
  website:     text('website'),
  isVerified:  boolean('is_verified').notNull().default(false),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Certifications ───────────────────────────────────────────────────────────

export const certifications = pgTable('certifications', {
  id:      uuid('id').primaryKey().defaultRandom(),
  slug:    text('slug').notNull().unique(),
  name:    text('name').notNull(),
  iconUrl: text('icon_url'),
})

// ─── Ingredients ──────────────────────────────────────────────────────────────

export const ingredients = pgTable('ingredients', {
  id:            uuid('id').primaryKey().defaultRandom(),
  slug:          text('slug').notNull().unique(),
  name:          text('name').notNull(),
  description:   text('description'),
  isVegan:       boolean('is_vegan').notNull().default(true),
  isCrueltyFree: boolean('is_cruelty_free').notNull().default(true),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Products ─────────────────────────────────────────────────────────────────

export const products = pgTable('products', {
  id:              uuid('id').primaryKey().defaultRandom(),
  slug:            text('slug').notNull().unique(),
  name:            text('name').notNull(),
  description:     text('description'),
  imageUrl:        text('image_url'),
  price:           numeric('price', { precision: 10, scale: 2 }),
  currency:        text('currency').notNull().default('USD'),
  brandId:         uuid('brand_id').notNull().references(() => brands.id),
  affiliateUrl:    text('affiliate_url'),
  skimlinksUrl:    text('skimlinks_url'),
  amazonAsin:      text('amazon_asin'),
  sourceUrl:       text('source_url'),
  status:          productStatusEnum('status').notNull().default('draft'),
  algoliaSyncedAt: timestamp('algolia_synced_at', { withTimezone: true }),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  brandIdx:  index('products_brand_id_idx').on(t.brandId),
  statusIdx: index('products_status_idx').on(t.status),
}))

export const productCategories = pgTable('product_categories', {
  productId:  uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.productId, t.categoryId] }) }))

export const productIngredients = pgTable('product_ingredients', {
  productId:    uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  ingredientId: uuid('ingredient_id').notNull().references(() => ingredients.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.productId, t.ingredientId] }) }))

export const productCertifications = pgTable('product_certifications', {
  productId:       uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  certificationId: uuid('certification_id').notNull().references(() => certifications.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.productId, t.certificationId] }) }))

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const tags = pgTable('tags', {
  id:   uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
})

// ─── Articles ─────────────────────────────────────────────────────────────────

export const articles = pgTable('articles', {
  id:             uuid('id').primaryKey().defaultRandom(),
  slug:           text('slug').notNull().unique(),
  title:          text('title').notNull(),
  excerpt:        text('excerpt'),
  body:           text('body').notNull().default(''),
  coverImage:     text('cover_image'),
  authorId:       uuid('author_id').notNull().references(() => profiles.id),
  status:         articleStatusEnum('status').notNull().default('draft'),
  publishedAt:    timestamp('published_at', { withTimezone: true }),
  seoTitle:       text('seo_title'),
  seoDescription: text('seo_description'),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const articleTags = pgTable('article_tags', {
  articleId: uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  tagId:     uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.articleId, t.tagId] }) }))

export const articleProducts = pgTable('article_products', {
  articleId: uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => ({ pk: primaryKey({ columns: [t.articleId, t.productId] }) }))

export const articleComments = pgTable('article_comments', {
  id:        uuid('id').primaryKey().defaultRandom(),
  articleId: uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  authorId:  uuid('author_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  parentId:  uuid('parent_id').references((): any => articleComments.id, { onDelete: 'cascade' }),
  body:      text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export const wishlists = pgTable('wishlists', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userProductUniq: uniqueIndex('wishlists_user_product_uniq').on(t.userId, t.productId),
}))

// ─── Forum ────────────────────────────────────────────────────────────────────

export const forumCommunities = pgTable('forum_communities', {
  id:          uuid('id').primaryKey().defaultRandom(),
  slug:        text('slug').notNull().unique(),
  name:        text('name').notNull(),
  description: text('description'),
  iconUrl:     text('icon_url'),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const forumPosts = pgTable('forum_posts', {
  id:           uuid('id').primaryKey().defaultRandom(),
  communityId:  uuid('community_id').notNull().references(() => forumCommunities.id),
  authorId:     uuid('author_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title:        text('title').notNull(),
  body:         text('body').notNull(),
  voteCount:    integer('vote_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const forumComments = pgTable('forum_comments', {
  id:        uuid('id').primaryKey().defaultRandom(),
  postId:    uuid('post_id').notNull().references(() => forumPosts.id, { onDelete: 'cascade' }),
  authorId:  uuid('author_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  parentId:  uuid('parent_id').references((): any => forumComments.id, { onDelete: 'cascade' }),
  body:      text('body').notNull(),
  voteCount: integer('vote_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const forumVotes = pgTable('forum_votes', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  postId:    uuid('post_id').references(() => forumPosts.id, { onDelete: 'cascade' }),
  commentId: uuid('comment_id').references(() => forumComments.id, { onDelete: 'cascade' }),
  value:     smallint('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Newsletter ───────────────────────────────────────────────────────────────

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id:          uuid('id').primaryKey().defaultRandom(),
  email:       text('email').notNull().unique(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Affiliate Clicks ─────────────────────────────────────────────────────────

export const affiliateClicks = pgTable('affiliate_clicks', {
  id:        uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  userId:    uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
  ip:        text('ip'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const productsRelations = relations(products, ({ one, many }) => ({
  brand:          one(brands, { fields: [products.brandId], references: [brands.id] }),
  categories:     many(productCategories),
  ingredients:    many(productIngredients),
  certifications: many(productCertifications),
}))

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}))

export const articlesRelations = relations(articles, ({ one, many }) => ({
  author:   one(profiles, { fields: [articles.authorId], references: [profiles.id] }),
  tags:     many(articleTags),
  comments: many(articleComments),
  products: many(articleProducts),
}))

export const forumPostsRelations = relations(forumPosts, ({ one, many }) => ({
  community: one(forumCommunities, { fields: [forumPosts.communityId], references: [forumCommunities.id] }),
  author:    one(profiles, { fields: [forumPosts.authorId], references: [profiles.id] }),
  comments:  many(forumComments),
  votes:     many(forumVotes),
}))
