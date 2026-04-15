-- Migration 013: Prediction Engine (Sprint S4 — CF13 + CF12)
-- Depends on: 012_ctr_and_ab_testing.sql
--
-- Adds pre-publish performance prediction (CF13) and script-level viral + hook
-- intelligence (CF12).
--
--   CF13 PPS: weighted formula combining CF01 Outlier + CF02 SEO + script_quality +
--             niche_health (CF11, S7 — defaults to 50 until live) + thumbnail CTR +
--             title CTR. Stored on topics at Gate 3.
--   CF12 Viral Moment Pre-Scoring + Hook Analyzer: script-level JSONB annotations
--             feeding Gate 2 (hooks) and Gate 4 (viral shorts picker).
--
-- Per execution-gate decision #1: CF18 Cost Optimizer dropped; S4 = CF13 + CF12 only.
--
-- Idempotent: safe to re-run.

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. ALTER topics — PPS + viral + hook intelligence
-- ────────────────────────────────────────────────────────────────────────────

-- CF13: Predictive Performance Score
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS predicted_performance_score INTEGER;        -- 0-100 weighted
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS pps_light VARCHAR(10);                       -- 'green' | 'yellow' | 'red'
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS pps_recommendation TEXT;                     -- natural-language advice
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS pps_breakdown JSONB;                         -- {outlier:{raw, weight, contribution}, seo:{}, script_quality:{}, niche_health:{}, thumbnail_ctr:{}, title_ctr:{}, dragged_by: [top-2 weak factors]}
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS pps_missing_inputs JSONB;                    -- array of factor names that defaulted (e.g., ['niche_health_score'])
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS pps_calculated_at TIMESTAMPTZ;

-- CF12: Viral Moment Pre-Scoring
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS viral_moments JSONB;                         -- array of {scene_number, excerpt, viral_potential 0-100, shorts_worthiness 0-100, emotional_beat, shareability_hook}
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS top_3_viral_moments_idx JSONB;               -- array of 3 indexes into viral_moments, ranked
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS viral_tagged_at TIMESTAMPTZ;

-- CF12: Hook Analyzer
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS hook_scores JSONB;                           -- array of {chapter_name, chapter_index, opening_text, total_score, breakdown: {curiosity_gap, emotional_trigger, specificity, pattern_interrupt, open_loop}, weak_flag, rewrite_suggestion}
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS avg_hook_score INTEGER;                      -- average across chapters; convenience column for sort/filter
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS weak_hook_count INTEGER;                     -- count of chapters with total_score < 60
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS hook_analyzed_at TIMESTAMPTZ;

-- Range + enum CHECKs
DO $$ BEGIN
  ALTER TABLE public.topics
    ADD CONSTRAINT topics_pps_range_chk
    CHECK (predicted_performance_score IS NULL OR (predicted_performance_score BETWEEN 0 AND 100));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.topics
    ADD CONSTRAINT topics_pps_light_chk
    CHECK (pps_light IS NULL OR pps_light IN ('green', 'yellow', 'red'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.topics
    ADD CONSTRAINT topics_avg_hook_range_chk
    CHECK (avg_hook_score IS NULL OR (avg_hook_score BETWEEN 0 AND 100));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index for Gate 1/Gate 3 sort + PPS-accuracy scatter (Analytics page, Sprint S7)
CREATE INDEX IF NOT EXISTS idx_topics_pps
  ON public.topics (project_id, predicted_performance_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_topics_avg_hook
  ON public.topics (project_id, avg_hook_score DESC NULLS LAST);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. pps_config — per-project PPS weight tuning
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pps_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  outlier_weight FLOAT DEFAULT 0.30,
  seo_weight FLOAT DEFAULT 0.20,
  script_quality_weight FLOAT DEFAULT 0.20,
  niche_health_weight FLOAT DEFAULT 0.15,
  thumbnail_ctr_weight FLOAT DEFAULT 0.10,
  title_ctr_weight FLOAT DEFAULT 0.05,
  -- Enforce weights sum to exactly 1.0 (within tolerance for float math)
  calibration_sample_count INTEGER DEFAULT 0,
  last_calibrated_at TIMESTAMPTZ,
  calibration_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

DO $$ BEGIN
  ALTER TABLE public.pps_config
    ADD CONSTRAINT pps_config_weights_sum_chk
    CHECK (
      ABS(
        COALESCE(outlier_weight, 0)
        + COALESCE(seo_weight, 0)
        + COALESCE(script_quality_weight, 0)
        + COALESCE(niche_health_weight, 0)
        + COALESCE(thumbnail_ctr_weight, 0)
        + COALESCE(title_ctr_weight, 0)
        - 1.0
      ) < 0.001
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. pps_calibration — post-publish variance tracking
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pps_calibration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,    -- denormalized for weight-regression queries
  predicted_pps INTEGER NOT NULL,
  pps_breakdown JSONB,                          -- snapshot of per-factor scores at prediction time (for regression analysis)
  published_at TIMESTAMPTZ,
  actual_views_7d INTEGER,
  actual_views_30d INTEGER,
  actual_impressions_30d INTEGER,
  actual_ctr FLOAT,
  actual_avg_view_duration_seconds FLOAT,
  actual_revenue_usd FLOAT,
  implied_actual_score INTEGER,                 -- normalize actual performance to 0-100 for comparison
  variance_pct FLOAT,                           -- (implied_actual - predicted_pps) / predicted_pps
  calibration_run_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(topic_id, calibration_run_at)
);

CREATE INDEX IF NOT EXISTS idx_pps_calibration_project
  ON public.pps_calibration (project_id, calibration_run_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. RLS — anon open
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.pps_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pps_calibration ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY pps_config_all      ON public.pps_config      FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY pps_calibration_all ON public.pps_calibration FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Realtime — pps_config changes drive dashboard re-renders; calibration is append-only (no Realtime)
-- ────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pps_config; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.pps_config REPLICA IDENTITY FULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Seed pps_config for all existing projects with default weights
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO public.pps_config (project_id)
SELECT id FROM public.projects
ON CONFLICT (project_id) DO NOTHING;

COMMIT;

-- ────────────────────────────────────────────────────────────────────────────
-- Rollback (run manually if needed):
--
-- BEGIN;
-- DROP TABLE IF EXISTS public.pps_calibration CASCADE;
-- DROP TABLE IF EXISTS public.pps_config      CASCADE;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS hook_analyzed_at;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS weak_hook_count;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS avg_hook_score;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS hook_scores;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS viral_tagged_at;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS top_3_viral_moments_idx;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS viral_moments;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS pps_calculated_at;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS pps_missing_inputs;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS pps_breakdown;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS pps_recommendation;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS pps_light;
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS predicted_performance_score;
-- COMMIT;
