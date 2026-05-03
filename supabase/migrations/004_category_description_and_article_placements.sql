-- ============================================================
-- ShoppingVegan.com — Category descriptions + article sidebar placements
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Add description field to categories for SEO blurbs
ALTER TABLE categories ADD COLUMN description text;

-- Allow ad placements to link to an internal article instead of an external URL
ALTER TABLE ad_placements ADD COLUMN article_id uuid REFERENCES articles(id) ON DELETE SET NULL;

-- image_url is no longer required (article placements don't need a banner image)
ALTER TABLE ad_placements ALTER COLUMN image_url DROP NOT NULL;

-- link_url is no longer required (article placements derive their URL from the article slug)
ALTER TABLE ad_placements ALTER COLUMN link_url DROP NOT NULL;
