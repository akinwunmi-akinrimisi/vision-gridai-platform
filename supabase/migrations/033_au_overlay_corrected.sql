-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 033 — Australia Country Overlay (CORRECTED)
-- ───────────────────────────────────────────────────────────────────────────
-- Supersedes 032_au_overlay.sql (never applied — see GAP-AUDIT doc).
-- Differences from 032:
--   G1: Adds CREATE TABLE prompt_templates (was missing live)
--   G2: Renames live render_project_intelligence → _render_project_intelligence_v2
--       and creates new TEXT-returning wrapper that appends country paragraphs
--   G3: All 4 country slot placeholders use single-brace {var} not double
--   G4: Does NOT replace _verify_script_template_vars (live signature
--       differs); callers pass extended allowlist instead
--   G9: Topics country_target defaults to literal 'GENERAL' (no backfill
--       JOIN against the just-added projects column)
--   G11: ALTER analysis_groups ADD COLUMN swot_payload JSONB
--
-- Single transaction. ON_ERROR_STOP recommended. Rollback via the preflight
-- snapshot in /tmp/au_overlay_preflight_<DATE>.sql.
-- ───────────────────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION A — Schema additions to existing tables
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS country_target TEXT NOT NULL DEFAULT 'GENERAL'
    CHECK (country_target IN ('GENERAL','AU')),
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en-US',
  ADD COLUMN IF NOT EXISTS channel_type TEXT NOT NULL DEFAULT 'standalone'
    CHECK (channel_type IN ('standalone','hub','spoke')),
  ADD COLUMN IF NOT EXISTS parent_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_ceiling_usd NUMERIC(6,2);

CREATE INDEX IF NOT EXISTS idx_projects_country_target ON projects(country_target);
CREATE INDEX IF NOT EXISTS idx_projects_parent ON projects(parent_project_id) WHERE parent_project_id IS NOT NULL;

ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS country_target TEXT NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS gap_score NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS gap_score_modifiers JSONB,
  ADD COLUMN IF NOT EXISTS required_disclaimers TEXT[],
  ADD COLUMN IF NOT EXISTS demonetization_audit_result JSONB,
  ADD COLUMN IF NOT EXISTS compliance_review_status TEXT NOT NULL DEFAULT 'not_required'
    CHECK (compliance_review_status IN ('not_required','pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS next_video_directives JSONB;

CREATE INDEX IF NOT EXISTS idx_topics_country_target ON topics(country_target);
CREATE INDEX IF NOT EXISTS idx_topics_gap_score ON topics(gap_score DESC) WHERE gap_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_topics_compliance_review ON topics(compliance_review_status) WHERE compliance_review_status = 'pending';

-- G11: analysis_groups SWOT payload column
ALTER TABLE analysis_groups
  ADD COLUMN IF NOT EXISTS swot_payload JSONB;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION B — New tables
-- ═══════════════════════════════════════════════════════════════════════════

-- G1: prompt_templates does not exist live; create it
CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL,
  template_key TEXT NOT NULL,
  body_text TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_compliance_role BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_type, template_key)
);

ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prompt_templates_anon_deny ON prompt_templates;
CREATE POLICY prompt_templates_anon_deny ON prompt_templates AS RESTRICTIVE FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS prompt_templates_service ON prompt_templates;
CREATE POLICY prompt_templates_service ON prompt_templates FOR ALL TO service_role USING (true);

COMMENT ON TABLE prompt_templates IS
  'Catalogue of prompt fragments: disclaimers (template_type=disclaimer), composition prefixes (template_type=composition), universal negatives (template_type=negative). The PromptCard UI surfaces these for editing; rows with requires_compliance_role=true require a "Type CONFIRM" modal before save.';

CREATE TABLE IF NOT EXISTS niche_variants (
  country_target TEXT NOT NULL,
  value TEXT NOT NULL,
  display_name TEXT NOT NULL,
  default_register TEXT NOT NULL,
  fallback_register TEXT NOT NULL,
  cpm_band_usd JSONB NOT NULL,
  q4_peak_usd JSONB,
  demonetization_risk TEXT NOT NULL CHECK (demonetization_risk IN ('low','medium','medium-high','high')),
  priority TEXT NOT NULL CHECK (priority IN ('P0','P1','P2')),
  required_disclaimer_ids TEXT[],
  PRIMARY KEY (country_target, value),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE niche_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS niche_variants_anon_deny ON niche_variants;
CREATE POLICY niche_variants_anon_deny ON niche_variants AS RESTRICTIVE FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS niche_variants_service ON niche_variants;
CREATE POLICY niche_variants_service ON niche_variants FOR ALL TO service_role USING (true);

CREATE TABLE IF NOT EXISTS country_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_target TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  recurrence TEXT,
  affected_sub_niches TEXT[],
  publish_within_hours INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_country_calendar_lookup ON country_calendar_events(country_target, scheduled_at);

ALTER TABLE country_calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS country_calendar_anon_deny ON country_calendar_events;
CREATE POLICY country_calendar_anon_deny ON country_calendar_events AS RESTRICTIVE FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS country_calendar_service ON country_calendar_events;
CREATE POLICY country_calendar_service ON country_calendar_events FOR ALL TO service_role USING (true);

CREATE TABLE IF NOT EXISTS country_compliance_rules (
  rule_id TEXT NOT NULL,
  country_target TEXT NOT NULL,
  trigger_jsonpath TEXT,
  required_elements JSONB,
  blocked_phrases TEXT[],
  severity TEXT NOT NULL CHECK (severity IN ('blocker','warning','manual_review')),
  description TEXT,
  PRIMARY KEY (rule_id, country_target),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE country_compliance_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ccr_anon_deny ON country_compliance_rules;
CREATE POLICY ccr_anon_deny ON country_compliance_rules AS RESTRICTIVE FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS ccr_service ON country_compliance_rules;
CREATE POLICY ccr_service ON country_compliance_rules FOR ALL TO service_role USING (true);

CREATE TABLE IF NOT EXISTS coach_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  country_target TEXT NOT NULL,
  report_jsonb JSONB NOT NULL,
  cost_usd NUMERIC(6,4),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coach_reports_project ON coach_reports(project_id, report_period_start DESC);

ALTER TABLE coach_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coach_reports_anon_deny ON coach_reports;
CREATE POLICY coach_reports_anon_deny ON coach_reports AS RESTRICTIVE FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS coach_reports_service ON coach_reports;
CREATE POLICY coach_reports_service ON coach_reports FOR ALL TO service_role USING (true);

COMMENT ON TABLE coach_reports IS
  'Monthly strategic coach reports per project. Distinct from coach_messages/coach_sessions (which belong to a different feature). Populated by WF_COACH_REPORT cron 1st of month.';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION C — production_registers.config.tts_voice_by_country (sibling key)
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE production_registers SET config = config || jsonb_build_object('tts_voice_by_country', jsonb_build_object('GENERAL', config->>'tts_voice', 'AU', 'en-AU-Studio-N')), updated_at = now() WHERE register_id = 'REGISTER_01_ECONOMIST';
UPDATE production_registers SET config = config || jsonb_build_object('tts_voice_by_country', jsonb_build_object('GENERAL', config->>'tts_voice', 'AU', 'en-AU-Studio-O')), updated_at = now() WHERE register_id = 'REGISTER_02_PREMIUM';
UPDATE production_registers SET config = config || jsonb_build_object('tts_voice_by_country', jsonb_build_object('GENERAL', config->>'tts_voice', 'AU', 'en-AU-Studio-N')), updated_at = now() WHERE register_id = 'REGISTER_03_NOIR';
UPDATE production_registers SET config = config || jsonb_build_object('tts_voice_by_country', jsonb_build_object('GENERAL', config->>'tts_voice', 'AU', 'en-AU-Chirp3-HD-Aoede')), updated_at = now() WHERE register_id = 'REGISTER_04_SIGNAL';
UPDATE production_registers SET config = config || jsonb_build_object('tts_voice_by_country', jsonb_build_object('GENERAL', config->>'tts_voice', 'AU', 'en-AU-Studio-O')), updated_at = now() WHERE register_id = 'REGISTER_05_ARCHIVE';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION D — AU image_anchors keys on Registers 01, 02, 04 (objects already)
-- (Reg 03 + Reg 05 not extended — Reg 05's image_anchors is a string, uses
--  image_anchors_by_era for variants per the v3 plan)
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE production_registers
SET config = jsonb_set(config, '{image_anchors}',
  COALESCE(config->'image_anchors', '{}'::jsonb) ||
  jsonb_build_object(
    'credit_cards_au', 'editorial documentary photography featuring Australian financial subjects (card products on dark marble or leather surfaces, QFF or Velocity branded materials suggested but not reproduced, Sydney Harbour or Melbourne skyline context where relevant), natural cinematic lighting with single-source directional key, shallow depth of field, muted controlled-warmth palette with selective amber on gold card chip details, subtle 35mm film grain, rule-of-thirds composition preserving negative space for overlay typography, analytical editorial grading, documentary photorealism, hands holding cards or figures from behind only',
    'super_au', 'editorial documentary photography featuring Australian retirement and workplace contexts (office settings, mature professionals in silhouette, Australian currency, retirement imagery in golden hour), natural cinematic lighting with warm directional key, medium-shallow depth of field, muted neutral palette with earth-tone bias, subtle 35mm film grain, horizontal composition with generous negative space, institutional editorial grading, documentary photorealism, subjects as silhouettes or hands only',
    'property_mortgage_au', 'editorial architectural photography featuring Australian residential property (federation terraces, modern apartments, suburban family homes, Australian suburban streetscapes, Sydney or Melbourne or Brisbane context), natural golden-hour daylight with warm directional rake, medium depth of field preserving architectural detail, warm earth-tone and blue-sky palette, subtle 35mm grain, horizontal sky-ground composition, professional real-estate editorial grading, documentary photorealism',
    'tax_au', 'editorial documentary photography featuring Australian administrative and professional contexts (ATO-evocative but never reproducing logos, tax documents, calculators, mid-career professionals in silhouette, Canberra or corporate settings), cool-neutral institutional lighting, medium depth of field, muted desaturated palette with blue-gray bias, subtle 35mm grain, formal rule-of-thirds composition, institutional editorial grading, documentary photorealism',
    'etf_investing_au', 'editorial documentary photography featuring Australian market and trading contexts (ASX-evocative trading floor imagery, stock ticker displays, laptops with chart overlays, mature investors in silhouette), natural studio lighting with cool-neutral key, medium-shallow depth of field, muted controlled-warmth palette with selective blue accent on data-adjacent elements, subtle 35mm grain, architectural composition, analytical editorial grading, documentary photorealism'
  )
), updated_at = now()
WHERE register_id = 'REGISTER_01_ECONOMIST';

UPDATE production_registers
SET config = jsonb_set(config, '{image_anchors}',
  COALESCE(config->'image_anchors', '{}'::jsonb) ||
  jsonb_build_object(
    'credit_cards_au', 'luxury editorial photography featuring Australian travel and premium card contexts (metal credit card against dark marble, Qantas Chairman lounge-evocative interiors, business class airline seats, first class lounges, Sydney Harbour or Uluru or Great Barrier Reef destinations), cinematic natural lighting with strong directional warm key, extreme shallow depth of field with creamy bokeh, warm tungsten and amber highlights, 85mm lens Leica M aesthetic, Kodak Portra 400 color palette, subtle film grain, golden hour favored, aspirational cinematic atmosphere',
    'property_mortgage_au', 'luxury architectural photography featuring premium Australian residential contexts (waterfront Sydney harbour properties, Toorak mansions, Gold Coast penthouses, modern architectural homes), natural golden-hour daylight with warm directional rake, medium-shallow depth of field preserving architectural detail, rich earth-tone and warm-neutral palette, 35-85mm lens, Kodak Portra 400 palette, subtle film grain, aspirational real-estate editorial aesthetic'
  )
), updated_at = now()
WHERE register_id = 'REGISTER_02_PREMIUM';

UPDATE production_registers
SET config = jsonb_set(config, '{image_anchors}',
  COALESCE(config->'image_anchors', '{}'::jsonb) ||
  jsonb_build_object(
    'etf_investing_au', 'clean modern fintech photography featuring Australian trading and platform contexts (macro shots of broker app interfaces evocative but not reproducing specific branding, ASX ticker-style displays, modern open-plan professional settings), cool blue-dominant lighting with selective warm amber accent rim, deep blue-black atmospheric shadows, extreme shallow depth of field, tack-sharp focus with subtle bloom, minimalist composition, Apple keynote aesthetic with Blade Runner 2049 sensibility, futuristic cinematic still'
  )
), updated_at = now()
WHERE register_id = 'REGISTER_04_SIGNAL';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION E — niche_variants seeds (5 AU sub-niches)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO niche_variants (country_target, value, display_name, default_register, fallback_register, cpm_band_usd, q4_peak_usd, demonetization_risk, priority, required_disclaimer_ids) VALUES
  ('AU', 'credit_cards_au',      'Australian Credit Cards & Points',  'REGISTER_02_PREMIUM',   'REGISTER_01_ECONOMIST', '{"min":28,"max":42}'::jsonb, '{"min":45,"max":65}'::jsonb, 'medium',      'P0', ARRAY['AU:AD-04']),
  ('AU', 'super_au',             'Australian Superannuation',         'REGISTER_01_ECONOMIST', 'REGISTER_01_ECONOMIST', '{"min":22,"max":32}'::jsonb, '{"min":25,"max":35}'::jsonb, 'medium-high', 'P0', ARRAY['AU:AD-01']),
  ('AU', 'property_mortgage_au', 'Australian Property & Mortgages',   'REGISTER_01_ECONOMIST', 'REGISTER_02_PREMIUM',   '{"min":25,"max":38}'::jsonb, '{"min":28,"max":42}'::jsonb, 'medium-high', 'P1', ARRAY['AU:AD-01','AU:AD-02']),
  ('AU', 'tax_au',               'Australian Tax Strategy',           'REGISTER_01_ECONOMIST', 'REGISTER_01_ECONOMIST', '{"min":18,"max":28}'::jsonb, '{"min":20,"max":32}'::jsonb, 'low',         'P1', ARRAY[]::TEXT[]),
  ('AU', 'etf_investing_au',     'Australian ETF & Share Investing',  'REGISTER_01_ECONOMIST', 'REGISTER_04_SIGNAL',    '{"min":20,"max":30}'::jsonb, '{"min":22,"max":33}'::jsonb, 'medium',      'P2', ARRAY['AU:AD-01','AU:AD-02'])
ON CONFLICT (country_target, value) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  default_register = EXCLUDED.default_register,
  fallback_register = EXCLUDED.fallback_register,
  cpm_band_usd = EXCLUDED.cpm_band_usd,
  q4_peak_usd = EXCLUDED.q4_peak_usd,
  demonetization_risk = EXCLUDED.demonetization_risk,
  priority = EXCLUDED.priority,
  required_disclaimer_ids = EXCLUDED.required_disclaimer_ids,
  updated_at = now();

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION F — Disclaimer seeds (prompt_templates rows — table now exists)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO prompt_templates (template_type, template_key, body_text, version, is_active, requires_compliance_role, description) VALUES
  ('disclaimer', 'AU:AD-01',
$BODY$This video contains general information only and does not constitute personal financial advice. It does not take into account your objectives, financial situation, or needs. Before making any financial decision, consider whether the information is appropriate for your circumstances and consider seeking advice from a licensed financial adviser.$BODY$,
   1, true, true, 'AU general advice warning (verbatim, ASIC RG 244 alignment)'),
  ('disclaimer', 'AU:AD-02',
$BODY$Past performance is not a reliable indicator of future performance. Investments can go down as well as up.$BODY$,
   1, true, true, 'AU past performance disclaimer (verbatim)'),
  ('disclaimer', 'AU:AD-03',
$BODY$Some of the links in this description are affiliate links. CardMath may earn a commission from qualifying purchases at no cost to you. This does not influence our editorial coverage.$BODY$,
   1, true, false, 'AU affiliate disclosure (verbatim, YouTube policy alignment)'),
  ('disclaimer', 'AU:AD-04',
$BODY$Interest rates shown are {rate}% p.a. Comparison rate: {comparison_rate}% p.a. based on {warning_amount} over {warning_term}. Warning: This comparison rate applies only to the example given and may not include all fees and charges.$BODY$,
   1, true, true, 'AU credit card comparison rate (NCCP template — single-brace runtime substitution)')
ON CONFLICT (template_type, template_key) DO UPDATE SET
  body_text = EXCLUDED.body_text,
  version = prompt_templates.version + 1,
  is_active = true,
  requires_compliance_role = EXCLUDED.requires_compliance_role,
  updated_at = now();

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION G — Country calendar seeds
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO country_calendar_events (country_target, event_type, event_name, scheduled_at, recurrence, affected_sub_niches, publish_within_hours, metadata) VALUES
  ('AU', 'eofy',              'EOFY (Australian Financial Year End)',  DATE '2026-06-30' + TIME '23:59',  'annual_jun_30',  ARRAY['super_au','tax_au','property_mortgage_au'], 24, '{}'::jsonb),
  ('AU', 'fy_start',          'New AU Financial Year',                 DATE '2026-07-01' + TIME '00:00',  'annual_jul_01',  ARRAY['super_au','tax_au'],                          24, '{}'::jsonb),
  ('AU', 'federal_budget',    'Federal Budget (next scheduled)',       DATE '2026-05-12' + TIME '19:30',  'annual_may',     ARRAY['super_au','tax_au','property_mortgage_au'],    4, '{"speech_window_local":"19:30 AEST"}'::jsonb),
  ('AU', 'hecs_indexation',   'HECS/HELP Indexation Announcement',     DATE '2026-06-01' + TIME '00:01',  'annual_jun_01',  ARRAY['tax_au'],                                       4, '{}'::jsonb),
  ('AU', 'q4_window_open',    'Q4 CPM peak window opens',              DATE '2026-10-01' + TIME '00:00',  'annual_oct_01',  ARRAY['credit_cards_au'],                             24, '{"action":"prioritize_credit_card_videos"}'::jsonb),
  ('AU', 'black_friday',      'Black Friday',                          DATE '2026-11-27' + TIME '00:00',  'annual_friday_after_thanksgiving', ARRAY['credit_cards_au'],          24, '{}'::jsonb)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION H — Compliance rules seeds
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO country_compliance_rules (rule_id, country_target, trigger_jsonpath, required_elements, blocked_phrases, severity, description) VALUES
  ('au_asic_general_advice',  'AU', 'niche_variant IN (super_au, property_mortgage_au, etf_investing_au)',
   '["general_advice_warning_title_card_in_first_10s","full_afsl_disclaimer_in_description","no_personal_financial_advice_language"]'::jsonb,
   ARRAY['you should buy','I recommend','guaranteed returns','risk-free','this will make you money'],
   'blocker', 'ASIC RG 244 — general advice warning required for super/property/ETF content'),
  ('au_credit_nccp', 'AU', 'niche_variant = credit_cards_au',
   '["comparison_rate_disclosure_when_mentioning_rates","target_market_determination_awareness"]'::jsonb,
   ARRAY['guaranteed approval','no credit check'],
   'blocker', 'NCCP — credit card comparison rate disclosures'),
  ('au_property_promotion', 'AU', 'niche_variant = property_mortgage_au',
   '["historical_volatility_acknowledgment","not_personal_advice_framing"]'::jsonb,
   ARRAY['passive income','financial freedom','replace your salary','guaranteed capital growth'],
   'blocker', 'Property promotion compliance — no get-rich-quick framing'),
  ('au_bnpl_avoidance', 'AU', 'primary_keyword MATCHES (afterpay|zip|klarna|humm|bnpl|buy now pay later)',
   '[]'::jsonb, ARRAY[]::TEXT[],
   'manual_review', 'BNPL content is both ASIC-scrutinized and YouTube-ad-policy-risky')
ON CONFLICT (rule_id, country_target) DO UPDATE SET
  trigger_jsonpath = EXCLUDED.trigger_jsonpath,
  required_elements = EXCLUDED.required_elements,
  blocked_phrases = EXCLUDED.blocked_phrases,
  severity = EXCLUDED.severity,
  description = EXCLUDED.description;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION I — Renderer extension (G2 — corrected)
-- ───────────────────────────────────────────────────────────────────────────
-- Step 1: Rename live render_project_intelligence → _render_project_intelligence_v2
-- Step 2: Create new public render_project_intelligence that wraps v2 + appends
--         country-specific TEXT paragraphs when project country_target = 'AU'.
-- Both functions return TEXT (live shape preserved).
-- ═══════════════════════════════════════════════════════════════════════════

-- Rename only if not already renamed (idempotency for re-runs)
DO $RENAME$
DECLARE
  v2_exists boolean;
  pub_exists boolean;
  pub_body text;
BEGIN
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname='_render_project_intelligence_v2') INTO v2_exists;
  IF v2_exists THEN
    -- Already renamed; nothing to do
    RAISE NOTICE 'Section I: _render_project_intelligence_v2 already exists, skipping rename';
  ELSE
    -- Capture and re-create with new name; cannot ALTER FUNCTION RENAME because
    -- the current public function is named identically to what we want to keep.
    -- Strategy: get definition, replace name, execute, then drop original.
    SELECT pg_get_functiondef(oid) INTO pub_body
    FROM pg_proc WHERE proname='render_project_intelligence';
    IF pub_body IS NOT NULL THEN
      EXECUTE replace(pub_body, 'public.render_project_intelligence', 'public._render_project_intelligence_v2');
      DROP FUNCTION public.render_project_intelligence(uuid, text);
      RAISE NOTICE 'Section I: renamed live render_project_intelligence to _render_project_intelligence_v2';
    ELSE
      RAISE NOTICE 'Section I: no live render_project_intelligence found; will create v3 only';
    END IF;
  END IF;
END;
$RENAME$;

-- New public render_project_intelligence v3 — wraps v2, appends country paragraphs
CREATE OR REPLACE FUNCTION render_project_intelligence(p_project_id UUID, p_stage TEXT DEFAULT 'all')
RETURNS TEXT AS $RENDER$
DECLARE
  base_text TEXT := '';
  v_country_target TEXT;
  v_compliance TEXT := '';
  v_terminology TEXT := '';
  v_calendar TEXT := '';
  v_demonetization TEXT := '';
  v_appendix TEXT := '';
BEGIN
  -- Pull base v2 output if present (fallback to empty for fresh installs)
  BEGIN
    SELECT _render_project_intelligence_v2(p_project_id, p_stage) INTO base_text;
  EXCEPTION WHEN undefined_function THEN
    base_text := '';
  END;

  SELECT country_target INTO v_country_target FROM projects WHERE id = p_project_id;

  IF v_country_target IS NULL OR v_country_target = 'GENERAL' THEN
    RETURN COALESCE(base_text, '');
  END IF;

  -- AU (or future) — build the country appendix as TEXT
  SELECT COALESCE(
    E'\n\n=== REGULATORY COMPLIANCE RULES ===\n' ||
    string_agg(format(E'• %s [%s]: %s', rule_id, severity, description), E'\n'),
    ''
  ) INTO v_compliance
  FROM country_compliance_rules WHERE country_target = v_country_target;

  v_terminology := CASE v_country_target
    WHEN 'AU' THEN E'\n\n=== AUSTRALIAN ENGLISH TERMINOLOGY ===\n' ||
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

  SELECT COALESCE(
    E'\n\n=== UPCOMING CALENDAR EVENTS (next 90 days) ===\n' ||
    string_agg(
      format(E'• %s on %s (affects: %s; publish window: %s hours)',
             event_name, scheduled_at::DATE,
             array_to_string(affected_sub_niches, ', '),
             COALESCE(publish_within_hours::TEXT, 'no urgency')),
      E'\n'
    ), ''
  ) INTO v_calendar
  FROM country_calendar_events
  WHERE country_target = v_country_target
    AND scheduled_at > now() AND scheduled_at < now() + interval '90 days';

  SELECT COALESCE(
    E'\n\n=== PROHIBITED PHRASES (any occurrence triggers Gate-3 block) ===\n' ||
    string_agg(format(E'• %s: %s — %s', rule_id, array_to_string(blocked_phrases, ', '), description), E'\n'),
    ''
  ) INTO v_demonetization
  FROM country_compliance_rules
  WHERE country_target = v_country_target
    AND severity = 'blocker'
    AND blocked_phrases IS NOT NULL AND array_length(blocked_phrases, 1) > 0;

  v_appendix := v_compliance || v_terminology || v_calendar || v_demonetization;

  RETURN COALESCE(base_text, '') || v_appendix;
END;
$RENDER$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION render_project_intelligence(UUID, TEXT) IS
  'v3 — wraps _render_project_intelligence_v2 (the live v2 renamed) and appends country-specific paragraphs (compliance, terminology, calendar, demonetization) when project country_target != GENERAL. Returns TEXT (same shape as v2). For GENERAL projects, output is byte-identical to pre-v3.';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION J — _verify_script_template_vars (G4 — DO NOT REPLACE)
-- ───────────────────────────────────────────────────────────────────────────
-- Live signature is _verify_script_template_vars(text[]) returning TABLE.
-- We deliberately do NOT replace it. CI callers must pass the extended
-- allowlist that includes the 4 new country slot keys.
-- ═══════════════════════════════════════════════════════════════════════════

-- No-op section — preserved as a marker for the audit trail.
-- The 4 new placeholders that callers must whitelist when verifying:
--   country_compliance_block, country_terminology_block,
--   country_calendar_context, country_demonetization_constraints.

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION K — Append 4 single-brace country slots to General master prompts
-- (G3 — single-brace, not double)
-- ═══════════════════════════════════════════════════════════════════════════

-- Live system_prompts has UNIQUE(prompt_type) (one active row per type, no
-- history). Update in place instead of insert+deactivate. Idempotent because
-- of the LIKE check.
DO $APPEND$
DECLARE
  r RECORD;
  v_appendix TEXT := E'\n\n{country_compliance_block}\n\n{country_terminology_block}\n\n{country_calendar_context}\n\n{country_demonetization_constraints}';
BEGIN
  FOR r IN
    SELECT id, prompt_type, prompt_text, version
    FROM system_prompts
    WHERE prompt_type IN ('script_pass1','script_pass2','script_pass3','script_evaluator','topic_generator_master','script_system_prompt')
      AND is_active = true
  LOOP
    IF r.prompt_text NOT LIKE '%{country_compliance_block}%' THEN
      UPDATE system_prompts
      SET prompt_text = r.prompt_text || v_appendix,
          version     = COALESCE(r.version, 1) + 1,
          is_active   = true,
          description = 'v' || (COALESCE(r.version, 1) + 1) || ' — added 4 country slot variables (single-brace) for AU overlay (migration 033)',
          updated_at  = now()
      WHERE id = r.id;
    END IF;
  END LOOP;
END;
$APPEND$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION L — 14 new AU prompts (single-brace placeholders)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO system_prompts (prompt_type, prompt_text, version, is_active, description) VALUES
  ('topic_discover_au', $BODY$[SYSTEM ROLE]
You are a Senior YouTube Content Strategist with 12 years of specialization in Australian personal finance content. You understand the ATO, ASIC, RBA policy cycles, the Big 4 bank product landscape, the Qantas/Velocity loyalty ecosystem, the AU super fund landscape, and the state-by-state distinctions in property tax and first-home-buyer schemes. You write in Australian English and never confuse AU products or rules with US or UK equivalents.

[TASK]
Generate 20 candidate topics distributed per the provided sub-niche weights. For each topic provide: working_title, primary_keyword, secondary_keywords, sub_niche, proposed_register, content_format, au_entities, estimated_monthly_search_au, search_trend, competitor_gap, time_sensitivity, priority_hint, demonetization_risk, cross_subniche_synergy.

(Full prompt body in Australia/CARDMATH_AU_IMPLEMENTATION_PROMPTS_v1.md §3.1)

{country_compliance_block}
{country_terminology_block}
{country_calendar_context}
$BODY$, 1, true, 'AU daily topic discovery (P-TOPIC-AU-DISCOVER-v1)'),

  ('topic_event_au', $BODY$[SYSTEM ROLE]
You are a Senior Broadcast News Producer specializing in Australian financial news.

[TASK]
Generate 8 topic candidates responding to {EVENT_TYPE}. Each tackles a distinct angle. Distribute across affected sub-niches. Include explainer + demographic_impact + action_checklist + myth_buster framings. Range in depth: 2 short-form, 4 medium, 2 long. Publishable within 4 hours.

{country_compliance_block}
{country_terminology_block}
{country_calendar_context}
$BODY$, 1, true, 'AU event-trigger topic generator (P-TOPIC-AU-EVENT-v1)'),

  ('gap_score_au', $BODY$[SYSTEM ROLE]
Competitive Content Analyst.

[TASK]
gap_score = (search_volume × cpm_band) / (incumbent_coverage_depth × incumbent_authority)

Modifiers: speed_moat (+20%), matrix_moat (+15%), state_moat (+10%), long_tail_moat (+25%), synthesis_moat (+10%).

Decision: pass (>=40), refine (20-39), discard (<20). Sub-niche overrides: ETF >=50; tax >=30.

Return: base_gap_score, modifiers_applied, final_gap_score, decision, rationale, refinement_suggestions.
$BODY$, 1, true, 'AU Gate-1 gap-score calculator (P-GAP-SCORE-v1)'),

  ('register_classify_au_addendum', $BODY$APPEND TO EXISTING WF_REGISTER_ANALYZE PROMPT WHEN country_target='AU':

For AU topics, classify niche_variant:
- credit_cards_au — AU credit card products, QFF, Velocity, Amex AU
- super_au — AU superannuation
- property_mortgage_au — AU property and mortgages
- tax_au — ATO, AU tax strategy
- etf_investing_au — ASX ETFs, AU brokers
- primary — generic fallback
$BODY$, 1, true, 'AU sub-niche classifier addendum'),

  ('demon_audit_au', $BODY$[SYSTEM ROLE]
Senior Compliance Officer (ASIC RG 244, NCCP, YouTube AFC). Last checkpoint before publish.

[TASK]
Run every check in country_compliance_rules. Return:
- overall_decision: clear | manual_review_required | block
- violations / warnings / clears arrays
- approved_for_publish boolean

Any blocker → block. BNPL primary topic → manual_review_required.

{country_compliance_block}
{country_demonetization_constraints}
$BODY$, 1, true, 'AU demonetization audit (P-DEMON-AUDIT-AU-v1)'),

  ('swot_channel_au', $BODY$[SYSTEM ROLE]
Competitive Intelligence Analyst.

[TASK]
Analyze a single competitor channel. Return per Strategy Plan §8.1: tier, sub_niche, top_10_videos, content_pillars, strengths, weaknesses, competitive_threat_score, avoidance_topics, gap_topics.
$BODY$, 1, true, 'AU per-channel SWOT (P-SWOT-CHANNEL-v1)'),

  ('swot_subniche_au', $BODY$[SYSTEM ROLE]
Senior Content Strategy Director.

[TASK]
Synthesize 5-10 channel analyses into per-Strategy §8.2 sub-niche SWOT. Prioritize 2-4 moat_actions for next 30 days (specific, measurable, timeframed).
$BODY$, 1, true, 'AU sub-niche SWOT synthesis (P-SWOT-SUBNICHE-v1)'),

  ('retention_analyze_au', $BODY$[SYSTEM ROLE]
Senior Video Analytics Specialist.

[TASK]
Identify drop-off events (>3pp/5s), surge events, chapter performance, recommendations. Diagnosis: weak_hook, setup_too_slow, pacing_lull, retention_cliff, cta_chasm.

[AU-SPECIFIC]
Disclaimer scenes naturally cause drops; >5pp at disclaimer = recommend moving earlier.
$BODY$, 1, true, 'AU post-publish retention analyzer (P-RETENTION-ANALYZE-v1)'),

  ('coach_monthly_au', $BODY$[SYSTEM ROLE]
Senior YouTube Growth Strategist — CardMath AU monthly coach.

[TASK]
Sections: executive_summary, performance_review, sub_niche_performance, competitor_moves_of_note, next_month_calendar_priorities, directives (5-10 with owner/deadline/metric).

Always flag Q4 (Oct) and EOFY (May) as priority anchors.

{country_calendar_context}
$BODY$, 1, true, 'AU monthly coach report (P-COACH-MONTHLY-AU-v1)'),

  ('seo_title_au', $BODY$[SYSTEM ROLE]
YouTube Title Specialist for AU finance content.

[TASK]
3 title variants for A/B. Each 50-70 chars, includes primary keyword + AU geotag + year when year-specific.
Patterns: credit_cards_au curiosity+numbers; super_au factual+year; property_mortgage_au question+state; tax_au practical+year; etf_investing_au comparison+specificity.

{country_terminology_block}
$BODY$, 1, true, 'AU title variants (P-SEO-TITLE-AU-v1)'),

  ('seo_desc_au', $BODY$[SYSTEM ROLE]
YouTube SEO Description Specialist (AU + ASIC compliant).

[TASK]
1500-2500 chars. Hook (2-3 sent + primary keyword), summary (4-6 sent + 2-3 secondary keywords), chapters MM:SS, links with affiliate disclosure, disclaimer block (verbatim from disclaimer_library), 3 hashtags including AU token.

{country_compliance_block}
{country_terminology_block}
$BODY$, 1, true, 'AU description generator (P-SEO-DESC-AU-v1)'),

  ('seo_tags_au', $BODY$[SYSTEM ROLE]
YouTube Tag Optimization Specialist.

[TASK]
12-20 tags within 500-char ceiling: 1-2 exact primary + 3-5 variants + 3-5 secondary + 2-3 AU entities + 2-3 broad niche + 1-2 regulatory. ≥1 Australia/AU/Aussie tag. ≥1 year tag.
$BODY$, 1, true, 'AU tags generator (P-SEO-TAGS-AU-v1)'),

  ('thumb_concept_au', $BODY$[SYSTEM ROLE]
YouTube Thumbnail Designer for AU finance content.

[TASK]
3 thumbnail concepts. Each: hero_description, text_overlay (3-4 words), color_accent_hex, predicted_ctr_bucket, variant_type, rationale.
Style by register: REG 01 chart-evocative amber; REG 02 luxury gold; REG 03 dark red; REG 04 cool blue cyan; REG 05 sepia.
$BODY$, 1, true, 'AU thumbnail concepts (P-THUMB-CONCEPT-AU-v1)'),

  ('thumb_prompt_au', $BODY$[SYSTEM ROLE]
Image Prompt Engineer (Seedream 4.5).

[TASK]
Output Fal.ai payload: prompt with thumbnail composition prefix reserving negative space; negative_prompt = Universal Negative + register additions + "text, typography, readable words, logos"; image_size: landscape_16_9; num_images: 1.

[AU-SPECIFIC]
No ATO/ASIC/APRA/RBA/Big 4 bank/Qantas logo reproduction. Evocative only.
$BODY$, 1, true, 'AU thumbnail Seedream prompt (P-THUMB-PROMPT-AU-v1)')

ON CONFLICT (prompt_type) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  version = system_prompts.version + 1,
  is_active = true,
  description = EXCLUDED.description,
  updated_at = now();

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION M — Verification queries (advisory; comment out after verifying)
-- ═══════════════════════════════════════════════════════════════════════════

-- After commit run:
-- SELECT count(*) FROM niche_variants WHERE country_target = 'AU';                  -- expect 5
-- SELECT count(*) FROM prompt_templates WHERE template_key LIKE 'AU:%';              -- expect 4
-- SELECT count(*) FROM country_calendar_events WHERE country_target = 'AU';          -- expect ≥6
-- SELECT count(*) FROM country_compliance_rules WHERE country_target = 'AU';         -- expect 4
-- SELECT count(*) FROM system_prompts WHERE prompt_type LIKE '%_au%' AND is_active;  -- expect 14 (incl. register_classify_au_addendum)
-- SELECT count(*) FROM system_prompts WHERE is_active AND prompt_text LIKE '%{country_compliance_block}%';  -- expect ≥6 (5 General masters + many AU prompts)
-- SELECT proname FROM pg_proc WHERE proname IN ('render_project_intelligence','_render_project_intelligence_v2'); -- expect 2

COMMIT;
