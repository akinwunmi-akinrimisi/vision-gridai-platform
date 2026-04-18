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

-- Verification: expect 01-04 = 'object', 05 = 'string'
SELECT
  register_id,
  jsonb_typeof(config->'image_anchors') AS anchors_type
FROM production_registers
ORDER BY register_id;

COMMIT;
