
## 🎨 Vision GridAI — YouTube Thumbnail Generation Agent Instruction (v2.0)

---

### TASK OVERVIEW
Generate a **1280x720px YouTube thumbnail** for a given video topic. The thumbnail is composed of two elements produced separately and composited together:
1. An **AI-generated image** (right side) via **Seedream 4.0 on Fal.ai**
2. A **text + layout overlay** (left side) composited programmatically (Pillow / Canvas / FFMPEG)

---

### INPUT VARIABLES (injected per video)
```
{{topic}}         → The exact video script title (used verbatim as thumbnail text)
{{niche}}         → e.g., "Relationship Psychology"
{{key_scene}}     → A 1–2 sentence description of the core visual idea from the video
{{emotion_tone}}  → e.g., "anxious", "hopeful", "betrayed", "empowered"
{{drive_folder}}  → VisionGridAI/{{niche}}/{{topic_slug}}/thumbnails/
```

---

### STEP 1 — AI IMAGE GENERATION (Seedream 4.0 via Fal.ai)

**Image dimensions:** `640x720px` (right half of the 1280x720 canvas)

**Image style rules:**
- Generate a **conceptual cinematic scene** that visually represents the **key idea from the video script** — not a generic stock photo feel
- Include a **human face with an exaggerated, emotionally expressive expression** that matches `{{emotion_tone}}` — wide eyes, open mouth, furrowed brow etc. Faces dramatically increase CTR
- Lighting: **dramatic and theatrical** — single strong directional light source, heavy shadows, volumetric haze or atmospheric particles
- Camera angle: **slightly low or eye-level**, close-to-mid shot on the face/figure
- Style: **photorealistic AI cinematic**, dark moody background, no text, no logos

**Prompt template for Seedream 4.0:**
```
Cinematic photorealistic scene: {{key_scene}}. 
The subject has an exaggerated {{emotion_tone}} facial expression — eyes wide, 
jaw slightly open, visibly emotionally affected. Dramatic single-source lighting 
from above-left. Dark atmospheric background with volumetric fog and subtle 
particle dust. Moody, high-contrast, theatrical. No text. No watermarks. 
Shot style: editorial portrait, 640x720, vertical crop.
```

---

### STEP 2 — THUMBNAIL COMPOSITING

**Canvas:** `1280 x 720px`

#### LEFT ZONE (0px → ~660px width)
- Background: **solid brand color** (see palette below) — flat, no texture, no image bleed
- Text: `{{topic}}` verbatim, broken into natural lines (max 3–4 words per line)
- Font: **Impact** (or Inter Black 900 weight), ALL CAPS
- Font size: Scale dynamically so text block fills **~75–80% of canvas height** (roughly 90–110px per line at 4 lines)
- Alignment: **left-aligned**, with ~50px left padding
- Vertical centering: text block centered within the left zone height

#### KEYWORD EMPHASIS (Standard for ALL thumbnails)
- Identify **2-4 core subject/reveal keywords** from the title (the words that carry the topic's hook)
- Render each word individually — keywords get **emphasis color**, other words get **normal text color**
- Both normal and emphasis words get **5px solid outline** for readability
- **Emphasis color rules per palette variant:**

| Variant | Normal Words | Normal Outline | Emphasis Words | Emphasis Outline |
|---------|-------------|----------------|----------------|-----------------|
| Yellow/Black (default) | `#FFE600` (yellow) | `#000000` (black) | `#000000` (black) | `#FFFFFF` (white) |
| White/Red (warm tone) | `#FFFFFF` (white) | `#000000` (black) | `#FF3C28` (red) | `#000000` (black) |
| Blue/White (cool tone) | `#00CFFF` (ice blue) | `#000000` (black) | `#FFFFFF` (white) | `#000000` (black) |

- **How to pick emphasis words:** Choose the nouns/verbs that represent the core subject and the surprise/reveal. For example:
  - "How the **INTERCHANGE FEE** Became America's **HIDDEN TAX**" → INTERCHANGE, FEE, HIDDEN, TAX
  - "Why **CREDIT CARDS** Are a **TRILLION DOLLAR** Lie" → CREDIT, CARDS, TRILLION, DOLLAR
  - Skip articles (the, a, an), prepositions (of, in, on), and conjunctions (and, but, or)

#### RIGHT ZONE (620px → 1280px)
- Place the Seedream-generated image here, **flush to right, top, and bottom edges**
- No border, no padding on right/top/bottom

#### DIVIDER
- A **diagonal slash line** running from approximately **(620px, 0px) → (660px, 720px)** — top-left to bottom-right angle
- The left zone's background color fills behind this line, slightly overlapping the image
- On the divider edge, apply a **4–6px glow/stroke** in the accent color (see palette) for visual pop
- This creates a dynamic angled split, not a flat vertical cut

---

### STEP 3 — BRAND COLOR PALETTE

Apply consistently across all thumbnails. Vary **accent shade only** based on `{{emotion_tone}}`:

| Element | Default | Warm/Intense Tone | Cool/Sad Tone |
|---|---|---|---|
| Left BG | `#0D0D0D` (near black) | `#1A0500` (deep red-black) | `#040D1A` (deep navy) |
| Title text | `#FFE600` (brand yellow) | `#FF4500` (red-orange) | `#00CFFF` (ice blue) |
| Divider glow | `#FFE600` | `#FF6B00` | `#00CFFF` |
| Text outline | `#000000` | `#000000` | `#000000` |

> **Primary brand identity = Black + Yellow.** Tonal variants are allowed but yellow/black should be the default unless `{{emotion_tone}}` strongly calls for an alternative.

---

### STEP 4 — OUTPUT & STORAGE

- Final file: `thumbnail.png` at **1280x720px**, RGB, ≤500KB
- Upload to Google Drive at:
  ```
  VisionGridAI/{{niche}}/{{topic_slug}}/thumbnails/thumbnail.png
  ```
- Also save the raw Seedream image (pre-composite) as:
  ```
  VisionGridAI/{{niche}}/{{topic_slug}}/thumbnails/thumbnail_raw_image.png
  ```

---

### EXAMPLE — Applied to this video

```
{{topic}}       → "WHY WE CHASE EMOTIONALLY UNAVAILABLE PARTNERS"
{{niche}}       → "Relationship Psychology"
{{key_scene}}   → "A person desperately reaching toward another figure that is 
                   dissolving into smoke, unable to be grasped"
{{emotion_tone}}→ "anxious"
{{drive_folder}}→ VisionGridAI/Relationship Psychology/why-we-chase-emotionally-unavailable-partners/thumbnails/
```
**Palette applied:** Default Black + Yellow (anxious → warm variant: deep red-black BG + yellow text)

