# REGISTER 01 — THE ECONOMIST

**Positioning:** Documentary-grade explainer. Authoritative, calm, data-rich. The visual language of Johnny Harris, Wendover Productions, Polymatter, RealLifeLore. The default Register for any analytical long-form across personal finance, credit card economics, legal/tax/insurance explainers, B2B fundamentals, real-estate analysis, and mortgage education.

**Core principle:** The viewer should feel they are watching a well-funded investigative documentary, not a YouTube video. Every frame earns its place. Motion is slow and deliberate. Information density is high.

**Motion constraint compliance:** No shake, no whip, no crash zoom, no fast glitch. All camera moves are slow (5–9s duration), eased, and sub-pixel smooth.

> This file defines a **Production Register** as documented in `README.md`. It composes with the Project's **Style DNA** at prompt-build time. Register decisions override Style DNA on cinematic grammar (grade, motion, typography). Style DNA wins on subject-matter presentation (recurring motifs, branded composition).

---

## 1. When To Use This Register

**Fits best when:**

- The script is analytical, investigative, or explanatory in tone
- Numbers, comparisons, and relationships dominate the content
- The viewer expects authority and depth
- Target retention is 10+ minutes of long-form

**Niche fit map:**

| Niche | Use Economist for... |
|---|---|
| Personal Finance & Investing | All explainer content (default) |
| Credit Cards (CardMath) | Economics, math breakdowns, interest mechanics, rewards analysis |
| Legal, Tax & Insurance | Tax code explainers, insurance policy breakdowns, legal mechanics |
| Business & B2B SaaS | Market analysis, business model deep-dives, industry explainers |
| Real Estate & Mortgage | Market analysis, mortgage mechanics, investment math |
| Crime / Revenge | Supporting Register only — use 03 Noir as primary |
| Family Drama | Not a fit — use 05 Archive |

**Avoid when:**

- The script is emotional, personal, or story-driven (use 02 or 05)
- The content is reactive, news-of-the-day, or entertainment-first
- You need urgency or tension (use 03)

---

## 2. Production Mode Recommendations

| Mode | Recommendation | Rationale |
|---|---|---|
| `PURE_STATIC` | ✓ Ideal | Measured register; stillness reinforces authority |
| `LIGHT_MOTION` | ✓ Default | I2V budget for hero opener + chapter openers |
| `BALANCED` | Acceptable | Use only when multiple "wow" moments justify it |
| `KINETIC` | Not recommended | Breaks the register's contemplative pace |

### I2V Budget Allocation (when not in PURE_STATIC)

In `LIGHT_MOTION` (~9 Seedance scenes in a 172-scene video), spend in this order:

1. Hero opener (1 scene, slow push-in on establishing image)
2. Chapter openers (3–5 scenes, one per chapter, subtle motion)
3. Revelation beat (1 scene, the script's apex moment)
4. Closing image (1 scene, a gentle pull-back for gravitas)
5. Remaining budget: use for data-image scenes where the chart itself benefits from subtle motion (bar subtly growing, needle ticking)

---

## 3. Full Effect Stack

### 3.1 Image Generation (Seedream 4.5)

**Aspect ratio:** 16:9 at 2560×1440 minimum (upscale to 3840×2160 before animation to allow zoom headroom).

**Register-specific anchors** (appended after Style DNA, before negative prompts):

```
editorial documentary photography, natural cinematic lighting, shallow depth
of field, muted color palette with controlled warmth, subtle film grain,
35mm lens characteristics, rule-of-thirds composition, negative space for
text overlays, high detail, professional color grading
```

**Subject prompt template:**

```
[SUBJECT], [ENVIRONMENT], [LIGHTING CONDITION], [CAMERA ANGLE], [MOOD]
```

**Example (credit card economics — the interest accrual concept):**

```
A vintage metal credit card resting on a polished mahogany executive desk
beside a crystal tumbler and leather-bound ledger, warm tungsten desk lamp
from upper left casting soft shadows, slight overhead angle, contemplative
mood, rule-of-thirds composition with empty upper-right space for text
overlay
```

**Example (B2B SaaS — the unit economics concept):**

```
A clean modern workspace with an open laptop showing a muted dashboard,
two notebooks and a ceramic coffee cup beside it, soft morning window light
from the left, slight overhead angle, contemplative analytical mood,
rule-of-thirds composition with the laptop on the left third and negative
space upper-right for overlays
```

**Example (real estate — market analysis):**

```
A muted aerial view of a suburban American neighborhood at golden hour,
warm soft light raking across rooftops, a subtle haze in the distance,
helicopter-altitude perspective, contemplative analytical mood, rule-of-
thirds composition with built area in the lower two-thirds and sky in upper
third for overlays
```

**Data-visualization-as-image pattern (replaces Remotion-based charts):**

Since Remotion is removed from the pipeline, data visualizations are now generated as Seedream images directly. The image IS the chart.

```
A clean editorial bar chart showing fictional quarterly revenue growth,
six bars of increasing height in warm amber, thin gridlines, minimal
typography reading "Q1 Q2 Q3 Q4 Q5 Q6" along the x-axis, matte charcoal
background, documentary magazine infographic style, generous white space,
editorial composition, high detail, no readable numbers on the bars,
no brand names
```

When the specific data values matter, overlay them via FFmpeg `drawtext` with `enable` expressions for per-value timing (see Section 3.6).

**Prompt constraints to enforce:**

- Always specify composition (rule-of-thirds, centered subject, or leading lines)
- Always specify lighting direction and quality (soft, hard, rim, backlit)
- Always specify negative space location
- For data-viz images: ban readable specific numbers ("no readable numbers"), let FFmpeg drawtext add real values
- Include "documentary magazine infographic style" for chart scenes

### 3.2 Camera Motion (FFmpeg + Ken Burns, depth-aware)

All moves are **slow, eased, and stable**. Typical scene = 6–9 seconds of motion.

**Standard move library:**

| Move | Duration | Pan | Zoom | Ease |
|---|---|---|---|---|
| `slow_push` | 7s | none | 1.0 → 1.15 | ease-in-out cubic |
| `slow_pull` | 7s | none | 1.15 → 1.0 | ease-in-out cubic |
| `soft_drift_right` | 8s | +4% of width | 1.05 → 1.08 | linear with soft bookends |
| `soft_drift_left` | 8s | -4% of width | 1.05 → 1.08 | linear with soft bookends |
| `reveal_up` | 9s | +3% of height | 1.12 → 1.0 | ease-out |
| `reveal_down` | 9s | -3% of height | 1.12 → 1.0 | ease-out |
| `static_hold_with_breath` | 5s | ±0.5% drift | 1.02 → 1.04 | sine, micro-motion |

**Never exceed 15% zoom range in a single scene.**

**FFmpeg slow_push reference (7-second, eased):**

```bash
ffmpeg -loop 1 -i scene_001.png -vf \
"zoompan=z='min(zoom+0.0004,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':\
d=210:s=1920x1080:fps=30,format=yuv420p" \
-c:v libx264 -crf 18 -preset slow -t 7 scene_001_push.mp4
```

Key parameter: `zoompan` `z` increment of `0.0004` per frame gives gentle, sub-perceptible acceleration. Anything above `0.001` starts to feel mechanical.

### 3.3 Depth-Aware Parallax

This is what separates this register from vanilla Ken Burns.

**Pipeline:**

1. Run Depth Anything V2 on each Seedream image → produces depth map (16-bit grayscale PNG)
2. Segment into 3 layers: foreground (depth > 0.7), midground (0.3–0.7), background (< 0.3)
3. Inpaint occluded regions behind foreground using Seedream 4.5 inpainting or cv2 telea
4. Render each layer with differential motion in FFmpeg

**Motion ratio (differential):**

- Background: 1.0x
- Midground: 1.4x
- Foreground: 1.9x

**FFmpeg 3-layer parallax reference:**

```bash
ffmpeg \
  -loop 1 -i bg.png -loop 1 -i mg.png -loop 1 -i fg.png \
  -filter_complex "
    [0:v]zoompan=z='min(zoom+0.0003,1.12)':d=210:s=1920x1080[bg_anim];
    [1:v]zoompan=z='min(zoom+0.00042,1.17)':d=210:s=1920x1080[mg_anim];
    [2:v]zoompan=z='min(zoom+0.00057,1.23)':d=210:s=1920x1080[fg_anim];
    [bg_anim][mg_anim]overlay=0:0[tmp];
    [tmp][fg_anim]overlay=0:0,format=yuv420p
  " \
  -t 7 -c:v libx264 -crf 18 scene_001_parallax.mp4
```

### 3.4 Color Grade

**"Controlled Editorial"** LUT:

- Lift shadows +8 (preserve detail)
- Gamma 0.95 (subtle contrast boost)
- Gain highlights -4 (prevent blow-out)
- Saturation -12 (editorial restraint)
- Warm midtones +6 on orange axis
- Cool shadows -4 on blue axis
- Slight teal & orange split toning (restrained)

**FFmpeg grade chain:**

```
eq=contrast=1.05:brightness=0.02:saturation=0.88:gamma_r=1.02:gamma_b=0.98,
curves=preset=increase_contrast,
colorbalance=rs=-0.05:bs=0.08:rm=0.03:bm=-0.03:rh=0.05:bh=-0.05
```

Or load LUT: `controlled_editorial.cube`.

### 3.5 Atmospheric Overlays

**Always on** (FFmpeg overlay with blend mode, low opacity):

- 16mm film grain at 8% opacity
- Light dust particles at 4% opacity (very sparse)
- Vignette at 15% (corners only)

**Situational:**

- Light leaks (warm, left edge) on emotional beats: 12% opacity, 3-second build
- Atmospheric haze on historical reference scenes: 6% opacity
- No chromatic aberration
- No glitch, no scan lines

Pre-render these as transparent WebM files once and reuse across all videos. Apply via:

```bash
ffmpeg -i base.mp4 -i grain_16mm.webm -filter_complex \
"[1:v]format=yuva420p,colorchannelmixer=aa=0.08[grain];
 [0:v][grain]overlay=0:0:shortest=1,format=yuv420p" \
base_with_grain.mp4
```

### 3.6 Overlays (Replacing Old Remotion Components)

All motion-graphic-style overlays now use one of three methods. Choose the lowest-cost method that achieves the effect.

**Method A — Bake into Seedream prompt.** For static visual elements (HUD brackets, fixed callout circles, stamps, textures), describe them in the image prompt directly.

```
...with a thin editorial circle highlighting the chart's peak value,
small typographic annotation nearby reading "annual growth rate"...
```

Note: Seedream will produce the visual of text but the text itself will be illegible/wrong. Keep text language generic ("annual growth rate") so it reads as a graphic element, not as readable data.

**Method B — FFmpeg PNG/WebM overlay.** For semi-transparent layers, pre-rendered sprite animations, corner brackets, watermarks, flag overlays.

```bash
# Overlay a highlight ring PNG, fading in at t=2.5s, fading out at t=6s
ffmpeg -i base.mp4 -i highlight_ring.png -filter_complex \
"[1:v]format=yuva420p,fade=t=in:st=2.5:d=0.6:alpha=1,fade=t=out:st=5.4:d=0.6:alpha=1[ring];
 [0:v][ring]overlay=800:400:enable='between(t,2.5,6)',format=yuv420p" \
scene_with_ring.mp4
```

**Method C — FFmpeg drawtext / drawbox.** For dynamic text, number readouts, date stamps, data overlays on chart images.

```bash
# Draw year label "2024" at upper-left from t=2.5s to end of scene
ffmpeg -i base.mp4 -vf \
"drawtext=text='2024':fontfile=/fonts/InterTight-Bold.ttf:fontsize=48:
 fontcolor=0xF5A623:x=80:y=80:enable='gte(t,2.5)'" \
scene_with_year.mp4

# Draw a data value on top of a chart image
ffmpeg -i chart_base.mp4 -vf \
"drawtext=text='\\$23.4B':fontfile=/fonts/InterTight-Bold.ttf:fontsize=72:
 fontcolor=white:x=(w-tw)/2:y=420:enable='between(t,3,8)'" \
chart_with_value.mp4
```

**Signature overlay patterns for this register:**

- **Highlight ring** (Method B): Pre-rendered 2px amber stroke circle, 600ms fade-in + hold + fade-out. Applied to image regions where narrator calls attention.
- **Labeled arrow** (Method B): Curved arrow + text label, 400ms fade-in.
- **Year/date stamp** (Method C): Small Inter Tight Bold in amber, upper-left corner.
- **Data value** (Method C): Large Inter Tight Bold, centered over chart images, 2-second hold.
- **Chapter title card** (Method C, full-frame): drawtext on a solid-color background scene, 2-second hold.

**Callout annotation pattern (signature move):**

1. Image holds static with slow drift (2 seconds)
2. Highlight ring PNG fades in over 600ms at narration cue
3. Label drawtext fades in beside the ring (300ms after ring)
4. Both hold for 2 seconds
5. Fade out together (500ms)
6. Scene transitions

### 3.7 Typography / Kinetic Captions

**Primary font:** Inter Tight (or GT America if licensed).

**Secondary font:** IBM Plex Serif for data callouts and quotes.

**Two-tier caption system** (via ASS subtitles, Whisper-synced — existing pipeline):

- Connector words: Inter Tight Regular, 48px, white with 2px black stroke, 88% opacity
- Keywords: Inter Tight Bold, 72px, warm amber (#F5A623), 100% opacity, subtle drop shadow

**Reveal style:** Pop-in with overshoot (110% → 100%), spring animation, per-word timing from Whisper.

**Chapter title cards** (generated as Seedream images then overlaid with drawtext):

Either method works:

- **Image-first approach:** Seedream generates a matte dark background with subtle texture; FFmpeg drawtext adds the title on top.
- **Pure drawtext approach:** FFmpeg generates a solid-color background via `color=c=0x0A0A0A:s=1920x1080:d=4`, drawtext adds title and subtitle.

Prefer the image-first approach for Registers with rich texture needs.

### 3.8 Transitions (FFmpeg-native, Stable-Only)

Forbidden: whip pan, crash zoom, glitch, speed ramp.

Approved, all via FFmpeg `xfade`:

| Transition | Duration | FFmpeg xfade | Use Case |
|---|---|---|---|
| Crossfade | 500ms | `fade` | Default |
| Luma fade through black | 1.2s | `fadeblack` | Chapter breaks |
| Luma fade through white | 800ms | `fadewhite` | Emotional beat |
| Dissolve | 500ms | `dissolve` | Secondary default |
| Circle open | 700ms | `circleopen` | Reveal moments (sparingly) |
| Smooth left/right | 600ms | `smoothleft` / `smoothright` | Lateral pace change |
| Morph (RIFE) | 900ms | Via RIFE + concat | Matched compositions |
| Match cut | 0ms | Direct concat | Shape continuity |
| J-cut / L-cut | 600ms audio overlap | Audio editing | Narrative flow |

**FFmpeg xfade reference:**

```bash
ffmpeg -i scene_001.mp4 -i scene_002.mp4 -filter_complex \
"[0:v][1:v]xfade=transition=fade:duration=0.5:offset=6.5[v];
 [0:a][1:a]acrossfade=d=0.5[a]" \
-map "[v]" -map "[a]" -c:v libx264 -crf 18 out.mp4
```

### 3.9 Audio Design

- **Music bed:** Orchestral-ambient hybrid, 60–75 BPM. Sources: Epidemic Sound "Documentary," Artlist "Cinematic Ambient." Volume: -22 LUFS under voiceover.
- **Voiceover:** Google Cloud TTS Chirp 3 HD, "en-US-Studio-M" at 0.95x rate.
- **Whooshes:** Subtle, low-pass filtered, on transitions only. -12 dB.
- **Stingers:** One muted impact at each chapter title card reveal.
- **Risers:** 3-second builds into any hero Seedance scene.
- **Foley:** Specific to content (cash shuffle, ledger flip, pen scratch on finance; office sounds on B2B; door close on real estate).

---

## 4. Register-Specific Negative Prompt Additions

Appended to the global universal negative prompt (from `CLAUDE.md` / n8n static data):

```
overly saturated colors, cartoonish style, illustration style, anime,
garish neon, grunge aesthetic, heavy motion blur, lens flares, dramatic
vignetting, surveillance camera quality, surveillance aesthetic,
aggressive chromatic aberration, VHS artifacts, glitch effects
```

---

## 5. Script Pacing Guidance

- 135–150 words per minute (Chirp 3 at 0.95x rate)
- 6–9 seconds per static image scene
- 8–12 seconds per data-image scene (chart + drawtext reveals)
- 5–7 seconds per Seedance I2V scene
- No single shot under 4 seconds
- Chapter markers every 90–120 seconds

For a 2-hour long-form target: 172 scenes averages ~42 seconds per scene, accommodating data reveals well.

---

## 6. QA Checklist (Register 01)

Before render lock, verify:

- [ ] Production Mode verified against classifier output
- [ ] I2V scene count matches mode budget (0 for PURE_STATIC, ~9 for LIGHT_MOTION)
- [ ] No camera move exceeds 15% zoom range
- [ ] No move faster than 0.0006 zoom-per-frame
- [ ] All images have negative space where text lands
- [ ] Every chapter has a title card with 2s hold
- [ ] Controlled Editorial LUT applied consistently
- [ ] Film grain + vignette on every scene
- [ ] No whip, crash, or glitch transitions
- [ ] Audio bed ≤ -22 LUFS under VO
- [ ] Whisper captions verified against VO within ±80ms
- [ ] Register-specific negative prompt merged with global universal
- [ ] Style DNA anchors verified in at least 3 sampled prompts

---

## 7. Example Prompt Pack (Multi-Niche)

### Example A — CardMath — "Why Chase Sapphire Reserve Exists"

**Scene 001 (Hero opener, Seedance I2V):**

```
Seedream 4.5 image prompt:
A lone metal credit card standing upright on a polished marble floor in a
dimly lit modern bank vault, single warm spotlight from above creating long
shadow, rim light catching the card edge, centered composition with generous
negative space above and below, mood of quiet power
+ [Style DNA: CardMath financial documentary aesthetic...]
+ [Register anchors: editorial documentary photography, natural cinematic
   lighting, shallow depth of field, muted color palette with controlled
   warmth, subtle film grain, 35mm lens characteristics, high detail,
   professional color grading]
+ [Global universal negative + Register 01 additions]

Seedance 2.0 Fast I2V prompt:
slow 5-second cinematic pull-back from the card, camera drifting backward
and slightly up, revealing more of the vault floor, dust motes drifting in
the light beam, completely stable and smooth motion, no shake, no sudden
movement, documentary film pace, glacial pace, sub-pixel precision
```

**Scene 014 (Data-as-image + drawtext):**

```
Seedream 4.5 image prompt:
A clean editorial bar chart showing six bars of increasing height in warm
amber against a matte charcoal background, thin horizontal gridlines, small
illegible x-axis labels suggesting years, generous negative space above and
around the chart, documentary magazine infographic style, editorial
composition, no readable numbers on the bars, rule-of-thirds with chart
occupying lower two-thirds

Motion: slow_push, 8s, zoom 1.0 → 1.10
Grade: Controlled Editorial
Overlays (FFmpeg drawtext):
  - "$550 → $795" appears at t=2s, Inter Tight Bold 72px, amber, centered
    upper third, hold to end
  - "Annual Fee, 2020-2026" appears at t=4s, Inter Tight Regular 36px,
    white 85%, lower third, hold to end
  - 16mm grain overlay continuous
Transition out: crossfade 500ms
Audio: sustained pad, no percussion, Chirp 3 VO naming the values
```

### Example B — B2B SaaS — "How Stripe Actually Makes Money"

**Scene 023 (Concept image):**

```
Seedream 4.5 image prompt:
A minimalist desk scene viewed from above, a laptop open to a muted analytics
dashboard with illegible numbers, a ceramic mug of black coffee beside it,
a small notebook with handwritten-looking marks, soft morning window light
from upper left, rule-of-thirds with laptop on left third and negative space
upper-right, contemplative analytical mood

Motion: soft_drift_right, 8s
Grade: Controlled Editorial
Overlays: drawtext "3.4% + 30¢" amber at t=3s, upper-right
Transition out: crossfade 500ms
```

### Example C — Real Estate — "The Math of a Rental Portfolio"

**Scene 041 (Aerial):**

```
Seedream 4.5 image prompt:
A muted aerial view of an American suburban neighborhood at golden hour,
warm soft light raking across rooftops, subtle haze in the distance,
helicopter-altitude perspective, approximately 30% sky in upper third,
contemplative analytical mood, editorial documentary photography

Motion: reveal_down, 9s, zoom 1.12 → 1.0, pan down 3%
Grade: Controlled Editorial with +4% warmth
Overlays: drawtext "CASH-ON-CASH RETURN" Inter Tight Regular 42px, letter-
spaced 200, upper-third, appears at t=2s
Transition out: crossfade 500ms
```

---

## 8. Reference Channels

- **Johnny Harris** — master of slow motion and depth parallax
- **Wendover Productions** — pacing and data integration
- **Polymatter** — color grade and typography discipline
- **RealLifeLore** — geographic storytelling
- **Economics Explained** — chart-heavy structure
- **Ben Felix (Common Sense Investing)** — calm analytical register

Watch the first 90 seconds of any recent Johnny Harris video to recalibrate before a production session in this Register.
