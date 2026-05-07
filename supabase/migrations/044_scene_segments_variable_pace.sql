-- 044_scene_segments_variable_pace.sql
-- Adds scene_segments table for variable-pace image rotation (5/8/12s by emotional_beat).
--
-- Architecture: each scene's audio is the master clock. After TTS produces audio_duration_ms,
-- WF_BUILD_SEGMENTS splits each scene into N segments of target duration based on emotional_beat:
--   data | revelation        -> 5s   (data-dense, viewer needs visual changes to anchor specifics)
--   hook | tension | story   -> 8s   (default narrative pacing — Wendover/Polymatter baseline)
--   resolution | transition  -> 12s  (contemplative beats, let the viewer sit with the frame)
--
-- N = ceil(audio_duration_ms / (target_seconds * 1000)). Segments distribute the total audio
-- duration evenly (each segment.duration_ms ~= audio_duration_ms / N) so audio + visuals stay
-- in lockstep. Captions are word-level (Whisper) and burn over the final concat — automatic sync.
--
-- The scene-level image_prompt / image_url / clip_url columns become legacy/fallback after this
-- migration. New production iterates scene_segments, not scenes, for image gen + Ken Burns.
-- Topic 4 (already shipped) does not get retroactive segments — it stays on the legacy 1-image-per-scene
-- model. Forward-only.

CREATE TABLE IF NOT EXISTS scene_segments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id                 UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  topic_id                 UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  project_id               UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Position within the scene
  segment_number           INTEGER NOT NULL,                                    -- 1-based
  start_offset_ms          INTEGER NOT NULL,                                    -- ms from start of scene's audio
  duration_ms              INTEGER NOT NULL,                                    -- target 5000 / 8000 / 12000 (last segment may differ)

  -- Narration excerpt (the proportional slice of scene's narration_text for this 5/8/12s window)
  narration_excerpt        TEXT,

  -- Visual generation (mirrors scene-level fields but at segment grain)
  image_prompt             TEXT,
  key_visual_anchor        TEXT,
  requires_text_rendering  BOOLEAN DEFAULT false,
  image_url                TEXT,
  image_drive_id           TEXT,
  image_model              TEXT,
  image_cost_usd           DECIMAL(8,5),
  image_status             TEXT DEFAULT 'pending',     -- pending | uploaded | failed

  -- Per-segment Ken Burns clip (silent, duration_ms long)
  clip_url                 TEXT,
  clip_status              TEXT DEFAULT 'pending',     -- pending | uploaded | failed

  -- Forensic
  error_log                TEXT,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT scene_segments_unique UNIQUE (scene_id, segment_number),
  CONSTRAINT scene_segments_image_status_check CHECK (image_status IN ('pending', 'uploaded', 'failed')),
  CONSTRAINT scene_segments_clip_status_check CHECK (clip_status IN ('pending', 'uploaded', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_scene_segments_scene ON scene_segments(scene_id);
CREATE INDEX IF NOT EXISTS idx_scene_segments_topic ON scene_segments(topic_id);
CREATE INDEX IF NOT EXISTS idx_scene_segments_image_status ON scene_segments(topic_id, image_status);
CREATE INDEX IF NOT EXISTS idx_scene_segments_clip_status ON scene_segments(topic_id, clip_status);

-- Enable Realtime for dashboard subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE scene_segments;
ALTER TABLE scene_segments REPLICA IDENTITY FULL;

-- Add a flag on scenes table to mark whether the topic uses segments (forward-only).
-- NULL or false = legacy 1-image-per-scene model (topic 4 stays here).
-- true = uses scene_segments rows for image gen + Ken Burns.
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS uses_segments BOOLEAN DEFAULT false;

-- Add columns on topics for segment-pacing telemetry
ALTER TABLE topics ADD COLUMN IF NOT EXISTS segment_count INTEGER;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS avg_segment_duration_ms INTEGER;
