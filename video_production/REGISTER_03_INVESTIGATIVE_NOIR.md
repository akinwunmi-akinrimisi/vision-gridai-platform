# REGISTER 03 — INVESTIGATIVE NOIR

**Positioning:** The visual language of Netflix true-crime documentaries, LEMMiNO deep-dives, MrBallen, and Bailey Sarian's aesthetic filtered through a more serious register. Tension, gravity, investigation. The primary Register for crime content, revenge stories (contemporary framing), fraud exposés, legal scandal, tax-evasion walkthroughs, and predatory product takedowns.

**Core principle:** The viewer should feel they are being walked through evidence. Every image looks like it was recovered, not created. Shadows do most of the work. Tension builds through stillness, not movement.

**Motion constraint compliance:** Zero shake, zero whip, zero crash zoom. The tension in this Register comes from painfully slow zooms that feel like a lens creeping forward, not from frenetic cutting.

> This file defines a **Production Register** as documented in `README.md`. It composes with the Project's **Style DNA** at prompt-build time. Register decisions override Style DNA on cinematic grammar (grade, motion, typography). Style DNA wins on subject-matter presentation.

---

## 1. When To Use This Register

**Fits best when:**

- Telling a crime story (cold case, heist, kidnapping, homicide, con)
- Narrating a revenge story in contemporary tense ("she waited three years...")
- Exposing fraud, scams, or predatory products
- Walking through how a scheme worked
- Profiling corporate wrongdoing or regulatory failure
- Breaking down a legal case
- Chronicling a company collapse (SVB, FTX, Theranos)
- Tax evasion, money laundering, or financial crime content

**Niche fit map:**

| Niche | Use Noir for... |
|---|---|
| Crime | All content (default) |
| Revenge Stories | Contemporary-tense framing ("he planned it for years") |
| Legal, Tax & Insurance | Fraud, malpractice, scandal, regulatory action |
| Credit Cards (CardMath) | Predatory lending, CFPB exposés, scam takedowns, fraud patterns |
| Personal Finance | Ponzi schemes, investment fraud, advisor malpractice |
| Business & B2B | Corporate scandals, founder fraud, wrongdoing exposés |
| Real Estate & Mortgage | Predatory lending, foreclosure fraud, title scams |
| Family Drama | Dark family secrets, betrayal, inheritance disputes (use as secondary to 05) |

**Avoid when:**

- The content is educational-first and neutral (use 01)
- The content is aspirational (use 02)
- The content is celebratory or lifestyle-focused
- You need approachability or warmth

---

## 2. Production Mode Recommendations

| Mode | Recommendation | Rationale |
|---|---|---|
| `PURE_STATIC` | ✓ Ideal | Tension-in-stillness is this Register's strongest move |
| `LIGHT_MOTION` | ✓ Default | I2V reserved for hero opener and revelation beats |
| `BALANCED` | Acceptable | Only when multiple revelation beats justify it |
| `KINETIC` | Not recommended | Breaks the claustrophobic stillness |

### I2V Budget Allocation

In `LIGHT_MOTION` (~9 Seedance scenes per 172-scene video), spend in this order:

1. Hero opener (1 scene — slow push toward evidence or scene of the crime, 5s)
2. Chapter openers (3–4 scenes — one per chapter, always a slow-creep motion beat)
3. Revelation beats (2–3 scenes — the "and then they found out" moments)
4. The final frame (1 scene — a slow pull-back from the resolution)

Avoid using Seedance for b-roll breathers in this Register. The stillness is the weapon.

---

## 3. Full Effect Stack

### 3.1 Image Generation (Seedream 4.5)

**Aspect ratio:** 16:9 at 2560×1440 (grain and degradation hide resolution compromise).

**Register-specific anchors:**

```
dark investigative documentary photography, heavy chiaroscuro lighting with
deep black shadows, single harsh light source creating strong shadow patterns,
desaturated color palette leaning toward muted browns and cold blues,
bleach bypass aesthetic, 16mm film grain, slight vignetting, mood of
tension and unease, low-key lighting, noir sensibility, leaked-document
aesthetic, surveillance-photograph quality, high detail but degraded
```

**Subject prompt template:**

```
[SUBJECT ISOLATED IN SHADOW], [MINIMAL ENVIRONMENT], [SINGLE HARSH LIGHT SOURCE],
[OBLIQUE CAMERA ANGLE], [FOREBODING MOOD]
```

**Example (crime — abandoned scene):**

```
An abandoned suburban kitchen at night, a chair overturned near a small
dining table, a cordless phone off its cradle on the counter, single
window letting in cold moonlight from the left creating long hard shadows
across the linoleum floor, slight haze in the air, low-angle perspective
looking across the floor, mood of arrested violence
```

**Example (fraud — call center):**

```
An abandoned fluorescent-lit call center floor at night, rows of empty
cubicles stretching into darkness, single flickering overhead fluorescent
tube creating harsh downward shadows, cold color temperature with pale
blue-green cast, slight haze in the air, low-angle perspective down a
cubicle corridor, mood of institutional dread
```

**Example (revenge — present-tense planning):**

```
A dimly lit garage workshop at night, a corkboard on the wall covered with
photographs connected by red thread, a single desk lamp illuminating the
board from below creating long upward shadows, the back of a figure in
silhouette studying the board, oblique over-the-shoulder camera angle,
mood of cold deliberation
```

**Example (family drama — dark secret variant):**

```
An empty family dining room at late evening, dinner plates still on the
table but abandoned mid-meal, a single chandelier casting uneven warm light
through a haze in the air, an opened letter on the floor near a chair that
has been pushed back, slight overhead angle, mood of unsettled aftermath
```

**Prompt constraints:**

- Always specify a single hard light source
- Always lean toward deep shadows (never "evenly lit")
- Always include either "bleach bypass" OR "film noir" anchor
- Always include degradation descriptors ("surveillance," "leaked document," "archival")
- Use oblique, low, or high angles — never eye-level neutral
- Cold color temperatures except when warmth is specifically eerie

### 3.2 Camera Motion (Oppressive Slowness)

This Register's tension is built on **extreme slowness**. A 9-second scene might have only 4% zoom change.

**Move library:**

| Move | Duration | Pan | Zoom | Ease |
|---|---|---|---|---|
| `creep_in` | 12s | none | 1.0 → 1.07 | linear (no ease — relentlessness is the point) |
| `creep_out` | 12s | none | 1.07 → 1.0 | linear |
| `shadow_drift` | 10s | ±2% width | 1.03 → 1.05 | linear |
| `descent` | 11s | +2% height (tilt down) | 1.0 → 1.06 | ease-in-out |
| `ascent` | 11s | -2% height | 1.06 → 1.0 | ease-out |
| `dead_hold` | 7s | 0 | 1.0 → 1.01 (imperceptible) | sine |

**Key aesthetic:** The camera moves just slowly enough that the viewer questions whether it's moving at all.

**FFmpeg creep_in reference (12-second, linear):**

```bash
ffmpeg -loop 1 -i scene_001.png -vf \
"zoompan=z='1.0+0.00019*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':\
d=360:s=1920x1080:fps=30,format=yuv420p" \
-c:v libx264 -crf 19 -preset slow -t 12 scene_001_creep.mp4
```

The `1.0+0.00019*on` formula (frame-number multiplier) produces perfectly linear motion. No easing, no acceleration. Just a slow inevitability.

### 3.3 Depth-Aware Parallax

**Enhanced differential** for this register (the 3D feel adds unease):

- Background: 1.0x
- Midground: 1.5x
- Foreground: 2.0x

Combined with creep_in, this produces a dreamlike, unreliable-perspective effect.

### 3.4 Color Grade

**"Investigative Bleach Bypass"** LUT:

- Lift shadows +4 (preserve some detail but keep it dark)
- Gamma 0.88 (strong contrast)
- Gain highlights -12 (avoid blow-out)
- Saturation -35 (heavily desaturated — the key move)
- Exception: preserve +10 on orange/red axis (skin tones don't go corpse-like)
- Cool shadows (-10 blue axis)
- Crush mid-blacks slightly (blacks at 12 instead of 0-16)

**FFmpeg grade chain:**

```
eq=contrast=1.18:brightness=-0.04:saturation=0.65:gamma=0.88:gamma_r=1.02:gamma_b=0.94,
curves=preset=medium_contrast,
colorbalance=rs=-0.05:gs=-0.05:bs=0.04:rm=0.02:gm=0.0:bm=-0.03:rh=-0.02:gh=-0.02:bh=0.02
```

Or load LUT: `bleach_bypass_investigative.cube`.

### 3.5 Atmospheric Overlays

This Register's overlays are dense and deliberate.

**Always on:**

- 16mm film grain at 12% opacity (heavier than 01/02)
- Atmospheric haze at 10% opacity
- Vignette at 30% (strong — isolates the subject)
- Subtle chromatic aberration at frame edges (1–2px)

**Situational:**

- Dust particles illuminated in light beams at 15%
- Flickering fluorescent simulation (brightness dip every 2–4s, random, 50–100ms duration) on indoor scenes — applied via FFmpeg `eq=brightness=...` with a rapid expression
- VHS tracking lines at 8% for "archival footage" feel (use sparingly)
- Subtle smoke/steam overlays on exterior night scenes

**Never:**

- Warm light leaks
- Bokeh overlays
- Bloom on highlights (breaks the bleach bypass look)

### 3.6 Overlays (Evidence-Style, Replacing Old Remotion Components)

This is the Register's signature visual system. All achieved via Method A (bake into Seedream), Method B (PNG overlay), or Method C (drawtext/drawbox).

**Method A — Bake into Seedream prompt.** Seedream 4.5 handles evidence textures beautifully. Include in prompt:

```
...with a red evidence circle drawn around the document in the image,
handwritten-looking annotation nearby reading illegibly "evidence item,"
a corner stamp reading "case file" rendered as a graphic element...
```

Text in-image will render as graphic-looking text (illegible but atmospherically correct). Overlay the actually readable text via FFmpeg drawtext.

**Method B — FFmpeg PNG overlay.** Pre-render the evidence overlay library once:

- **Red evidence circle** — 2px stroke, #B32020, 400×400px, transparent PNG (3–4 size variants)
- **Redaction bar** — solid black rectangle PNGs, multiple sizes
- **Document stamp** — "CONFIDENTIAL," "CLASSIFIED," "EXHIBIT N" in Courier Prime on aged-paper texture PNGs, slightly rotated
- **Dotted connecting lines** — various angles between two anchor points
- **Reticle/target overlay** — subtle 20% opacity surveillance-style crosshair

Apply with fade-in timing:

```bash
# Evidence circle drawn around a document, appears at t=3s
ffmpeg -i base.mp4 -i evidence_circle_med.png -filter_complex \
"[1:v]format=yuva420p,fade=t=in:st=3:d=1.2:alpha=1[ring];
 [0:v][ring]overlay=640:380:enable='gte(t,3)'" \
scene_with_evidence.mp4
```

**Method C — FFmpeg drawtext + drawbox.** For dynamic text, typewriter reveals, redaction bars.

```bash
# Typewriter reveal of a quote: "I knew something was wrong"
ffmpeg -i base.mp4 -vf \
"drawtext=text='I knew something was wrong':fontfile=/fonts/CourierPrime.ttf:
 fontsize=48:fontcolor=white:x=120:y=800:enable='between(t,4,10)':
 expansion=strftime" \
scene_typewriter.mp4
```

For a true character-by-character typewriter effect, pre-render text frames via Python + PIL into a PNG sequence, then composite. Or use ASS subtitle `\k` tag for karaoke-style reveal synced to SFX.

**Redaction bar via drawbox:**

```bash
ffmpeg -i base.mp4 -vf \
"drawbox=x=200:y=400:w=500:h=50:color=black@1.0:t=fill:enable='gte(t,2)'" \
scene_redacted.mp4
```

**Signature overlay patterns:**

- **Evidence circle** (Method B): 2px red stroke, 1.2s fade-in, hold, fade-out. Apply at narration cue.
- **Redaction bar** (Method C drawbox): Solid black rectangle covering names, faces, documents. Hard appearance (no fade).
- **Document stamp** (Method B PNG): "EXHIBIT N" on aged paper, appears with slight rotation via pre-baked rotation in PNG, no animation.
- **Timeline marker** (image-first approach): Generate a horizontal timeline as a Seedream image, overlay date-point drawtext via Method C.
- **Connection web** (sequence of Method B PNGs): Multiple dotted-line overlays layered across several seconds.
- **Case number overlay** (Method C): Upper-left "CASE #2847-B" in Courier Prime Monospace, appears at scene start, holds throughout.
- **Typewriter quote** (Method C staggered): Character or word-staggered reveals via drawtext with incrementing enable expressions, or via ASS karaoke.

### 3.7 Typography

**Primary font:** Courier Prime or IBM Plex Mono (typewriter/evidence aesthetic).

**Secondary font:** Special Elite (handwritten-typewriter hybrid) for annotations.

**Tertiary font:** Inter Tight for narrator captions only.

**Two-tier caption system** (ASS):

- Connector words: Inter Tight Regular, 44px, pale cream (#E8E4D8), 82% opacity
- Keywords: Inter Tight Bold, 68px, blood red (#B32020), 100% opacity, black 2px stroke

**Reveal style:** Typewriter for evidence and quotes (character-by-character, 60ms per char, with faint clicking SFX). Standard fade+drift for narrator captions.

**Section title cards:**

- Full-bleed muted black (#0A0A08) background via FFmpeg `color=c=0x0A0A08:s=1920x1080:d=5`
- Pre-title: "EXHIBIT 03 —" in 32pt Courier Prime, letter-spaced 200, red, drawtext
- Main title in 120pt Courier Prime Bold, pale cream, drawtext
- Horizontal dotted rule: pre-rendered PNG (Method B)
- 3-second hold, 1.2s dissolve

### 3.8 Transitions

| Transition | Duration | FFmpeg xfade | Use Case |
|---|---|---|---|
| Crossfade | 900ms | `fade` | Default |
| Dissolve through black | 1.5s | `fadeblack` | Between evidence items |
| Luma fade through deep red | 1.2s | via red color frame insert | Revelation of key evidence |
| Dissolve | 900ms | `dissolve` | Secondary default |
| Slow morph (RIFE) | 1.0s | RIFE + concat | Same subject, time-shifted |
| Match cut on shape | 0ms | Direct concat | Composition continuity |
| Circle close → open | 1.4s | `circleclose` then `circleopen` | Chapter breaks |
| Slow wipe | 1.0s | `slideleft` / `slideright` at slowest | Use sparingly |

Forbidden: whip, crash, glitch, fast block-wipe.

### 3.9 Audio Design

- **Music bed:** Dark ambient, drone-heavy, cello/double-bass-forward, sparse percussion. 55–65 BPM. Inspiration: Hildur Guðnadóttir (Chernobyl OST), Trent Reznor & Atticus Ross (Gone Girl).
- **Voiceover:** Chirp 3 HD "en-US-Studio-Q" or deepest available male voice at 0.9x rate. Subtle reverb/room tone added in post.
- **Ambient beds:** Room tone (office hum, distant traffic, indoor ambiance) under every scene at -36 LUFS. This is the secret to the investigative feel.
- **Whooshes:** Low-frequency rumbles only, no bright whooshes.
- **Stingers:** Deep sub-bass hits on revelations (never aggressive — like a distant door closing).
- **Typewriter SFX:** Synced to evidence text reveals.
- **Foley:** Paper shuffling, file cabinet drawers, tape recorder clicks, distant phones, pen scratching on paper.

---

## 4. Register-Specific Negative Prompt Additions

Appended to global universal negative:

```
warm golden light, luxurious aesthetic, bright cheerful mood, vibrant saturated
colors, modern sleek tech aesthetic, clinical clean studio lighting, bokeh
background blur that is decorative, lens flares as hero element, joyful
expressions, celebratory atmosphere, aspirational lifestyle imagery
```

---

## 5. Script Pacing Guidance

- 125–140 words per minute (measured, deliberate)
- 8–12 seconds per static scene
- Evidence scenes can run 15–20 seconds with progressive annotation reveals
- 5 seconds per Seedance I2V
- Minimum shot length: 5 seconds
- Long pauses after revelations are mandatory (1.5–2.5 seconds of room tone only)
- Chapter markers: every 150–180 seconds

The script should be structured as a case file: establish → evidence → testimony → verdict. Pacing should slow at each revelation.

---

## 6. QA Checklist (Register 03)

- [ ] Production Mode is PURE_STATIC or LIGHT_MOTION (not BALANCED/KINETIC)
- [ ] I2V scene count matches mode budget
- [ ] No camera move exceeds 8% zoom range
- [ ] All creep moves are purely linear (no easing)
- [ ] Investigative Bleach Bypass LUT applied to every image
- [ ] Heavy film grain (12%) on every scene
- [ ] Room tone present under every VO section
- [ ] At least one evidence-style scene per chapter
- [ ] Redaction bars used where appropriate (names, documents)
- [ ] Courier Prime used for all titles and annotations
- [ ] No warm light leaks, no bokeh, no bloom
- [ ] Transitions ≥800ms
- [ ] Music bed includes drone/sustained tones
- [ ] At least 2 dead-silent moments (2s+ of only room tone) per 10 minutes
- [ ] Chromatic aberration subtle (≤2px) — not stylized glitch
- [ ] Register-specific negative merged with global universal
- [ ] Style DNA anchors verified in at least 3 sampled prompts

---

## 7. Example Prompt Pack (Multi-Niche)

### Example A — Crime — "The Ice-Pick Killer"

**Scene 001 (Cold open, Seedance I2V):**

```
Seedream 4.5 image prompt:
A single ice pick resting on a stained wooden kitchen table under a single
harsh desk lamp, deep shadows surrounding the lit area, slight top-down
oblique angle, dust motes visible in the light beam, mood of arrested
violence
+ [Style DNA]
+ [Register 03 anchors: dark investigative documentary photography, heavy
   chiaroscuro lighting, bleach bypass aesthetic, 16mm film grain,
   surveillance-photograph quality, high detail but degraded...]
+ [Global universal negative + Register 03 additions]

Seedance 2.0 Fast prompt:
slow 5-second push-in toward the ice pick, camera descending almost
imperceptibly, subtle fluorescent light flicker, completely stable and
smooth motion, no shake, investigative documentary cinematography,
duration 5 seconds
```

### Example B — Revenge Story — "He Waited Three Years"

**Scene 028 (Planning scene, static + evidence overlay):**

```
Seedream 4.5 image prompt:
A dim garage workshop at night, a corkboard covering the back wall
with photographs and newspaper clippings connected by red thread, a
single desk lamp illuminating the board from below creating long upward
shadows, the back of a figure in silhouette studying the board, oblique
over-the-shoulder camera angle, mood of cold deliberation

Motion: creep_in, 12 seconds, zoom 1.0→1.07, pure linear
Parallax: 3-layer enhanced differential
Grade: Investigative Bleach Bypass
Overlays (FFmpeg):
  - Case number drawtext "CASE # UNSOLVED" upper-left in Courier Prime
    monospace 28pt, appears at scene start
  - Evidence circle PNG (Method B) fades in at t=5s around one specific
    photograph on the board
  - Annotation drawtext "her brother, 2021" in Special Elite 32pt, pale
    yellow, appears at t=6.5s beside the circle
Transition out: fadeblack 1.5s
Audio: room tone (light workshop hum) + cello drone + distant traffic
```

### Example C — Financial Fraud — "The 47-Page Contract"

**Scene 054 (Evidence scene, static + stacked drawtext):**

```
Seedream 4.5 image prompt:
A stack of consumer complaint letters piled on a government office desk,
manila folders with visible edge stains, single desk lamp from upper right
creating long shadows, slight top-down angle, muted desaturated palette
with brown paper tones, aged document appearance, mood of bureaucratic
weight

Motion: creep_in, 12 seconds, zoom 1.0→1.07
Parallax: 3-layer enhanced differential
Grade: Investigative Bleach Bypass
Overlays (FFmpeg):
  - Red evidence circle PNG fades in at t=3s around top folder (1.2s fade)
  - Handwritten drawtext "847 COMPLAINTS" in Special Elite 38pt, pale
    yellow at t=4.5s
  - Second evidence circle at t=7s around the lamp base
  - Annotation drawtext "UNANSWERED" at t=8s
  - Document stamp PNG "CFPB CASE FILE" upper-right at t=10s (slight rotation)
Transition out: fadeblack 1.5s
Audio: room tone + distant phone ringing + paper rustle foley
```

---

## 8. Reference Channels & Material

- **LEMMiNO** — reference for investigative pacing and density
- **MrBallen** — contemporary crime narrative register
- **Internet Historian** — investigative variant (slightly more playful)
- **The Why Files** — investigation storytelling structure
- **Netflix's "Dirty Money"** — tone for financial investigation
- **Chernobyl (HBO miniseries)** — color palette and grain reference
- **Gone Girl (film)** — grade reference (Fincher/Pfister)
- **Zodiac (film)** — pacing reference for patient investigative tension

Before any session in this Register, watch 10 minutes of a LEMMiNO video. Pay attention to how rarely the camera moves and how much the grain does the work.
