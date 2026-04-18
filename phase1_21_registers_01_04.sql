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

COMMIT;
