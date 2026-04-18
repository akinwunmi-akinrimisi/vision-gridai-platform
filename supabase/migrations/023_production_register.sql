-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 023 — Production Register (Sprint R1)
-- ───────────────────────────────────────────────────────────────────────────
-- Adds Register-gate columns per the "Three-Layer Visual Architecture"
-- defined in video_production/README.md. Runs AFTER Cost Calculator gate.
--
-- Flow: Gate 2 Script Approve → pipeline_stage='cost_selection' →
--       CostCalculator (picks mode) → pipeline_stage='register_selection' →
--       RegisterSelector (picks register) → pipeline_stage='classifying' →
--       WF_SCENE_CLASSIFY → pipeline_stage='tts' → production
--
-- video_ratio (existing '100_0'/'95_5'/'90_10'/'85_15') is the DB-internal
-- form used by WF_SCENE_CLASSIFY math. production_mode is the user-facing
-- label (PURE_STATIC/LIGHT_MOTION/BALANCED/KINETIC). Both stored for clarity.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── topics: Register selection state ───────────────────────────────────────
ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS production_mode TEXT
    CHECK (production_mode IN ('PURE_STATIC','LIGHT_MOTION','BALANCED','KINETIC')),
  ADD COLUMN IF NOT EXISTS production_register TEXT
    CHECK (production_register IN ('REGISTER_01_ECONOMIST','REGISTER_02_PREMIUM','REGISTER_03_NOIR','REGISTER_04_SIGNAL','REGISTER_05_ARCHIVE')),
  ADD COLUMN IF NOT EXISTS register_recommendations JSONB,
  ADD COLUMN IF NOT EXISTS register_selected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS register_era_detected TEXT,
  ADD COLUMN IF NOT EXISTS register_analyzed_at TIMESTAMPTZ;

COMMENT ON COLUMN topics.production_mode IS
  'User-facing label matching video_ratio: PURE_STATIC=100_0, LIGHT_MOTION=95_5, BALANCED=90_10, KINETIC=85_15';

COMMENT ON COLUMN topics.register_recommendations IS
  'JSONB from WF_REGISTER_ANALYZE: {analyzed_at, top_2: [{register_id, confidence, reasoning, reference_channels}], all_5_ranked: [...], era_detected}';

COMMENT ON COLUMN topics.register_era_detected IS
  'For REGISTER_05_ARCHIVE sub-LUT selection: one of 1920s|1960s|1980s|2000s|modern';

-- ── scenes: per-scene register stamp (written by WF_SCENE_CLASSIFY) ────────
ALTER TABLE scenes
  ADD COLUMN IF NOT EXISTS production_register TEXT;

COMMENT ON COLUMN scenes.production_register IS
  'Copied from topics.production_register by WF_SCENE_CLASSIFY. Downstream workflows read this to inject register-specific prompts/motion/grade/fonts.';

CREATE INDEX IF NOT EXISTS idx_scenes_register ON scenes(topic_id, production_register);
