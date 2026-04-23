# REGISTER 05 — ARCHIVE

**Positioning:** The visual language of Magnates Media, Business Casual, Biographics, Apple TV+ documentary retrospectives, and Ken Burns's PBS work. Nostalgic, warm, narrative-forward. The primary Register for founder stories, company histories, retrospective revenge stories, family drama, real-estate-empire biographies, and any story that lives in the past tense or intimate story-arc present.

**Core principle:** The viewer should feel they are leafing through a carefully curated archive. Images look recovered, not created. Color is warm, faded, and touched by time. Motion honors stillness — the Ken Burns tradition in its truest form.

**Motion constraint compliance:** Zero shake, zero whip. Motion is the slow, reverent Ken Burns pan-and-zoom from which the technique gets its name. This is the Register that most naturally respects your constraint because it was *built* on stable, slow motion.

> This file defines a **Production Register** as documented in `README.md`. It composes with the Project's **Style DNA** at prompt-build time. Register decisions override Style DNA on cinematic grammar (grade, motion, typography). Style DNA wins on subject-matter presentation.

---

## 1. When To Use This Register

**Fits best when:**

- Telling the origin story of a company, product, or industry
- Profiling a founder, executive, historical figure, or family
- Walking through a historical timeline
- Retrospectives on crises and comebacks
- Family drama — saga-structured stories about families, inheritance, generational conflict
- Revenge stories framed as slow-burn biographical ("years later, he came back...")
- Real-estate empire histories (dynastic developer stories, the rise of major real-estate families)
- Any "how we got here" narrative
- Long-form biographical content (30+ minutes)

**Niche fit map:**

| Niche | Use Archive for... |
|---|---|
| Family Drama | All content (default) |
| Crime | Historical cases, decades-old unsolved mysteries |
| Revenge Stories | Slow-burn biographical / past-tense framing |
| Business & B2B | Founder biographies, company-origin stories, mogul histories |
| Credit Cards (CardMath) | Card-company histories (Visa, Amex, Diners Club), founder stories |
| Personal Finance | Biographies of legendary investors (Buffett, Munger, Simons) |
| Real Estate & Mortgage | Real-estate dynasty histories (Trumps before politics, Zells, Hines) |
| Legal, Tax & Insurance | Historical cases, landmark-ruling retrospectives, insurance-industry origins |

**Avoid when:**

- The content is forward-looking or technological (use 04)
- The content is urgent or current-events focused
- The content is luxury-lifestyle focused (use 02)
- The content is investigation-heavy (use 03)

---

## 2. Production Mode Recommendations

| Mode | Recommendation | Rationale |
|---|---|---|
| `PURE_STATIC` | Acceptable | Pure Ken Burns purity — works but misses period-motion beats |
| `LIGHT_MOTION` | ✓ Default | I2V for hero, chapter openers, and a few period drama beats |
| `BALANCED` | ✓ Ideal | When the story earns multiple emotional motion beats |
| `KINETIC` | Not recommended | Breaks reverence; too much motion breaks the archive feel |

### I2V Budget Allocation

In `LIGHT_MOTION` (~9 Seedance scenes per 172-scene video), spend in this order:

1. Hero opener (1 scene — slow push on the central period image, 5s)
2. Chapter openers (3–4 scenes — one per decade or act transition)
3. Emotional beats (2–3 scenes — wedding, funeral, arrival, departure, birth, death)
4. Closing image (1 scene — a gentle pull-back on the final frame)

In `BALANCED` (~17 scenes), add more emotional beats (family reunions, moments of reckoning, periods of transformation) and atmospheric period motion (factory opening, train arriving, parade passing).

---

## 3. Full Effect Stack

### 3.1 Image Generation (Seedream 4.5)

**Aspect ratio:** 16:9 at 3072×1728 (grain/degradation camouflages any compromise).

**Register-specific anchors (era-contingent):**

**For 1950s–1960s content:**

```
vintage Kodachrome photography, 1960s Life magazine aesthetic, warm faded
colors, slightly overexposed highlights, high silver content film grain,
soft focus characteristic of period lenses, natural mid-century interior
lighting, nostalgic warmth, gentle vignetting, slightly yellowed paper
quality, period-accurate wardrobe and styling, 35mm film photography,
archival quality with subtle degradation
```

**For 1970s–1980s content:**

```
1970s/1980s photojournalism aesthetic, Kodak Portra 800 film simulation,
slight color cast warmth with amber and orange dominant, moderate film grain,
slightly softer contrast than modern photography, period-accurate styling,
natural light with era-appropriate indoor tungsten tones, faded archival
quality, 35mm film, slight lens flare characteristics, nostalgic warmth
```

**For 1990s–2000s content:**

```
late 1990s/early 2000s digital photography aesthetic or color-negative film,
slightly saturated colors, period-accurate styling and technology,
early-digital-era warmth, natural mixed lighting, mild grain, familiar
nostalgic quality, archival documentary feel
```

**For contemporary family drama (current-day but story-arc structured):**

```
intimate family documentary photography, warm domestic lighting, natural
indoor light, shallow depth of field, photo-album aesthetic, Kodak Portra
400 simulation on modern subjects, subtle film grain, nostalgic intimate
mood, rule-of-thirds composition, photo-album quality
```

**Subject prompt template:**

```
[HISTORICAL OR INTIMATE SUBJECT], [PERIOD-ACCURATE OR DOMESTIC ENVIRONMENT
WITH SPECIFIC DETAILS], [NATURAL PERIOD LIGHTING], [CLASSIC COMPOSITION],
[NOSTALGIC MOOD]
```

**Example (CardMath — 1958 BankAmericard drop):**

```
A middle-aged man in a 1958 gray flannel suit examining a small plastic
credit card at a walnut kitchen table in a mid-century suburban kitchen,
morning light streaming through a kitchen window with Venetian blinds
casting striped shadows, his wife in a period housedress stands nearby
pouring coffee, Formica counters and Frigidaire refrigerator visible in
background, rule-of-thirds composition
```

**Example (Family drama — contemporary):**

```
A weathered wooden dining table set for eight, mismatched chairs, a folded
letter resting beside one place setting that remains empty, warm afternoon
light streaming through a lace curtain, soft focus in the background
showing family photos on a sideboard, shallow depth of field with the
letter in sharp focus, intimate overhead-45 angle, melancholic nostalgic
mood
```

**Example (Revenge as retrospective biography):**

```
A weathered old lockbox in a garage attic, covered in a thin layer of
dust, a single beam of afternoon sunlight falling across it through a
small round window, wooden floorboards visible in the foreground,
shallow depth of field with the lockbox in sharp focus, slight overhead
angle, mood of long-buried truth resurfacing
```

**Example (Real-estate dynasty — 1980s):**

```
A view of lower Manhattan at dusk in 1985, a single illuminated skyscraper
under construction among older buildings, a warm amber haze over the city,
architectural helicopter angle from across the water, period-accurate
vehicles visible on distant streets, nostalgic ambitious mood,
Kodak Portra 800 simulation
```

**Prompt constraints:**

- Always specify exact decade or year when possible
- Always include period-accurate details (wardrobe, technology, vehicles, signage style)
- Always include film-simulation anchor (Kodachrome, Portra 800, Ektachrome, etc.)
- Ban anachronisms explicitly ("no smartphones, no flat-screens, no modern logos")
- For 1950s–1970s favor "Kodachrome" or "Ektachrome"
- For document/letter scenes specify "aged paper, slight yellowing, minor creases"
- For contemporary family drama, lean into domestic intimacy and warm light

### 3.2 Camera Motion (Classic Ken Burns)

The Register that **defined** slow, stable motion on still images.

**Move library:**

| Move | Duration | Pan | Zoom | Ease |
|---|---|---|---|---|
| `burns_push` | 9s | slight — ±1% | 1.0 → 1.18 | ease-in-out cubic |
| `burns_pull` | 9s | slight — ±1% | 1.18 → 1.0 | ease-in-out cubic |
| `burns_pan_right` | 11s | +6% width | 1.08 static | linear with soft bookends |
| `burns_pan_left` | 11s | -6% width | 1.08 static | linear with soft bookends |
| `burns_reveal_down` | 10s | +4% height | 1.15 → 1.02 | ease-out cubic |
| `burns_pan_and_zoom` | 13s | +5% width + +2% height | 1.0 → 1.15 | ease-in-out |
| `burns_static_breath` | 7s | 0 | 1.03 → 1.05 | sine |

**Zoom range can go up to 18%** — the longer durations absorb the motion gracefully.

**FFmpeg classic burns_push:**

```bash
ffmpeg -loop 1 -i scene_001.png -vf \
"zoompan=z='min(zoom+0.00066,1.18)':\
x='iw/2-(iw/zoom/2)+(0.01*iw*sin(on*0.03))':\
y='ih/2-(ih/zoom/2)':\
d=270:s=1920x1080:fps=30,format=yuv420p" \
-c:v libx264 -crf 19 -preset slow -t 9 scene_001_burns.mp4
```

The `0.01*iw*sin(on*0.03)` adds a ±1% horizontal "breath" — classic Ken Burns subtlety.

### 3.3 Depth-Aware Parallax

**Use sparingly in this Register.** Ken Burns purity is often more appropriate — the 2D flatness of a period photograph is part of its authenticity.

When used (25–30% of scenes), gentle differential:

- Background: 1.0x
- Midground: 1.25x
- Foreground: 1.5x

Use parallax on wide landscape/cityscape historical scenes. Skip on portraits, documents, and objects.

### 3.4 Color Grade

**"Kodachrome Memory"** LUT:

- Lift shadows +10 (period film had soft blacks)
- Gamma 0.94
- Gain highlights -10 (Kodachrome rolls off highlights beautifully)
- Saturation -6 global
- Saturation +18 on orange/amber axis
- Saturation +8 on red axis
- Saturation -10 on blue axis
- Warm midtones +10
- Slight color bloom: orange halation on highlights

**FFmpeg grade chain:**

```
eq=contrast=1.06:brightness=0.02:saturation=0.90:gamma_r=1.06:gamma_g=1.02:gamma_b=0.93,
colorbalance=rs=0.06:gs=0.02:bs=-0.10:rm=0.08:gm=0.04:bm=-0.08:rh=0.10:gh=0.06:bh=-0.12,
curves=preset=color_negative
```

For different decades, use sub-LUTs:

- `1950s_ektachrome.cube` — cooler, more green-biased
- `1970s_portra_800.cube` — warmer, softer
- `1980s_fuji_velvia.cube` — saturated, punchier
- `1990s_color_neg.cube` — slightly faded, lower contrast
- `contemporary_family_portra.cube` — modern Portra 400 for current-day family drama

### 3.5 Atmospheric Overlays

**Always on:**

- Heavy 16mm or 8mm film grain at 15% opacity (heaviest of the five registers)
- Warm vignette at 25%
- Subtle film scratches / specks at 3% opacity (random, not rhythmic)
- Period-appropriate halation bloom at 6%

**Situational:**

- Dust particles (always on period scenes) at 10% opacity
- Sun-faded light leaks at 18% (warm amber)
- Light flicker simulation (brightness ±2% at 4Hz) on projector-style scenes
- Film gate weave (horizontal ±1px wobble at 24fps feel) on "archival footage" scenes
- Soft focus edges on dreamy/recollection moments

**Never:**

- Sharp modern chromatic aberration
- Digital scan lines
- Neon glows
- HUD elements

### 3.6 Overlays (Replacing Old Remotion Components)

**Method A — Bake into Seedream prompt.** Works beautifully for period newspaper clippings, photo-album aesthetic, hand-drawn maps. Include:

```
...presented as a vintage newspaper clipping with visible halftone dot
pattern and yellowed paper, slightly rotated as if placed on a table,
subtle paper corner curl...

...with a hand-drawn period sepia map overlay in the lower third
showing a route line rendered as if inked by a fountain pen...
```

**Method B — FFmpeg PNG overlay.** Pre-render the period overlay library:

- Decorative fleurons and ornamental rules (serif-era typography dingbats)
- Photo-corner tabs (for photo-album placement effect)
- Aged paper texture overlays (multiple stained variants)
- Period-appropriate dust/scratch sequences

**Method C — FFmpeg drawtext.** For dates, names, attribution, quote cards.

**Signature overlay patterns for this Register:**

- **Year stamp** (Method C): Serif 96pt year number with subtle fade-in, lower-left or beside subject.
- **Photo frame treatment** (Method B): White photographic border + subtle shadow PNG applied at edges, as if the image is a physical photograph.
- **Quote card** (Method C on aged-paper background scene): 4–5 second hold of attributed quote in Playfair Display Italic.
- **Period newspaper clipping** (Method A bake-in): Clipping rendered as part of the image itself.
- **Hand-drawn map** (Method A bake-in): Map rendered into scene; label dates/locations via Method C drawtext on top.
- **Timeline ribbon** (Method A or C): Horizontal chronology at bottom of frame.
- **Attribution footnote** (Method C): Small serif italic lower corner — names, dates, sources.

**Quote card example:**

```bash
# Generate aged-paper background scene
ffmpeg -f lavfi -i color=c=0xF3E9D2:s=1920x1080:d=5 \
  -i paper_texture.png -filter_complex \
"[0:v][1:v]overlay=0:0:format=auto" quote_bg.mp4

# Add quote text
ffmpeg -i quote_bg.mp4 -vf \
"drawtext=text='We sold everything we owned':fontfile=/fonts/PlayfairDisplay-Italic.ttf:
 fontsize=64:fontcolor=0x3E2723:x=(w-tw)/2:y=(h/2)-100,
 drawtext=text='— Frank McNamara, 1949':fontsize=32:fontfile=/fonts/InterTight-Italic.ttf:
 fontcolor=0x5D4037:x=(w-tw)/2:y=(h/2)+50" \
quote_card.mp4
```

### 3.7 Typography

**Primary font:** Playfair Display — elegant serif with history.

**Secondary font:** Inter Tight for narrator captions.

**Tertiary font:** Courier Prime for "typewriter" moments (letters, correspondence, ledgers).

**Era-specific alternates:**

- Pre-1940s: Clarendon, Bodoni
- 1940s–1960s: Futura, Bembo, Trade Gothic
- 1970s–1980s: Helvetica, Times
- 1990s–2000s: Georgia, Verdana

**Two-tier caption system** (ASS):

- Connector words: Inter Tight Regular, 44px, warm cream (#F3E9D2), 85% opacity
- Keywords: Playfair Display Bold Italic, 68px, deep warm brown (#8B4513) or burgundy (#722F37), 100% opacity, subtle drop shadow

**Reveal style:** Gentle fade + slight scale (98% → 100% over 500ms). No spring, no bounce.

**Section title cards:**

- Full-bleed cream/aged-paper background (#F3E9D2) via FFmpeg color source + paper texture PNG overlay
- Decorative ornament above title (Method B PNG — fleuron, ornamental rule)
- Title in 140pt Playfair Display Regular (not bold — restraint), drawtext, deep brown (#3E2723)
- Subtitle in 36pt Inter Tight Italic, warm gray, drawtext
- Year or date in Clarendon or Courier Prime below, drawtext
- 3.5-second hold
- Cross-dissolve 1.5s

### 3.8 Transitions

| Transition | Duration | FFmpeg xfade | Use Case |
|---|---|---|---|
| Crossfade | 1.0s | `fade` | Default (longer than other registers) |
| Fade through cream | 1.5s | via cream color frame insert | Era transitions |
| Fade through black | 1.8s | `fadeblack` | Temporal jumps (decades) |
| Dissolve | 1.0s | `dissolve` | Secondary default |
| Match cut (composition) | 0ms | Direct concat | Person → older/younger version |
| Slow morph (RIFE) | 1.5s | RIFE + concat | Same subject aging |
| Circle close → open | 1.8s | `circleclose` then `circleopen` | Chapter breaks |
| L-cut / J-cut | 1.0s audio overlap | Audio editing | Narrative flow |

Forbidden: anything digital-feeling, glitch, scan-line, sharp wipe.

### 3.9 Audio Design

- **Music bed:** Acoustic-orchestral, piano-and-strings-forward, era-appropriate (jazz for mid-century, solo piano for intimate, full orchestra for scale). 60–75 BPM.
- **Voiceover:** Chirp 3 HD at 0.93x rate. Prefer mature, warm voice (equivalent to Peter Coyote's PBS narration).
- **Ambient bed:** Period-appropriate room tone (record store, typewriter office, mid-century living room) at -30 LUFS. Creates authenticity.
- **Whooshes:** Replaced by paper-rustle, page-turn, photo-placement sounds.
- **Stingers:** Acoustic — single piano note, solo violin note, muted bell.
- **Foley:** Extensive — typewriter keys, dial phone ringing, ice in glass, newspaper pages, record player, pen on paper, cash register.
- **Archival-audio treatment** (when profiling real figures): faint tape-hiss quality on "archival" segments.

---

## 4. Register-Specific Negative Prompt Additions

Appended to global universal negative:

```
modern digital aesthetic, sharp contemporary lighting, cold color temperature,
neon, chrome, futuristic technology, smartphones, flat screens, modern logos,
clinical studio lighting, high dynamic range processing, aggressive saturation,
synthetic textures, HUD elements, scan lines, glitch effects, cyberpunk
aesthetic, anachronistic modern vehicles or clothing in period scenes
```

---

## 5. Script Pacing Guidance

- 120–135 words per minute (measured, reverent)
- 8–11 seconds per static scene
- Longer holds on key emotional images (10–14s)
- 5 seconds per Seedance I2V
- Minimum shot length: 5.5 seconds
- Chapter markers every 180–240 seconds

Script should read as narrative prose. Use long sentences. Let scenes breathe. 1–2 seconds of room tone after emotionally significant statements.

---

## 6. QA Checklist (Register 05)

- [ ] Production Mode is LIGHT_MOTION or BALANCED (not KINETIC)
- [ ] I2V scene count matches mode budget
- [ ] No camera move exceeds 18% zoom range
- [ ] Every image has period-appropriate film simulation anchor
- [ ] Kodachrome Memory LUT (or era sub-LUT) applied consistently
- [ ] Heavy film grain (15%) on every scene
- [ ] Warm vignette on every scene
- [ ] Year stamps on scenes that shift time
- [ ] No anachronisms in generated images
- [ ] Playfair Display used for all titles and emphasis
- [ ] Music bed is acoustic-orchestral, not electronic
- [ ] Room tone / foley present throughout
- [ ] Transitions ≥1.0 second
- [ ] No HUD, scan lines, or glitch
- [ ] Period-specific details visible (wardrobe, technology, signage)
- [ ] At least one "photo-album" or "newspaper clipping" treatment per chapter
- [ ] Register-specific negative merged with global universal
- [ ] Style DNA anchors verified in at least 3 sampled prompts

---

## 7. Example Prompt Pack (Multi-Niche)

### Example A — Business/Finance Biography — "Frank McNamara and the Birth of Diners Club, 1949"

**Scene 001 (Hero opener, Seedance I2V):**

```
Seedream 4.5 image prompt:
A crowded 1949 Manhattan restaurant interior at dinner time, warm low
tungsten lighting, a middle-aged man in a gray flannel suit sitting at a
white-linen-covered table looking down in embarrassment at his empty
wallet, his business companion across the table in a 1940s suit and wide
tie, a waiter in white jacket approaching with a bill on a silver tray,
1940s restaurant with dark wood paneling and white tablecloths, soft focus
characteristic of period 35mm lenses, rule-of-thirds composition
+ [Style DNA]
+ [Register 05 anchors for 1940s content: vintage Kodachrome photography,
   1960s Life magazine aesthetic, warm faded colors, high silver content
   film grain...]
+ [Global universal negative + Register 05 additions]

Seedance 2.0 Fast prompt:
slow 5-second push-in toward the man's embarrassed face, camera advancing
gently and steadily, candlelight flicker on his face, waiter taking small
step forward in background, completely smooth and stable cinematography
with Ken Burns pacing, no shake, PBS biographical documentary aesthetic,
duration 5 seconds
```

### Example B — Family Drama — "The Letter Everyone Pretended Not to See"

**Scene 017 (Contemporary intimate scene, static):**

```
Seedream 4.5 image prompt:
A weathered wooden dining table set for eight, mismatched chairs, a folded
letter resting beside one place setting that remains empty, warm afternoon
light streaming through a lace curtain, soft focus in the background
showing family photos on a sideboard, shallow depth of field with the
letter in sharp focus, intimate overhead-45 angle, melancholic nostalgic
mood

Motion: burns_push, 9 seconds, zoom 1.0 → 1.15, ease-in-out
Parallax: none (2D intimate authenticity)
Grade: contemporary_family_portra sub-LUT
Overlays (FFmpeg):
  - drawtext year "2019" upper-left, Playfair Display 64pt, deep brown,
    fade-in at t=2s
  - Pre-rendered paper texture PNG overlay at 8% continuous
Transition out: crossfade 1.0s
Audio: soft piano + distant chair creak + ambient house tone
```

### Example C — Revenge as Retrospective — "The Box in the Attic"

**Scene 003 (Static, slow reveal):**

```
Seedream 4.5 image prompt:
A weathered old lockbox on the dusty floorboards of a garage attic,
covered in a thin layer of dust, a single beam of late-afternoon sunlight
falling diagonally across it through a small round window, visible motes
of dust floating in the light beam, wooden floorboards in the foreground,
shallow depth of field with the lockbox in sharp focus, slight overhead
angle, mood of long-buried truth resurfacing, Kodak Portra 800 simulation,
nostalgic contemplative warmth

Motion: burns_pan_right, 11 seconds, pan +6% width, zoom 1.08 static
Parallax: 3-layer gentle differential
Grade: 1970s_portra_800 sub-LUT
Overlays (FFmpeg):
  - drawtext "thirty-seven years later" appears at t=4s in Playfair Display
    Italic 48pt, warm cream, lower-third, fade-in 500ms, holds
Transition out: fadeblack 1.8s
Audio: solo cello + distant wind + subtle creaking wood foley
```

### Example D — Chapter Title Card

**Scene 045:**

```
Scene: Chapter 02 title "The Cardboard Years"
Assembly (FFmpeg composite):
  - Base: color=c=0xF3E9D2:s=1920x1080:d=5 (aged cream)
  - Paper texture PNG overlay (Method B) at 8% continuous
  - Decorative fleuron ornament PNG (Method B) centered above title,
    deep brown, fades in at t=0.5s
  - drawtext main title "THE CARDBOARD YEARS" in Playfair Display Regular
    140pt, centered, deep brown (#3E2723), fades in at t=1s, scale 98→100%
  - drawtext subtitle "1950–1954" in Clarendon 72pt, warm gray, below
    title, fades in at t=1.3s
  - drawtext "New York City" in Inter Tight Italic 32pt, warm gray,
    below subtitle, fades in at t=1.6s
  - Pre-rendered thin hairline rule PNG (Method B) below the location
    text, draws on at t=2s
  - Total duration: 5 seconds (3.5s hold on final composition)
  - 16mm grain overlay continuous at 15%
  - Audio: solo piano note + sustained string chord
Transition out: crossfade 1.5s
```

---

## 8. Reference Channels & Material

- **Magnates Media** — direct reference for biographical finance documentary
- **Business Casual** — similar lane, slightly faster pace
- **Biographics (Simon Whistler)** — script pacing reference
- **Ken Burns's "The Civil War," "Baseball," "Jazz"** — pure reference for classic Ken Burns motion discipline
- **Apple TV+ documentary series** — modern execution of period retrospective
- **"Mad Men" (series)** — period authenticity reference for 1960s scenes
- **"The Crown"** — family drama tone reference
- **Netflix's "The Founder"** (film) — color grade and mid-century detail

Before any Register 05 session, watch 15 minutes of a Ken Burns documentary. Pay specific attention to how long he holds on a single photograph and how little the camera actually moves.

---

## 9. Handling Real Historical Figures (Critical Note)

This Register frequently depicts real historical figures. Important constraints:

- Seedream 4.5 can produce person-like images but **should not be prompted with specific real names**. Use descriptive proxies: "a middle-aged businessman resembling a 1950s banker" rather than "Frank McNamara."
- Accept that generated faces will not perfectly match historical figures. Consider licensed archival photography (public domain or licensed from Getty/AP Archive) for the most recognizable figures and reserve Seedream for secondary characters and scene-setting.
- Always include disclaimer language in video descriptions: "Historical imagery reconstructed with AI for illustrative purposes."
- For the highest-profile figures in biographical pieces, pursue licensed archival photography for at least 3–5 hero portraits and intersperse AI-generated supporting imagery.
- For family drama featuring real private individuals (where applicable), the same rule applies with heightened care — do not generate realistic likenesses of identifiable living private individuals.

This is a Register 05-specific production constraint not present in Registers 01–04.
