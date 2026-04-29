-- ─────────────────────────────────────────────────────────────────
--  040_seed_style_dna_templates.sql
--
--  Seeds the 4 canonical Style DNA templates from
--  VisionGridAI_Platform_Agent.md (lines 143-179) into prompt_templates.
--
--  Why this matters:
--    Per CLAUDE.md, Style DNA is LOCKED per project — it gets appended
--    to EVERY image prompt for visual consistency across all 155+ scenes.
--    Until now the templates were specced but never seeded, so:
--      - super_au.style_dna was empty after script gen
--      - image generation would have produced inconsistent visuals
--    This migration seeds the 4 templates so the production-monitor
--    StyleDnaSelector picker has data to render.
--
--  Source of truth: VisionGridAI_Platform_Agent.md "Style DNA Templates"
--  section. Body text copied verbatim — DO NOT modify these without
--  updating the source doc.
-- ─────────────────────────────────────────────────────────────────

INSERT INTO prompt_templates (template_type, template_key, body_text, version, is_active, description)
VALUES
  ('style_dna',
   'historical',
   'cinematic still frame, {ERA} period accuracy, dramatic chiaroscuro lighting, 35mm film grain texture, desaturated muted color palette, deep shadows, documentary photorealism, volumetric fog, depth of field bokeh, 8K detail',
   1, true,
   'Historical / Period Drama — for biographies, history, ancient civilizations, war documentaries. The {ERA} placeholder is substituted at scene-prompt-build time (e.g., "1860s Civil War", "Ancient Rome"). Cinematic film aesthetic with desaturated, chiaroscuro lighting.'),

  ('style_dna',
   'modern_finance',
   'modern commercial photography, clean minimalist composition, premium luxury aesthetic, soft directional studio lighting, subtle depth of field, neutral background tones, crisp 4K sharpness, contemporary color palette, professional product photography feel',
   1, true,
   'Modern Finance / Premium — for finance, investing, retirement, business, wealth, tax content. Clean, professional, trustworthy commercial-photography aesthetic. Recommended default for most documentary-style finance niches.'),

  ('style_dna',
   'tech',
   'futuristic cinematic still, cool blue-purple ambient lighting, clean glass and steel surfaces, subtle neon accents, high contrast shadows, modern tech aesthetic, volumetric light rays, ultra-sharp detail, dark background with rim lighting',
   1, true,
   'Tech / Futuristic — for AI, crypto, software, startup, silicon-valley narratives. Cool blue-purple palette, neon accents, glass-and-steel surfaces, dark backgrounds with dramatic rim lighting.'),

  ('style_dna',
   'inspirational',
   'warm golden hour photography, natural soft lighting, rich earth tones, gentle lens flare, human-centered composition, emotional depth, 35mm film warmth, intimate documentary feel, subtle grain, shallow focus on subject',
   1, true,
   'Warm Human / Inspirational — for wellness, mindfulness, family, relationships, self-improvement, biography. Warm golden-hour palette, natural light, intimate documentary feel — emphasises emotional resonance.')
ON CONFLICT DO NOTHING;

-- Verify seeding
DO $$
DECLARE
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt FROM prompt_templates WHERE template_type='style_dna' AND is_active=true;
  IF cnt < 4 THEN
    RAISE WARNING 'Expected ≥4 active style_dna templates, found %', cnt;
  END IF;
  RAISE NOTICE 'Active style_dna templates: %', cnt;
END $$;
