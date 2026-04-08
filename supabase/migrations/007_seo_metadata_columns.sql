-- 007_seo_metadata_columns.sql
-- Adds dedicated SEO metadata columns to topics table
-- Used by WF_VIDEO_METADATA for storing generated YouTube description + tags

ALTER TABLE topics ADD COLUMN IF NOT EXISTS yt_description TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS yt_tags TEXT[];
