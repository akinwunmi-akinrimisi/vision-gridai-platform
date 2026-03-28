-- ═══════════════════════════════════════════════════
-- Vision GridAI Platform — Cinematic Fields Migration
-- Adds Ken Burns, color grading, transitions, composition to scenes
-- ═══════════════════════════════════════════════════

-- Add cinematic fields to scenes table
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS color_mood TEXT DEFAULT 'full_natural';
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS zoom_direction TEXT DEFAULT 'in';
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS caption_highlight_word TEXT;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS transition_to_next TEXT DEFAULT 'crossfade';
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS b_roll_insert TEXT;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS composition_prefix TEXT;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS selective_color_element TEXT;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'pending';

-- Set all existing scenes to static_image (backwards compat — no more I2V/T2V)
UPDATE scenes SET visual_type = 'static_image' WHERE visual_type IS NULL OR visual_type != 'static_image';

-- Add pipeline_stage to topics for resume capability
ALTER TABLE topics ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'pending';
-- Values: pending | scripting | tts | images | ken_burns | color_grade | captions | assembly | render | complete | failed
