-- ============================================================
-- Migration 002: Article Scheduling Support
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Add 'scheduled' to article_status enum
-- Note: Postgres requires ADD VALUE outside a transaction
ALTER TYPE article_status ADD VALUE IF NOT EXISTS 'scheduled';

-- Update RLS policy to expose scheduled articles that have passed their publish date
DROP POLICY IF EXISTS "Published articles are publicly readable" ON articles;

CREATE POLICY "Published articles are publicly readable" ON articles
  FOR SELECT USING (
    status = 'published'
    OR (status = 'scheduled' AND published_at IS NOT NULL AND published_at <= now())
  );
