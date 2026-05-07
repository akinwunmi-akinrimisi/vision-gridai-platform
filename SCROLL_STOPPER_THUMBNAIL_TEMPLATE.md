# Scroll-Stopper Thumbnail Template
**Format:** Cinematic Comic-Strip with Stat-Stack Hero Text
**Source reference:** "Monetize in 5 Days" YouTube thumbnail
**Use case:** High-CTR YouTube thumbnails for educational, transformation, and money/skill-building niches

---

## 1. What This Template Is

A reproducible thumbnail system built around a single proven layout: charcoal background, yellow promise tag, oversized italic timeframe, dual stat badges, red brush arrow, and a photo grid telling a mini-narrative on the right. The reference design uses sketch illustrations on the right; **this template replaces them with photorealistic cinematic stills** so the thumbnail reads as documentary truth instead of cartoon entertainment.

---

## 2. Why It Stops the Scroll (the psychology)

The thumbnail wins three battles inside the first 0.4 seconds of a viewer's swipe:

1. **Pattern interrupt** — Charcoal + bright yellow is uncommon in most niches. The eye lands on the yellow tag first because it has the highest luminance gap on screen.
2. **Promise + proof stacked vertically** — The yellow tag delivers the *what* ("MONETIZE IN"). The giant white italic delivers the *time-to-value* ("5 DAYS"). The stat pills deliver *social proof* (real numbers with green up-arrows). That's a complete persuasion stack before the viewer reads the title.
3. **Forced curiosity loop** — The red brush arrow physically directs the eye into the photo grid. The grid promises a narrative that doesn't resolve in the thumbnail itself. To find out which routine is "right" and which is "wrong," the viewer must click.

This template is best fit for: comparison videos (right vs wrong path), transformation timelines, before/after stories, fast-result promises, and step-by-step process explainers.

---

## 3. Anatomy & Layout Spec

**Canvas:** 1280 × 720 px (YouTube standard, 16:9)

**Column split:**
- Left column: 0–512 px (40%) — text + proof zone
- Right column: 512–1280 px (60%) — photo grid zone
- Safe zone: 60 px padding top and bottom

**Layer stack (bottom to top):**

1. Background plate — charcoal concrete texture with edge vignette
2. Photo grid — N panels with thin white inner border + outer drop shadow
3. Yellow tag — top-left, small rotation 0–2°
4. Hero text — large white italic, sits below tag
5. Stat badges — two pills side-by-side under hero text
6. Red brush arrow — hand-drawn curve from hero text into Panel 1 of grid
7. Bottom-right label — graffiti two-tone overlay on the grid (optional)

---

## 4. Design Tokens

### Colors

| Token            | Hex       | Use                              |
|------------------|-----------|----------------------------------|
| `bg-base`        | `#1F1F1F` | Background plate base            |
| `bg-grain`       | `#2A2A2A` | Concrete texture overlay         |
| `accent-yellow`  | `#FFEB00` | Tag background                   |
| `text-on-yellow` | `#0A0A0A` | "MONETIZE IN" type               |
| `hero-white`     | `#FFFFFF` | "5 DAYS" type                    |
| `arrow-red`      | `#E11A1A` | Brush arrow                      |
| `badge-bg`       | `#EFEFEF` | Stat pill background             |
| `badge-stroke`   | `#1F1F1F` | Stat pill border                 |
| `up-green`       | `#22C55E` | Up-arrow circle in stats         |
| `wrong-white`    | `#FFFFFF` | "WRONG" outline label            |
| `routine-red`    | `#E11A1A` | "ROUTINE" label                  |

### Typography

- **Yellow tag:** Anton or Bebas Neue, italic, ~52 px, letter-spacing 0
- **Hero text:** Anton or condensed display sans, italic, ~165 px, white, soft outer glow
- **Stat label** ("Views", "Est. Revenue"): Inter / Helvetica Neue, regular, 22 px, gray
- **Stat number:** Inter / Helvetica Neue, black weight, 38 px, near-black
- **Bottom graffiti label:** brushed display font (Bowlby One, Permanent Marker, or hand-drawn equivalent)

### Effects

- Hero text: 1 px white stroke + soft outer glow (4 px, 30% opacity)
- Photo grid panels: 4 px white inner border, 12 px outer drop shadow (40% black, blur 20)
- Yellow tag: hard rectangle, 8 px black border, slight rotation 0–2°
- Red arrow: brush stroke style (not vector), 12 px stroke, 100% opacity, slight curve

---

## 5. Real Cinematic Images — Replacing the Cartoon Panels

The reference uses sketch illustrations. **You will use photorealistic cinematic stills** generated through your text-to-image pipeline (Fal.ai Seedream or equivalent).

### 5.1 How Many Panels for Your Topic

Match panel count to narrative shape. Don't pad. Don't crop the story.

| Topic shape                                 | Panels | Layout              |
|---------------------------------------------|--------|---------------------|
| Single dramatic moment ("I lost $50K")      | **1**  | Full right column   |
| Before / After                              | **2**  | Stacked or side-by-side |
| 3-step process or 3-pillar list             | **3**  | Single row          |
| Comparison (right vs wrong, 2 paths)        | **4**  | 2×2 grid            |
| Full journey or 5-step framework            | **5**  | 2 top + 3 bottom    |
| Two paths × 3 stages each (the reference)   | **6**  | 2×3 grid            |

Beyond 6 panels, individual faces become unreadable at the 320 px mobile thumbnail size. Stop at 6.

### 5.2 Faces Rule

Each panel shows **exactly one human subject** unless the story explicitly requires more (a coaching scene, a couple, a small team). One face per panel keeps eye-tracking clean across the grid.

Pick one of two strategies and hold it across the entire grid:

- **Same subject, transforming** — same person across all panels, showing journey
- **Different subjects, varied scenarios** — different people per panel, showing range of situations

Mixing strategies inside a single thumbnail makes the narrative confusing.

---

## 6. Cinematic Image Generation Prompts

### 6.1 Master Prompt Formula

```
[subject demographic + age + clothing], [specific action + facial expression],
[environment with 1–2 storytelling props], [lighting setup],
[camera + lens + DOF], [color grade], [mood],
[style references], [technical modifiers]
```

### 6.2 Universal Style Suffix (append to every panel)

```
cinematic still, photorealistic, shot on ARRI Alexa 35,
35mm anamorphic lens, shallow depth of field,
soft natural lighting with practical sources,
A24 film aesthetic, subtle film grain,
desaturated teal-and-amber color grade,
high dynamic range, sharp subject focus,
ultra-detailed skin texture, 8K resolution,
no text, no watermark, no logo
```

### 6.3 Universal Negative Prompt

```
cartoon, anime, illustration, drawing, sketch, 3D render, CGI,
plastic skin, doll-like face, extra fingers, deformed hands,
crossed eyes, asymmetric face, low resolution, blurry,
oversaturated, HDR over-processing, lens flare overload,
text overlay, watermark, signature, logo
```

### 6.4 Topic-Adapted Prompts — Reference Topic ("Monetize in 5 Days")

Six panels: top row is the right path (struggle → effort → success), bottom row is the wrong routine (procrastination → tutorial hell → passive consumption).

#### Right Path — Top Row

**Panel 1 — Financial pressure / wanting to provide**
```
West African man in his early 30s wearing a plain dark t-shirt,
hand on forehead looking stressed, holding a small envelope of cash,
sitting at a wooden table in a dim Lagos apartment with unpaid bills
scattered in front of him,
single warm tungsten desk-lamp practical light from camera-left,
shot on ARRI Alexa 35, 50mm anamorphic, shallow depth of field,
A24 cinematic still, desaturated teal-and-amber grade,
somber introspective mood, sharp focus on face,
ultra-detailed skin texture, photorealistic, 8K,
no text, no watermark
```

**Panel 2 — Building / focused effort**
```
Same West African man in his early 30s, sleeves rolled up,
intent focused expression, hands working on a laptop on a wooden desk
with a notebook, coffee mug, and a small green plant beside him,
warm morning golden-hour window light from camera-right,
shot on ARRI Alexa 35, 50mm anamorphic, shallow depth of field,
cinematic still, A24 aesthetic, warm amber grade,
determined hopeful mood, sharp focus,
photorealistic, 8K, no text, no watermark
```

**Panel 3 — Success / scaling**
```
Same West African man in his early 30s, smart casual button-down,
arms crossed with a confident slight smile, standing in a modern Lagos
co-working space with a large monitor in the background showing
an upward green analytics graph,
soft daylight key from a window behind camera-left,
shot on ARRI Alexa 35, 35mm anamorphic, mid shot,
cinematic still, A24 aesthetic, balanced teal-amber grade,
confident composed mood, sharp focus,
photorealistic, 8K, no text, no watermark
```

#### Wrong Routine — Bottom Row

**Panel 4 — Procrastination / endless scrolling**
```
West African man in his late 20s wearing a hoodie,
slumped on a couch, phone in hand, glazed expression staring at the screen,
half-eaten snacks and an open laptop ignored beside him,
dim mixed lighting — cool blue from phone screen plus warm room lamp,
shot on ARRI Alexa 35, 35mm anamorphic, low angle,
cinematic still, A24 aesthetic, cool desaturated grade,
lethargic listless mood, sharp focus on face,
photorealistic, 8K, no text, no watermark
```

**Panel 5 — Tutorial hell / endless studying**
```
Same West African man in his late 20s, pencil behind his ear,
tired confused expression, surrounded by stacks of open books,
multiple browser tabs visible on a laptop screen, a wall clock
prominent behind him, papers scattered everywhere,
overhead fluorescent practical light, slight teal cast,
shot on ARRI Alexa 35, 35mm anamorphic, slight wide,
cinematic still, A24 aesthetic, cool teal grade,
overwhelmed stuck-in-loop mood, sharp focus,
photorealistic, 8K, no text, no watermark
```

**Panel 6 — Passive consumption**
```
Same West African man in his late 20s, oversized t-shirt,
relaxed smile, popcorn bowl in his lap, watching YouTube on a laptop
late at night, mug of coffee on the side table,
single warm screen-glow on his face, dark room background,
shot on ARRI Alexa 35, 50mm anamorphic, medium close-up,
cinematic still, A24 aesthetic, warm low-key grade,
distracted entertained mood, sharp focus,
photorealistic, 8K, no text, no watermark
```

### 6.5 Character Consistency Trick

To keep the same character across all panels:

1. Generate **Panel 1** first with the full character description.
2. Use Fal.ai's image-to-image (or Seedream's reference image input) for panels 2–N, passing Panel 1 as the visual reference and writing the new prompt as a variation.
3. Lock the seed value if your model supports it.
4. If a panel's character drifts, regenerate that single panel only — never the whole grid.

---

## 7. Hero Text Customization

The left-side text follows a strict 3-line formula:

```
Line 1 (yellow tag, italic):              [VERB IN PRESENT TENSE]
Line 2 (giant white italic):              [TIMEFRAME OR NUMBER]
Line 3 (two stat badges):                 [Metric 1] | [Metric 2]
```

### Examples for different topics

| Topic                    | Line 1 (yellow)   | Line 2 (hero) | Stats                         |
|--------------------------|-------------------|---------------|-------------------------------|
| Monetize YouTube fast    | MONETIZE IN       | 5 DAYS        | Views 2.4M / Rev $22.4K       |
| Build SaaS quickly       | LAUNCH IN         | 14 DAYS       | MRR $8.2K / Users 1.1K        |
| Lose weight              | DROP              | 20 LBS        | Days 60 / Weight -22 lb       |
| Get clients              | LAND CLIENTS IN   | 7 DAYS        | Booked 31 / Closed $48K       |
| AWS certification        | PASS SAA-C03 IN   | 30 DAYS       | Score 850 / Pass 1st try      |
| AI agency revenue        | HIT $10K MRR IN   | 60 DAYS       | Clients 6 / Rev $14.2K        |

### Rules

- Line 1 must be ≤ 14 characters. Verb-led. All caps.
- Line 2 must be ≤ 8 characters. The single biggest visual element on the canvas.
- Stats must be real and verifiable. Never fabricate. If the proof isn't strong, switch to a different metric (subscribers, savings, hours saved, students enrolled, etc.).

---

## 8. Bottom-Right Graffiti Label

The two-tone graffiti label sits on the bottom-right of the photo grid. Use it only when your topic has an antagonist concept worth naming.

**Format:** `[NEUTRAL WORD WHITE]   [NEGATIVE WORD RED]`

Examples:
- `WRONG ROUTINE`
- `BAD HABITS`
- `FAKE GURUS`
- `DUMB MISTAKES`
- `MONEY TRAPS`
- `SLOW PATH`

If your video doesn't have a clear antagonist, **omit this element entirely** rather than forcing it. The thumbnail still works without it.

---

## 9. Production Checklist

Before publishing, verify each item:

1. **Mobile preview test** — Shrink to 320 × 180 px. Hero text must remain readable. If "5 DAYS" blurs, increase font weight or shorten the line.
2. **Face count audit** — Count faces in panels. Match the topic's narrative shape (see §5.1).
3. **Stat verification** — Stats must be real. Screenshot the source for your records.
4. **Color contrast** — Yellow tag must contrast ≥ 7:1 against background.
5. **Arrow alignment** — Red brush arrow should curve from the end of the hero word toward Panel 1's subject's face, not into empty space.
6. **No text leaks in images** — Generated panels must contain zero text artifacts. Re-roll any panel where the image model leaked words, signs, or watermarks.
7. **Single subject per panel** — Unless the story explicitly requires multiple people, every panel shows exactly one human.
8. **A/B variant** — Always render a second variant with a different hero number ("3 DAYS" vs "5 DAYS") and let YouTube test both via thumbnail experiments.

---

## 10. File Output Spec

Deliverables for each thumbnail:

- `thumbnail_v1_1280x720.png` — Final composite, sRGB, < 2 MB
- `thumbnail_v1_320x180.png` — Mobile preview check
- `panels/panel_1.png` … `panel_N.png` — Source generations, archived for reuse
- `prompts.txt` — Exact prompts used per panel, for repro

---

## 11. Quick Adaptation Examples

### Cloudboosta — "Pass AWS SAA-C03 in 30 Days"
- Yellow tag: `PASS SAA-C03 IN`
- Hero: `30 DAYS`
- Stats: `Pass Rate 94% ↑` / `Salary +$28K ↑`
- Panel count: 4 (2×2)
  - Wrong path: tutorial hell, exam dump panic
  - Right path: structured study session, certified celebration
- Bottom label: `WRONG STUDY`

### Vision GridAI — "Build a YouTube Channel in 90 Days"
- Yellow tag: `BUILD CHANNEL IN`
- Hero: `90 DAYS`
- Stats: `Subs 50K ↑` / `Rev $12K ↑`
- Panel count: 6 — two paths × three stages
- Bottom label: `FAKE GROWTH`

### Operscale — "Land $10K Clients in 7 Days"
- Yellow tag: `LAND CLIENTS IN`
- Hero: `7 DAYS`
- Stats: `Booked 31 ↑` / `Closed $48K ↑`
- Panel count: 3 — outreach, discovery call, signed contract
- Bottom label: omit (no clear antagonist)

---

## 12. One-Page Build Sequence

1. Pick your topic and identify its narrative shape (§5.1).
2. Decide panel count.
3. Write hero text using the 3-line formula (§7). Verify stats are real.
4. Write the master prompt for Panel 1 using the formula (§6.1) + style suffix (§6.2).
5. Generate Panel 1. Lock seed and reference image.
6. Generate remaining panels using Panel 1 as the reference.
7. Composite in your design tool: background → photo grid → yellow tag → hero text → stat badges → red arrow → optional graffiti label.
8. Export 1280×720 + 320×180 mobile preview.
9. Run the production checklist (§9).
10. Render an A/B variant with one changed element (different hero number, or different antagonist label).
