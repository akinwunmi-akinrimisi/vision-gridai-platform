-- 041_pipeline_stage_paused.sql
-- Adds 'paused' to topics.pipeline_stage CHECK constraint so we can halt a
-- topic mid-pipeline (without losing its current-stage context) and gate
-- orchestrators from picking it back up until manually resumed.
--
-- Triggered by session 2026-05-07 halt of topic 4 (Australia vs Norway) after
-- discovering the 4-bug image-routing failure. PATCH to pipeline_stage='paused'
-- was rejected by topics_pipeline_stage_check until this migration.
--
-- Flow extension:
--   any stage → paused → (manual resume) → original stage

ALTER TABLE topics DROP CONSTRAINT IF EXISTS topics_pipeline_stage_check;

ALTER TABLE topics ADD CONSTRAINT topics_pipeline_stage_check CHECK (
  pipeline_stage IS NULL OR pipeline_stage = ANY (ARRAY[
    'pending',
    'scripting',
    'cost_selection',
    'register_selection',
    'classifying',
    'tts',
    'images',
    'i2v',
    'ken_burns',
    'color_grade',
    'captions',
    'assembly',
    'render',
    'complete',
    'failed',
    'paused'
  ])
);
