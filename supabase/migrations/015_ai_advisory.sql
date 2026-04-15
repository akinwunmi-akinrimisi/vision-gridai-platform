-- Migration 015: AI Advisory (Sprint S6 — CF08 Daily Ideas + CF09 AI Coach)
-- Depends on: 014_music_settings.sql
--
-- Adds two long-running AI advisory layers:
--   CF08 Daily Ideas — daily cron surfaces 15-20 fresh scored ideas per project,
--                      contextualized by niche + competitor activity + trending keywords.
--   CF09 AI Growth Coach — conversational advisor with session history and project
--                          context injection (competitor alerts, PPS trends, etc.).
--
-- Both use claude-opus-4-6 per locked decision #2.
--
-- Idempotent: safe to re-run.

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. daily_ideas — CF08
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.daily_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  run_date DATE NOT NULL,                              -- the day this batch was generated (one batch per project per day)
  batch_id UUID NOT NULL,                              -- groups all ideas from one generation run
  position_in_batch INTEGER,                           -- 1-20 ranking within the batch
  idea_title VARCHAR(300) NOT NULL,
  idea_angle TEXT,                                     -- the "why this would work" hook
  target_chapters JSONB,                               -- suggested chapter breakdown if idea is promoted
  viral_potential_score INTEGER,                       -- 0-100 predicted outlier energy
  seo_opportunity_score INTEGER,                       -- 0-100 predicted search demand
  rpm_fit_score INTEGER,                               -- 0-100 niche RPM alignment
  combined_score INTEGER,                              -- weighted composite
  rationale TEXT,                                      -- why Claude ranked it where it did
  source_signals JSONB,                                -- {competitor_titles: [...], trending_keywords: [...], recent_topics: [...]}
  related_keywords JSONB,                              -- array of keyword strings
  status VARCHAR(20) DEFAULT 'pending',                -- pending | saved | dismissed | used
  status_changed_at TIMESTAMPTZ,
  used_as_topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_ideas_project_recent
  ON public.daily_ideas (project_id, run_date DESC, position_in_batch ASC);

CREATE INDEX IF NOT EXISTS idx_daily_ideas_pending
  ON public.daily_ideas (project_id, run_date DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_daily_ideas_batch
  ON public.daily_ideas (batch_id);

DO $$ BEGIN
  ALTER TABLE public.daily_ideas
    ADD CONSTRAINT daily_ideas_status_chk
    CHECK (status IN ('pending', 'saved', 'dismissed', 'used'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.daily_ideas
    ADD CONSTRAINT daily_ideas_scores_range_chk
    CHECK (
      (viral_potential_score IS NULL OR viral_potential_score BETWEEN 0 AND 100)
      AND (seo_opportunity_score IS NULL OR seo_opportunity_score BETWEEN 0 AND 100)
      AND (rpm_fit_score IS NULL OR rpm_fit_score BETWEEN 0 AND 100)
      AND (combined_score IS NULL OR combined_score BETWEEN 0 AND 100)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. coach_sessions — CF09 chat threads
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.coach_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title VARCHAR(200),                                  -- auto-derived from first user message if not supplied
  focus_area VARCHAR(30),                              -- optional: 'growth' | 'monetization' | 'competitors' | 'content' | 'general' — guides system prompt framing
  message_count INTEGER DEFAULT 0,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  estimated_cost_usd FLOAT DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_sessions_project_recent
  ON public.coach_sessions (project_id, last_message_at DESC NULLS LAST)
  WHERE is_archived = false;

DO $$ BEGIN
  ALTER TABLE public.coach_sessions
    ADD CONSTRAINT coach_sessions_focus_area_chk
    CHECK (focus_area IS NULL OR focus_area IN ('growth', 'monetization', 'competitors', 'content', 'general'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. coach_messages — individual conversation turns
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.coach_sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,  -- denormalized for RLS + fast queries
  turn_index INTEGER NOT NULL,                         -- 0, 1, 2, ... within the session
  role VARCHAR(12) NOT NULL,                           -- 'user' | 'assistant' | 'system' (rarely persisted for system)
  content TEXT NOT NULL,
  context_snapshot JSONB,                              -- {project_state, competitor_activity, pps_trends, niche_health, recent_topics} snapshot at time of the turn
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd FLOAT,
  claude_model VARCHAR(60) DEFAULT 'claude-opus-4-6',
  stop_reason VARCHAR(30),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_messages_session
  ON public.coach_messages (session_id, turn_index ASC);

DO $$ BEGIN
  ALTER TABLE public.coach_messages
    ADD CONSTRAINT coach_messages_role_chk
    CHECK (role IN ('user', 'assistant', 'system'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. RLS — anon open (dashboard pattern)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.daily_ideas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY daily_ideas_all    ON public.daily_ideas    FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY coach_sessions_all ON public.coach_sessions FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY coach_messages_all ON public.coach_messages FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Realtime — daily_ideas + coach_messages drive live dashboard updates
-- ────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_ideas;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.coach_sessions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.coach_messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.daily_ideas    REPLICA IDENTITY FULL;
ALTER TABLE public.coach_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.coach_messages REPLICA IDENTITY FULL;

COMMIT;

-- ────────────────────────────────────────────────────────────────────────────
-- Rollback:
--
-- BEGIN;
-- DROP TABLE IF EXISTS public.coach_messages CASCADE;
-- DROP TABLE IF EXISTS public.coach_sessions CASCADE;
-- DROP TABLE IF EXISTS public.daily_ideas    CASCADE;
-- COMMIT;
