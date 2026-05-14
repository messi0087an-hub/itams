-- ============================================================
-- ITAMS Migration 003: Extended asset request fields
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. New columns on asset_requests
ALTER TABLE asset_requests
  ADD COLUMN IF NOT EXISTS department        TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS laptop_type       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS operating_system  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cost_per_unit     NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS document_urls     TEXT[] DEFAULT NULL;

-- 2. Create storage bucket for uploaded PDF documents
-- Run this once — the bucket is public-readable so links work without auth
INSERT INTO storage.buckets (id, name, public)
  VALUES ('asset-request-docs', 'asset-request-docs', true)
  ON CONFLICT (id) DO NOTHING;

-- 3. Storage policy: authenticated users can upload
CREATE POLICY "Authenticated users can upload request docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'asset-request-docs');

-- 4. Storage policy: everyone can read (public bucket)
CREATE POLICY "Public read access for request docs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'asset-request-docs');
