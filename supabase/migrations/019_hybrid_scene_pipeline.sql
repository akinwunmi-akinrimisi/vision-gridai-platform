-- ═══════════════════════════════════════════════════════════════
-- Migration 019: Hybrid Scene Pipeline + Cost Calculator
--
-- Introduces: user-selected image/video ratio, scene classification,
-- Seedance 2.0 Fast I2V for selected scenes, hybrid assembly.
-- Replaces single-track Ken Burns-only pipeline with hybrid:
--   ALL scenes get Seedream 4.5 image → selected % also get I2V clip.
-- ═══════════════════════════════════════════════════════════════

-- 1. Topics: cost calculator columns
ALTER TABLE topics ADD COLUMN IF NOT EXISTS video_ratio TEXT DEFAULT '100_0'
  CHECK (video_ratio IN ('100_0', '95_5', '90_10', '85_15'));
ALTER TABLE topics ADD COLUMN IF NOT EXISTS estimated_image_cost NUMERIC(10,2);
ALTER TABLE topics ADD COLUMN IF NOT EXISTS estimated_video_cost NUMERIC(10,2);
ALTER TABLE topics ADD COLUMN IF NOT EXISTS estimated_total_media_cost NUMERIC(10,2);
ALTER TABLE topics ADD COLUMN IF NOT EXISTS cost_option_selected_at TIMESTAMPTZ;

-- 2. Scenes: hybrid pipeline columns
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS has_video BOOLEAN DEFAULT false;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS video_placement_start_ms INTEGER;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS video_placement_end_ms INTEGER;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS video_clip_url TEXT;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS video_clip_duration_ms INTEGER;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS video_upscaled_url TEXT;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS scene_classification TEXT
  CHECK (scene_classification IN ('motion_required', 'motion_beneficial', 'static_optimal'));
-- classification_reasoning already exists from migration 005 (was dropped in 009)
-- Re-add it since it was removed
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS classification_reasoning TEXT;

-- 3. Update pipeline_stage enum to include cost_selection
-- (pipeline_stage is TEXT with CHECK, need to drop and recreate)
ALTER TABLE topics DROP CONSTRAINT IF EXISTS topics_pipeline_stage_check;
ALTER TABLE topics ADD CONSTRAINT topics_pipeline_stage_check
  CHECK (pipeline_stage IS NULL OR pipeline_stage IN (
    'pending', 'scripting', 'cost_selection', 'tts', 'images',
    'i2v', 'ken_burns', 'color_grade', 'captions', 'assembly',
    'render', 'complete', 'failed'
  ));

-- 4. Cost calculator snapshots (audit trail)
CREATE TABLE IF NOT EXISTS cost_calculator_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_count INTEGER NOT NULL,
  options JSONB NOT NULL,
  selected_option TEXT NOT NULL CHECK (selected_option IN ('100_0', '95_5', '90_10', '85_15')),
  scene_classifications JSONB,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cost_calculator_snapshots ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cost_calculator_snapshots' AND policyname = 'cost_calculator_snapshots_all') THEN
    CREATE POLICY cost_calculator_snapshots_all ON cost_calculator_snapshots FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cost_snapshots_topic ON cost_calculator_snapshots(topic_id);

-- 5. Update projects table: new model defaults
-- Seedream 4.0 → 4.5, add Seedance 2.0 Fast
ALTER TABLE projects ALTER COLUMN image_model SET DEFAULT 'fal-ai/bytedance/seedream/v4.5/text-to-image';
ALTER TABLE projects ALTER COLUMN image_cost SET DEFAULT 0.040;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS i2v_model TEXT DEFAULT 'fal-ai/bytedance/seedance-2.0/fast/image-to-video';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS i2v_cost_per_second NUMERIC(6,4) DEFAULT 0.2419;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS i2v_clip_duration_seconds INTEGER DEFAULT 10;

-- 6. Realtime + REPLICA IDENTITY for dashboard live updates
ALTER PUBLICATION supabase_realtime ADD TABLE cost_calculator_snapshots;

-- Rollback:
-- DROP TABLE IF EXISTS cost_calculator_snapshots;
-- ALTER TABLE topics DROP COLUMN IF EXISTS video_ratio, DROP COLUMN IF EXISTS estimated_image_cost, DROP COLUMN IF EXISTS estimated_video_cost, DROP COLUMN IF EXISTS estimated_total_media_cost, DROP COLUMN IF EXISTS cost_option_selected_at;
-- ALTER TABLE scenes DROP COLUMN IF EXISTS has_video, DROP COLUMN IF EXISTS video_placement_start_ms, DROP COLUMN IF EXISTS video_placement_end_ms, DROP COLUMN IF EXISTS video_clip_url, DROP COLUMN IF EXISTS video_clip_duration_ms, DROP COLUMN IF EXISTS video_upscaled_url, DROP COLUMN IF EXISTS scene_classification, DROP COLUMN IF EXISTS classification_reasoning;
