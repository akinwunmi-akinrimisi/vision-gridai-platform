# REGISTER 01 — THE ECONOMIST — Image Prompts

Documentary-grade explainer. Register-tuned image-generation assets for the Economist Register. Extends the base pipeline in `IMAGE_GENERATION_PROMPTS.md`. All references to `WF_IMAGE_GENERATION.json`, `WF_SCENE_IMAGE_PROCESSOR.json`, `WF_SCRIPT_GENERATE.json`, `Fire All Scenes`, `Prepare Metadata Prompt`, `prompt_templates`, `projects.style_dna`, `scenes.composition_prefix`, `scenes.image_prompt`, `image_size: landscape_16_9`, and the Universal Negative Prompt remain EXACTLY as defined in the base pipeline.

---

## 1. When This Register Is Active

Primary Register for analytical long-form across:

- Personal Finance & Investing (default)
- Credit Cards — economics, math, interest mechanics
- Legal, Tax & Insurance — explainers, mechanics, policy breakdowns
- Business & B2B SaaS — market analysis, business-model deep dives
- Real Estate & Mortgage — market analysis, mortgage mechanics

Scene classifier should set `scenes.production_register = 'REGISTER_01_ECONOMIST'` when content is analytical, numeric, comparison-heavy, or definition-heavy.

---

## 2. Register-Specific Style DNA Variants

Three variants. Pick ONE at project creation time (Path A) or store all three in `prompt_templates` (Path B) keyed by niche.

### Variant A — Economist Primary (default for finance/policy/B2B)

For `projects.style_dna` or `prompt_templates.template_key = 'style_dna_register_01_primary'`:

```
editorial documentary photography, natural cinematic lighting with single-source directional key, shallow depth of field, muted controlled-warmth color palette, subtle 35mm film grain, rule-of-thirds composition with negative space preserved for overlay typography, professional color grading, 4K sharpness, documentary photorealism, cinematic still frame aesthetic, no stylization
```

### Variant B — Economist Real Estate (for Real Estate & Mortgage niche)

For `prompt_templates.template_key = 'style_dna_register_01_real_estate'`:

```
editorial architectural photography, natural daylight with golden-hour bias, medium depth of field preserving architectural detail, warm-muted color palette with earth tones, subtle 35mm grain, rule-of-thirds composition favoring horizontal sky/ground division, professional real-estate editorial grading, 4K sharpness, documentary photorealism, architectural still frame
```

### Variant C — Economist Legal/Tax (for Legal/Tax/Insurance niche)

For `prompt_templates.template_key = 'style_dna_register_01_legal_tax'`:

```
editorial documentary photography, cool-neutral institutional lighting, medium depth of field, muted desaturated color palette with slight blue-gray bias, subtle 35mm grain, formal rule-of-thirds composition, professional editorial grading with institutional feel, 4K sharpness, documentary photorealism, measured cinematic still frame
```

---

## 3. Register-Specific Negative Prompt Additions

For `prompt_templates.template_key = 'negative_additions_register_01'`:

```
oversaturated colors, cartoonish style, anime, garish neon, grunge aesthetic, heavy motion blur, dramatic lens flares, aggressive chromatic aberration, VHS artifacts, glitch effects, surveillance camera quality, dark noir aesthetic, warm golden luxurious aesthetic, futuristic tech aesthetic
```

**Resulting `negative_prompt` field sent to Fal.ai** (Universal Negative verbatim + Register 01 additions):

```
text, watermark, signature, logo, UI elements, blurry, low quality, distorted faces, extra fingers, mutated hands, bad anatomy, deformed, disfigured, out of frame, cropped, duplicate, error, jpeg artifacts, low resolution, cartoon, anime, painting, illustration, 3D render, CGI, oversaturated colors, cartoonish style, anime, garish neon, grunge aesthetic, heavy motion blur, dramatic lens flares, aggressive chromatic aberration, VHS artifacts, glitch effects, surveillance camera quality, dark noir aesthetic, warm golden luxurious aesthetic, futuristic tech aesthetic
```

Note: `anime` appears twice — once in Universal, once in Register 01 additions. Dedupe at assembly time if desired; Fal.ai tolerates duplicates.

---

## 4. composition_prefix Preferences

From the 8-value enum in `prompt_templates`. In priority order for this register:

| Priority | composition_prefix | Use In This Register For |
|---|---|---|
| 1 | `wide_establishing` | Opening hooks, market overviews, geographic establishing |
| 2 | `extreme_closeup` | Data-image B-roll (charts, documents, product details) |
| 3 | `symmetrical` | Chart reveals, formal explanatory composition |
| 4 | `medium_closeup` | Human-element scenes (hands, silhouettes from behind) |
| 5 | `leading_lines` | Corridor, architectural transitions between concepts |
| 6 | `high_angle` | Overhead desk shots, document reveals |
| 7 | `low_angle` | Sparingly — for institutional/corporate establishing |
| 8 | `over_shoulder` | Rarely — this register avoids intimate perspective |

Scene classifier guidance: default to `wide_establishing` for hook beats, `extreme_closeup` for data beats, `symmetrical` for revelation beats.

---

## 5. Register-Specific Metadata Prompt

Full body to store in `prompt_templates.template_key = 'metadata_prompt_register_01'`. Used by `WF_SCRIPT_GENERATE.json` → `Prepare Metadata Prompt` node. Returns the same JSON schema as the generic prompt (`scene_number`, `image_prompt`, `emotional_beat`, `chapter`).

```
Below are {N} text chunks from a documentary script about "{SEO_TITLE}".

This video is produced in REGISTER 01 — THE ECONOMIST. The visual language is documentary explainer: Johnny Harris, Wendover Productions, Polymatter. Authoritative, calm, data-rich. Camera moves are slow and deliberate. Color is muted with controlled warmth. Information density is high.

For EACH chunk, generate ONLY:

1. image_prompt: 40-80 words, cinematic. Structure: [SUBJECT] + [ENVIRONMENT] + [LIGHTING] + [COMPOSITION] + [MOOD] + [DETAILS]. Be hyper-specific.

Register 01 rules for image_prompt:
- People as silhouettes, hands, figures from behind, or shoulders-and-below — never full identifiable faces
- Lighting: single-source directional key, natural cinematic, soft editorial — never flat, never high-contrast noir, never warm-luxurious golden, never futuristic neon
- Color: muted palette with controlled warmth; amber accents allowed; avoid saturation
- Composition: preserve negative space (upper-right or upper-third most common) for drawtext overlay placement
- Mood: contemplative, analytical, measured — never urgent, never emotional-climactic
- For data-image scenes (chart, graph, document, ledger), specify "documentary magazine infographic style" and "no readable specific numbers" (real values added later via drawtext)
- Include lighting direction explicitly (e.g., "warm tungsten from upper left," "soft morning window light from the left")
- No text, words, signs, logos, or brand names in the image

2. emotional_beat: one of hook, tension, revelation, data, story, resolution, transition

Beat-to-scene mapping for Register 01:
- hook: wide_establishing + architectural or geographic subject
- tension: medium_closeup + human element (hands, silhouette) with directional light
- revelation: symmetrical + central data-image or product
- data: extreme_closeup or symmetrical + chart/graph/ledger composition
- story: medium_closeup + human-scale environment with personal object
- resolution: wide_establishing or symmetrical + wider view, pulling back
- transition: leading_lines + corridor, road, or architectural pathway

3. chapter: a short chapter name grouping related scenes (2-5 words max)

Return ONLY a JSON array: [{"scene_number": 1, "image_prompt": "...", "emotional_beat": "...", "chapter": "..."}]

Do NOT return or modify any narration text. I only need image_prompt, emotional_beat, and chapter for each chunk number.

{CHUNK_LIST}
```

---

## 6. Per-`emotional_beat` scene_subject Patterns

Patterns for Claude (via the metadata prompt above) and for manual prompt authoring. Each pattern shows the skeleton of the `image_prompt` field.

### hook

```
[WIDE ARCHITECTURAL/GEOGRAPHIC SUBJECT at [TIME OF DAY]], [NATURAL DIRECTIONAL LIGHT from upper [left/right]], wide frame preserving [SKY/UPPER-THIRD] negative space, contemplative analytical mood, subtle atmospheric haze, documentary photorealism
```

### tension

```
[SILHOUETTE or HANDS at [OBJECT/DESK/WINDOW]], soft directional light from [DIRECTION] casting long measured shadows, medium frame preserving upper-right negative space, mood of careful consideration, shallow depth of field on [NEAREST ELEMENT]
```

### revelation

```
[CENTRAL PRODUCT/DOCUMENT/CHART] isolated on [NEUTRAL SURFACE], single directional key light from upper [DIRECTION] creating clean soft shadow, perfectly symmetrical centered composition, generous negative space above and below, documentary magazine infographic style, measured contemplative mood
```

### data

```
[CHART or GRAPH or LEDGER COMPOSITION] with [N] elements (bars, lines, rows) in warm amber or muted blue-gray against matte charcoal or cream background, thin gridlines, illegible axis labels suggesting [TIME PERIOD/CATEGORIES], documentary magazine infographic style, generous breathing room around the chart, editorial composition, no readable specific numbers on the elements
```

### story

```
[HANDS or SILHOUETTE engaging with PERSONAL OBJECT — envelope, ledger, document, key, cup], warm-muted interior light from [DIRECTION], medium close-up preserving surroundings in soft background, shallow depth of field, mood of personal narrative moment, subtle 35mm grain
```

### resolution

```
[WIDE VIEW pulling back from earlier scene's subject, or WIDER GEOGRAPHIC/ARCHITECTURAL FRAME], soft natural light across [ENVIRONMENT], horizontal composition with clear sky/ground or figure/environment division, contemplative conclusive mood, atmospheric depth
```

### transition

```
[CORRIDOR, PATHWAY, STAIRCASE, or ARCHITECTURAL LEADING LINE converging toward [VANISHING POINT]], soft directional light from [DIRECTION] raking along the leading lines, leading-lines composition with subject at vanishing point, measured contemplative mood, subtle atmospheric depth
```

---

## 7. Worked Examples — 12 Scenes Across 4 Niches

Each example shows the three inputs that appear in `scenes` and `projects`, followed by the resolved prompt as it arrives in the Fal.ai payload's `prompt` field. All examples assume Variant A Style DNA unless noted.

### Example 01 — Personal Finance — Hook opener

**Inputs:**
- `scenes.composition_prefix`: `wide_establishing`
- `scenes.image_prompt`: `lower Manhattan financial district at blue hour, aerial helicopter perspective from mid altitude, soft atmospheric haze beginning to accumulate, building lights beginning to illuminate one by one, wide frame preserving upper-third sky negative space, contemplative analytical mood, subtle documentary photorealism, warm amber accents emerging among cool blue tones`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
wide angle establishing shot, full scene visible, environmental context, lower Manhattan financial district at blue hour, aerial helicopter perspective from mid altitude, soft atmospheric haze beginning to accumulate, building lights beginning to illuminate one by one, wide frame preserving upper-third sky negative space, contemplative analytical mood, subtle documentary photorealism, warm amber accents emerging among cool blue tones editorial documentary photography, natural cinematic lighting with single-source directional key, shallow depth of field, muted controlled-warmth color palette, subtle 35mm film grain, rule-of-thirds composition with negative space preserved for overlay typography, professional color grading, 4K sharpness, documentary photorealism, cinematic still frame aesthetic, no stylization
```

**`emotional_beat`:** `hook`

### Example 02 — Personal Finance — Data reveal

**Inputs:**
- `scenes.composition_prefix`: `symmetrical`
- `scenes.image_prompt`: `clean editorial bar chart with six vertical bars of increasing height rendered in warm amber, matte charcoal background with subtle vertical gradient, thin white horizontal gridlines, illegible monospace labels suggesting year categories along the x-axis, perfectly centered composition, generous negative space above and below the chart, documentary magazine infographic style, no readable specific numbers on the bars`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
perfectly symmetrical composition, centered subject, architectural framing, clean editorial bar chart with six vertical bars of increasing height rendered in warm amber, matte charcoal background with subtle vertical gradient, thin white horizontal gridlines, illegible monospace labels suggesting year categories along the x-axis, perfectly centered composition, generous negative space above and below the chart, documentary magazine infographic style, no readable specific numbers on the bars editorial documentary photography, natural cinematic lighting with single-source directional key, shallow depth of field, muted controlled-warmth color palette, subtle 35mm film grain, rule-of-thirds composition with negative space preserved for overlay typography, professional color grading, 4K sharpness, documentary photorealism, cinematic still frame aesthetic, no stylization
```

**`emotional_beat`:** `data`

### Example 03 — Credit Card Economics — Revelation

**Inputs:**
- `scenes.composition_prefix`: `extreme_closeup`
- `scenes.image_prompt`: `a single metal credit card resting on a polished walnut executive desk, single warm tungsten desk lamp from upper left creating long soft shadow across the grain, thin layer of ambient dust motes visible in the beam, extreme close-up with shallow depth of field rendering the card's lower edge in soft focus, contemplative measured mood, subtle micro-texture of the brushed metal visible`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
extreme close-up, tight crop on detail, shallow depth of field, a single metal credit card resting on a polished walnut executive desk, single warm tungsten desk lamp from upper left creating long soft shadow across the grain, thin layer of ambient dust motes visible in the beam, extreme close-up with shallow depth of field rendering the card's lower edge in soft focus, contemplative measured mood, subtle micro-texture of the brushed metal visible editorial documentary photography, natural cinematic lighting with single-source directional key, shallow depth of field, muted controlled-warmth color palette, subtle 35mm film grain, rule-of-thirds composition with negative space preserved for overlay typography, professional color grading, 4K sharpness, documentary photorealism, cinematic still frame aesthetic, no stylization
```

**`emotional_beat`:** `revelation`

### Example 04 — Credit Card Economics — Story beat

**Inputs:**
- `scenes.composition_prefix`: `medium_closeup`
- `scenes.image_prompt`: `silhouette of a single figure from behind at a kitchen table in early morning, warm directional light from a window upper right illuminating the tabletop, an open envelope and a handwritten ledger beside a ceramic cup of coffee, medium close-up preserving the room's dimness around the illuminated tabletop, shallow depth of field with the envelope in sharp focus, mood of private financial reckoning`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
medium close-up shot, subject fills center frame, shoulders and above, silhouette of a single figure from behind at a kitchen table in early morning, warm directional light from a window upper right illuminating the tabletop, an open envelope and a handwritten ledger beside a ceramic cup of coffee, medium close-up preserving the room's dimness around the illuminated tabletop, shallow depth of field with the envelope in sharp focus, mood of private financial reckoning editorial documentary photography, natural cinematic lighting with single-source directional key, shallow depth of field, muted controlled-warmth color palette, subtle 35mm film grain, rule-of-thirds composition with negative space preserved for overlay typography, professional color grading, 4K sharpness, documentary photorealism, cinematic still frame aesthetic, no stylization
```

**`emotional_beat`:** `story`

### Example 05 — Legal / Tax — Hook opener (Variant C Style DNA)

**Inputs:**
- `scenes.composition_prefix`: `low_angle`
- `scenes.image_prompt`: `low-angle view of a neoclassical federal courthouse facade at mid-morning, tall stone columns rising prominently, pale overcast institutional light flattening shadows slightly, the building occupying the right two-thirds of frame with sky in the upper left third, measured institutional mood, subtle atmospheric depth`
- `projects.style_dna` (Variant C — Legal/Tax)

**Resolved `prompt`:**

```
low angle shot looking up, subject towering above, dramatic perspective, low-angle view of a neoclassical federal courthouse facade at mid-morning, tall stone columns rising prominently, pale overcast institutional light flattening shadows slightly, the building occupying the right two-thirds of frame with sky in the upper left third, measured institutional mood, subtle atmospheric depth editorial documentary photography, cool-neutral institutional lighting, medium depth of field, muted desaturated color palette with slight blue-gray bias, subtle 35mm grain, formal rule-of-thirds composition, professional editorial grading with institutional feel, 4K sharpness, documentary photorealism, measured cinematic still frame
```

**`emotional_beat`:** `hook`

### Example 06 — Legal / Tax — Data scene (Variant C)

**Inputs:**
- `scenes.composition_prefix`: `high_angle`
- `scenes.image_prompt`: `overhead top-down view of a tax return form filled out in ink on a desk, a fountain pen resting diagonally across the page, a mug and spectacles in the upper left corner of frame, pale cool window light from the upper left, document occupying center of frame, illegible form-field contents, measured institutional mood`
- `projects.style_dna` (Variant C)

**Resolved `prompt`:**

```
high angle shot looking down, bird's eye perspective, subject below, overhead top-down view of a tax return form filled out in ink on a desk, a fountain pen resting diagonally across the page, a mug and spectacles in the upper left corner of frame, pale cool window light from the upper left, document occupying center of frame, illegible form-field contents, measured institutional mood editorial documentary photography, cool-neutral institutional lighting, medium depth of field, muted desaturated color palette with slight blue-gray bias, subtle 35mm grain, formal rule-of-thirds composition, professional editorial grading with institutional feel, 4K sharpness, documentary photorealism, measured cinematic still frame
```

**`emotional_beat`:** `data`

### Example 07 — B2B SaaS — Tension beat

**Inputs:**
- `scenes.composition_prefix`: `medium_closeup`
- `scenes.image_prompt`: `hands at a laptop keyboard in a modern office workspace, the screen tilted away so content is not visible but a soft blue-white glow reflects on the hands, soft morning window light from the left creating gentle shadow on the desk surface, medium close-up with the hands and keyboard in sharp focus and the background workspace in soft bokeh, mood of measured product-market reckoning`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
medium close-up shot, subject fills center frame, shoulders and above, hands at a laptop keyboard in a modern office workspace, the screen tilted away so content is not visible but a soft blue-white glow reflects on the hands, soft morning window light from the left creating gentle shadow on the desk surface, medium close-up with the hands and keyboard in sharp focus and the background workspace in soft bokeh, mood of measured product-market reckoning editorial documentary photography, natural cinematic lighting with single-source directional key, shallow depth of field, muted controlled-warmth color palette, subtle 35mm film grain, rule-of-thirds composition with negative space preserved for overlay typography, professional color grading, 4K sharpness, documentary photorealism, cinematic still frame aesthetic, no stylization
```

**`emotional_beat`:** `tension`

### Example 08 — B2B SaaS — Transition

**Inputs:**
- `scenes.composition_prefix`: `leading_lines`
- `scenes.image_prompt`: `a long glass-walled office corridor receding toward a bright vanishing point, warm ceiling lights creating rhythmic highlights along the ceiling line, the corridor walls converging symmetrically toward the distance, a single figure in silhouette near the vanishing point walking away, contemplative transitional mood, shallow depth of field softening the nearest wall elements`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
composition using strong leading lines converging to subject, a long glass-walled office corridor receding toward a bright vanishing point, warm ceiling lights creating rhythmic highlights along the ceiling line, the corridor walls converging symmetrically toward the distance, a single figure in silhouette near the vanishing point walking away, contemplative transitional mood, shallow depth of field softening the nearest wall elements editorial documentary photography, natural cinematic lighting with single-source directional key, shallow depth of field, muted controlled-warmth color palette, subtle 35mm film grain, rule-of-thirds composition with negative space preserved for overlay typography, professional color grading, 4K sharpness, documentary photorealism, cinematic still frame aesthetic, no stylization
```

**`emotional_beat`:** `transition`

### Example 09 — Real Estate — Hook (Variant B Style DNA)

**Inputs:**
- `scenes.composition_prefix`: `wide_establishing`
- `scenes.image_prompt`: `muted aerial view of an American suburban neighborhood at late golden hour, warm soft sun raking diagonally across rooftops and treetops, a subtle atmospheric haze in the distance softening the horizon, helicopter-altitude perspective, approximately forty percent sky in upper third holding negative space for overlay typography, contemplative analytical mood`
- `projects.style_dna` (Variant B — Real Estate)

**Resolved `prompt`:**

```
wide angle establishing shot, full scene visible, environmental context, muted aerial view of an American suburban neighborhood at late golden hour, warm soft sun raking diagonally across rooftops and treetops, a subtle atmospheric haze in the distance softening the horizon, helicopter-altitude perspective, approximately forty percent sky in upper third holding negative space for overlay typography, contemplative analytical mood editorial architectural photography, natural daylight with golden-hour bias, medium depth of field preserving architectural detail, warm-muted color palette with earth tones, subtle 35mm grain, rule-of-thirds composition favoring horizontal sky/ground division, professional real-estate editorial grading, 4K sharpness, documentary photorealism, architectural still frame
```

**`emotional_beat`:** `hook`

### Example 10 — Real Estate — Story beat (Variant B)

**Inputs:**
- `scenes.composition_prefix`: `extreme_closeup`
- `scenes.image_prompt`: `a single brass door key resting on a weathered wooden doorstep, a corner of a welcome mat visible at the frame edge, warm afternoon directional light from upper left creating long soft shadow from the key, extreme close-up with shallow depth of field, the key in tack-sharp focus with the doorstep wood grain softly visible, mood of personal milestone`
- `projects.style_dna` (Variant B)

**Resolved `prompt`:**

```
extreme close-up, tight crop on detail, shallow depth of field, a single brass door key resting on a weathered wooden doorstep, a corner of a welcome mat visible at the frame edge, warm afternoon directional light from upper left creating long soft shadow from the key, extreme close-up with shallow depth of field, the key in tack-sharp focus with the doorstep wood grain softly visible, mood of personal milestone editorial architectural photography, natural daylight with golden-hour bias, medium depth of field preserving architectural detail, warm-muted color palette with earth tones, subtle 35mm grain, rule-of-thirds composition favoring horizontal sky/ground division, professional real-estate editorial grading, 4K sharpness, documentary photorealism, architectural still frame
```

**`emotional_beat`:** `story`

### Example 11 — Real Estate — Data (Variant B)

**Inputs:**
- `scenes.composition_prefix`: `symmetrical`
- `scenes.image_prompt`: `a clean editorial line chart showing a single amber line traversing across a matte cream background, thin horizontal gridlines spaced evenly, illegible month labels running along the x-axis, perfectly centered composition with generous negative space, documentary magazine infographic style, no readable specific numbers on the axis, a faint watermark of a city skyline silhouette in the extreme background at ten percent opacity`
- `projects.style_dna` (Variant B)

**Resolved `prompt`:**

```
perfectly symmetrical composition, centered subject, architectural framing, a clean editorial line chart showing a single amber line traversing across a matte cream background, thin horizontal gridlines spaced evenly, illegible month labels running along the x-axis, perfectly centered composition with generous negative space, documentary magazine infographic style, no readable specific numbers on the axis, a faint watermark of a city skyline silhouette in the extreme background at ten percent opacity editorial architectural photography, natural daylight with golden-hour bias, medium depth of field preserving architectural detail, warm-muted color palette with earth tones, subtle 35mm grain, rule-of-thirds composition favoring horizontal sky/ground division, professional real-estate editorial grading, 4K sharpness, documentary photorealism, architectural still frame
```

**`emotional_beat`:** `data`

### Example 12 — Credit Card Economics — Resolution (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `wide_establishing`
- `scenes.image_prompt`: `the same Manhattan financial district skyline from the video's opening, now at deeper blue hour with nearly all building lights fully illuminated, atmospheric haze settled, helicopter perspective slightly pulled back further than the opener, the warm amber accents from windows dominating against the deep blue sky, horizontal composition with sky in upper third, contemplative conclusive mood`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
wide angle establishing shot, full scene visible, environmental context, the same Manhattan financial district skyline from the video's opening, now at deeper blue hour with nearly all building lights fully illuminated, atmospheric haze settled, helicopter perspective slightly pulled back further than the opener, the warm amber accents from windows dominating against the deep blue sky, horizontal composition with sky in upper third, contemplative conclusive mood editorial documentary photography, natural cinematic lighting with single-source directional key, shallow depth of field, muted controlled-warmth color palette, subtle 35mm film grain, rule-of-thirds composition with negative space preserved for overlay typography, professional color grading, 4K sharpness, documentary photorealism, cinematic still frame aesthetic, no stylization
```

**`emotional_beat`:** `resolution`

---

## 8. QA Checklist — Register 01 Image Generation

Before launching `Fire All Scenes` for a Register 01 video:

- [ ] `projects.style_dna` contains one of Variant A, B, or C — OR `prompt_templates` has the register-keyed row in place
- [ ] `prompt_templates` has `negative_additions_register_01` row installed
- [ ] `prompt_templates` has `metadata_prompt_register_01` row installed
- [ ] `WF_SCRIPT_GENERATE.json` → `Prepare Metadata Prompt` node configured to look up register-specific prompt
- [ ] `WF_IMAGE_GENERATION.json` → `Fire All Scenes` node configured to append register-specific negative
- [ ] Sample 3 resolved prompts before full run — verify all 3 parts ({composition_prefix} + {scene_subject} + {style_dna}) concatenated correctly
- [ ] Sample negative_prompt field — verify Universal Negative present verbatim followed by Register 01 additions
- [ ] `image_size` is `landscape_16_9` for long-form (or `portrait_9_16` for shorts)
- [ ] Endpoint resolves to `https://queue.fal.run/fal-ai/bytedance/seedream/v4.5/text-to-image`
- [ ] Visual spot-check first 5 returned images: muted color, no saturation spikes, soft single-source lighting, negative space preserved for overlay
- [ ] No warm-luxurious golden aesthetic bleeding through (check negative additions are applied)
- [ ] No futuristic/tech aesthetic bleeding through
- [ ] No noir / heavy-shadow aesthetic bleeding through
- [ ] composition_prefix distribution across the scene list matches Section 4 priority (weighted toward wide_establishing, extreme_closeup, symmetrical)

---

## 9. Source Files

- `workflows/WF_IMAGE_GENERATION.json` — Fire All Scenes node (register-aware Style DNA and negative prompt assembly)
- `workflows/WF_SCENE_IMAGE_PROCESSOR.json` — Fal.ai HTTP call (unchanged from base pipeline)
- `workflows/WF_SCRIPT_GENERATE.json` — Prepare Metadata Prompt node (now looks up `metadata_prompt_register_01`)
- `VisionGridAI_Platform_Agent.md` — Style DNA base templates (unchanged), Composition Library (unchanged), Universal Negative (unchanged)
- `directives/04-image-generation.md` — SOP reference
- `IMAGE_GENERATION_PROMPTS.md` — base pipeline reference
- `vision_gridai_registers/REGISTER_01_THE_ECONOMIST.md` — cinematic grammar playbook for this register
