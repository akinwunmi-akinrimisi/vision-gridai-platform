# REGISTER 02 — PREMIUM AUTHORITY — Image Prompts

Luxury editorial. Register-tuned image-generation assets for the Premium Authority Register. Extends the base pipeline in `IMAGE_GENERATION_PROMPTS.md`. All references to `WF_IMAGE_GENERATION.json`, `WF_SCENE_IMAGE_PROCESSOR.json`, `WF_SCRIPT_GENERATE.json`, `Fire All Scenes`, `Prepare Metadata Prompt`, `prompt_templates`, `projects.style_dna`, `scenes.composition_prefix`, `scenes.image_prompt`, `image_size: landscape_16_9`, and the Universal Negative Prompt remain EXACTLY as defined in the base pipeline.

---

## 1. When This Register Is Active

Primary Register for luxury editorial content across:

- Premium credit cards ($450+ annual fee — Platinum, Reserve, Centurion, J.P. Morgan Reserve)
- Luxury real estate — ultra-prime markets, trophy listings, mogul portfolios
- High-net-worth personal finance — estate strategy, private wealth, family office
- First-class travel and premium travel hacking
- Wealth-management content addressing high-intent $150K+ HHI audiences

Scene classifier should set `scenes.production_register = 'REGISTER_02_PREMIUM'` when content contains premium product names, lifestyle descriptors (marble, leather, first class, mahogany), dollar figures above $10K, or wealth/legacy language.

---

## 2. Register-Specific Style DNA Variants

Three variants. Pick ONE at project creation time (Path A) or store all three in `prompt_templates` (Path B) keyed by niche.

### Variant A — Premium Primary (default for luxury finance, premium cards, HNW)

For `projects.style_dna` or `prompt_templates.template_key = 'style_dna_register_02_primary'`:

```
luxury editorial photography, cinematic natural lighting with strong directional warm key light, extreme shallow depth of field with creamy bokeh, warm tungsten and amber highlights, rich deep shadows with preserved detail, 85mm lens characteristics, Leica M camera aesthetic, Kodak Portra 400 color palette, subtle film grain, golden hour or interior tungsten lighting, rule-of-thirds composition with generous negative space, aspirational atmosphere, 4K high detail, editorial magazine aesthetic
```

### Variant B — Premium Real Estate (for luxury real estate niche)

For `prompt_templates.template_key = 'style_dna_register_02_real_estate'`:

```
luxury architectural photography, natural golden-hour daylight with warm directional rake, medium-shallow depth of field preserving architectural detail while softening background, rich earth-tone and warm-neutral color palette, deep architectural shadows with preserved detail, 35mm to 85mm lens characteristics, Kodak Portra 400 color palette, subtle film grain, rule-of-thirds composition with horizontal sky-ground division, aspirational atmosphere, 4K high detail, luxury real-estate editorial aesthetic
```

### Variant C — Premium Travel/Lifestyle (for first-class travel, lifestyle segments)

For `prompt_templates.template_key = 'style_dna_register_02_travel_lifestyle'`:

```
luxury lifestyle editorial photography, cinematic natural lighting with warm directional key, extreme shallow depth of field with creamy atmospheric bokeh, warm amber and tungsten highlights, rich preserved-shadow detail, 85mm lens characteristics, Leica M camera aesthetic, Kodak Portra 400 color palette, subtle film grain, golden hour favored, intimate rule-of-thirds composition, aspirational cinematic atmosphere, 4K high detail, editorial travel-magazine aesthetic
```

---

## 3. Register-Specific Negative Prompt Additions

For `prompt_templates.template_key = 'negative_additions_register_02'`:

```
cheap materials, plastic surfaces, chrome, neon, fluorescent lighting, cold color temperature, harsh shadows, cluttered composition, busy backgrounds, synthetic textures, modern clinical tech aesthetic, sterile studio lighting, aggressive chromatic aberration, VHS artifacts, glitch effects, over-saturation, HDR-like processing, grunge aesthetic, industrial aesthetic, budget product photography
```

**Resulting `negative_prompt` field sent to Fal.ai** (Universal Negative verbatim + Register 02 additions):

```
text, watermark, signature, logo, UI elements, blurry, low quality, distorted faces, extra fingers, mutated hands, bad anatomy, deformed, disfigured, out of frame, cropped, duplicate, error, jpeg artifacts, low resolution, cartoon, anime, painting, illustration, 3D render, CGI, cheap materials, plastic surfaces, chrome, neon, fluorescent lighting, cold color temperature, harsh shadows, cluttered composition, busy backgrounds, synthetic textures, modern clinical tech aesthetic, sterile studio lighting, aggressive chromatic aberration, VHS artifacts, glitch effects, over-saturation, HDR-like processing, grunge aesthetic, industrial aesthetic, budget product photography
```

---

## 4. composition_prefix Preferences

From the 8-value enum in `prompt_templates`. In priority order for this register:

| Priority | composition_prefix | Use In This Register For |
|---|---|---|
| 1 | `symmetrical` | Product hero shots, luxury object centered composition |
| 2 | `extreme_closeup` | Product macro details, texture emphasis, beauty shots |
| 3 | `medium_closeup` | Intimate lifestyle moments, hands on luxury objects |
| 4 | `high_angle` | Overhead tablescapes, premium flat lays |
| 5 | `wide_establishing` | Estate exteriors, lobby interiors, lifestyle environments |
| 6 | `leading_lines` | Grand hallways, colonnades, architectural luxury |
| 7 | `over_shoulder` | Rarely — occasional POV luxury experience moments |
| 8 | `low_angle` | Rarely — use only for architectural grandeur establishing |

Scene classifier guidance: default to `symmetrical` for hero and revelation beats, `extreme_closeup` for product and data beats, `medium_closeup` for story beats.

---

## 5. Register-Specific Metadata Prompt

Full body to store in `prompt_templates.template_key = 'metadata_prompt_register_02'`. Used by `WF_SCRIPT_GENERATE.json` → `Prepare Metadata Prompt` node. Returns the same JSON schema as the generic prompt (`scene_number`, `image_prompt`, `emotional_beat`, `chapter`).

```
Below are {N} text chunks from a documentary script about "{SEO_TITLE}".

This video is produced in REGISTER 02 — PREMIUM AUTHORITY. The visual language is luxury editorial: Bloomberg Originals, Rolex brand films, Robb Report, Chase Private Client advertising. Restraint over flash. Every frame feels expensive without feeling gaudy. Camera moves are glacial. Color is warm with Kodak Portra 400 bias. The viewer is addressed as someone of consequence.

For EACH chunk, generate ONLY:

1. image_prompt: 40-80 words, cinematic. Structure: [SUBJECT] + [ENVIRONMENT] + [LIGHTING] + [COMPOSITION] + [MOOD] + [DETAILS]. Be hyper-specific.

Register 02 rules for image_prompt:
- People as silhouettes, hands engaging with luxury objects, or figures from behind — never full identifiable faces, never eye contact
- Subjects: metal credit cards, crystal glassware, leather goods, watches, fountain pens, champagne, marble surfaces, mahogany, aged Scotch, passport wallets, keys, architectural details of premium environments
- Lighting: warm tungsten or golden-hour daylight, single strong directional key, long elegant shadows, rich preserved-shadow detail — never cold, never flat, never fluorescent
- Color: warm Kodak Portra 400 palette — amber highlights, gilded warmth, cream neutrals, deep warm shadows — never desaturated, never cool-blue, never neon
- Composition: generous negative space (upper-right third most common) for editorial typography overlay; 85mm compression favored; rule-of-thirds or perfectly symmetrical
- Always include "extreme shallow depth of field with creamy bokeh"
- Always include "warm directional light from [specific direction]"
- Mood: refined, contemplative, aspirational, measured — never urgent, never clinical, never anxious
- For product beauty shots, specify the surface (polished marble, charcoal linen, mahogany, cream linen) and the key prop (crystal coupe, leather passport wallet, Cartier-style watch)
- No readable brand logos, no brand names, no visible text on products

2. emotional_beat: one of hook, tension, revelation, data, story, resolution, transition

Beat-to-scene mapping for Register 02:
- hook: wide_establishing or symmetrical + luxury product or environment, dramatic single-source lighting
- tension: medium_closeup + hands engaging with luxury object, contemplative moment
- revelation: symmetrical + centered luxury product, hero presentation
- data: extreme_closeup + single object as metaphor for the data point (a single bill on leather desk pad, a watch face, a ledger page)
- story: medium_closeup + intimate lifestyle detail, personal moment with luxury object
- resolution: wide_establishing + pulling back to full environment, golden hour conclusion
- transition: leading_lines + grand architectural corridor, colonnade, or approach

3. chapter: a short chapter name grouping related scenes (2-5 words max)

Return ONLY a JSON array: [{"scene_number": 1, "image_prompt": "...", "emotional_beat": "...", "chapter": "..."}]

Do NOT return or modify any narration text. I only need image_prompt, emotional_beat, and chapter for each chunk number.

{CHUNK_LIST}
```

---

## 6. Per-`emotional_beat` scene_subject Patterns

### hook

```
[LUXURY SUBJECT — card/watch/door/key] isolated in [UPSCALE ENVIRONMENT — vault/suite/marble floor/estate entrance], dramatic single warm [tungsten spotlight/golden-hour raking light] from upper [direction] creating long elegant shadow and rim-light on [SUBJECT], [centered symmetrical / wide-establishing] composition with generous negative space in [upper-third/right-third], mood of quiet power and exclusivity, extreme shallow depth of field with creamy bokeh surrounding
```

### tension

```
[HANDS / SILHOUETTE from behind] [holding/touching/considering] a [LUXURY OBJECT — document/card/letter/pen] on a [CHARCOAL LINEN / MAHOGANY / POLISHED MARBLE surface], warm directional window or tungsten light from upper [direction] casting long elegant shadow, intimate overhead-45-degree camera angle, shallow depth of field with the object tack-sharp and surroundings falling into creamy bokeh, refined contemplative mood
```

### revelation

```
[CENTRAL LUXURY PRODUCT — card / watch / key / bottle] on [PREMIUM SURFACE] beside [SECONDARY LUXURY ELEMENTS — crystal coupe / leather passport / fountain pen], single strong warm directional light from upper [direction] creating long elegant shadow, perfectly symmetrical centered composition with generous negative space, intimate overhead-45-degree angle, mood of measured exclusivity
```

### data

```
[SINGLE METAPHORICAL OBJECT — a stack of hundred-dollar bills / a watch face / a leather ledger page / a fountain pen and signed document] on a [MAHOGANY / CHARCOAL LINEN / MARBLE surface], warm tungsten directional light from upper [direction] creating long shadow, extreme close-up with the subject tack-sharp and surroundings falling into deep creamy bokeh, mood of contemplated gravity
```

### story

```
[HANDS / SILHOUETTE from behind] in an [UPSCALE INTERIOR — hotel suite / library / private club / estate room] at [golden hour / tungsten evening], warm directional light from [window/lamp], a personal luxury object — a passport wallet being opened, a leather key folder, a fountain pen uncapped — medium close-up, shallow depth of field with the object in sharp focus, intimate aspirational mood
```

### resolution

```
Wide [exterior of estate / interior suite / lobby / private terrace] at golden hour, warm low sun raking across the scene, an entire environment visible with a single figure in silhouette in the far distance, horizontal composition with sky/ground or room/window division, aspirational conclusive mood, 85mm compressed perspective, subtle atmospheric depth
```

### transition

```
[GRAND ARCHITECTURAL CORRIDOR — marble colonnade / hotel corridor / museum gallery / estate approach drive] receding toward a warm bright vanishing point, warm directional light raking along the leading lines, symmetrical converging composition, mood of refined passage, subtle atmospheric depth
```

---

## 7. Worked Examples — 12 Scenes Across 4 Niches

Each example shows the three inputs and the resolved prompt as sent to Fal.ai.

### Example 01 — Premium Credit Card (Centurion) — Hook

**Inputs:**
- `scenes.composition_prefix`: `symmetrical`
- `scenes.image_prompt`: `a single black metal credit card suspended as if floating one inch above a polished black marble table, dramatic single warm tungsten spotlight from directly overhead creating a halo of light and a long elegant shadow beneath the card, extreme shallow depth of field with the card tack-sharp and surroundings falling into deep creamy black bokeh, perfectly centered symmetrical composition with the card in the upper third and generous negative space below, mood of exclusivity and gravity, dust motes visible in the light beam`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
perfectly symmetrical composition, centered subject, architectural framing, a single black metal credit card suspended as if floating one inch above a polished black marble table, dramatic single warm tungsten spotlight from directly overhead creating a halo of light and a long elegant shadow beneath the card, extreme shallow depth of field with the card tack-sharp and surroundings falling into deep creamy black bokeh, perfectly centered symmetrical composition with the card in the upper third and generous negative space below, mood of exclusivity and gravity, dust motes visible in the light beam luxury editorial photography, cinematic natural lighting with strong directional warm key light, extreme shallow depth of field with creamy bokeh, warm tungsten and amber highlights, rich deep shadows with preserved detail, 85mm lens characteristics, Leica M camera aesthetic, Kodak Portra 400 color palette, subtle film grain, golden hour or interior tungsten lighting, rule-of-thirds composition with generous negative space, aspirational atmosphere, 4K high detail, editorial magazine aesthetic
```

**`emotional_beat`:** `hook`

### Example 02 — Premium Credit Card — Revelation

**Inputs:**
- `scenes.composition_prefix`: `symmetrical`
- `scenes.image_prompt`: `a single metal credit card resting flat on charcoal linen beside a crystal coupe of champagne and a leather passport wallet, single warm window light from upper right creating long elegant diagonal shadows, extreme shallow depth of field with the card tack-sharp and the champagne coupe and passport falling into soft creamy bokeh, intimate overhead-45-degree camera angle, perfectly balanced composition with generous negative space in upper right, mood of refined aspirational gravity`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
perfectly symmetrical composition, centered subject, architectural framing, a single metal credit card resting flat on charcoal linen beside a crystal coupe of champagne and a leather passport wallet, single warm window light from upper right creating long elegant diagonal shadows, extreme shallow depth of field with the card tack-sharp and the champagne coupe and passport falling into soft creamy bokeh, intimate overhead-45-degree camera angle, perfectly balanced composition with generous negative space in upper right, mood of refined aspirational gravity luxury editorial photography, cinematic natural lighting with strong directional warm key light, extreme shallow depth of field with creamy bokeh, warm tungsten and amber highlights, rich deep shadows with preserved detail, 85mm lens characteristics, Leica M camera aesthetic, Kodak Portra 400 color palette, subtle film grain, golden hour or interior tungsten lighting, rule-of-thirds composition with generous negative space, aspirational atmosphere, 4K high detail, editorial magazine aesthetic
```

**`emotional_beat`:** `revelation`

### Example 03 — Luxury Real Estate — Hook (Variant B)

**Inputs:**
- `scenes.composition_prefix`: `wide_establishing`
- `scenes.image_prompt`: `a stone-facade modernist mountain compound at golden hour, aspen trees framing the left foreground, Rocky Mountain peaks in the background catching warm alpine glow, a single black Range Rover parked in the stone drive, warm interior lights just beginning to show through the tall windows, architectural photography composition with the compound occupying the right two-thirds of frame, shallow depth of field with the Range Rover in mid-ground in focus, 85mm compressed perspective, aspirational quiet mood`
- `projects.style_dna` (Variant B — Real Estate)

**Resolved `prompt`:**

```
wide angle establishing shot, full scene visible, environmental context, a stone-facade modernist mountain compound at golden hour, aspen trees framing the left foreground, Rocky Mountain peaks in the background catching warm alpine glow, a single black Range Rover parked in the stone drive, warm interior lights just beginning to show through the tall windows, architectural photography composition with the compound occupying the right two-thirds of frame, shallow depth of field with the Range Rover in mid-ground in focus, 85mm compressed perspective, aspirational quiet mood luxury architectural photography, natural golden-hour daylight with warm directional rake, medium-shallow depth of field preserving architectural detail while softening background, rich earth-tone and warm-neutral color palette, deep architectural shadows with preserved detail, 35mm to 85mm lens characteristics, Kodak Portra 400 color palette, subtle film grain, rule-of-thirds composition with horizontal sky-ground division, aspirational atmosphere, 4K high detail, luxury real-estate editorial aesthetic
```

**`emotional_beat`:** `hook`

### Example 04 — Luxury Real Estate — Story (Variant B)

**Inputs:**
- `scenes.composition_prefix`: `extreme_closeup`
- `scenes.image_prompt`: `a single heavy brass door key resting on a weathered teak doorstep beside a folded leather key folder, warm late-afternoon directional light from upper left creating long elegant shadow from the key, the grain of the teak deeply visible, extreme close-up with the key in tack-sharp focus and the leather folder in soft warm bokeh, intimate overhead angle, mood of a significant arrival`
- `projects.style_dna` (Variant B)

**Resolved `prompt`:**

```
extreme close-up, tight crop on detail, shallow depth of field, a single heavy brass door key resting on a weathered teak doorstep beside a folded leather key folder, warm late-afternoon directional light from upper left creating long elegant shadow from the key, the grain of the teak deeply visible, extreme close-up with the key in tack-sharp focus and the leather folder in soft warm bokeh, intimate overhead angle, mood of a significant arrival luxury architectural photography, natural golden-hour daylight with warm directional rake, medium-shallow depth of field preserving architectural detail while softening background, rich earth-tone and warm-neutral color palette, deep architectural shadows with preserved detail, 35mm to 85mm lens characteristics, Kodak Portra 400 color palette, subtle film grain, rule-of-thirds composition with horizontal sky-ground division, aspirational atmosphere, 4K high detail, luxury real-estate editorial aesthetic
```

**`emotional_beat`:** `story`

### Example 05 — HNW Private Wealth — Revelation (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `symmetrical`
- `scenes.image_prompt`: `a leather-bound portfolio resting centered on a polished mahogany conference table, a gold fountain pen diagonally across the portfolio, a second smaller leather document wallet closed in the upper right, soft directional tungsten light from upper left creating long elegant shadows from all three objects, perfectly symmetrical composition with the portfolio centered and generous negative space in lower third, intimate overhead-45-degree angle, refined aspirational gravity mood, extreme shallow depth of field with the portfolio in tack-sharp focus`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
perfectly symmetrical composition, centered subject, architectural framing, a leather-bound portfolio resting centered on a polished mahogany conference table, a gold fountain pen diagonally across the portfolio, a second smaller leather document wallet closed in the upper right, soft directional tungsten light from upper left creating long elegant shadows from all three objects, perfectly symmetrical composition with the portfolio centered and generous negative space in lower third, intimate overhead-45-degree angle, refined aspirational gravity mood, extreme shallow depth of field with the portfolio in tack-sharp focus luxury editorial photography, cinematic natural lighting with strong directional warm key light, extreme shallow depth of field with creamy bokeh, warm tungsten and amber highlights, rich deep shadows with preserved detail, 85mm lens characteristics, Leica M camera aesthetic, Kodak Portra 400 color palette, subtle film grain, golden hour or interior tungsten lighting, rule-of-thirds composition with generous negative space, aspirational atmosphere, 4K high detail, editorial magazine aesthetic
```

**`emotional_beat`:** `revelation`

### Example 06 — HNW Private Wealth — Tension (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `medium_closeup`
- `scenes.image_prompt`: `hands from behind a desk holding a single typed document while seated at a mahogany desk, soft directional tungsten light from upper left casting long shadow from the paper onto the desk surface, medium close-up with hands and document in tack-sharp focus, deep creamy bokeh on the desk surroundings, intimate contemplative mood, subtle amber warmth in the shadow tones`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
medium close-up shot, subject fills center frame, shoulders and above, hands from behind a desk holding a single typed document while seated at a mahogany desk, soft directional tungsten light from upper left casting long shadow from the paper onto the desk surface, medium close-up with hands and document in tack-sharp focus, deep creamy bokeh on the desk surroundings, intimate contemplative mood, subtle amber warmth in the shadow tones luxury editorial photography, cinematic natural lighting with strong directional warm key light, extreme shallow depth of field with creamy bokeh, warm tungsten and amber highlights, rich deep shadows with preserved detail, 85mm lens characteristics, Leica M camera aesthetic, Kodak Portra 400 color palette, subtle film grain, golden hour or interior tungsten lighting, rule-of-thirds composition with generous negative space, aspirational atmosphere, 4K high detail, editorial magazine aesthetic
```

**`emotional_beat`:** `tension`

### Example 07 — Premium Travel — Story (Variant C)

**Inputs:**
- `scenes.composition_prefix`: `medium_closeup`
- `scenes.image_prompt`: `hands unfolding a leather passport wallet on a small airline lounge table beside a crystal tumbler containing an aged whiskey and a single ice sphere, warm tungsten lounge lighting from upper right casting long shadows, medium close-up preserving the lounge's dimness in soft creamy bokeh, the passport and tumbler in tack-sharp focus, intimate aspirational mood, subtle amber reflection in the whiskey`
- `projects.style_dna` (Variant C — Travel/Lifestyle)

**Resolved `prompt`:**

```
medium close-up shot, subject fills center frame, shoulders and above, hands unfolding a leather passport wallet on a small airline lounge table beside a crystal tumbler containing an aged whiskey and a single ice sphere, warm tungsten lounge lighting from upper right casting long shadows, medium close-up preserving the lounge's dimness in soft creamy bokeh, the passport and tumbler in tack-sharp focus, intimate aspirational mood, subtle amber reflection in the whiskey luxury lifestyle editorial photography, cinematic natural lighting with warm directional key, extreme shallow depth of field with creamy atmospheric bokeh, warm amber and tungsten highlights, rich preserved-shadow detail, 85mm lens characteristics, Leica M camera aesthetic, Kodak Portra 400 color palette, subtle film grain, golden hour favored, intimate rule-of-thirds composition, aspirational cinematic atmosphere, 4K high detail, editorial travel-magazine aesthetic
```

**`emotional_beat`:** `story`

### Example 08 — Premium Travel — Transition (Variant C)

**Inputs:**
- `scenes.composition_prefix`: `leading_lines`
- `scenes.image_prompt`: `a grand hotel corridor at night with tall arched ceilings, warm tungsten sconces lining both walls at regular intervals creating rhythmic highlights, a Persian runner extending down the center of the marble floor, the corridor walls converging symmetrically toward a warm illuminated vanishing point, a single figure in silhouette in the far distance walking away, symmetrical leading-lines composition, mood of refined passage, subtle atmospheric depth`
- `projects.style_dna` (Variant C)

**Resolved `prompt`:**

```
composition using strong leading lines converging to subject, a grand hotel corridor at night with tall arched ceilings, warm tungsten sconces lining both walls at regular intervals creating rhythmic highlights, a Persian runner extending down the center of the marble floor, the corridor walls converging symmetrically toward a warm illuminated vanishing point, a single figure in silhouette in the far distance walking away, symmetrical leading-lines composition, mood of refined passage, subtle atmospheric depth luxury lifestyle editorial photography, cinematic natural lighting with warm directional key, extreme shallow depth of field with creamy atmospheric bokeh, warm amber and tungsten highlights, rich preserved-shadow detail, 85mm lens characteristics, Leica M camera aesthetic, Kodak Portra 400 color palette, subtle film grain, golden hour favored, intimate rule-of-thirds composition, aspirational cinematic atmosphere, 4K high detail, editorial travel-magazine aesthetic
```

**`emotional_beat`:** `transition`

### Example 09 — Premium Credit Card — Data beat

**Inputs:**
- `scenes.composition_prefix`: `extreme_closeup`
- `scenes.image_prompt`: `a single folded hundred-dollar bill resting at a slight angle on a leather desk pad, a gold fountain pen pointing toward it from the upper right, warm tungsten directional light from upper left creating long elegant shadows, extreme close-up with the bill in tack-sharp focus and the pen tip in soft bokeh, intimate overhead-45-degree angle, mood of measured financial gravity, the grain of the leather deeply visible`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
extreme close-up, tight crop on detail, shallow depth of field, a single folded hundred-dollar bill resting at a slight angle on a leather desk pad, a gold fountain pen pointing toward it from the upper right, warm tungsten directional light from upper left creating long elegant shadows, extreme close-up with the bill in tack-sharp focus and the pen tip in soft bokeh, intimate overhead-45-degree angle, mood of measured financial gravity, the grain of the leather deeply visible luxury editorial photography, cinematic natural lighting with strong directional warm key light, extreme shallow depth of field with creamy bokeh, warm tungsten and amber highlights, rich deep shadows with preserved detail, 85mm lens characteristics, Leica M camera aesthetic, Kodak Portra 400 color palette, subtle film grain, golden hour or interior tungsten lighting, rule-of-thirds composition with generous negative space, aspirational atmosphere, 4K high detail, editorial magazine aesthetic
```

**`emotional_beat`:** `data`

### Example 10 — Luxury Real Estate — Resolution (Variant B)

**Inputs:**
- `scenes.composition_prefix`: `wide_establishing`
- `scenes.image_prompt`: `a wide view of the same stone-facade mountain compound from the video's opener now at deeper dusk with all interior warm lights fully illuminated, warm amber glow emanating from every tall window, mountain peaks in the background fading into deep blue dusk, horizontal composition with sky in upper third and compound occupying middle band, aspirational conclusive mood, 85mm compressed perspective, subtle atmospheric depth`
- `projects.style_dna` (Variant B)

**Resolved `prompt`:**

```
wide angle establishing shot, full scene visible, environmental context, a wide view of the same stone-facade mountain compound from the video's opener now at deeper dusk with all interior warm lights fully illuminated, warm amber glow emanating from every tall window, mountain peaks in the background fading into deep blue dusk, horizontal composition with sky in upper third and compound occupying middle band, aspirational conclusive mood, 85mm compressed perspective, subtle atmospheric depth luxury architectural photography, natural golden-hour daylight with warm directional rake, medium-shallow depth of field preserving architectural detail while softening background, rich earth-tone and warm-neutral color palette, deep architectural shadows with preserved detail, 35mm to 85mm lens characteristics, Kodak Portra 400 color palette, subtle film grain, rule-of-thirds composition with horizontal sky-ground division, aspirational atmosphere, 4K high detail, luxury real-estate editorial aesthetic
```

**`emotional_beat`:** `resolution`

### Example 11 — HNW Private Wealth — Data (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `high_angle`
- `scenes.image_prompt`: `overhead top-down view of a leather-bound ledger page with elegantly handwritten rows of illegible entries, a gold fountain pen resting diagonally across the page, a crystal tumbler at the upper-right corner of frame, warm tungsten directional light from the left creating long elegant shadows across the page, perfectly flat top-down angle, the ledger occupying center of frame with generous negative space around, shallow depth of field with the pen nib in tack-sharp focus, mood of measured private gravity`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
high angle shot looking down, bird's eye perspective, subject below, overhead top-down view of a leather-bound ledger page with elegantly handwritten rows of illegible entries, a gold fountain pen resting diagonally across the page, a crystal tumbler at the upper-right corner of frame, warm tungsten directional light from the left creating long elegant shadows across the page, perfectly flat top-down angle, the ledger occupying center of frame with generous negative space around, shallow depth of field with the pen nib in tack-sharp focus, mood of measured private gravity luxury editorial photography, cinematic natural lighting with strong directional warm key light, extreme shallow depth of field with creamy bokeh, warm tungsten and amber highlights, rich deep shadows with preserved detail, 85mm lens characteristics, Leica M camera aesthetic, Kodak Portra 400 color palette, subtle film grain, golden hour or interior tungsten lighting, rule-of-thirds composition with generous negative space, aspirational atmosphere, 4K high detail, editorial magazine aesthetic
```

**`emotional_beat`:** `data`

### Example 12 — Premium Travel — Resolution (Variant C)

**Inputs:**
- `scenes.composition_prefix`: `wide_establishing`
- `scenes.image_prompt`: `a wide view of a first-class suite at high altitude at dawn, warm tungsten suite lighting contrasting with the pale pink-amber sunrise visible through the large window, a small table set with a breakfast service including crystal glassware, the suite extending horizontally across the frame, atmospheric soft light mixing interior warm tungsten and exterior dawn pink-gold, mood of serene conclusion, 85mm compressed perspective`
- `projects.style_dna` (Variant C)

**Resolved `prompt`:**

```
wide angle establishing shot, full scene visible, environmental context, a wide view of a first-class suite at high altitude at dawn, warm tungsten suite lighting contrasting with the pale pink-amber sunrise visible through the large window, a small table set with a breakfast service including crystal glassware, the suite extending horizontally across the frame, atmospheric soft light mixing interior warm tungsten and exterior dawn pink-gold, mood of serene conclusion, 85mm compressed perspective luxury lifestyle editorial photography, cinematic natural lighting with warm directional key, extreme shallow depth of field with creamy atmospheric bokeh, warm amber and tungsten highlights, rich preserved-shadow detail, 85mm lens characteristics, Leica M camera aesthetic, Kodak Portra 400 color palette, subtle film grain, golden hour favored, intimate rule-of-thirds composition, aspirational cinematic atmosphere, 4K high detail, editorial travel-magazine aesthetic
```

**`emotional_beat`:** `resolution`

---

## 8. QA Checklist — Register 02 Image Generation

- [ ] `projects.style_dna` contains one of Variant A, B, or C — OR `prompt_templates` has the register-keyed row in place
- [ ] `prompt_templates` has `negative_additions_register_02` row installed
- [ ] `prompt_templates` has `metadata_prompt_register_02` row installed
- [ ] `WF_SCRIPT_GENERATE.json` → `Prepare Metadata Prompt` node configured for register lookup
- [ ] `WF_IMAGE_GENERATION.json` → `Fire All Scenes` node configured for register-specific negative append
- [ ] Sample 3 resolved prompts before full run — verify Leica M + Kodak Portra 400 + 85mm anchors present
- [ ] Sample negative_prompt field — verify Universal Negative + Register 02 additions
- [ ] `image_size` is `landscape_16_9` for long-form (or `portrait_9_16` for shorts)
- [ ] Endpoint resolves to `https://queue.fal.run/fal-ai/bytedance/seedream/v4.5/text-to-image`
- [ ] Visual spot-check first 5 returned images: warm tungsten palette present, extreme shallow DOF visible, rich preserved shadows
- [ ] No cold color temperature bleeding through
- [ ] No clinical tech aesthetic bleeding through
- [ ] No desaturated noir aesthetic bleeding through
- [ ] No cluttered/busy composition — negative space preserved
- [ ] No logo/brand hallucinations visible on products
- [ ] composition_prefix distribution weighted toward symmetrical + extreme_closeup + medium_closeup

---

## 9. Source Files

- `workflows/WF_IMAGE_GENERATION.json` — Fire All Scenes node (register-aware Style DNA and negative prompt assembly)
- `workflows/WF_SCENE_IMAGE_PROCESSOR.json` — Fal.ai HTTP call (unchanged from base pipeline)
- `workflows/WF_SCRIPT_GENERATE.json` — Prepare Metadata Prompt node (now looks up `metadata_prompt_register_02`)
- `VisionGridAI_Platform_Agent.md` — Style DNA base templates (unchanged), Composition Library (unchanged), Universal Negative (unchanged)
- `directives/04-image-generation.md` — SOP reference
- `IMAGE_GENERATION_PROMPTS.md` — base pipeline reference
- `vision_gridai_registers/REGISTER_02_PREMIUM_AUTHORITY.md` — cinematic grammar playbook for this register
