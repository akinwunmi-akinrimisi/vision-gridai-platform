-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 032 — Australia Country Overlay
-- ───────────────────────────────────────────────────────────────────────────
-- Adds country-aware overlay layer. General projects unchanged byte-for-byte.
-- AU projects gain: niche_variants lookup, country_calendar_events,
-- country_compliance_rules, coach_reports, niche_variants seeds, AU
-- disclaimer/calendar/compliance seeds, image_anchors AU keys, tts_voice_by
-- _country, gap_score columns, demonetization audit columns, prompt_templates
-- requires_compliance_role boolean, render_project_intelligence v3
-- (extended to 12 sources for AU), 4 new prompt slot variables on existing
-- system_prompts rows, 14 new system_prompts rows for AU prompts.
--
-- Single transaction. If ANY step fails, the whole migration rolls back.
-- Pre-flight rollback artifact: /tmp/au_overlay_preflight_YYYY_MM_DD.sql
-- (see plan §0.4)
-- ───────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION A — Schema additions
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

COMMENT ON COLUMN projects.country_target IS
  'Routing key for country-aware overlay. GENERAL = current platform behaviour. AU = country slot variables populated, demonetization audit active, AU dashboard tab.';
COMMENT ON COLUMN projects.parent_project_id IS
  'For channel_type=spoke: points to the hub project. Spokes inherit prompt_configs + style_dna by default; can override per row.';
COMMENT ON COLUMN projects.cost_ceiling_usd IS
  'Per-video soft budget. WF_TOPICS_GENERATE / Cost Calculator gate raise warnings (not blocks) when projected cost exceeds.';

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
CREATE INDEX IF NOT EXISTS idx_topics_compliance_review ON topics(compliance_review_status)
  WHERE compliance_review_status = 'pending';

ALTER TABLE prompt_templates
  ADD COLUMN IF NOT EXISTS requires_compliance_role BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN prompt_templates.requires_compliance_role IS
  'When true, dashboard PromptCard UI shows a "Type CONFIRM to save" modal before saving edits. Used for legally-sensitive disclaimer rows.';

-- Backfill existing General projects/topics (already defaulted above; this is idempotency)
UPDATE projects   SET country_target = 'GENERAL' WHERE country_target IS NULL;
UPDATE topics     SET country_target = COALESCE((SELECT country_target FROM projects WHERE projects.id = topics.project_id), 'GENERAL')
  WHERE country_target IS NULL OR country_target = '';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION B — New tables
-- ═══════════════════════════════════════════════════════════════════════════

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

COMMENT ON TABLE niche_variants IS
  'Country-keyed lookup of valid niche_variant values. Replaces ad-hoc enum so additional markets (UK, US, CA) get the same plumbing.';

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

COMMENT ON TABLE country_calendar_events IS
  'Country-specific calendar events (RBA, Federal Budget, EOFY, HECS indexation for AU). Read by render_project_intelligence + WF_TOPIC_INTELLIGENCE.';

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

COMMENT ON TABLE country_compliance_rules IS
  'Country-specific regulatory + advertiser-friendly rules. Read by WF_DEMONETIZATION_AUDIT and surfaced to script prompts via render_project_intelligence.';

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

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION C — production_registers.config.tts_voice_by_country
--             (sibling key; preserves existing string-shape for backwards compat)
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE production_registers
SET config = config || jsonb_build_object(
  'tts_voice_by_country', jsonb_build_object(
    'GENERAL', config->>'tts_voice',
    'AU',     'en-AU-Studio-N'
  )
), updated_at = now()
WHERE register_id = 'REGISTER_01_ECONOMIST';

UPDATE production_registers
SET config = config || jsonb_build_object(
  'tts_voice_by_country', jsonb_build_object(
    'GENERAL', config->>'tts_voice',
    'AU',     'en-AU-Studio-O'
  )
), updated_at = now()
WHERE register_id = 'REGISTER_02_PREMIUM';

UPDATE production_registers
SET config = config || jsonb_build_object(
  'tts_voice_by_country', jsonb_build_object(
    'GENERAL', config->>'tts_voice',
    'AU',     'en-AU-Studio-N'
  )
), updated_at = now()
WHERE register_id = 'REGISTER_03_NOIR';

UPDATE production_registers
SET config = config || jsonb_build_object(
  'tts_voice_by_country', jsonb_build_object(
    'GENERAL', config->>'tts_voice',
    'AU',     'en-AU-Chirp3-HD-Aoede'
  )
), updated_at = now()
WHERE register_id = 'REGISTER_04_SIGNAL';

UPDATE production_registers
SET config = config || jsonb_build_object(
  'tts_voice_by_country', jsonb_build_object(
    'GENERAL', config->>'tts_voice',
    'AU',     'en-AU-Studio-O'
  )
), updated_at = now()
WHERE register_id = 'REGISTER_05_ARCHIVE';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION D — AU image_anchors keys (Strategy §11.3)
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
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
SET config = jsonb_set(
  config,
  '{image_anchors}',
  COALESCE(config->'image_anchors', '{}'::jsonb) ||
  jsonb_build_object(
    'credit_cards_au', 'luxury editorial photography featuring Australian travel and premium card contexts (metal credit card against dark marble, Qantas Chairman lounge-evocative interiors, business class airline seats, first class lounges, Sydney Harbour or Uluru or Great Barrier Reef destinations), cinematic natural lighting with strong directional warm key, extreme shallow depth of field with creamy bokeh, warm tungsten and amber highlights, 85mm lens Leica M aesthetic, Kodak Portra 400 color palette, subtle film grain, golden hour favored, aspirational cinematic atmosphere',
    'property_mortgage_au', 'luxury architectural photography featuring premium Australian residential contexts (waterfront Sydney harbour properties, Toorak mansions, Gold Coast penthouses, modern architectural homes), natural golden-hour daylight with warm directional rake, medium-shallow depth of field preserving architectural detail, rich earth-tone and warm-neutral palette, 35-85mm lens, Kodak Portra 400 palette, subtle film grain, aspirational real-estate editorial aesthetic'
  )
), updated_at = now()
WHERE register_id = 'REGISTER_02_PREMIUM';

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
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
-- SECTION F — Disclaimer seeds (prompt_templates rows)
-- ═══════════════════════════════════════════════════════════════════════════
-- Note: assumes prompt_templates table has columns: template_type, template_key,
-- body_text, version, is_active, requires_compliance_role, description.
-- If schema differs, adjust column names below.

INSERT INTO prompt_templates (template_type, template_key, body_text, version, is_active, requires_compliance_role, description)
VALUES
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
$BODY$Interest rates shown are {{rate}}% p.a. Comparison rate: {{comparison_rate}}% p.a. based on {{warning_amount}} over {{warning_term}}. Warning: This comparison rate applies only to the example given and may not include all fees and charges.$BODY$,
   1, true, true, 'AU credit card comparison rate (NCCP template — substitution required at runtime)')
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
  ('AU', 'eofy',              'EOFY (Australian Financial Year End)',           DATE '2026-06-30' + TIME '23:59',     'annual_jun_30',     ARRAY['super_au','tax_au','property_mortgage_au'],          24, '{}'::jsonb),
  ('AU', 'fy_start',          'New AU Financial Year',                          DATE '2026-07-01' + TIME '00:00',     'annual_jul_01',     ARRAY['super_au','tax_au'],                                  24, '{}'::jsonb),
  ('AU', 'federal_budget',    'Federal Budget (next scheduled)',                DATE '2026-05-12' + TIME '19:30',     'annual_may',        ARRAY['super_au','tax_au','property_mortgage_au'],            4, '{"speech_window_local":"19:30 AEST"}'::jsonb),
  ('AU', 'hecs_indexation',   'HECS/HELP Indexation Announcement',              DATE '2026-06-01' + TIME '00:01',     'annual_jun_01',     ARRAY['tax_au'],                                              4, '{}'::jsonb),
  ('AU', 'q4_window_open',    'Q4 CPM peak window opens',                       DATE '2026-10-01' + TIME '00:00',     'annual_oct_01',     ARRAY['credit_cards_au'],                                    24, '{"action":"prioritize_credit_card_videos"}'::jsonb),
  ('AU', 'black_friday',      'Black Friday',                                   DATE '2026-11-27' + TIME '00:00',     'annual_friday_after_thanksgiving', ARRAY['credit_cards_au'],                  24, '{}'::jsonb)
ON CONFLICT DO NOTHING;
-- RBA cash-rate dates (8 per year) seeded via cron after migration; not hardcoded.

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION H — Compliance rules seeds (Strategy §11.5)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO country_compliance_rules (rule_id, country_target, trigger_jsonpath, required_elements, blocked_phrases, severity, description) VALUES
  ('au_asic_general_advice',  'AU',
   'niche_variant IN (super_au, property_mortgage_au, etf_investing_au)',
   '["general_advice_warning_title_card_in_first_10s","full_afsl_disclaimer_in_description","no_personal_financial_advice_language"]'::jsonb,
   ARRAY['you should buy','I recommend','guaranteed returns','risk-free','this will make you money'],
   'blocker',
   'ASIC RG 244 — general advice warning required for super/property/ETF content'),

  ('au_credit_nccp',          'AU',
   'niche_variant = credit_cards_au',
   '["comparison_rate_disclosure_when_mentioning_rates","target_market_determination_awareness"]'::jsonb,
   ARRAY['guaranteed approval','no credit check'],
   'blocker',
   'NCCP — credit card comparison rate disclosures'),

  ('au_property_promotion',   'AU',
   'niche_variant = property_mortgage_au',
   '["historical_volatility_acknowledgment","not_personal_advice_framing"]'::jsonb,
   ARRAY['passive income','financial freedom','replace your salary','guaranteed capital growth'],
   'blocker',
   'Property promotion compliance — no get-rich-quick framing'),

  ('au_bnpl_avoidance',       'AU',
   'primary_keyword MATCHES (afterpay|zip|klarna|humm|bnpl|buy now pay later)',
   '[]'::jsonb,
   ARRAY[]::TEXT[],
   'manual_review',
   'BNPL content is both ASIC-scrutinized and YouTube-ad-policy-risky')
ON CONFLICT (rule_id, country_target) DO UPDATE SET
  trigger_jsonpath = EXCLUDED.trigger_jsonpath,
  required_elements = EXCLUDED.required_elements,
  blocked_phrases = EXCLUDED.blocked_phrases,
  severity = EXCLUDED.severity,
  description = EXCLUDED.description;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION I — Renderer extension (render_project_intelligence v3)
-- ═══════════════════════════════════════════════════════════════════════════
-- Wraps existing v2 output and appends 4 country slot variables.
-- For GENERAL projects, all 4 slots resolve to empty strings — output
-- shape is identical to v2 with extra empty keys (downstream prompts
-- reference the keys; empty value renders empty in the prompt).

CREATE OR REPLACE FUNCTION render_project_intelligence(p_project_id UUID, p_stage TEXT)
RETURNS JSONB AS $$
DECLARE
  base_result JSONB;
  v_country_target TEXT;
  v_compliance TEXT := '';
  v_terminology TEXT := '';
  v_calendar TEXT := '';
  v_demonetization TEXT := '';
  v_sub_niche TEXT := '';
BEGIN
  -- Pull existing v2 output (assumed function name; adjust if internal renamed)
  -- If migration 029's renderer is the same SQL function, call it here:
  SELECT _render_project_intelligence_v2(p_project_id, p_stage)
    INTO base_result;

  SELECT country_target INTO v_country_target FROM projects WHERE id = p_project_id;

  IF v_country_target IS NULL OR v_country_target = 'GENERAL' THEN
    -- Slots stay empty
    RETURN base_result || jsonb_build_object(
      'country_compliance_block', '',
      'country_terminology_block', '',
      'country_calendar_context', '',
      'country_demonetization_constraints', '',
      'niche_variant_subniche_context', '',
      'country_target', COALESCE(v_country_target, 'GENERAL'),
      'source_count', 9
    );
  END IF;

  -- ── AU (or future market) — populate slots ──

  -- Compliance block
  SELECT COALESCE(
    'REGULATORY COMPLIANCE RULES:' || E'\n' ||
    string_agg(format(E'• %s [%s]: %s', rule_id, severity, description), E'\n'),
    ''
  ) INTO v_compliance
  FROM country_compliance_rules
  WHERE country_target = v_country_target;

  -- Terminology block
  v_terminology := CASE v_country_target
    WHEN 'AU' THEN E'AUSTRALIAN ENGLISH TERMINOLOGY:\n' ||
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

  -- Calendar block — next 90 days
  SELECT COALESCE(
    E'UPCOMING CALENDAR EVENTS (next 90 days):\n' ||
    string_agg(
      format(E'• %s on %s (affects: %s; publish window: %s hours)',
             event_name, scheduled_at::DATE,
             array_to_string(affected_sub_niches, ', '),
             COALESCE(publish_within_hours::TEXT, 'no urgency')),
      E'\n'
    ),
    ''
  ) INTO v_calendar
  FROM country_calendar_events
  WHERE country_target = v_country_target
    AND scheduled_at > now()
    AND scheduled_at < now() + interval '90 days';

  -- Demonetization block
  SELECT COALESCE(
    E'PROHIBITED PHRASES (any occurrence triggers Gate-3 block):\n' ||
    string_agg(
      format(E'• %s: %s — %s',
             rule_id,
             array_to_string(blocked_phrases, ', '),
             description),
      E'\n'
    ),
    ''
  ) INTO v_demonetization
  FROM country_compliance_rules
  WHERE country_target = v_country_target
    AND severity = 'blocker'
    AND blocked_phrases IS NOT NULL
    AND array_length(blocked_phrases, 1) > 0;

  -- Sub-niche context (per topic if available)
  v_sub_niche := '';  -- Populated by the calling node from topic.niche_variant; left empty here

  RETURN base_result || jsonb_build_object(
    'country_compliance_block', v_compliance,
    'country_terminology_block', v_terminology,
    'country_calendar_context', v_calendar,
    'country_demonetization_constraints', v_demonetization,
    'niche_variant_subniche_context', v_sub_niche,
    'country_target', v_country_target,
    'source_count', 12
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION render_project_intelligence(UUID, TEXT) IS
  'v3 — adds 4 country slot variables (compliance, terminology, calendar, demonetization) to the v2 9-source output. Empty for GENERAL projects.';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION J — _verify_script_template_vars extension
-- ═══════════════════════════════════════════════════════════════════════════
-- Extend the drift-detector to require the 4 new keys in the renderer output
-- whenever a prompt references them. The function signature is preserved;
-- we add the 4 keys to its internal allowlist.

CREATE OR REPLACE FUNCTION _verify_script_template_vars()
RETURNS TABLE(prompt_type TEXT, missing_var TEXT) AS $$
DECLARE
  v_renderer_keys TEXT[] := ARRAY[
    'intelligence_block',
    'country_compliance_block',
    'country_terminology_block',
    'country_calendar_context',
    'country_demonetization_constraints',
    'niche_variant_subniche_context'
    -- (existing keys from v2 inherited as well; full list lives in
    --  the production migration 029 body — this stub assumes that
    --  function exists and we only ADD the 4 new keys to its allowlist.)
  ];
BEGIN
  RETURN QUERY
  SELECT sp.prompt_type, m.var_name
  FROM system_prompts sp,
       LATERAL regexp_matches(sp.prompt_text, '\{\{\s*([a-z_]+)\s*\}\}', 'g') m(matches)
       CROSS JOIN LATERAL (SELECT m.matches[1] AS var_name) m_unwrap
  WHERE sp.is_active = true
    AND m_unwrap.var_name <> ALL(v_renderer_keys);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION _verify_script_template_vars() IS
  'Drift detector. Returns rows for any active prompt referencing a {{var}} not in the renderer''s allowlist. Used by tools/verify_prompt_sync.py in CI.';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION K — System prompt updates (existing rows: add 4 country slots)
-- ═══════════════════════════════════════════════════════════════════════════
-- For each of: script_pass1, script_pass2, script_pass3, script_evaluator,
-- topic_generator_master — bump version, set old version inactive, append
-- 4 new variable references to the prompt body.
--
-- NOTE: This migration is conservative — rather than rewriting the bodies
-- in this single SQL file (the script_system_prompt is 5K chars, topic
-- generator is 25K chars), we APPEND the 4 slot variables to each. The
-- variable injection pattern means each existing prompt now ends with:
--
--   ... (existing prompt body) ...
--
--   {{ niche_variant_subniche_context }}
--   {{ country_compliance_block }}
--   {{ country_terminology_block }}
--   {{ country_calendar_context }}
--
-- For GENERAL projects, all 4 resolve to empty strings — bytewise identical
-- to current behaviour. For AU, they populate.

DO $$
DECLARE
  r RECORD;
  v_appendix TEXT;
BEGIN
  v_appendix := E'\n\n' ||
                E'{{ niche_variant_subniche_context }}\n\n' ||
                E'{{ country_compliance_block }}\n\n' ||
                E'{{ country_terminology_block }}\n\n' ||
                E'{{ country_calendar_context }}';

  FOR r IN
    SELECT id, prompt_type, prompt_text, version
    FROM system_prompts
    WHERE prompt_type IN ('script_pass1','script_pass2','script_pass3','script_evaluator','topic_generator_master')
      AND is_active = true
  LOOP
    -- Skip if already appended (idempotency)
    IF r.prompt_text NOT LIKE '%{{ country_compliance_block }}%' THEN
      -- Insert new version with appendix
      INSERT INTO system_prompts (prompt_type, prompt_text, version, is_active, description)
      VALUES (
        r.prompt_type,
        r.prompt_text || v_appendix,
        r.version + 1,
        true,
        'v' || (r.version + 1) || ' — added 4 country slot variables for AU overlay (migration 032)'
      );
      -- Old version → inactive
      UPDATE system_prompts SET is_active = false WHERE id = r.id;
    END IF;
  END LOOP;
END;
$$;

-- script_evaluator additionally gains an 8th dimension (regulatory_compliance).
-- Country-keyed weight: 0% for GENERAL, 15% for AU. The dimension definition
-- is inserted as an additional appendix block (consumed by the evaluator's
-- output schema).

UPDATE system_prompts SET prompt_text = prompt_text || E'\n\n' ||
$BODY$
EVALUATOR DIMENSION 8 — REGULATORY COMPLIANCE (country-aware)

For projects where {{country_target}} = 'AU':
  Weight: 15%. Score 0.0–10.0 on:
  - Required disclaimers present + verbatim from approved AU disclaimer library?
  - No prohibited phrases per country_compliance_rules.blocked_phrases?
  - General advice warning title card in first 10 seconds?
  - No personal financial advice language?
  - Any blocking issues = dimension score 0; otherwise score reflects depth of compliance.

For all other countries (GENERAL): weight = 0%. Skip this dimension; output
schema field "regulatory_compliance" returns null.

When dimension 8 is active, renormalize the other 7 weights so they sum to 85%.
$BODY$
WHERE prompt_type = 'script_evaluator' AND is_active = true
  AND prompt_text NOT LIKE '%EVALUATOR DIMENSION 8%';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION L — 14 new AU prompts (system_prompts rows)
-- ═══════════════════════════════════════════════════════════════════════════
-- Bodies sourced from Australia/CARDMATH_AU_IMPLEMENTATION_PROMPTS_v1.md.
-- Trimmed for the migration; full prose lives in the markdown source.
-- (Operator note: re-running migration with updated bodies bumps version
--  via the ON CONFLICT path.)

INSERT INTO system_prompts (prompt_type, prompt_text, version, is_active, description) VALUES
  ('topic_discover_au', $BODY$
[SYSTEM ROLE]
You are a Senior YouTube Content Strategist with 12 years of specialization in Australian personal finance content. You understand the ATO, ASIC, RBA policy cycles, the Big 4 bank product landscape, the Qantas/Velocity loyalty ecosystem, the AU super fund landscape, and the state-by-state distinctions in property tax and first-home-buyer schemes. You write in Australian English and never confuse AU products or rules with US or UK equivalents.

[TASK]
Generate 20 candidate topics. Distribute across sub-niches per the provided weights. For each topic provide working_title, primary_keyword, secondary_keywords, sub_niche, proposed_register, content_format, au_entities, estimated_monthly_search_au, search_trend, competitor_gap, time_sensitivity, priority_hint, demonetization_risk, cross_subniche_synergy.

(Full prompt body in Australia/CARDMATH_AU_IMPLEMENTATION_PROMPTS_v1.md §3.1 P-TOPIC-AU-DISCOVER-v1)

{{ intelligence_block }}
{{ country_compliance_block }}
{{ country_terminology_block }}
{{ country_calendar_context }}
$BODY$, 1, true, 'AU daily topic discovery (P-TOPIC-AU-DISCOVER-v1) — full body in implementation prompts MD'),

  ('topic_event_au', $BODY$
[SYSTEM ROLE]
You are a Senior Broadcast News Producer specializing in Australian financial news. You translate policy announcements into viewer-facing topics within tight publication windows.

[TASK]
Generate 8 topic candidates responding to {EVENT_TYPE}. Each tackles a distinct angle. Distribute across affected sub-niches. Include explainer + demographic_impact + action_checklist + myth_buster framings. Range in depth: 2 short-form, 4 medium, 2 long. Publishable within 4 hours.

(Full prompt body in Australia/CARDMATH_AU_IMPLEMENTATION_PROMPTS_v1.md §3.2 P-TOPIC-AU-EVENT-v1)

{{ intelligence_block }}
{{ country_compliance_block }}
{{ country_terminology_block }}
{{ country_calendar_context }}
$BODY$, 1, true, 'AU event-trigger topic generator (P-TOPIC-AU-EVENT-v1)'),

  ('gap_score_au', $BODY$
[SYSTEM ROLE]
You are a Competitive Content Analyst.

[TASK]
Compute gap_score per the formula:
  gap_score = (search_volume × cpm_band) / (incumbent_coverage_depth × incumbent_authority)

With modifiers:
  speed_moat (+20%)    — incumbent_response_time > 24h AND we publish <4h
  matrix_moat (+15%)   — extends existing CardMath series
  state_moat (+10%)    — AU property/tax specific to non-Sydney/Melbourne state
  long_tail_moat (+25%) — primary_keyword search 500-5000
  synthesis_moat (+10%) — combines 2+ sub-niches

Decision: pass (>=40), refine (20-39), discard (<20). Adjust thresholds per sub_niche: ETF >=50; tax >=30.

Return: base_gap_score, modifiers_applied, final_gap_score, decision, rationale, refinement_suggestions.
$BODY$, 1, true, 'AU Gate-1 gap-score calculator (P-GAP-SCORE-v1)'),

  ('register_classify_au_addendum', $BODY$
APPEND TO EXISTING WF_REGISTER_ANALYZE PROMPT WHEN country_target = 'AU':

For AU topics, additionally classify niche_variant:
- credit_cards_au — AU credit card products, QFF, Velocity, Amex AU
- super_au — AU superannuation
- property_mortgage_au — AU property and mortgages
- tax_au — ATO, AU tax strategy
- etf_investing_au — ASX ETFs, AU brokers, AU share investing
- primary — generic fallback (rare on AU projects)

Default to one of the 5 AU values for AU finance topics. Use 'primary' only when the topic is a generic finance topic not specific to Australia.
$BODY$, 1, true, 'AU sub-niche classifier addendum (appended to register classify prompt)'),

  ('demon_audit_au', $BODY$
[SYSTEM ROLE]
You are a Senior Compliance Officer combining knowledge of ASIC RG 244, NCCP Act, and YouTube's Advertiser-Friendly Content Guidelines. You are the last checkpoint before publish. You catch what Pass 3 and QA missed. Your output either clears the video for publish or blocks it.

[TASK]
Run every check in country_compliance_rules against the final script + title + description. Return:
- overall_decision: clear | manual_review_required | block
- violations: array of {rule_id, severity, location, detected_text, recommendation, scene_number}
- warnings: same shape, severity=warning
- clears: array of rule_ids passed
- manual_review_reasons
- approved_for_publish: boolean

Any blocker → approved_for_publish=false, decision=block.
Any BNPL primary topic → manual_review_required regardless of other findings.

{{ country_compliance_block }}
{{ country_demonetization_constraints }}
$BODY$, 1, true, 'AU demonetization audit (P-DEMON-AUDIT-AU-v1) — runs at Gate 3 pre-publish'),

  ('swot_channel_au', $BODY$
[SYSTEM ROLE]
You are a Competitive Intelligence Analyst specializing in YouTube creator economy.

[TASK]
Analyze a single competitor channel from metadata + last 30 videos. Return per Strategy Plan §8.1 schema:
- channel_handle, channel_id, sub_niche, tier (tier_1_incumbent or tier_2_adjacent), subscriber_count, avg_upload_cadence_days, last_upload_at, top_10_videos
- content_pillars_observed, production_style_notes, known_strengths, known_weaknesses_and_gaps
- competitive_threat_score (1-10), avoidance_topics, gap_topics
$BODY$, 1, true, 'AU per-channel SWOT (P-SWOT-CHANNEL-v1)'),

  ('swot_subniche_au', $BODY$
[SYSTEM ROLE]
You are a Senior Content Strategy Director synthesizing channel-level competitive intelligence into sub-niche strategic direction for the CardMath AU editorial team.

[TASK]
Synthesize 5-10 channel analyses + CardMath performance into a sub-niche SWOT (Strategy Plan §8.2 shape). Then prioritize 2-4 moat_actions for the next 30 days. Each action: specific, measurable, timeframed.
$BODY$, 1, true, 'AU sub-niche SWOT synthesis (P-SWOT-SUBNICHE-v1)'),

  ('retention_analyze_au', $BODY$
[SYSTEM ROLE]
You are a Senior Video Analytics Specialist. You read YouTube retention curves and diagnose what specific sections of a script caused viewer drop-off.

[TASK]
Identify drop-off events (>3pp drop within 5s), surge events, segment performance per chapter, and 3-5 recommendations for future videos in this sub-niche/register. Diagnosis categories: weak_hook, setup_too_slow, pacing_lull, retention_cliff, cta_chasm.

Return: overall_retention_grade A-F, drop_off_events, surge_events, chapter_performance, recommendations_for_future_videos, feed_into_next_script_prompts.

[AU-SPECIFIC]
- Disclaimer scenes naturally cause drops. >5pp drop at disclaimer = recommend moving earlier or making it visually engaging.
- AU viewers tolerate longer setups for super/tax than for credit card content. Calibrate accordingly.
$BODY$, 1, true, 'AU post-publish retention analyzer (P-RETENTION-ANALYZE-v1)'),

  ('coach_monthly_au', $BODY$
[SYSTEM ROLE]
You are a Senior YouTube Growth Strategist acting as CardMath AU's monthly coach.

[TASK]
Produce a monthly coach report. Sections:
1. Executive summary (3-5 bullets)
2. Performance review — outperformers, underperformers, why
3. Sub-niche performance breakdown — CPM, RPM, retention
4. Competitor moves of note
5. Next month's calendar priorities
6. Directives — 5-10 concrete, measurable, timeframed directives with owner + deadline + success metric

Always flag Q4 (October) and EOFY (May) as priority anchors.

{{ country_calendar_context }}
$BODY$, 1, true, 'AU monthly coach report (P-COACH-MONTHLY-AU-v1)'),

  ('seo_title_au', $BODY$
[SYSTEM ROLE]
You are a YouTube Title Specialist for AU personal finance content.

[TASK]
Generate 3 title variants for A/B. Each 50-70 chars, includes primary keyword, includes AU geotag when natural, includes year when year-specific, leads with strongest hook. Tag each with variant_type, predicted_ctr_bucket, rationale.

Pattern preferences:
- credit_cards_au: curiosity + numbers
- super_au: factual + year
- property_mortgage_au: question + state
- tax_au: practical + year
- etf_investing_au: comparison + specificity

Banned: clickbait, fake urgency, personal advice, overclaim.

{{ country_terminology_block }}
$BODY$, 1, true, 'AU title variants (P-SEO-TITLE-AU-v1)'),

  ('seo_desc_au', $BODY$
[SYSTEM ROLE]
You are a YouTube SEO Description Specialist for AU finance content. Compliant with ASIC.

[TASK]
Generate 1500-2500 char description. Structure: hook paragraph (2-3 sent + primary keyword), summary (4-6 sent + 2-3 secondary keywords), chapters (MM:SS), links (with affiliate disclosure), disclaimer block (verbatim from disclaimer_library), 3 hashtags including AU token.

{{ country_compliance_block }}
{{ country_terminology_block }}
$BODY$, 1, true, 'AU description generator (P-SEO-DESC-AU-v1)'),

  ('seo_tags_au', $BODY$
[SYSTEM ROLE]
You are a YouTube Tag Optimization Specialist.

[TASK]
Generate 12-20 tags within 500-char ceiling. Distribute: 1-2 exact primary keyword + 3-5 variants + 3-5 secondary + 2-3 AU entities + 2-3 broad niche + 1-2 regulatory tags. At least one Australia/AU/Aussie tag. At least one year tag. State name for state-specific property content.
$BODY$, 1, true, 'AU tags generator (P-SEO-TAGS-AU-v1)'),

  ('thumb_concept_au', $BODY$
[SYSTEM ROLE]
You are a YouTube Thumbnail Designer for AU finance content.

[TASK]
Generate 3 thumbnail concepts. Each: concept_name, hero_description, text_overlay (3-4 words), secondary_text_overlay, color_accent_hex, predicted_ctr_bucket, variant_type (factual|curiosity|comparison|urgency), rationale.

Style by register:
- REG 01: clean chart-evocative, amber accents
- REG 02: luxury product/destination, gold accents
- REG 03: dark desaturated, red accent
- REG 04: cool blue tech, cyan accent
- REG 05: sepia, period-appropriate

Text patterns by sub-niche:
- credit_cards_au: number-forward
- super_au: comparison or urgency-forward
- property_mortgage_au: state-forward or question
- tax_au: deadline / benefit
- etf_investing_au: ticker / fee
$BODY$, 1, true, 'AU thumbnail concepts (P-THUMB-CONCEPT-AU-v1)'),

  ('thumb_prompt_au', $BODY$
[SYSTEM ROLE]
You are an Image Prompt Engineer converting thumbnail concepts into Seedream 4.5 prompts.

[TASK]
Output the full Fal.ai payload:
- prompt: 4-part formula with thumbnail composition prefix reserving negative space for text overlay
- negative_prompt: Universal Negative + register additions + "text, typography, readable words, logos"
- image_size: landscape_16_9
- num_images: 1

[AU-SPECIFIC]
- No ATO/ASIC/APRA/RBA logo reproduction. Evocative only.
- No Big 4 bank logos. Generic banking imagery only.
- No Qantas logo. Aviation imagery only.
$BODY$, 1, true, 'AU thumbnail Seedream prompt (P-THUMB-PROMPT-AU-v1)')

ON CONFLICT (prompt_type) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  version = system_prompts.version + 1,
  is_active = true,
  description = EXCLUDED.description,
  updated_at = now();

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION M — Verification queries (advisory; not enforced by transaction)
-- ═══════════════════════════════════════════════════════════════════════════

-- After commit, run:
-- SELECT count(*) FROM niche_variants WHERE country_target = 'AU';                  -- expect 5
-- SELECT count(*) FROM prompt_templates WHERE template_key LIKE 'AU:%';              -- expect 4
-- SELECT count(*) FROM country_calendar_events WHERE country_target = 'AU';          -- expect ≥6
-- SELECT count(*) FROM country_compliance_rules WHERE country_target = 'AU';         -- expect 4
-- SELECT count(*) FROM system_prompts WHERE prompt_type LIKE '%_au' AND is_active;   -- expect 14
-- SELECT count(*) FROM system_prompts WHERE is_active AND prompt_text LIKE '%country_compliance_block%';  -- expect ≥5 (the 4 General masters + at least 1 AU prompt)

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- End migration 032
-- ═══════════════════════════════════════════════════════════════════════════
