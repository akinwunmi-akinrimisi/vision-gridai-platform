-- ═══════════════════════════════════════════════════════════════
-- Migration 026: analysis_groups counter maintenance via triggers
--
-- Fixes denormalization drift in analysis_groups:
--   channels_count, completed_count — were only bumped by the frontend
--     useStartAnalysis hook. Channels added via useConfirmDeepAnalysis
--     (confirmed from discovered_channels) never touched the counter.
--     completed_count was never bumped at all.
--   has_viability_report, viability_score — never touched anywhere.
--
-- These triggers recompute counts and viability flags from source-of-truth
-- tables on every mutation, making the summary columns self-healing.
--
-- Also renames entry_difficulty_* → entry_ease_* on niche_viability_reports
-- (this rename was applied directly to the live DB without a migration —
-- captured here retroactively so fresh deploys match production).
-- ═══════════════════════════════════════════════════════════════

-- 1. Retroactive column rename on niche_viability_reports (idempotent)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'niche_viability_reports' AND column_name = 'entry_difficulty_score') THEN
    ALTER TABLE niche_viability_reports RENAME COLUMN entry_difficulty_score TO entry_ease_score;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'niche_viability_reports' AND column_name = 'entry_difficulty_breakdown') THEN
    ALTER TABLE niche_viability_reports RENAME COLUMN entry_difficulty_breakdown TO entry_ease_breakdown;
  END IF;
END $$;

-- 2. Trigger function: maintain channels_count + completed_count on analysis_groups
CREATE OR REPLACE FUNCTION sync_analysis_group_counters()
RETURNS TRIGGER AS $$
DECLARE
  affected_group_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_group_id := OLD.analysis_group_id;
  ELSE
    affected_group_id := NEW.analysis_group_id;
  END IF;

  IF affected_group_id IS NOT NULL THEN
    UPDATE analysis_groups
    SET channels_count = (
          SELECT COUNT(*) FROM channel_analyses
          WHERE analysis_group_id = affected_group_id
        ),
        completed_count = (
          SELECT COUNT(*) FROM channel_analyses
          WHERE analysis_group_id = affected_group_id AND status = 'completed'
        ),
        updated_at = now()
    WHERE id = affected_group_id;
  END IF;

  -- If UPDATE moved row between groups, sync the OLD group too.
  IF TG_OP = 'UPDATE' AND OLD.analysis_group_id IS DISTINCT FROM NEW.analysis_group_id
     AND OLD.analysis_group_id IS NOT NULL THEN
    UPDATE analysis_groups
    SET channels_count = (
          SELECT COUNT(*) FROM channel_analyses
          WHERE analysis_group_id = OLD.analysis_group_id
        ),
        completed_count = (
          SELECT COUNT(*) FROM channel_analyses
          WHERE analysis_group_id = OLD.analysis_group_id AND status = 'completed'
        ),
        updated_at = now()
    WHERE id = OLD.analysis_group_id;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_analysis_group_counters ON channel_analyses;
CREATE TRIGGER trg_sync_analysis_group_counters
  AFTER INSERT OR UPDATE OR DELETE ON channel_analyses
  FOR EACH ROW EXECUTE FUNCTION sync_analysis_group_counters();

-- 3. Trigger function: maintain has_viability_report + viability_score
CREATE OR REPLACE FUNCTION sync_analysis_group_viability()
RETURNS TRIGGER AS $$
DECLARE
  affected_group_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_group_id := OLD.analysis_group_id;
  ELSE
    affected_group_id := NEW.analysis_group_id;
  END IF;

  IF affected_group_id IS NOT NULL THEN
    UPDATE analysis_groups
    SET has_viability_report = EXISTS (
          SELECT 1 FROM niche_viability_reports
          WHERE analysis_group_id = affected_group_id
        ),
        viability_score = (
          SELECT viability_score FROM niche_viability_reports
          WHERE analysis_group_id = affected_group_id
          ORDER BY created_at DESC LIMIT 1
        ),
        updated_at = now()
    WHERE id = affected_group_id;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_analysis_group_viability ON niche_viability_reports;
CREATE TRIGGER trg_sync_analysis_group_viability
  AFTER INSERT OR UPDATE OR DELETE ON niche_viability_reports
  FOR EACH ROW EXECUTE FUNCTION sync_analysis_group_viability();

-- 4. Backfill existing rows (fixes all drift from before triggers existed)
UPDATE analysis_groups g
SET channels_count = COALESCE((
      SELECT COUNT(*) FROM channel_analyses WHERE analysis_group_id = g.id
    ), 0),
    completed_count = COALESCE((
      SELECT COUNT(*) FROM channel_analyses
      WHERE analysis_group_id = g.id AND status = 'completed'
    ), 0),
    has_viability_report = EXISTS (
      SELECT 1 FROM niche_viability_reports WHERE analysis_group_id = g.id
    ),
    viability_score = (
      SELECT viability_score FROM niche_viability_reports
      WHERE analysis_group_id = g.id
      ORDER BY created_at DESC LIMIT 1
    ),
    updated_at = now();

-- Rollback:
-- DROP TRIGGER IF EXISTS trg_sync_analysis_group_counters ON channel_analyses;
-- DROP TRIGGER IF EXISTS trg_sync_analysis_group_viability ON niche_viability_reports;
-- DROP FUNCTION IF EXISTS sync_analysis_group_counters();
-- DROP FUNCTION IF EXISTS sync_analysis_group_viability();
