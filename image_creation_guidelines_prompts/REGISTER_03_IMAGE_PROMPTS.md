# REGISTER 03 — INVESTIGATIVE NOIR — Image Prompts

True-crime investigation. Register-tuned image-generation assets for the Investigative Noir Register. Extends the base pipeline in `IMAGE_GENERATION_PROMPTS.md`. All references to `WF_IMAGE_GENERATION.json`, `WF_SCENE_IMAGE_PROCESSOR.json`, `WF_SCRIPT_GENERATE.json`, `Fire All Scenes`, `Prepare Metadata Prompt`, `prompt_templates`, `projects.style_dna`, `scenes.composition_prefix`, `scenes.image_prompt`, `image_size: landscape_16_9`, and the Universal Negative Prompt remain EXACTLY as defined in the base pipeline.

---

## 1. When This Register Is Active

Primary Register for investigative content across:

- Crime — cold cases, heist, kidnapping, homicide, cons
- Revenge stories in contemporary tense ("she waited three years...")
- Financial fraud exposés, predatory lending, Ponzi schemes, investment fraud
- Legal scandal, regulatory action, corporate wrongdoing
- Tax evasion, money laundering, financial crime
- Company collapse narratives (SVB, FTX, Theranos-style)
- Dark family drama — inheritance disputes, betrayal, buried secrets (as secondary support for Register 05)

Scene classifier should set `scenes.production_register = 'REGISTER_03_NOIR'` when content contains investigative language (scheme, fraud, predatory, exposed, hidden, scam), legal/regulatory terms, whistleblower/victim testimony, or contemporary-tense crime narrative.

---

## 2. Register-Specific Style DNA Variants

Three variants. Pick ONE at project creation time or store all three in `prompt_templates` keyed by niche.

### Variant A — Noir Primary (default for crime, fraud, contemporary revenge)

For `projects.style_dna` or `prompt_templates.template_key = 'style_dna_register_03_primary'`:

```
dark investigative documentary photography, heavy chiaroscuro lighting with deep black shadows, single harsh directional light source creating strong hard-edged shadow patterns, desaturated color palette with muted browns and cold blues, bleach bypass aesthetic, pronounced 16mm film grain, subtle vignetting, noir sensibility, surveillance-photograph and leaked-document quality, low-key lighting, high detail but intentionally degraded, cinematic still frame aesthetic
```

### Variant B — Noir Financial Fraud (for CardMath fraud, investment fraud, corporate collapse)

For `prompt_templates.template_key = 'style_dna_register_03_financial_fraud'`:

```
dark investigative documentary photography, institutional chiaroscuro lighting with deep shadows, single harsh directional source creating long shadow patterns, desaturated muted-institutional color palette with cold blue-gray bias, bleach bypass aesthetic, pronounced 16mm film grain, vignetting, forensic document sensibility, leaked-memo and confidential-file quality, low-key institutional lighting, high detail but intentionally degraded, investigative cinematic still frame
```

### Variant C — Noir Dark Family (for dark family drama, inheritance disputes, buried-secret narratives)

For `prompt_templates.template_key = 'style_dna_register_03_dark_family'`:

```
dark investigative documentary photography, domestic chiaroscuro lighting with deep warm-brown shadows, single harsh directional source (lamp, window, fluorescent) creating long shadow patterns, desaturated color palette with muted warm-browns and cold blues, bleach bypass aesthetic, pronounced 16mm film grain, vignetting, domestic-forensic sensibility, intimate-investigative quality, low-key lighting, high detail but intentionally degraded, investigative cinematic still frame
```

---

## 3. Register-Specific Negative Prompt Additions

For `prompt_templates.template_key = 'negative_additions_register_03'`:

```
warm golden light, luxurious aesthetic, bright cheerful mood, vibrant saturated colors, modern sleek tech aesthetic, clinical clean studio lighting, decorative bokeh background, lens flares as hero element, joyful expressions, celebratory atmosphere, aspirational lifestyle imagery, Kodak Portra 400 warmth, warm tungsten cozy interior, editorial magazine glossy
```

**Resulting `negative_prompt` field sent to Fal.ai** (Universal Negative verbatim + Register 03 additions):

```
text, watermark, signature, logo, UI elements, blurry, low quality, distorted faces, extra fingers, mutated hands, bad anatomy, deformed, disfigured, out of frame, cropped, duplicate, error, jpeg artifacts, low resolution, cartoon, anime, painting, illustration, 3D render, CGI, warm golden light, luxurious aesthetic, bright cheerful mood, vibrant saturated colors, modern sleek tech aesthetic, clinical clean studio lighting, decorative bokeh background, lens flares as hero element, joyful expressions, celebratory atmosphere, aspirational lifestyle imagery, Kodak Portra 400 warmth, warm tungsten cozy interior, editorial magazine glossy
```

---

## 4. composition_prefix Preferences

| Priority | composition_prefix | Use In This Register For |
|---|---|---|
| 1 | `extreme_closeup` | Evidence details, documents, physical objects, hands holding artifacts |
| 2 | `high_angle` | Surveillance-style overheads, document layouts on desks, forensic top-downs |
| 3 | `low_angle` | Looming institutional buildings, threatening figures |
| 4 | `leading_lines` | Corridor, alley, cubicle row, prison-visitation perspective |
| 5 | `wide_establishing` | Abandoned scenes, crime locations, institutional exteriors |
| 6 | `medium_closeup` | Hands on objects, silhouettes from behind in dim light |
| 7 | `over_shoulder` | Surveillance POV, over-the-shoulder reading evidence |
| 8 | `symmetrical` | Rarely — only for formal institutional photographs |

Scene classifier guidance: default to `extreme_closeup` for evidence/data beats, `high_angle` for document scenes, `leading_lines` for transitions, `wide_establishing` for location hooks.

---

## 5. Register-Specific Metadata Prompt

Full body to store in `prompt_templates.template_key = 'metadata_prompt_register_03'`.

```
Below are {N} text chunks from a documentary script about "{SEO_TITLE}".

This video is produced in REGISTER 03 — INVESTIGATIVE NOIR. The visual language is true-crime investigation: LEMMiNO, Netflix Dirty Money, MrBallen, Chernobyl (HBO), Gone Girl, Zodiac. Tension, gravity, investigation. Every image looks like it was recovered, not created. Shadows do the work. Tension comes from stillness.

For EACH chunk, generate ONLY:

1. image_prompt: 40-80 words, cinematic. Structure: [SUBJECT] + [ENVIRONMENT] + [LIGHTING] + [COMPOSITION] + [MOOD] + [DETAILS]. Be hyper-specific.

Register 03 rules for image_prompt:
- People as silhouettes, hands, figures from behind, or partial — never full identifiable faces, never eye contact
- Subjects: evidence objects (documents, letters, photographs, ice picks, knives, phones, keys, weapons), abandoned scenes (empty chairs, overturned furniture, unmade beds, abandoned offices), institutional environments (call centers, courtrooms, government offices, prisons, interrogation rooms), dim domestic interiors
- Lighting: single HARSH directional light source (bare bulb, fluorescent tube, streetlight, cold window light, flickering lamp) — always ONE source, always strong shadows, never soft diffuse, never warm cozy
- Color: DESATURATED, bleach bypass, cool blue or muted brown bias, dark olive, institutional gray — never warm golden, never luxurious amber, never saturated
- Composition: oblique angles (off-axis), low-angle or high-angle perspective, NEVER eye-level neutral, deep shadows filling at least 40 percent of frame
- Always include "bleach bypass aesthetic" or "surveillance-photograph quality" or "leaked-document aesthetic"
- Always include "single harsh [directional/overhead/source] light from [direction]"
- Always include "deep black shadows" or "deep shadows filling [portion] of frame"
- Mood: tension, dread, investigation, arrested violence, unease, forensic examination — never celebratory, never warm, never aspirational
- Include degradation descriptors: "slight motion blur on static frame," "subtle haze," "dust visible in light beam," "camera-footage feel"
- No text, words, signs, logos, brand names in image (drawtext overlays like evidence circles, case numbers, redactions are added post-generation via FFmpeg)

2. emotional_beat: one of hook, tension, revelation, data, story, resolution, transition

Beat-to-scene mapping for Register 03:
- hook: wide_establishing + abandoned scene or crime location, single harsh light source
- tension: extreme_closeup + single evidence object, creeping-in perspective
- revelation: high_angle + document/evidence spread on desk, overhead forensic
- data: extreme_closeup + single numerical artifact (bank statement, ledger entry, phone record, pill bottle)
- story: medium_closeup + hands with personal object, silhouette from behind
- resolution: wide_establishing + deserted aftermath, institutional exterior, resolved location
- transition: leading_lines + corridor, cubicle row, alley, institutional passage

3. chapter: a short chapter name grouping related scenes (2-5 words max, investigative flavor preferred — "Case File", "The Pattern", "The Trail Goes Cold")

Return ONLY a JSON array: [{"scene_number": 1, "image_prompt": "...", "emotional_beat": "...", "chapter": "..."}]

Do NOT return or modify any narration text. I only need image_prompt, emotional_beat, and chapter for each chunk number.

{CHUNK_LIST}
```

---

## 6. Per-`emotional_beat` scene_subject Patterns

### hook

```
[ABANDONED SCENE — empty kitchen / overturned chair / vacant office / shuttered storefront / crime scene location] at [night/late evening], single harsh [overhead fluorescent/bare bulb/streetlight/cold window light] from [direction] casting long hard shadows across [floor/desk/wall], slight haze in the air, [oblique low-angle/oblique high-angle] perspective, mood of arrested violence or forensic reconstruction, deep shadows filling at least half the frame
```

### tension

```
[SINGLE EVIDENCE OBJECT — weapon/document/letter/photograph/pill bottle/phone] isolated on [stained wooden surface / institutional linoleum / bare desk], single harsh directional light from upper [direction] creating long hard-edged shadow, extreme close-up with shallow depth of field rendering [nearest element] tack-sharp, dust motes visible in the light beam, mood of forensic examination, deep black surrounding shadows
```

### revelation

```
Overhead top-down view of [DOCUMENTS / PHOTOGRAPHS / EVIDENCE ITEMS] spread on a [stained wooden desk / bare institutional table / floor], single harsh directional light from [direction] creating long shadows from each item, top-down flat angle, the evidence occupying center of frame, mood of investigative discovery, deep dark surrounding negative space, desaturated bleach-bypass color
```

### data

```
[SINGLE DATA ARTIFACT — bank statement / phone record / ledger entry / pill bottle / envelope / id card] on a [desk / floor / bare surface], single harsh directional light from [direction] creating long hard shadow, extreme close-up, illegible specific numbers/content (real values added later via drawtext overlay), mood of forensic scrutiny, deep black surrounding shadows, subtle camera-footage degradation
```

### story

```
[HANDS / SILHOUETTE from behind] [holding/examining/reading] a [PERSONAL OBJECT — letter/photograph/key/wedding ring/diary] in a [dim domestic interior / dim workshop / dim office] at [late night/early morning], single harsh [lamp/window/fluorescent] light from [direction] casting long shadow, medium close-up with shallow depth of field rendering the object tack-sharp and the figure in deep shadow, intimate investigative mood
```

### resolution

```
[WIDE VIEW of deserted location — institutional exterior / aftermath scene / courthouse / cemetery / prison / empty apartment] at [dawn/dusk/night], pale cold light or fading natural light across the environment, wide composition showing the full scene emptied of human presence, horizontal composition, mood of conclusion or unanswered weight, atmospheric depth, deep blue or gray-brown shadow tones
```

### transition

```
[CORRIDOR / CUBICLE ROW / INSTITUTIONAL HALLWAY / ALLEY / STAIRWELL / PRISON VISITATION PASSAGE] receding toward a dim vanishing point, single harsh directional light from [direction] raking along the passage, strong leading-lines composition with oblique perspective, mood of investigative passage or dread, deep black negative space at the vanishing point, desaturated institutional color
```

---

## 7. Worked Examples — 12 Scenes Across 4 Niches

### Example 01 — Crime — Hook (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `wide_establishing`
- `scenes.image_prompt`: `an abandoned suburban kitchen at three in the morning, an overturned chair near a small dining table, a cordless phone off its cradle on the counter, single cold window light from the left creating long hard-edged shadows across the linoleum floor, slight haze in the air, oblique low-angle perspective looking across the floor, deep shadows filling the right two-thirds of frame, mood of arrested violence, surveillance-photograph quality`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
wide angle establishing shot, full scene visible, environmental context, an abandoned suburban kitchen at three in the morning, an overturned chair near a small dining table, a cordless phone off its cradle on the counter, single cold window light from the left creating long hard-edged shadows across the linoleum floor, slight haze in the air, oblique low-angle perspective looking across the floor, deep shadows filling the right two-thirds of frame, mood of arrested violence, surveillance-photograph quality dark investigative documentary photography, heavy chiaroscuro lighting with deep black shadows, single harsh directional light source creating strong hard-edged shadow patterns, desaturated color palette with muted browns and cold blues, bleach bypass aesthetic, pronounced 16mm film grain, subtle vignetting, noir sensibility, surveillance-photograph and leaked-document quality, low-key lighting, high detail but intentionally degraded, cinematic still frame aesthetic
```

**`emotional_beat`:** `hook`

### Example 02 — Crime — Tension (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `extreme_closeup`
- `scenes.image_prompt`: `a single ice pick resting on a stained wooden kitchen table, deep shadows surrounding the illuminated object, single harsh desk lamp from upper right creating long hard shadow across the table grain, dust motes visible in the beam, slight top-down oblique angle, the ice pick in tack-sharp focus with the far table edge in deep black, mood of arrested violence`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
extreme close-up, tight crop on detail, shallow depth of field, a single ice pick resting on a stained wooden kitchen table, deep shadows surrounding the illuminated object, single harsh desk lamp from upper right creating long hard shadow across the table grain, dust motes visible in the beam, slight top-down oblique angle, the ice pick in tack-sharp focus with the far table edge in deep black, mood of arrested violence dark investigative documentary photography, heavy chiaroscuro lighting with deep black shadows, single harsh directional light source creating strong hard-edged shadow patterns, desaturated color palette with muted browns and cold blues, bleach bypass aesthetic, pronounced 16mm film grain, subtle vignetting, noir sensibility, surveillance-photograph and leaked-document quality, low-key lighting, high detail but intentionally degraded, cinematic still frame aesthetic
```

**`emotional_beat`:** `tension`

### Example 03 — Financial Fraud — Revelation (Variant B)

**Inputs:**
- `scenes.composition_prefix`: `high_angle`
- `scenes.image_prompt`: `overhead top-down view of a stack of consumer complaint letters on a government office desk, manila folders with visible edge stains, a red pen resting across the top letter, single harsh desk lamp from upper right creating long hard shadows from the documents, top-down flat angle, the documents occupying center of frame, deep dark surrounding negative space, desaturated institutional color palette, mood of bureaucratic forensic discovery`
- `projects.style_dna` (Variant B — Financial Fraud)

**Resolved `prompt`:**

```
high angle shot looking down, bird's eye perspective, subject below, overhead top-down view of a stack of consumer complaint letters on a government office desk, manila folders with visible edge stains, a red pen resting across the top letter, single harsh desk lamp from upper right creating long hard shadows from the documents, top-down flat angle, the documents occupying center of frame, deep dark surrounding negative space, desaturated institutional color palette, mood of bureaucratic forensic discovery dark investigative documentary photography, institutional chiaroscuro lighting with deep shadows, single harsh directional source creating long shadow patterns, desaturated muted-institutional color palette with cold blue-gray bias, bleach bypass aesthetic, pronounced 16mm film grain, vignetting, forensic document sensibility, leaked-memo and confidential-file quality, low-key institutional lighting, high detail but intentionally degraded, investigative cinematic still frame
```

**`emotional_beat`:** `revelation`

### Example 04 — Financial Fraud — Data (Variant B)

**Inputs:**
- `scenes.composition_prefix`: `extreme_closeup`
- `scenes.image_prompt`: `a single bank statement page resting on a gray institutional desk, a fluorescent pink highlighter resting across the top of the page, single harsh overhead fluorescent light casting flat cold shadows, extreme close-up with the statement in tack-sharp focus and the surroundings in deep black bokeh, illegible specific numbers on the statement, mood of forensic scrutiny, subtle camera-footage degradation`
- `projects.style_dna` (Variant B)

**Resolved `prompt`:**

```
extreme close-up, tight crop on detail, shallow depth of field, a single bank statement page resting on a gray institutional desk, a fluorescent pink highlighter resting across the top of the page, single harsh overhead fluorescent light casting flat cold shadows, extreme close-up with the statement in tack-sharp focus and the surroundings in deep black bokeh, illegible specific numbers on the statement, mood of forensic scrutiny, subtle camera-footage degradation dark investigative documentary photography, institutional chiaroscuro lighting with deep shadows, single harsh directional source creating long shadow patterns, desaturated muted-institutional color palette with cold blue-gray bias, bleach bypass aesthetic, pronounced 16mm film grain, vignetting, forensic document sensibility, leaked-memo and confidential-file quality, low-key institutional lighting, high detail but intentionally degraded, investigative cinematic still frame
```

**`emotional_beat`:** `data`

### Example 05 — Revenge — Tension (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `medium_closeup`
- `scenes.image_prompt`: `a dim garage workshop at night, a corkboard covering the back wall with photographs and newspaper clippings connected by red thread, single desk lamp illuminating the board from below creating long upward shadows, the back of a figure in silhouette studying the board, oblique over-the-shoulder camera angle, medium close-up preserving the workshop's dimness around the illuminated board, deep black shadows filling the lower third of frame, mood of cold deliberation`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
medium close-up shot, subject fills center frame, shoulders and above, a dim garage workshop at night, a corkboard covering the back wall with photographs and newspaper clippings connected by red thread, single desk lamp illuminating the board from below creating long upward shadows, the back of a figure in silhouette studying the board, oblique over-the-shoulder camera angle, medium close-up preserving the workshop's dimness around the illuminated board, deep black shadows filling the lower third of frame, mood of cold deliberation dark investigative documentary photography, heavy chiaroscuro lighting with deep black shadows, single harsh directional light source creating strong hard-edged shadow patterns, desaturated color palette with muted browns and cold blues, bleach bypass aesthetic, pronounced 16mm film grain, subtle vignetting, noir sensibility, surveillance-photograph and leaked-document quality, low-key lighting, high detail but intentionally degraded, cinematic still frame aesthetic
```

**`emotional_beat`:** `tension`

### Example 06 — Revenge — Story (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `extreme_closeup`
- `scenes.image_prompt`: `hands holding a folded yellowed letter under a single harsh desk lamp, the paper's creases deeply visible, illegible handwritten content on the page, single desk lamp from upper right creating long hard shadow from the hands, extreme close-up with the letter in tack-sharp focus, deep black shadows surrounding, dust motes visible in the light beam, mood of long-held intent`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
extreme close-up, tight crop on detail, shallow depth of field, hands holding a folded yellowed letter under a single harsh desk lamp, the paper's creases deeply visible, illegible handwritten content on the page, single desk lamp from upper right creating long hard shadow from the hands, extreme close-up with the letter in tack-sharp focus, deep black shadows surrounding, dust motes visible in the light beam, mood of long-held intent dark investigative documentary photography, heavy chiaroscuro lighting with deep black shadows, single harsh directional light source creating strong hard-edged shadow patterns, desaturated color palette with muted browns and cold blues, bleach bypass aesthetic, pronounced 16mm film grain, subtle vignetting, noir sensibility, surveillance-photograph and leaked-document quality, low-key lighting, high detail but intentionally degraded, cinematic still frame aesthetic
```

**`emotional_beat`:** `story`

### Example 07 — Financial Fraud — Hook (Variant B)

**Inputs:**
- `scenes.composition_prefix`: `wide_establishing`
- `scenes.image_prompt`: `an abandoned fluorescent-lit call center floor at night, rows of empty cubicles stretching into darkness, single flickering overhead fluorescent tube creating harsh downward shadows and a pale blue-green cast, slight haze in the air, oblique low-angle perspective down a cubicle corridor, deep shadows filling the far half of the frame, mood of institutional dread, surveillance-photograph quality`
- `projects.style_dna` (Variant B)

**Resolved `prompt`:**

```
wide angle establishing shot, full scene visible, environmental context, an abandoned fluorescent-lit call center floor at night, rows of empty cubicles stretching into darkness, single flickering overhead fluorescent tube creating harsh downward shadows and a pale blue-green cast, slight haze in the air, oblique low-angle perspective down a cubicle corridor, deep shadows filling the far half of the frame, mood of institutional dread, surveillance-photograph quality dark investigative documentary photography, institutional chiaroscuro lighting with deep shadows, single harsh directional source creating long shadow patterns, desaturated muted-institutional color palette with cold blue-gray bias, bleach bypass aesthetic, pronounced 16mm film grain, vignetting, forensic document sensibility, leaked-memo and confidential-file quality, low-key institutional lighting, high detail but intentionally degraded, investigative cinematic still frame
```

**`emotional_beat`:** `hook`

### Example 08 — Financial Fraud — Transition (Variant B)

**Inputs:**
- `scenes.composition_prefix`: `leading_lines`
- `scenes.image_prompt`: `a long institutional corridor inside a government building at late evening, rows of identical office doors receding toward a dim vanishing point, single fluorescent light at far end creating cold illumination, harsh fluorescent ceiling tubes at regular intervals, oblique low-angle perspective along the corridor floor, deep black shadows filling the frame edges, mood of bureaucratic dread, desaturated institutional color palette`
- `projects.style_dna` (Variant B)

**Resolved `prompt`:**

```
composition using strong leading lines converging to subject, a long institutional corridor inside a government building at late evening, rows of identical office doors receding toward a dim vanishing point, single fluorescent light at far end creating cold illumination, harsh fluorescent ceiling tubes at regular intervals, oblique low-angle perspective along the corridor floor, deep black shadows filling the frame edges, mood of bureaucratic dread, desaturated institutional color palette dark investigative documentary photography, institutional chiaroscuro lighting with deep shadows, single harsh directional source creating long shadow patterns, desaturated muted-institutional color palette with cold blue-gray bias, bleach bypass aesthetic, pronounced 16mm film grain, vignetting, forensic document sensibility, leaked-memo and confidential-file quality, low-key institutional lighting, high detail but intentionally degraded, investigative cinematic still frame
```

**`emotional_beat`:** `transition`

### Example 09 — Dark Family — Hook (Variant C)

**Inputs:**
- `scenes.composition_prefix`: `wide_establishing`
- `scenes.image_prompt`: `an empty family dining room at late evening, dinner plates still on the table but abandoned mid-meal, a single chandelier casting uneven warm-brown light through a haze in the air, an opened letter on the floor near a chair that has been pushed back, deep brown shadows filling the corners of the room, slight overhead oblique angle, mood of unsettled domestic aftermath`
- `projects.style_dna` (Variant C — Dark Family)

**Resolved `prompt`:**

```
wide angle establishing shot, full scene visible, environmental context, an empty family dining room at late evening, dinner plates still on the table but abandoned mid-meal, a single chandelier casting uneven warm-brown light through a haze in the air, an opened letter on the floor near a chair that has been pushed back, deep brown shadows filling the corners of the room, slight overhead oblique angle, mood of unsettled domestic aftermath dark investigative documentary photography, domestic chiaroscuro lighting with deep warm-brown shadows, single harsh directional source (lamp, window, fluorescent) creating long shadow patterns, desaturated color palette with muted warm-browns and cold blues, bleach bypass aesthetic, pronounced 16mm film grain, vignetting, domestic-forensic sensibility, intimate-investigative quality, low-key lighting, high detail but intentionally degraded, investigative cinematic still frame
```

**`emotional_beat`:** `hook`

### Example 10 — Dark Family — Story (Variant C)

**Inputs:**
- `scenes.composition_prefix`: `extreme_closeup`
- `scenes.image_prompt`: `a weathered old lockbox covered in dust on the wooden floorboards of an attic, a single beam of afternoon sunlight falling diagonally through a small round window onto the lockbox, visible dust motes floating in the light beam, extreme close-up with the lockbox in tack-sharp focus and the surrounding floorboards in deep brown bokeh, slight overhead angle, mood of long-buried secret`
- `projects.style_dna` (Variant C)

**Resolved `prompt`:**

```
extreme close-up, tight crop on detail, shallow depth of field, a weathered old lockbox covered in dust on the wooden floorboards of an attic, a single beam of afternoon sunlight falling diagonally through a small round window onto the lockbox, visible dust motes floating in the light beam, extreme close-up with the lockbox in tack-sharp focus and the surrounding floorboards in deep brown bokeh, slight overhead angle, mood of long-buried secret dark investigative documentary photography, domestic chiaroscuro lighting with deep warm-brown shadows, single harsh directional source (lamp, window, fluorescent) creating long shadow patterns, desaturated color palette with muted warm-browns and cold blues, bleach bypass aesthetic, pronounced 16mm film grain, vignetting, domestic-forensic sensibility, intimate-investigative quality, low-key lighting, high detail but intentionally degraded, investigative cinematic still frame
```

**`emotional_beat`:** `story`

### Example 11 — Crime — Data (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `extreme_closeup`
- `scenes.image_prompt`: `a single flip-phone resting open on a bare wooden table, the illuminated screen faintly glowing with an illegible call log, single harsh overhead fluorescent tube from directly above creating hard shadow beneath the phone, extreme close-up with the phone in tack-sharp focus and the wood grain in deep shadow bokeh, subtle camera-footage degradation, mood of forensic scrutiny`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
extreme close-up, tight crop on detail, shallow depth of field, a single flip-phone resting open on a bare wooden table, the illuminated screen faintly glowing with an illegible call log, single harsh overhead fluorescent tube from directly above creating hard shadow beneath the phone, extreme close-up with the phone in tack-sharp focus and the wood grain in deep shadow bokeh, subtle camera-footage degradation, mood of forensic scrutiny dark investigative documentary photography, heavy chiaroscuro lighting with deep black shadows, single harsh directional light source creating strong hard-edged shadow patterns, desaturated color palette with muted browns and cold blues, bleach bypass aesthetic, pronounced 16mm film grain, subtle vignetting, noir sensibility, surveillance-photograph and leaked-document quality, low-key lighting, high detail but intentionally degraded, cinematic still frame aesthetic
```

**`emotional_beat`:** `data`

### Example 12 — Crime — Resolution (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `wide_establishing`
- `scenes.image_prompt`: `a wide exterior view of a county courthouse at dawn, pale cold light beginning to fill the sky behind the building, the facade still mostly in deep shadow, a few parked police vehicles at the curb, horizontal composition with the building occupying the middle band, deep desaturated blue-gray shadows, atmospheric soft haze, mood of unresolved weight, surveillance-photograph quality`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
wide angle establishing shot, full scene visible, environmental context, a wide exterior view of a county courthouse at dawn, pale cold light beginning to fill the sky behind the building, the facade still mostly in deep shadow, a few parked police vehicles at the curb, horizontal composition with the building occupying the middle band, deep desaturated blue-gray shadows, atmospheric soft haze, mood of unresolved weight, surveillance-photograph quality dark investigative documentary photography, heavy chiaroscuro lighting with deep black shadows, single harsh directional light source creating strong hard-edged shadow patterns, desaturated color palette with muted browns and cold blues, bleach bypass aesthetic, pronounced 16mm film grain, subtle vignetting, noir sensibility, surveillance-photograph and leaked-document quality, low-key lighting, high detail but intentionally degraded, cinematic still frame aesthetic
```

**`emotional_beat`:** `resolution`

---

## 8. QA Checklist — Register 03 Image Generation

- [ ] `projects.style_dna` contains one of Variant A, B, or C — OR `prompt_templates` has the register-keyed row in place
- [ ] `prompt_templates` has `negative_additions_register_03` row installed
- [ ] `prompt_templates` has `metadata_prompt_register_03` row installed
- [ ] `WF_SCRIPT_GENERATE.json` → `Prepare Metadata Prompt` node configured for register lookup
- [ ] `WF_IMAGE_GENERATION.json` → `Fire All Scenes` node configured for register-specific negative append
- [ ] Sample 3 resolved prompts before full run — verify bleach bypass + single harsh source + deep shadows anchors present
- [ ] Sample negative_prompt field — verify Universal Negative + Register 03 additions
- [ ] `image_size` is `landscape_16_9` (or `portrait_9_16` for shorts)
- [ ] Endpoint resolves to `https://queue.fal.run/fal-ai/bytedance/seedream/v4.5/text-to-image`
- [ ] Visual spot-check first 5 returned images: desaturated color, single hard light source, deep black shadows filling at least 30 percent of each frame
- [ ] No warm golden light bleeding through
- [ ] No luxurious Kodak Portra 400 aesthetic bleeding through
- [ ] No cheerful or aspirational mood bleeding through
- [ ] No futuristic/tech clean aesthetic bleeding through
- [ ] composition_prefix distribution weighted toward extreme_closeup + high_angle + leading_lines + wide_establishing
- [ ] No identifiable faces generated (all people as silhouettes, hands, or from-behind)

---

## 9. Source Files

- `workflows/WF_IMAGE_GENERATION.json` — Fire All Scenes node (register-aware Style DNA and negative prompt assembly)
- `workflows/WF_SCENE_IMAGE_PROCESSOR.json` — Fal.ai HTTP call (unchanged from base pipeline)
- `workflows/WF_SCRIPT_GENERATE.json` — Prepare Metadata Prompt node (now looks up `metadata_prompt_register_03`)
- `VisionGridAI_Platform_Agent.md` — Style DNA base templates (unchanged), Composition Library (unchanged), Universal Negative (unchanged)
- `directives/04-image-generation.md` — SOP reference
- `IMAGE_GENERATION_PROMPTS.md` — base pipeline reference
- `vision_gridai_registers/REGISTER_03_INVESTIGATIVE_NOIR.md` — cinematic grammar playbook for this register
