# Implementation Plan — Register Prompt Library Update (v3, Executable)

**Status:** Ready to execute. Verified against live Supabase + n8n on 2026-04-18.
**Supersedes:** `REGISTER_PROMPT_IMPLEMENTATION_GUIDE_v2.md` for execution purposes (v2 remains the design document).
**Reference:** Register copy/anchors sourced from `REGISTER_01_IMAGE_PROMPTS.md` through `REGISTER_05_IMAGE_PROMPTS.md` in this folder.

This plan bakes in three corrections that v2 missed when cross-checked against the live schema:

| # | v2 assumption | Live reality | Fix applied here |
|---|---|---|---|
| A | Archive has 4 era keys (`1920s, 1960s, 1980s, 2000s`) | Archive has **5** keys — `modern` also present | Phase 1 §2.2 includes a 5th UPDATE for `modern` |
| B | Phase 3 proposes a new column `register_analysis_json` | Column is named `register_recommendations` (migration 023) and already holds the `{top_2, all_5_ranked, era_detected}` payload | Phase 3 §5.5 reuses `register_recommendations` |
| C | Phase 2 resolver reads `topic.niche_variant` | `Prepare Image Data` currently SELECTs only `production_register, register_era_detected` — won't receive `niche_variant` | Phase 2 §4.3 extends the SELECT list; listed as a required one-line edit |

Everything else from v2 stands, including the 3-branch resolver precedence (era wins → niche object → string fallback).

---

## 0. Key IDs, paths, and live facts

### Workflows (n8n)
| Workflow | ID | Role |
|---|---|---|
| `WF_IMAGE_GENERATION` | `ScP3yoaeuK7BwpUo` | Holds `Prepare Image Data` + `Fire All Scenes` |
| `WF_SCRIPT_GENERATE` | `DzugaN9GtVpTznvs` | Holds `Build Visual Prompt` |
| `WF_REGISTER_ANALYZE` | `Miy5h5O7ncIIrnRg` | Claude Haiku register classifier — emits `{top_2, all_5_ranked, era_detected}` |
| `WF_REGISTER_APPROVE` | `2OnmKDOt6M0OFetD` | Handles user register pick at Gate |
| `WF_SCENE_CLASSIFY` | `WaPnGhyhQO2gDemX` | Scene-level video placement + register stamp |

### Live column inventory
| Table.column | Status | Notes |
|---|---|---|
| `production_registers.register_id` | ✅ exists | **Filter key — NOT `register_key`** |
| `production_registers.config` (JSONB) | ✅ exists | Keys: `tts_voice`, `font_family`, `image_anchors`, `image_anchors_by_era` (Archive only), `negative_additions`, `music_bpm_max/min`, `music_mood_keywords`, `ken_burns_default_preset`, `tts_speaking_rate`, `transition_duration_ms`, `typical_scene_length_sec` |
| `production_registers.config.image_anchors_by_era` (Archive) | ✅ 5 keys | `1920s, 1960s, 1980s, 2000s, modern` |
| `topics.production_register` | ✅ exists | Migration 023 |
| `topics.register_selected_at` | ✅ exists | Migration 023 — **use this, don't add duplicates** |
| `topics.register_era_detected` | ✅ exists | Migration 023 |
| `topics.register_recommendations` (JSONB) | ✅ exists | Migration 023 — holds the full `WF_REGISTER_ANALYZE` output |
| `topics.niche_variant` | ❌ does not exist | Phase 2 adds this |
| `production_registers.config.metadata_prompt` | ❌ does not exist | Phase 3 adds this sub-key |

### External endpoints
- Dashboard: `https://dashboard.operscale.cloud`
- n8n: `https://n8n.srv1297445.hstgr.cloud`
- Supabase REST: `https://supabase.operscale.cloud`
- VPS: `root@srv1297445.hstgr.cloud` (key: `~/.ssh/id_ed25519_antigravity`)
- Supabase DB container: `supabase-db-1`
- n8n container: `n8n-n8n-1`

### Active topic at time of writing
- Topic `2967980a-31b3-4fa0-978d-4e9aea011e73` ("What Happened to the Family Kitchen?")
- Project `4bdfbbe3-2a9c-4532-95e9-41a743e8c253` (Kitchen)
- `production_register = REGISTER_05_ARCHIVE`
- `register_era_detected = 1960s`
- Status `script_approved`, scenes pending (161 total, 16 `has_video=true`)

---

## 1. Preflight snapshot (run before any Phase)

### 1.1 Capture current state for rollback

```sql
-- Save output to production_registers_snapshot_YYYY_MM_DD.csv
SELECT
  register_id,
  config->>'image_anchors' AS current_image_anchors,
  config->'image_anchors_by_era' AS current_image_anchors_by_era,
  config->>'negative_additions' AS current_negative_additions,
  updated_at
FROM production_registers
ORDER BY register_id;
```

Run via:
```bash
ssh -i ~/.ssh/id_ed25519_antigravity root@srv1297445.hstgr.cloud \
  "docker exec supabase-db-1 psql -U postgres -d postgres -c \"<SQL>\"" \
  > production_registers_snapshot_$(date +%Y_%m_%d).txt
```

### 1.2 Verify expected register IDs

```sql
SELECT register_id, COUNT(*) FROM production_registers GROUP BY register_id ORDER BY register_id;
```

Expected 5 rows with IDs `REGISTER_01_ECONOMIST`, `REGISTER_02_PREMIUM`, `REGISTER_03_NOIR`, `REGISTER_04_SIGNAL`, `REGISTER_05_ARCHIVE`. If any differ, halt and reconcile.

### 1.3 Verify Archive era keys

```sql
SELECT jsonb_object_keys(config->'image_anchors_by_era') AS era_keys
FROM production_registers
WHERE register_id = 'REGISTER_05_ARCHIVE';
```

Expected 5 keys: `1920s, 1960s, 1980s, 2000s, modern`. If count differs, adjust Phase 1 §2.2 to match.

---

## 2. PHASE 1 — SQL-only upgrade (~20 minutes, fully reversible)

**Goal:** Visible register flavor in the next production run without touching code or workflows.

**What changes:** `image_anchors` (plain string) + `negative_additions` for all 5 registers. For Archive additionally: all 5 `image_anchors_by_era` keys.

**What does NOT change:** Any workflow, any node, any code, `projects.style_dna`, 4-part formula, Universal Negative, topic flow, scene classifier.

### 2.1 Registers 01–04 (single-string `image_anchors`)

Run as one transaction:

```sql
BEGIN;

-- REGISTER 01 — THE ECONOMIST
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  to_jsonb('editorial documentary photography, natural cinematic lighting with single-source directional key, shallow depth of field, muted controlled-warmth color palette, subtle 35mm film grain, rule-of-thirds composition with negative space preserved for overlay typography, professional editorial color grading, documentary photorealism, cinematic still frame, people as silhouettes or hands or figures from behind'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_01_ECONOMIST';

-- REGISTER 02 — PREMIUM AUTHORITY
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  to_jsonb('luxury editorial photography, cinematic natural lighting with strong directional warm key, extreme shallow depth of field with creamy bokeh, warm tungsten and amber highlights, rich deep shadows with preserved detail, 85mm lens Leica M aesthetic, Kodak Portra 400 color palette, subtle film grain, golden hour or interior tungsten lighting, generous negative space, aspirational cinematic atmosphere, people as silhouettes or hands'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_02_PREMIUM';

-- REGISTER 03 — INVESTIGATIVE NOIR
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  to_jsonb('dark investigative documentary photography, heavy chiaroscuro with deep black shadows, single harsh directional light source creating hard-edged shadow patterns, desaturated color palette with muted browns and cold blues, bleach bypass aesthetic, pronounced 16mm film grain, vignetting, oblique angle perspective, surveillance-photograph or leaked-document quality, low-key lighting, high detail but intentionally degraded'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_03_NOIR';

-- REGISTER 04 — SIGNAL (TECH FUTURIST)
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  to_jsonb('clean modern product photography, cool blue-dominant key lighting with selective warm amber accent rim, deep blue-black atmospheric shadows, extreme shallow depth of field, tack-sharp focus with subtle bloom on specular highlights, macro or architectural perspective, minimalist composition with generous negative space, Apple keynote aesthetic with Blade Runner 2049 sensibility, futuristic cinematic still'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_04_SIGNAL';

-- Gate check: expect 4 updated rows within the last minute
SELECT register_id, updated_at
FROM production_registers
WHERE updated_at > NOW() - INTERVAL '1 minute'
ORDER BY register_id;

-- If count != 4, ROLLBACK. Otherwise:
COMMIT;
```

### 2.2 Register 05 Archive (era-keyed + no-era fallback) — **includes `modern`**

Archive's `image_anchors_by_era` wins over plain `image_anchors` whenever `register_era_detected` is set. Update all 5 keys + the plain fallback.

```sql
BEGIN;

-- 1920s: early silver-halide, sepia-leaning
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors_by_era, 1920s}',
  to_jsonb('vintage archival photography, early 20th-century sepia-leaning aesthetic with warm cream and amber tones, heavy silver-halide grain characteristic of period film stock, soft period lens characteristics with gentle falloff, natural period lighting (gaslight, incandescent bulbs, window daylight), period-accurate Art Deco and early-modern wardrobe and architectural detail, no anachronistic modern items, soft warm vignetting, archival paper-texture overlay feel, photo-album aesthetic, documentary photorealism'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_05_ARCHIVE';

-- 1960s: Kodachrome + Life magazine (Kitchen topic uses this)
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors_by_era, 1960s}',
  to_jsonb('vintage Kodachrome photography, 1960s Life magazine aesthetic, warm faded colors with amber and rust tones, slightly overexposed highlights characteristic of Kodachrome film stock, high-silver-content film grain, soft period lens characteristics, period-accurate mid-century wardrobe and Formica-and-Frigidaire domestic detail, period automobiles, no anachronistic modern items, natural period-appropriate lighting with warm tungsten or morning window light, warm vignetting, photo-album aesthetic, documentary photorealism'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_05_ARCHIVE';

-- 1980s: Velvia saturation + period fluorescent
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors_by_era, 1980s}',
  to_jsonb('late-1980s photography aesthetic with Fuji Velvia-leaning saturation but still-faded nostalgic cast, moderate film grain, period-accurate 1980s styling (period business wardrobe, period automobiles, period signage, period office technology but no personal computers or smartphones), warm tungsten or period-fluorescent lighting, slight anamorphic lens-flare characteristics, warm vignetting, photo-album aesthetic, documentary photorealism'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_05_ARCHIVE';

-- 2000s: early color negative / early digital
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors_by_era, 2000s}',
  to_jsonb('early-2000s color negative film or early-digital photography aesthetic, slightly faded saturation, period-accurate styling with early-2000s wardrobe and technology (flip phones, period automobiles, CRT monitors, period signage but no smartphones), mild grain, familiar nostalgic warmth, natural mixed lighting, warm vignetting, photo-album aesthetic, documentary photorealism'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_05_ARCHIVE';

-- modern: contemporary family drama / intimate retrospective (v2 MISSED THIS)
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors_by_era, modern}',
  to_jsonb('intimate contemporary family documentary photography, warm domestic lighting with natural indoor window light, shallow depth of field on personal objects, photo-album aesthetic applied to modern subjects with subtle faded warmth, Kodak Portra 400 simulation on contemporary settings, moderate film grain, nostalgic intimate mood even in present-day scenes, period-accurate contemporary wardrobe and technology, rule-of-thirds composition preserving domestic detail, documentary photorealism, people as silhouettes or hands'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_05_ARCHIVE';

-- Plain image_anchors: no-era fallback
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  to_jsonb('vintage archival photography, era-appropriate film simulation aligned to the period indicated in the subject prompt, warm faded nostalgic color palette, heavy silver-halide film grain, soft period lens characteristics, natural period-appropriate lighting, archival quality with subtle age degradation, warm vignetting, period-accurate wardrobe and technology with explicitly no anachronisms, photo-album aesthetic, documentary photorealism'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_05_ARCHIVE';

-- Verification: 5 era keys present and lengths reasonable
SELECT
  jsonb_object_keys(config->'image_anchors_by_era') AS era_keys,
  LENGTH(config->'image_anchors_by_era'->>'1920s') AS len_1920s,
  LENGTH(config->'image_anchors_by_era'->>'1960s') AS len_1960s,
  LENGTH(config->'image_anchors_by_era'->>'1980s') AS len_1980s,
  LENGTH(config->'image_anchors_by_era'->>'2000s') AS len_2000s,
  LENGTH(config->'image_anchors_by_era'->>'modern') AS len_modern,
  LENGTH(config->>'image_anchors') AS len_string_fallback
FROM production_registers
WHERE register_id = 'REGISTER_05_ARCHIVE';

-- Expected: all 5 keys present, each length 400-700 chars, string fallback ~400
COMMIT;
```

### 2.3 `negative_additions` for all 5 registers

```sql
BEGIN;

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{negative_additions}',
  to_jsonb('oversaturated colors, cartoonish style, garish neon, grunge aesthetic, dark noir aesthetic, warm golden luxurious aesthetic, futuristic tech aesthetic, surveillance camera quality'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_01_ECONOMIST';

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{negative_additions}',
  to_jsonb('cheap materials, plastic surfaces, chrome, neon, fluorescent lighting, cold color temperature, harsh shadows, cluttered composition, modern clinical tech aesthetic, sterile studio lighting, budget product photography, grunge aesthetic'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_02_PREMIUM';

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{negative_additions}',
  to_jsonb('warm golden light, luxurious aesthetic, bright cheerful mood, vibrant saturated colors, modern sleek tech aesthetic, clinical clean studio lighting, decorative bokeh, joyful expressions, aspirational lifestyle imagery, Kodak Portra 400 warmth, editorial magazine glossy'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_03_NOIR';

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{negative_additions}',
  to_jsonb('warm golden light, nostalgic aesthetic, heavy film grain, organic textures, vintage photography look, historical period styling, wood and leather surfaces, warm tungsten cozy interior, Kodak Portra 400 warmth, bleach bypass desaturation, noir deep-shadow aesthetic'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_04_SIGNAL';

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{negative_additions}',
  to_jsonb('modern digital aesthetic, cold color temperature, neon, chrome, futuristic technology, smartphones in period scenes, flat screens in period scenes, clinical studio lighting, high dynamic range processing, aggressive saturation, HUD elements, cyberpunk aesthetic, anachronistic modern items in period scenes, bleach bypass desaturation, heavy noir shadows'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_05_ARCHIVE';

-- Expect 5 rows updated
SELECT COUNT(*) FROM production_registers WHERE updated_at > NOW() - INTERVAL '1 minute';
COMMIT;
```

### 2.4 Phase 1 testing — micro-run verification (run BEFORE firing production)

For the Kitchen topic specifically, verify Archive's era=1960s lookup wins:

```sql
SELECT
  s.scene_number,
  s.composition_prefix,
  s.image_prompt AS scene_subject,
  t.register_era_detected,
  CASE
    WHEN t.production_register = 'REGISTER_05_ARCHIVE'
      AND t.register_era_detected IS NOT NULL
      AND pr.config->'image_anchors_by_era' ? t.register_era_detected
    THEN pr.config->'image_anchors_by_era'->>t.register_era_detected
    ELSE pr.config->>'image_anchors'
  END AS resolved_register_anchors,
  p.style_dna,
  LENGTH(
    s.composition_prefix || ' ' || s.image_prompt || ' ' ||
    CASE
      WHEN t.production_register = 'REGISTER_05_ARCHIVE'
        AND t.register_era_detected IS NOT NULL
        AND pr.config->'image_anchors_by_era' ? t.register_era_detected
      THEN pr.config->'image_anchors_by_era'->>t.register_era_detected
      ELSE pr.config->>'image_anchors'
    END || ' ' || p.style_dna
  ) AS resolved_prompt_length_chars
FROM scenes s
JOIN topics t ON t.id = s.topic_id
JOIN projects p ON p.id = s.project_id
JOIN production_registers pr ON pr.register_id = t.production_register
WHERE t.id = '2967980a-31b3-4fa0-978d-4e9aea011e73'
  AND s.scene_number IN (1, 50, 150)
ORDER BY s.scene_number;
```

**Pass criteria:**
- `resolved_register_anchors` contains "Kodachrome" and "Life magazine" (confirms era=1960s lookup won)
- `resolved_prompt_length_chars` < 1500
- No duplicate phrases between `scene_subject` and `resolved_register_anchors`

### 2.5 Phase 1 rollback

Use snapshot from §1.1. One transaction:

```sql
BEGIN;

UPDATE production_registers
SET config = jsonb_set(jsonb_set(config,
    '{image_anchors}', to_jsonb('<OLD_STRING>'::text)),
    '{negative_additions}', to_jsonb('<OLD_NEGATIVES>'::text)),
  updated_at = NOW()
WHERE register_id = 'REGISTER_01_ECONOMIST';

-- ...repeat for 02, 03, 04

-- Archive: restore all 5 era entries + string + negatives
UPDATE production_registers
SET config = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(config,
    '{image_anchors_by_era, 1920s}',  to_jsonb('<OLD>'::text)),
    '{image_anchors_by_era, 1960s}',  to_jsonb('<OLD>'::text)),
    '{image_anchors_by_era, 1980s}',  to_jsonb('<OLD>'::text)),
    '{image_anchors_by_era, 2000s}',  to_jsonb('<OLD>'::text)),
    '{image_anchors_by_era, modern}', to_jsonb('<OLD>'::text)),
    '{image_anchors}',                to_jsonb('<OLD>'::text)),
    '{negative_additions}',           to_jsonb('<OLD>'::text)),
  updated_at = NOW()
WHERE register_id = 'REGISTER_05_ARCHIVE';

COMMIT;
```

---

## 3. PHASE 2 — Niche variants (2–3 hours)

**Precondition:** Phase 1 complete and stable.
**Goal:** Niche-specific anchors (Economist Real Estate, Premium Travel, Noir Fraud, Signal Crypto, etc.)

### 3.1 JSONB reshape — Registers 01–04 only

```sql
BEGIN;

-- REGISTER 01: primary + real_estate + legal_tax
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  jsonb_build_object(
    'primary', config->>'image_anchors',
    'real_estate', 'editorial architectural photography, natural daylight with golden-hour bias, medium depth of field preserving architectural detail, warm-muted earth-tone palette, subtle 35mm grain, horizontal sky-ground composition, professional real-estate editorial grading, documentary photorealism, people as silhouettes or hands',
    'legal_tax', 'editorial documentary photography, cool-neutral institutional lighting, medium depth of field, muted desaturated color palette with blue-gray bias, subtle 35mm grain, formal rule-of-thirds composition, institutional editorial grading, documentary photorealism, people as silhouettes or hands'
  )
),
updated_at = NOW()
WHERE register_id = 'REGISTER_01_ECONOMIST';

-- REGISTER 02: primary + real_estate + travel_lifestyle
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  jsonb_build_object(
    'primary', config->>'image_anchors',
    'real_estate', 'luxury architectural photography, natural golden-hour daylight with warm directional rake, medium-shallow depth of field preserving architectural detail, rich earth-tone and warm-neutral color palette, deep preserved-shadow detail, 35-85mm lens, Kodak Portra 400 palette, subtle film grain, horizontal sky-ground composition, aspirational atmosphere, luxury real-estate editorial aesthetic',
    'travel_lifestyle', 'luxury lifestyle editorial photography, cinematic natural lighting with warm directional key, extreme shallow depth of field with creamy atmospheric bokeh, warm amber and tungsten highlights, rich preserved-shadow detail, 85mm lens Leica M aesthetic, Kodak Portra 400 palette, subtle film grain, golden hour favored, intimate rule-of-thirds composition, aspirational cinematic atmosphere, editorial travel-magazine aesthetic'
  )
),
updated_at = NOW()
WHERE register_id = 'REGISTER_02_PREMIUM';

-- REGISTER 03: primary + financial_fraud + dark_family
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  jsonb_build_object(
    'primary', config->>'image_anchors',
    'financial_fraud', 'dark investigative documentary photography, institutional chiaroscuro with deep shadows, single harsh directional source creating long shadow patterns, desaturated muted-institutional palette with cold blue-gray bias, bleach bypass aesthetic, pronounced 16mm film grain, vignetting, forensic document sensibility, leaked-memo quality, low-key institutional lighting, degraded investigative cinematic still',
    'dark_family', 'dark investigative documentary photography, domestic chiaroscuro with deep warm-brown shadows, single harsh directional source creating long shadow patterns, desaturated palette with muted warm-browns and cold blues, bleach bypass aesthetic, pronounced 16mm film grain, vignetting, domestic-forensic sensibility, intimate-investigative quality, low-key lighting, degraded investigative cinematic still'
  )
),
updated_at = NOW()
WHERE register_id = 'REGISTER_03_NOIR';

-- REGISTER 04: primary + crypto_payment + cybersecurity
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  jsonb_build_object(
    'primary', config->>'image_anchors',
    'crypto_payment', 'clean modern product photography, controlled studio lighting with cyan and amber accents, cool color temperature dominant with selective warm rim lighting, deep blue-black shadows with preserved detail, macro perspective emphasizing chip and hardware detail, subtle specular highlights on metallic surfaces, minimalist composition with dark atmospheric depth, Apple keynote fintech aesthetic, tack-sharp focus with subtle bloom',
    'cybersecurity', 'clean modern documentary photography, cool blue-dominant lighting with selective warm amber accents on key subjects, deep blue-black atmospheric shadows, extreme shallow depth of field with atmospheric depth fog, macro or architectural perspective, minimalist composition with dark negative space, Blade Runner 2049 cybersecurity aesthetic, tack-sharp focus with subtle bloom, subtle atmospheric haze'
  )
),
updated_at = NOW()
WHERE register_id = 'REGISTER_04_SIGNAL';

-- Archive NOT reshaped — era-overlay precedence stays dominant.

-- Verification
SELECT
  register_id,
  jsonb_typeof(config->'image_anchors') AS anchors_type
FROM production_registers
ORDER BY register_id;
-- Expect: 01-04 = 'object', 05 = 'string'

COMMIT;
```

### 3.2 Schema: add `topics.niche_variant`

```sql
ALTER TABLE topics ADD COLUMN IF NOT EXISTS niche_variant TEXT;
CREATE INDEX IF NOT EXISTS idx_topics_niche_variant ON topics(niche_variant);
```

Nullable. Resolver treats null as `primary`.

### 3.3 **REQUIRED FIX — Extend `Prepare Image Data` SELECT list**

v2 missed this; without it the resolver always defaults to `primary`.

In `WF_IMAGE_GENERATION.json` → `Prepare Image Data` node, find the topic fetch:

```js
// CURRENT (live code)
url: `${$env.SUPABASE_URL}/rest/v1/topics?id=eq.${topicId}&select=production_register,register_era_detected`
```

Change to:

```js
// PHASE 2
url: `${$env.SUPABASE_URL}/rest/v1/topics?id=eq.${topicId}&select=production_register,register_era_detected,niche_variant`
```

Then extract it alongside the existing fields:

```js
// CURRENT
if (parsedTopic && parsedTopic[0]) {
  registerId  = parsedTopic[0].production_register || '';
  registerEra = parsedTopic[0].register_era_detected || '';
}
```

Becomes:

```js
// PHASE 2
let nicheVariant = '';
if (parsedTopic && parsedTopic[0]) {
  registerId   = parsedTopic[0].production_register || '';
  registerEra  = parsedTopic[0].register_era_detected || '';
  nicheVariant = parsedTopic[0].niche_variant || '';
}
```

### 3.4 Replace resolver block with 3-branch version

In the same node, replace the existing resolver:

```js
// CURRENT
if (cfg.image_anchors_by_era && registerEra && cfg.image_anchors_by_era[registerEra]) {
  registerAnchors = cfg.image_anchors_by_era[registerEra];
} else {
  registerAnchors = cfg.image_anchors || '';
}
```

With:

```js
// PHASE 2 — 3-branch: era wins → niche object → string fallback
let registerAnchors = '';

if (cfg.image_anchors_by_era && registerEra && cfg.image_anchors_by_era[registerEra]) {
  // Branch 1 — Archive era overlay wins when era is detected
  registerAnchors = cfg.image_anchors_by_era[registerEra];
} else if (typeof cfg.image_anchors === 'object' && cfg.image_anchors !== null) {
  // Branch 2 — Object-shaped anchors with niche variant
  const nicheKey = nicheVariant || 'primary';
  registerAnchors = cfg.image_anchors[nicheKey]
    || cfg.image_anchors.primary
    || '';
} else {
  // Branch 3 — Plain string fallback
  registerAnchors = cfg.image_anchors || '';
}
```

Deploy via raw n8n REST PUT (MCP corrupts Code nodes per prior memory). See §6 for deploy script pattern.

### 3.5 Extend `WF_REGISTER_ANALYZE` to emit `niche_variant`

Inside `WF_REGISTER_ANALYZE` (ID `Miy5h5O7ncIIrnRg`), locate the Claude classifier call. The current prompt returns `{top_2, all_5_ranked, era_detected}`. Append to that JSON schema:

Add to the classifier instruction block:

```
Also classify the niche variant for the picked register. Return:

- REGISTER_01_ECONOMIST: 'primary' | 'real_estate' | 'legal_tax'
- REGISTER_02_PREMIUM:   'primary' | 'real_estate' | 'travel_lifestyle'
- REGISTER_03_NOIR:      'primary' | 'financial_fraud' | 'dark_family'
- REGISTER_04_SIGNAL:    'primary' | 'crypto_payment' | 'cybersecurity'
- REGISTER_05_ARCHIVE:   'primary' (era_detected already handles variation)

Default to 'primary' when uncertain. Return in the same JSON as: {"niche_variant": "..."}
```

Persist to `topics.niche_variant` in the same workflow step that writes `production_register`.

### 3.6 Phase 2 rollback

Backward-compatible via the `typeof` check.

```sql
BEGIN;
UPDATE production_registers
SET config = jsonb_set(config, '{image_anchors}', to_jsonb(config->'image_anchors'->>'primary'))
WHERE register_id IN ('REGISTER_01_ECONOMIST','REGISTER_02_PREMIUM','REGISTER_03_NOIR','REGISTER_04_SIGNAL')
  AND jsonb_typeof(config->'image_anchors') = 'object';
COMMIT;
```

Resolver keeps working (falls to string branch). No code revert needed.

---

## 4. PHASE 3 — Register-aware Claude metadata prompt (4–8 hours)

**Precondition:** Phase 1 stable; Phase 2 optional but recommended.
**Goal:** `scenes.image_prompt` (Claude-written) becomes register-aware.

### 4.1 Reuse — do not rebuild

| Artifact | Status | Action |
|---|---|---|
| `topics.production_register` | Exists (mig 023) | Use as-is |
| `topics.register_selected_at` | Exists (mig 023) | Use as-is — do NOT add `register_confirmed_at` |
| `topics.register_recommendations` (JSONB) | **Exists (mig 023)** | Use as-is — **do NOT add `register_analysis_json`** |
| `topics.register_era_detected` | Exists (mig 023) | Use as-is |
| `WF_REGISTER_ANALYZE` | Exists (`Miy5h5O7ncIIrnRg`) | Rewire input, keep output |
| `RegisterSelector` React component | Exists (dashboard) | Relocate mount point to Gate 1 |

### 4.2 Rewire `WF_REGISTER_ANALYZE` for topic-stage input

Currently runs on script text. Add an input-mode branch at the top:

```js
// At start of WF_REGISTER_ANALYZE's entry code node
const inputMode = items[0].json.input_mode || 'script';  // 'topic' | 'script'

let analysisInputText;
if (inputMode === 'topic') {
  analysisInputText = [
    items[0].json.topic_research_brief || '',
    items[0].json.topic_angle || '',
    items[0].json.seo_title || items[0].json.original_title || ''
  ].filter(Boolean).join('\n\n');
} else {
  // Existing script-stage path
  analysisInputText = items[0].json.script_text;
}
// downstream Claude classifier consumes analysisInputText
```

Output shape unchanged: `{top_2, all_5_ranked, era_detected}`. Downstream consumers unaffected.

### 4.3 Wire into topic-research flow

In the topic-research workflow (the one that generates topics and fires Gate 1), after topic objects are built but before Gate 1, call:

```bash
POST ${N8N_WEBHOOK_BASE}/register-analyze
{
  "input_mode": "topic",
  "topic_id": "<topic_id>",
  "topic_research_brief": "<brief>",
  "topic_angle": "<angle>",
  "seo_title": "<title>"
}
```

Persist full output to `topics.register_recommendations` (existing column). Write `topics.production_register = register_recommendations.top_2[0].register_id` as the auto-suggestion — user confirms at Gate 1.

### 4.4 Gate 1 UI — relocate `RegisterSelector`

Current mount: `ProductionMonitor` page, gated on `pipeline_stage === 'register_selection'`.

New mount: Topic approval view (Gate 1), gated on `register_recommendations IS NOT NULL AND register_selected_at IS NULL`.

No rewrite of `RegisterSelector.jsx` — it already consumes `{top_2, all_5_ranked, era_detected}` from `register_recommendations`. Just change where it renders and what condition triggers it.

Update `useRegisterSelector.js` to POST `/webhook/register/approve` at Gate 1 approval (same webhook as today). That webhook sets `production_register` + `register_selected_at`. Remove the register-selection gate from `ProductionMonitor` once Gate 1 integration is live — or keep both paths during the migration period (dashboard can show Gate 1 register pick AND the ProductionMonitor's register pick, with the second a no-op if already confirmed).

### 4.5 Add `metadata_prompt` sub-key per register

```sql
BEGIN;

UPDATE production_registers
SET config = jsonb_set(config, '{metadata_prompt}', to_jsonb(
'Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 01 — THE ECONOMIST. Documentary explainer register: Johnny Harris, Wendover, Polymatter. Authoritative, calm, data-rich. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands, or figures from behind; single-source directional key light; muted palette with controlled warmth; composition preserves negative space for overlay typography; contemplative analytical mood; for data-image scenes use "documentary magazine infographic style" and "no readable specific numbers"; no text or logos in images. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name. Return ONLY JSON array: [{"scene_number": 1, "image_prompt": "...", "emotional_beat": "...", "chapter": "..."}]. Do NOT modify narration. {CHUNK_LIST}'::text)),
updated_at = NOW()
WHERE register_id = 'REGISTER_01_ECONOMIST';

UPDATE production_registers
SET config = jsonb_set(config, '{metadata_prompt}', to_jsonb(
'Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 02 — PREMIUM AUTHORITY. Luxury editorial register: Bloomberg Originals, Rolex brand films, Robb Report. Restraint over flash. Every frame feels expensive. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands, or figures from behind, never eye contact; subjects are metal cards, crystal, leather, watches, fountain pens, marble, mahogany; warm tungsten or golden-hour directional key with long elegant shadows; warm Kodak Portra 400 palette; 85mm Leica M aesthetic; extreme shallow depth of field with creamy bokeh; generous negative space; refined contemplative mood; no logos or brand names. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name. Return ONLY JSON array. {CHUNK_LIST}'::text)),
updated_at = NOW()
WHERE register_id = 'REGISTER_02_PREMIUM';

UPDATE production_registers
SET config = jsonb_set(config, '{metadata_prompt}', to_jsonb(
'Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 03 — INVESTIGATIVE NOIR. True-crime investigation register: LEMMiNO, Netflix Dirty Money, Chernobyl. Tension, gravity, evidence. Every image looks recovered. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands, or figures from behind; single HARSH directional light source (bare bulb, fluorescent, streetlight, cold window); desaturated bleach-bypass palette with cool blue or muted brown bias; deep shadows filling at least 40% of frame; oblique angles never eye-level neutral; bleach bypass or surveillance-photograph quality; tension-forensic-investigative mood; no text or logos. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name. Return ONLY JSON array. {CHUNK_LIST}'::text)),
updated_at = NOW()
WHERE register_id = 'REGISTER_03_NOIR';

UPDATE production_registers
SET config = jsonb_set(config, '{metadata_prompt}', to_jsonb(
'Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 04 — SIGNAL (TECH FUTURIST). Tech/fintech register: ColdFusion, Apple keynote B-roll, Blade Runner 2049 sensibility. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands on devices, or figures from behind; cool blue ambient key with selective warm amber accent rim (never all cool, never warm-dominant); deep blue-black shadows with preserved detail; tack-sharp focus with subtle bloom; macro or architectural perspective; generous negative space with atmospheric depth; Apple keynote or Blade Runner 2049 anchor; HUD corner brackets can be baked in; clinical precise futuristic mood; no readable screen content, no brand names. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name. Return ONLY JSON array. {CHUNK_LIST}'::text)),
updated_at = NOW()
WHERE register_id = 'REGISTER_04_SIGNAL';

UPDATE production_registers
SET config = jsonb_set(config, '{metadata_prompt}', to_jsonb(
'Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 05 — ARCHIVE. Biographical/historical register: Magnates Media, Ken Burns, Apple TV+ retrospectives. Viewer is leafing through an archive. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands, or figures from behind; NEVER prompt with specific real names — use descriptive proxies like "a middle-aged man in a 1958 gray flannel suit"; include year/decade marker; include era-appropriate film simulation (Kodachrome 1950s-60s, Portra 800 1970s-80s, Velvia 1980s-90s, color negative 1990s-2000s, Portra 400 contemporary); include period-accurate wardrobe/technology/vehicles; explicitly exclude anachronisms (no smartphones, no flat screens, no modern logos); natural period-appropriate lighting; warm faded nostalgic palette; reverent contemplative mood. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name with biographical flavor. Return ONLY JSON array. {CHUNK_LIST}'::text)),
updated_at = NOW()
WHERE register_id = 'REGISTER_05_ARCHIVE';

COMMIT;
```

### 4.6 Update `Build Visual Prompt` node

In `WF_SCRIPT_GENERATE.json` (ID `DzugaN9GtVpTznvs`), replace the hardcoded generic prompt with a register-aware branch plus generic fallback:

```js
const chunkList = chunks.map((c, i) => 'CHUNK ' + (i+1) + ': ' + c).join('\n\n');

// Fetch register config if register is set on topic
let register = null;
if (topic.production_register) {
  const resp = await fetch(
    `${$env.SUPABASE_URL}/rest/v1/production_registers?register_id=eq.${topic.production_register}&select=config`,
    { headers: {
        apikey: $env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${$env.SUPABASE_SERVICE_ROLE_KEY}`
    }}
  );
  const rows = await resp.json();
  register = rows[0] || null;
}

const USE_REGISTER_METADATA_PROMPT = true;  // feature flag for rollback

let metadataPrompt;

if (USE_REGISTER_METADATA_PROMPT && register && register.config && register.config.metadata_prompt) {
  metadataPrompt = register.config.metadata_prompt
    .replace('{N}', chunks.length)
    .replace('{SEO_TITLE}', topic.seo_title || topic.original_title)
    .replace('{CHUNK_LIST}', chunkList);
} else {
  // Generic fallback — existing prompt verbatim
  metadataPrompt =
    'Below are ' + chunks.length + ' text chunks from a documentary script about "' +
    (topic.seo_title || topic.original_title) + '".\n\n' +
    'For EACH chunk, generate ONLY:\n' +
    '1. image_prompt: 40-80 words, cinematic. Structure: [SUBJECT] + [ENVIRONMENT] + [LIGHTING] + [COMPOSITION] + [MOOD] + [DETAILS]. Be hyper-specific. People as silhouettes/hands/figures from behind. Include lighting direction. No text/words/signs in images.\n' +
    '2. emotional_beat: one of hook, tension, revelation, data, story, resolution, transition\n' +
    '3. chapter: a short chapter name grouping related scenes\n\n' +
    'Return ONLY a JSON array: [{"scene_number": 1, "image_prompt": "...", "emotional_beat": "...", "chapter": "..."}]\n\n' +
    'Do NOT return or modify any narration text. I only need image_prompt, emotional_beat, and chapter for each chunk number.\n\n' +
    chunkList;
}
```

### 4.7 Phase 3 rollback

Flip the flag:

```js
const USE_REGISTER_METADATA_PROMPT = false;
```

No data rollback. `metadata_prompt` JSONB sub-key stays, just ignored. `topics.production_register` + `register_selected_at` keep flowing.

---

## 5. Verification queries (use after each phase)

### 5.1 Global state
```sql
SELECT
  register_id,
  jsonb_typeof(config->'image_anchors') AS anchors_type,
  LENGTH(config->>'image_anchors') AS anchors_length,
  (config->'image_anchors_by_era' IS NOT NULL) AS has_era_overlay,
  LENGTH(config->>'negative_additions') AS neg_length,
  config ? 'metadata_prompt' AS has_metadata_prompt,
  updated_at
FROM production_registers
ORDER BY register_id;
```

Expected after each phase:

| Phase | `anchors_type` | `has_era_overlay` (Archive) | `has_metadata_prompt` |
|---|---|---|---|
| Pre-1 | string (all) | true | false |
| Post-1 | string (all) | true | false |
| Post-2 | object (01-04), string (05) | true | false |
| Post-3 | object (01-04), string (05) | true | **true** |

### 5.2 Full resolver (works across all phases)
```sql
SELECT
  s.scene_number,
  t.production_register,
  t.register_era_detected,
  t.niche_variant,
  CASE
    WHEN t.production_register = 'REGISTER_05_ARCHIVE'
      AND t.register_era_detected IS NOT NULL
      AND pr.config->'image_anchors_by_era' ? t.register_era_detected
    THEN pr.config->'image_anchors_by_era'->>t.register_era_detected
    WHEN jsonb_typeof(pr.config->'image_anchors') = 'object'
    THEN COALESCE(
      pr.config->'image_anchors'->>COALESCE(t.niche_variant, 'primary'),
      pr.config->'image_anchors'->>'primary'
    )
    ELSE pr.config->>'image_anchors'
  END AS resolved_register_anchors
FROM scenes s
JOIN topics t ON t.id = s.topic_id
JOIN projects p ON p.id = s.project_id
JOIN production_registers pr ON pr.register_id = t.production_register
WHERE s.id = '<SCENE_ID>';
```

---

## 6. Code deploy patterns

### 6.1 Apply SQL via VPS

```bash
ssh -i ~/.ssh/id_ed25519_antigravity root@srv1297445.hstgr.cloud \
  "docker cp /dev/stdin supabase-db-1:/tmp/phase_X.sql && \
   docker exec supabase-db-1 psql -U postgres -d postgres -f /tmp/phase_X.sql" \
  < local_phase_X.sql
```

Or for small statements, inline:
```bash
ssh ... "docker exec supabase-db-1 psql -U postgres -d postgres -c \"<SQL>\""
```

### 6.2 Update n8n Code node via raw REST PUT

MCP tools corrupt Code nodes (strip `mode` parameter). Use the pattern proven in session 38:

```bash
# 1. Fetch workflow JSON
ssh ... "docker exec n8n-n8n-1 sh -c 'curl -s http://localhost:5678/api/v1/workflows/<WORKFLOW_ID> -H \"X-N8N-API-KEY: \$N8N_API_KEY\"'" > wf.json

# 2. Patch the node's parameters.jsCode in local Node.js

# 3. Strip extras + PUT body
node -e "const j=require('./wf.json'); const b={name:j.name,nodes:j.nodes,connections:j.connections,settings:j.settings||{}}; require('fs').writeFileSync('wf_put.json', JSON.stringify(b));"
scp wf_put.json root@srv:/tmp/wf_put.json
ssh ... "docker cp /tmp/wf_put.json n8n-n8n-1:/tmp/wf_put.json && \
         docker exec n8n-n8n-1 sh -c 'curl -s -X PUT http://localhost:5678/api/v1/workflows/<WORKFLOW_ID> \
           -H \"X-N8N-API-KEY: \$N8N_API_KEY\" -H \"Content-Type: application/json\" \
           --data-binary @/tmp/wf_put.json'"

# 4. Verify active:true retained + node code reflects change
```

---

## 7. Rollout calendar

| Week | Phase | Scope |
|---|---|---|
| 1 | Phase 1 | Kitchen project only. Archive era-keyed SQL + verify resolver on scenes 1/50/150. Approve full 170-scene run. Compare first 5 images to pre-change baseline. |
| 2 | Phase 1 | All other projects. Phase 1 data is global (one `production_registers` table) so it already applies — Week 2 is observation only. Monitor CTR + retention. |
| 3–4 | Phase 2 | Reshape Registers 01-04 `image_anchors` to objects. Deploy 3-branch resolver + SELECT fix in `Prepare Image Data`. Extend `WF_REGISTER_ANALYZE` to emit `niche_variant`. Roll out one project at a time. |
| 5–6 | Phase 3 prep | Rewire `WF_REGISTER_ANALYZE` for topic-stage input. Tune classifier on 20+ historical topics. Plan Gate 1 UI relocation. |
| 7–8 | Phase 3 | Add `metadata_prompt` JSONB. Deploy register-aware `Build Visual Prompt` behind feature flag. Roll out one project. Measure. |
| 9+ | Phase 3 | Default-on if flag results hold. |

---

## 8. Success criteria

**Phase 1:**
- All 5 registers updated; Archive has all 5 era keys populated
- Resolved prompt for Kitchen scene 1 contains "Kodachrome" + "Life magazine"
- First 5 Kitchen images visibly warmer/more period than pre-change baseline
- Prompt length under 1500 chars on all sampled scenes

**Phase 2:**
- Registers 01-04 `image_anchors` jsonb_typeof = 'object' with `primary` key
- `topics.niche_variant` column present
- `Prepare Image Data` SELECTs `niche_variant` and resolver's branch-2 fires for a test topic with niche set
- Test real-estate topic under Register 01 produces architectural anchor text

**Phase 3:**
- All 5 registers have `metadata_prompt` sub-key
- `WF_REGISTER_ANALYZE` accepts `input_mode='topic'` and runs pre-script
- `topics.register_recommendations` populated before Gate 1 for new topics
- `RegisterSelector` renders at Gate 1
- Test topic with register set at Gate 1 produces register-flavored `scenes.image_prompt` values (Archive topic sees "Kodachrome", "1960s"; Noir topic sees "bleach bypass", "harsh directional")

---

## 9. Known unknowns before execution

1. Does the topic-research workflow have an obvious hook-in point for calling `WF_REGISTER_ANALYZE` with `input_mode='topic'`? Need to inspect whichever workflow currently fires Gate 1 topic approval.
2. Does the Gate 1 dashboard view have room for the RegisterSelector component, or does it need layout work?
3. Are there any projects with `projects.style_dna` values that conflict with the new register anchors (e.g., project style_dna that already contains "Kodachrome" — would cause stacking for Archive)? A pre-flight audit across projects.style_dna is recommended before Phase 1 goes global in Week 2.

---

## 10. Reference files

- This plan: `image_creation_guidelines_prompts/IMPLEMENTATION_PLAN_v3_EXECUTABLE.md`
- Design doc (v2): `image_creation_guidelines_prompts/REGISTER_PROMPT_IMPLEMENTATION_GUIDE_v2.md`
- Source copy: `image_creation_guidelines_prompts/REGISTER_0{1-5}_IMAGE_PROMPTS.md`
- Base pipeline: `image_creation_guidelines_prompts/IMAGE_GENERATION_PROMPTS.md`
- Live workflow JSONs: fetched via n8n API (see §6.2)
