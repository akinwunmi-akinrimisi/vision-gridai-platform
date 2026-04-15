-- Migration 017: Audience Memory Layer (Sprint S8 — CF16, FINAL Intelligence sprint)
-- Depends on: 016_analytics_and_niche_health.sql
--
-- The final Intelligence Layer feature: audience intelligence accumulated from
-- YouTube comments, synthesized weekly, injected as {{audience_context}} into
-- Pass 1 of script generation so future videos answer audience questions directly.
--
-- Two-tier storage:
--   audience_comments — per-comment classification (Haiku 4.5)
--   audience_insights — weekly project-scoped synthesis (Opus 4.6)
--
-- Idempotent: safe to re-run.

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. audience_comments — per-comment classification
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audience_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  youtube_video_id VARCHAR(20) NOT NULL,
  youtube_comment_id VARCHAR(40) NOT NULL,                -- YouTube comment resource id for dedup
  author_display_name VARCHAR(100),
  author_channel_id VARCHAR(50),                          -- for persona correlation across videos
  comment_text TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  classification VARCHAR(20),                             -- question | complaint | praise | suggestion | noise
  classification_confidence FLOAT,                        -- 0-1
  extracted_intent TEXT,                                  -- haiku-extracted one-line: the actual question or complaint or idea
  language_hint VARCHAR(10),                              -- 2-letter ISO if detected (e.g., 'en', 'es')
  classified_at TIMESTAMPTZ,
  classified_by VARCHAR(30) DEFAULT 'claude-haiku-4-5-20251001',
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, youtube_comment_id)
);

CREATE INDEX IF NOT EXISTS idx_audience_comments_project_classified
  ON public.audience_comments (project_id, classification, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_audience_comments_unclassified
  ON public.audience_comments (project_id, first_seen_at DESC)
  WHERE classification IS NULL;

CREATE INDEX IF NOT EXISTS idx_audience_comments_topic
  ON public.audience_comments (topic_id, published_at DESC);

DO $$ BEGIN
  ALTER TABLE public.audience_comments
    ADD CONSTRAINT audience_comments_classification_chk
    CHECK (classification IS NULL OR classification IN ('question', 'complaint', 'praise', 'suggestion', 'noise'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. audience_insights — weekly project-scoped synthesis
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audience_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  week_of DATE NOT NULL,                                  -- Sunday date (UTC)
  comments_analyzed INTEGER DEFAULT 0,
  questions_count INTEGER DEFAULT 0,
  complaints_count INTEGER DEFAULT 0,
  praise_count INTEGER DEFAULT 0,
  suggestions_count INTEGER DEFAULT 0,
  noise_count INTEGER DEFAULT 0,
  recurring_questions JSONB,                              -- array of {question, occurrence_count, example_comments: [...]}
  content_complaints JSONB,                               -- array of {complaint, occurrence_count, severity_hint, example_comments}
  topic_suggestions JSONB,                                -- array of {suggested_title, seed_question, demand_signal 0-100}
  audience_persona_summary TEXT,                          -- one paragraph persona
  dominant_persona_traits JSONB,                          -- {prior_knowledge_hints: [...], geographic_hints: [...], interests: [...]}
  vocabulary_level VARCHAR(20),                           -- beginner | intermediate | advanced | mixed
  assumed_prior_knowledge JSONB,                          -- array of concepts audience already knows
  frequent_objections JSONB,                              -- array of common "but what about X?" objections
  audience_context_block TEXT,                            -- pre-rendered {{audience_context}} to inject into Pass 1
  generated_by VARCHAR(30) DEFAULT 'claude-opus-4-6',
  synthesis_cost_usd FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, week_of)
);

CREATE INDEX IF NOT EXISTS idx_audience_insights_project
  ON public.audience_insights (project_id, week_of DESC);

DO $$ BEGIN
  ALTER TABLE public.audience_insights
    ADD CONSTRAINT audience_insights_vocab_chk
    CHECK (vocabulary_level IS NULL OR vocabulary_level IN ('beginner', 'intermediate', 'advanced', 'mixed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. RLS — anon open
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.audience_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_insights ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY audience_comments_all ON public.audience_comments FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY audience_insights_all ON public.audience_insights FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Realtime — insights drive dashboard panel updates; comments is high-volume so skip Realtime
-- ────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.audience_insights; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.audience_insights REPLICA IDENTITY FULL;

COMMIT;

-- ────────────────────────────────────────────────────────────────────────────
-- Script generation integration (NO SCHEMA CHANGE — documented here for reference):
--
-- WF_SCRIPT_GENERATE Pass 1 prompt, before running, should:
--   SELECT audience_context_block FROM audience_insights
--   WHERE project_id = ? ORDER BY week_of DESC LIMIT 1
--   AND inject as {{audience_context}} if non-empty.
-- If no audience_insights row exists (new project), {{audience_context}} is empty.
--
-- Operator wiring: Add a single Code node at the start of WF_SCRIPT_GENERATE's
-- Pass 1 that reads the latest audience_context_block and makes it available
-- to the prompt template.
-- ────────────────────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────────────────────
-- Rollback:
--
-- BEGIN;
-- DROP TABLE IF EXISTS public.audience_insights CASCADE;
-- DROP TABLE IF EXISTS public.audience_comments CASCADE;
-- COMMIT;
