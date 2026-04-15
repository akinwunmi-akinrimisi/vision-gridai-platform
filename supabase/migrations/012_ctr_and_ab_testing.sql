-- Migration 012: CTR Optimization + A/B Testing (Sprint S3 — CF05 + CF06 + CF17)
-- Depends on: 011_competitor_intel.sql
--
-- Adds predicted-CTR scoring (title + thumbnail) + live A/B testing infrastructure:
--   CF05 Title CTR Optimizer — 5-variant generation + scoring (claude-opus-4-6)
--   CF06 Thumbnail CTR Scorer — Claude Vision 7-factor scoring + auto-regen loop
--   CF17 A/B Testing Engine — rotates title/thumbnail variants on live YouTube videos
--
-- IMPORTANT: title_ctr_score and thumbnail_ctr_score are PREDICTED scores (0-100).
-- yt_ctr (from 001_initial_schema.sql) is the ACTUAL post-publish CTR from YouTube
-- Analytics. The two are never conflated.
--
-- Idempotent: safe to re-run.

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. ALTER topics — title + thumbnail CTR intelligence
-- ────────────────────────────────────────────────────────────────────────────

-- CF05: Title CTR Optimizer
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS title_options JSONB;                        -- [{title, ctr_score, formula_pattern, char_count, scoring_breakdown, reasoning}]
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS selected_title VARCHAR(500);                 -- user-chosen variant at Gate 3
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS title_ctr_score INTEGER;                     -- predicted CTR of selected variant
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS title_recommended_index INTEGER;             -- 0-4 index into title_options
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS title_ctr_reasoning TEXT;                    -- recommended_reasoning from prompt
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS title_variants_generated_at TIMESTAMPTZ;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS title_selected_at TIMESTAMPTZ;

-- CF06: Thumbnail CTR Scoring
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS thumbnail_ctr_score INTEGER;                 -- predicted 0-100
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS thumbnail_score_breakdown JSONB;             -- {face_emotion, text_readability, color_contrast, visual_complexity, curiosity_hook, niche_relevance, brand_consistency}
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS thumbnail_decision VARCHAR(20);              -- accept | review | regenerate
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS thumbnail_primary_weakness TEXT;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS thumbnail_improvement_suggestions JSONB;     -- string[]
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS thumbnail_regen_attempts INTEGER DEFAULT 0;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS thumbnail_regen_history JSONB;               -- [{attempt, score, decision, prompt_used, scored_at}]
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS thumbnail_scored_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE public.topics
    ADD CONSTRAINT topics_thumbnail_decision_chk
    CHECK (thumbnail_decision IS NULL OR thumbnail_decision IN ('accept', 'review', 'regenerate'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Score-range guards on predicted CTR columns
DO $$ BEGIN
  ALTER TABLE public.topics
    ADD CONSTRAINT topics_title_ctr_range_chk
    CHECK (title_ctr_score IS NULL OR (title_ctr_score BETWEEN 0 AND 100));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.topics
    ADD CONSTRAINT topics_thumbnail_ctr_range_chk
    CHECK (thumbnail_ctr_score IS NULL OR (thumbnail_ctr_score BETWEEN 0 AND 100));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_topics_ctr_scores
  ON public.topics (project_id, title_ctr_score DESC NULLS LAST, thumbnail_ctr_score DESC NULLS LAST);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. ab_tests — per-topic A/B test configuration
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,  -- denormalized
  youtube_video_id VARCHAR(20),                                               -- set after topic is published
  test_type VARCHAR(20) NOT NULL,                                             -- title | thumbnail | combined
  status VARCHAR(20) DEFAULT 'pending',                                       -- pending | running | paused | completed | aborted
  min_impressions_per_variant INTEGER DEFAULT 1000,
  min_days_per_variant INTEGER DEFAULT 2,
  rotation_interval_hours INTEGER DEFAULT 48,
  confidence_threshold FLOAT DEFAULT 0.95,                                    -- statistical significance target
  current_variant_id UUID,                                                    -- soft-FK to ab_test_variants.id (the variant currently live on YouTube)
  last_rotated_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  winning_variant_id UUID,                                                    -- soft-FK to ab_test_variants.id
  winner_applied BOOLEAN DEFAULT false,                                       -- was the winning variant promoted as the permanent live version?
  test_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_tests_project_status
  ON public.ab_tests (project_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_ab_tests_running
  ON public.ab_tests (status, last_rotated_at ASC NULLS FIRST)
  WHERE status = 'running';

DO $$ BEGIN
  ALTER TABLE public.ab_tests
    ADD CONSTRAINT ab_tests_type_chk
    CHECK (test_type IN ('title', 'thumbnail', 'combined'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.ab_tests
    ADD CONSTRAINT ab_tests_status_chk
    CHECK (status IN ('pending', 'running', 'paused', 'completed', 'aborted'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. ab_test_variants — individual variants within a test
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ab_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id UUID NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  variant_label VARCHAR(10) NOT NULL,                                         -- 'A' | 'B' | 'C' (up to 5 per test)
  variant_order INTEGER NOT NULL,                                             -- 0 = baseline, 1+ = challengers
  title VARCHAR(500),                                                         -- null if thumbnail-only test
  thumbnail_url VARCHAR(500),                                                 -- Drive or YouTube thumbnail URL (null if title-only)
  thumbnail_drive_id VARCHAR(100),
  predicted_ctr_score INTEGER,                                                -- from CF05/CF06 pre-publish scoring
  total_impressions INTEGER DEFAULT 0,                                        -- cumulative while this variant was live
  total_views INTEGER DEFAULT 0,
  total_ctr FLOAT,                                                            -- views / impressions
  total_hours_live INTEGER DEFAULT 0,
  rotation_count INTEGER DEFAULT 0,                                           -- how many times this variant was rotated in
  last_live_at TIMESTAMPTZ,
  confidence_score FLOAT,                                                     -- statistical confidence this variant is the winner
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ab_test_id, variant_label)
);

CREATE INDEX IF NOT EXISTS idx_ab_test_variants_test
  ON public.ab_test_variants (ab_test_id, variant_order);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. ab_test_impressions — time-series log of per-rotation CTR snapshots
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ab_test_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_variant_id UUID NOT NULL REFERENCES public.ab_test_variants(id) ON DELETE CASCADE,
  ab_test_id UUID NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ DEFAULT NOW(),
  window_start TIMESTAMPTZ,                                                   -- start of measurement window
  window_end TIMESTAMPTZ,                                                     -- end of measurement window
  impressions INTEGER,                                                        -- delta impressions in this window
  views INTEGER,                                                              -- delta views in this window
  ctr FLOAT,                                                                  -- views / impressions for this window
  avg_view_duration_seconds FLOAT,
  source VARCHAR(30) DEFAULT 'youtube_analytics_api'
);

CREATE INDEX IF NOT EXISTS idx_ab_test_impressions_variant
  ON public.ab_test_impressions (ab_test_variant_id, snapshot_at DESC);

CREATE INDEX IF NOT EXISTS idx_ab_test_impressions_test
  ON public.ab_test_impressions (ab_test_id, snapshot_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. RLS — anon open
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.ab_tests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_variants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_impressions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY ab_tests_all            ON public.ab_tests            FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY ab_test_variants_all    ON public.ab_test_variants    FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY ab_test_impressions_all ON public.ab_test_impressions FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Realtime — tests + variants drive the dashboard A/B panel; impressions are time-series (no Realtime needed)
-- ────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ab_tests;         EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ab_test_variants; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.ab_tests         REPLICA IDENTITY FULL;
ALTER TABLE public.ab_test_variants REPLICA IDENTITY FULL;

COMMIT;

-- ────────────────────────────────────────────────────────────────────────────
-- Rollback (run manually if needed):
--
-- BEGIN;
-- DROP TABLE IF EXISTS public.ab_test_impressions CASCADE;
-- DROP TABLE IF EXISTS public.ab_test_variants    CASCADE;
-- DROP TABLE IF EXISTS public.ab_tests            CASCADE;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS thumbnail_scored_at;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS thumbnail_regen_history;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS thumbnail_regen_attempts;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS thumbnail_improvement_suggestions;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS thumbnail_primary_weakness;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS thumbnail_decision;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS thumbnail_score_breakdown;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS thumbnail_ctr_score;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS title_selected_at;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS title_variants_generated_at;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS title_ctr_reasoning;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS title_recommended_index;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS title_ctr_score;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS selected_title;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS title_options;
-- COMMIT;
