# REGISTER 04 — SIGNAL (TECH FUTURIST)

**Positioning:** The visual language of ColdFusion, Cleo Abram, Veritasium's tech episodes, Apple keynote B-roll, and Bloomberg Originals' tech documentaries. Clean, futuristic, precise. The primary Register for B2B SaaS, AI tools education, cybersecurity, crypto/payment tech, and any fintech deep-dive where "this is how the system works" is the promise.

**Core principle:** The viewer should feel they are inside the machine. Everything is clean, precise, and intentional. Negative space is a feature. Motion is deliberate and systems-like — not organic, not shaky.

**Motion constraint compliance:** No shake, no whip, no crash zoom, no glitch-as-chaos. This Register uses glitch and scan lines as *aesthetic* not as *disruption* — subtle, controlled, stable.

> This file defines a **Production Register** as documented in `README.md`. It composes with the Project's **Style DNA** at prompt-build time. Register decisions override Style DNA on cinematic grammar (grade, motion, typography). Style DNA wins on subject-matter presentation.

---

## 1. When To Use This Register

**Fits best when:**

- Explaining a technology, system, or algorithm
- Reviewing B2B SaaS products, AI tools, developer tools
- Covering cybersecurity, encryption, network mechanics, fraud detection
- Contactless payment, NFC, chip tech, biometric auth
- Crypto, blockchain, stablecoin, CBDC content
- AI underwriting, machine learning in credit scoring, AI automation
- Future-of-money, fintech innovation pieces
- AI tools tutorials (Operscale second-channel content)

**Niche fit map:**

| Niche | Use Signal for... |
|---|---|
| Business & B2B SaaS | All product reviews, tool comparisons, tech explainers (default) |
| Credit Cards (CardMath) | Chip tech, NFC, tokenization, payment-network mechanics, fraud-prevention tech |
| Personal Finance | Robo-advisors, algorithmic trading, AI-driven investing |
| Legal, Tax & Insurance | LegalTech, AI underwriting, insurtech |
| Real Estate & Mortgage | PropTech, AI valuation, mortgage-origination tech |
| Crime / Revenge / Family | Not a fit — use 03 Noir or 05 Archive |

**Avoid when:**

- The topic is historical or nostalgic (use 05)
- The content is lifestyle-forward (use 02)
- The topic is investigative/negative (use 03)
- The audience is non-technical consumer (use 01)

---

## 2. Production Mode Recommendations

| Mode | Recommendation | Rationale |
|---|---|---|
| `PURE_STATIC` | Acceptable | Works but misses the register's strength |
| `LIGHT_MOTION` | Acceptable | Minimum for tech-motion beats |
| `BALANCED` | ✓ Default | Right balance for most tech deep-dives |
| `KINETIC` | ✓ Ideal | Tech-motion genuinely sells the feel |

### I2V Budget Allocation

In `BALANCED` (~17 Seedance scenes per 172-scene video), spend in this order:

1. Hero opener (1 scene — slow rotation of a chip / product / device, 5s)
2. Chapter openers (4–5 scenes — one per chapter, usually a data-flow or mechanism reveal)
3. Mechanism demonstrations (5–6 scenes — showing the system in motion: packet flow, signal propagation, UI state change)
4. Product beauty shots (3–4 scenes — rotating hardware, flowing data visualization, light scanning across surface)
5. Revelation beat (1 scene)
6. Closing image (1 scene)

In `KINETIC` (~26 scenes), add multiple angles on the mechanism and more atmospheric tech-motion.

---

## 3. Full Effect Stack

### 3.1 Image Generation (Seedream 4.5)

**Aspect ratio:** 16:9 at 3840×2160 (tech imagery needs resolution).

**Register-specific anchors:**

```
clean modern product photography, studio lighting with controlled reflections,
cool color temperature with selective warm accents, deep blue-black shadows,
subtle specular highlights on metallic and glass surfaces, shallow depth of
field, macro or architectural perspective, minimalist composition, Apple
keynote aesthetic, Bloomberg Originals tech documentary look,
Blade-Runner-2049-meets-Dieter-Rams sensibility, high detail, tack-sharp
focus, subtle bloom on bright elements
```

**Subject prompt template:**

```
[TECH SUBJECT], [MINIMALIST STUDIO OR FUTURISTIC ENVIRONMENT],
[COOL-KEY-WITH-WARM-FILL LIGHTING], [PRECISE CAMERA ANGLE],
[CLINICAL MOOD]
```

**Example (CardMath — biometric contactless payment):**

```
Macro close-up of a sleek black payment terminal with a glowing cyan NFC
indicator ring, a metal credit card hovering one centimeter above the
terminal surface with a subtle electric-blue data visualization effect
between them, matte black background with soft atmospheric blue ambient
light, single warm orange accent light from upper right creating specular
rim on card edge, extreme shallow depth of field, 90-degree side-view angle,
futuristic clinical mood
```

**Example (B2B SaaS — product UI close-up):**

```
An extreme close-up of a laptop screen displaying a muted dashboard UI,
blurry out-of-focus data visualizations visible on screen, atmospheric
blue ambient light in the room, single warm amber rim light from upper
left on the laptop edge, matte black surroundings falling into deep
shadow, macro perspective with extreme shallow DOF, clinical futuristic
mood, no readable text on the screen, no brand logos
```

**Example (AI tools education — conceptual):**

```
A stylized neural network visualization rendered as translucent geometric
cyan shapes floating in a matte black void, subtle particles of light
flowing between nodes, warm amber accent lights on the foreground nodes,
architectural perspective looking into the network, clinical futuristic
mood, Blade Runner 2049 sensibility
```

**HUD-integrated-into-image pattern (replaces Remotion HUD overlays):**

Since Remotion is removed, HUD elements are now baked into the Seedream prompt directly:

```
...with thin cyan HUD corner brackets in all four corners of the image,
a small monospace timestamp readout in the upper-right corner, a thin
data counter text in the lower-right, a minimalist schematic icon in
the lower-left, all rendered as subtle graphic UI elements integrated
into the scene, no readable specific values...
```

Seedream 4.5 produces these graphic elements convincingly. Overlay the actually-readable data via FFmpeg drawtext (Section 3.6).

**Prompt constraints:**

- Always specify cool + warm accent lighting (never all cool)
- Always dark backgrounds with selective highlights
- Include "Apple keynote aesthetic" OR "Bloomberg tech documentary"
- Include "tack-sharp focus" + "subtle bloom"
- Generate at 4K — tech lives on crispness
- When HUD elements wanted: bake them in as described above

### 3.2 Camera Motion (Precision, Systems-Like)

Motion in this Register is **geometric and deliberate** — programmed, not organic.

**Move library:**

| Move | Duration | Pan | Zoom | Ease |
|---|---|---|---|---|
| `precision_push` | 7s | none | 1.0 → 1.12 | ease-in-out quart |
| `precision_pull` | 7s | none | 1.12 → 1.0 | ease-in-out quart |
| `lateral_track_right` | 9s | +5% width | 1.06 static | linear (tracking shot feel) |
| `lateral_track_left` | 9s | -5% width | 1.06 static | linear |
| `reveal_down` | 8s | -3% height | 1.10 → 1.02 | ease-out expo |
| `orbital_micro` | 10s | ±1.5% pan arc | 1.04 → 1.08 | sine |
| `system_hold` | 6s | none | 1.02 → 1.03 | linear |

**Never exceed 12% zoom range.**

**FFmpeg precision_push with sharp ease:**

```bash
ffmpeg -loop 1 -i scene_001.png -vf \
"zoompan=z='if(lt(on,105),1+0.00114*pow(on/105,2),1.12)':\
x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':\
d=210:s=1920x1080:fps=30,format=yuv420p" \
-c:v libx264 -crf 17 -preset slow -t 7 scene_001_precision.mp4
```

The `pow(on/105, 2)` creates a quadratic ease-in — robotic/programmed feel.

### 3.3 Depth-Aware Parallax

Standard Register 01 differential:

- Background: 1.0x
- Midground: 1.4x
- Foreground: 1.9x

Added effect: **atmospheric depth fog** on background layer (8% opacity black-blue gradient PNG overlay) that intensifies with zoom. Creates Blade-Runner-like "deep space" feel.

### 3.4 Color Grade

**"Signal Cool"** LUT:

- Lift shadows +6
- Gamma 0.93
- Gain highlights -3
- Saturation -18 globally
- Saturation +22 on cyan/blue axis (the signature move)
- Saturation +15 on orange axis (warm accent contrast)
- Crush blacks slightly
- Push highlight toward electric blue on brightest areas

**FFmpeg grade chain:**

```
eq=contrast=1.10:brightness=0.01:saturation=0.82:gamma_r=1.0:gamma_b=1.02,
colorbalance=rs=-0.08:gs=0.0:bs=0.12:rm=-0.05:gm=-0.02:bm=0.08:rh=-0.12:gh=0.0:bh=0.18,
curves=preset=medium_contrast
```

Or load LUT: `signal_cool_tech.cube`.

### 3.5 Atmospheric Overlays

**Always on:**

- Fine 35mm film grain at 5% opacity
- Vignette at 12%
- Subtle scan lines at 4% opacity (via pre-rendered WebM)
- Soft bloom on specular highlights at 15% (via FFmpeg `gblur` + blend)

**Situational:**

- HUD grid overlay (thin lines, cyan at 8% opacity, pre-rendered PNG) on analysis scenes
- Light particles in cyan or amber at 6% opacity
- Subtle chromatic aberration at frame edges (1px, only on hero scenes)
- Anamorphic lens flares in cyan on bright point-lights (8%, horizontal streaks, pre-rendered PNG)
- Volumetric light rays where light source is visible

**Never:**

- Warm golden light leaks
- Heavy film grain
- Dust particles (too organic — save for 05)
- VHS artifacts (too analog)

### 3.6 Overlays (Replacing Old Remotion Components)

**Method A — Bake into Seedream prompt.** The primary method for HUD elements in this Register. Most of the "techy" look is achievable in-image.

Sample prompt anchors for bake-in:

```
...with thin cyan HUD corner brackets in all four corners, a minimalist
monospace timestamp upper-right, a data counter text lower-right, subtle
schematic icon lower-left, atmospheric cyan UI elements rendered as part
of the scene composition...
```

**Method B — FFmpeg PNG overlay.** For consistent HUD elements across all scenes in a video, pre-render a HUD frame PNG and overlay uniformly:

- `hud_frame_signal.png` — 1920×1080 transparent PNG with cyan corner brackets
- `scan_lines_signal.webm` — transparent WebM with subtle horizontal scan lines
- `data_cascade_signal.webm` — pre-rendered "Matrix-style" code rain column, cyan, 30% opacity

```bash
# Apply a global HUD frame over the base scene
ffmpeg -i base.mp4 -i hud_frame_signal.png -filter_complex \
"[0:v][1:v]overlay=0:0:format=auto,format=yuv420p" \
scene_with_hud.mp4
```

**Method C — FFmpeg drawtext / drawbox.** For dynamic counters, timestamps, labels.

Counter animation via drawtext with time-interpolated text:

```bash
# A counter from 0 to 47,281 over 3 seconds starting at t=2s
# Using shell-generated per-frame text OR via a lookup table
# For production: generate a text file with one value per frame and use textfile=
ffmpeg -i base.mp4 -vf \
"drawtext=textfile=counter_frames.txt:fontfile=/fonts/JetBrainsMono-Bold.ttf:
 fontsize=56:fontcolor=0x00D4FF:x=w-tw-80:y=80:enable='between(t,2,5)'" \
scene_with_counter.mp4
```

Generate `counter_frames.txt` via a Python script:

```python
# 90 frames = 3s at 30fps, values from 0 to 47281
import numpy as np
values = np.linspace(0, 47281, 90).astype(int)
with open("counter_frames.txt", "w") as f:
    for v in values:
        f.write(f"{v:,}\n")
```

**Signature overlay patterns for this Register:**

- **HUD corner brackets** (Method A or B): L-shaped cyan brackets in all four corners. Bake into Seedream OR apply uniform PNG overlay.
- **Monospace timestamp** (Method C): "SYS_TIME: 14:27:48.231" upper-right corner in JetBrains Mono 24pt, cyan.
- **Data counter** (Method C via textfile=): Value increments live. Use for "transactions per second," "threats detected," "signals processed."
- **Target acquisition** (Method B pre-rendered PNG sprite sequence OR Method A baked in): Crosshair animates into place via sprite fade-in.
- **Data cascade column** (Method B pre-rendered WebM): Matrix-style code rain on edge of frame.
- **Schematic annotation** (Method A or B): Dotted line pointing at image region with monospace label.
- **Progress ring** (Method B pre-rendered PNG sprite sequence): Thin ring filling to percentage.
- **Terminal text** (Method C drawtext): Green-on-black monospace "typing" via staggered enable expressions.

### 3.7 Typography

**Primary font:** JetBrains Mono (or IBM Plex Mono).

**Secondary font:** Inter Display (for narrator captions).

**Tertiary font:** Space Grotesk for headlines.

**Two-tier caption system** (ASS):

- Connector words: Inter Display Regular, 44px, cool cream (#E8ECEF), 88% opacity
- Keywords: Inter Display Bold, 68px, electric cyan (#00D4FF), 100% opacity, subtle outer glow

**Reveal style:** Scramble/decode effect for technical terms (letters cycle randomly before resolving over 400ms — implement via ASS `\t` animation with character substitution, or as a pre-rendered PNG sequence).

**Section title cards:**

- Full-bleed deep charcoal (#0F1419) via FFmpeg `color=c=0x0F1419:s=1920x1080:d=4`
- Pre-title: "// SEGMENT 04" in JetBrains Mono 28pt, cyan, letter-spaced 200, drawtext
- Main title in 120pt Space Grotesk Bold, pale cream, drawtext
- Animated cyan rule: pre-rendered PNG sprite drawing L-to-R over 1s (Method B)
- HUD brackets remain visible
- 2.5-second hold, 400ms sharp fade

### 3.8 Transitions

| Transition | Duration | FFmpeg xfade | Use Case |
|---|---|---|---|
| Sharp fade | 400ms | `fade` | Default (snappier than Register 01) |
| Dissolve | 600ms | `dissolve` | Between related concepts |
| Luma fade through cyan | 700ms | via cyan color frame insert | Emphasis or reveal |
| Smooth left/right | 500ms | `smoothleft` / `smoothright` | Lateral |
| Slow morph (RIFE) | 1.0s | RIFE + concat | Same subject, transformed |
| Match cut | 0ms | Direct concat | Composition continuity |
| Circle open | 800ms | `circleopen` | Into HUD/data analysis reveal |

Forbidden: anything over 600ms feels sluggish for this Register. No whip, no glitch, no datamosh.

### 3.9 Audio Design

- **Music bed:** Electronic/orchestral hybrid (Hans Zimmer-tech, Daniel Pemberton, Holly Herndon-adjacent). 80–100 BPM. Sources: Epidemic "Futuristic Tech," Artlist "Cinematic Electronic."
- **Voiceover:** Chirp 3 HD "en-US-Studio-M" at 1.0x rate (normal pace — tech has tempo).
- **Ambient bed:** Subtle synth drone or data-center hum at -32 LUFS.
- **SFX:** UI chimes on every graphic reveal (subtle, high-pitched, 100ms), digital "tick" on counter animations, low-frequency sub-bass on HUD frame appearance.
- **Whooshes:** Synthetic, high-frequency, on transitions — clearly electronic in texture.
- **Stingers:** Synth stabs on chapter reveals, never acoustic.

---

## 4. Register-Specific Negative Prompt Additions

Appended to global universal negative:

```
warm golden light, nostalgic aesthetic, film grain heavy, organic textures,
vintage photography look, historical period styling, natural outdoor
environments, handheld camera feel, wood and leather surfaces, rustic
settings, cluttered backgrounds, chromatic aberration as heavy effect,
VHS artifacts, analog distortion, typewriter or paper aesthetic
```

---

## 5. Script Pacing Guidance

- 150–165 words per minute (quickest of the five registers)
- 5–8 seconds per static scene
- 5 seconds per Seedance I2V
- 8–12 seconds per HUD-dense or data-heavy scene
- Minimum shot length: 3.5 seconds
- Chapter markers every 90–120 seconds

Script should read like a Stripe or Anthropic keynote — precise, confident, no filler.

---

## 6. QA Checklist (Register 04)

- [ ] Production Mode is BALANCED or KINETIC (acceptable: LIGHT_MOTION)
- [ ] I2V scene count matches mode budget
- [ ] No camera move exceeds 12% zoom range
- [ ] All moves use precision easing (quart or quadratic)
- [ ] Signal Cool LUT on every image
- [ ] HUD frame present on at least 70% of scenes (Method A or B)
- [ ] JetBrains Mono for all technical labels and corner HUDs
- [ ] Cyan (#00D4FF) + warm amber (#FFA043) are the only two accent colors
- [ ] Film grain ≤ 5% opacity
- [ ] No warm light leaks, no dust, no typewriter aesthetic
- [ ] At least one data-reveal scene per chapter
- [ ] Music is electronic/hybrid, not purely orchestral
- [ ] Scan lines present at ≤5% opacity
- [ ] Chromatic aberration reserved for hero scenes only
- [ ] Register-specific negative merged with global universal
- [ ] Style DNA anchors verified in at least 3 sampled prompts

---

## 7. Example Prompt Pack (Multi-Niche)

### Example A — CardMath — "How Your Chip Card Actually Works"

**Scene 001 (Cold open, Seedance I2V):**

```
Seedream 4.5 image prompt:
Macro close-up of a credit card EMV chip with intricate golden contact
pads, extreme detail visible showing micro-structures, atmospheric dark
blue background, thin cyan volumetric light beam passing across the chip
surface from left to right, warm amber specular highlight on chip corners,
60-degree oblique angle looking along the chip surface, extreme shallow
depth of field, with thin cyan HUD corner brackets in all four corners,
minimalist monospace timestamp upper-right rendered as graphic UI element,
clinical futuristic mood
+ [Style DNA]
+ [Register 04 anchors: clean modern product photography, studio lighting,
   Apple keynote aesthetic, Bloomberg tech documentary, Blade Runner 2049
   sensibility, tack-sharp focus, subtle bloom...]
+ [Global universal negative + Register 04 additions]

Seedance 2.0 Fast prompt:
cyan light beam slowly sweeps across the chip surface from left to right
over 5 seconds, subtle data visualization effect with tiny glowing particles
following the beam, extremely smooth and stable camera motion with minimal
push-in, no shake, clinical Apple-keynote cinematography pace,
duration 5 seconds
```

### Example B — B2B SaaS — "How Stripe Processes 250M Transactions per Second"

**Scene 018 (Mechanism demonstration, static + counter):**

```
Seedream 4.5 image prompt:
A stylized data center corridor rendered in a clinical futuristic style,
rows of server racks extending into atmospheric blue depth, thin cyan
indicator lights glowing on each rack, soft warm amber accent light on
the right wall, architectural perspective looking down the corridor,
matte surfaces, Blade Runner 2049 sensibility, HUD corner brackets
integrated into the image composition

Motion: lateral_track_right, 9 seconds, pan +5% width, zoom 1.06 static
Parallax: 3-layer standard differential with atmospheric depth fog
Grade: Signal Cool
Overlays (FFmpeg):
  - drawtext "TRANSACTIONS/SEC" upper-left in JetBrains Mono 28pt, cyan,
    appears at scene start
  - drawtext textfile= counter from 0 to 247,891 over 5 seconds, JetBrains
    Mono Bold 72px, cyan, upper-right
  - Pre-rendered PNG scan lines overlay at 4% opacity continuous
Transition out: sharp fade 400ms
Audio: electronic pulse track + subtle data-flow whoosh at scene start
```

### Example C — AI Tools — "The Claude Agent Architecture"

**Scene 034 (Conceptual visualization, static + HUD):**

```
Seedream 4.5 image prompt:
A stylized abstract visualization of interconnected translucent cyan
geometric nodes floating in a matte black void, subtle particles of light
flowing between nodes, warm amber accent lights on three foreground nodes,
architectural perspective looking into the network, clinical futuristic
mood, with thin cyan HUD corner brackets integrated into the composition,
a schematic annotation label rendered as a graphic element pointing at one
of the amber nodes

Motion: precision_push, 7 seconds, zoom 1.0 → 1.12, quart easing
Parallax: 3-layer standard differential
Grade: Signal Cool
Overlays (FFmpeg):
  - drawtext "PLANNER" appears at t=1s in JetBrains Mono Bold 44pt, cyan,
    beside one of the amber nodes (use calculated x,y from image layout)
  - drawtext "EXECUTOR" at t=2s, same style, beside second node
  - drawtext "CRITIC" at t=3s, same style, beside third node
  - Pre-rendered anamorphic lens flare PNG fades in at t=5s on brightest
    node
Transition out: dissolve 600ms
Audio: electronic pulse + three UI chimes synced to the three label reveals
```

---

## 8. Reference Channels & Material

- **ColdFusion (Dagogo Altraide)** — tone and pacing
- **Cleo Abram ("Huge If True")** — modern tech optimism aesthetic
- **Bloomberg Originals tech documentaries** — grade and typography
- **Marques Brownlee (MKBHD)** — product macro photography reference
- **Apple keynote B-roll** — pure aesthetic reference
- **Blade Runner 2049** — color palette and atmospheric fog
- **The Social Network** (soundtrack & title sequences) — audio and typography
- **Veritasium's tech episodes** — hybrid of Register 01 and 04

Before any Register 04 session, watch 60 seconds of a ColdFusion video and 60 seconds of an Apple keynote B-roll sequence. The target is the midpoint.
