# REGISTER 04 — SIGNAL (TECH FUTURIST) — Image Prompts

Tech/fintech precision. Register-tuned image-generation assets for the Signal Register. Extends the base pipeline in `IMAGE_GENERATION_PROMPTS.md`. All references to `WF_IMAGE_GENERATION.json`, `WF_SCENE_IMAGE_PROCESSOR.json`, `WF_SCRIPT_GENERATE.json`, `Fire All Scenes`, `Prepare Metadata Prompt`, `prompt_templates`, `projects.style_dna`, `scenes.composition_prefix`, `scenes.image_prompt`, `image_size: landscape_16_9`, and the Universal Negative Prompt remain EXACTLY as defined in the base pipeline.

---

## 1. When This Register Is Active

Primary Register for tech-explainer and futurist content across:

- B2B SaaS — product reviews, tool comparisons, tech explainers
- AI tools education — LLMs, agents, automation tutorials (Operscale content)
- Cybersecurity, encryption, network mechanics, fraud detection
- Contactless payment, NFC, chip technology, biometric authentication
- Crypto, blockchain, stablecoin, CBDC content
- AI underwriting, algorithmic trading, machine-learning in finance
- PropTech, LegalTech, InsurTech

Scene classifier should set `scenes.production_register = 'REGISTER_04_SIGNAL'` when content contains technical terminology (algorithm, neural network, encryption, blockchain, API, tokenization), future-framing language, or fintech/SaaS product mechanics.

---

## 2. Register-Specific Style DNA Variants

Three variants.

### Variant A — Signal Primary (default for SaaS, AI tools, fintech tech)

For `projects.style_dna` or `prompt_templates.template_key = 'style_dna_register_04_primary'`:

```
clean modern product photography, studio lighting with controlled reflections, cool color temperature with selective warm amber accents, deep blue-black shadows with preserved detail, subtle specular highlights on metallic and glass surfaces, extreme shallow depth of field, macro or architectural perspective, minimalist composition with generous negative space, Apple keynote aesthetic, Bloomberg Originals tech documentary look, Blade-Runner-2049-meets-Dieter-Rams sensibility, tack-sharp focus, subtle bloom on bright elements, 4K ultra-sharp detail, futuristic cinematic still
```

### Variant B — Signal Crypto/Payment (for payment tech, crypto, blockchain content)

For `prompt_templates.template_key = 'style_dna_register_04_crypto_payment'`:

```
clean modern product photography, controlled studio lighting with cyan and amber accents, cool color temperature dominant with selective warm rim lighting, deep blue-black shadows with preserved detail, macro perspective emphasizing chip and hardware detail, subtle specular highlights on metallic and glass surfaces, minimalist composition with dark atmospheric depth, Apple keynote aesthetic, fintech product photography, tack-sharp focus, subtle bloom on bright elements, 4K ultra-sharp detail, futuristic cinematic still
```

### Variant C — Signal Cybersecurity (for cybersecurity, data breach, encryption content)

For `prompt_templates.template_key = 'style_dna_register_04_cybersecurity'`:

```
clean modern documentary photography, cool blue-dominant lighting with selective warm amber accents on key subjects, deep blue-black atmospheric shadows, extreme shallow depth of field with atmospheric depth fog, macro or architectural perspective, minimalist composition with dark negative space, Blade-Runner-2049 sensibility, cybersecurity documentary aesthetic, tack-sharp focus, subtle bloom on bright elements, 4K ultra-sharp detail, futuristic cinematic still, subtle atmospheric haze
```

---

## 3. Register-Specific Negative Prompt Additions

For `prompt_templates.template_key = 'negative_additions_register_04'`:

```
warm golden light, nostalgic aesthetic, heavy film grain, organic textures, vintage photography look, historical period styling, natural outdoor environments, handheld camera feel, wood and leather surfaces, rustic settings, cluttered backgrounds, aggressive chromatic aberration as heavy effect, VHS artifacts, analog distortion, typewriter or paper aesthetic, warm tungsten cozy interior, Kodak Portra 400 warmth, bleach bypass desaturation, noir deep-shadow aesthetic
```

**Resulting `negative_prompt` field sent to Fal.ai** (Universal Negative verbatim + Register 04 additions):

```
text, watermark, signature, logo, UI elements, blurry, low quality, distorted faces, extra fingers, mutated hands, bad anatomy, deformed, disfigured, out of frame, cropped, duplicate, error, jpeg artifacts, low resolution, cartoon, anime, painting, illustration, 3D render, CGI, warm golden light, nostalgic aesthetic, heavy film grain, organic textures, vintage photography look, historical period styling, natural outdoor environments, handheld camera feel, wood and leather surfaces, rustic settings, cluttered backgrounds, aggressive chromatic aberration as heavy effect, VHS artifacts, analog distortion, typewriter or paper aesthetic, warm tungsten cozy interior, Kodak Portra 400 warmth, bleach bypass desaturation, noir deep-shadow aesthetic
```

---

## 4. composition_prefix Preferences

| Priority | composition_prefix | Use In This Register For |
|---|---|---|
| 1 | `extreme_closeup` | Macro tech details (chips, ports, circuit boards, fiber optic, biometric sensors) |
| 2 | `symmetrical` | Product hero shots, centered architectural/technical subjects |
| 3 | `wide_establishing` | Data center corridors, server rooms, futuristic architectural establishing |
| 4 | `leading_lines` | Corridor compositions, conveyor mechanics, network-flow perspective |
| 5 | `low_angle` | Heroic tech architecture, looming data-center perspective |
| 6 | `high_angle` | Circuit board overheads, device top-downs, flat lay macro |
| 7 | `medium_closeup` | Hands on devices, hands at keyboards, tech-interaction moments |
| 8 | `over_shoulder` | POV on screens (screen content illegible, glow only) |

Scene classifier guidance: default to `extreme_closeup` for hero and revelation beats, `symmetrical` for product beats, `wide_establishing` for architectural tech environments, `leading_lines` for transitions and network-flow visualizations.

---

## 5. Register-Specific Metadata Prompt

Full body to store in `prompt_templates.template_key = 'metadata_prompt_register_04'`.

```
Below are {N} text chunks from a documentary script about "{SEO_TITLE}".

This video is produced in REGISTER 04 — SIGNAL (TECH FUTURIST). The visual language is clean, precise, futuristic: ColdFusion, Cleo Abram, Apple keynote B-roll, Bloomberg Originals tech documentaries, Blade Runner 2049 sensibility. Every image feels like being inside the machine. Negative space is a feature.

For EACH chunk, generate ONLY:

1. image_prompt: 40-80 words, cinematic. Structure: [SUBJECT] + [ENVIRONMENT] + [LIGHTING] + [COMPOSITION] + [MOOD] + [DETAILS]. Be hyper-specific.

Register 04 rules for image_prompt:
- People as silhouettes, hands at keyboards or on devices, or figures from behind — never full identifiable faces
- Subjects: EMV chips, NFC terminals, circuit boards, fiber optic cables, server racks, data centers, holographic visualizations, neural-network-style abstract geometric shapes, payment terminals, biometric sensors, laptop screens (content illegible, glow only), modern product hardware
- Lighting: cool ambient key light (blue/cyan dominant) WITH selective warm amber rim light on key subjects — NEVER all cool (feels sterile), NEVER warm-dominant (wrong register), NEVER fluorescent overhead
- Color: cool blue-black backgrounds, selective cyan highlights, warm amber accent rim lights, deep shadows with preserved detail — NEVER desaturated noir, NEVER warm-golden
- Composition: generous negative space with dark atmospheric depth, macro or architectural perspective, minimalist Apple-keynote composition, rule-of-thirds or centered symmetry
- Always include "tack-sharp focus" and "subtle bloom on bright elements"
- Always include "Apple keynote aesthetic" OR "Blade Runner 2049 sensibility"
- Always specify cool + warm: "cool blue ambient with warm amber accent from [direction]"
- Mood: clinical, precise, futuristic, measured, curious — never warm-cozy, never urgent, never nostalgic
- For data visualization subjects: describe as "abstract geometric cyan shapes floating in matte black void with subtle particles of light flowing between them" — NEVER describe readable UI elements (those come from FFmpeg drawtext later)
- HUD elements (corner brackets, monospace timestamps, schematic annotations) can be BAKED into the image prompt: "with thin cyan HUD corner brackets in all four corners, minimalist monospace timestamp upper-right rendered as graphic UI element"
- No readable brand logos, no brand names, no legible screen content

2. emotional_beat: one of hook, tension, revelation, data, story, resolution, transition

Beat-to-scene mapping for Register 04:
- hook: extreme_closeup + macro tech subject with cyan light beam sweeping across
- tension: medium_closeup + hands at keyboard with screen glow
- revelation: symmetrical + centered tech product as hero, cool+warm rim lit
- data: extreme_closeup or symmetrical + data visualization as abstract geometric shapes
- story: wide_establishing + tech architectural environment, single figure in silhouette
- resolution: wide_establishing + pulling back to full futuristic environment
- transition: leading_lines + corridor, network flow, or conveyor perspective

3. chapter: a short chapter name grouping related scenes (2-5 words max, tech-flavored preferred — "The Stack", "Signal vs Noise", "Inside the Machine")

Return ONLY a JSON array: [{"scene_number": 1, "image_prompt": "...", "emotional_beat": "...", "chapter": "..."}]

Do NOT return or modify any narration text. I only need image_prompt, emotional_beat, and chapter for each chunk number.

{CHUNK_LIST}
```

---

## 6. Per-`emotional_beat` scene_subject Patterns

### hook

```
Macro close-up of [TECH SUBJECT — chip / payment terminal / circuit board / biometric sensor / fiber optic], atmospheric dark blue background with [thin cyan volumetric light beam / selective warm amber rim light] from [direction], extreme shallow depth of field, [oblique side-view / centered / 60-degree] angle, with thin cyan HUD corner brackets in all four corners, clinical futuristic mood, tack-sharp focus, subtle bloom
```

### tension

```
[HANDS at a laptop keyboard / HANDS on a device] in a [modern office / dim workspace], the laptop screen tilted away so content is not visible but a soft [blue-white / cyan] glow reflects on the hands, cool ambient light from [direction] with selective warm amber rim from [direction], medium close-up with hands in tack-sharp focus and background in atmospheric bokeh, clinical mood of measured reckoning, subtle atmospheric depth
```

### revelation

```
[CENTRAL TECH PRODUCT — card / device / chip / hardware] floating against a matte black atmospheric void, single cool cyan key light from [direction] with warm amber rim from opposite direction creating dramatic color contrast on the edges, perfectly symmetrical centered composition with generous negative space around, extreme shallow depth of field, clinical futuristic mood, tack-sharp focus, subtle bloom on specular highlights
```

### data

```
Stylized abstract visualization of [interconnected translucent cyan geometric nodes / flowing data streams / particle cascade] floating in a matte black atmospheric void, subtle particles of light flowing between elements, warm amber accent lights on [N] foreground elements, architectural perspective looking into the visualization, with thin cyan HUD corner brackets integrated, clinical futuristic mood, Blade Runner 2049 sensibility, no readable values
```

### story

```
[WIDE VIEW of stylized data center corridor / server room / futuristic office interior], rows of [server racks / modern workstations] extending into atmospheric blue depth, thin cyan indicator lights glowing at regular intervals, soft warm amber accent light on [one wall / the right side], architectural perspective looking down the space, a single figure in silhouette in the far distance, matte surfaces, Blade Runner 2049 sensibility, clinical measured mood
```

### resolution

```
[WIDE VIEW — full futuristic environment / architectural tech interior] at [pulling back from earlier scene], cool ambient blue dominant with warm amber interior lights glowing in windows or on surfaces, wide composition with atmospheric depth fog, horizontal or architectural composition, mood of measured technological conclusion, subtle atmospheric haze, tack-sharp foreground detail
```

### transition

```
[CORRIDOR / DATA CENTER PASSAGE / CONVEYOR SYSTEM / FIBER-OPTIC CABLE PATH] receding toward an illuminated vanishing point, thin cyan indicator lights at regular intervals along the walls or floor, atmospheric blue-dominant lighting with warm amber accent at the vanishing point, strong leading-lines composition, atmospheric depth fog, clinical transitional mood, subtle bloom on brightest elements
```

---

## 7. Worked Examples — 12 Scenes Across 4 Niches

### Example 01 — Payment Tech (Chip Card) — Hook (Variant B)

**Inputs:**
- `scenes.composition_prefix`: `extreme_closeup`
- `scenes.image_prompt`: `macro close-up of a credit card EMV chip with intricate golden contact pads, extreme detail visible showing the micro-structures of the pad pattern, atmospheric dark blue background, thin cyan volumetric light beam passing across the chip surface from left to right, warm amber specular highlight on the chip corners, 60-degree oblique angle looking along the chip surface, extreme shallow depth of field with the chip center in tack-sharp focus, with thin cyan HUD corner brackets in all four corners, clinical futuristic mood, subtle bloom on the brightest specular points`
- `projects.style_dna` (Variant B — Crypto/Payment)

**Resolved `prompt`:**

```
extreme close-up, tight crop on detail, shallow depth of field, macro close-up of a credit card EMV chip with intricate golden contact pads, extreme detail visible showing the micro-structures of the pad pattern, atmospheric dark blue background, thin cyan volumetric light beam passing across the chip surface from left to right, warm amber specular highlight on the chip corners, 60-degree oblique angle looking along the chip surface, extreme shallow depth of field with the chip center in tack-sharp focus, with thin cyan HUD corner brackets in all four corners, clinical futuristic mood, subtle bloom on the brightest specular points clean modern product photography, controlled studio lighting with cyan and amber accents, cool color temperature dominant with selective warm rim lighting, deep blue-black shadows with preserved detail, macro perspective emphasizing chip and hardware detail, subtle specular highlights on metallic and glass surfaces, minimalist composition with dark atmospheric depth, Apple keynote aesthetic, fintech product photography, tack-sharp focus, subtle bloom on bright elements, 4K ultra-sharp detail, futuristic cinematic still
```

**`emotional_beat`:** `hook`

### Example 02 — Payment Tech — Revelation (Variant B)

**Inputs:**
- `scenes.composition_prefix`: `symmetrical`
- `scenes.image_prompt`: `a metallic credit card floating vertically centered against a matte black void, a tokenization visualization effect with the card's right edge dissolving into geometric cyan data shards extending rightward, single cool cyan key light from upper left with warm amber rim light from upper right creating dramatic color contrast on the card edges, perfectly centered symmetrical composition with generous negative space, extreme shallow depth of field, clinical futuristic mood, subtle bloom on specular highlights along the card edge`
- `projects.style_dna` (Variant B)

**Resolved `prompt`:**

```
perfectly symmetrical composition, centered subject, architectural framing, a metallic credit card floating vertically centered against a matte black void, a tokenization visualization effect with the card's right edge dissolving into geometric cyan data shards extending rightward, single cool cyan key light from upper left with warm amber rim light from upper right creating dramatic color contrast on the card edges, perfectly centered symmetrical composition with generous negative space, extreme shallow depth of field, clinical futuristic mood, subtle bloom on specular highlights along the card edge clean modern product photography, controlled studio lighting with cyan and amber accents, cool color temperature dominant with selective warm rim lighting, deep blue-black shadows with preserved detail, macro perspective emphasizing chip and hardware detail, subtle specular highlights on metallic and glass surfaces, minimalist composition with dark atmospheric depth, Apple keynote aesthetic, fintech product photography, tack-sharp focus, subtle bloom on bright elements, 4K ultra-sharp detail, futuristic cinematic still
```

**`emotional_beat`:** `revelation`

### Example 03 — B2B SaaS — Story (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `wide_establishing`
- `scenes.image_prompt`: `a stylized data center corridor rendered in a clinical futuristic style, rows of tall server racks extending into atmospheric blue depth, thin cyan indicator lights glowing on each rack at regular intervals, soft warm amber accent light on the right wall creating a subtle rim, architectural perspective looking down the corridor centerline, a single figure in silhouette walking away in the far distance, matte surfaces, subtle atmospheric depth fog, Blade Runner 2049 sensibility, clinical measured mood`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
wide angle establishing shot, full scene visible, environmental context, a stylized data center corridor rendered in a clinical futuristic style, rows of tall server racks extending into atmospheric blue depth, thin cyan indicator lights glowing on each rack at regular intervals, soft warm amber accent light on the right wall creating a subtle rim, architectural perspective looking down the corridor centerline, a single figure in silhouette walking away in the far distance, matte surfaces, subtle atmospheric depth fog, Blade Runner 2049 sensibility, clinical measured mood clean modern product photography, studio lighting with controlled reflections, cool color temperature with selective warm amber accents, deep blue-black shadows with preserved detail, subtle specular highlights on metallic and glass surfaces, extreme shallow depth of field, macro or architectural perspective, minimalist composition with generous negative space, Apple keynote aesthetic, Bloomberg Originals tech documentary look, Blade-Runner-2049-meets-Dieter-Rams sensibility, tack-sharp focus, subtle bloom on bright elements, 4K ultra-sharp detail, futuristic cinematic still
```

**`emotional_beat`:** `story`

### Example 04 — AI Tools Education — Data (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `symmetrical`
- `scenes.image_prompt`: `a stylized abstract visualization of interconnected translucent cyan geometric polyhedra floating in a matte black atmospheric void, subtle particles of light flowing between the nodes along barely-visible connecting lines, warm amber accent lights on three foreground nodes creating contrast, architectural perspective looking into the network of nodes, with thin cyan HUD corner brackets integrated into the composition, perfectly centered symmetrical composition with generous atmospheric negative space, clinical futuristic mood, subtle bloom on the brightest nodes`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
perfectly symmetrical composition, centered subject, architectural framing, a stylized abstract visualization of interconnected translucent cyan geometric polyhedra floating in a matte black atmospheric void, subtle particles of light flowing between the nodes along barely-visible connecting lines, warm amber accent lights on three foreground nodes creating contrast, architectural perspective looking into the network of nodes, with thin cyan HUD corner brackets integrated into the composition, perfectly centered symmetrical composition with generous atmospheric negative space, clinical futuristic mood, subtle bloom on the brightest nodes clean modern product photography, studio lighting with controlled reflections, cool color temperature with selective warm amber accents, deep blue-black shadows with preserved detail, subtle specular highlights on metallic and glass surfaces, extreme shallow depth of field, macro or architectural perspective, minimalist composition with generous negative space, Apple keynote aesthetic, Bloomberg Originals tech documentary look, Blade-Runner-2049-meets-Dieter-Rams sensibility, tack-sharp focus, subtle bloom on bright elements, 4K ultra-sharp detail, futuristic cinematic still
```

**`emotional_beat`:** `data`

### Example 05 — B2B SaaS — Tension (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `medium_closeup`
- `scenes.image_prompt`: `hands at a modern laptop keyboard in a dimly lit workspace, the laptop screen tilted slightly away so content is not visible but a soft cyan-blue glow reflects onto the hands and the desk surface, cool ambient light from upper left with a single subtle warm amber rim light from the right side, medium close-up with hands in tack-sharp focus and background workspace in atmospheric dark-blue bokeh, clinical mood of measured product analysis, subtle atmospheric depth`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
medium close-up shot, subject fills center frame, shoulders and above, hands at a modern laptop keyboard in a dimly lit workspace, the laptop screen tilted slightly away so content is not visible but a soft cyan-blue glow reflects onto the hands and the desk surface, cool ambient light from upper left with a single subtle warm amber rim light from the right side, medium close-up with hands in tack-sharp focus and background workspace in atmospheric dark-blue bokeh, clinical mood of measured product analysis, subtle atmospheric depth clean modern product photography, studio lighting with controlled reflections, cool color temperature with selective warm amber accents, deep blue-black shadows with preserved detail, subtle specular highlights on metallic and glass surfaces, extreme shallow depth of field, macro or architectural perspective, minimalist composition with generous negative space, Apple keynote aesthetic, Bloomberg Originals tech documentary look, Blade-Runner-2049-meets-Dieter-Rams sensibility, tack-sharp focus, subtle bloom on bright elements, 4K ultra-sharp detail, futuristic cinematic still
```

**`emotional_beat`:** `tension`

### Example 06 — Cybersecurity — Hook (Variant C)

**Inputs:**
- `scenes.composition_prefix`: `extreme_closeup`
- `scenes.image_prompt`: `macro close-up of fiber optic cable ends illuminated with pulses of cyan light traveling through the glass filaments, atmospheric dark blue-black void surrounding, thin warm amber rim light on the metallic cable housing from upper right, extreme shallow depth of field with the cable tips in tack-sharp focus, with subtle atmospheric depth fog, 45-degree angle perspective, clinical futuristic mood, subtle bloom on the brightest light pulses`
- `projects.style_dna` (Variant C — Cybersecurity)

**Resolved `prompt`:**

```
extreme close-up, tight crop on detail, shallow depth of field, macro close-up of fiber optic cable ends illuminated with pulses of cyan light traveling through the glass filaments, atmospheric dark blue-black void surrounding, thin warm amber rim light on the metallic cable housing from upper right, extreme shallow depth of field with the cable tips in tack-sharp focus, with subtle atmospheric depth fog, 45-degree angle perspective, clinical futuristic mood, subtle bloom on the brightest light pulses clean modern documentary photography, cool blue-dominant lighting with selective warm amber accents on key subjects, deep blue-black atmospheric shadows, extreme shallow depth of field with atmospheric depth fog, macro or architectural perspective, minimalist composition with dark negative space, Blade-Runner-2049 sensibility, cybersecurity documentary aesthetic, tack-sharp focus, subtle bloom on bright elements, 4K ultra-sharp detail, futuristic cinematic still, subtle atmospheric haze
```

**`emotional_beat`:** `hook`

### Example 07 — Cybersecurity — Data (Variant C)

**Inputs:**
- `scenes.composition_prefix`: `symmetrical`
- `scenes.image_prompt`: `a stylized visualization of encrypted data as translucent cyan geometric lattice structures floating in a matte black void, warm amber light piercing through one point in the lattice suggesting a breach, subtle atmospheric particles of light drifting, architectural perspective into the lattice depth, perfectly symmetrical centered composition, with thin cyan HUD corner brackets integrated, clinical futuristic mood of controlled threat, subtle atmospheric depth fog`
- `projects.style_dna` (Variant C)

**Resolved `prompt`:**

```
perfectly symmetrical composition, centered subject, architectural framing, a stylized visualization of encrypted data as translucent cyan geometric lattice structures floating in a matte black void, warm amber light piercing through one point in the lattice suggesting a breach, subtle atmospheric particles of light drifting, architectural perspective into the lattice depth, perfectly symmetrical centered composition, with thin cyan HUD corner brackets integrated, clinical futuristic mood of controlled threat, subtle atmospheric depth fog clean modern documentary photography, cool blue-dominant lighting with selective warm amber accents on key subjects, deep blue-black atmospheric shadows, extreme shallow depth of field with atmospheric depth fog, macro or architectural perspective, minimalist composition with dark negative space, Blade-Runner-2049 sensibility, cybersecurity documentary aesthetic, tack-sharp focus, subtle bloom on bright elements, 4K ultra-sharp detail, futuristic cinematic still, subtle atmospheric haze
```

**`emotional_beat`:** `data`

### Example 08 — B2B SaaS — Transition (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `leading_lines`
- `scenes.image_prompt`: `a stylized server-room corridor with lines of cyan indicator lights along the floor converging toward a bright illuminated vanishing point, thin warm amber rim lights on the server rack edges, atmospheric blue-dominant lighting with deep shadows at the frame edges, strong leading-lines composition with oblique low-angle perspective, atmospheric depth fog, clinical transitional mood, subtle bloom on the brightest indicator lights`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
composition using strong leading lines converging to subject, a stylized server-room corridor with lines of cyan indicator lights along the floor converging toward a bright illuminated vanishing point, thin warm amber rim lights on the server rack edges, atmospheric blue-dominant lighting with deep shadows at the frame edges, strong leading-lines composition with oblique low-angle perspective, atmospheric depth fog, clinical transitional mood, subtle bloom on the brightest indicator lights clean modern product photography, studio lighting with controlled reflections, cool color temperature with selective warm amber accents, deep blue-black shadows with preserved detail, subtle specular highlights on metallic and glass surfaces, extreme shallow depth of field, macro or architectural perspective, minimalist composition with generous negative space, Apple keynote aesthetic, Bloomberg Originals tech documentary look, Blade-Runner-2049-meets-Dieter-Rams sensibility, tack-sharp focus, subtle bloom on bright elements, 4K ultra-sharp detail, futuristic cinematic still
```

**`emotional_beat`:** `transition`

### Example 09 — AI Tools Education — Revelation (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `symmetrical`
- `scenes.image_prompt`: `a stylized translucent cyan sphere representing a language model floating centered in a matte black atmospheric void, subtle particles of light orbiting the sphere at varying distances, single warm amber rim light from the lower right creating a gentle crescent highlight on the sphere surface, extreme shallow depth of field with the sphere in tack-sharp focus and background in atmospheric fog, perfectly centered composition, clinical futuristic mood, subtle bloom on the brightest particle reflections`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
perfectly symmetrical composition, centered subject, architectural framing, a stylized translucent cyan sphere representing a language model floating centered in a matte black atmospheric void, subtle particles of light orbiting the sphere at varying distances, single warm amber rim light from the lower right creating a gentle crescent highlight on the sphere surface, extreme shallow depth of field with the sphere in tack-sharp focus and background in atmospheric fog, perfectly centered composition, clinical futuristic mood, subtle bloom on the brightest particle reflections clean modern product photography, studio lighting with controlled reflections, cool color temperature with selective warm amber accents, deep blue-black shadows with preserved detail, subtle specular highlights on metallic and glass surfaces, extreme shallow depth of field, macro or architectural perspective, minimalist composition with generous negative space, Apple keynote aesthetic, Bloomberg Originals tech documentary look, Blade-Runner-2049-meets-Dieter-Rams sensibility, tack-sharp focus, subtle bloom on bright elements, 4K ultra-sharp detail, futuristic cinematic still
```

**`emotional_beat`:** `revelation`

### Example 10 — Payment Tech — Resolution (Variant B)

**Inputs:**
- `scenes.composition_prefix`: `wide_establishing`
- `scenes.image_prompt`: `a wide architectural view of a modern fintech headquarters lobby at late evening, tall windows showing a dusk cityscape, warm interior tungsten pendant lights contrasting with cool evening exterior light, a single figure in silhouette walking across the lobby marble floor, matte architectural surfaces, horizontal composition with ceiling in upper third, subtle atmospheric depth, clinical measured mood of technological conclusion`
- `projects.style_dna` (Variant B)

**Resolved `prompt`:**

```
wide angle establishing shot, full scene visible, environmental context, a wide architectural view of a modern fintech headquarters lobby at late evening, tall windows showing a dusk cityscape, warm interior tungsten pendant lights contrasting with cool evening exterior light, a single figure in silhouette walking across the lobby marble floor, matte architectural surfaces, horizontal composition with ceiling in upper third, subtle atmospheric depth, clinical measured mood of technological conclusion clean modern product photography, controlled studio lighting with cyan and amber accents, cool color temperature dominant with selective warm rim lighting, deep blue-black shadows with preserved detail, macro perspective emphasizing chip and hardware detail, subtle specular highlights on metallic and glass surfaces, minimalist composition with dark atmospheric depth, Apple keynote aesthetic, fintech product photography, tack-sharp focus, subtle bloom on bright elements, 4K ultra-sharp detail, futuristic cinematic still
```

**`emotional_beat`:** `resolution`

### Example 11 — B2B SaaS — Data (Variant A)

**Inputs:**
- `scenes.composition_prefix`: `high_angle`
- `scenes.image_prompt`: `a top-down macro view of a modern circuit board with cyan indicator LEDs glowing at regular intervals across the board surface, warm amber specular highlights on the metallic component edges, extreme detail of the micro-structures visible, perfectly flat top-down angle, the board occupying center of frame with atmospheric dark-blue negative space at the edges, with thin cyan HUD corner brackets integrated into the composition, clinical precise mood, subtle bloom on the brightest LED points`
- `projects.style_dna` (Variant A)

**Resolved `prompt`:**

```
high angle shot looking down, bird's eye perspective, subject below, a top-down macro view of a modern circuit board with cyan indicator LEDs glowing at regular intervals across the board surface, warm amber specular highlights on the metallic component edges, extreme detail of the micro-structures visible, perfectly flat top-down angle, the board occupying center of frame with atmospheric dark-blue negative space at the edges, with thin cyan HUD corner brackets integrated into the composition, clinical precise mood, subtle bloom on the brightest LED points clean modern product photography, studio lighting with controlled reflections, cool color temperature with selective warm amber accents, deep blue-black shadows with preserved detail, subtle specular highlights on metallic and glass surfaces, extreme shallow depth of field, macro or architectural perspective, minimalist composition with generous negative space, Apple keynote aesthetic, Bloomberg Originals tech documentary look, Blade-Runner-2049-meets-Dieter-Rams sensibility, tack-sharp focus, subtle bloom on bright elements, 4K ultra-sharp detail, futuristic cinematic still
```

**`emotional_beat`:** `data`

### Example 12 — Cybersecurity — Tension (Variant C)

**Inputs:**
- `scenes.composition_prefix`: `low_angle`
- `scenes.image_prompt`: `a low-angle view of an imposing modern server rack tower in a data center at night, thin cyan indicator lights glowing upward along the rack face, single warm amber rim light from above catching the top of the tower, atmospheric dark blue void surrounding, dramatic low-angle perspective emphasizing scale, matte black surfaces, subtle atmospheric depth fog, clinical mood of looming institutional presence, subtle bloom on brightest indicator lights`
- `projects.style_dna` (Variant C)

**Resolved `prompt`:**

```
low angle shot looking up, subject towering above, dramatic perspective, a low-angle view of an imposing modern server rack tower in a data center at night, thin cyan indicator lights glowing upward along the rack face, single warm amber rim light from above catching the top of the tower, atmospheric dark blue void surrounding, dramatic low-angle perspective emphasizing scale, matte black surfaces, subtle atmospheric depth fog, clinical mood of looming institutional presence, subtle bloom on brightest indicator lights clean modern documentary photography, cool blue-dominant lighting with selective warm amber accents on key subjects, deep blue-black atmospheric shadows, extreme shallow depth of field with atmospheric depth fog, macro or architectural perspective, minimalist composition with dark negative space, Blade-Runner-2049 sensibility, cybersecurity documentary aesthetic, tack-sharp focus, subtle bloom on bright elements, 4K ultra-sharp detail, futuristic cinematic still, subtle atmospheric haze
```

**`emotional_beat`:** `tension`

---

## 8. QA Checklist — Register 04 Image Generation

- [ ] `projects.style_dna` contains one of Variant A, B, or C — OR `prompt_templates` has the register-keyed row in place
- [ ] `prompt_templates` has `negative_additions_register_04` row installed
- [ ] `prompt_templates` has `metadata_prompt_register_04` row installed
- [ ] `WF_SCRIPT_GENERATE.json` → `Prepare Metadata Prompt` node configured for register lookup
- [ ] `WF_IMAGE_GENERATION.json` → `Fire All Scenes` node configured for register-specific negative append
- [ ] Sample 3 resolved prompts before full run — verify Apple keynote OR Blade Runner 2049 anchor + cool+warm lighting specification + tack-sharp + subtle bloom present
- [ ] Sample negative_prompt field — verify Universal Negative + Register 04 additions
- [ ] `image_size` is `landscape_16_9` (or `portrait_9_16` for shorts)
- [ ] Endpoint resolves to `https://queue.fal.run/fal-ai/bytedance/seedream/v4.5/text-to-image`
- [ ] Visual spot-check first 5 returned images: cool blue dominant palette, warm amber accent rim lights visible, deep atmospheric shadows, tack-sharp macro detail
- [ ] No warm-golden Kodak Portra aesthetic bleeding through
- [ ] No nostalgic/historical period aesthetic bleeding through
- [ ] No desaturated noir aesthetic bleeding through
- [ ] No heavy film grain (should be near-zero grain)
- [ ] HUD corner brackets visible in 70%+ of scenes where baked-in prompt requested them
- [ ] composition_prefix distribution weighted toward extreme_closeup + symmetrical + wide_establishing + leading_lines
- [ ] No identifiable faces generated

---

## 9. Source Files

- `workflows/WF_IMAGE_GENERATION.json` — Fire All Scenes node (register-aware Style DNA and negative prompt assembly)
- `workflows/WF_SCENE_IMAGE_PROCESSOR.json` — Fal.ai HTTP call (unchanged from base pipeline)
- `workflows/WF_SCRIPT_GENERATE.json` — Prepare Metadata Prompt node (now looks up `metadata_prompt_register_04`)
- `VisionGridAI_Platform_Agent.md` — Style DNA base templates (unchanged), Composition Library (unchanged), Universal Negative (unchanged)
- `directives/04-image-generation.md` — SOP reference
- `IMAGE_GENERATION_PROMPTS.md` — base pipeline reference
- `vision_gridai_registers/REGISTER_04_SIGNAL_TECH.md` — cinematic grammar playbook for this register
