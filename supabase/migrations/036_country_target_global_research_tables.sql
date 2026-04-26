-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 036 — country_target on the remaining global-research tables
-- ───────────────────────────────────────────────────────────────────────────
-- Three tables drive the dashboard's global research/discovery pages
-- (Niche Research → /youtube-discovery, Research → /research). They have
-- no country signal, so the General/AU tab toggle leaks across them:
--
--   research_runs       — has project_id but useLatestRun/useAllRuns are global
--   yt_discovery_runs   — no project_id, no country
--   yt_video_analyses   — no project_id, no country
--
-- This migration adds country_target to all three with the same enum we use
-- elsewhere ('GENERAL'|'AU'). For research_runs we backfill from the joined
-- project's country_target where present; remaining NULLs (legacy or
-- orphaned runs) default to 'GENERAL'. yt_discovery_runs and
-- yt_video_analyses default everything to 'GENERAL' — the operator can
-- reclassify by re-running discovery from the AU tab.
--
-- Single transaction. Idempotent — IF NOT EXISTS guards every ADD COLUMN.
-- ───────────────────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on

BEGIN;

-- ─── research_runs ──────────────────────────────────────────────────────────

ALTER TABLE research_runs
  ADD COLUMN IF NOT EXISTS country_target TEXT NOT NULL DEFAULT 'GENERAL'
    CHECK (country_target IN ('GENERAL','AU'));

-- Backfill from the joined project's country_target. Runs whose project
-- is missing or has GENERAL stay at the default.
UPDATE research_runs r
   SET country_target = p.country_target
  FROM projects p
 WHERE r.project_id = p.id
   AND p.country_target IS NOT NULL
   AND p.country_target IN ('GENERAL','AU')
   AND r.country_target = 'GENERAL'
   AND p.country_target <> 'GENERAL';

CREATE INDEX IF NOT EXISTS idx_research_runs_country_target
  ON research_runs(country_target);

COMMENT ON COLUMN research_runs.country_target IS
  'Denormalized from projects.country_target at insert time. Inserted by WF_RESEARCH_ORCHESTRATOR (and the dashboard run-research mutation) using the active dashboard tab. Backfilled in migration 036 from the joined project where present.';

-- ─── yt_discovery_runs ──────────────────────────────────────────────────────

ALTER TABLE yt_discovery_runs
  ADD COLUMN IF NOT EXISTS country_target TEXT NOT NULL DEFAULT 'GENERAL'
    CHECK (country_target IN ('GENERAL','AU'));

CREATE INDEX IF NOT EXISTS idx_yt_discovery_runs_country_target
  ON yt_discovery_runs(country_target);

COMMENT ON COLUMN yt_discovery_runs.country_target IS
  'Set at insert time from the active dashboard tab. yt_discovery_runs has no project_id (it is a niche-keyword discovery tool independent of any project), so this column is the only way to keep General/AU tabs separated.';

-- ─── yt_video_analyses ──────────────────────────────────────────────────────

ALTER TABLE yt_video_analyses
  ADD COLUMN IF NOT EXISTS country_target TEXT NOT NULL DEFAULT 'GENERAL'
    CHECK (country_target IN ('GENERAL','AU'));

CREATE INDEX IF NOT EXISTS idx_yt_video_analyses_country_target
  ON yt_video_analyses(country_target);

COMMENT ON COLUMN yt_video_analyses.country_target IS
  'Set at insert time from the active dashboard tab. Independent of any project. The dashboard analyse-video mutation passes country_target from useCountryTab.';

-- ─── Verification (advisory) ────────────────────────────────────────────────
-- SELECT 'research_runs' AS t, country_target, count(*) FROM research_runs GROUP BY 1,2
-- UNION ALL SELECT 'yt_discovery_runs', country_target, count(*) FROM yt_discovery_runs GROUP BY 1,2
-- UNION ALL SELECT 'yt_video_analyses', country_target, count(*) FROM yt_video_analyses GROUP BY 1,2
-- ORDER BY 1,2;

COMMIT;
