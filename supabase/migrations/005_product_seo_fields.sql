-- ============================================================
-- ShoppingVegan.com — Per-product SEO overrides
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Optional editor overrides for the product page <title> and <meta name="description">.
-- When NULL, the product page falls back to auto-generated values
-- (brand + product name for the title; product.description or a generic vegan blurb
-- for the description).
ALTER TABLE products ADD COLUMN seo_title text;
ALTER TABLE products ADD COLUMN seo_description text;
