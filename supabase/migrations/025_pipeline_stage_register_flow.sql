-- 025_pipeline_stage_register_flow.sql
-- Extends topics.pipeline_stage CHECK constraint with the register-flow values
-- shipped in session 38 (see migration 023 header comments). Session 38 added
-- the cost/register gates + WF_SCENE_CLASSIFY handoff but never updated the
-- check constraint, so `register_selection` and `classifying` were rejected
-- at the DB layer.
--
-- Flow: Gate 2 Script Approve → cost_selection → register_selection →
--       classifying → tts → ... → complete

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
    'failed'
  ])
);
