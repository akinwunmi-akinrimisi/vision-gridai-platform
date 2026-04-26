-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 035 — analysis_groups.country_target
-- ───────────────────────────────────────────────────────────────────────────
-- The General/Australia tab toggle in the dashboard scopes lists by country,
-- but ChannelAnalyzer's analysis_groups table has no country signal —
-- project_id is nullable (channel research can happen before a project is
-- created). Without a country column, every group leaks across both tabs.
--
-- This migration adds a country_target TEXT column with the same enum we
-- use elsewhere ('GENERAL'|'AU'). All existing rows default to 'GENERAL'.
-- The column is NOT NULL with a CHECK so the dashboard never has to
-- coalesce a NULL.
--
-- Single transaction. Idempotent — IF NOT EXISTS guards the ADD COLUMN.
-- ───────────────────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on

BEGIN;

ALTER TABLE analysis_groups
  ADD COLUMN IF NOT EXISTS country_target TEXT NOT NULL DEFAULT 'GENERAL'
    CHECK (country_target IN ('GENERAL','AU'));

CREATE INDEX IF NOT EXISTS idx_analysis_groups_country_target
  ON analysis_groups(country_target);

COMMENT ON COLUMN analysis_groups.country_target IS
  'GENERAL or AU. Independent of project_id (which can be NULL when the group is pre-project research). Default GENERAL — newly inserted groups inherit the dashboard tab active at creation time. Existing rows default to GENERAL; reclassify manually via the ChannelAnalyzer UI rename flow.';

-- ─── Verification (advisory) ────────────────────────────────────────────────
-- SELECT column_name, data_type, column_default FROM information_schema.columns
-- WHERE table_name='analysis_groups' AND column_name='country_target';
-- expect: country_target | text | 'GENERAL'::text

-- SELECT country_target, count(*) FROM analysis_groups GROUP BY 1;
-- expect: GENERAL | <existing row count>; no other values yet.

COMMIT;
