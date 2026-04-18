-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 024 — Production Register specs table (Sprint R2 data layer)
-- ───────────────────────────────────────────────────────────────────────────
-- One row per register with JSONB config containing image prompt anchors,
-- negative prompt additions, TTS speaking rate, voice name, music BPM range,
-- Ken Burns motion preset defaults. Read by production workflows
-- (WF_IMAGE_GENERATION, WF_TTS_AUDIO, WF_MUSIC_GENERATE, WF_KEN_BURNS).
--
-- Values sourced from video_production/REGISTER_*.md.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS production_registers (
  register_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_description TEXT,
  accent_color_hex TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE production_registers IS
  'Per-register production config read by workflows. config JSONB keys: image_anchors, image_anchors_by_era, negative_additions, tts_voice, tts_speaking_rate, music_bpm_min, music_bpm_max, ken_burns_default_preset, typical_scene_length_sec, transition_duration_ms, font_family, accent_color_hex.';

-- Make anon reads easy for dashboard lookups (dashboard uses anon key)
ALTER TABLE production_registers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS production_registers_all ON production_registers;
CREATE POLICY production_registers_all ON production_registers FOR ALL USING (true);

-- ── Seed rows ──────────────────────────────────────────────────────────────

INSERT INTO production_registers (register_id, name, short_description, accent_color_hex, config) VALUES

('REGISTER_01_ECONOMIST', 'The Economist', 'Documentary explainer — authoritative, calm, data-rich.', '#F5A623',
 jsonb_build_object(
   'image_anchors', 'editorial documentary photography, natural cinematic lighting, shallow depth of field, muted color palette with controlled warmth, subtle film grain, 35mm lens characteristics, rule-of-thirds composition, negative space for text overlays, high detail, professional color grading',
   'negative_additions', 'overly saturated colors, cartoonish style, illustration style, anime, garish neon, grunge aesthetic, heavy motion blur, lens flares, dramatic vignetting, surveillance camera quality, surveillance aesthetic, aggressive chromatic aberration, VHS artifacts, glitch effects',
   'tts_voice', 'en-US-Studio-M',
   'tts_speaking_rate', 0.95,
   'music_bpm_min', 60,
   'music_bpm_max', 75,
   'music_mood_keywords', 'orchestral-ambient hybrid, measured, cinematic ambient, documentary-tone',
   'ken_burns_default_preset', 'slow_push',
   'typical_scene_length_sec', 7,
   'transition_duration_ms', 500,
   'font_family', 'Inter Tight'
 )),

('REGISTER_02_PREMIUM', 'Premium Authority', 'Luxury editorial — golden, measured, aspirational.', '#D4AF37',
 jsonb_build_object(
   'image_anchors', 'luxury editorial photography, cinematic natural lighting with strong directional key light, shallow depth of field with creamy bokeh, warm tungsten and amber highlights, rich deep shadows with preserved detail, 85mm lens characteristics, Leica M camera aesthetic, Kodak Portra 400 color palette, subtle grain, golden hour or interior tungsten lighting preferred, rule-of-thirds or centered symmetrical composition, generous negative space, aspirational atmosphere, high detail',
   'negative_additions', 'cheap materials, plastic, chrome, neon, fluorescent lighting, cold color temperature, harsh shadows, cluttered composition, busy backgrounds, synthetic textures, modern tech aesthetics, clinical sterility, aggressive chromatic aberration, VHS artifacts, glitch effects, over-saturation, HDR-like processing',
   'tts_voice', 'en-US-Studio-O',
   'tts_speaking_rate', 0.92,
   'music_bpm_min', 55,
   'music_bpm_max', 70,
   'music_mood_keywords', 'orchestral minimalism, neoclassical piano, Olafur Arnalds-style, refined, aspirational',
   'ken_burns_default_preset', 'breath_push',
   'typical_scene_length_sec', 11,
   'transition_duration_ms', 800,
   'font_family', 'GT Sectra'
 )),

('REGISTER_03_NOIR', 'Investigative Noir', 'True-crime investigation — shadows, tension, evidence.', '#B32020',
 jsonb_build_object(
   'image_anchors', 'dark investigative documentary photography, heavy chiaroscuro lighting with deep black shadows, single harsh light source creating strong shadow patterns, desaturated color palette leaning toward muted browns and cold blues, bleach bypass aesthetic, 16mm film grain, slight vignetting, mood of tension and unease, low-key lighting, noir sensibility, leaked-document aesthetic, surveillance-photograph quality, high detail but degraded',
   'negative_additions', 'warm golden light, luxurious aesthetic, bright cheerful mood, vibrant saturated colors, modern sleek tech aesthetic, clinical clean studio lighting, bokeh background blur that is decorative, lens flares as hero element, joyful expressions, celebratory atmosphere, aspirational lifestyle imagery',
   'tts_voice', 'en-US-Studio-Q',
   'tts_speaking_rate', 0.90,
   'music_bpm_min', 55,
   'music_bpm_max', 65,
   'music_mood_keywords', 'dark ambient, drone-heavy, cello and double-bass forward, sparse percussion, Hildur Gudnadottir inspired, Trent Reznor-Atticus Ross adjacent, tense',
   'ken_burns_default_preset', 'creep_in',
   'typical_scene_length_sec', 10,
   'transition_duration_ms', 900,
   'font_family', 'Courier Prime'
 )),

('REGISTER_04_SIGNAL', 'Signal (Tech Futurist)', 'Tech/fintech precision — clinical, HUD-accented, future.', '#00D4FF',
 jsonb_build_object(
   'image_anchors', 'clean modern product photography, studio lighting with controlled reflections, cool color temperature with selective warm accents, deep blue-black shadows, subtle specular highlights on metallic and glass surfaces, shallow depth of field, macro or architectural perspective, minimalist composition, Apple keynote aesthetic, Bloomberg Originals tech documentary look, Blade-Runner-2049-meets-Dieter-Rams sensibility, high detail, tack-sharp focus, subtle bloom on bright elements',
   'negative_additions', 'warm golden light, nostalgic aesthetic, film grain heavy, organic textures, vintage photography look, historical period styling, natural outdoor environments, handheld camera feel, wood and leather surfaces, rustic settings, cluttered backgrounds, chromatic aberration as heavy effect, VHS artifacts, analog distortion, typewriter or paper aesthetic',
   'tts_voice', 'en-US-Studio-M',
   'tts_speaking_rate', 1.00,
   'music_bpm_min', 80,
   'music_bpm_max', 100,
   'music_mood_keywords', 'electronic-orchestral hybrid, Hans Zimmer-tech, Daniel Pemberton, Holly Herndon adjacent, futuristic, precise',
   'ken_burns_default_preset', 'precision_push',
   'typical_scene_length_sec', 6,
   'transition_duration_ms', 400,
   'font_family', 'JetBrains Mono'
 )),

('REGISTER_05_ARCHIVE', 'Archive', 'Historical/biographical/intimate — warm, patient, sepia.', '#8B6F47',
 jsonb_build_object(
   'image_anchors_by_era', jsonb_build_object(
     '1920s', 'vintage sepia photography, 1920s archival aesthetic, warm faded amber tones, heavy silver-grain film, soft lens focus, period-accurate wardrobe, natural gas-lamp or early-electric lighting, nostalgic patina, slightly yellowed paper quality, archival quality with gentle degradation',
     '1960s', 'vintage Kodachrome photography, 1960s Life magazine aesthetic, warm faded colors, slightly overexposed highlights, high silver content film grain, soft focus characteristic of period lenses, natural mid-century interior lighting, nostalgic warmth, gentle vignetting, slightly yellowed paper quality, period-accurate wardrobe and styling, 35mm film photography, archival quality with subtle degradation',
     '1980s', '1970s/1980s photojournalism aesthetic, Kodak Portra 800 film simulation, slight color cast warmth with amber and orange dominant, moderate film grain, slightly softer contrast than modern photography, period-accurate styling, natural light with era-appropriate indoor tungsten tones, faded archival quality, 35mm film, slight lens flare characteristics, nostalgic warmth',
     '2000s', 'late 1990s/early 2000s digital photography aesthetic or color-negative film, slightly saturated colors, period-accurate styling and technology, early-digital-era warmth, natural mixed lighting, mild grain, familiar nostalgic quality, archival documentary feel',
     'modern', 'intimate family documentary photography, warm domestic lighting, natural indoor light, shallow depth of field, photo-album aesthetic, Kodak Portra 400 simulation on modern subjects, subtle film grain, nostalgic intimate mood, rule-of-thirds composition, photo-album quality'
   ),
   'image_anchors', 'intimate documentary photography, warm nostalgic lighting, subtle film grain, period-accurate or photo-album aesthetic, Kodak Portra 400 simulation, shallow depth of field, rule-of-thirds composition, archival quality with gentle degradation',
   'negative_additions', 'modern digital aesthetic, sharp contemporary lighting, cold color temperature, neon, chrome, futuristic technology, smartphones, flat screens, modern logos, clinical studio lighting, high dynamic range processing, aggressive saturation, synthetic textures, HUD elements, scan lines, glitch effects, cyberpunk aesthetic, anachronistic modern vehicles or clothing in period scenes',
   'tts_voice', 'en-US-Studio-O',
   'tts_speaking_rate', 0.93,
   'music_bpm_min', 60,
   'music_bpm_max', 75,
   'music_mood_keywords', 'acoustic-orchestral, piano and strings forward, era-appropriate (jazz for mid-century, solo piano for intimate, full orchestra for scale), warm, nostalgic',
   'ken_burns_default_preset', 'burns_pan_right',
   'typical_scene_length_sec', 9,
   'transition_duration_ms', 1000,
   'font_family', 'Playfair Display'
 ))

ON CONFLICT (register_id) DO UPDATE
SET name = EXCLUDED.name,
    short_description = EXCLUDED.short_description,
    accent_color_hex = EXCLUDED.accent_color_hex,
    config = EXCLUDED.config,
    updated_at = now();
