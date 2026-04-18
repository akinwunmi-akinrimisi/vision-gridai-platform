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
SELECT COUNT(*) AS rows_updated_last_min
FROM production_registers
WHERE updated_at > NOW() - INTERVAL '1 minute';

COMMIT;
