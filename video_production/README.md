# VISION GRIDAI — PRODUCTION REGISTERS

## Master Index & Selection Guide

Five production registers for the Vision GridAI pipeline. Each is a complete, standalone playbook covering image generation, motion, color grade, overlays (via image generation and FFmpeg), typography, transitions, and audio design. All registers respect the hard constraint: **no shaky motion, no fast motion**. Camera moves are slow (5–13 seconds per scene), eased, and sub-pixel smooth across the entire library.

---

## Terminology — Three-Layer Visual Architecture

This playbook introduces **Production Register** as a distinct concept from the **Style DNA** defined in `CLAUDE.md`. They operate at different layers and must not be confused.

### Layer 1 — Project (channel)

The channel or business line. CardMath, a future Operscale channel, a crime storytelling channel, a family-drama channel — each is a Project. Projects are locked at setup time and do not change per video.

### Layer 2 — Style DNA (per-project LOCKED visual identity)

Defined in `CLAUDE.md`. A LOCKED fingerprint composed of `composition_prefix + scene_subject + style_dna`, appended to every Seedream image prompt across every video in the Project. This is what makes every CardMath video feel like CardMath, even across different topics.

Style DNA concerns: recurring visual motifs, brand-adjacent composition rules, signature lighting, signature props, the character of the Project's visual voice.

### Layer 3 — Production Register (per-video cinematic register)

Defined in this playbook. One of five options chosen per-video (or per-chapter for mixed-register videos). Production Register defines the *cinematic grammar* of this specific video: the color grade, motion profile, typography system, overlay treatment, audio register.

Production Register concerns: how slowly the camera moves, how dark the shadows sit, how the grain reads, whether the video feels warm or cool, editorial or investigative.

### How the two layers compose at prompt-build time

The prompt assembler for Seedream 4.5 composes in this order:

```
[scene_subject_prompt]
 + [production_register_anchors]   ← from this playbook
 + [project_style_dna]               ← from CLAUDE.md
 + [global_universal_negative]       ← from n8n static data
 + [register_specific_negative]      ← from this playbook
```

### Conflict resolution

When Production Register and Style DNA conflict:

- **Production Register wins on cinematic register** — color grade, motion, typography, overlays, audio. These are per-video decisions and must feel right for the piece.
- **Style DNA wins on subject-matter presentation** — recurring visual motifs, brand-adjacent composition rules, signature props. These define the Project and cannot drift.

Example: CardMath's Style DNA locks "financial documentary aesthetic with metal-card product motifs." For a fraud exposé video, the chosen Production Register is 03 (Noir). The Noir register overrides the warm grade and measured motion (cinematic register), while Style DNA still ensures the metal-card motif and financial-documentary composition language show up (subject matter).

### Negative prompt merge strategy

CLAUDE.md stores a **global universal negative prompt** in n8n workflow static data, applied to every Fal.ai call across every Project and Register. Each Production Register in this playbook specifies an **additional register-specific negative prompt** that appends to (never replaces) the global universal.

The final negative prompt sent to Seedream 4.5 is:

```
{global_universal_negative_from_n8n_static_data}, {register_specific_negative_from_this_playbook}
```

Both lists are included in full. Duplicates are deduplicated at string-assembly time in the workflow.

---

## The Five Registers

| # | Register | Cinematic Grammar | Best For | Reference |
|---|---|---|---|---|
| 01 | **THE ECONOMIST** | Documentary explainer | Personal finance, legal/tax/insurance explainers, B2B SaaS, real-estate analysis, mortgage education | Johnny Harris, Wendover, Polymatter |
| 02 | **PREMIUM AUTHORITY** | Luxury editorial | Premium credit cards, luxury real estate, high-net-worth finance, wealth management | Bloomberg Originals, Ben Felix, Rolex films |
| 03 | **INVESTIGATIVE NOIR** | True-crime investigation | Crime, fraud, legal scandal, predatory lending, tax-evasion exposés, revenge stories | LEMMiNO, Netflix Dirty Money, Chernobyl |
| 04 | **SIGNAL (TECH FUTURIST)** | Tech/fintech precision | B2B SaaS, AI tools, cybersecurity, crypto, payment tech, AI underwriting | ColdFusion, Cleo Abram, Apple keynotes |
| 05 | **ARCHIVE** | Historical/biographical/intimate | Founder stories, company origins, real-estate-empire histories, family drama, retrospective revenge stories | Magnates Media, Ken Burns, Business Casual |

---

## Niche → Register Mapping

Your Projects span multiple niches. Below is the recommended primary Register for each niche, with secondary options for specific content types.

| Niche | Primary Register | Secondary (for specific content) |
|---|---|---|
| Personal Finance & Investing | 01 Economist | 02 Premium (for HNW segments) |
| Credit Card Reviews (CardMath) | 01 Economist | 02 Premium (for luxury cards), 03 Noir (for scam exposés), 05 Archive (for histories) |
| Legal, Tax & Insurance | 01 Economist | 03 Noir (for fraud/scandal) |
| Business, B2B SaaS, Make Money Online | 01 Economist | 04 Signal (for SaaS/AI tool content) |
| Real Estate & Mortgage | 01 Economist | 02 Premium (for luxury), 05 Archive (for mogul bios) |
| Crime | 03 Noir | 05 Archive (for historical cases) |
| Revenge Stories | 03 Noir (contemporary) | 05 Archive (past-tense slow burn) |
| Family Drama | 05 Archive | 03 Noir (for dark family secrets) |

---

## How to Choose — Decision Tree

```
Is the content about the PAST (origins, founders, history, family saga)?
 └─ YES → REGISTER 05 (Archive)
 └─ NO ↓

Is the content about TECHNOLOGY, AI, or SaaS systems?
 └─ YES → REGISTER 04 (Signal)
 └─ NO ↓

Is the content EXPOSING wrongdoing, investigating a crime, or
   walking through fraud/scandal/revenge?
 └─ YES → REGISTER 03 (Investigative Noir)
 └─ NO ↓

Is the content about LUXURY products or high-net-worth strategy?
 └─ YES → REGISTER 02 (Premium Authority)
 └─ NO ↓

Default → REGISTER 01 (The Economist)
```

---

## Production Mode — Image / Seedance Mix

Every video is produced in one of four Production Modes, chosen at the classifier stage. Production Mode determines the split between pure-image scenes and Seedance I2V scenes.

| Mode | Image % | Seedance % | I2V scenes (per 172-scene video) | Typical use |
|---|---|---|---|---|
| `PURE_STATIC` | 100% | 0% | 0 | Lowest cost, most predictable. Best for data-heavy explainers or noir tension-in-stillness. |
| `LIGHT_MOTION` | 95% | 5% | ~9 | Default for most long-form. I2V reserved for hero opener + chapter openers. |
| `BALANCED` | 90% | 10% | ~17 | Premium and biographical pieces where motion earns its cost. |
| `KINETIC` | 85% | 15% | ~26 | Maximum allowed. Reserved for tech and luxury where motion sells the feel directly. |

### Mode × Register recommendations

| Register | PURE_STATIC | LIGHT_MOTION | BALANCED | KINETIC |
|---|---|---|---|---|
| 01 Economist | ✓ ideal | ✓ default | acceptable | not recommended |
| 02 Premium | not recommended | acceptable | ✓ default | ✓ ideal |
| 03 Noir | ✓ ideal | ✓ default | acceptable | not recommended |
| 04 Signal | acceptable | acceptable | ✓ default | ✓ ideal |
| 05 Archive | acceptable | ✓ default | ✓ ideal | not recommended |

### I2V budget allocation rules

When I2V budget is available (any mode except PURE_STATIC), spend it in this priority order:

1. **Hero opener** (first scene of video) — always first priority
2. **Chapter openers** — one Seedance clip per chapter break
3. **Revelation beats** — the emotional apex of the script ("and then everything changed")
4. **Register-specific moments** — documented per register (luxury product motion for 02, HUD-data flow for 04, period-scene drama for 05, etc.)
5. **Optional b-roll breathers** — only if budget remains after the above

Never scatter I2V evenly across the runtime. Cluster it at meaningful moments.

---

## Register Comparison at a Glance

| Dimension | 01 Economist | 02 Premium | 03 Noir | 04 Signal | 05 Archive |
|---|---|---|---|---|---|
| Max zoom range | 15% | 10% | 8% | 12% | 18% |
| Typical scene length | 6–9s | 9–13s | 8–12s | 5–8s | 8–11s |
| Words per minute (VO) | 135–150 | 115–130 | 125–140 | 150–165 | 120–135 |
| Film grain opacity | 8% | 6% | 12% | 5% | 15% |
| Primary accent color | Amber | Gold (#D4AF37) | Red (#B32020) | Cyan (#00D4FF) | Warm brown |
| Default transition | 500ms crossfade | 800ms crossfade | 900ms crossfade | 400ms sharp fade | 1.0s crossfade |
| Font family | Inter Tight | GT Sectra (serif) | Courier Prime (mono) | JetBrains Mono + Space Grotesk | Playfair Display (serif) |
| Music BPM | 60–75 | 55–70 | 55–65 | 80–100 | 60–75 |
| Recommended mode | LIGHT_MOTION | BALANCED / KINETIC | LIGHT_MOTION | BALANCED | LIGHT_MOTION / BALANCED |

---

## Cross-Cutting Production Rules

### The Motion Constraint (all registers)

Every camera move across all registers must satisfy:

- **Zoom velocity** never exceeds 0.001 units per frame at 30fps (most registers use 0.0002–0.0007)
- **Pan velocity** never exceeds 0.5% of frame width per second
- **No move completes in under 5 seconds**
- **No subframe jitter** — use `-preset slow` in FFmpeg to preserve sub-pixel precision
- **Eased motion only** — linear is acceptable in Registers 03 and 04 where that aesthetic is intentional; all others use `ease-in-out cubic` or gentler

### Seedance 2.0 Fast — universal motion prompt

Append to every I2V prompt across every register:

```
completely stable and smooth camera motion, no shake, no wobble, no sudden
movements, glacial documentary pace, sub-pixel precision, professional
cinematography, consistent motion blur, no frame warping, no morphing
artifacts, duration 5 seconds
```

Seedance 2.0 Fast typically delivers 5-second clips. For longer motion beats, chain two clips with a slow morph (RIFE/FILM interpolation) or a crossfade.

### Universal negative prompt (global — from CLAUDE.md / n8n static data)

Already defined and stored in n8n workflow static data per CLAUDE.md. Referenced here for completeness only — it is not redefined in this playbook. Each register file appends its register-specific additions to this global list.

### Pipeline engines

- **Image generation:** Seedream 4.5 (Fal.ai)
- **Image-to-video:** Seedance 2.0 Fast (Fal.ai)
- **Motion, composition, overlays, transitions:** FFmpeg (zoompan, overlay, drawtext, drawbox, xfade)
- **Frame interpolation for morph transitions:** RIFE or FILM
- **Depth maps for parallax:** Depth Anything V2
- **Kinetic captions:** ASS subtitles with Whisper word-level timing
- **Audio:** Google Cloud TTS Chirp 3 HD for voiceover; Epidemic/Artlist/Musicbed for beds

No Remotion. All overlays, chart reveals, HUD elements, evidence circles, highlight rings, counters, stamps, and annotations are achieved by one of:

1. **Bake into Seedream prompt** — generate the overlay as part of the image itself (e.g., "with thin cyan HUD corner brackets in all four corners")
2. **FFmpeg overlay of pre-rendered PNG** — transparent PNG/WebM composited via `-filter_complex "[0:v][1:v]overlay=...:enable='between(t,X,Y)'"`
3. **FFmpeg drawtext / drawbox** — for dynamic text, counters, redaction bars
4. **ASS subtitle animation** — for kinetic text, typewriter reveals, per-word effects
5. **Seedance 2.0 Fast I2V** — when the overlay must genuinely animate (charts building, rings drawing)

---

## Pipeline Integration — Scene Classifier Output

Update your post-script-approval scene classifier to output per-scene metadata that reflects Production Register + Production Mode:

```json
{
  "video_id": "cardmath-029",
  "project": "cardmath",
  "production_mode": "LIGHT_MOTION",
  "production_register": "REGISTER_01_ECONOMIST",
  "scene_id": 47,
  "engine": "seedream_4_5",
  "motion_preset": "slow_push",
  "duration_seconds": 7,
  "grade_lut": "controlled_editorial",
  "overlays": ["film_grain_16mm_8pct", "vignette_15pct", "light_dust_4pct"],
  "ffmpeg_overlays": [
    {"type": "drawtext", "text": "2024", "font": "Inter Tight Bold", "size": 48, "position": "upper_left", "enable": "between(t,2.5,7)"}
  ],
  "fonts": {"title": "inter_tight", "caption": "inter_tight_regular"},
  "accent_color": "#F5A623",
  "transition_out": {"type": "crossfade", "duration_ms": 500},
  "music_bed_bpm_range": [60, 75],
  "vo_rate": 0.95,
  "negative_prompt_additions": "editorial_restraint_set"
}
```

### Recommended classifier prompt additions

Add these heuristics to your Claude-based scene classifier. Two classifications run in sequence: Register (per-chapter or per-video) and Mode (per-video at the topic-generator stage).

```
Classify each video (or chapter, if mixed) into ONE of these five Production Registers:

REGISTER_01_ECONOMIST: analytical language, data citations, numeric density,
comparison words ("versus," "compared to"), definition language. Default for
unclassified explainer content across finance, legal, tax, B2B, real estate.

REGISTER_02_PREMIUM: luxury product names (Platinum, Reserve, Centurion,
Sotheby's, Private Client), lifestyle descriptors (marble, leather, first
class, mahogany), dollar figures >$10K, wealth/legacy language, luxury
real-estate content, HNW personal finance.

REGISTER_03_NOIR: investigation language ("scheme," "fraud," "predatory,"
"exposed," "hidden"), past-tense narrative about wrongdoing, legal/regulatory
content, whistleblower or victim testimony, crime content, revenge stories
in present-tense investigative framing.

REGISTER_04_SIGNAL: technical terminology (algorithm, blockchain, tokenization,
API, neural network), future-framing, fintech/AI/cyber content, B2B SaaS
reviews and tutorials, product-technology mechanics.

REGISTER_05_ARCHIVE: past-tense with year references, biographical language
(birth, upbringing, meeting), historical-era markers, founder/origin stories,
family drama with retrospective framing, revenge stories framed as slow-burn
biographical ("years later, he came back..."), real-estate mogul histories.
```

```
Classify each video into ONE of these Production Modes based on script tone
and register:

PURE_STATIC: Data-dense, dialogue-heavy, or tension-in-stillness content.
Default for ideation phase and first-run productions.

LIGHT_MOTION: Standard long-form with 1-2 hero moments. Default for all
Economist, Noir, and Archive productions unless otherwise specified.

BALANCED: Content where motion meaningfully enhances mood. Default for
Premium and Signal productions. Used for Archive when period motion beats
matter (arrival, ceremony, factory opening).

KINETIC: Content where motion is itself the product. Reserved for Premium
(luxury lifestyle motion) and Signal (tech mechanism motion). Never used for
Economist, Noir, or Archive.
```

Optionally support **uniform-register chapter mode** — classify at the chapter level rather than video level for stronger coherence. Recommended for biographical pieces (Register 05 holds an entire video) and fraud exposés (Register 03 holds an entire video).

---

## Mixing Registers Within a Single Video

**Allowed combinations** (tested, coherent):

- 01 + 04 — Economist main body with Signal tech explainer interludes. Works for fintech-heavy finance pieces, B2B SaaS deep dives with explanatory interludes.
- 01 + 05 — Economist main body with Archive historical flashback chapters. Works for "how we got here" narratives in finance, real estate, tax history.
- 02 + 05 — Premium main body with Archive founder-story chapters. Works for luxury card histories, luxury real-estate empire bios.
- 03 + 05 — Investigative main body with Archive historical context chapters. Works for "how this fraud came to exist" pieces, cold-case revenge stories.
- 03 + 01 — Noir investigation interleaved with Economist explanatory breakdowns. Works for fraud-with-math content, regulatory scandal explainers.

**Forbidden combinations** (whiplash for the viewer):

- 02 + 03 (luxury + investigative clash — tones fight)
- 02 + 04 (golden editorial + clinical tech clash)
- 03 + 04 (noir + futuristic clash — both demanding, don't blend)
- Three or more registers in one video (incoherent)

When mixing, use a **register-bridge chapter card** — a 3-second chapter card whose typography and color scheme visually bridges both registers (for example, a cream-to-black card between Premium and Archive).

---

## QA Master Checklist (All Registers)

Before publishing any video, verify:

- [ ] Production Register selected matches content (not misrouted by classifier)
- [ ] Production Mode selected matches register recommendations
- [ ] I2V scene count ≤ documented percentage for selected Mode
- [ ] No scene has motion exceeding register's documented zoom/pan ceiling
- [ ] No scene under 3.5 seconds (even Register 04's minimum)
- [ ] No scene over 18 seconds (unless data-viz-image-justified)
- [ ] Style DNA anchors present in every image prompt (check last 3 scenes)
- [ ] Register-specific anchors appended correctly
- [ ] Global universal negative + register-specific negative both applied
- [ ] No text artifacts or hallucinated logos/brands in any generated image
- [ ] Color grade LUT applied consistently across all scenes
- [ ] Film grain and vignette overlays at documented opacity per register
- [ ] Audio bed sits at documented dB level per register
- [ ] Full mix at -14 LUFS integrated (YouTube standard)
- [ ] Captions verified against VO within ±80ms (existing Whisper pipeline)
- [ ] Thumbnail register matches video register (Archive → sepia, Signal → cyan, Premium → gold)
- [ ] Music BPM within documented range
- [ ] Transition durations match register specification
- [ ] Chapter markers at register-appropriate intervals

---

## File Map

```
/vision_gridai_registers/
├── README.md                              (this file — index & selection)
├── REGISTER_01_THE_ECONOMIST.md           (documentary explainer)
├── REGISTER_02_PREMIUM_AUTHORITY.md       (luxury editorial)
├── REGISTER_03_INVESTIGATIVE_NOIR.md      (investigation / true crime / revenge)
├── REGISTER_04_SIGNAL_TECH.md             (tech / fintech / SaaS futurist)
└── REGISTER_05_ARCHIVE.md                 (historical / biographical / family drama)
```

The previous `STYLE_XX_*.md` files should be archived or deleted. All references should migrate to `REGISTER_XX_*.md`.

Each register file contains:

1. When to use it (with multi-niche guidance)
2. Production Mode recommendations
3. Full effect stack (image generation, motion, parallax, grade, overlays, typography, transitions, audio)
4. Implementation notes for scene classifier
5. Script pacing guidance
6. Per-register QA checklist
7. Example prompt pack (3 scenes) with Seedream 4.5 and Seedance 2.0 Fast prompts
8. Register-specific negative prompt additions
9. Reference channels to study before each production session

---

## Next Steps for Integration

1. **Save these files next to `VisionGridAI_Platform_Agent.md`** in the master DOE repo.
2. **Update CLAUDE.md** — add the Three-Layer Visual Architecture section and cross-reference to this playbook.
3. **Update the scene classifier** to emit `production_register` + `production_mode` per video (or per chapter).
4. **Update prompt assembler** — implement the four-part composition order documented above.
5. **Update n8n workflow** — verify the `$getWorkflowStaticData` pattern for the global universal negative prompt, add a static-data entry for each register's negative-prompt additions.
6. **Build the LUT library** — five main LUTs plus Archive's four era sub-LUTs, total nine `.cube` files.
7. **Build the overlay PNG library** — pre-render the always-on and situational transparent WebMs/PNGs per register (grain, bokeh, haze, scan lines, HUD corner brackets, evidence circles, etc.).
8. **Build the FFmpeg motion preset library** — named functions for `slow_push`, `creep_in`, `precision_push`, `burns_pan_right`, etc. as Python wrappers around zoompan filter chains.
9. **Test with a single scene per register × mode combination** before running a full 172-scene render. Render-lock one scene per register-mode pair, verify against checklists, iterate prompts.
10. **Document register and mode selections per video** in your production log to build a reference corpus.

---

## Closing Note on the Stability Constraint

All five registers were designed from the ground up with the "no shake, no fast motion" constraint treated as a feature, not a limitation. The constraint is what makes them *cinematic* rather than *social-media-native*. The slow hand of a documentary camera is a signifier of prestige — it is what separates Ken Burns from TikTok, LEMMiNO from Daily Dose of Internet, Johnny Harris from the average YouTube explainer.

The premium ad category you are building inside — the $20–$50 CPM tier that spans finance, legal, insurance, B2B SaaS, real-estate, and serious true-crime storytelling — rewards this pace. Advertisers pay premium CPMs for premium audiences, and premium audiences watch premium-feeling content. Your constraint is your brand.
