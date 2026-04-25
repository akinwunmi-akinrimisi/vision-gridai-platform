# Implementation Plan — Australia Country Overlay (Executable)

**Status:** Ready to execute. Verified against live Supabase + n8n on 2026-04-25.
**Companion docs:** `Australia/CARDMATH_AU_STRATEGY_PLAN_v1.md`, `Australia/CARDMATH_AU_IMPLEMENTATION_PROMPTS_v1.md`.
**Reference architecture:** `image_creation_guidelines_prompts/IMPLEMENTATION_PLAN_v3_EXECUTABLE.md` (the v3 image-anchors object-shape transformation).

This plan implements Australia as a **country-aware overlay** on the existing General platform. Production (TTS, image gen, music, Ken Burns, captions, assembly, end card, platform renders) is **shared verbatim** between General and AU. Pre-production (topic intelligence, script generation, register classification, SEO, thumbnails) gets **4 new optional prompt slot variables** that resolve to empty strings for General projects and populate from AU intelligence sources for AU projects.

The seam is `projects.country_target` (`'GENERAL'` default, `'AU'` for Australia).

---

## 0. Preflight — what must be true before any phase ships

### 0.1 Confirmed decisions (locked from previous turns)

| Decision | Choice |
|---|---|
| **Architecture** | Country-aware overlay; AU pre-production + shared production |
| **Prompt merge** | Variable injection — 4 new slots in existing prompts (A1.i) |
| **Gap-score logic** | Post-Generator scoring node, doesn't modify Generator prompt (A2.i) |
| **Compliance scoring** | 8th optional dimension on existing `script_evaluator`, weight=0 for General, weight=15% for AU (A3.i) |
| **Disclaimer storage** | `prompt_templates` rows with `template_type='disclaimer'` (B1.i) |
| **Renderer extension** | Extend `render_project_intelligence` to pull from 3 new country sources (B2 yes) |
| **Niche viability** | Reuse existing `niche_viability_reports` (B3.i) |
| **Competitor seed** | Run through `WF_DISCOVER_COMPETITORS` not raw INSERT (B4 yes) |
| **TTS voice shape** | Add sibling key `tts_voice_by_country` (object) — preserves existing string column for backwards compat (C1 amended) |
| **Style DNA** | `WF_STYLE_DNA` runs with §11.1 spec as constraint (C2.ii) |
| **Channel architecture** | **Hub + 1 priority spoke (super_au)** for v1 — staged spoke launch after hub clears 30 days CPM signal (C3 amended from full hub+3 spokes) |
| **Workflow naming** | Generalized (no `_AU` suffix) — country-aware via internal branch (D1.ii) |
| **Country routing** | Single `WF_COUNTRY_ROUTER` sub-workflow (D2.ii) |
| **Empty AU sub-niche at Gate 1** | Reject (E1) |
| **Demonetization audit failure** | New `topics.compliance_review_status` + dashboard inbox (E2.i) |
| **Cost ceiling** | Soft warning, no hard block (E3) |
| **Prompt versioning** | Auto-pickup new General versions; `_verify_script_template_vars()` enforces drift safety (F1) |
| **Disclaimer edit gating** | New `prompt_templates.requires_compliance_role` boolean — when true, PromptCard UI shows "Type CONFIRM to save" modal (F2 amended) |
| **AU TTS voices** | `en-AU-Studio-N` (Reg 01/03), `en-AU-Studio-O` (Reg 02/05), Chirp 3 HD voice (Reg 04) |

### 0.2 Live infrastructure facts (verified 2026-04-25)

| Workflow | n8n ID | Role |
|---|---|---|
| `WF_REGISTER_ANALYZE` | `Miy5h5O7ncIIrnRg` | Topic-stage register classifier — emits `{top_2, all_5_ranked, era_detected}` to `topics.register_recommendations` |
| `WF_SCRIPT_PASS` | `CRC9USwaGgk7x6xN` | Unified 3-pass executor + evaluator |
| `WF_TOPICS_GENERATE` | from MEMORY | Generates 25 topics + avatars per project |
| `WF_VIDEO_METADATA` | `k0F6KAtkn74PEIDl` | SEO description + tags (live-only, no JSON checked in) |
| `WF_THUMBNAIL_GENERATE` | `7GqpEAug8hxxU7f6` | Thumbnail generation (live-only) |
| `WF_DISCOVER_COMPETITORS` | from `workflows/` | Competitor channel discovery |
| `WF_CHANNEL_ANALYZE` | from `workflows/` | Per-channel deep analysis |
| `WF_NICHE_VIABILITY` | from `workflows/` | Niche viability assessment |

### 0.3 Live schema facts

| Column | Status | Source |
|---|---|---|
| `projects.country_target` | ❌ does not exist | Phase 1 adds it |
| `projects.language` | ❌ does not exist | Phase 1 adds it |
| `projects.channel_type` | ❌ does not exist | Phase 1 adds it |
| `projects.parent_project_id` | ❌ does not exist | Phase 1 adds it |
| `projects.cost_ceiling_usd` | ❌ does not exist | Phase 1 adds it |
| `topics.niche_variant` | ✅ exists | Migration via v3 plan §3.2 |
| `topics.production_register` | ✅ exists | Migration 023 |
| `topics.register_recommendations` | ✅ exists (NOT `register_analysis_json` — AU docs typo) | Migration 023 |
| `topics.gap_score` | ❌ does not exist | Phase 1 adds it |
| `topics.required_disclaimers` | ❌ does not exist | Phase 1 adds it |
| `topics.demonetization_audit_result` | ❌ does not exist | Phase 1 adds it |
| `topics.compliance_review_status` | ❌ does not exist | Phase 1 adds it |
| `production_registers.config.image_anchors` | ✅ object-shape (post-v3) | v3 plan |
| `production_registers.config.tts_voice` | ✅ string | Phase 2 adds sibling `tts_voice_by_country` |
| `prompt_templates.requires_compliance_role` | ❌ does not exist | Phase 1 adds it |

### 0.4 Pre-flight rollback snapshot

Before any deploy:

```bash
ssh -i ~/.ssh/id_ed25519_antigravity root@srv1297445.hstgr.cloud \
  "docker exec supabase-db-1 pg_dump -U postgres -d postgres \
    --schema-only --table=projects --table=topics --table=production_registers \
    --table=system_prompts --table=prompt_templates" \
  > /tmp/au_overlay_preflight_$(date +%Y_%m_%d).sql
```

Plus:

```bash
ssh -i ~/.ssh/id_ed25519_antigravity root@srv1297445.hstgr.cloud \
  "docker exec supabase-db-1 psql -U postgres -d postgres -c \
   \"COPY (SELECT * FROM system_prompts WHERE is_active = true) TO STDOUT WITH CSV HEADER\"" \
  > /tmp/system_prompts_pre_au_$(date +%Y_%m_%d).csv
```

Both files are the rollback artifacts.

---

## 1. Phase 1 — Schema, tables, seeds (migration 032_au_overlay.sql)

**Single transaction.** All schema, all seeds, all renderer updates, all prompt updates land in one `BEGIN ... COMMIT`. If any step fails, the whole thing rolls back; no partial state.

**File:** `supabase/migrations/032_au_overlay.sql`

The migration is fully written in `supabase/migrations/032_au_overlay.sql`. This plan describes its phases:

### 1.1 Section A — Schema additions

```sql
-- Project-level routing key + AU columns
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

-- Topic-level scoring + audit columns
ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS gap_score NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS gap_score_modifiers JSONB,
  ADD COLUMN IF NOT EXISTS required_disclaimers TEXT[],
  ADD COLUMN IF NOT EXISTS demonetization_audit_result JSONB,
  ADD COLUMN IF NOT EXISTS compliance_review_status TEXT DEFAULT 'not_required'
    CHECK (compliance_review_status IN ('not_required','pending','approved','rejected'));

CREATE INDEX IF NOT EXISTS idx_topics_gap_score ON topics(gap_score DESC) WHERE gap_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_topics_compliance_review ON topics(compliance_review_status)
  WHERE compliance_review_status = 'pending';

-- Disclaimer-edit gating
ALTER TABLE prompt_templates
  ADD COLUMN IF NOT EXISTS requires_compliance_role BOOLEAN NOT NULL DEFAULT false;

-- Country-target denorm on topics for fast Switch-node reads
ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS country_target TEXT NOT NULL DEFAULT 'GENERAL';
CREATE INDEX IF NOT EXISTS idx_topics_country_target ON topics(country_target);
```

### 1.2 Section B — New tables

```sql
-- Country-keyed niche-variant lookup (replaces ad-hoc enum)
CREATE TABLE IF NOT EXISTS niche_variants (
  country_target TEXT NOT NULL,
  value TEXT NOT NULL,
  display_name TEXT NOT NULL,
  default_register TEXT NOT NULL,
  fallback_register TEXT NOT NULL,
  cpm_band_usd JSONB NOT NULL,                   -- {"min": 22, "max": 32}
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

-- Country calendar events (RBA, Budget, EOFY, HECS for AU)
CREATE TABLE IF NOT EXISTS country_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_target TEXT NOT NULL,
  event_type TEXT NOT NULL,                       -- 'rba_cash_rate', 'federal_budget', 'eofy', 'hecs_indexation', etc.
  event_name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  recurrence TEXT,                                -- 'annual_may_15', 'rba_cycle', null for one-off
  affected_sub_niches TEXT[],
  publish_within_hours INTEGER,                   -- production-window target
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_country_calendar_lookup ON country_calendar_events(country_target, scheduled_at);

ALTER TABLE country_calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS country_calendar_anon_deny ON country_calendar_events;
CREATE POLICY country_calendar_anon_deny ON country_calendar_events AS RESTRICTIVE FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS country_calendar_service ON country_calendar_events;
CREATE POLICY country_calendar_service ON country_calendar_events FOR ALL TO service_role USING (true);

-- Country compliance rules (regulatory + advertiser-friendly)
CREATE TABLE IF NOT EXISTS country_compliance_rules (
  rule_id TEXT NOT NULL,
  country_target TEXT NOT NULL,
  trigger_jsonpath TEXT,                          -- e.g., 'niche_variant IN (super_au, ...)'
  required_elements JSONB,                        -- array of required disclaimer IDs / on-screen elements
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

-- Coach reports (monthly outputs)
CREATE TABLE IF NOT EXISTS coach_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  country_target TEXT NOT NULL,
  report_jsonb JSONB NOT NULL,                   -- full P-COACH-MONTHLY output
  cost_usd NUMERIC(6,4),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coach_reports_project ON coach_reports(project_id, report_period_start DESC);

ALTER TABLE coach_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coach_reports_anon_deny ON coach_reports;
CREATE POLICY coach_reports_anon_deny ON coach_reports AS RESTRICTIVE FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS coach_reports_service ON coach_reports;
CREATE POLICY coach_reports_service ON coach_reports FOR ALL TO service_role USING (true);
```

### 1.3 Section C — `production_registers.config.tts_voice_by_country`

The `tts_voice` column stays as a string (backwards compat). Add a sibling key as an object. `WF_TTS_AUDIO` resolver: object wins when present and the (country_target) key resolves; falls back to the string.

```sql
UPDATE production_registers
SET config = config || jsonb_build_object(
  'tts_voice_by_country', jsonb_build_object(
    'GENERAL', config->>'tts_voice',           -- preserves current behavior
    'AU',     'en-AU-Studio-N'                  -- Reg 01 default
  )
)
WHERE register_id = 'REGISTER_01_ECONOMIST';

UPDATE production_registers
SET config = config || jsonb_build_object(
  'tts_voice_by_country', jsonb_build_object(
    'GENERAL', config->>'tts_voice',
    'AU',     'en-AU-Studio-O'                  -- Reg 02 premium
  )
)
WHERE register_id = 'REGISTER_02_PREMIUM';

UPDATE production_registers
SET config = config || jsonb_build_object(
  'tts_voice_by_country', jsonb_build_object(
    'GENERAL', config->>'tts_voice',
    'AU',     'en-AU-Studio-N'
  )
)
WHERE register_id = 'REGISTER_03_NOIR';

UPDATE production_registers
SET config = config || jsonb_build_object(
  'tts_voice_by_country', jsonb_build_object(
    'GENERAL', config->>'tts_voice',
    'AU',     'en-AU-Chirp3-HD-Aoede'
  )
)
WHERE register_id = 'REGISTER_04_SIGNAL';

UPDATE production_registers
SET config = config || jsonb_build_object(
  'tts_voice_by_country', jsonb_build_object(
    'GENERAL', config->>'tts_voice',
    'AU',     'en-AU-Studio-O'
  )
)
WHERE register_id = 'REGISTER_05_ARCHIVE';
```

### 1.4 Section D — AU `image_anchors` keys (Strategy §11.3)

Adds AU sub-niche keys to the existing object-shape `image_anchors` (post-v3). These are merged via `||` so existing keys stay.

```sql
-- Register 01 — Economist — 5 AU sub-niche variants
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
)
WHERE register_id = 'REGISTER_01_ECONOMIST';

-- Register 02 — Premium — 2 AU keys (top-CPM AU sub-niches)
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  COALESCE(config->'image_anchors', '{}'::jsonb) ||
  jsonb_build_object(
    'credit_cards_au', 'luxury editorial photography featuring Australian travel and premium card contexts (metal credit card against dark marble, Qantas Chairman lounge-evocative interiors, business class airline seats, first class lounges, Sydney Harbour or Uluru or Great Barrier Reef destinations), cinematic natural lighting with strong directional warm key, extreme shallow depth of field with creamy bokeh, warm tungsten and amber highlights, 85mm lens Leica M aesthetic, Kodak Portra 400 color palette, subtle film grain, golden hour favored, aspirational cinematic atmosphere',
    'property_mortgage_au', 'luxury architectural photography featuring premium Australian residential contexts (waterfront Sydney harbour properties, Toorak mansions, Gold Coast penthouses, modern architectural homes), natural golden-hour daylight with warm directional rake, medium-shallow depth of field preserving architectural detail, rich earth-tone and warm-neutral palette, 35-85mm lens, Kodak Portra 400 palette, subtle film grain, aspirational real-estate editorial aesthetic'
  )
)
WHERE register_id = 'REGISTER_02_PREMIUM';

-- Register 04 — Signal — etf_investing_au
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  COALESCE(config->'image_anchors', '{}'::jsonb) ||
  jsonb_build_object(
    'etf_investing_au', 'clean modern fintech photography featuring Australian trading and platform contexts (macro shots of broker app interfaces evocative but not reproducing specific branding, ASX ticker-style displays, modern open-plan professional settings), cool blue-dominant lighting with selective warm amber accent rim, deep blue-black atmospheric shadows, extreme shallow depth of field, tack-sharp focus with subtle bloom, minimalist composition, Apple keynote aesthetic with Blade Runner 2049 sensibility, futuristic cinematic still'
  )
)
WHERE register_id = 'REGISTER_04_SIGNAL';
```

### 1.5 Section E — Niche-variant seeds

```sql
INSERT INTO niche_variants (country_target, value, display_name, default_register, fallback_register, cpm_band_usd, q4_peak_usd, demonetization_risk, priority, required_disclaimer_ids) VALUES
  ('AU', 'credit_cards_au',      'Australian Credit Cards & Points',  'REGISTER_02_PREMIUM',   'REGISTER_01_ECONOMIST', '{"min":28,"max":42}', '{"min":45,"max":65}', 'medium',      'P0', ARRAY['AD-04']),
  ('AU', 'super_au',             'Australian Superannuation',         'REGISTER_01_ECONOMIST', 'REGISTER_01_ECONOMIST', '{"min":22,"max":32}', '{"min":25,"max":35}', 'medium-high', 'P0', ARRAY['AD-01']),
  ('AU', 'property_mortgage_au', 'Australian Property & Mortgages',   'REGISTER_01_ECONOMIST', 'REGISTER_02_PREMIUM',   '{"min":25,"max":38}', '{"min":28,"max":42}', 'medium-high', 'P1', ARRAY['AD-01','AD-02']),
  ('AU', 'tax_au',               'Australian Tax Strategy',           'REGISTER_01_ECONOMIST', 'REGISTER_01_ECONOMIST', '{"min":18,"max":28}', '{"min":20,"max":32}', 'low',         'P1', ARRAY[]::TEXT[]),
  ('AU', 'etf_investing_au',     'Australian ETF & Share Investing',  'REGISTER_01_ECONOMIST', 'REGISTER_04_SIGNAL',    '{"min":20,"max":30}', '{"min":22,"max":33}', 'medium',      'P2', ARRAY['AD-01','AD-02'])
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
```

### 1.6 Section F — Disclaimer seeds (`prompt_templates`)

```sql
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
   1, true, true, 'AU credit card comparison rate (NCCP template — substitution required)')
ON CONFLICT (template_type, template_key) DO UPDATE SET
  body_text = EXCLUDED.body_text,
  version = prompt_templates.version + 1,
  is_active = true,
  requires_compliance_role = EXCLUDED.requires_compliance_role,
  updated_at = now();
```

### 1.7 Section G — Country calendar seeds

```sql
INSERT INTO country_calendar_events (country_target, event_type, event_name, scheduled_at, recurrence, affected_sub_niches, publish_within_hours, metadata) VALUES
  ('AU', 'eofy',              'EOFY (Australian Financial Year End)',           DATE '2026-06-30' + TIME '23:59',     'annual_jun_30',     ARRAY['super_au','tax_au','property_mortgage_au'],          24, '{}'),
  ('AU', 'fy_start',          'New AU Financial Year',                          DATE '2026-07-01' + TIME '00:00',     'annual_jul_01',     ARRAY['super_au','tax_au'],                                  24, '{}'),
  ('AU', 'federal_budget',    'Federal Budget (next scheduled)',                DATE '2026-05-12' + TIME '19:30',     'annual_may',        ARRAY['super_au','tax_au','property_mortgage_au'],            4, '{"speech_window_local":"19:30 AEST"}'),
  ('AU', 'hecs_indexation',   'HECS/HELP Indexation Announcement',              DATE '2026-06-01' + TIME '00:01',     'annual_jun_01',     ARRAY['tax_au'],                                              4, '{}'),
  ('AU', 'q4_window_open',    'Q4 CPM peak window opens',                       DATE '2026-10-01' + TIME '00:00',     'annual_oct_01',     ARRAY['credit_cards_au'],                                    24, '{"action":"prioritize_credit_card_videos"}'),
  ('AU', 'black_friday',      'Black Friday',                                   DATE '2026-11-27' + TIME '00:00',     'annual_friday_after_thanksgiving', ARRAY['credit_cards_au'],                  24, '{}')
ON CONFLICT DO NOTHING;
-- RBA cash-rate dates seeded separately by cron (8 per year, dates change)
```

### 1.8 Section H — Compliance rules seed (Strategy §11.5)

```sql
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
```

### 1.9 Section I — Renderer extension (`render_project_intelligence` v3)

```sql
CREATE OR REPLACE FUNCTION render_project_intelligence(p_project_id UUID, p_stage TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  v_country_target TEXT;
  v_intelligence_block TEXT;
  v_country_compliance TEXT := '';
  v_country_terminology TEXT := '';
  v_country_calendar TEXT := '';
  v_country_demonetization TEXT := '';
  v_niche_subniche TEXT := '';
BEGIN
  -- Resolve project's country_target
  SELECT country_target INTO v_country_target
  FROM projects WHERE id = p_project_id;

  -- ── Existing intelligence_block (9 sources) ──
  -- (Reuses existing logic from migration 029. Body omitted here for brevity;
  -- the production migration retains all of 029's source-pull SQL.)
  SELECT _render_existing_intelligence_v2(p_project_id, p_stage) INTO v_intelligence_block;

  -- ── NEW country slots (only populated for non-GENERAL) ──
  IF v_country_target <> 'GENERAL' THEN
    -- Country compliance block: required disclaimers + ASIC/NCCP rules
    SELECT string_agg(
      format(E'• %s [%s]: %s', rule_id, severity, description),
      E'\n'
    ) INTO v_country_compliance
    FROM country_compliance_rules
    WHERE country_target = v_country_target;
    v_country_compliance := COALESCE('REGULATORY COMPLIANCE RULES:' || E'\n' || v_country_compliance, '');

    -- Country terminology
    v_country_terminology := CASE v_country_target
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

    -- Country calendar: upcoming events in next 90d
    SELECT string_agg(
      format(E'• %s on %s (affects: %s; publish window: %s hours)',
             event_name, scheduled_at::DATE, array_to_string(affected_sub_niches, ', '),
             COALESCE(publish_within_hours::TEXT, 'no urgency')),
      E'\n'
    ) INTO v_country_calendar
    FROM country_calendar_events
    WHERE country_target = v_country_target
      AND scheduled_at > now()
      AND scheduled_at < now() + interval '90 days';
    v_country_calendar := COALESCE('UPCOMING CALENDAR EVENTS (next 90 days):' || E'\n' || v_country_calendar, '');

    -- Country demonetization: blocked phrases roll-up
    SELECT E'PROHIBITED PHRASES (any occurrence triggers Gate-3 block):\n' ||
           string_agg(format(E'• %s [%s]: %s',
                              rule_id,
                              array_to_string(blocked_phrases, ', '),
                              description),
                      E'\n')
    INTO v_country_demonetization
    FROM country_compliance_rules
    WHERE country_target = v_country_target
      AND severity = 'blocker'
      AND array_length(blocked_phrases, 1) > 0;
  END IF;

  -- ── Build final JSONB result ──
  result := jsonb_build_object(
    'intelligence_block',                    COALESCE(v_intelligence_block, ''),
    'country_compliance_block',              COALESCE(v_country_compliance, ''),
    'country_terminology_block',             COALESCE(v_country_terminology, ''),
    'country_calendar_context',              COALESCE(v_country_calendar, ''),
    'country_demonetization_constraints',    COALESCE(v_country_demonetization, ''),
    'niche_variant_subniche_context',        COALESCE(v_niche_subniche, ''),
    'rendered_at',                           now(),
    'project_id',                            p_project_id,
    'stage',                                 p_stage,
    'country_target',                        v_country_target,
    'source_count',                          CASE WHEN v_country_target = 'GENERAL' THEN 9 ELSE 12 END
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 1.10 Section J — Verification function extension

```sql
-- Extend _verify_script_template_vars() to require the 4 new slots in any
-- prompt that references them, AND to require the renderer to supply them.
-- (Pattern from migration 029.)
-- Body of the function is updated in place to add the 4 keys to its checklist.
```

### 1.11 Section K — System prompt updates

For `script_pass1`, `script_pass2`, `script_pass3`, `script_evaluator`, and `topic_generator_master`:

- Bump `version + 1`
- Set old version `is_active = false`
- New version body: existing prose + 4 new variable references appended at the appropriate section seam:

```
{{ intelligence_block }}                      ← already present
{{ niche_variant_subniche_context }}          ← NEW
{{ country_compliance_block }}                ← NEW
{{ country_terminology_block }}               ← NEW
{{ country_calendar_context }}                ← NEW
{{ country_demonetization_constraints }}      ← NEW (only in script_evaluator + demon_audit)
```

The script_evaluator additionally gains an 8th dimension `regulatory_compliance` whose weight is country-keyed (0% for GENERAL, 15% for AU). Other 7 dimension weights renormalize when the 8th is active.

### 1.12 Section L — 12 AU prompts as `system_prompts` rows

Each is a new row with `prompt_type` matching the AU prompt key, `version=1`, `is_active=true`, full body in `$BODY$...$BODY$` quoting. Bodies are taken from `Australia/CARDMATH_AU_IMPLEMENTATION_PROMPTS_v1.md`.

```sql
INSERT INTO system_prompts (prompt_type, prompt_text, version, is_active, description) VALUES
  ('topic_discover_au',         $BODY$...$BODY$, 1, true, 'AU daily topic discovery (P-TOPIC-AU-DISCOVER-v1)'),
  ('topic_event_au',            $BODY$...$BODY$, 1, true, 'AU event-trigger topic generator (P-TOPIC-AU-EVENT-v1)'),
  ('gap_score_au',              $BODY$...$BODY$, 1, true, 'AU Gate-1 gap-score calculator (P-GAP-SCORE-v1)'),
  ('register_classify_au_addendum', $BODY$...$BODY$, 1, true, 'AU sub-niche addendum to WF_REGISTER_ANALYZE'),
  ('demon_audit_au',            $BODY$...$BODY$, 1, true, 'AU demonetization audit (P-DEMON-AUDIT-AU-v1)'),
  ('swot_channel_au',           $BODY$...$BODY$, 1, true, 'AU per-channel SWOT (P-SWOT-CHANNEL-v1)'),
  ('swot_subniche_au',          $BODY$...$BODY$, 1, true, 'AU sub-niche SWOT synthesis (P-SWOT-SUBNICHE-v1)'),
  ('retention_analyze_au',      $BODY$...$BODY$, 1, true, 'AU post-publish retention analyzer (P-RETENTION-ANALYZE-v1)'),
  ('coach_monthly_au',          $BODY$...$BODY$, 1, true, 'AU monthly coach report (P-COACH-MONTHLY-AU-v1)'),
  ('seo_title_au',              $BODY$...$BODY$, 1, true, 'AU title variants (P-SEO-TITLE-AU-v1)'),
  ('seo_desc_au',               $BODY$...$BODY$, 1, true, 'AU description (P-SEO-DESC-AU-v1)'),
  ('seo_tags_au',               $BODY$...$BODY$, 1, true, 'AU tags (P-SEO-TAGS-AU-v1)'),
  ('thumb_concept_au',          $BODY$...$BODY$, 1, true, 'AU thumbnail concepts (P-THUMB-CONCEPT-AU-v1)'),
  ('thumb_prompt_au',           $BODY$...$BODY$, 1, true, 'AU thumbnail Seedream prompt (P-THUMB-PROMPT-AU-v1)')
ON CONFLICT (prompt_type) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  version = system_prompts.version + 1,
  is_active = true,
  updated_at = now();
```

(The full bodies are in the migration file; this plan abbreviates.)

### 1.13 Section M — Rollback

```sql
-- One transaction block. If anything in Phase 1 fails:
ROLLBACK;
-- And confirm the preflight snapshot (Section 0.4) restores cleanly.
```

---

## 2. Phase 2 — n8n workflows (5 new + 6 patches)

### 2.1 New workflow: `WF_COUNTRY_ROUTER`

**File:** `workflows/WF_COUNTRY_ROUTER.json`
**Trigger:** Execute Workflow Trigger (sub-workflow)
**Inputs:** `{ workflow_name, country_target, prompt_stage }`
**Outputs:** `{ prompt_key, prompt_text, fallback_prompt_key }`

Logic: queries `system_prompts` for `prompt_type = {workflow_name}_{country_target lowercase}` (e.g., `script_pass1_au` for AU). Falls back to `{workflow_name}` (the General master) if AU-specific not found.

### 2.2 New workflow: `WF_TOPIC_INTELLIGENCE`

**File:** `workflows/WF_TOPIC_INTELLIGENCE.json`
**Triggers:**
- Cron: `0 19 * * *` UTC (= 05:00 AEST)
- Webhook: `/webhook/topic-intelligence/run` for manual/event-driven runs

**Logic:**
1. Loop over projects WHERE `country_target IN ('AU')` AND auto-pilot or research enabled
2. Per project: pull recent `research_results` + `competitor_channels` coverage + `country_calendar_events` next 30d
3. Call `topic_discover_au` (or `topic_discover_general` for future markets) via Anthropic
4. For each candidate topic, call `gap_score_au`
5. Filter topics with `gap_score >= sub_niche_threshold` (40 default; 50 for ETF, 30 for tax)
6. Insert top 5 into `topics` table with `country_target`, `niche_variant`, `gap_score`, `gap_score_modifiers`, `review_status='pending'`
7. Log to `production_logs`

### 2.3 New workflow: `WF_DEMONETIZATION_AUDIT`

**File:** `workflows/WF_DEMONETIZATION_AUDIT.json`
**Trigger:** webhook `/webhook/demonetization/audit`
**Called by:** Gate 3 pre-publish hook (chained from `WF_QA_CHECK` completion)

**Logic:**
1. Read topic by ID; if `country_target = 'GENERAL'`, return `{decision: 'clear', skipped: true}` immediately
2. Read final `script_json`, `yt_description`, `yt_tags`, `niche_variant`
3. Read `country_compliance_rules` for the project's `country_target`
4. Call `demon_audit_au` Anthropic prompt with full inputs
5. Update `topics.demonetization_audit_result` JSONB with violations/warnings/clears
6. Set `topics.compliance_review_status`:
   - `'not_required'` → `'approved'` if `decision='clear'`
   - `'pending'` if `decision='manual_review_required'`
   - `'rejected'` if `decision='block'`
7. Log to `production_logs`

### 2.4 New workflow: `WF_COACH_REPORT`

**File:** `workflows/WF_COACH_REPORT.json`
**Trigger:** Cron: `0 6 1 * *` UTC (1st of each month, 06:00 UTC)
**Logic:**
1. For each project WHERE `country_target IN ('AU','GENERAL')` AND has ≥1 published topic in prior month
2. Aggregate prior-month performance from `topics.yt_*`
3. Pull `country_calendar_events` for next month
4. Pull recent competitor moves from `channel_analyses`
5. Call `coach_monthly_au` (AU) or future `coach_monthly_general`
6. Insert into `coach_reports` table

### 2.5 New workflow: `WF_COMPETITOR_ANALYZER`

**File:** `workflows/WF_COMPETITOR_ANALYZER.json`
**Trigger:** Cron: weekly Sunday 02:00 UTC + webhook for on-demand
**Logic:** orchestrates `WF_DISCOVER_COMPETITORS` → `WF_CHANNEL_ANALYZE` per channel → `swot_channel_au` per analysis → `swot_subniche_au` synthesis. Writes to `analysis_groups` + `channel_analyses` (existing tables).

### 2.6 Switch-node patches (6 existing workflows)

**Pattern, applied identically to each:**

Insert a Switch node immediately after the project lookup that fetches `country_target`. Two outputs:
- `country_target = 'AU'` → branch loads `<prompt_key>_au` from `system_prompts`
- otherwise → branch loads `<prompt_key>` (General master)

Both branches converge at the Anthropic call.

| Workflow | Location of the Switch | AU prompt key |
|---|---|---|
| `WF_TOPICS_GENERATE` | After project lookup, before "Build Topic Prompt" | `topic_generator_master` (same — no AU override; AU specificity comes from intelligence_block country slots) |
| `WF_SCRIPT_PASS` | After topic lookup, before "Build Pass Prompt" | `script_pass{1,2,3}` (same — country slots fill the country-specific content) |
| `WF_REGISTER_ANALYZE` | After topic lookup, before classifier | Append `register_classify_au_addendum` to existing prompt for AU branch |
| `WF_VIDEO_METADATA` | After topic lookup | AU branch uses `seo_title_au` + `seo_desc_au` + `seo_tags_au`; General continues current prompt |
| `WF_THUMBNAIL_GENERATE` | After topic lookup | AU branch uses `thumb_concept_au` + `thumb_prompt_au`; General continues current prompt |
| `WF_ANALYTICS_CRON` | Per-topic, after metadata pull | AU branch additionally calls `retention_analyze_au` (writes to `topics.next_video_directives`); General skip |

These are surgical n8n UI edits. Each is a one-Switch-plus-one-credential change. Document the precise node-by-node deltas in the runbook.

---

## 3. Phase 3 — Dashboard `/au/*` tab

**Files in `dashboard/src/`:**
- `components/Sidebar.jsx` — add General / Australia toggle, scope nav by active tab
- `App.jsx` — lazy-load 3 new pages, scope existing routes by `country_target`
- `pages/ProjectsHome.jsx` — filter by active tab's `country_target`
- `components/CreateProjectModal.jsx` — when active tab = AU, force `country_target='AU'`, expose `language` (`en-AU`), `channel_type` (standalone/hub/spoke), `parent_project_id`, niche-variant multi-select sourced from `niche_variants` table
- `pages/TopicReview.jsx` — add `gap_score` column + sort, modifier breakdown
- `pages/ScriptReview.jsx` — show 8th dimension when AU
- `pages/VideoReview.jsx` — add **Demonetization Audit** panel reading `demonetization_audit_result` (AU only)
- `pages/Settings.jsx` — new AU section: `cost_ceiling_usd`, sub-niche weight sliders, force-0%-I2V toggle (default ON for AU)
- `pages/AUCalendar.jsx` (NEW) — at `/au/:projectId/calendar`, FY-aware
- `pages/AUSWOT.jsx` (NEW) — at `/au/:projectId/swot`
- `pages/AUCoachReports.jsx` (NEW) — at `/au/:projectId/coach`
- `components/PromptCard.jsx` — when row's `requires_compliance_role=true`, save action shows "Type CONFIRM to save" modal
- `components/ComplianceInbox.jsx` (NEW) — list of topics WHERE `compliance_review_status = 'pending'`, link to VideoReview

All new components follow existing design system (Tailwind tokens + `src/components/ui/`).

---

## 4. Phase 4 — AU competitor seed via `WF_DISCOVER_COMPETITORS`

After Phase 1+2 deploy, run `WF_DISCOVER_COMPETITORS` once per AU sub-niche with the seed channels from Strategy §3.3 / 4.3 / 5.3 / 6.3 / 7.3. Per niche:

```bash
curl -X POST https://n8n.srv1297445.hstgr.cloud/webhook/discover-competitors \
  -H "Authorization: Bearer $DASHBOARD_API_TOKEN" \
  -d '{"project_id":"<au_hub_uuid>","seed_channel_handles":["@PointHacks","@FrequentFlyerSolutions","@DanielSciberras","@AshlynneEaton"],"sub_niche":"credit_cards_au"}'
```

Repeat per sub-niche. Each run populates `discovered_channels` + `channel_analyses` per the existing pipeline.

---

## 5. Phase 5 — Smoke tests

### 5.1 Project creation

```sql
-- Create the AU hub project
INSERT INTO projects (name, niche, country_target, language, channel_type, cost_ceiling_usd, niche_description)
VALUES ('CardMath_AU_Hub', 'australian_personal_finance', 'AU', 'en-AU', 'hub', 8.00, 'CardMath Australia: 5 sub-niches')
RETURNING id;
```

### 5.2 Run `WF_TOPIC_INTELLIGENCE` once

```bash
curl -X POST https://n8n.srv1297445.hstgr.cloud/webhook/topic-intelligence/run \
  -H "Authorization: Bearer $DASHBOARD_API_TOKEN" \
  -d '{"project_id":"<hub_id>","sub_niche_weights":{"credit_cards_au":0.4,"super_au":0.2,"property_mortgage_au":0.15,"tax_au":0.15,"etf_investing_au":0.1}}'
```

Verify: 5 new `topics` rows with `country_target='AU'`, `niche_variant` populated, `gap_score` populated.

### 5.3 Approve top topic at Gate 1, run script generation

Verify `WF_SCRIPT_PASS` reads the correct AU-aware prompts (the Switch node routes to the slot-populated General master), `topics.script_json` populates with AU disclaimers in the appropriate scenes, evaluator returns 8 dimensions.

### 5.4 Approve script at Gate 2, run shared production

Verify `WF_TTS_AUDIO` uses `en-AU-Studio-N` voice. `WF_IMAGE_GENERATION` resolves `image_anchors.credit_cards_au` from Register 02. `WF_KEN_BURNS` and `WF_CAPTIONS_ASSEMBLY` produce identically-shaped output as for General projects.

### 5.5 Run `WF_DEMONETIZATION_AUDIT` at Gate 3

Verify `topics.demonetization_audit_result` populates, `compliance_review_status` flips. Dashboard VideoReview shows the audit panel.

### 5.6 Verify zero impact on General path

Run a full pipeline for an existing General project. Verify:
- `country_target = 'GENERAL'`, slot variables resolve empty
- `WF_SCRIPT_PASS` uses original `script_pass{1,2,3}` text byte-for-byte (the country slots simply add empty space)
- TTS uses original `tts_voice` string (the new `tts_voice_by_country` object's `GENERAL` key holds the same value)
- Image gen uses existing `image_anchors` keys
- Output is identical to pre-overlay output

---

## 6. Rollback

If Phase 5.6 shows ANY drift on General output:

```bash
ssh -i ~/.ssh/id_ed25519_antigravity root@srv1297445.hstgr.cloud \
  "docker exec -i supabase-db-1 psql -U postgres -d postgres < /tmp/au_overlay_preflight_*.sql"
```

Plus disable the 5 new workflows + revert the 6 Switch nodes.

The Phase 1 migration is in a single `BEGIN ... COMMIT` so rollback is trivial.

---

## 7. Phase ordering (deployment sequence)

| Step | Action | Verify before next |
|---|---|---|
| 1 | Apply migration 032 (Phase 1, all sections A–L atomic) | `SELECT version FROM schema_migrations` shows 032 |
| 2 | Import 5 new workflow JSONs into n8n | Each appears in workflow list, activated |
| 3 | Apply 6 Switch-node patches via n8n UI | Each workflow's executions show country branch firing for AU rows |
| 4 | Deploy dashboard build | `/au/*` routes load; tab toggle works |
| 5 | Run 4-channel competitor seed via `WF_DISCOVER_COMPETITORS` | `discovered_channels` populated with ≥4 AU rows per sub-niche |
| 6 | Smoke tests 5.1–5.6 | All pass |
| 7 | First 5 AU videos through full pipeline | All complete; per-video cost ≤$8 |

---

## 8. Verification checklist (post-Phase 7)

- [ ] `SELECT count(*) FROM projects WHERE country_target='AU'` ≥ 1 (hub created)
- [ ] `SELECT count(*) FROM niche_variants WHERE country_target='AU'` = 5
- [ ] `SELECT count(*) FROM prompt_templates WHERE template_type='disclaimer' AND template_key LIKE 'AU:%'` = 4
- [ ] `SELECT count(*) FROM country_calendar_events WHERE country_target='AU'` ≥ 6
- [ ] `SELECT count(*) FROM country_compliance_rules WHERE country_target='AU'` = 4
- [ ] `SELECT count(*) FROM system_prompts WHERE prompt_type LIKE '%_au'` ≥ 12
- [ ] `SELECT version FROM system_prompts WHERE prompt_type='script_pass1' AND is_active=true` = (previous + 1)
- [ ] `tools/lint_n8n_workflows.py` returns 0 errors across the 5 new workflows
- [ ] `_verify_script_template_vars()` returns 0 drift entries
- [ ] Dashboard `/general/*` and `/au/*` both load
- [ ] First AU video published as unlisted, demonetization audit clear

---

## 9. Out of scope for v1

- **Spoke launch (CardMath_AU_Super)**: Phase 2, ships when hub clears 30 days of CPM signal
- **A/B title + thumbnail picker UI** (Feature N4): Phase 2; AU launches with single-variant
- **RBA event-trigger automation**: cron-only at v1; webhook-driven event publishing layer ships in Phase 2
- **Compliance role system**: F2 deliberately deferred — `requires_compliance_role` boolean is the v1 gate

---

## 10. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `_verify_script_template_vars()` rejects the new slots after migration | Low | High | Migration is atomic; rejection rolls back the prompt updates with the schema |
| AU `tts_voice_by_country` object shape breaks an unobserved General code path | Low | High | Backwards-compat: `tts_voice` string column is unchanged; resolver checks object first, falls back to string |
| Switch nodes default to wrong branch (i.e., AU project routes through General prompts) | Medium | Medium | Each Switch validates `country_target` value; default branch is General; explicit AU branch matches `'AU'` literal |
| `WF_TOPIC_INTELLIGENCE` cron fires before `competitor_channels` is seeded | High | Low | First-day output low quality but non-blocking; second-day after seed runs is correct |
| Operator forgets to seed the 4 disclaimer rows before AU video #1 ships | Low | High | Migration 032 includes the seed atomically; `requires_compliance_role` true on AD-01/02/04 prevents accidental edit |
| Prompt v2 drift on General projects (the country slots stay empty but mistyped variable names cause silent template render failure) | Low | High | `_verify_script_template_vars()` catches; drift detector `tools/verify_prompt_sync.py` runs in CI |
| AU disclaimer wording change required by ASIC update | Medium | Medium | PromptCard versioning handles in flight; old version stays as `is_active=false` for audit |

---

**Document version:** v1
**Prepared:** 2026-04-25
**Estimated total deploy effort:** ~12.5 days from green-light to first AU video publishing
**Reversibility:** Full — single-migration rollback + workflow deactivation
