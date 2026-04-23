-- ═══════════════════════════════════════════════════════════════
-- Migration 027: Viability assessment progress tracking
--
-- Adds phase/status columns so the dashboard can show a progress bar
-- and surface errors during the ~3-minute Claude Opus analysis.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE analysis_groups
  ADD COLUMN IF NOT EXISTS viability_phase TEXT,
  ADD COLUMN IF NOT EXISTS viability_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS viability_error TEXT;

COMMENT ON COLUMN analysis_groups.viability_phase IS
  'Current phase of viability workflow: idle | validating | aggregating | analyzing | writing_report | linking | done | failed';
COMMENT ON COLUMN analysis_groups.viability_started_at IS
  'Set by WF_NICHE_VIABILITY when a new run begins. Used to compute elapsed time for the progress bar.';
COMMENT ON COLUMN analysis_groups.viability_error IS
  'Populated when viability_phase=failed. Includes raw Claude response preview when JSON parse fails.';

-- Rollback:
-- ALTER TABLE analysis_groups DROP COLUMN IF EXISTS viability_phase,
--   DROP COLUMN IF EXISTS viability_started_at, DROP COLUMN IF EXISTS viability_error;
