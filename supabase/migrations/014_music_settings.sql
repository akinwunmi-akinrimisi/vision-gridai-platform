-- Migration 014: Music Preferences (Sprint S5 — CF07)
-- Depends on: 013_prediction_engine.sql
--
-- Adds per-project music generation preferences. Pipeline already has:
--   - WF_MUSIC_GENERATE (Vertex AI Lyria) — composes per-video tracks
--   - music_library table (migration 004) — optional user-uploaded tracks
--   - FFmpeg voice ducking at volume=0.12 inside WF_CAPTIONS_ASSEMBLY / WF_SHORTS_ASSEMBLY
--
-- What was missing: per-project preferences to toggle music on/off, override
-- the auto-derived mood, and tune voice-ducking volume without touching the
-- workflow JSON.
--
-- Per locked decision: Sprint S5 was sized at 1-2 hrs since the heavy lifting
-- already exists. This migration adds only the preference columns.
--
-- Idempotent: safe to re-run.

BEGIN;

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS music_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS music_volume FLOAT DEFAULT 0.12;           -- ducked volume under voice; 0.05-0.25 practical range
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS music_mood_override VARCHAR(30);           -- NULL = auto-derive from script; else: cinematic|upbeat|somber|tense|inspirational|ambient|epic|mysterious
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS music_source VARCHAR(20) DEFAULT 'lyria';  -- 'lyria' (AI-generated per video) | 'library' (pick from music_library) | 'auto' (lyria with library fallback)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS music_prefs_updated_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE public.projects
    ADD CONSTRAINT projects_music_volume_range_chk
    CHECK (music_volume IS NULL OR (music_volume BETWEEN 0.0 AND 1.0));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.projects
    ADD CONSTRAINT projects_music_source_chk
    CHECK (music_source IS NULL OR music_source IN ('lyria', 'library', 'auto'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.projects
    ADD CONSTRAINT projects_music_mood_override_chk
    CHECK (
      music_mood_override IS NULL
      OR music_mood_override IN (
        'cinematic', 'upbeat', 'somber', 'tense', 'inspirational',
        'ambient', 'epic', 'mysterious'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;

-- ────────────────────────────────────────────────────────────────────────────
-- Rollback:
--
-- BEGIN;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS music_prefs_updated_at;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS music_source;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS music_mood_override;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS music_volume;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS music_enabled;
-- COMMIT;
