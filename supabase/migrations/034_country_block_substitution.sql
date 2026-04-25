-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 034 — Country block substitution (Option A)
-- ───────────────────────────────────────────────────────────────────────────
-- Closes the design gap left by 033 where master prompts gained the
-- placeholders { country_compliance_block / country_terminology_block /
-- country_calendar_context / country_demonetization_constraints } but no
-- code substituted them. The renderer (033 §I) ALSO appended the same
-- prose as a TEXT block, causing duplication for AU projects when both
-- paths fired.
--
-- This migration:
--   1. Adds render_country_blocks(country_target) → JSONB returning the
--      4 sections as named keys, suitable for in-prompt substitution.
--   2. Simplifies render_project_intelligence to wrap v2 only (drops the
--      country appendix). Country blocks now flow exclusively through
--      placeholder substitution in WF_COUNTRY_ROUTER.Build Result.
--
-- Single transaction. Idempotent — safe to re-run.
-- ───────────────────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION A — render_country_blocks RPC
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION render_country_blocks(p_country_target TEXT)
RETURNS JSONB AS $BLOCKS$
DECLARE
  v_compliance      TEXT := '';
  v_terminology     TEXT := '';
  v_calendar        TEXT := '';
  v_demonetization  TEXT := '';
BEGIN
  IF p_country_target IS NULL OR p_country_target = 'GENERAL' THEN
    RETURN jsonb_build_object(
      'country_compliance_block', '',
      'country_terminology_block', '',
      'country_calendar_context', '',
      'country_demonetization_constraints', ''
    );
  END IF;

  -- Compliance rules (all severities, formatted with rule_id + severity tag)
  SELECT COALESCE(
    E'=== REGULATORY COMPLIANCE RULES ===\n' ||
    string_agg(format(E'• %s [%s]: %s', rule_id, severity, description), E'\n'),
    ''
  ) INTO v_compliance
  FROM country_compliance_rules
  WHERE country_target = p_country_target;

  -- Terminology — currently AU only; extend by adding WHEN clauses
  v_terminology := CASE p_country_target
    WHEN 'AU' THEN
      E'=== AUSTRALIAN ENGLISH TERMINOLOGY ===\n' ||
      E'• "superannuation" not "retirement fund"\n' ||
      E'• "franking credits" not "dividend tax credits"\n' ||
      E'• "stamp duty" not "transfer tax"\n' ||
      E'• "novated lease" not "salary-sacrifice car lease"\n' ||
      E'• "HECS-HELP" not "student loan"\n' ||
      E'• "tax file number" not "SSN"\n' ||
      E'• "Medicare" not "national health"\n' ||
      E'• AUD currency (never USD); reference ATO/ASIC/RBA/ASX/APRA by full name'
    ELSE ''
  END;

  -- Upcoming calendar events (next 90 days from now)
  SELECT COALESCE(
    E'=== UPCOMING CALENDAR EVENTS (next 90 days) ===\n' ||
    string_agg(
      format(
        E'• %s on %s (affects: %s; publish window: %s hours)',
        event_name,
        scheduled_at::DATE,
        array_to_string(affected_sub_niches, ', '),
        COALESCE(publish_within_hours::TEXT, 'no urgency')
      ),
      E'\n'
    ),
    ''
  ) INTO v_calendar
  FROM country_calendar_events
  WHERE country_target = p_country_target
    AND scheduled_at > now()
    AND scheduled_at < now() + interval '90 days';

  -- Prohibited phrases (blocker rules with non-empty blocked_phrases)
  SELECT COALESCE(
    E'=== PROHIBITED PHRASES (any occurrence triggers Gate-3 block) ===\n' ||
    string_agg(
      format(E'• %s: %s — %s', rule_id, array_to_string(blocked_phrases, ', '), description),
      E'\n'
    ),
    ''
  ) INTO v_demonetization
  FROM country_compliance_rules
  WHERE country_target = p_country_target
    AND severity = 'blocker'
    AND blocked_phrases IS NOT NULL
    AND array_length(blocked_phrases, 1) > 0;

  RETURN jsonb_build_object(
    'country_compliance_block',          v_compliance,
    'country_terminology_block',         v_terminology,
    'country_calendar_context',          v_calendar,
    'country_demonetization_constraints', v_demonetization
  );
END;
$BLOCKS$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION render_country_blocks(TEXT) IS
  'Returns the 4 country-specific prompt slot values as a JSONB object with keys country_compliance_block, country_terminology_block, country_calendar_context, country_demonetization_constraints. For GENERAL or NULL country, returns empty strings (substitution is a no-op). Used by WF_COUNTRY_ROUTER.Build Result to substitute placeholders into active master prompts.';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION B — Simplify render_project_intelligence (drop country appendix)
-- ───────────────────────────────────────────────────────────────────────────
-- Country prose is now exclusively substituted into master-prompt placeholders
-- via render_country_blocks() inside WF_COUNTRY_ROUTER. The renderer wraps
-- _render_project_intelligence_v2 unchanged (project-level intel).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION render_project_intelligence(p_project_id UUID, p_stage TEXT DEFAULT 'all')
RETURNS TEXT AS $RENDER$
DECLARE
  base_text TEXT := '';
BEGIN
  BEGIN
    SELECT _render_project_intelligence_v2(p_project_id, p_stage) INTO base_text;
  EXCEPTION WHEN undefined_function THEN
    base_text := '';
  END;

  RETURN COALESCE(base_text, '');
END;
$RENDER$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION render_project_intelligence(UUID, TEXT) IS
  'v3.1 (migration 034) — thin wrapper around _render_project_intelligence_v2. Returns project-level intelligence only. Country-specific prose (compliance/terminology/calendar/demonetization) is NO LONGER appended here; it flows through master-prompt {country_*} placeholders substituted by render_country_blocks() inside WF_COUNTRY_ROUTER. This avoids duplication when both the renderer and the router are in the call path. Pre-034 behavior: appended country appendix as TEXT for AU projects.';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION M — Verification (advisory)
-- ═══════════════════════════════════════════════════════════════════════════

-- After commit run:
-- SELECT render_country_blocks('GENERAL') = jsonb_build_object('country_compliance_block','','country_terminology_block','','country_calendar_context','','country_demonetization_constraints','') AS general_returns_empty;  -- expect t
-- SELECT jsonb_object_keys(render_country_blocks('AU')) ORDER BY 1;  -- expect 4 keys
-- SELECT length(render_country_blocks('AU')->>'country_compliance_block') > 0 AS au_compliance_present;  -- expect t (4 rules in country_compliance_rules)
-- SELECT length(render_country_blocks('AU')->>'country_terminology_block') > 0 AS au_terminology_present;  -- expect t
-- SELECT length(render_country_blocks('AU')->>'country_demonetization_constraints') > 0 AS au_demon_present;  -- expect t (3 rules with blocked_phrases)

COMMIT;
