# Thumbnail Generation — Current Prompts & Fidelity Audit

Source: `workflows/WF_THUMBNAIL_GENERATE.json` (live n8n: `7GqpEAug8hxxU7f6`)
Sample analyzed: topic 4 *"The Healthcare Card Secret: How $50K Can Save You $5000 a Year"* (`75d18eca-23c0-4368-84e0-cab306f3df0d`, project `super_au`, register `REGISTER_01_ECONOMIST`, country_target `AU`)
v1 captured 2026-04-29T21:42:51Z; v3 (post-fix) captured 2026-04-30T18:44Z.

> **Status**: All three P0/P1 prompt-side bugs (§6.1, §6.2, §6.3) are **fixed** in live n8n as of 2026-04-30. See §9 for the v3 evidence and what's still pending (compositor-side §6.4 + Seedream-baseline §6.5).

---

## 1. Pipeline architecture

```
Webhook → Fetch Topic
       → Generate Concepts (Claude Sonnet 4 — produces 2 concepts)
       → Generate Images (Fal.ai Seedream 4.5 — 1-2 PNGs per concept)
       → Compose Thumbnails (FFmpeg drawbox + drawtext, NOT Sharp/Jimp)
       → Upload to Drive
       → Update Supabase + log → Trigger WF_THUMBNAIL_SCORE
```

Per topic: 2 thumbnail variants. Style choices: `single_face`, `dual_face`, `scene_overlay`. Compositor uses **two fixed palettes** keyed by variant index:

| Variant | textColor | emphasisColor | dividerColor |
|---|---|---|---|
| A (v=0) | white | `yellow` | `255:230:0` |
| B (v=1) | white | `#FF2020` | `255:32:32` |

---

## 2. The Claude meta-prompt (system + user) — from `Generate Concepts` node

The user prompt sent to `claude-sonnet-4-20250514` (max_tokens=3000) is built dynamically. Below is the **literal string** that was sent for topic 4, fully expanded with niche-emotion substitutions and the AU country overlay appended:

````text
You are an elite YouTube thumbnail strategist for documentary channels (12%+ CTR).

VIDEO TITLE: "The Healthcare Card Secret: How $50K Can Save You $5000 a Year"
HOOK: "Realizing you're missing thousands in healthcare benefits because no one explained the Healthcare Card income thresholds properly"
NICHE: "super_au"

You must generate 2 thumbnail concepts. For EACH concept, first choose the best STYLE:

STYLE OPTIONS:
1. "single_face" — One person's face filling 65% of RIGHT side of frame. Left third is empty dark space for text overlay. Best for: personal stories, shocking reveals.
2. "dual_face" — Two opposing faces side by side with dark divider. Best for: conflict stories, betrayal, legal battles, investigations.
3. "scene_overlay" — Wide cinematic scene as background with a person's face overlaid in lower-right corner (40% of frame). Upper-left quadrant darker for text. Best for: location-based stories, historical events, crime scenes.

RULES FOR CHOOSING STYLE:
- If the title implies TWO opposing parties or conflict -> dual_face
- If the title references a specific place, event, or scene -> scene_overlay
- If the title is about a single person's experience or a shocking fact -> single_face
- Concept A and Concept B SHOULD use DIFFERENT styles for variety
- If both concepts naturally fit the same style, that's OK, but prefer variety

For EACH concept provide:

1. style: "single_face" | "dual_face" | "scene_overlay"

2. text_words: 2-3 most POWERFUL words from the title. ALL CAPS. Skip articles/prepositions. Pick nouns/verbs with emotional punch.

3. emphasis_index: Which word (0-based) gets color emphasis.

4. image_prompts: Array of Fal.ai Seedream 4.0 prompts.
   - single_face: 1 prompt (1280x720 landscape, face fills 65% of RIGHT side, left third empty dark for text)
   - dual_face: 2 prompts (each 640x720 portrait, face fills 80%)
     - First prompt = left person (the antagonist/aggressor/prosecutor)
     - Second prompt = right person (the victim/defendant/detective)
   - scene_overlay: 2 prompts
     - First = wide 1280x720 scene (NO people, cinematic establishing shot, upper-left darker for text)
     - Second = 480x480 tight face portrait for overlay

   === CRITICAL: PHOTOREALISTIC IMAGE RULES (MANDATORY) ===
   Every prompt MUST start with: "Ultra-realistic DSLR photograph, shot on Canon EOS R5 85mm f/1.2"
   Every prompt MUST end with: "8K resolution, RAW photograph, photorealistic, NOT illustration, NOT painting, NOT sketch, NOT anime, NOT digital art" followed by crop dimensions

   Lighting (MANDATORY in every face prompt):
   - Studio rim lighting from behind creating golden edge light on hair and shoulders
   - Dramatic key light from 45 degrees casting sharp Rembrandt triangle shadow on far cheek
   - Catch lights visible in both eyes (critical for engagement)

   Color grade: dark cinematic background with teal-orange color grade (Hollywood blockbuster standard)
   Detail: skin pores, fine facial hair, and micro-details visible. Photojournalistic quality.
   NO text, NO watermarks, NO logos, NO words of any kind in the image
   === END PHOTOREALISTIC RULES ===

   Emotion guidance per niche:
   - single_face concept A: jaw-dropped shock, eyes wide, mouth agape, one tear rolling down cheek
   - single_face concept B: cold calculating fury, narrowed eyes, clenched jaw, veins visible on temple
   - dual_face left person: sinister smirk, one eyebrow raised, knowing look, slight head tilt
   - dual_face right person: devastated shock, wide tearful eyes, hand over mouth, crumbling composure
   - scene_overlay background: a shattered family photo frame on a dark wooden table, broken glass, dramatic volumetric light beam, teal-orange color grade

Return ONLY valid JSON:
{"concepts":[{"style":"dual_face","text_words":["WORD1","WORD2"],"emphasis_index":0,"image_prompts":["prompt for left face...","prompt for right face..."]},{"style":"single_face","text_words":["WORD1","WORD2"],"emphasis_index":1,"image_prompts":["prompt for single face..."]}]}

=== AU COUNTRY CONTEXT ===

[country_compliance_block from render_country_blocks RPC]

[country_terminology_block]

[country_calendar_context]

[country_demonetization_constraints]
````

The niche-emotion strings come from a hard-coded map with three entries — `betrayal_revenge`, `legal_court`, `true_crime`. **`super_au` does not match any of those keys, so the niche silently falls back to `betrayal_revenge` emotions** (sinister smirk antagonist + devastated tearful victim) for a healthcare-benefits topic.

The production register lookup populates a `registerGrade` variable (e.g. for `REGISTER_01_ECONOMIST` it resolves to *"muted editorial documentary color grade with controlled warmth, amber midtones, subtle shadow cooling (Johnny Harris / Wendover documentary look)"*) — but **this variable is never inserted into the prompt text**. The prompt hard-codes `"teal-orange color grade (Hollywood blockbuster standard)"` regardless of register.

---

## 3. The actual Seedream prompts Claude returned for topic 4

Claude chose `dual_face` for variant A and `single_face` for variant B (both styles match the prompt's variety guidance). Words:

| Variant | Style | text_words | emphasis_index |
|---|---|---|---|
| A | dual_face | `["$50K", "SECRET"]` | 1 (= "SECRET" emphasized) |
| B | single_face | `["HEALTHCARE", "SAVE"]` | 0 (= "HEALTHCARE" emphasized) |

### Variant A — dual_face

**Left face prompt** (sent to `fal-ai/bytedance/seedream/v4/text-to-image`, image_size 640×720):

> Ultra-realistic DSLR photograph, shot on Canon EOS R5 85mm f/1.2, middle-aged Australian government official in suit with sinister smirk, one eyebrow raised, knowing look, slight head tilt, studio rim lighting from behind creating golden edge light on hair and shoulders, dramatic key light from 45 degrees casting sharp Rembrandt triangle shadow on far cheek, catch lights visible in both eyes, dark cinematic background with teal-orange color grade, skin pores and micro-details visible, photojournalistic quality, 8K resolution, RAW photograph, photorealistic, NOT illustration, NOT painting, NOT sketch, NOT anime, NOT digital art, cropped 640x720 portrait, face fills 80%

**Right face prompt** (640×720):

> Ultra-realistic DSLR photograph, shot on Canon EOS R5 85mm f/1.2, devastated middle-aged Australian woman with wide tearful eyes, hand over mouth, crumbling composure, holding Medicare card, studio rim lighting from behind creating golden edge light on hair and shoulders, dramatic key light from 45 degrees casting sharp Rembrandt triangle shadow on far cheek, catch lights visible in both eyes, dark cinematic background with teal-orange color grade, skin pores and micro-details visible, photojournalistic quality, 8K resolution, RAW photograph, photorealistic, NOT illustration, NOT painting, NOT sketch, NOT anime, NOT digital art, cropped 640x720 portrait, face fills 80%

### Variant B — single_face

> Ultra-realistic DSLR photograph, shot on Canon EOS R5 85mm f/1.2, shocked middle-aged Australian man with jaw-dropped expression, eyes wide, mouth agape, one tear rolling down cheek, holding Medicare Healthcare Card, positioned on RIGHT side filling 65% of frame, left third empty dark space, studio rim lighting from behind creating golden edge light on hair and shoulders, dramatic key light from 45 degrees casting sharp Rembrandt triangle shadow on far cheek, catch lights visible in both eyes, dark cinematic background with teal-orange color grade, skin pores and micro-details visible, photojournalistic quality, 8K resolution, RAW photograph, photorealistic, NOT illustration, NOT painting, NOT sketch, NOT anime, NOT digital art, cropped 1280x720 landscape

---

## 4. Renders

- **Variant A (primary)**: <https://drive.google.com/file/d/1lQi0Y7cCBQNX8EIYpuk_yxscn_U7MUSa/view>
- **Variant B**: <https://drive.google.com/file/d/1JbKOy_nxiD8StWz22KzcE488_x3i7lDJ/view>

Local copies: `C:\tmp\aussiestack\thumbnails\topic4_*.png` (1280×720 PNG, 1.0 MB / 0.7 MB).

---

## 5. Prompt vs. render — fidelity audit

### Variant A — dual_face

| Prompt element | Rendered | Verdict |
|---|---|---|
| Government official, suit, **sinister smirk** | Older man in dark suit/coat with mild knowing smile | ⚠️ Subdued — "sinister" lost, smile reads as friendly |
| **One eyebrow raised** | Both brows level | ❌ Missing |
| **Slight head tilt** | Slight tilt present | ✅ |
| "Australian" cue | Generic Western middle-aged man | ⚠️ Demographic stripped |
| Devastated woman, **wide tearful eyes** | Damp eyes, distressed but composed | ⚠️ "Tearful" lost — no visible tears |
| **Hand over mouth, crumbling composure** | Hand at mouth, distressed expression | ✅ Pose hit, "crumbling" reads as "concerned" |
| **Holding Medicare card** | Card visible but small + partly hidden | ⚠️ Present but not the focal element |
| **Studio rim lighting from behind** | Warm rim on woman; cooler/teal rim on man | ⚠️ Asymmetric — only half-applied |
| **Sharp Rembrandt triangle shadow** | General modeling, no canonical triangle | ❌ Missing |
| **Catch lights in both eyes** | Soft catch lights | ⚠️ Present but soft, not sharp specular |
| Teal-orange color grade | Present | ✅ |
| **Skin pores, fine facial hair, micro-details** | AI-smooth skin | ❌ Big miss |
| 8K, RAW DSLR, NOT illustration/painting/etc. | Slightly painterly cinematic | ⚠️ Photorealistic but with AI-baseline smoothness |
| Each face fills 80% of 640×720 | Faces ~75-80% | ✅ |
| Variant A emphasis = `yellow` (per palette[0]) | "SECRET" appears red-orange, not bright yellow | ❌ **Likely bug** — see §6.4 |

### Variant B — single_face

| Prompt element | Rendered | Verdict |
|---|---|---|
| **Jaw-dropped, eyes wide, mouth agape** | Wide eyes, mouth slightly open | ⚠️ Surprised, not jaw-dropped |
| **One tear rolling down cheek** | No tears visible | ❌ Missing |
| Holding Healthcare Card | Holding card | ✅ |
| **Positioned on RIGHT side filling 65%, left third empty dark space** | Subject roughly center-right, body extends into left | ❌ Layout violated — text crowds the body |
| Studio rim lighting | Teal/green back-glow on hair | ⚠️ Present but teal not "golden" |
| Rembrandt triangle | Stylized modeling, no triangle | ❌ |
| Catch lights | Visible in eyes | ✅ |
| Skin pores / fine facial hair | Smoothed | ❌ |
| Variant B emphasis = `#FF2020` red | "HEALTHCARE" red | ✅ |

---

## 6. Loss-of-intelligence findings (severity-ranked)

### 6.1 🔴 P0 — Code bug: production_register grade is fetched but never used

The `Generate Concepts` node fetches the topic's `production_register` and computes a `registerGrade` string with a per-register override map (e.g. `REGISTER_01_ECONOMIST` → *"muted editorial documentary color grade … Johnny Harris / Wendover documentary look"*). It then constructs `promptText` and **hard-codes** the line:

```
Color grade: dark cinematic background with teal-orange color grade (Hollywood blockbuster standard)
```

`registerGrade` is calculated and discarded. Every thumbnail across every project gets the same generic teal-orange grade. Topic 4 — supposed to be in editorial-documentary register — got Hollywood-blockbuster instead. **The asymmetry between the cinematic video color science (per-register, fully applied) and the thumbnail color science (universal teal-orange) is visible to viewers** and breaks brand cohesion at the click moment.

**Fix**: substitute `${registerGrade}` into the system prompt instead of the hard-coded string.

### 6.2 🔴 P0 — Niche emotion fallback is silently wrong for `super_au`

`nicheEmotions` only defines three keys: `betrayal_revenge` / `legal_court` / `true_crime`. The niche `super_au` (Australian superannuation + Centrelink benefits) doesn't match any pattern test (`legal|court|crime|serial|heist|unsolved`) and **silently falls back to `betrayal_revenge`** — yielding "sinister smirk government official" as the antagonist + "devastated tearful woman" as the victim for a video about *missing healthcare card benefits*. That's why the rendered thumbnail looks like a true-crime / political-scandal frame instead of a benefits-explainer.

**Fix**: add at least three more emotion profiles — `finance_education`, `government_benefits`, `transformation` — and broaden the fallback logic. For `super_au` specifically, the antagonist should be *"the system that hides this from you"* (not a person), and the victim emotion should read as *"determined to claim what's owed"* rather than *"crumbling"*.

### 6.3 🟠 P1 — Demographic and compliance miss for AU content

Every prompt says *"Australian"* (man / woman / official). Seedream renders generic middle-aged Western faces with no Australian cultural cue. For an AU finance channel:
- Aboriginal & Torres Strait Islander, Asian-Australian, Pacific Islander representation isn't being rendered, even when prompted as a generic *"Australian"*.
- The "sinister government official" antagonist next to a "$50K SECRET" tag is **adjacent to defamation territory** under AU law if the rendered face resembles any real official. The pipeline doesn't run a recognition check.
- The AU country overlay (compliance + terminology + calendar + demonetization blocks) is appended to *Claude's* prompt but Claude's output (the per-panel image prompts) doesn't visibly carry any AU compliance flag forward, so the gating exists at concept-level, not at image-prompt level.

**Fix**: add explicit `representation` directives ("diverse Australian features, e.g. Aboriginal heritage / Asian-Australian / Pacific Islander, not a generic Western face"), and a hard rule for finance niches that bans any "official"-coded antagonist character.

### 6.4 🟠 P1 — Variant A emphasis color mismatch

The compositor sets `pal = palettes[v]` per variant. Variant A → palette[0] → `emphasisColor: 'yellow'`. The rendered "SECRET" reads as deep red-orange, not bright yellow (`#FFFF00`). Either:
- FFmpeg's `drawtext fontcolor=yellow` is being unintentionally tinted by the surrounding teal-orange grade and reads warm,
- Or the palette index swapped at render time (latent bug),
- Or the emphasis color was overridden post-hoc.

Both rendered variants visually use red-orange emphasis, which means **the A/B test is testing nothing on color** — both look the same. If the goal is genuine A/B variance, this needs verification with a controlled render (e.g. render variant A with a known-pure-yellow word and confirm pixel color in the output).

### 6.5 🟠 P1 — Seedream baseline ignores "RAW DSLR" + "skin pores" instructions

The MANDATORY photorealistic rules block lists 5 explicit `NOT` items and demands skin pores, fine facial hair, photojournalistic quality. Every render delivers **AI-smoothed skin** with cinematic-painterly grading rather than RAW DSLR texture. This is a Seedream 4.5 model-baseline issue — the model has learned a "cinematic still" style that smooths away texture detail.

**Mitigation options**:
- Switch to a more photorealistic model for thumbnails (Flux Pro 1.1 Ultra, Ideogram 3.0, or Imagen 3) and keep Seedream for cinematic in-video stills.
- Append a `--style raw` or equivalent reweight if the endpoint supports it.
- Post-process with a film-grain + texture-detail pass via FFmpeg.

### 6.6 🟠 P1 — Single-face layout instruction not enforced

Variant B prompt explicitly says *"face fills 65% of RIGHT side of frame, left third empty dark space"* so the FFmpeg compositor can drop text into the dark left third. Seedream ignored the spatial instruction and centered the subject. The compositor then placed text at `x=40` regardless — overlapping the subject's body.

**Fix**: detect the actual face/subject bounding box after generation (saliency map or simple darkness scan on the left third) and re-roll if the dark zone isn't there. Or compose with image-to-image guidance using a binary mask that constrains where Seedream may place the subject.

### 6.7 🟡 P2 — Specific prop instructions silently dropped

Prompts request "medical bills" (variant B), "Medicare card" (variant A right face) — Seedream renders one of them or a generic stand-in. There's no validation that requested props are present. For thumbnail integrity, prop-presence matters more than for in-video stills.

### 6.8 🟡 P2 — No mobile-readability / text-collision audit

Pipeline never renders the 320×180 mobile preview that YouTube actually shows on phone search. No test that hero text is readable at that size. No detection that the text layer collides with face-area or important props.

### 6.9 🟡 P2 — A/B variety enforcement is soft

Claude is told *"Concept A and B SHOULD use DIFFERENT styles for variety"* but the validation only checks the style is one of three valid values — it doesn't enforce that A.style ≠ B.style. If both come back as `single_face`, both will render as single_face. (Topic 4 happened to get one of each, so the issue didn't bite this time.)

### 6.10 🟢 P3 — Cosmetic: docs out of sync

`CLAUDE.md`, `skills.md`, `GUIDE.md` claim text overlay is via Sharp/Jimp. Actual implementation is FFmpeg `drawtext`. Doc patch needed regardless of any other change.

---

## 7. Summary scorecard

| Category | Score | Note |
|---|---|---|
| Concept generation (Claude) | 8 / 10 | Style choice + word selection is sharp; emotion-profile mapping is the weak link |
| Image generation (Seedream) | 5 / 10 | Hits the cinematic look; misses RAW DSLR realism, layout instructions, tears, prop fidelity |
| Compositor (FFmpeg) | 7 / 10 | Reliable text overlay + gradient + dual-face split; misses palette differentiation between A/B and ignores Seedream's actual subject placement |
| Niche / brand fit | 4 / 10 | Hard-coded Hollywood teal-orange overrides per-register grade; `super_au` falls back to `betrayal_revenge` emotions |
| Compliance / safety | 4 / 10 | "Sinister government official" antagonist for AU finance content is risky; no real-person-likeness check |
| **Overall** | **5.5 / 10** | Working but leaves significant intelligence on the table — three concrete code-level bugs (§6.1, §6.2, §6.4) before any model-baseline issues |

---

## 8. Highest-leverage fixes (one-line each)

1. **§6.1** — substitute `${registerGrade}` into the meta-prompt; stop hard-coding "teal-orange Hollywood".
2. **§6.2** — add `finance_education` / `government_benefits` / `transformation` entries to `nicheEmotions` and route `super_au` to one of them.
3. **§6.4** — render a controlled smoke-test thumbnail and confirm `palette[0]` emphasis truly renders yellow; if not, fix the palette mapping.
4. **§6.6** — post-generation, sample the left-third pixels for darkness; re-roll Seedream if the layout instruction wasn't honored.
5. **§6.5** — switch the thumbnail model to Flux Pro 1.1 Ultra or Ideogram 3.0 (keep Seedream for in-video) for true RAW-DSLR skin texture.
6. **§6.3** — add explicit `representation` directives + hard-block "official" antagonist character for AU finance topics.

These six are independent fixes — any subset can be applied without breaking the rest of the pipeline.

---

## 9. Fix landed — v3 evidence (2026-04-30)

Live n8n workflow `WF_THUMBNAIL_GENERATE` (`7GqpEAug8hxxU7f6`) was patched 2026-04-30T18:43Z to fix §6.1, §6.2, §6.3, plus partial §6.5 / §6.6. Backup of pre-fix workflow at `/root/backups/wf-thumbnail-prompt-fix-*` on the VPS.

### What changed in `Generate Concepts`

1. **§6.1 fixed** — `registerGrade` is now interpolated into the system prompt: `'Color grade: dark cinematic background with ' + registerGrade + '\n'`. The hard-coded *"teal-orange (Hollywood blockbuster standard)"* line is gone.
2. **§6.1 follow-up fix** — `Fetch Topic` SELECT clause now also includes `production_register,register_era_detected`. Without this, the previous select stripped the column so `topic.production_register` was always `undefined`, defeating the registerGrade lookup. Two places in the JSON, both patched.
3. **§6.2 fixed** — added 5 new niche emotion profiles: `finance_education`, `government_benefits`, `transformation`, `tech_explainer`, `historical_documentary`. Each carries an `antagonist_kind: 'human' | 'abstract'` flag.
4. **§6.2 routing** — niche-string → profile mapping expanded to ~35 keywords. Default fallback is now `historical_documentary` (safe editorial) instead of `betrayal_revenge`. AU-country-specific override forces `government_benefits` when an AU finance/super/centrelink/tax niche would otherwise match `betrayal_revenge` or `legal_court`.
5. **§6.3 fixed** — country-aware representation block (AU and US so far). Mandates diverse heritage casting and explicitly bans depicting real public officials. For abstract-antagonist niches, the system prompt also flips the dual_face framing from "antagonist vs victim" to "past-self vs present-self / before vs after".
6. **§6.5 strengthened** — photorealism mandate now lists explicit anti-smoothing tokens: visible skin pores on cheeks/forehead/nose, stray hair fibers, fine facial hair stubble or peach fuzz, moles, fine lines, faint redness, *"NOT plasticized, NOT softened, NOT retouched"*. Negative-prompt list extended with `NOT 3D render, NOT cinematic still`.
7. **§6.6 partial** — every `single_face` prompt now must include the literal phrase *"subject's face is centered at horizontal position 900 of 1280, the entire left 480 pixels are pitch-black empty negative space with NO body parts NO props NO objects"*. Seedream still doesn't fully obey, but the intent now reaches the model.
8. **Telemetry added** — Generate Concepts now returns `niche_profile_used`, `country_target`, `register_id`, `register_grade_used` in its output JSON for downstream verification.

### Smoke-test evidence — same topic 4, before vs after

| Dimension | v1 (2026-04-29 21:42Z) | v3 (2026-04-30 18:44Z) |
|---|---|---|
| niche_profile_used | `betrayal_revenge` (silent fallback) | `government_benefits` |
| register_grade_used | `teal-orange color grade (Hollywood blockbuster standard)` (hard-coded) | `muted editorial documentary color grade with controlled warmth, amber midtones, subtle shadow cooling (Johnny Harris / Wendover documentary look)` (REGISTER_01_ECONOMIST) |
| dual_face left character | "middle-aged Australian government official in suit with sinister smirk" — generic Western white face | "tired Aboriginal Australian woman in her 40s at kitchen table, brows furrowed, palms up over confusing Healthcare Card application form, exhausted by the system" |
| dual_face right character | "devastated middle-aged Australian woman with wide tearful eyes, hand over mouth, crumbling composure" — generic Western white face | "same Aboriginal Australian woman now informed and at ease, holding Healthcare Card with small confident smile, looking forward with calm agency" |
| single_face character | "shocked middle-aged Australian man, jaw-dropped" — generic Western white face | "Asian-Australian man in his 30s with wide-eyed quiet realization, hand on chin, eyes scanning Healthcare Card benefits letter" |
| single_face layout instruction | "positioned on RIGHT side filling 65%, left third empty dark space" — vague | "subject's face is centered at horizontal position 900 of 1280, the entire left 480 pixels are pitch-black empty negative space with NO body parts NO props NO objects" — pixel-explicit |
| Skin-texture instruction | "skin pores and micro-details visible" | "visible skin pores on cheeks, forehead, and nose, stray hair fibers, fine facial hair peach fuzz, moles, fine lines, faint redness, NOT plasticized, NOT softened" |
| Antagonist defamation risk | High — "sinister government official" stand-in adjacent to "$50K SECRET" | None — both faces are sympathetic protagonists; antagonist is the form, not a person |
| Render quality (skin) | AI-smoothed | Visibly more natural — pores, age lines, beard stubble visible (variant B clearly shows real eye/skin texture) |
| Render quality (color) | Hollywood teal-orange | Documentary editorial warm grade matching the in-video register |
| Variant style variety | A=dual_face, B=single_face | A=dual_face, B=single_face (held) |

### v3 thumbnails

- **Variant A (primary)** — `1Z83XZjJnKD0Dp0VGZmzRjlogXHTGkCxr` — <https://drive.google.com/file/d/1Z83XZjJnKD0Dp0VGZmzRjlogXHTGkCxr/view>
- **Variant B** — `1DeB6tabE8p0LFiOucpDVuaShhzeN9mhw` — <https://drive.google.com/file/d/1DeB6tabE8p0LFiOucpDVuaShhzeN9mhw/view>

### What's still pending

- **§6.4** (compositor — palette emphasis color renders same in A and B): not addressed by this prompt-side patch. Lives in the `Compose Thumbnails` FFmpeg `drawtext` node. Needs a separate fix.
- **§6.5** (Seedream baseline smoothing): partially mitigated by stronger anti-smoothing tokens — visibly better but not 100% RAW-DSLR. True fix requires switching the thumbnail model to Flux Pro 1.1 Ultra / Ideogram 3.0.
- **§6.6** (Seedream layout disobedience): partially mitigated by pixel-explicit layout instructions — variant B in v3 shows the document occupying the left zone instead of the body, which is enough for the compositor's `x=40` text placement to land on a darkable surface but not on pure black. Full fix needs post-generation darkness check + re-roll, or image-to-image with hard masks.
- **§6.7** (prop fidelity), **§6.8** (mobile-readability gate), **§6.9** (variety enforcement), **§6.10** (docs out of sync): unchanged.

### Updated scorecard

| Category | v1 score | v3 score | Note |
|---|---|---|---|
| Concept generation (Claude) | 8 / 10 | **9.5 / 10** | Niche routing fixed, register grade flowing, country representation working |
| Image generation (Seedream) | 5 / 10 | **6.5 / 10** | Skin texture visibly improved; layout still partially disobeyed |
| Compositor (FFmpeg) | 7 / 10 | 7 / 10 | Unchanged (§6.4 not yet fixed) |
| Niche / brand fit | 4 / 10 | **9 / 10** | Per-register grade + per-niche emotion + country representation all working |
| Compliance / safety | 4 / 10 | **9 / 10** | No more "sinister official" character; abstract antagonist for finance/benefits niches |
| **Overall** | **5.5 / 10** | **8.2 / 10** | Three P0/P1 prompt-side bugs eliminated; remaining items are compositor-side or model-baseline |
