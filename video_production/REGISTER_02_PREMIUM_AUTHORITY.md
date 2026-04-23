# REGISTER 02 — PREMIUM AUTHORITY

**Positioning:** Luxury editorial. The visual language of a Chase Private Client ad, a Bloomberg Originals documentary, or a Robb Report feature. Ben Felix's calm authority meets editorial glossy-magazine photography. Optimized for premium credit cards, luxury real estate, high-net-worth finance, wealth management, and any content that treats the viewer as someone of consequence.

**Core principle:** The viewer should feel they are being addressed as someone of consequence. Restraint over flash. Every frame feels expensive without feeling gaudy. Motion is glacial and confident.

**Motion constraint compliance:** No shake, no whip, no crash zoom. Motion is even slower than Register 01 — this register is defined by its stillness.

> This file defines a **Production Register** as documented in `README.md`. It composes with the Project's **Style DNA** at prompt-build time. Register decisions override Style DNA on cinematic grammar (grade, motion, typography). Style DNA wins on subject-matter presentation.

---

## 1. When To Use This Register

**Fits best when:**

- Reviewing premium/luxury credit cards ($450+ annual fee)
- Profiling wealth-building strategy, private banking, investment vehicles
- Luxury real estate (listings, mogul portfolios, ultra-prime markets)
- Travel hacking at the first-class / top-tier lounge level
- High-net-worth personal finance (estate strategy, tax planning for the wealthy)
- Long-form authority content (20+ minute deep dives where gravitas matters)
- Audience is 30-55, household income $150K+, high-intent

**Niche fit map:**

| Niche | Use Premium for... |
|---|---|
| Personal Finance & Investing | HNW segments, wealth management, estate strategy |
| Credit Cards (CardMath) | Premium/luxury card reviews (Platinum, Reserve, Centurion) |
| Real Estate & Mortgage | Luxury real estate, ultra-prime markets, commercial trophy assets |
| Legal, Tax & Insurance | Estate planning, private wealth structures |
| Business & B2B SaaS | Enterprise product positioning, premium services |
| Crime / Revenge / Family | Not a fit — use 03 Noir or 05 Archive |

**Avoid when:**

- The content is beginner-level or budget-focused (use 01 or 04)
- The script is entertainment-first or reactive
- You need urgency or propulsion (use 03)

---

## 2. Production Mode Recommendations

| Mode | Recommendation | Rationale |
|---|---|---|
| `PURE_STATIC` | Not recommended | Luxury motion genuinely sells the feel |
| `LIGHT_MOTION` | Acceptable | Minimum for this Register |
| `BALANCED` | ✓ Default | Right balance of stillness and luxury motion |
| `KINETIC` | ✓ Ideal | When budget allows |

### I2V Budget Allocation

In `BALANCED` (~17 Seedance scenes per 172-scene video), spend in this order:

1. Hero opener (1 scene — slow rotation of the hero product, 5s)
2. Chapter openers (4–5 scenes — one per chapter, always a luxury motion beat)
3. Product beauty shots (4–5 scenes — card rotating on marble, watch face catching light, champagne pour, pages of a passport turning)
4. Lifestyle motion (3–4 scenes — steam rising from espresso, curtain moving in breeze, a hand reaching for a key)
5. Revelation beat (1 scene)
6. Closing image (1 scene — glacial pull-back)

In `KINETIC` (~26 scenes), add more lifestyle motion and multiple product-beauty-shot angles.

---

## 3. Full Effect Stack

### 3.1 Image Generation (Seedream 4.5)

**Aspect ratio:** 16:9 at 3840×2160 native.

**Register-specific anchors:**

```
luxury editorial photography, cinematic natural lighting with strong directional
key light, shallow depth of field with creamy bokeh, warm tungsten and amber
highlights, rich deep shadows with preserved detail, 85mm lens characteristics,
Leica M camera aesthetic, Kodak Portra 400 color palette, subtle grain,
golden hour or interior tungsten lighting preferred, rule-of-thirds or centered
symmetrical composition, generous negative space, aspirational atmosphere,
high detail
```

**Subject prompt template:**

```
[LUXURY SUBJECT], [UPSCALE ENVIRONMENT], [WARM DIRECTIONAL LIGHT SOURCE],
[INTIMATE CAMERA DISTANCE], [REFINED MOOD]
```

**Example (credit card — premium product hero):**

```
A single metal credit card resting on a charcoal linen surface beside a
crystal coupe of champagne and a leather passport wallet, single warm window
light from upper right creating long elegant shadows, extreme shallow depth
of field with the card tack-sharp and the champagne glass falling into soft
bokeh, intimate overhead-45-degree camera angle, refined contemplative mood,
rule-of-thirds with card on left third, generous negative space upper right
```

**Example (luxury real estate — exterior establishing):**

```
A stone-facade modernist villa at golden hour, warm low sun washing the
facade in amber, olive trees flanking a gravel drive, a single pendant light
glowing in the entryway, architectural-photography composition with the
villa on the right third and the drive leading from lower left, refined
aspirational mood, 85mm compressed perspective
```

**Example (HNW finance — private client meeting):**

```
A leather-bound portfolio resting on a mahogany conference table, a gold
fountain pen beside it, a second leather document wallet closed nearby, soft
directional light from upper left creating long shadows, intimate overhead
45-degree angle, aspirational gravitas mood, rule-of-thirds with portfolio
on left third, generous negative space upper right for editorial overlay
```

**Prompt constraints:**

- Always specify Leica M / Kodak Portra 400 / 85mm
- Always specify warm directional light (never flat, never cold)
- Always specify shallow DOF with creamy bokeh
- Composition bias: leave right third or upper third empty for overlays
- Generate at 4K — luxury lives on crispness

### 3.2 Camera Motion (Glacial, Eased)

Built on restraint. Even slower than Register 01.

**Move library:**

| Move | Duration | Pan | Zoom | Ease |
|---|---|---|---|---|
| `breath_push` | 10s | none | 1.0 → 1.08 | ease-in-out sine |
| `breath_pull` | 10s | none | 1.08 → 1.0 | ease-in-out sine |
| `luxury_drift` | 12s | ±3% width | 1.04 → 1.06 | linear with soft bookends |
| `hero_reveal` | 11s | +2% height | 1.10 → 1.0 | ease-out cubic |
| `settle` (micro-motion hold) | 6s | ±0.3% drift | 1.02 → 1.03 | sine breath |

**Never exceed 10% zoom range.** The stillness is the statement.

**FFmpeg breath_push (10-second, 1.0→1.08):**

```bash
ffmpeg -loop 1 -i scene_001.png -vf \
"zoompan=z='min(zoom+0.00013,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':\
d=300:s=1920x1080:fps=30,format=yuv420p" \
-c:v libx264 -crf 16 -preset slow -t 10 scene_001_breath.mp4
```

Note `crf 16` (vs Register 01's 18) — this register demands higher image fidelity.

### 3.3 Depth-Aware Parallax

Same pipeline as Register 01, but **reduced differential** for subtlety:

- Background: 1.0x
- Midground: 1.2x (vs 1.4x in Register 01)
- Foreground: 1.5x (vs 1.9x in Register 01)

The parallax should be almost subliminal.

### 3.4 Color Grade

**"Golden Hour Editorial"** LUT:

- Lift shadows +12 (protect darks, film-like base)
- Gamma 0.92
- Gain highlights -8 (never blow out; preserve amber glow)
- Saturation -8 global
- Saturation +15 on orange/yellow axis (gilded warmth)
- Saturation -5 on blue axis
- Warm midtones +12 (Portra 400 signature)
- Slight lift to blue shadows (+3)
- Soft roll-off on highlights

**FFmpeg grade chain:**

```
eq=contrast=1.04:brightness=0.015:saturation=0.92:gamma_r=1.05:gamma_g=1.0:gamma_b=0.96,
colorbalance=rs=0.02:gs=0.0:bs=-0.04:rm=0.06:gm=0.02:bm=-0.06:rh=0.08:gh=0.04:bh=-0.08,
curves=preset=color_negative
```

Or load LUT: `golden_hour_editorial.cube`.

### 3.5 Atmospheric Overlays

**Always on:**

- 16mm film grain at 6% opacity (subtler than Register 01)
- Soft bokeh overlay at 8% opacity (circular, warm, drifting slowly — pre-rendered WebM)
- Vignette at 20% (stronger than Register 01)

**Situational:**

- Warm light leak from upper right at 15% opacity on hero scenes
- Dust motes in beam of light (only when image has visible light beam)
- Soft bloom on specular highlights (glass, metal edges) at 8%
- No chromatic aberration
- No scan lines, no glitch ever

### 3.6 Overlays (Replacing Old Remotion Components)

**Method A — Bake into Seedream prompt.** Prefer this register for editorial flourishes. Seedream 4.5 renders luxury textures and composition hints beautifully.

```
...composition leaves upper-right generous negative space for editorial
typography overlay, subtle thin gold horizontal rule visible in lower third...
```

**Method B — FFmpeg PNG overlay.** Pre-render elegant assets once, reuse:

- Gold underline stroke (1px, #D4AF37, 200px wide)
- Decorative ornament / fleuron (centered above titles)
- Thin gold vertical divider (for comparison lockups)
- Serif numerals in SVG/PNG (for large callout numbers, 120pt+)
- Photo-corner tabs (for "physical photograph on a table" treatment)

**Method C — FFmpeg drawtext.** For dynamic text, year stamps, metadata.

**Signature overlay patterns for this Register:**

- **Serif number callout** (Method B or C): Large IBM Plex Serif numeral, elegant fade-in 400ms, hold, fade-out. No counter animation — just elegant appearance.
- **Thin gold underline** (Method B): 1px stroke, #D4AF37, draws on from left to right in 500ms via a pre-rendered PNG sequence or sprite fade.
- **Full-frame pull quote card** (Method C on black background): GT Sectra Italic, center-aligned, 3.5-second hold.
- **Year/date stamp** (Method C): Small GT Sectra 28pt, upper-left corner, 60% opacity, appears at t=1.5s.
- **Spec-sheet reveal** (Method C, staggered drawtext): 6–8 benefit lines reveal with 400ms stagger, each drawtext with its own `enable` expression.
- **Comparison lockup** (split-screen of two product images, Method B for thin gold divider between them).

**Example — spec-sheet reveal via staggered drawtext:**

```bash
ffmpeg -i black_bg.mp4 -vf \
"drawtext=text='1 million point welcome bonus':fontfile=/fonts/InterTight-Regular.ttf:
 fontsize=44:fontcolor=0xF5EFE4:x=320:y=220:enable='between(t,0.4,18)',
 drawtext=text='Centurion Lounge access worldwide':fontsize=44:fontcolor=0xF5EFE4:
 x=320:y=290:enable='between(t,0.8,18)',
 drawtext=text='Fine Hotels and Resorts elite status':fontsize=44:fontcolor=0xF5EFE4:
 x=320:y=360:enable='between(t,1.2,18)'" \
spec_sheet.mp4
```

**Forbidden in this Register:**

- Bar charts (too utilitarian)
- Animated maps (wrong register)
- Highlight rings (too journalistic)
- Emoji or icon pops
- Bright colored highlights

### 3.7 Typography

**Primary font:** GT Sectra (or Canela, if licensed). Fallback: Playfair Display.

**Secondary font:** Inter Tight for subtitles and metadata only.

**Two-tier caption system** (modified for this register, via ASS):

- Connector words: Inter Tight Light, 42px, warm cream (#F5EFE4) with 1px shadow, 85% opacity
- Keywords: GT Sectra Medium Italic, 68px, champagne gold (#D4AF37), 100% opacity, subtle glow

**Reveal style:** Gentle fade-in with slight vertical drift (10px up over 500ms, ease-out). NO bounce, NO overshoot.

**Section title cards:**

- Full-bleed black (#000000) background via FFmpeg `color=c=black:s=1920x1080:d=5`
- Title in 140pt GT Sectra Light Italic, centered (drawtext)
- Thin gold horizontal rule (Method B PNG, 1px, #D4AF37, 200px wide, centered)
- Subtitle in 32pt Inter Tight, letter-spaced 200, uppercase, cream
- 3-second hold, 1.2s crossfade to next

### 3.8 Transitions

| Transition | Duration | FFmpeg xfade | Use Case |
|---|---|---|---|
| Crossfade | 800ms | `fade` | Default |
| Luma fade through black | 1.5s | `fadeblack` | Chapter breaks |
| Luma fade through cream | 1.0s | custom via color frame | Product beauty transition |
| Dissolve | 800ms | `dissolve` | Secondary default |
| Slow morph (RIFE) | 1.2s | RIFE + concat | Same subject, different angle |
| Match cut | 0ms | Direct concat | Composition continuity |
| J-cut / L-cut | 800ms audio overlap | Audio editing | Narrative flow |

Never under 500ms. The pace is the product.

### 3.9 Audio Design

- **Music bed:** Orchestral minimalism, neoclassical piano. 55–70 BPM. Sources: Ólafur Arnalds-style libraries. Volume: -24 LUFS (quieter than Register 01).
- **Voiceover:** Chirp 3 HD "en-US-Studio-O" or authoritative female voice at 0.92x rate. Alternate: "en-GB-Studio-B" for British gravitas.
- **Whooshes:** Nearly absent. Only on hero title reveal.
- **Stingers:** Crystal-glass chime at each chapter card.
- **Risers:** Orchestral swells only, 4-second builds, never synthetic.
- **Foley:** Lush — champagne pour, metal card click on marble, leather creak, pen on heavy paper, door handle click.

---

## 4. Register-Specific Negative Prompt Additions

Appended to global universal negative:

```
cheap materials, plastic, chrome, neon, fluorescent lighting, cold color
temperature, harsh shadows, cluttered composition, busy backgrounds, synthetic
textures, modern tech aesthetics, clinical sterility, aggressive chromatic
aberration, VHS artifacts, glitch effects, over-saturation, HDR-like processing
```

---

## 5. Script Pacing Guidance

- 115–130 words per minute
- 9–13 seconds per static scene
- 5 seconds per Seedance I2V
- 12–16 seconds per product beauty scene
- Minimum shot length: 6 seconds
- Chapter markers every 180 seconds

Silences and breath pauses are features. Leave 0.5–1.0s of room tone after key statements.

---

## 6. QA Checklist (Register 02)

- [ ] Production Mode is BALANCED or KINETIC (not PURE_STATIC)
- [ ] I2V scene count matches mode budget
- [ ] No camera move exceeds 10% zoom range
- [ ] No move faster than 0.00015 zoom-per-frame
- [ ] Every image has Kodak Portra 400 / 85mm / Leica M anchors
- [ ] Bokeh overlay visible on at least 80% of scenes
- [ ] Film grain + vignette on every scene
- [ ] Golden Hour Editorial LUT applied consistently
- [ ] No bar charts, highlight rings, or emoji
- [ ] All titles use GT Sectra family
- [ ] Gold accent (#D4AF37) used consistently
- [ ] Transitions all ≥500ms
- [ ] Music bed ≤ -24 LUFS under VO
- [ ] No logo/brand hallucinations in generated images
- [ ] At least 3 seconds of "visual breath" per 60s of runtime
- [ ] Register-specific negative merged with global universal
- [ ] Style DNA anchors verified in at least 3 sampled prompts

---

## 7. Example Prompt Pack (Multi-Niche)

### Example A — CardMath — "The Economics of the Amex Centurion"

**Scene 001 (Hero opener, Seedance I2V):**

```
Seedream 4.5 image prompt:
A single black metal credit card suspended mid-air above a polished black
marble table, dramatic single overhead warm tungsten spotlight creating a
halo effect and long shadow, extreme shallow depth of field with surroundings
falling into deep creamy bokeh, centered symmetrical composition with card
floating in upper third, mood of exclusivity and gravity
+ [Style DNA]
+ [Register 02 anchors: luxury editorial photography, 85mm lens, Leica M,
   Kodak Portra 400, shallow DOF with creamy bokeh, warm tungsten highlights,
   rich deep shadows...]
+ [Global universal negative + Register 02 additions]

Seedance 2.0 Fast prompt:
card slowly rotates 10 degrees on vertical axis over 5 seconds, incredibly
smooth and stable motion, no wobble, no shake, completely glacial pace,
dust motes drifting through light beam, slight lens breathing effect,
high-end commercial cinematography, Rolex brand film aesthetic,
duration 5 seconds
```

### Example B — Luxury Real Estate — "Inside a $40M Aspen Compound"

**Scene 022 (Exterior establishing, static):**

```
Seedream 4.5 image prompt:
A stone-facade modernist mountain compound at golden hour, aspen trees in
the foreground, Rocky Mountain peaks in the background catching warm alpine
glow, a single black Range Rover parked in the stone drive, warm interior
lights just beginning to show, architectural photography composition,
extreme shallow depth of field with the Range Rover in mid-ground, 85mm
compressed perspective

Motion: luxury_drift (left direction), 12s, pan -3% width, zoom 1.04 → 1.06
Parallax: 3-layer reduced differential
Grade: Golden Hour Editorial
Overlays: drawtext "ASPEN, COLORADO" in GT Sectra 28pt, letter-spaced 200,
  champagne gold, upper-left, appears at t=2s
Transition out: dissolve 800ms
```

### Example C — Private Wealth — "The Family Office Playbook"

**Scene 048 (Spec-sheet reveal, image + drawtext staggered):**

```
Seedream 4.5 image prompt (black background):
Pure matte black background with a subtle vertical gradient to charcoal at
the edges, centered composition with generous breathing room, extremely
minimal, editorial luxury typography background, no subjects visible

Motion: static_hold (no motion)
Overlays (FFmpeg drawtext staggered):
  - Title "SERVICES PROVIDED" in GT Sectra Light Italic 90pt, centered
    top-third, cream (#F5EFE4), appears at t=0.5s
  - Thin gold horizontal rule (PNG method B) below title, draws on at t=1s
  - 6 service items in Inter Tight Regular 42pt, cream, left-aligned at x=320:
    - "Multi-jurisdictional tax structuring" at t=1.5s
    - "Private investment deal-flow" at t=1.9s
    - "Succession and estate architecture" at t=2.3s
    - "Bespoke insurance and asset protection" at t=2.7s
    - "Philanthropic vehicle management" at t=3.1s
    - "Concierge lifestyle operations" at t=3.5s
  - Duration: 18 seconds total
  - Audio: sustained piano chord, meaningful pauses between items
  - VO pace: 110 WPM, 0.92x rate
```

---

## 8. Reference Channels & Material

- **Bloomberg Originals** — overall aesthetic and gravitas
- **The Hustle / Magnates Media premium episodes** — biographical finance in this register
- **Rolex Cinema YouTube channel** — pure reference for luxury brand film pacing
- **The Plain Bagel** — calm authority voiceover pace and tone
- **Ben Felix (Common Sense Investing)** — sober finance authority
- **Hermès Carré** — reference for glacial camera work on products

Watch 90 seconds of a Rolex brand film before any session in this Register. It resets your sense of how slow "slow" can be.
