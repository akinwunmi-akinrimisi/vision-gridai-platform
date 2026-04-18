# REGISTER 05 — ARCHIVE — Image Prompts

Historical, biographical, intimate retrospective. Register-tuned image-generation assets for the Archive Register. Extends the base pipeline in `IMAGE_GENERATION_PROMPTS.md`. All references to `WF_IMAGE_GENERATION.json`, `WF_SCENE_IMAGE_PROCESSOR.json`, `WF_SCRIPT_GENERATE.json`, `Fire All Scenes`, `Prepare Metadata Prompt`, `prompt_templates`, `projects.style_dna`, `scenes.composition_prefix`, `scenes.image_prompt`, `image_size: landscape_16_9`, and the Universal Negative Prompt remain EXACTLY as defined in the base pipeline.

---

## 1. When This Register Is Active

Primary Register for biographical and retrospective content across:

- Founder stories, company origins, industry histories (Magnates Media-style biographical finance)
- Real-estate-empire histories (dynastic developer stories)
- Retrospective revenge stories framed as slow-burn biographical ("years later, he came back...")
- Family drama — saga-structured stories about families, inheritance, generational conflict
- Legendary-investor biographies (Buffett, Munger, Simons)
- Card-company histories (Diners Club, Amex, Visa origins)
- Historical cases, landmark-ruling retrospectives, insurance-industry origins
- Long-form biographical content (30+ minutes)

Scene classifier should set `scenes.production_register = 'REGISTER_05_ARCHIVE'` when content is past-tense with year references, contains biographical language (birth, upbringing, meeting), historical-era markers, founder/origin stories, family drama with retrospective framing, or revenge stories framed as slow-burn biographical.

---

## 2. Register-Specific Style DNA Variants

Three variants — this register's variants are era-contingent. For multi-era biographical content, consider storing variants keyed by era and selecting per scene.

### Variant A — Archive Primary (default for biographical, founder stories)

For `projects.style_dna` or `prompt_templates.template_key = 'style_dna_register_05_primary'`:

```
vintage archival photography, era-appropriate film simulation, warm faded color palette with nostalgic amber and rust tones, heavy 16mm or 8mm silver-halide film grain, soft period lens characteristics, natural period-appropriate lighting, archival quality with subtle age degradation, warm vignetting, rule-of-thirds composition, nostalgic reverent mood, photo-album aesthetic, documentary photorealism
```

### Variant B — Archive Family Drama (for contemporary family drama, intimate domestic scenes)

For `prompt_templates.template_key = 'style_dna_register_05_family_drama'`:

```
intimate family documentary photography, warm domestic lighting, natural indoor window light, shallow depth of field on personal objects, photo-album aesthetic, Kodak Portra 400 simulation on modern subjects with subtle faded warmth, moderate film grain, nostalgic intimate mood, rule-of-thirds composition preserving domestic detail, photo-album quality, documentary photorealism
```

### Variant C — Archive Period-Era Contingent (use with era sub-anchor in scene_subject)

For `prompt_templates.template_key = 'style_dna_register_05_period_era_contingent'`:

```
vintage archival photography, era-specific film simulation as specified in subject prompt, nostalgic faded color palette aligned to the indicated era, silver-halide film grain, period-appropriate natural lighting, archival quality with subtle age degradation, warm vignetting, rule-of-thirds composition, reverent biographical mood, photo-album aesthetic, documentary photorealism
```

When using Variant C, the scene_subject must specify which era sub-anchor to apply. The valid sub-anchors are:

- **1950s-1960s:** `vintage Kodachrome photography, 1960s Life magazine aesthetic, warm faded colors, slightly overexposed highlights, high-silver-content film grain, period-accurate wardrobe and mid-century styling`
- **1970s-1980s:** `1970s/1980s photojournalism aesthetic, Kodak Portra 800 film simulation, slight amber-orange color cast, moderate grain, period-accurate styling, natural light with era-appropriate tungsten tones, slight lens flare characteristics`
- **1980s-1990s (vibrant):** `late-1980s/early-1990s Fuji Velvia saturation, punchy but still faded colors, period-accurate styling, moderate grain`
- **1990s-2000s:** `late-1990s/early-2000s color negative film aesthetic or early digital, slightly faded saturation, period-accurate styling and technology, early-digital-era warmth, mild grain, familiar nostalgic quality`
- **Contemporary intimate family:** use Variant B directly

---

## 3. Register-Specific Negative Prompt Additions

For `prompt_templates.template_key = 'negative_additions_register_05'`:

```
modern digital aesthetic, sharp contemporary lighting, cold color temperature, neon, chrome, futuristic technology, smartphones in period scenes, flat screens in period scenes, modern logos, clinical studio lighting, high dynamic range processing, aggressive saturation, synthetic textures, HUD elements, scan lines, glitch effects, cyberpunk aesthetic, anachronistic modern vehicles or clothing in period scenes, Blade Runner aesthetic, bleach bypass desaturation, heavy noir shadows
```

**Resulting `negative_prompt` field sent to Fal.ai** (Universal Negative verbatim + Register 05 additions):

```
text, watermark, signature, logo, UI elements, blurry, low quality, distorted faces, extra fingers, mutated hands, bad anatomy, deformed, disfigured, out of frame, cropped, duplicate, error, jpeg artifacts, low resolution, cartoon, anime, painting, illustration, 3D render, CGI, modern digital aesthetic, sharp contemporary lighting, cold color temperature, neon, chrome, futuristic technology, smartphones in period scenes, flat screens in period scenes, modern logos, clinical studio lighting, high dynamic range processing, aggressive saturation, synthetic textures, HUD elements, scan lines, glitch effects, cyberpunk aesthetic, anachronistic modern vehicles or clothing in period scenes, Blade Runner aesthetic, bleach bypass desaturation, heavy noir shadows
```

---

## 4. composition_prefix Preferences

| Priority | composition_prefix | Use In This Register For |
|---|---|---|
| 1 | `wide_establishing` | Period cityscapes, historical location reveals, establishing decades |
| 2 | `medium_closeup` | Hands engaging with period objects, figures from behind in period rooms |
| 3 | `extreme_closeup` | Period document details, handwritten letters, personal heirlooms |
| 4 | `symmetrical` | Photo-album hero shots, formal period portrait compositions |
| 5 | `high_angle` | Overhead desk treatments, period documents laid out |
| 6 | `leading_lines` | Period architectural corridors, train tracks, streets of the era |
| 7 | `low_angle` | Sparingly — period monumental architecture only |
| 8 | `over_shoulder` | Rarely — reading a letter over the shoulder, examining a photograph |

Scene classifier guidance: default to `wide_establishing` for era-establishing hooks, `medium_closeup` for story beats, `extreme_closeup` for personal-heirloom data beats, `symmetrical` for hero-photograph revelations.

---

## 5. Register-Specific Metadata Prompt

Full body to store in `prompt_templates.template_key = 'metadata_prompt_register_05'`.

```
Below are {N} text chunks from a documentary script about "{SEO_TITLE}".

This video is produced in REGISTER 05 — ARCHIVE. The visual language is nostalgic biographical: Magnates Media, Business Casual, Biographics, Ken Burns's PBS work, Apple TV+ documentary retrospectives. The viewer is leafing through a carefully curated archive. Images look recovered, not created. Color is warm, faded, touched by time.

For EACH chunk, generate ONLY:

1. image_prompt: 40-80 words, cinematic. Structure: [SUBJECT] + [ENVIRONMENT] + [LIGHTING] + [COMPOSITION] + [MOOD] + [DETAILS]. Be hyper-specific.

Register 05 rules for image_prompt:
- People as silhouettes, hands, figures from behind, shoulders-and-below, or distant figures — never full identifiable faces of real named individuals; do not prompt with specific real names
- For historical figures use descriptive proxies: "a middle-aged man in a 1958 gray flannel suit" rather than "Frank McNamara"
- Subjects: period architecture, period interiors (mid-century kitchens, 1970s offices, 1980s trading floors), period documents (handwritten letters, aged ledgers, newspaper clippings, typewritten pages), period objects (typewriters, rotary phones, fountain pens, vintage cars, period cameras), vintage photographs shown as if in a photo album
- Lighting: natural period-appropriate — warm morning light through Venetian blinds, warm tungsten period desk lamps, golden-hour outdoor light, early-fluorescent tubes (1970s office), warm candlelight — never harsh clinical, never modern LED-flat, never noir-hard
- Color: nostalgic faded warm palette — amber, rust, warm cream, muted sepia — specify era sub-anchor in subject if multi-era production
- Composition: rule-of-thirds, photo-album aesthetic, heavier vignetting acceptable, period-lens soft focus characteristics
- Always include era or year marker (e.g., "1958," "late 1970s," "1985")
- Always include film-simulation anchor matching the era (Kodachrome for 1950s-60s, Portra 800 for 70s-80s, Velvia for 80s-90s, color negative for 90s-2000s, Portra 400 for contemporary family drama)
- Always include period-accurate wardrobe, technology, vehicles, signage-style descriptors
- Explicitly BAN anachronisms for period scenes: "no smartphones, no flat-screen TVs, no modern logos, no modern cars"
- Mood: nostalgic, reverent, biographical, contemplative, warm-melancholic — never urgent, never clinical, never neon-futuristic
- For document treatments specify "aged paper, slight yellowing, minor creases, period-appropriate typewriter or handwritten content"
- For photo-album treatments specify "presented as a vintage photograph with white border and slight curling corner, subtle paper texture"
- No readable specific text on period documents (real content added later via drawtext if needed)

2. emotional_beat: one of hook, tension, revelation, data, story, resolution, transition

Beat-to-scene mapping for Register 05:
- hook: wide_establishing + period cityscape or era-establishing location at golden hour/blue hour
- tension: medium_closeup + hands with period object in period interior
- revelation: symmetrical + centered period hero subject (person from behind, period car, period home)
- data: extreme_closeup + period document (ledger page, handwritten letter, newspaper clipping, typewritten memo)
- story: medium_closeup + intimate period detail (family dinner table, period kitchen scene, period office moment)
- resolution: wide_establishing + pulling back to period environment at golden hour, contemplative final frame
- transition: leading_lines + period corridor, period train, period city street receding

3. chapter: a short chapter name grouping related scenes (2-5 words max, biographical flavor preferred — "The Cardboard Years", "Thirty-Seven Years Later", "The House That Built Us")

Return ONLY a JSON array: [{"scene_number": 1, "image_prompt": "...", "emotional_beat": "...", "chapter": "..."}]

Do NOT return or modify any narration text. I only need image_prompt, emotional_beat, and chapter for each chunk number.

{CHUNK_LIST}
```

---

## 6. Per-`emotional_beat` scene_subject Patterns

### hook

```
[PERIOD CITYSCAPE / PERIOD LOCATION] in [YEAR / DECADE], [SPECIFIC ERA-ACCURATE DETAILS — period vehicles, period signage style, period architecture], warm [golden-hour / blue-hour] light raking across [environment], atmospheric period haze, [aerial helicopter / architectural] perspective, wide composition with sky in upper third, nostalgic biographical mood, [ERA FILM SIMULATION ANCHOR — Kodachrome / Portra 800 / Velvia / color negative]
```

### tension

```
[HANDS / SILHOUETTE from behind] [engaging with PERIOD OBJECT — typewriter / rotary phone / ledger / fountain pen / period camera / handwritten letter] in a [period interior — mid-century kitchen / 1970s office / 1980s trading floor], warm [window / tungsten lamp / golden-hour] light from [direction] casting period-soft shadows, medium close-up with period detail visible in background, shallow depth of field on the object, contemplative nostalgic mood, [ERA FILM SIMULATION]
```

### revelation

```
[CENTRAL PERIOD SUBJECT — a [period car / period home / figure in period wardrobe from behind / period product]] in its [era-appropriate setting], warm [period lighting type] creating long soft shadows, perfectly symmetrical centered composition with generous negative space, period detail visible, mood of biographical moment, [ERA FILM SIMULATION]
```

### data

```
[PERIOD DOCUMENT — handwritten ledger page / typewritten memo / period newspaper clipping / aged photograph] resting on [period surface — mahogany desk / Formica counter / waxed linoleum], single warm [period lamp / window light] from [direction] creating soft shadow, extreme close-up with shallow depth of field, illegible specific content but period-accurate formatting, aged paper with subtle creases and slight yellowing, mood of recovered record, [ERA FILM SIMULATION]
```

### story

```
[FAMILY/INTIMATE PERIOD SCENE — mid-century family at dinner / 1970s living room with TV glow / 1980s kitchen / weathered attic] with [SPECIFIC PERIOD OBJECTS — period furniture, period dishware, period fixtures], a [figure in period wardrobe from behind / hands engaging with personal object], warm [period natural or domestic light] from [direction], medium close-up preserving period environment in soft bokeh, intimate biographical mood, [ERA FILM SIMULATION]
```

### resolution

```
[WIDE VIEW of period location / period street / period home exterior] at [golden hour / dusk / dawn], warm low sun raking across the scene, period details throughout (period cars, period signage, period wardrobe on distant figures), horizontal composition with sky in upper third, nostalgic contemplative conclusive mood, subtle atmospheric period haze, [ERA FILM SIMULATION]
```

### transition

```
[PERIOD CORRIDOR / PERIOD TRAIN INTERIOR / PERIOD STREET / PERIOD ARCHITECTURAL PASSAGE] receding toward a warm bright vanishing point, [period lighting characteristics — tungsten wall sconces / daylight through high windows / period streetlamps], strong leading-lines composition, period atmospheric haze, nostalgic transitional mood, [ERA FILM SIMULATION]
```

---

## 7. Worked Examples — 12 Scenes Across 5 Niches

### Example 01 — Business/Finance Biography (Diners Club origin) — Hook, 1949

**Inputs:**
- `scenes.composition_prefix`: `wide_establishing`
- `scenes.image_prompt`: `a crowded 1949 Manhattan restaurant interior at dinner time, warm low tungsten lighting, period-accurate diners in 1940s suits and dresses at white-linen-covered tables, wooden paneled walls, rotary telephone visible on a host stand, no modern technology or anachronistic items, wide-angle composition from the entrance looking across the room, soft atmospheric haze of period cigarette smoke, nostalgic biographical mood, vintage Kodachrome photography 1960s Life magazine aesthetic with warm faded colors and high-silver-content film grain, period-accurate wardrobe and mid-century styling`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
wide angle establishing shot, full scene visible, environmental context, a crowded 1949 Manhattan restaurant interior at dinner time, warm low tungsten lighting, period-accurate diners in 1940s suits and dresses at white-linen-covered tables, wooden paneled walls, rotary telephone visible on a host stand, no modern technology or anachronistic items, wide-angle composition from the entrance looking across the room, soft atmospheric haze of period cigarette smoke, nostalgic biographical mood, vintage Kodachrome photography 1960s Life magazine aesthetic with warm faded colors and high-silver-content film grain, period-accurate wardrobe and mid-century styling vintage archival photography, era-appropriate film simulation, warm faded color palette with nostalgic amber and rust tones, heavy 16mm or 8mm silver-halide film grain, soft period lens characteristics, natural period-appropriate lighting, archival quality with subtle age degradation, warm vignetting, rule-of-thirds composition, nostalgic reverent mood, photo-album aesthetic, documentary photorealism
```

**`emotional_beat`:** `hook`

### Example 02 — Business/Finance Biography — Tension, 1958

**Inputs:**
- `scenes.composition_prefix`: `medium_closeup`
- `scenes.image_prompt`: `a middle-aged man in a 1958 gray flannel suit seen from behind examining a small plastic rectangle card at a walnut kitchen table in a mid-century suburban kitchen, morning light streaming through a window with Venetian blinds casting striped shadows across the table and his shoulders, period-accurate kitchen with Formica counters and a Frigidaire refrigerator visible in background, no anachronistic items, medium close-up composition, shallow depth of field on the card, rule-of-thirds composition with negative space upper right, contemplative nostalgic mood, vintage Kodachrome photography with warm faded colors and high-silver-content film grain`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
medium close-up shot, subject fills center frame, shoulders and above, a middle-aged man in a 1958 gray flannel suit seen from behind examining a small plastic rectangle card at a walnut kitchen table in a mid-century suburban kitchen, morning light streaming through a window with Venetian blinds casting striped shadows across the table and his shoulders, period-accurate kitchen with Formica counters and a Frigidaire refrigerator visible in background, no anachronistic items, medium close-up composition, shallow depth of field on the card, rule-of-thirds composition with negative space upper right, contemplative nostalgic mood, vintage Kodachrome photography with warm faded colors and high-silver-content film grain vintage archival photography, era-appropriate film simulation, warm faded color palette with nostalgic amber and rust tones, heavy 16mm or 8mm silver-halide film grain, soft period lens characteristics, natural period-appropriate lighting, archival quality with subtle age degradation, warm vignetting, rule-of-thirds composition, nostalgic reverent mood, photo-album aesthetic, documentary photorealism
```

**`emotional_beat`:** `tension`

### Example 03 — Family Drama (Contemporary) — Story (Variant B)

**Inputs:**
- `scenes.composition_prefix`: `extreme_closeup`
- `scenes.image_prompt`: `a folded handwritten letter resting on a weathered wooden dining table beside a vacant place setting, the wax-sealed envelope partly visible nearby, warm afternoon light streaming through a lace curtain creating soft filtered shadows, extreme close-up with the letter in tack-sharp focus and the surrounding table in warm domestic bokeh, intimate overhead-45-degree angle, mood of long-held family secret, Kodak Portra 400 simulation with subtle faded warmth and moderate grain`
- `projects.style_dna` (Variant B — Family Drama)

**Resolved `prompt`:**

```
extreme close-up, tight crop on detail, shallow depth of field, a folded handwritten letter resting on a weathered wooden dining table beside a vacant place setting, the wax-sealed envelope partly visible nearby, warm afternoon light streaming through a lace curtain creating soft filtered shadows, extreme close-up with the letter in tack-sharp focus and the surrounding table in warm domestic bokeh, intimate overhead-45-degree angle, mood of long-held family secret, Kodak Portra 400 simulation with subtle faded warmth and moderate grain intimate family documentary photography, warm domestic lighting, natural indoor window light, shallow depth of field on personal objects, photo-album aesthetic, Kodak Portra 400 simulation on modern subjects with subtle faded warmth, moderate film grain, nostalgic intimate mood, rule-of-thirds composition preserving domestic detail, photo-album quality, documentary photorealism
```

**`emotional_beat`:** `story`

### Example 04 — Family Drama (Contemporary) — Hook (Variant B)

**Inputs:**
- `scenes.composition_prefix`: `wide_establishing`
- `scenes.image_prompt`: `a wide view of a weathered clapboard family home at late afternoon in autumn, warm low sun raking diagonally across the porch and front yard, a child's bicycle leaning against the porch rail, leaves scattered across the walk, a single figure in silhouette standing on the porch looking out, horizontal composition with sky in upper third and home occupying the middle band, nostalgic melancholic mood, contemporary setting with no visible technology or anachronistic clutter, Kodak Portra 400 simulation with subtle faded warmth`
- `projects.style_dna` (Variant B)

**Resolved `prompt`:**

```
wide angle establishing shot, full scene visible, environmental context, a wide view of a weathered clapboard family home at late afternoon in autumn, warm low sun raking diagonally across the porch and front yard, a child's bicycle leaning against the porch rail, leaves scattered across the walk, a single figure in silhouette standing on the porch looking out, horizontal composition with sky in upper third and home occupying the middle band, nostalgic melancholic mood, contemporary setting with no visible technology or anachronistic clutter, Kodak Portra 400 simulation with subtle faded warmth intimate family documentary photography, warm domestic lighting, natural indoor window light, shallow depth of field on personal objects, photo-album aesthetic, Kodak Portra 400 simulation on modern subjects with subtle faded warmth, moderate film grain, nostalgic intimate mood, rule-of-thirds composition preserving domestic detail, photo-album quality, documentary photorealism
```

**`emotional_beat`:** `hook`

### Example 05 — Revenge as Retrospective — Story (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `extreme_closeup`
- `scenes.image_prompt`: `a weathered old lockbox on the dusty wooden floorboards of a garage attic, covered in a visible thin layer of accumulated dust, a single beam of late-afternoon sunlight falling diagonally across it through a small round window, visible dust motes floating in the light beam, wooden floorboards with knot patterns in the foreground, extreme close-up with shallow depth of field rendering the lockbox in sharp focus and floorboard grain in soft warm bokeh, slight overhead angle, mood of long-buried truth resurfacing, Kodak Portra 800 simulation with warm amber color cast`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
extreme close-up, tight crop on detail, shallow depth of field, a weathered old lockbox on the dusty wooden floorboards of a garage attic, covered in a visible thin layer of accumulated dust, a single beam of late-afternoon sunlight falling diagonally across it through a small round window, visible dust motes floating in the light beam, wooden floorboards with knot patterns in the foreground, extreme close-up with shallow depth of field rendering the lockbox in sharp focus and floorboard grain in soft warm bokeh, slight overhead angle, mood of long-buried truth resurfacing, Kodak Portra 800 simulation with warm amber color cast vintage archival photography, era-appropriate film simulation, warm faded color palette with nostalgic amber and rust tones, heavy 16mm or 8mm silver-halide film grain, soft period lens characteristics, natural period-appropriate lighting, archival quality with subtle age degradation, warm vignetting, rule-of-thirds composition, nostalgic reverent mood, photo-album aesthetic, documentary photorealism
```

**`emotional_beat`:** `story`

### Example 06 — Real Estate Dynasty History — Hook, 1985 (Variant C — Period)

**Inputs:**
- `scenes.composition_prefix`: `wide_establishing`
- `scenes.image_prompt`: `a view of lower Manhattan at dusk in 1985, a single illuminated skyscraper under construction among older period buildings, warm amber haze settling over the city, 1980s-era period automobiles visible on distant streets, no modern glass-tower architecture, architectural helicopter angle from across the water at the Brooklyn vantage, period New York harbor activity visible in the foreground, horizontal composition with sky in upper third and skyline as middle band, nostalgic ambitious mood, late-1980s Fuji Velvia saturation with punchy but still faded colors and moderate grain`
- `projects.style_dna` (Variant C — Period Era Contingent)

**Resolved `prompt`:**

```
wide angle establishing shot, full scene visible, environmental context, a view of lower Manhattan at dusk in 1985, a single illuminated skyscraper under construction among older period buildings, warm amber haze settling over the city, 1980s-era period automobiles visible on distant streets, no modern glass-tower architecture, architectural helicopter angle from across the water at the Brooklyn vantage, period New York harbor activity visible in the foreground, horizontal composition with sky in upper third and skyline as middle band, nostalgic ambitious mood, late-1980s Fuji Velvia saturation with punchy but still faded colors and moderate grain vintage archival photography, era-specific film simulation as specified in subject prompt, nostalgic faded color palette aligned to the indicated era, silver-halide film grain, period-appropriate natural lighting, archival quality with subtle age degradation, warm vignetting, rule-of-thirds composition, reverent biographical mood, photo-album aesthetic, documentary photorealism
```

**`emotional_beat`:** `hook`

### Example 07 — Business/Finance Biography — Data, 1970s (Variant C)

**Inputs:**
- `scenes.composition_prefix`: `high_angle`
- `scenes.image_prompt`: `overhead top-down view of a 1970s leather-bound corporate ledger page with elegantly handwritten entries in blue ink, illegible specific numbers and transaction lines visible in period bookkeeping format, a period fountain pen resting diagonally across the page, a ceramic coffee mug with period styling in the upper left corner of frame, warm tungsten office desk lamp light from the upper right creating soft period shadows, slight yellowing of the page, subtle creases and age spots on the paper, perfectly flat top-down angle, shallow depth of field on the pen nib, mood of recovered corporate record, 1970s photojournalism aesthetic with Kodak Portra 800 simulation and amber-orange color cast`
- `projects.style_dna` (Variant C)

**Resolved `prompt`:**

```
high angle shot looking down, bird's eye perspective, subject below, overhead top-down view of a 1970s leather-bound corporate ledger page with elegantly handwritten entries in blue ink, illegible specific numbers and transaction lines visible in period bookkeeping format, a period fountain pen resting diagonally across the page, a ceramic coffee mug with period styling in the upper left corner of frame, warm tungsten office desk lamp light from the upper right creating soft period shadows, slight yellowing of the page, subtle creases and age spots on the paper, perfectly flat top-down angle, shallow depth of field on the pen nib, mood of recovered corporate record, 1970s photojournalism aesthetic with Kodak Portra 800 simulation and amber-orange color cast vintage archival photography, era-specific film simulation as specified in subject prompt, nostalgic faded color palette aligned to the indicated era, silver-halide film grain, period-appropriate natural lighting, archival quality with subtle age degradation, warm vignetting, rule-of-thirds composition, reverent biographical mood, photo-album aesthetic, documentary photorealism
```

**`emotional_beat`:** `data`

### Example 08 — Business/Finance Biography — Revelation (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `symmetrical`
- `scenes.image_prompt`: `a period photograph displayed as if resting on a clean surface, the photograph showing a 1950s exterior of a small storefront bank with period signage and a single period automobile parked at the curb, the photograph itself has a white border and a slight curling corner, subtle paper texture visible, soft directional light from upper left falling across the photograph, perfectly centered symmetrical composition with generous negative space around the photograph, mood of biographical foundation moment, vintage Kodachrome aesthetic with high-silver-content grain`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
perfectly symmetrical composition, centered subject, architectural framing, a period photograph displayed as if resting on a clean surface, the photograph showing a 1950s exterior of a small storefront bank with period signage and a single period automobile parked at the curb, the photograph itself has a white border and a slight curling corner, subtle paper texture visible, soft directional light from upper left falling across the photograph, perfectly centered symmetrical composition with generous negative space around the photograph, mood of biographical foundation moment, vintage Kodachrome aesthetic with high-silver-content grain vintage archival photography, era-appropriate film simulation, warm faded color palette with nostalgic amber and rust tones, heavy 16mm or 8mm silver-halide film grain, soft period lens characteristics, natural period-appropriate lighting, archival quality with subtle age degradation, warm vignetting, rule-of-thirds composition, nostalgic reverent mood, photo-album aesthetic, documentary photorealism
```

**`emotional_beat`:** `revelation`

### Example 09 — Family Drama — Tension (Variant B)

**Inputs:**
- `scenes.composition_prefix`: `medium_closeup`
- `scenes.image_prompt`: `hands from behind holding an old photograph album open on a knee, the visible album page showing several period family photographs with white borders, warm late-afternoon window light from upper left illuminating the page, the person's shoulders just visible at the frame edges in silhouette, medium close-up composition with the album in tack-sharp focus and surroundings in warm domestic bokeh, contemplative nostalgic mood, Kodak Portra 400 simulation with subtle faded warmth and moderate grain`
- `projects.style_dna` (Variant B)

**Resolved `prompt`:**

```
medium close-up shot, subject fills center frame, shoulders and above, hands from behind holding an old photograph album open on a knee, the visible album page showing several period family photographs with white borders, warm late-afternoon window light from upper left illuminating the page, the person's shoulders just visible at the frame edges in silhouette, medium close-up composition with the album in tack-sharp focus and surroundings in warm domestic bokeh, contemplative nostalgic mood, Kodak Portra 400 simulation with subtle faded warmth and moderate grain intimate family documentary photography, warm domestic lighting, natural indoor window light, shallow depth of field on personal objects, photo-album aesthetic, Kodak Portra 400 simulation on modern subjects with subtle faded warmth, moderate film grain, nostalgic intimate mood, rule-of-thirds composition preserving domestic detail, photo-album quality, documentary photorealism
```

**`emotional_beat`:** `tension`

### Example 10 — Historical Crime / Unsolved Case — Data, late 1970s (Variant C)

**Inputs:**
- `scenes.composition_prefix`: `extreme_closeup`
- `scenes.image_prompt`: `a period newspaper clipping resting on a wooden desk, visible halftone dot printing characteristic of 1970s newsprint, yellowed paper with soft creases, illegible headline in period serif typography, a period fountain pen resting at the edge of the clipping, warm tungsten desk lamp from upper right casting long soft shadow, extreme close-up with the clipping in tack-sharp focus and surrounding desk in warm bokeh, slight top-down angle, mood of recovered archival evidence, 1970s photojournalism Kodak Portra 800 simulation with amber-orange color cast and moderate grain`
- `projects.style_dna` (Variant C)

**Resolved `prompt`:**

```
extreme close-up, tight crop on detail, shallow depth of field, a period newspaper clipping resting on a wooden desk, visible halftone dot printing characteristic of 1970s newsprint, yellowed paper with soft creases, illegible headline in period serif typography, a period fountain pen resting at the edge of the clipping, warm tungsten desk lamp from upper right casting long soft shadow, extreme close-up with the clipping in tack-sharp focus and surrounding desk in warm bokeh, slight top-down angle, mood of recovered archival evidence, 1970s photojournalism Kodak Portra 800 simulation with amber-orange color cast and moderate grain vintage archival photography, era-specific film simulation as specified in subject prompt, nostalgic faded color palette aligned to the indicated era, silver-halide film grain, period-appropriate natural lighting, archival quality with subtle age degradation, warm vignetting, rule-of-thirds composition, reverent biographical mood, photo-album aesthetic, documentary photorealism
```

**`emotional_beat`:** `data`

### Example 11 — Business Biography — Resolution, 1990s (Variant C)

**Inputs:**
- `scenes.composition_prefix`: `wide_establishing`
- `scenes.image_prompt`: `a wide view of a 1990s corporate headquarters lobby at golden hour, warm low sun streaming through tall windows creating long golden beams across marble flooring, period 1990s furniture and accents, a single figure in period business wardrobe walking across the lobby in silhouette, atmospheric soft haze, horizontal composition with ceiling in upper third and lobby extending to the far vanishing point, nostalgic biographical mood of legacy moment, late-1990s color negative film aesthetic with slightly faded saturation and familiar nostalgic warmth`
- `projects.style_dna` (Variant C)

**Resolved `prompt`:**

```
wide angle establishing shot, full scene visible, environmental context, a wide view of a 1990s corporate headquarters lobby at golden hour, warm low sun streaming through tall windows creating long golden beams across marble flooring, period 1990s furniture and accents, a single figure in period business wardrobe walking across the lobby in silhouette, atmospheric soft haze, horizontal composition with ceiling in upper third and lobby extending to the far vanishing point, nostalgic biographical mood of legacy moment, late-1990s color negative film aesthetic with slightly faded saturation and familiar nostalgic warmth vintage archival photography, era-specific film simulation as specified in subject prompt, nostalgic faded color palette aligned to the indicated era, silver-halide film grain, period-appropriate natural lighting, archival quality with subtle age degradation, warm vignetting, rule-of-thirds composition, reverent biographical mood, photo-album aesthetic, documentary photorealism
```

**`emotional_beat`:** `resolution`

### Example 12 — Chapter Title Card Background — Any Niche (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `symmetrical`
- `scenes.image_prompt`: `a richly aged cream paper background with visible period paper texture, subtle staining at the corners, a thin decorative ornamental fleuron pattern running horizontally across the lower third rendered as a graphic element, soft warm directional light from upper left creating gentle shadow on the paper texture, perfectly centered composition with generous negative space in the upper two-thirds intended for chapter typography overlay, nostalgic photo-album aesthetic, mood of archival deliberation, vintage Kodachrome aesthetic with high-silver-content grain`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
perfectly symmetrical composition, centered subject, architectural framing, a richly aged cream paper background with visible period paper texture, subtle staining at the corners, a thin decorative ornamental fleuron pattern running horizontally across the lower third rendered as a graphic element, soft warm directional light from upper left creating gentle shadow on the paper texture, perfectly centered composition with generous negative space in the upper two-thirds intended for chapter typography overlay, nostalgic photo-album aesthetic, mood of archival deliberation, vintage Kodachrome aesthetic with high-silver-content grain vintage archival photography, era-appropriate film simulation, warm faded color palette with nostalgic amber and rust tones, heavy 16mm or 8mm silver-halide film grain, soft period lens characteristics, natural period-appropriate lighting, archival quality with subtle age degradation, warm vignetting, rule-of-thirds composition, nostalgic reverent mood, photo-album aesthetic, documentary photorealism
```

**`emotional_beat`:** `transition`

---

## 8. QA Checklist — Register 05 Image Generation

- [ ] `projects.style_dna` contains one of Variant A, B, or C — OR `prompt_templates` has the register-keyed row in place
- [ ] `prompt_templates` has `negative_additions_register_05` row installed
- [ ] `prompt_templates` has `metadata_prompt_register_05` row installed
- [ ] `WF_SCRIPT_GENERATE.json` → `Prepare Metadata Prompt` node configured for register lookup
- [ ] `WF_IMAGE_GENERATION.json` → `Fire All Scenes` node configured for register-specific negative append
- [ ] Sample 3 resolved prompts before full run — verify era film-simulation anchor + period-accurate details + anachronism exclusion present
- [ ] Sample negative_prompt field — verify Universal Negative + Register 05 additions
- [ ] `image_size` is `landscape_16_9` (or `portrait_9_16` for shorts)
- [ ] Endpoint resolves to `https://queue.fal.run/fal-ai/bytedance/seedream/v4.5/text-to-image`
- [ ] Visual spot-check first 5 returned images: warm faded palette, period-accurate wardrobe/technology/vehicles, heavy grain visible, warm vignetting present
- [ ] No modern/contemporary technology visible in period scenes (smartphones, flat screens, modern cars)
- [ ] No clinical tech aesthetic bleeding through
- [ ] No noir-harsh shadows bleeding through
- [ ] No neon/chrome/futuristic elements bleeding through
- [ ] No generated identifiable-face portraits of named historical figures (proxies only)
- [ ] composition_prefix distribution weighted toward wide_establishing + medium_closeup + extreme_closeup + symmetrical
- [ ] Era sub-anchor (Kodachrome / Portra 800 / Velvia / color negative / Portra 400 contemporary) specified per scene for multi-era productions

---

## 9. Handling Real Historical Figures (Register-Specific)

This Register frequently depicts real historical figures (founders, executives, legendary investors, historical figures in crime cases). Important image-generation constraints:

- **Seedream 4.5 should NEVER be prompted with specific real names.** Use descriptive proxies in `scenes.image_prompt`: "a middle-aged banker in a 1950s gray flannel suit" rather than "Frank McNamara." The Claude metadata prompt in Section 5 already enforces this; verify it carries through.
- **Accept that generated faces will not perfectly match historical figures.** Consider licensed archival photography (public domain, or licensed from Getty/AP Archive) for the highest-profile figures — reserve Seedream for secondary characters and scene-setting.
- **Always include disclaimer language in video descriptions**: "Historical imagery reconstructed with AI for illustrative purposes."
- **For the highest-profile figures**, pursue licensed archival photography for at least 3-5 hero portraits and intersperse AI-generated supporting imagery.
- **For family drama featuring real private individuals**, the same rule applies with heightened care — do not generate realistic likenesses of identifiable living private individuals. Use shadow, silhouette, hands, from-behind exclusively.

This is a Register 05-specific production constraint not present in Registers 01-04.

---

## 10. Source Files

- `workflows/WF_IMAGE_GENERATION.json` — Fire All Scenes node (register-aware Style DNA and negative prompt assembly)
- `workflows/WF_SCENE_IMAGE_PROCESSOR.json` — Fal.ai HTTP call (unchanged from base pipeline)
- `workflows/WF_SCRIPT_GENERATE.json` — Prepare Metadata Prompt node (now looks up `metadata_prompt_register_05`)
- `VisionGridAI_Platform_Agent.md` — Style DNA base templates (unchanged), Composition Library (unchanged), Universal Negative (unchanged)
- `directives/04-image-generation.md` — SOP reference
- `IMAGE_GENERATION_PROMPTS.md` — base pipeline reference
- `vision_gridai_registers/REGISTER_05_ARCHIVE.md` — cinematic grammar playbook for this register
