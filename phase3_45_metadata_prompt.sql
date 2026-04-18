BEGIN;

-- REGISTER 01 — ECONOMIST
UPDATE production_registers
SET config = jsonb_set(config, '{metadata_prompt}', to_jsonb(
'Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 01 — THE ECONOMIST. Documentary explainer register: Johnny Harris, Wendover, Polymatter. Authoritative, calm, data-rich. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands, or figures from behind; single-source directional key light; muted palette with controlled warmth; composition preserves negative space for overlay typography; contemplative analytical mood; for data-image scenes use "documentary magazine infographic style" and "no readable specific numbers"; no text or logos in images. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name. Return ONLY JSON array: [{"scene_number": 1, "image_prompt": "...", "emotional_beat": "...", "chapter": "..."}]. Do NOT modify narration. {CHUNK_LIST}'::text
)),
updated_at = NOW()
WHERE register_id = 'REGISTER_01_ECONOMIST';

-- REGISTER 02 — PREMIUM AUTHORITY
UPDATE production_registers
SET config = jsonb_set(config, '{metadata_prompt}', to_jsonb(
'Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 02 — PREMIUM AUTHORITY. Luxury editorial register: Bloomberg Originals, Rolex brand films, Robb Report. Restraint over flash. Every frame feels expensive. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands, or figures from behind, never eye contact; subjects are metal cards, crystal, leather, watches, fountain pens, marble, mahogany; warm tungsten or golden-hour directional key with long elegant shadows; warm Kodak Portra 400 palette; 85mm Leica M aesthetic; extreme shallow depth of field with creamy bokeh; generous negative space; refined contemplative mood; no logos or brand names. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name. Return ONLY JSON array. {CHUNK_LIST}'::text
)),
updated_at = NOW()
WHERE register_id = 'REGISTER_02_PREMIUM';

-- REGISTER 03 — INVESTIGATIVE NOIR
UPDATE production_registers
SET config = jsonb_set(config, '{metadata_prompt}', to_jsonb(
'Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 03 — INVESTIGATIVE NOIR. True-crime investigation register: LEMMiNO, Netflix Dirty Money, Chernobyl. Tension, gravity, evidence. Every image looks recovered. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands, or figures from behind; single HARSH directional light source (bare bulb, fluorescent, streetlight, cold window); desaturated bleach-bypass palette with cool blue or muted brown bias; deep shadows filling at least 40% of frame; oblique angles never eye-level neutral; bleach bypass or surveillance-photograph quality; tension-forensic-investigative mood; no text or logos. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name. Return ONLY JSON array. {CHUNK_LIST}'::text
)),
updated_at = NOW()
WHERE register_id = 'REGISTER_03_NOIR';

-- REGISTER 04 — SIGNAL (TECH FUTURIST)
UPDATE production_registers
SET config = jsonb_set(config, '{metadata_prompt}', to_jsonb(
'Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 04 — SIGNAL (TECH FUTURIST). Tech/fintech register: ColdFusion, Apple keynote B-roll, Blade Runner 2049 sensibility. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands on devices, or figures from behind; cool blue ambient key with selective warm amber accent rim (never all cool, never warm-dominant); deep blue-black shadows with preserved detail; tack-sharp focus with subtle bloom; macro or architectural perspective; generous negative space with atmospheric depth; Apple keynote or Blade Runner 2049 anchor; HUD corner brackets can be baked in; clinical precise futuristic mood; no readable screen content, no brand names. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name. Return ONLY JSON array. {CHUNK_LIST}'::text
)),
updated_at = NOW()
WHERE register_id = 'REGISTER_04_SIGNAL';

-- REGISTER 05 — ARCHIVE
UPDATE production_registers
SET config = jsonb_set(config, '{metadata_prompt}', to_jsonb(
'Below are {N} text chunks from a documentary script about "{SEO_TITLE}". This video is produced in REGISTER 05 — ARCHIVE. Biographical/historical register: Magnates Media, Ken Burns, Apple TV+ retrospectives. Viewer is leafing through an archive. For EACH chunk, generate: (1) image_prompt: 40-80 words, cinematic. Structure: [SUBJECT]+[ENVIRONMENT]+[LIGHTING]+[COMPOSITION]+[MOOD]+[DETAILS]. Rules: people as silhouettes, hands, or figures from behind; NEVER prompt with specific real names — use descriptive proxies like "a middle-aged man in a 1958 gray flannel suit"; include year/decade marker; include era-appropriate film simulation (Kodachrome 1950s-60s, Portra 800 1970s-80s, Velvia 1980s-90s, color negative 1990s-2000s, Portra 400 contemporary); include period-accurate wardrobe/technology/vehicles; explicitly exclude anachronisms (no smartphones, no flat screens, no modern logos); natural period-appropriate lighting; warm faded nostalgic palette; reverent contemplative mood. (2) emotional_beat: one of hook, tension, revelation, data, story, resolution, transition. (3) chapter: 2-5 word chapter name with biographical flavor. Return ONLY JSON array. {CHUNK_LIST}'::text
)),
updated_at = NOW()
WHERE register_id = 'REGISTER_05_ARCHIVE';

-- Verification
SELECT
  register_id,
  (config ? 'metadata_prompt') AS has_metadata_prompt,
  LENGTH(config->>'metadata_prompt') AS metadata_prompt_length
FROM production_registers
ORDER BY register_id;

COMMIT;
