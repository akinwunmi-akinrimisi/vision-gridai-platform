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

COMMIT;
