# Vision GridAI — Register Prompt Library Implementation Guide (v2)

**Supersedes v1.** v2 fixes three bugs that would have broken the v1 guide if executed verbatim against the live Supabase schema:

1. **Bug 1 — Wrong column name.** Every `UPDATE` in v1 filtered by `WHERE register_key = ...`. The actual column is `register_id`. v1 SQL would have no-oped on all 5 registers. Fixed globally in v2.
2. **Bug 2 — Wrong node targeted in Phase 2.** v1 said to edit `Fire All Scenes` to resolve niche-variant anchors. The actual resolution happens upstream in `Prepare Image Data`, which already handles the `image_anchors_by_era` overlay for Archive. v2's Phase 2 edit targets `Prepare Image Data` and extends the existing era-first precedence.
3. **Bug 3 — Archive era overlay was ignored.** Archive's `production_registers.config.image_anchors_by_era` object (keyed by era: `1920s`, `1960s`, `1980s`, `2000s`) wins over the plain `image_anchors` string whenever a topic has `register_era_detected` set. v1 only updated `image_anchors`, so for Archive topics with an era detected (including the Kitchen topic at era=1960s), v1's Phase 1 upgrade would have been dead text. v2 provides era-keyed `UPDATE` statements for Archive and leaves `image_anchors` as a safe fallback.

Other v2 corrections, documented in-line:

- Phase 3 reuses the existing `WF_REGISTER_ANALYZE` workflow (`Miy5h5O7ncIIrnRg`) instead of proposing a new topic-stage classifier.
- Phase 3 uses the existing `topics.register_selected_at` column from migration 023 instead of adding a duplicate `register_confirmed_at`.
- Phase 3 does not re-add `topics.production_register` — the column already exists.
- Gate 1 UI guidance preserves the existing `RegisterSelector` component's rich output (`top_2`, `all_5_ranked`, `era_detected`) rather than simplifying to a dropdown.

---

## 1. Executive Summary

The proposed register prompt library delivers a real visual upgrade. v2 rolls it out in three phases, each independently shippable and reversible:

**Phase 1 (30–60 minutes, pure SQL).** Upgrade `production_registers.config.image_anchors` and `.negative_additions` in-place for Registers 01–04. For Register 05 (Archive), upgrade `image_anchors_by_era` entries directly, because that object takes precedence when era is detected. Keep the 4-part formula. Keep `projects.style_dna` untouched. Zero code changes.

**Phase 2 (2–3 hours, one JSONB reshape + one node edit in `Prepare Image Data`).** Extend Registers 01–04's `image_anchors` from a string into an object keyed by niche variant. Update the resolution block in `Prepare Image Data` to handle both shapes with era lookup still taking precedence for Archive. Unlocks niche variants (Economist Real Estate, Premium Travel, etc.).

**Phase 3 (4–8 hours, flow reorder + existing workflow rewire + node edit in `Build Visual Prompt`).** Rewire `WF_REGISTER_ANALYZE` to accept topic-stage input so it runs before script generation. Preserve the existing RegisterSelector UI, just moved to Gate 1. Add a `metadata_prompt` sub-key to `production_registers.config` and make `Build Visual Prompt` register-aware. Biggest visual win.

Each phase is independently valuable. Phase 1 alone lands the visible upgrade. Phase 2 and Phase 3 layer on if Phase 1 results justify the additional work.

---

## 2. Target Architecture

After full rollout the image-prompt pipeline has four cleanly separated layers. Ownership is explicit; nothing double-stacks.

**Layer 1 — Project (brand fingerprint, ~30–40 words).** Data home: `projects.style_dna`. Locked per project. Register-neutral. One of the existing 4 base templates. CardMath uses "Modern Finance / Premium" — unchanged.

**Layer 2 — Composition (~10 words).** Data home: `scenes.composition_prefix`. One of 8 enum values. Register-neutral.

**Layer 3 — Scene Subject (~50–80 words).** Data home: `scenes.image_prompt`. Written by Claude in `Build Visual Prompt`. After Phase 3 this is register-aware.

**Layer 4 — Register Signature (~60–80 words).** Data home: `production_registers.config`. Resolution order (as implemented in `Prepare Image Data`):

```
1. If register is Archive AND topic has register_era_detected AND
   config.image_anchors_by_era[era] exists
   → use config.image_anchors_by_era[era]
2. Else if config.image_anchors is an object AND topic has niche_variant
   → use config.image_anchors[niche_variant] || config.image_anchors.primary
3. Else if config.image_anchors is an object (no niche)
   → use config.image_anchors.primary
4. Else
   → use config.image_anchors (string)
```

This preserves the existing era-overlay behavior for Archive, adds niche-variant support in Phase 2, and keeps the string fallback for Phase 1.

**Negative prompt.** Universal Negative (hardcoded in `Fire All Scenes`, untouched) + `production_registers.config.negative_additions` (upgraded in Phase 1).

**Final Fal.ai `prompt` field (~150–250 words total):**
```
{composition_prefix} {scene_subject} {resolved_register_anchors} {style_dna}
```

---

## 3. Phase 1 — Quick Win (30–60 minutes)

Pure SQL on `production_registers`. Zero code changes. Zero schema changes. Zero workflow changes.

### 3.1 Snapshot for rollback

```sql
SELECT
  register_id,
  config->>'image_anchors' AS current_image_anchors,
  config->'image_anchors_by_era' AS current_image_anchors_by_era,
  config->>'negative_additions' AS current_negative_additions,
  updated_at
FROM production_registers
ORDER BY register_id;
```

Export the output to `production_registers_snapshot_YYYY_MM_DD.csv`. This is the rollback source.

Verify `register_id` values match expectations:

```sql
SELECT register_id, COUNT(*) FROM production_registers GROUP BY register_id ORDER BY register_id;
```

If the actual IDs differ from `REGISTER_01_ECONOMIST` / `REGISTER_02_PREMIUM` / `REGISTER_03_NOIR` / `REGISTER_04_SIGNAL` / `REGISTER_05_ARCHIVE`, substitute the real values throughout the SQL below.

### 3.2 Phase 1 SQL — Registers 01, 02, 03, 04 (single string image_anchors)

These four registers do not have an era-overlay object. Plain-string `image_anchors` update applies.

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

-- Verification: expect 4 rows updated in the last minute
SELECT register_id, updated_at
FROM production_registers
WHERE updated_at > NOW() - INTERVAL '1 minute'
ORDER BY register_id;

-- If rows_updated != 4, ROLLBACK and diagnose. Otherwise:
COMMIT;
```

### 3.3 Phase 1 SQL — Register 05 Archive (era-keyed image_anchors_by_era)

For Archive, the era lookup takes precedence when `register_era_detected` is set on the topic. Updating the plain `image_anchors` string alone would be dead text for era-detected topics (including the Kitchen topic at era=1960s). Instead, update the era-keyed entries directly — and as a belt-and-suspenders also update `image_anchors` to serve as the no-era fallback.

First, confirm the existing era keys in the live config:

```sql
SELECT jsonb_object_keys(config->'image_anchors_by_era') AS era_keys
FROM production_registers
WHERE register_id = 'REGISTER_05_ARCHIVE';
```

The expected keys per the live schema are `1920s`, `1960s`, `1980s`, `2000s`. If actual keys differ, substitute accordingly in the SQL below.

```sql
BEGIN;

-- REGISTER 05 — ARCHIVE — update each era entry with era-appropriate film simulation

-- 1920s: early silver-halide aesthetic, heavy grain, sepia-leaning warmth
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors_by_era, 1920s}',
  to_jsonb('vintage archival photography, early 20th-century sepia-leaning aesthetic with warm cream and amber tones, heavy silver-halide grain characteristic of period film stock, soft period lens characteristics with gentle falloff, natural period lighting (gaslight, incandescent bulbs, window daylight), period-accurate Art Deco and early-modern wardrobe and architectural detail, no anachronistic modern items, soft warm vignetting, archival paper-texture overlay feel, photo-album aesthetic, documentary photorealism'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_05_ARCHIVE';

-- 1960s: Kodachrome, Life magazine
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors_by_era, 1960s}',
  to_jsonb('vintage Kodachrome photography, 1960s Life magazine aesthetic, warm faded colors with amber and rust tones, slightly overexposed highlights characteristic of Kodachrome film stock, high-silver-content film grain, soft period lens characteristics, period-accurate mid-century wardrobe and Formica-and-Frigidaire domestic detail, period automobiles, no anachronistic modern items, natural period-appropriate lighting with warm tungsten or morning window light, warm vignetting, photo-album aesthetic, documentary photorealism'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_05_ARCHIVE';

-- 1980s: Fuji Velvia saturation, period fluorescent warmth, 80s styling
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors_by_era, 1980s}',
  to_jsonb('late-1980s photography aesthetic with Fuji Velvia-leaning saturation but still-faded nostalgic cast, moderate film grain, period-accurate 1980s styling (period business wardrobe, period automobiles, period signage, period office technology but no personal computers or smartphones), warm tungsten or period-fluorescent lighting, slight anamorphic lens-flare characteristics, warm vignetting, photo-album aesthetic, documentary photorealism'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_05_ARCHIVE';

-- 2000s: early-digital / color-negative, familiar warmth, early-2000s period
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors_by_era, 2000s}',
  to_jsonb('early-2000s color negative film or early-digital photography aesthetic, slightly faded saturation, period-accurate styling with early-2000s wardrobe and technology (flip phones, period automobiles, CRT monitors, period signage but no smartphones), mild grain, familiar nostalgic warmth, natural mixed lighting, warm vignetting, photo-album aesthetic, documentary photorealism'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_05_ARCHIVE';

-- Also update the plain image_anchors string as a no-era fallback
-- (used when topic.register_era_detected is null)
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  to_jsonb('vintage archival photography, era-appropriate film simulation aligned to the period indicated in the subject prompt, warm faded nostalgic color palette, heavy silver-halide film grain, soft period lens characteristics, natural period-appropriate lighting, archival quality with subtle age degradation, warm vignetting, period-accurate wardrobe and technology with explicitly no anachronisms, photo-album aesthetic, documentary photorealism'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_05_ARCHIVE';

-- Verification
SELECT
  register_id,
  jsonb_object_keys(config->'image_anchors_by_era') AS era_keys,
  LENGTH(config->'image_anchors_by_era'->>'1960s') AS len_1960s,
  LENGTH(config->>'image_anchors') AS len_string_anchors,
  updated_at
FROM production_registers
WHERE register_id = 'REGISTER_05_ARCHIVE';

-- Expect: all era keys present, len_1960s ~600 chars, len_string_anchors ~400 chars, updated_at fresh
COMMIT;
```

### 3.4 Phase 1 SQL — negative_additions for all 5 registers

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

-- Verification: expect 5 rows updated
SELECT COUNT(*) FROM production_registers WHERE updated_at > NOW() - INTERVAL '1 minute';
COMMIT;
```

### 3.5 Phase 1 Testing — micro-run verification

For the Kitchen project (Register 05 Archive, era=1960s), verify the resolved anchors before firing a full 170-scene run:

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
    s.composition_prefix || ' ' ||
    s.image_prompt || ' ' ||
    CASE
      WHEN t.production_register = 'REGISTER_05_ARCHIVE'
        AND t.register_era_detected IS NOT NULL
        AND pr.config->'image_anchors_by_era' ? t.register_era_detected
      THEN pr.config->'image_anchors_by_era'->>t.register_era_detected
      ELSE pr.config->>'image_anchors'
    END || ' ' ||
    p.style_dna
  ) AS resolved_length_chars
FROM scenes s
JOIN topics t ON t.id = s.topic_id
JOIN projects p ON p.id = s.project_id
JOIN production_registers pr ON pr.register_id = t.production_register
WHERE t.id = '{KITCHEN_TOPIC_ID}'
  AND s.scene_number IN (1, 50, 150)
ORDER BY s.scene_number;
```

Verify for each sampled scene:

- `resolved_length_chars` under 1500
- For Archive: `resolved_register_anchors` pulls from `image_anchors_by_era.1960s` (contains "Kodachrome" + "Life magazine")
- No duplicate phrases between `scene_subject` and `resolved_register_anchors`

Only after manual pass does `Fire All Scenes` run the full batch. Spot-check the first 5 returned images against the per-register visual expectations.

### 3.6 Phase 1 Rollback

Single transaction restoring the snapshot. For Archive, restore both `image_anchors_by_era` entries and `image_anchors`:

```sql
BEGIN;

-- Replace placeholders with snapshot values
UPDATE production_registers
SET config = jsonb_set(jsonb_set(config,
    '{image_anchors}', to_jsonb('{OLD_ANCHORS_FROM_SNAPSHOT}'::text)),
    '{negative_additions}', to_jsonb('{OLD_NEGATIVES_FROM_SNAPSHOT}'::text)),
  updated_at = NOW()
WHERE register_id = 'REGISTER_01_ECONOMIST';
-- Repeat for 02, 03, 04 from snapshot

-- For Archive restore each era entry and the string
UPDATE production_registers
SET config = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(config,
    '{image_anchors_by_era, 1920s}', to_jsonb('{OLD_1920s}'::text)),
    '{image_anchors_by_era, 1960s}', to_jsonb('{OLD_1960s}'::text)),
    '{image_anchors_by_era, 1980s}', to_jsonb('{OLD_1980s}'::text)),
    '{image_anchors_by_era, 2000s}', to_jsonb('{OLD_2000s}'::text)),
    '{image_anchors}', to_jsonb('{OLD_ANCHORS}'::text)),
    '{negative_additions}', to_jsonb('{OLD_NEGATIVES}'::text)),
  updated_at = NOW()
WHERE register_id = 'REGISTER_05_ARCHIVE';

COMMIT;
```

Rollback is instant; nothing downstream has changed.

---

## 4. Phase 2 — Niche Variants (2–3 hours)

Extend `image_anchors` for Registers 01–04 from a string to an object keyed by niche variant. Archive stays era-dominant. Update the resolution block in `Prepare Image Data` to handle all three shapes.

### 4.1 JSONB migration — Registers 01, 02, 03, 04

```sql
BEGIN;

-- REGISTER 01 — add real_estate + legal_tax niche variants
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

-- REGISTER 02 — add real_estate + travel_lifestyle niche variants
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

-- REGISTER 03 — add financial_fraud + dark_family niche variants
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

-- REGISTER 04 — add crypto_payment + cybersecurity niche variants
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
WHERE register_id IN ('REGISTER_04_SIGNAL');

-- Register 05 Archive: DO NOT reshape image_anchors into an object here.
-- Archive's precedence is era-first; keep image_anchors_by_era as the primary override
-- and image_anchors as a string no-era fallback.

-- Verification: Registers 01-04 should have object image_anchors, Archive should still have string
SELECT
  register_id,
  jsonb_typeof(config->'image_anchors') AS anchors_type,
  CASE WHEN jsonb_typeof(config->'image_anchors') = 'object'
    THEN jsonb_object_keys(config->'image_anchors') END AS first_key
FROM production_registers
ORDER BY register_id;

COMMIT;
```

### 4.2 Topic-level niche_variant

If `topics.niche_variant` doesn't already exist, add it:

```sql
ALTER TABLE topics ADD COLUMN IF NOT EXISTS niche_variant TEXT;
CREATE INDEX IF NOT EXISTS idx_topics_niche_variant ON topics(niche_variant);
```

Nullable; `Prepare Image Data` treats null as `primary`.

### 4.3 Node edit — `Prepare Image Data` (not `Fire All Scenes`)

`Prepare Image Data` is where the fetch + resolution happens. The live block already handles Archive era precedence:

```js
// CURRENT block in Prepare Image Data (approximate)
let registerAnchors = '';
if (cfg.image_anchors_by_era && registerEra && cfg.image_anchors_by_era[registerEra]) {
  registerAnchors = cfg.image_anchors_by_era[registerEra];
} else {
  registerAnchors = cfg.image_anchors || '';
}
```

Replace with a three-branch resolver that preserves era precedence, adds niche-variant support, and safely handles both object and string shapes:

```js
// NEW block in Prepare Image Data (Phase 2)
let registerAnchors = '';

// Branch 1 — Archive era overlay wins when era is detected
if (cfg.image_anchors_by_era && registerEra && cfg.image_anchors_by_era[registerEra]) {
  registerAnchors = cfg.image_anchors_by_era[registerEra];

// Branch 2 — Phase 2 object-shaped image_anchors with niche variant
} else if (typeof cfg.image_anchors === 'object' && cfg.image_anchors !== null) {
  const nicheKey = (topic && topic.niche_variant) ? topic.niche_variant : 'primary';
  registerAnchors = cfg.image_anchors[nicheKey]
    || cfg.image_anchors.primary
    || '';

// Branch 3 — Phase 1 string fallback
} else {
  registerAnchors = cfg.image_anchors || '';
}
```

Three practical benefits of this structure:

1. Archive era lookup continues to win (existing behavior preserved — no risk to any Archive topic with era detected).
2. Object-shaped anchors work when a niche variant is provided, and fall back to `primary` when missing.
3. Any register still holding a plain string (incomplete Phase 2 rollout, or Archive's `image_anchors` fallback when no era) still resolves correctly.

`Fire All Scenes` downstream keeps receiving `data.register_anchors` as a fully-resolved string. No edit needed there.

### 4.4 Topic classifier — emit niche_variant

If you're extending `WF_REGISTER_ANALYZE` (or wherever topic classification runs), append a niche classifier step. Claude prompt excerpt:

```
Given the topic's selected Production Register, classify its niche variant.
Return one of:

- REGISTER_01_ECONOMIST: 'primary' | 'real_estate' | 'legal_tax'
- REGISTER_02_PREMIUM:   'primary' | 'real_estate' | 'travel_lifestyle'
- REGISTER_03_NOIR:      'primary' | 'financial_fraud' | 'dark_family'
- REGISTER_04_SIGNAL:    'primary' | 'crypto_payment' | 'cybersecurity'
- REGISTER_05_ARCHIVE:   'primary' (era precedence already handles variation)

Default to 'primary' if no clear niche match.

Return: {"niche_variant": "..."}
```

Persist to `topics.niche_variant`.

### 4.5 Phase 2 Rollback

Phase 2 is backward-compatible via the `typeof` check in `Prepare Image Data`. To roll back the JSONB reshape:

```sql
BEGIN;
UPDATE production_registers
SET config = jsonb_set(config, '{image_anchors}', to_jsonb(config->'image_anchors'->>'primary'))
WHERE register_id IN ('REGISTER_01_ECONOMIST', 'REGISTER_02_PREMIUM', 'REGISTER_03_NOIR', 'REGISTER_04_SIGNAL')
  AND jsonb_typeof(config->'image_anchors') = 'object';
COMMIT;
```

The `typeof` branch in the node still resolves correctly (now seeing strings again). No code change required.

---

## 5. Phase 3 — Register-Aware Claude Metadata Prompt (4–8 hours)

**The big visual win.** Makes `scenes.image_prompt` register-aware by rewiring the existing `WF_REGISTER_ANALYZE` workflow to run at topic stage, so the register is known when `Build Visual Prompt` runs. Reuses existing infrastructure wherever possible.

### 5.1 Reuse existing artifacts — do not rebuild

- `topics.production_register` column — already exists (migration 023). Do NOT add it.
- `topics.register_selected_at` column — already exists (migration 023). Do NOT add a duplicate `register_confirmed_at`.
- `WF_REGISTER_ANALYZE` workflow (`Miy5h5O7ncIIrnRg`) — already returns `top_2`, `all_5_ranked`, `era_detected`. Do NOT write a new classifier; rewire this one to accept topic input.
- `RegisterSelector` UI component — already exists on the dashboard, already consumes the rich output from `WF_REGISTER_ANALYZE`. Do NOT replace with a plain dropdown; move this component's mount point to Gate 1.

### 5.2 Rewire WF_REGISTER_ANALYZE to accept topic input

`WF_REGISTER_ANALYZE` currently runs after script generation on the script text. Modify the workflow's input handler to accept either:

- **Topic-stage input** (new): the topic's research brief and selected angle, pre-script
- **Script-stage input** (existing): the full script text, post-generation

The workflow's internal Claude prompt does register classification from textual content either way; the only difference is input source. Branch at the start:

```js
// New input handler at the top of WF_REGISTER_ANALYZE
const inputMode = items[0].json.input_mode; // 'topic' | 'script'

let analysisInputText;
if (inputMode === 'topic') {
  // Pull from topic research brief and angle
  analysisInputText = items[0].json.topic_research_brief + '\n\n' +
                      items[0].json.topic_angle + '\n\n' +
                      items[0].json.seo_title;
} else {
  // Existing script-stage path
  analysisInputText = items[0].json.script_text;
}
// Rest of the workflow unchanged; feeds analysisInputText to the Claude classifier
```

Output shape stays identical: `{ top_2, all_5_ranked, era_detected }`. No downstream consumer changes.

### 5.3 Wire WF_REGISTER_ANALYZE into the topic-research flow

After topic research completes and before Gate 1 approval, invoke `WF_REGISTER_ANALYZE` with `input_mode = 'topic'`. Persist the output to `topics`:

```sql
-- These columns already exist via migration 023, shown here for documentation:
-- topics.production_register         TEXT
-- topics.register_selected_at        TIMESTAMP
-- topics.register_analysis_json      JSONB  (stores top_2, all_5_ranked, era_detected)
```

If `register_analysis_json` doesn't exist as a column, add it:

```sql
ALTER TABLE topics ADD COLUMN IF NOT EXISTS register_analysis_json JSONB;
```

Persist the full workflow output there; the RegisterSelector UI reads from this field.

### 5.4 Gate 1 UI — mount existing RegisterSelector component

The existing `RegisterSelector` component consumes `{ top_2, all_5_ranked, era_detected }` and presents the rich selection UX. Move its mount point from the Gate 2 context to Gate 1. No rewrite; just relocate.

On Gate 1 approval, set `topics.register_selected_at = NOW()` and persist the user's confirmed choice to `topics.production_register`. If the user overrode the auto-suggestion, the `register_analysis_json` still records the classifier's original ranking for later analysis.

### 5.5 Add metadata_prompt per register

Add a `metadata_prompt` sub-key to each register's `config` JSONB.

```sql
BEGIN;

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb('Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 01 — THE ECONOMIST. Documentary explainer register: Johnny Harris, Wendover, Polymatter. Authoritative, calm, data-rich. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands, or figures from behind; single-source directional key light; muted palette with controlled warmth; composition preserves negative space for overlay typography; contemplative analytical mood; for data-image scenes use "documentary magazine infographic style" and "no readable specific numbers"; no text or logos in images. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name. Return ONLY JSON array: [{"scene_number": 1, "image_prompt": "...", "emotional_beat": "...", "chapter": "..."}]. Do NOT modify narration. {CHUNK_LIST}'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_01_ECONOMIST';

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb('Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 02 — PREMIUM AUTHORITY. Luxury editorial register: Bloomberg Originals, Rolex brand films, Robb Report. Restraint over flash. Every frame feels expensive. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands, or figures from behind, never eye contact; subjects are metal cards, crystal, leather, watches, fountain pens, marble, mahogany; warm tungsten or golden-hour directional key with long elegant shadows; warm Kodak Portra 400 palette; 85mm Leica M aesthetic; extreme shallow depth of field with creamy bokeh; generous negative space; refined contemplative mood; no logos or brand names. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name. Return ONLY JSON array. {CHUNK_LIST}'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_02_PREMIUM';

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb('Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 03 — INVESTIGATIVE NOIR. True-crime investigation register: LEMMiNO, Netflix Dirty Money, Chernobyl. Tension, gravity, evidence. Every image looks recovered. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands, or figures from behind; single HARSH directional light source (bare bulb, fluorescent, streetlight, cold window); desaturated bleach-bypass palette with cool blue or muted brown bias; deep shadows filling at least 40% of frame; oblique angles never eye-level neutral; bleach bypass or surveillance-photograph quality; tension-forensic-investigative mood; no text or logos. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name. Return ONLY JSON array. {CHUNK_LIST}'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_03_NOIR';

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb('Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 04 — SIGNAL (TECH FUTURIST). Tech/fintech register: ColdFusion, Apple keynote B-roll, Blade Runner 2049 sensibility. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands on devices, or figures from behind; cool blue ambient key with selective warm amber accent rim (never all cool, never warm-dominant); deep blue-black shadows with preserved detail; tack-sharp focus with subtle bloom; macro or architectural perspective; generous negative space with atmospheric depth; Apple keynote or Blade Runner 2049 anchor; HUD corner brackets can be baked in; clinical precise futuristic mood; no readable screen content, no brand names. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name. Return ONLY JSON array. {CHUNK_LIST}'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_04_SIGNAL';

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb('Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 05 — ARCHIVE. Biographical/historical register: Magnates Media, Ken Burns, Apple TV+ retrospectives. Viewer is leafing through an archive. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands, or figures from behind; NEVER prompt with specific real names — use descriptive proxies like "a middle-aged man in a 1958 gray flannel suit"; include year/decade marker; include era-appropriate film simulation (Kodachrome 1950s-60s, Portra 800 1970s-80s, Velvia 1980s-90s, color negative 1990s-2000s, Portra 400 contemporary); include period-accurate wardrobe/technology/vehicles; explicitly exclude anachronisms (no smartphones, no flat screens, no modern logos); natural period-appropriate lighting; warm faded nostalgic palette; reverent contemplative mood. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name with biographical flavor. Return ONLY JSON array. {CHUNK_LIST}'::text)
),
updated_at = NOW()
WHERE register_id = 'REGISTER_05_ARCHIVE';

COMMIT;
```

### 5.6 Build Visual Prompt — register-aware with fallback

In `WF_SCRIPT_GENERATE.json` → `Build Visual Prompt`, replace the hardcoded generic prompt with a register-aware branch that falls back safely:

```js
const chunkList = chunks.map((c, i) => 'CHUNK ' + (i+1) + ': ' + c).join('\n\n');

// Fetch register config if register is set on topic
let register = null;
if (topic.production_register) {
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/production_registers?register_id=eq.${topic.production_register}&select=config`,
    { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  const rows = await resp.json();
  register = rows[0] || null;
}

let metadataPrompt;

if (register && register.config && register.config.metadata_prompt) {
  // Register-aware path
  metadataPrompt = register.config.metadata_prompt
    .replace('{N}', chunks.length)
    .replace('{SEO_TITLE}', topic.seo_title || topic.original_title)
    .replace('{CHUNK_LIST}', chunkList);
} else {
  // Generic fallback — the existing prompt, preserved verbatim
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

Any topic without `production_register` set (pre-Phase 3 topics) falls through to the generic prompt unchanged.

### 5.7 Phase 3 Rollback

Feature-flag the new branch:

```js
const USE_REGISTER_METADATA_PROMPT = false; // toggle

if (USE_REGISTER_METADATA_PROMPT && register && register.config && register.config.metadata_prompt) {
  // register-aware
} else {
  // generic (unchanged)
}
```

No data rollback needed. `topics.production_register`, `register_selected_at`, and `register_analysis_json` stay but are ignored when the flag is off.

---

## 6. Verification Queries

**Phase 1 state:**

```sql
SELECT
  register_id,
  jsonb_typeof(config->'image_anchors') AS anchors_type,
  LENGTH(config->>'image_anchors') AS anchors_string_length,
  (config->'image_anchors_by_era' IS NOT NULL) AS has_era_overlay,
  CASE WHEN config->'image_anchors_by_era' IS NOT NULL
    THEN (SELECT array_agg(k) FROM jsonb_object_keys(config->'image_anchors_by_era') k)
    ELSE NULL END AS era_keys,
  LENGTH(config->>'negative_additions') AS neg_length,
  config ? 'metadata_prompt' AS has_metadata_prompt,
  updated_at
FROM production_registers
ORDER BY register_id;
```

Expected after Phase 1: all 5 have string `anchors_type`; Archive has `has_era_overlay=true` with all four era keys; none have `has_metadata_prompt=true`.

Expected after Phase 2: Registers 01-04 have object `anchors_type` with `primary` key present; Archive still has string `anchors_type` and era overlay.

Expected after Phase 3: all 5 have `has_metadata_prompt=true`.

**Resolved anchors for a specific scene** (handles all three branches of the `Prepare Image Data` resolver):

```sql
SELECT
  s.scene_number,
  t.production_register,
  t.register_era_detected,
  t.niche_variant,
  CASE
    -- Branch 1: Archive era wins
    WHEN t.production_register = 'REGISTER_05_ARCHIVE'
      AND t.register_era_detected IS NOT NULL
      AND pr.config->'image_anchors_by_era' ? t.register_era_detected
    THEN pr.config->'image_anchors_by_era'->>t.register_era_detected
    -- Branch 2: object-shaped niche lookup
    WHEN jsonb_typeof(pr.config->'image_anchors') = 'object'
    THEN COALESCE(
      pr.config->'image_anchors'->>COALESCE(t.niche_variant, 'primary'),
      pr.config->'image_anchors'->>'primary'
    )
    -- Branch 3: string fallback
    ELSE pr.config->>'image_anchors'
  END AS resolved_register_anchors,
  LENGTH(
    s.composition_prefix || ' ' || s.image_prompt || ' ' ||
    COALESCE(
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
      END, ''
    ) || ' ' || p.style_dna
  ) AS resolved_length
FROM scenes s
JOIN topics t ON t.id = s.topic_id
JOIN projects p ON p.id = s.project_id
JOIN production_registers pr ON pr.register_id = t.production_register
WHERE s.id = '{SCENE_ID}';
```

---

## 7. Rollout Calendar

**Week 1 — Phase 1 on Kitchen project.** Run Section 3.2 (Registers 01–04 string) and Section 3.3 (Archive era-keyed) for the Kitchen topic's register. Verify with the resolved-anchors query that era precedence lands correctly. Approve a full 170-scene render. Compare first-5 images to the prior production.

**Week 2 — Phase 1 across all projects.** Phase 1 changes are global to `production_registers`, so Week 2 is observation-only. Monitor retention and thumbnail CTR across any productions using any register.

**Week 3–4 — Phase 2.** Reshape Registers 01–04's `image_anchors` into objects. Deploy the three-branch resolver in `Prepare Image Data`. Roll out one project at a time using `topics.niche_variant` as the gate.

**Week 5–6 — Phase 3 prep.** Rewire `WF_REGISTER_ANALYZE` to accept topic-stage input. Tune its Claude prompt on 20+ historical topics before wiring it into the live topic flow. Move the existing `RegisterSelector` component to Gate 1.

**Week 7–8 — Phase 3 implementation.** Add `metadata_prompt` JSONB sub-keys. Deploy the register-aware branch in `Build Visual Prompt` behind a feature flag. Roll out one project, measure, then expand.

**Week 9+ — Phase 3 default-on** if flag results hold.

---

## 8. Source Files

- `workflows/WF_IMAGE_GENERATION.json` — `Prepare Image Data` node (Phase 2 edit); `Fire All Scenes` (no edit)
- `workflows/WF_SCRIPT_GENERATE.json` — `Build Visual Prompt` node (Phase 3 edit)
- `workflows/WF_REGISTER_ANALYZE` (`Miy5h5O7ncIIrnRg`) — rewire for topic-stage input (Phase 3)
- `IMAGE_GENERATION_PROMPTS.md` — base pipeline reference (unchanged)
- `image_prompts_by_register/` — source content for Phase 1 anchor and negative strings (pending doc edits)
- `vision_gridai_registers/` — cinematic grammar playbooks (informational, unchanged)
- `VisionGridAI_Platform_Agent.md` — Style DNA base templates, Composition Library, Universal Negative (all unchanged)
- Migration 023 (prior) — `topics.production_register`, `topics.register_selected_at`, and related columns already added

---

## 9. Proposed register prompt library files — updates needed

The 6 files under `image_prompts_by_register/` referenced workflow and schema names that don't match the live system. When the library is handed to another engineer, apply these find/replace edits so the docs match reality:

- `Prepare Metadata Prompt` → `Build Visual Prompt`
- `prompt_templates` table references → `production_registers.config` JSONB
- `register_key` column → `register_id`
- `lookupTemplate(...)` → inline Supabase REST fetch (pattern shown in Section 5.6)
- `scene.niche_variant` → `topic.niche_variant`
- "3-part formula" → "4-part formula: `{COMPOSITION_PREFIX} {SCENE_SUBJECT} {REGISTER_ANCHORS} {STYLE_DNA}`"
- Retitle proposal Sections 2 from "Register-Specific Style DNA Variants" to "Register Anchor Variants," documenting them as values stored in `production_registers.config.image_anchors` (as string pre-Phase 2, as object post-Phase 2), not in `projects.style_dna`.
- Archive: document the era-overlay precedence rule — era wins over niche variant.

These edits are doc-only; they do not block this implementation guide.

---

## 10. Closing Note

Phase 1 on Registers 01–04 is ~5 minutes of transaction-wrapped SQL. Phase 1 on Archive needs the era-keyed updates (Section 3.3), because the Kitchen topic and any other era-detected Archive topic will read from `image_anchors_by_era` and ignore plain `image_anchors` entirely. That was the single biggest trap in v1 of this guide; v2 has removed it.

If the Kitchen run is the immediate priority: execute Section 3.1 (snapshot), Section 3.3 (Archive era-keyed), Section 3.4 (negative_additions for Archive), Section 3.5 (verification query), and fire a 3-scene micro-run before the full 170-scene render. About 20 minutes of focused work, fully reversible.
