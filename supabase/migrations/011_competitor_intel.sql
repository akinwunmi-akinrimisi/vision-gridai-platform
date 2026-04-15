-- Migration 011: Competitive Intelligence (Sprint S2 — CF04 + CF14)
-- Depends on: 010_intelligence_foundation.sql
--
-- Extends the existing yt_discovery_* infrastructure (Session 30) with
-- ongoing competitor tracking, outlier alerting, and style DNA extraction.
--
--   CF04 Competitor Channel Monitor — daily cron over competitor_channels
--   CF14 Style DNA Extractor        — per-channel title + thumbnail + content analysis
--
-- Per execution-gate decision #5: WF_YOUTUBE_DISCOVERY remains the discovery
-- backbone. competitor_* tables sit ON TOP of (not replacing) yt_discovery_*.
--
-- Idempotent: safe to re-run.

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. competitor_channels — per-project tracked channels
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.competitor_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  channel_id VARCHAR(50) NOT NULL,                  -- YouTube channel ID (UC...)
  channel_name VARCHAR(200),
  channel_url VARCHAR(500),
  channel_handle VARCHAR(100),                      -- @handle if known
  uploads_playlist_id VARCHAR(60),                  -- YouTube uploads playlist (needed for playlistItems.list)
  subscriber_count INTEGER,
  total_video_count INTEGER,
  total_view_count BIGINT,
  avg_views_per_video FLOAT,
  avg_views_30d FLOAT,                              -- rolling 30-day average for outlier denominator
  avg_views_90d FLOAT,                              -- rolling 90-day average
  added_from VARCHAR(30) DEFAULT 'manual',          -- manual | yt_discovery | style_dna
  yt_discovery_result_id UUID,                      -- soft-FK to yt_discovery_results if sourced from discovery
  tracked_since TIMESTAMPTZ DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ,
  last_video_fetched_at TIMESTAMPTZ,
  consecutive_fetch_failures INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_competitor_channels_project
  ON public.competitor_channels (project_id, is_active);

CREATE INDEX IF NOT EXISTS idx_competitor_channels_last_checked
  ON public.competitor_channels (last_checked_at ASC NULLS FIRST)
  WHERE is_active = true;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. competitor_videos — tracked uploads from competitor channels
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.competitor_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_channel_id UUID NOT NULL REFERENCES public.competitor_channels(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,  -- denormalized for faster queries
  youtube_video_id VARCHAR(20) NOT NULL,
  title VARCHAR(500),
  description_snippet TEXT,                         -- first 500 chars only
  thumbnail_url VARCHAR(500),
  published_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  is_shorts BOOLEAN DEFAULT false,
  views_at_discovery INTEGER,
  views_24h INTEGER,
  views_7d INTEGER,
  views_30d INTEGER,
  likes_count INTEGER,
  comments_count INTEGER,
  is_outlier BOOLEAN DEFAULT false,
  outlier_ratio FLOAT,                              -- views_7d / channel.avg_views_30d
  topic_pattern_match BOOLEAN DEFAULT false,        -- does title/desc semantically match any of our pipeline topics?
  matched_topic_id UUID REFERENCES public.topics(id),
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_stats_updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(competitor_channel_id, youtube_video_id)
);

CREATE INDEX IF NOT EXISTS idx_competitor_videos_project_recent
  ON public.competitor_videos (project_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_competitor_videos_outliers
  ON public.competitor_videos (project_id, is_outlier, published_at DESC)
  WHERE is_outlier = true;

CREATE INDEX IF NOT EXISTS idx_competitor_videos_channel
  ON public.competitor_videos (competitor_channel_id, first_seen_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. competitor_alerts — notifications for the dashboard
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.competitor_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  competitor_channel_id UUID REFERENCES public.competitor_channels(id) ON DELETE CASCADE,
  competitor_video_id UUID REFERENCES public.competitor_videos(id) ON DELETE CASCADE,
  alert_type VARCHAR(40) NOT NULL,                  -- outlier_breakout | topic_match | rapid_growth | channel_surge
  severity VARCHAR(10) DEFAULT 'normal',            -- low | normal | high | critical
  title VARCHAR(200),
  message TEXT,
  metadata JSONB,                                   -- alert-type-specific payload
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_alerts_unread
  ON public.competitor_alerts (project_id, created_at DESC)
  WHERE is_read = false AND is_dismissed = false;

CREATE INDEX IF NOT EXISTS idx_competitor_alerts_project
  ON public.competitor_alerts (project_id, created_at DESC);

DO $$ BEGIN
  ALTER TABLE public.competitor_alerts
    ADD CONSTRAINT competitor_alerts_type_chk
    CHECK (alert_type IN ('outlier_breakout', 'topic_match', 'rapid_growth', 'channel_surge', 'style_dna_ready'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.competitor_alerts
    ADD CONSTRAINT competitor_alerts_severity_chk
    CHECK (severity IN ('low', 'normal', 'high', 'critical'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. competitor_intelligence — weekly Claude synthesis per project
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.competitor_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  week_of DATE NOT NULL,                            -- Sunday date for the weekly window
  channels_analyzed INTEGER,
  videos_analyzed INTEGER,
  outlier_breakouts_count INTEGER,
  top_topic_clusters JSONB,                         -- array of {cluster_name, video_count, avg_views}
  emerging_patterns JSONB,                          -- array of {pattern, evidence, recommendation}
  summary_markdown TEXT,                            -- Claude-written weekly digest
  generated_by VARCHAR(30) DEFAULT 'claude-opus-4-6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, week_of)
);

CREATE INDEX IF NOT EXISTS idx_competitor_intel_project
  ON public.competitor_intelligence (project_id, week_of DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. style_profiles — CF14 Style DNA per analyzed channel
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.style_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,  -- nullable: can be project-agnostic
  competitor_channel_id UUID REFERENCES public.competitor_channels(id) ON DELETE SET NULL,
  channel_id VARCHAR(50),                           -- YouTube channel ID for cross-referencing
  channel_url VARCHAR(500),
  channel_name VARCHAR(200),
  title_formulas JSONB,                             -- array of {pattern_name, template, example, frequency_pct, avg_views_when_used, emotional_trigger}
  title_stats JSONB,                                -- {avg_char_count, uses_numbers_pct, starts_with_question_pct, uses_parentheses_pct}
  top_performing_formula_idx INTEGER,
  title_pattern_summary TEXT,
  thumbnail_dna JSONB,                              -- {dominant_colors, text_position, face_presence_pct, dominant_emotion, background_type, text_style, typical_word_count, brand_signature, visual_complexity}
  thumbnail_consistency_score INTEGER,
  thumbnail_visual_summary TEXT,
  content_pillars JSONB,                            -- array of {pillar_name, description, example_titles, pct_of_uploads, avg_views}
  upload_cadence JSONB,                             -- {uploads_per_week, preferred_days, avg_video_length_minutes, length_performance_correlation}
  content_strategy_summary TEXT,
  replication_difficulty VARCHAR(10),               -- easy | medium | hard
  replication_notes TEXT,
  style_summary TEXT,                               -- combined natural-language description
  videos_analyzed INTEGER,
  thumbnails_analyzed INTEGER,
  applied_to_project BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  analysis_cost_usd FLOAT,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_style_profiles_project
  ON public.style_profiles (project_id, analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_style_profiles_channel
  ON public.style_profiles (channel_id);

DO $$ BEGIN
  ALTER TABLE public.style_profiles
    ADD CONSTRAINT style_profiles_replication_chk
    CHECK (replication_difficulty IS NULL OR replication_difficulty IN ('easy', 'medium', 'hard'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. RLS — anon open (matches project dashboard pattern)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.competitor_channels       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_videos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_alerts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_intelligence   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_profiles            ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY competitor_channels_all       ON public.competitor_channels       FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY competitor_videos_all         ON public.competitor_videos         FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY competitor_alerts_all         ON public.competitor_alerts         FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY competitor_intelligence_all   ON public.competitor_intelligence   FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY style_profiles_all            ON public.style_profiles            FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Realtime — alerts + videos are the two dashboard-live tables
-- ────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.competitor_alerts;       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.competitor_videos;       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.competitor_channels;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.style_profiles;          EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.competitor_alerts   REPLICA IDENTITY FULL;
ALTER TABLE public.competitor_videos   REPLICA IDENTITY FULL;
ALTER TABLE public.competitor_channels REPLICA IDENTITY FULL;
ALTER TABLE public.style_profiles      REPLICA IDENTITY FULL;

COMMIT;

-- ────────────────────────────────────────────────────────────────────────────
-- Rollback (run manually if needed):
--
-- BEGIN;
-- DROP TABLE IF EXISTS public.style_profiles          CASCADE;
-- DROP TABLE IF EXISTS public.competitor_intelligence CASCADE;
-- DROP TABLE IF EXISTS public.competitor_alerts       CASCADE;
-- DROP TABLE IF EXISTS public.competitor_videos       CASCADE;
-- DROP TABLE IF EXISTS public.competitor_channels     CASCADE;
-- COMMIT;
