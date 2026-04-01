-- ═══════════════════════════════════════════════════
-- 006: Research Enhancements
-- Adds platform selection + flexible time range to research_runs
-- ═══════════════════════════════════════════════════

-- Add new columns
ALTER TABLE research_runs
  ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT ARRAY['reddit','youtube','tiktok','trends','quora'],
  ADD COLUMN IF NOT EXISTS time_range TEXT DEFAULT '7d';

-- Backfill existing rows
UPDATE research_runs
SET platforms = ARRAY['reddit','youtube','tiktok','trends','quora'],
    time_range = COALESCE(lookback_days::text || 'd', '7d')
WHERE platforms IS NULL;

-- Drop old column
ALTER TABLE research_runs DROP COLUMN IF EXISTS lookback_days;
