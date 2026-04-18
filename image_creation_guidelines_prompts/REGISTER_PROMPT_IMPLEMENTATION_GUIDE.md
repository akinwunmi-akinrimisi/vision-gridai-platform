# Vision GridAI — Register Prompt Library Implementation Guide

Operational guide for upgrading image-prompt quality across the five Production Registers without breaking the live pipeline. Reconciles the proposed register prompt library (6 files under `image_prompts_by_register/`) with the actual live architecture as found in Supabase and `WF_IMAGE_GENERATION.json` / `WF_SCRIPT_GENERATE.json`.

---

## 1. Executive Summary

The proposed register prompt library provides a meaningful visual upgrade — richer per-register Style DNA, register-aware negative additions, and (the biggest potential win) a register-aware Claude metadata prompt that writes register-flavored `scene_subject` values directly. But as written, the proposal collides with the live pipeline in several places. Applied naively, it would double-stack register language, reference a table that doesn't exist, try to use register context at a moment in the flow where register is still NULL, and reference a node name that doesn't match the live node.

This guide rolls the upgrade out in three phases, each independently shippable and independently reversible:

**Phase 1 (30–60 minutes, zero code or schema changes).** Upgrade `production_registers.config.image_anchors` and `production_registers.config.negative_additions` in-place using condensed content from the proposal. Keep the 4-part formula. Keep `projects.style_dna` as-is. Get immediate visual impact with a pure-SQL change that leaves every workflow and every node untouched.

**Phase 2 (2–3 hours, one JSONB restructure + one node edit).** Extend `production_registers.config.image_anchors` from a string into an object keyed by niche variant. Add a topic-level niche classifier. Update the `Fire All Scenes` node to pick the right sub-key at runtime. This unlocks the niche-specific flavors (Economist Real Estate, Premium Travel, Archive Family Drama).

**Phase 3 (4–8 hours, pipeline reorder + one new JSONB field + node edit).** Move register selection earlier in the pipeline — from post-script to post-topic-approval — so that the Claude metadata prompt at script-generation time can be register-aware. This is the biggest visual win, but it requires a real flow change.

Each phase delivers value on its own. Stop at Phase 1 and you still get a visible register flavor improvement. Stop at Phase 2 and you get niche-variant precision. Stop at Phase 3 and you get the full register-aware scene_subject.

---

## 2. Reconciliation — What This Guide Does Differently From the Proposal

The proposal files in `image_prompts_by_register/` described a target architecture. The live system differs from it in specific ways. Here is how this guide resolves each conflict:

**Formula stays 4-part, not 3-part.** The proposal documented a 3-part formula (`prefix + subject + style_dna`). The live `Fire All Scenes` node joins 4 parts (`prefix + subject + register_anchors + style_dna`). We keep the 4-part formula. No code change. Register-specific language lives in `register_anchors` (its existing home), not bundled into `style_dna`. This avoids double-stacking.

**No new `prompt_templates` table.** The proposal instructed inserting rows into `prompt_templates`. That relation does not exist in Supabase. We use the existing `production_registers.config` JSONB column for all register-specific content, as the live pipeline already does. Add new sub-keys as needed (`image_anchors` becomes an object, `metadata_prompt` is added in Phase 3). No new tables.

**Register-aware metadata prompt deferred to Phase 3.** The proposal assumed the metadata prompt could be register-specific at script-generation time. In the live flow, register selection happens AFTER script generation, so register is NULL when `WF_SCRIPT_GENERATE.json` runs. Rather than bolting on an expensive re-run, Phase 3 moves register selection earlier (auto-suggested by the topic classifier, confirmed at Gate 1). This is the only clean path.

**Correct node name: `Build Visual Prompt`, not `Prepare Metadata Prompt`.** All references in this guide use the real node name.

**No new `scene.niche_variant` column.** Niche variant is derived at topic stage and stored on `topics` (the record that already flows down to all scenes). Saves a migration and a per-scene denormalization.

**No `lookupTemplate()` helper.** All register config reads use inline Supabase REST fetch, matching the pattern `Prepare Image Data` already uses.

**`projects.style_dna` stays register-neutral and project-locked.** Its role is "brand fingerprint" — what makes CardMath feel like CardMath across every register. Register-specific language lives in `production_registers.config.image_anchors`. The existing 4 base Style DNA templates remain; no project needs its `style_dna` value rewritten.

---

## 3. Target Architecture After Full Rollout

After Phase 3 completes, the image prompt pipeline looks like this. All four layers compose into the final Fal.ai prompt; each layer has exactly one owner; nothing double-stacks.

**Layer 1 — Project (brand fingerprint, ~30–40 words):**
Data home: `projects.style_dna`. Locked per project. One of the existing 4 base templates. Register-neutral. Example: CardMath uses "Modern Finance / Premium" base template.

**Layer 2 — Composition (~10 words):**
Data home: `scenes.composition_prefix`. One of 8 enum values per scene. Set by the scene classifier. Register-neutral but register-aware classifiers can bias selection toward each register's preferred prefixes.

**Layer 3 — Scene Subject (~50–80 words):**
Data home: `scenes.image_prompt`. Written by Claude during script generation via the `Build Visual Prompt` node. After Phase 3, this is register-aware — Claude receives register-specific instructions and writes scene subjects with register flavor baked in.

**Layer 4 — Register Signature (~60–80 words):**
Data home: `production_registers.config.image_anchors`. After Phase 2, this is an object keyed by niche variant. After Phase 1, even as a plain string, it carries the richer register-specific language from the proposal.

**Negative Prompt:**
Universal Negative (hardcoded in `Fire All Scenes`, never edited) + `production_registers.config.negative_additions` (register-specific, upgraded in Phase 1).

**Resolved Fal.ai `prompt` field (total ~150–250 words):**
```
{composition_prefix} {scene_subject} {image_anchors[niche_variant || 'primary']} {style_dna}
```

**Resolved Fal.ai `negative_prompt` field:**
```
{UNIVERSAL_NEGATIVE}, {negative_additions}
```

Stays comfortably within Seedream 4.5's effective prompt range.

---

## 4. Phase 1 — Quick Win (30–60 minutes)

**Goal:** Visible per-register visual improvement in the next production run. Zero code changes. Zero schema changes. Zero workflow changes. Pure SQL `UPDATE` on `production_registers.config`.

**What changes:** `image_anchors` and `negative_additions` for all 5 registers get replaced with condensed versions of the content from the 6 proposal files, sized to keep total prompt length under Seedream's effective range when combined with the unchanged `style_dna` and Claude-written `scene_subject`.

**What does NOT change:** Universal Negative, 4-part formula, node code, workflow order, `projects.style_dna`, `prompt_templates` (still nonexistent), topic flow, Gate 2, scene classifier.

### 4.1 Pre-flight checks

Before running the SQL, verify the live state so rollback is clean:

```sql
-- Snapshot current state for rollback
SELECT
  id,
  register_key,
  config->>'image_anchors' AS current_image_anchors,
  config->>'negative_additions' AS current_negative_additions,
  updated_at
FROM production_registers
ORDER BY register_key;
```

Save the output to a file named `production_registers_snapshot_YYYY_MM_DD.csv`. This is your rollback source of truth.

Verify `register_key` values match what this guide expects:

```sql
SELECT register_key, COUNT(*) FROM production_registers GROUP BY register_key;
```

Expected: five rows with keys `REGISTER_01_ECONOMIST`, `REGISTER_02_PREMIUM`, `REGISTER_03_NOIR`, `REGISTER_04_SIGNAL`, `REGISTER_05_ARCHIVE`. If the live keys differ (e.g., lowercase, different separators), substitute the actual values into the SQL below.

### 4.2 Phase 1 SQL — upgrade image_anchors

Run inside a single transaction. The `jsonb_set` calls replace only the two affected keys; any other keys in `config` are preserved.

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
WHERE register_key = 'REGISTER_01_ECONOMIST';

-- REGISTER 02 — PREMIUM AUTHORITY
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  to_jsonb('luxury editorial photography, cinematic natural lighting with strong directional warm key, extreme shallow depth of field with creamy bokeh, warm tungsten and amber highlights, rich deep shadows with preserved detail, 85mm lens Leica M aesthetic, Kodak Portra 400 color palette, subtle film grain, golden hour or interior tungsten lighting, generous negative space, aspirational cinematic atmosphere, people as silhouettes or hands'::text)
),
updated_at = NOW()
WHERE register_key = 'REGISTER_02_PREMIUM';

-- REGISTER 03 — INVESTIGATIVE NOIR
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  to_jsonb('dark investigative documentary photography, heavy chiaroscuro with deep black shadows, single harsh directional light source creating hard-edged shadow patterns, desaturated color palette with muted browns and cold blues, bleach bypass aesthetic, pronounced 16mm film grain, vignetting, oblique angle perspective, surveillance-photograph or leaked-document quality, low-key lighting, high detail but intentionally degraded'::text)
),
updated_at = NOW()
WHERE register_key = 'REGISTER_03_NOIR';

-- REGISTER 04 — SIGNAL (TECH FUTURIST)
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  to_jsonb('clean modern product photography, cool blue-dominant key lighting with selective warm amber accent rim, deep blue-black atmospheric shadows, extreme shallow depth of field, tack-sharp focus with subtle bloom on specular highlights, macro or architectural perspective, minimalist composition with generous negative space, Apple keynote aesthetic with Blade Runner 2049 sensibility, futuristic cinematic still'::text)
),
updated_at = NOW()
WHERE register_key = 'REGISTER_04_SIGNAL';

-- REGISTER 05 — ARCHIVE
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  to_jsonb('vintage archival photography, era-appropriate film simulation specified per scene (Kodachrome 1950s-60s, Portra 800 1970s-80s, Velvia 1980s-90s, color negative 1990s-2000s, Portra 400 for contemporary family), warm faded nostalgic color palette, heavy silver-halide film grain, soft period lens characteristics, natural period-appropriate lighting, archival quality with subtle age degradation, warm vignetting, photo-album aesthetic, documentary photorealism'::text)
),
updated_at = NOW()
WHERE register_key = 'REGISTER_05_ARCHIVE';

-- Verify 5 rows updated
SELECT COUNT(*) AS rows_updated_expected_5
FROM production_registers
WHERE updated_at > NOW() - INTERVAL '1 minute';

-- If count != 5, ROLLBACK. Otherwise proceed.
COMMIT;
```

### 4.3 Phase 1 SQL — upgrade negative_additions

Also runs as a single transaction. Can be combined with Section 4.2 into one transaction if preferred.

```sql
BEGIN;

-- REGISTER 01 — THE ECONOMIST
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{negative_additions}',
  to_jsonb('oversaturated colors, cartoonish style, garish neon, grunge aesthetic, dark noir aesthetic, warm golden luxurious aesthetic, futuristic tech aesthetic, surveillance camera quality'::text)
),
updated_at = NOW()
WHERE register_key = 'REGISTER_01_ECONOMIST';

-- REGISTER 02 — PREMIUM AUTHORITY
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{negative_additions}',
  to_jsonb('cheap materials, plastic surfaces, chrome, neon, fluorescent lighting, cold color temperature, harsh shadows, cluttered composition, modern clinical tech aesthetic, sterile studio lighting, budget product photography, grunge aesthetic'::text)
),
updated_at = NOW()
WHERE register_key = 'REGISTER_02_PREMIUM';

-- REGISTER 03 — INVESTIGATIVE NOIR
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{negative_additions}',
  to_jsonb('warm golden light, luxurious aesthetic, bright cheerful mood, vibrant saturated colors, modern sleek tech aesthetic, clinical clean studio lighting, decorative bokeh, joyful expressions, aspirational lifestyle imagery, Kodak Portra 400 warmth, editorial magazine glossy'::text)
),
updated_at = NOW()
WHERE register_key = 'REGISTER_03_NOIR';

-- REGISTER 04 — SIGNAL (TECH FUTURIST)
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{negative_additions}',
  to_jsonb('warm golden light, nostalgic aesthetic, heavy film grain, organic textures, vintage photography look, historical period styling, wood and leather surfaces, warm tungsten cozy interior, Kodak Portra 400 warmth, bleach bypass desaturation, noir deep-shadow aesthetic'::text)
),
updated_at = NOW()
WHERE register_key = 'REGISTER_04_SIGNAL';

-- REGISTER 05 — ARCHIVE
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{negative_additions}',
  to_jsonb('modern digital aesthetic, cold color temperature, neon, chrome, futuristic technology, smartphones in period scenes, flat screens in period scenes, clinical studio lighting, high dynamic range processing, aggressive saturation, HUD elements, cyberpunk aesthetic, anachronistic modern items in period scenes, bleach bypass desaturation, heavy noir shadows'::text)
),
updated_at = NOW()
WHERE register_key = 'REGISTER_05_ARCHIVE';

SELECT COUNT(*) AS rows_updated_expected_5
FROM production_registers
WHERE updated_at > NOW() - INTERVAL '1 minute';

COMMIT;
```

### 4.4 Phase 1 Testing Protocol

Before running a full 170-scene production, test with a 3-scene micro-run per register. This catches prompt-length overruns and register-character mismatches cheaply.

Step 1 — Run the full `WF_SCRIPT_GENERATE.json` and Gate 2 approval for a short test topic in each register you want to validate. Prioritize Archive (Register 05) on the Kitchen project if that's where you're testing first.

Step 2 — Before `Fire All Scenes` fires the full batch, manually inspect the resolved prompt and negative prompt for three sampled scenes. Supabase query:

```sql
SELECT
  s.scene_number,
  s.composition_prefix,
  s.image_prompt,
  p.style_dna,
  pr.config->>'image_anchors' AS register_anchors,
  pr.config->>'negative_additions' AS neg_additions,
  CONCAT_WS(' ',
    s.composition_prefix,
    s.image_prompt,
    pr.config->>'image_anchors',
    p.style_dna
  ) AS resolved_prompt,
  LENGTH(CONCAT_WS(' ',
    s.composition_prefix,
    s.image_prompt,
    pr.config->>'image_anchors',
    p.style_dna
  )) AS resolved_prompt_length_chars
FROM scenes s
JOIN projects p ON p.id = s.project_id
JOIN topics t ON t.id = s.topic_id
JOIN production_registers pr ON pr.register_key = t.production_register
WHERE t.id = '{TEST_TOPIC_ID}'
  AND s.scene_number IN (1, 50, 150)
ORDER BY s.scene_number;
```

Step 3 — Verify for each of the 3 sampled scenes:

- `resolved_prompt_length_chars` under 1500 (roughly ~250 words, comfortable for Seedream)
- `register_anchors` content matches the expected register character (warm tungsten for Premium, bleach bypass for Noir, era film sim for Archive, etc.)
- `negative_additions` visibly rejects the aesthetics your register should avoid
- No duplicate phrases between `image_prompt` and `register_anchors` — they should complement, not repeat

Step 4 — Only after manual verification passes, run `Fire All Scenes` for the full 170-scene production. Review the first 5 returned images against the QA checklist (Section 4.6).

### 4.5 Phase 1 Rollback

If Phase 1 causes problems, roll back with a single transaction restoring the snapshot values. Replace the string literals below with the values captured in Section 4.1:

```sql
BEGIN;

UPDATE production_registers SET config = jsonb_set(config, '{image_anchors}', to_jsonb('{OLD_VALUE_FROM_SNAPSHOT}'::text)), updated_at = NOW() WHERE register_key = 'REGISTER_01_ECONOMIST';
UPDATE production_registers SET config = jsonb_set(config, '{image_anchors}', to_jsonb('{OLD_VALUE_FROM_SNAPSHOT}'::text)), updated_at = NOW() WHERE register_key = 'REGISTER_02_PREMIUM';
UPDATE production_registers SET config = jsonb_set(config, '{image_anchors}', to_jsonb('{OLD_VALUE_FROM_SNAPSHOT}'::text)), updated_at = NOW() WHERE register_key = 'REGISTER_03_NOIR';
UPDATE production_registers SET config = jsonb_set(config, '{image_anchors}', to_jsonb('{OLD_VALUE_FROM_SNAPSHOT}'::text)), updated_at = NOW() WHERE register_key = 'REGISTER_04_SIGNAL';
UPDATE production_registers SET config = jsonb_set(config, '{image_anchors}', to_jsonb('{OLD_VALUE_FROM_SNAPSHOT}'::text)), updated_at = NOW() WHERE register_key = 'REGISTER_05_ARCHIVE';

-- Repeat for negative_additions
-- ...

COMMIT;
```

Since nothing downstream has been changed, rollback is instant. Any pending `Fire All Scenes` runs queued after rollback will use the restored anchors.

### 4.6 Phase 1 QA Checklist

Before calling Phase 1 successful for any register, verify:

1. Five rows updated in `production_registers` (not four, not six)
2. Sample scene resolved prompts render all 4 parts in expected order
3. Resolved prompt length under 1500 characters
4. No duplicate phrases between `image_anchors` and `style_dna`
5. Negative prompt starts with the exact Universal Negative string, followed by a comma and the new register-specific additions
6. Spot-check first 5 generated images per register:
   - Register 01: muted palette, single directional light, negative space preserved
   - Register 02: warm Portra 400 tones, shallow DOF with creamy bokeh, luxury surfaces visible
   - Register 03: deep shadows filling 30%+ of frame, desaturated, hard single light source
   - Register 04: cool blue dominant, warm amber accent rim visible, tack-sharp macro detail
   - Register 05: era-accurate wardrobe/tech, warm faded palette, visible film grain and vignetting, no anachronisms

If any of these fail for a specific register, roll back that register only (single `UPDATE` keyed by `register_key`) and diagnose.

---

## 5. Phase 2 — Niche Variants (2–3 hours)

**Goal:** Enable niche-specific image_anchors so a Real Estate topic under Register 01 uses architectural-biased language, a Travel topic under Register 02 uses golden-hour-bias lifestyle language, and a Family Drama topic under Register 05 uses intimate domestic language. The proposal identified these niche variants (Variant B, Variant C in each register file); this phase makes them executable.

**Precondition:** Phase 1 complete and stable.

**What changes:** `production_registers.config.image_anchors` is migrated from a string to an object keyed by niche variant. Topics gain a `niche_variant` field. `Fire All Scenes` node reads the right sub-key at runtime. Topic classifier sets `niche_variant` during topic research.

### 5.1 Phase 2 JSONB migration

The current shape after Phase 1:

```json
{
  "image_anchors": "editorial documentary photography, ...",
  "negative_additions": "oversaturated colors, ..."
}
```

Target shape after Phase 2:

```json
{
  "image_anchors": {
    "primary": "editorial documentary photography, ...",
    "real_estate": "editorial architectural photography, natural daylight with golden-hour bias, ...",
    "legal_tax": "editorial documentary photography, cool-neutral institutional lighting, ..."
  },
  "negative_additions": "oversaturated colors, ..."
}
```

Migration SQL (one transaction, all five registers):

```sql
BEGIN;

-- REGISTER 01 — promote string to object, add niche variants
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
WHERE register_key = 'REGISTER_01_ECONOMIST';

-- REGISTER 02 — niche variants for real estate and travel
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
WHERE register_key = 'REGISTER_02_PREMIUM';

-- REGISTER 03 — niche variants for financial fraud and dark family
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
WHERE register_key = 'REGISTER_03_NOIR';

-- REGISTER 04 — niche variants for crypto/payment and cybersecurity
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
WHERE register_key = 'REGISTER_04_SIGNAL';

-- REGISTER 05 — niche variants for family drama and period-era-contingent
UPDATE production_registers
SET config = jsonb_set(
  config,
  '{image_anchors}',
  jsonb_build_object(
    'primary', config->>'image_anchors',
    'family_drama', 'intimate family documentary photography, warm domestic lighting, natural indoor window light, shallow depth of field on personal objects, photo-album aesthetic, Kodak Portra 400 simulation on modern subjects with subtle faded warmth, moderate film grain, nostalgic intimate mood, rule-of-thirds composition preserving domestic detail, photo-album quality, documentary photorealism',
    'period_era_contingent', 'vintage archival photography, era-specific film simulation as specified in subject prompt, nostalgic faded color palette aligned to the indicated era, silver-halide film grain, period-appropriate natural lighting, archival quality with subtle age degradation, warm vignetting, rule-of-thirds composition, reverent biographical mood, photo-album aesthetic, documentary photorealism'
  )
),
updated_at = NOW()
WHERE register_key = 'REGISTER_05_ARCHIVE';

-- Verify all 5 registers now have image_anchors as an object with 'primary' key
SELECT
  register_key,
  jsonb_typeof(config->'image_anchors') AS anchors_type,
  config->'image_anchors'->>'primary' IS NOT NULL AS has_primary
FROM production_registers
ORDER BY register_key;

-- Expected: 5 rows, anchors_type='object', has_primary=true for all
COMMIT;
```

### 5.2 Phase 2 schema — add topic.niche_variant

No migration needed if you're using a JSONB `topics.metadata` field. If `topics` uses columnar fields, add:

```sql
ALTER TABLE topics ADD COLUMN IF NOT EXISTS niche_variant TEXT;
CREATE INDEX IF NOT EXISTS idx_topics_niche_variant ON topics(niche_variant);
```

The field is nullable. When null, `Fire All Scenes` falls back to `primary`.

### 5.3 Phase 2 node edit — Build Visual Prompt

The topic classifier already identifies the topic's niche during research. Update it to emit `niche_variant` as one of the allowed values per register. Add the following to the classifier's instruction block (in `Build Visual Prompt` or a separate classifier node — match your live naming):

```
Classify the topic's niche variant. Return one of:
- For REGISTER_01_ECONOMIST: 'primary' | 'real_estate' | 'legal_tax'
- For REGISTER_02_PREMIUM: 'primary' | 'real_estate' | 'travel_lifestyle'
- For REGISTER_03_NOIR: 'primary' | 'financial_fraud' | 'dark_family'
- For REGISTER_04_SIGNAL: 'primary' | 'crypto_payment' | 'cybersecurity'
- For REGISTER_05_ARCHIVE: 'primary' | 'family_drama' | 'period_era_contingent'

Default to 'primary' if the topic does not clearly fit a niche variant.
```

Store the result in `topics.niche_variant`.

### 5.4 Phase 2 node edit — Fire All Scenes

In `WF_IMAGE_GENERATION.json` → `Fire All Scenes`, locate the line that currently reads `register_anchors` from the fetched register config. It looks roughly like this:

```js
// CURRENT (Phase 1 state)
const registerAnchors = register.config.image_anchors || '';
```

Replace with:

```js
// NEW (Phase 2)
const nicheKey = topic.niche_variant || 'primary';
const anchorsField = register.config.image_anchors;

// Backward compatibility: handle both string (pre-Phase 2) and object (post-Phase 2) shapes
const registerAnchors = typeof anchorsField === 'object'
  ? (anchorsField[nicheKey] || anchorsField.primary || '')
  : (anchorsField || '');
```

The `typeof` check is the critical safety rail. If any register hasn't been migrated to the object shape yet (incomplete Phase 2 rollout), the code falls back to reading the string directly. No scene breaks.

### 5.5 Phase 2 Testing Protocol

Test with two topics per register, one primary and one niche-variant.

Step 1 — Manually set `topics.niche_variant` on a test topic to one of the variant keys. Run the pipeline through `Build Visual Prompt`.

Step 2 — Verify `scenes.image_prompt` generation proceeds normally (niche variant is not yet register-aware at script gen — that comes in Phase 3).

Step 3 — Inspect resolved prompt before `Fire All Scenes` runs the batch:

```sql
SELECT
  t.id AS topic_id,
  t.niche_variant,
  pr.register_key,
  CASE
    WHEN jsonb_typeof(pr.config->'image_anchors') = 'object'
    THEN pr.config->'image_anchors'->>COALESCE(t.niche_variant, 'primary')
    ELSE pr.config->>'image_anchors'
  END AS resolved_register_anchors
FROM topics t
JOIN production_registers pr ON pr.register_key = t.production_register
WHERE t.id = '{TEST_TOPIC_ID}';
```

Step 4 — Visual check: run a 3-scene micro-render under each variant. A Real Estate topic in Register 01 should produce more architectural/aerial language than a primary Register 01 topic.

### 5.6 Phase 2 Rollback

Phase 2 is fully backward-compatible because of the `typeof` check in `Fire All Scenes`. To roll back:

```sql
-- Flatten each register back to string
BEGIN;
UPDATE production_registers
SET config = jsonb_set(config, '{image_anchors}', to_jsonb(config->'image_anchors'->>'primary'))
WHERE jsonb_typeof(config->'image_anchors') = 'object';
COMMIT;
```

The `typeof` check in the node code still works (it now sees strings again), so no code change is required on rollback.

---

## 6. Phase 3 — Register-Aware Claude Metadata (4–8 hours)

**Goal:** The big visual win. Make `scenes.image_prompt` (written by Claude during script generation) register-aware by moving register selection before script generation.

**Precondition:** Phase 1 stable; Phase 2 optional but recommended.

**The ordering problem:** Currently:

```
topic research → Gate 1 (topic approval) → script generation → Gate 2 (script scored) → cost mode → register pick → scene classify → TTS/images
                                            ↑
                                  register is NULL here — Claude
                                  writes generic scene_subjects
```

Proposed:

```
topic research → auto-classify register → Gate 1 (topic + register approval) → script generation (register-aware) → Gate 2 → cost mode → scene classify → TTS/images
                        ↓                           ↑
               classifier suggests           register is SET here — Claude
               register from topic niche     writes register-flavored scene_subjects
```

**Why this is the cleanest path:** The topic itself strongly implies the register (a crime-biography topic = Register 05 or Register 03; a luxury card review = Register 02; a B2B SaaS tutorial = Register 04). The classifier can auto-suggest with high accuracy, and the user can override at Gate 1 if the suggestion is wrong. No meaningful UX regression — the user still sees the topic before committing to register; they just see the register recommendation alongside.

### 6.1 Phase 3 schema change — add register to topics

If register isn't already a column on `topics`, add it:

```sql
ALTER TABLE topics ADD COLUMN IF NOT EXISTS production_register TEXT;
CREATE INDEX IF NOT EXISTS idx_topics_production_register ON topics(production_register);
```

Also add a flag so downstream can distinguish auto-suggested from user-confirmed:

```sql
ALTER TABLE topics ADD COLUMN IF NOT EXISTS register_confirmed_at TIMESTAMP;
```

### 6.2 Phase 3 JSONB — add metadata_prompt per register

Add a `metadata_prompt` sub-key to each register's `config`. This is the register-aware Claude prompt body. It replaces (per register) the generic body currently hardcoded in `Build Visual Prompt`.

```sql
BEGIN;

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb('Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 01 — THE ECONOMIST. Documentary explainer register: Johnny Harris, Wendover, Polymatter. Authoritative, calm, data-rich. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands, or figures from behind; single-source directional key light; muted palette with controlled warmth; composition preserves negative space for overlay typography; contemplative analytical mood; for data-image scenes use "documentary magazine infographic style" and "no readable specific numbers"; no text or logos in images. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name. Return ONLY JSON array: [{"scene_number": 1, "image_prompt": "...", "emotional_beat": "...", "chapter": "..."}]. Do NOT modify narration. {CHUNK_LIST}'::text)
),
updated_at = NOW()
WHERE register_key = 'REGISTER_01_ECONOMIST';

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb('Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 02 — PREMIUM AUTHORITY. Luxury editorial register: Bloomberg Originals, Rolex brand films, Robb Report. Restraint over flash. Every frame feels expensive. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands, or figures from behind, never eye contact; subjects are metal cards, crystal, leather, watches, fountain pens, marble, mahogany; warm tungsten or golden-hour directional key with long elegant shadows; warm Kodak Portra 400 palette; 85mm Leica M aesthetic; extreme shallow depth of field with creamy bokeh; generous negative space; refined contemplative mood; no logos or brand names. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name. Return ONLY JSON array. {CHUNK_LIST}'::text)
),
updated_at = NOW()
WHERE register_key = 'REGISTER_02_PREMIUM';

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb('Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 03 — INVESTIGATIVE NOIR. True-crime investigation register: LEMMiNO, Netflix Dirty Money, Chernobyl. Tension, gravity, evidence. Every image looks recovered. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands, or figures from behind; single HARSH directional light source (bare bulb, fluorescent, streetlight, cold window); desaturated bleach-bypass palette with cool blue or muted brown bias; deep shadows filling at least 40% of frame; oblique angles never eye-level neutral; bleach bypass or surveillance-photograph quality; tension-forensic-investigative mood; no text or logos. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name. Return ONLY JSON array. {CHUNK_LIST}'::text)
),
updated_at = NOW()
WHERE register_key = 'REGISTER_03_NOIR';

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb('Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 04 — SIGNAL (TECH FUTURIST). Tech/fintech register: ColdFusion, Apple keynote B-roll, Blade Runner 2049 sensibility. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands on devices, or figures from behind; cool blue ambient key with selective warm amber accent rim (never all cool, never warm-dominant); deep blue-black shadows with preserved detail; tack-sharp focus with subtle bloom; macro or architectural perspective; generous negative space with atmospheric depth; Apple keynote or Blade Runner 2049 anchor; HUD corner brackets can be baked in; clinical precise futuristic mood; no readable screen content, no brand names. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name. Return ONLY JSON array. {CHUNK_LIST}'::text)
),
updated_at = NOW()
WHERE register_key = 'REGISTER_04_SIGNAL';

UPDATE production_registers
SET config = jsonb_set(
  config,
  '{metadata_prompt}',
  to_jsonb('Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 05 — ARCHIVE. Biographical/historical register: Magnates Media, Ken Burns, Apple TV+ retrospectives. Viewer is leafing through an archive. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands, or figures from behind; NEVER prompt with specific real names — use descriptive proxies like "a middle-aged man in a 1958 gray flannel suit"; include year/decade marker; include era-appropriate film simulation (Kodachrome for 1950s-60s, Portra 800 for 70s-80s, Velvia for 80s-90s, color negative for 90s-2000s, Portra 400 contemporary); include period-accurate wardrobe/technology/vehicles; explicitly exclude anachronisms (no smartphones, no flat screens, no modern logos); natural period-appropriate lighting; warm faded nostalgic palette; reverent contemplative mood. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name with biographical flavor. Return ONLY JSON array. {CHUNK_LIST}'::text)
),
updated_at = NOW()
WHERE register_key = 'REGISTER_05_ARCHIVE';

COMMIT;
```

### 6.3 Phase 3 workflow reorder — register auto-suggestion at topic stage

In the topic-research workflow (wherever the topic classifier runs — commonly an early node in the topic pipeline), add a register-suggestion step.

Claude prompt addition (append to the classifier's instruction block):

```
Also classify this topic into ONE of the five Production Registers:

- REGISTER_01_ECONOMIST: analytical explainer — finance, legal/tax/insurance mechanics, B2B fundamentals, real-estate math, mortgage education. Default for explainer content.
- REGISTER_02_PREMIUM: luxury editorial — premium cards ($450+ AF), luxury real estate, HNW finance, premium travel, wealth management.
- REGISTER_03_NOIR: investigative — crime, revenge (contemporary), financial fraud, legal scandal, corporate wrongdoing, predatory products, company-collapse narratives.
- REGISTER_04_SIGNAL: tech/fintech — B2B SaaS, AI tools, cybersecurity, payment tech, crypto, algorithmic trading.
- REGISTER_05_ARCHIVE: biographical/historical — founder stories, company histories, retrospective revenge ("years later..."), family drama, real-estate dynasty histories, historical cases.

Return: {"production_register": "REGISTER_XX_NAME", "register_confidence": 0.0-1.0, "register_rationale": "brief reason"}.
```

Store the result on `topics` (columns: `production_register`, `register_confirmed_at` stays NULL until Gate 1 approval).

### 6.4 Phase 3 Gate 1 UI change

At Gate 1 topic-approval, surface the register recommendation with override:

```
Approve Topic
──────────────
Topic: {topic.seo_title}
Suggested Register: {topic.production_register} (confidence: {topic.register_confidence})
Rationale: {topic.register_rationale}

[ Dropdown: REGISTER_01 ▾ | REGISTER_02 ▾ | REGISTER_03 ▾ | REGISTER_04 ▾ | REGISTER_05 ▾ ]

[✓ Approve topic + register]  [✕ Reject]
```

On approval, set `topics.register_confirmed_at = NOW()`. The dropdown lets the user override the auto-suggestion without friction.

### 6.5 Phase 3 node edit — Build Visual Prompt

Locate the node in `WF_SCRIPT_GENERATE.json` that builds the metadata prompt. It currently looks roughly like this (based on the base pipeline docs):

```js
// CURRENT (generic — no register context)
const chunkList = chunks.map((c, i) => 'CHUNK ' + (i+1) + ': ' + c).join('\n\n');
const metadataPrompt =
  'Below are ' + chunks.length + ' text chunks from a documentary script about "' +
  (topic.seo_title || topic.original_title) + '".\n\n' +
  'For EACH chunk, generate ONLY:\n' +
  '1. image_prompt: 40-80 words, cinematic. Structure: ...\n' +
  // ... rest of generic prompt
  chunkList;
```

Replace with a register-aware version that falls back to the generic prompt when register or metadata_prompt is missing:

```js
// NEW (Phase 3 — register-aware, backward-compatible)
const chunkList = chunks.map((c, i) => 'CHUNK ' + (i+1) + ': ' + c).join('\n\n');

// Backward compatibility: if register missing or config.metadata_prompt missing, use generic
let metadataPrompt;

if (topic.production_register && register && register.config && register.config.metadata_prompt) {
  metadataPrompt = register.config.metadata_prompt
    .replace('{N}', chunks.length)
    .replace('{SEO_TITLE}', topic.seo_title || topic.original_title)
    .replace('{CHUNK_LIST}', chunkList);
} else {
  // Original generic prompt, unchanged
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

The fetch of the `register` object (if not already fetched elsewhere in the node) uses the same Supabase REST pattern as `Prepare Image Data`:

```js
// If register isn't already in node context, fetch it
let register = null;
if (topic.production_register) {
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/production_registers?register_key=eq.${topic.production_register}&select=config`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    }
  );
  const rows = await resp.json();
  register = rows[0] || null;
}
```

### 6.6 Phase 3 JSON schema check

The register-specific metadata prompts all return the same JSON shape as the generic:

```json
[{"scene_number": 1, "image_prompt": "...", "emotional_beat": "...", "chapter": "..."}, ...]
```

No downstream changes. The existing parser, the existing `scenes.image_prompt` column, the existing `emotional_beat` enum — all unchanged. Only the content of `image_prompt` becomes register-flavored.

### 6.7 Phase 3 Testing Protocol

Step 1 — Run a test topic through the new flow end-to-end. Verify:
- Topic classifier sets `topics.production_register` and `register_confidence`
- Gate 1 UI surfaces the suggestion
- On approval, `register_confirmed_at` is set
- `Build Visual Prompt` node receives the register context
- Claude returns register-flavored `image_prompt` values

Step 2 — Compare output quality. Run the same topic through Phase 1-only pipeline (disable register in `Build Visual Prompt` via feature flag) and Phase 3-enabled pipeline. Inspect side-by-side on 5 scenes each. Phase 3 output should show clear register character in the `scene_subject` itself.

Step 3 — Backward compatibility check. Run an older topic that has `production_register = NULL`. Verify `Build Visual Prompt` falls back to generic prompt without error.

### 6.8 Phase 3 Rollback

If Phase 3 causes problems, rollback is a single feature flag or a one-line revert in `Build Visual Prompt`:

```js
// Force-disable Phase 3 register-aware branch
const USE_REGISTER_METADATA_PROMPT = false;  // toggle

if (USE_REGISTER_METADATA_PROMPT && topic.production_register && register && register.config && register.config.metadata_prompt) {
  // register-aware path
} else {
  // generic path (unchanged)
}
```

No data rollback needed. `topics.production_register` and `register_confirmed_at` values stay but are simply ignored by the downstream node. Phase 2 niche variants continue to work. Phase 1 register_anchors upgrade continues to work.

---

## 7. Cross-Phase Verification Queries

Use these queries to monitor rollout health and catch drift.

**Verify all 5 registers have expected structure after each phase:**

```sql
SELECT
  register_key,
  jsonb_typeof(config->'image_anchors') AS anchors_type,
  CASE
    WHEN jsonb_typeof(config->'image_anchors') = 'object'
    THEN (SELECT array_agg(k) FROM jsonb_object_keys(config->'image_anchors') k)
    ELSE ARRAY['(string)']::text[]
  END AS anchors_keys,
  LENGTH(config->>'negative_additions') AS neg_length_chars,
  config ? 'metadata_prompt' AS has_metadata_prompt,
  updated_at
FROM production_registers
ORDER BY register_key;
```

Expected after Phase 1: anchors_type='string', has_metadata_prompt=false.
Expected after Phase 2: anchors_type='object', anchors_keys includes 'primary' + 2 niche keys, has_metadata_prompt=false.
Expected after Phase 3: anchors_type='object', has_metadata_prompt=true.

**Find topics using register-aware metadata:**

```sql
SELECT
  t.id,
  t.seo_title,
  t.production_register,
  t.niche_variant,
  t.register_confirmed_at,
  COUNT(s.id) AS scene_count,
  AVG(LENGTH(s.image_prompt)) AS avg_subject_length
FROM topics t
LEFT JOIN scenes s ON s.topic_id = t.id
WHERE t.production_register IS NOT NULL
GROUP BY t.id
ORDER BY t.register_confirmed_at DESC
LIMIT 20;
```

**Sample resolved prompt for any scene:**

```sql
SELECT
  s.scene_number,
  t.production_register,
  t.niche_variant,
  s.composition_prefix,
  s.image_prompt AS scene_subject,
  CASE
    WHEN jsonb_typeof(pr.config->'image_anchors') = 'object'
    THEN pr.config->'image_anchors'->>COALESCE(t.niche_variant, 'primary')
    ELSE pr.config->>'image_anchors'
  END AS register_anchors,
  p.style_dna,
  LENGTH(
    s.composition_prefix || ' ' ||
    s.image_prompt || ' ' ||
    COALESCE(
      CASE
        WHEN jsonb_typeof(pr.config->'image_anchors') = 'object'
        THEN pr.config->'image_anchors'->>COALESCE(t.niche_variant, 'primary')
        ELSE pr.config->>'image_anchors'
      END,
      ''
    ) || ' ' ||
    p.style_dna
  ) AS resolved_prompt_length_chars
FROM scenes s
JOIN topics t ON t.id = s.topic_id
JOIN projects p ON p.id = s.project_id
JOIN production_registers pr ON pr.register_key = t.production_register
WHERE s.id = '{SCENE_ID}';
```

---

## 8. Suggested Rollout Calendar

**Week 1 — Phase 1 on one project.** Pick the Kitchen project (or whichever is least risky). Run Phase 1 SQL, verify with 3-scene micro-tests for the 1–2 registers that project uses. Approve a full production run. Measure viewer retention and thumbnail CTR against the prior production as signal.

**Week 2 — Phase 1 across all projects.** If Week 1 results hold, Phase 1 is globally safe because it changes only `production_registers` (shared across projects). Enable the upgraded anchors/negatives for all registers. Continue monitoring.

**Week 3–4 — Phase 2 niche variants.** Add the JSONB migration. Update the topic classifier to emit `niche_variant`. Deploy the `Fire All Scenes` node edit with the `typeof` backward-compat check. Roll out to one project, validate, then open to all.

**Week 5–6 — Phase 3 planning.** Before implementing Phase 3, confirm:
- Phase 1 + Phase 2 visual results justify further investment
- Topic classifier reliability is high enough to auto-suggest registers accurately (tune the prompt on 20+ historical topics before going live)
- Gate 1 UI has bandwidth to accept a new recommendation field

**Week 7–8 — Phase 3 implementation.** Schema additions, classifier prompt tuning, Gate 1 UI update, `Build Visual Prompt` node edit. Feature-flag the new code path so you can disable it instantly if output quality regresses for any topic.

**Week 9+ — Phase 3 full rollout** if flags held green.

---

## 9. Updates Needed to Proposed Register Prompt Files

The 6 files under `image_prompts_by_register/` need minor edits to match the live pipeline. These edits do NOT change the substance of what each register wants visually — they just correct integration details. Do them before sharing the files with another engineer on the team.

**Global find/replace across all 6 files:**

- `Prepare Metadata Prompt` → `Build Visual Prompt`
- `prompt_templates` table references → `production_registers.config` JSONB
- `prompt_templates.template_key = 'metadata_prompt_register_XX'` → `production_registers.config->>'metadata_prompt' WHERE register_key = 'REGISTER_XX_NAME'`
- `prompt_templates.template_key = 'negative_additions_register_XX'` → `production_registers.config->>'negative_additions' WHERE register_key = 'REGISTER_XX_NAME'`
- `prompt_templates.template_key = 'style_dna_register_XX'` → this should NOT be used — `style_dna` stays project-locked and register-neutral. Remove or mark deprecated.
- `lookupTemplate(...)` → inline Supabase REST fetch pattern (as shown in Section 6.5)
- References to `scene.niche_variant` → `topic.niche_variant` (Phase 2)

**Formula references:**

- Replace "3-part formula: `{COMPOSITION_PREFIX} {SCENE_SUBJECT} {STYLE_DNA}`" with "4-part formula: `{COMPOSITION_PREFIX} {SCENE_SUBJECT} {REGISTER_ANCHORS} {STYLE_DNA}`" everywhere.
- Update all "Worked Examples" sections to show the 4-part resolved prompt.

**Style DNA variants (Sections 2 in each file):**

The proposed "Style DNA variants" should be retitled "Register Anchor variants" and documented as data that lives in `production_registers.config.image_anchors` (either as a single string pre-Phase 2, or as an object with niche keys post-Phase 2). `projects.style_dna` stays untouched.

These doc edits can wait until the team wants to hand the register prompt library to another engineer. They are not required to execute this implementation guide.

---

## 10. Appendix — Source Files

- `workflows/WF_IMAGE_GENERATION.json` — `Fire All Scenes` node (Phase 2 edit)
- `workflows/WF_SCRIPT_GENERATE.json` — `Build Visual Prompt` node (Phase 3 edit)
- `IMAGE_GENERATION_PROMPTS.md` — base pipeline reference (unchanged by this guide)
- `image_prompts_by_register/README.md` + 5 register files — source content for Phase 1, 2, 3 (pending doc edits per Section 9)
- `vision_gridai_registers/REGISTER_XX_*.md` — cinematic grammar playbooks (unchanged; inform visual direction)
- `VisionGridAI_Platform_Agent.md` — Style DNA base templates (unchanged), Composition Library (unchanged), Universal Negative (unchanged)
- `directives/04-image-generation.md` — SOP reference (update after Phase 3 ships)

---

## 11. Closing Note — Why Phased Beats Naive

The proposal as written would deliver maximum flavor upgrade in one shot, but the cost of getting there is: one new table, two workflow changes, an ordering change to the production flow, and a node name correction — all in one deploy. That's four simultaneous changes in a live pipeline shipping real videos.

This phased plan gets the easiest and most visible win (Phase 1) into production in under an hour with zero code risk. It defers the niche-variant feature until data shape is proven useful (Phase 2). It only tackles the flow reorder (Phase 3) after the first two phases prove that the quality lift justifies it. Each phase is independently valuable, independently reversible, and stackable with the prior phase without re-doing work.

If Phase 1 alone delivers the viewer-retention lift you're hoping for, you may never need to do Phase 2 or Phase 3. If it doesn't, Phase 2 and Phase 3 are waiting, fully scoped.
