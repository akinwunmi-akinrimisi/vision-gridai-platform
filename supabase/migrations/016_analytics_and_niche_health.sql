-- Migration 016: Analytics Loop + Niche Health (Sprint S7 — CF10 + CF15 + CF11)
-- Depends on: 015_ai_advisory.sql
--
-- Closes the feedback loop between production decisions and real-world results:
--   CF10 Post-Publish Analytics — adds PPS-accuracy inputs + traffic source + revenue
--                                 columns to topics (Analytics page extensions only).
--   CF15 Revenue Attribution — production cost → actual revenue per topic via
--                              WF_REVENUE_ATTRIBUTION monthly workflow.
--   CF11 Niche Health Score — weekly 0-100 score on projects + history for trends.
--
-- Per locked decision #3: Analytics page EXTENDED at /project/:id/analytics.
-- Per locked decision #4: Niches surface on ProjectsHome (no new /niches route).
--
-- Idempotent: safe to re-run.

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. ALTER projects — CF11 niche health columns
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS niche_health_score INTEGER DEFAULT 50;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS niche_health_classification VARCHAR(20);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS niche_health_last_computed_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE public.projects
    ADD CONSTRAINT projects_niche_health_score_range_chk
    CHECK (niche_health_score IS NULL OR (niche_health_score BETWEEN 0 AND 100));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.projects
    ADD CONSTRAINT projects_niche_health_class_chk
    CHECK (niche_health_classification IS NULL OR niche_health_classification IN ('thriving', 'stable', 'warning', 'critical'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. ALTER topics — CF10 traffic + CF15 revenue/ROI columns
-- ────────────────────────────────────────────────────────────────────────────

-- CF10: Traffic source intelligence
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS yt_traffic_source_breakdown JSONB;  -- {homepage, search, suggested, external, other} shares 0-1
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS yt_impressions_30d INTEGER;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS yt_analytics_last_pulled_at TIMESTAMPTZ;

-- CF15: Cost + Revenue + ROI
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS production_cost_usd DECIMAL(8,3);   -- summed from production_logs cost_usd
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS cost_breakdown_snapshot JSONB;      -- {script, tts, images, ken_burns, assembly, music, thumbnail, captions, publish, intelligence_layer}
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS estimated_revenue_30d DECIMAL(10,2);-- from YouTube Analytics estimatedRevenue
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS roi_pct DECIMAL(8,2);               -- (revenue - cost) / cost * 100; nullable when cost=0
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS break_even_views INTEGER;           -- round(cost / (rpm_mid / 1000))
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS revenue_attributed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_topics_roi
  ON public.topics (project_id, roi_pct DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_topics_revenue
  ON public.topics (project_id, estimated_revenue_30d DESC NULLS LAST);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. niche_health_history — CF11 weekly score history
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.niche_health_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  week_of DATE NOT NULL,                                 -- Sunday date
  health_score INTEGER NOT NULL,
  classification VARCHAR(20) NOT NULL,
  momentum_trend VARCHAR(20),                            -- rising | stable | declining
  saturation_signal BOOLEAN DEFAULT false,
  competitor_velocity_score INTEGER,                     -- contribution 0-30
  new_channel_entry_score INTEGER,                       -- contribution 0-20
  topic_freshness_score INTEGER,                         -- contribution 0-25
  rpm_stability_score INTEGER,                           -- contribution 0-25
  score_breakdown JSONB,                                 -- full factor JSON for dashboard tooltip
  week_over_week_delta INTEGER,                          -- vs prior week, nullable if no prior
  insight_summary TEXT,                                  -- claude-derived one-liner
  generated_by VARCHAR(30) DEFAULT 'claude-haiku-4-5-20251001',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, week_of)
);

CREATE INDEX IF NOT EXISTS idx_niche_health_project_history
  ON public.niche_health_history (project_id, week_of DESC);

DO $$ BEGIN
  ALTER TABLE public.niche_health_history
    ADD CONSTRAINT niche_health_class_chk
    CHECK (classification IN ('thriving', 'stable', 'warning', 'critical'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.niche_health_history
    ADD CONSTRAINT niche_health_score_range_chk
    CHECK (health_score BETWEEN 0 AND 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.niche_health_history
    ADD CONSTRAINT niche_health_momentum_chk
    CHECK (momentum_trend IS NULL OR momentum_trend IN ('rising', 'stable', 'declining'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. revenue_attribution — CF15 per-topic monthly snapshot
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.revenue_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  snapshot_month DATE NOT NULL,                          -- YYYY-MM-01 first-of-month
  youtube_video_id VARCHAR(20),
  production_cost_usd DECIMAL(8,3),
  cost_breakdown JSONB,                                  -- same shape as topics.cost_breakdown_snapshot
  views_30d INTEGER,
  impressions_30d INTEGER,
  ctr_30d FLOAT,
  avg_view_duration_seconds FLOAT,
  estimated_revenue_usd DECIMAL(10,2),
  traffic_source_breakdown JSONB,
  actual_rpm_usd DECIMAL(6,2),                           -- revenue / (views / 1000)
  rpm_vs_niche_benchmark_pct DECIMAL(6,2),               -- actual vs rpm_benchmarks.rpm_mid
  roi_pct DECIMAL(8,2),
  break_even_achieved BOOLEAN,
  analytics_api_successful BOOLEAN DEFAULT true,         -- false if YouTube API call failed
  analytics_error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(topic_id, snapshot_month)
);

CREATE INDEX IF NOT EXISTS idx_revenue_attribution_project
  ON public.revenue_attribution (project_id, snapshot_month DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_attribution_topic
  ON public.revenue_attribution (topic_id, snapshot_month DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. RLS — anon open
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.niche_health_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_attribution  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY niche_health_history_all ON public.niche_health_history FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY revenue_attribution_all  ON public.revenue_attribution  FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Realtime — niche_health_history drives ProjectsHome badge updates
-- ────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.niche_health_history; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.revenue_attribution;  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.niche_health_history REPLICA IDENTITY FULL;
ALTER TABLE public.revenue_attribution  REPLICA IDENTITY FULL;

COMMIT;

-- ────────────────────────────────────────────────────────────────────────────
-- Rollback:
--
-- BEGIN;
-- DROP TABLE IF EXISTS public.revenue_attribution  CASCADE;
-- DROP TABLE IF EXISTS public.niche_health_history CASCADE;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS revenue_attributed_at;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS break_even_views;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS roi_pct;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS estimated_revenue_30d;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS cost_breakdown_snapshot;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS production_cost_usd;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS yt_analytics_last_pulled_at;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS yt_impressions_30d;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS yt_traffic_source_breakdown;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS niche_health_last_computed_at;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS niche_health_classification;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS niche_health_score;
-- COMMIT;
