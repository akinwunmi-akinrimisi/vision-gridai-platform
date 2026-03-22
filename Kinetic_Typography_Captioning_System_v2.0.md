# KINETIC TYPOGRAPHY CAPTIONING SYSTEM

**AI Agent Implementation & Style Guide**

Target Platforms: Instagram Reels • Instagram Stories • YouTube Shorts • YouTube Landscape
Version 2.0 — March 2026

---

## Changelog (v1.0 → v2.0)

| Change | v1.0 | v2.0 | Reason |
|---|---|---|---|
| Font sizes | Connector 42px / Emphasis 100px (9:16) | Connector 84px / Emphasis 200px (9:16) | Doubled across both tiers for readability |
| Words per screen | 8–10 max | **3–4 max** | Eliminates overlap; enables tight voiceover sync |
| Tier spacing | 10–20px gap (MarginV overlap-prone) | **60–80px minimum gap** with fixed anchor positions | Prevents keyword from bleeding into connector text |
| Voiceover sync | Generic 50–100ms pre-flash | **Whisper word-level timestamps** drive all timing | Captions now lock to individual spoken words |
| Phrase segmentation | Clause-boundary splitting | **Word-group chunking** from Whisper output (3–4 words per chunk) | Sync-first approach; Whisper is the single source of truth for timing |
| ASS MarginV values | Connector 420 / Emphasis 350 | Connector 520 / Emphasis 280 (9:16) | Wider vertical separation to accommodate doubled sizes |

---

## 1. Style Definition & Philosophy

This document defines a kinetic typography captioning system designed for high-retention short-form and long-form social media video. The style uses a two-tier visual hierarchy — connector text paired with oversized, colour-punched keyword emphasis — to guide the viewer's eye to the emotional or informational payload of every phrase before they consciously read the full line.

The system is platform-adaptive, adjusting font sizes, safe zones, and positioning rules depending on whether the output targets a 9:16 vertical format (Instagram Reels/Stories, YouTube Shorts) or a 16:9 landscape format (standard YouTube).

**Core constraint: 3–4 words maximum per screen.** Every caption appearance shows at most 3–4 words at a time, split across the two tiers. This keeps captions readable at the doubled font sizes, prevents text overlap, and — critically — keeps the captions tightly synchronised with the voiceover because each chunk maps to a narrow window of spoken audio.

---

## 2. Canvas & Safe Zone Specifications

All caption placement must respect platform-specific safe zones to avoid being obscured by UI elements such as like buttons, comment icons, usernames, progress bars, and search overlays.

### 2.1 Platform Dimensions

| Platform | Resolution | Aspect Ratio | FPS | Notes |
|---|---|---|---|---|
| IG Reels | 1080 × 1920 | 9:16 | 30 | Also used for IG Stories and TikTok |
| YouTube Shorts | 1080 × 1920 | 9:16 | 30 | Identical canvas to Reels; different safe zones |
| YouTube Landscape | 1920 × 1080 | 16:9 | 30 | Standard YouTube. Can go 24 or 60fps |

### 2.2 Safe Zones (in pixels from each edge)

| Platform | Top | Bottom | Left | Right | Caption Zone |
|---|---|---|---|---|---|
| IG Reels | 250px | 400px | 60px | 60px | 250–1520 Y range |
| YT Shorts | 200px | 350px | 60px | 60px | 200–1570 Y range |
| YT Landscape | 80px | 120px | 100px | 100px | Lower-third: 550–960 Y range |

> **Critical rule:** The default caption vertical anchor for 9:16 is the lower-centre of the safe zone (approximately Y: 1200–1500). For 16:9, captions default to the lower-third (approximately Y: 650–900). Never place captions in the top 15% of the frame on 9:16 — this zone is reserved for platform UI.

---

## 3. Typography Specifications

### 3.1 Font Selection

Use a heavy-weight, high-legibility sans-serif. The primary recommendation is **Montserrat Extra Bold** for emphasis words and **Montserrat Semi Bold** for connector text. Acceptable alternatives include Inter Black / Semi Bold, Poppins Black / Semi Bold, or the platform's system font if custom fonts are unavailable.

### 3.2 Type Scale by Platform

| Element | 9:16 (Reels/Shorts) | 16:9 (YouTube) | Weight |
|---|---|---|---|
| Emphasis Keyword | **160–200px** | **120–160px** | Extra Bold / Black (800–900) |
| Connector Text | **72–96px** | **56–80px** | Semi Bold (600) |
| Secondary Label | 56–72px | 44–60px | Medium (500) |

> **Why these sizes work with 3–4 words per screen:** At the old sizes (connector 42px, emphasis 100px), 8–10 words could technically fit on screen — but they overlapped and became unreadable. By doubling the sizes AND limiting to 3–4 words, each word gets enough horizontal space to breathe, the two tiers have clear vertical separation, and the text is instantly legible even on small phone screens.

### 3.3 Text Transform Rules

- **Emphasis keywords:** always lowercase for the edgy, punchy feel (e.g., "pregnant" not "PREGNANT"). Exception: proper nouns retain capitalisation.
- **Connector text:** sentence case, lowercase-leading (e.g., "they've got" not "They've Got").
- **Never** use ALL CAPS for full sentences — it kills the hierarchy.

---

## 4. Colour System

The captioning palette is deliberately restricted to maximise contrast and readability across all backgrounds.

| Role | Hex Code | Usage | Rules |
|---|---|---|---|
| Emphasis Fill | `#E8302A` | Keyword text colour | Only applied to the single most important word per caption phrase |
| Connector Fill | `#FFFFFF` | Standard text colour | Always white. If background is white/light, add black drop shadow or dark outline stroke |
| Text Stroke | `#000000` | Outline on all text | 3–5px stroke at 60–80% opacity. Ensures legibility on any background |
| Drop Shadow | `#000000` | Depth / separation | Offset: 4–6px down-right. Blur: 8–12px. Opacity: 40–60% |

> **Note:** Stroke and shadow sizes have been increased proportionally with the doubled text sizes. At 200px emphasis text, a 2px stroke is barely visible — use 4–5px minimum.

**Alternate emphasis colours:** If brand guidelines require a different accent, acceptable alternatives are `#FACC15` (yellow), `#22C55E` (green), or `#3B82F6` (blue). Never use more than one emphasis colour per video.

---

## 5. Caption Hierarchy & Word Classification

Every caption appearance must be decomposed into exactly two tiers before rendering. This is the core decision the AI agent makes for each 3–4 word chunk.

### 5.1 Tier Definitions

**Tier 1 — Emphasis Keyword:** The single word (or occasionally two-word compound) that carries the emotional or informational payload. This is the word that, if the viewer read nothing else, would communicate the core idea. Rendered in oversized, bold, red (or accent colour) text on the **lower line**.

**Tier 2 — Connector Text:** The remaining 2–3 words that provide grammatical context. Rendered in standard-size, semi-bold, white text on the **upper line**. These are visually subordinate and positioned to lead the eye toward the emphasis keyword below.

### 5.2 Word Count Rules (NEW in v2.0)

- **Hard maximum: 4 words per screen.** No caption appearance should ever show more than 4 words across both tiers combined.
- **Ideal split: 2–3 connector words + 1 keyword = 3–4 total.**
- If a keyword is a two-word compound (e.g., "credit card"), the connector text must be limited to 1–2 words to stay within the 4-word cap.
- If a phrase has no clear keyword (Uniform Mode), still limit to 3–4 words per appearance.
- Long sentences are split into multiple sequential 3–4 word chunks, each getting its own keyword selection.

### 5.3 Keyword Selection Rules

- Select the one word that is most emotionally charged, surprising, or informationally dense.
- Prefer nouns and adjectives over verbs (e.g., in "they've got pregnant," "pregnant" is the keyword, not "got").
- If the sentence's impact comes from a verb, elevate the verb (e.g., "she left" → "left" is the keyword).
- Never select articles (a, an, the), prepositions, or conjunctions as keywords.
- Maximum one emphasis keyword per screen. No exceptions at the 3–4 word limit.
- If no single word dominates (e.g., a name reference like "Dangote's Child"), render all words in uniform white. This is the "uniform mode" exception.

### 5.4 Worked Examples (v2.0 — with chunking)

The sentence **"According to the Nilson Report, U.S. merchants paid 172 billion dollars in card acceptance fees"** is too long for one screen. The agent must chunk it:

| Chunk | Words on Screen | Connector (white, upper) | Keyword (red, lower) | Timing Source |
|---|---|---|---|---|
| 1 | 3 | "According to the" | — (uniform white) | Whisper: start of "According" → end of "the" |
| 2 | 3 | "Nilson Report," | — (uniform white) | Whisper: start of "Nilson" → end of "Report" |
| 3 | 3 | "U.S. merchants paid" | — (uniform white) | Whisper: start of "U.S." → end of "paid" |
| 4 | 2 | — | **172** (red, full-size) | Whisper: start of "172" → end of "172" + 200ms hold |
| 5 | 4 | "billion dollars in" | — (uniform white) | Whisper: start of "billion" → end of "in" |
| 6 | 3 | "card acceptance" | **fees** | Whisper: start of "card" → end of "fees" + 200ms hold |

The sentence **"and it happens billions of times a day without most participants"** chunks as:

| Chunk | Words on Screen | Connector (white, upper) | Keyword (red, lower) | Timing Source |
|---|---|---|---|---|
| 1 | 3 | "and it happens" | — (uniform white) | Whisper timestamps |
| 2 | 4 | "billions of times" | — (uniform white) | Whisper timestamps |
| 3 | 3 | "a day without" | — (uniform white) | Whisper timestamps |
| 4 | 2 | "most" | **participants** | Whisper timestamps |

> **Key principle:** Not every chunk needs a red keyword. Many chunks will be uniform white. Reserve red emphasis for the words that truly carry impact — overusing it dilutes the effect.

---

## 6. Spatial Layout Rules

### 6.1 Vertical Spacing — The Anti-Overlap Rule (CRITICAL)

The primary cause of text overlap is insufficient vertical separation between the connector line and the emphasis keyword line. With doubled font sizes, the two tiers require a **minimum 60–80px clear gap** between the bottom edge of the connector text and the top edge of the emphasis text.

**How this is enforced in ASS subtitles:**

The two tiers use different `MarginV` values in their style definitions, which controls their vertical offset from the alignment edge. The connector style has a **higher** MarginV (pushing it further from the bottom), and the emphasis style has a **lower** MarginV (keeping it closer to the bottom). The difference between these values, minus the line heights, produces the gap.

**Calculating the gap (9:16 example):**
- Connector style MarginV: 520px (from bottom edge)
- Emphasis style MarginV: 280px (from bottom edge)
- Vertical distance between anchor points: 520 - 280 = 240px
- Connector line height at 84px font: ~100px (with ascenders/descenders)
- Remaining clear gap: ~140px ✓ (well above the 60–80px minimum)

> **Anti-overlap validation rule:** Before rendering, calculate: `ConnectorMarginV - EmphasisMarginV - ConnectorLineHeight`. If the result is less than 60px, increase `ConnectorMarginV` until it passes. This check must run for every caption.

### 6.2 Vertical Format (9:16)

- Connector text line: centred horizontally, anchored at approximately Y: 1200–1280 (MarginV ~520 from bottom).
- Emphasis keyword: centred horizontally, anchored at approximately Y: 1380–1460 (MarginV ~280 from bottom).
- Clear gap between tiers: minimum 60px, target 80–100px.
- If both lines together exceed the safe zone, scale both tiers down proportionally (maintain the ratio) rather than reducing the gap.
- Left-aligned layout variant is acceptable when the speaker is positioned to the right of frame. Maintain 60px left padding.

### 6.3 Horizontal Format (16:9)

- Default position: lower-third, left-aligned with 100px left margin.
- Connector text and emphasis keyword stack vertically (connector above keyword), left-aligned.
- Clear gap between tiers: minimum 50px, target 60–80px.
- Total caption block should not exceed 50% of frame width (tighter than v1.0 due to larger text).
- For talking-head formats where the speaker is centred, centre-align captions instead.

### 6.4 Multi-Line Handling

With the 3–4 word limit, multi-line wrapping within a single tier should **never** occur. If a connector phrase is long enough to wrap at the doubled font size, it contains too many words — split it into a smaller chunk. Each tier must always be a single line.

---

## 7. Timing & Animation — Whisper-Driven Sync

### 7.1 Whisper Integration (Primary Timing Source)

All caption timing is derived from OpenAI Whisper's word-level timestamps. This is the single source of truth for when captions appear and disappear.

**Whisper transcription command:**

```bash
whisper input.mp4 --model large-v3 --output_format json --word_timestamps True
```

This produces a JSON file where each word has a precise `start` and `end` timestamp:

```json
{
  "segments": [
    {
      "text": "According to the Nilson Report U.S. merchants paid 172 billion dollars in card acceptance fees",
      "words": [
        { "word": "According", "start": 1.20, "end": 1.68 },
        { "word": "to", "start": 1.68, "end": 1.78 },
        { "word": "the", "start": 1.78, "end": 1.88 },
        { "word": "Nilson", "start": 1.92, "end": 2.30 },
        { "word": "Report", "start": 2.30, "end": 2.72 },
        { "word": "U.S.", "start": 2.80, "end": 3.10 },
        { "word": "merchants", "start": 3.10, "end": 3.52 },
        { "word": "paid", "start": 3.52, "end": 3.78 },
        { "word": "172", "start": 3.82, "end": 4.40 },
        { "word": "billion", "start": 4.44, "end": 4.80 },
        { "word": "dollars", "start": 4.80, "end": 5.18 },
        { "word": "in", "start": 5.18, "end": 5.28 },
        { "word": "card", "start": 5.30, "end": 5.56 },
        { "word": "acceptance", "start": 5.56, "end": 6.02 },
        { "word": "fees", "start": 6.02, "end": 6.44 }
      ]
    }
  ]
}
```

### 7.2 Chunking Algorithm

The AI agent must group Whisper words into 3–4 word chunks and derive the timing for each chunk:

```
INPUT:  Whisper word-level JSON
OUTPUT: List of caption chunks, each with:
        - words (list of 3-4 words)
        - start_time (first word's start minus 50ms pre-flash)
        - end_time (last word's end plus 200ms hold)
        - keyword (the emphasis word, or null for uniform mode)

ALGORITHM:
1. Load all words from Whisper JSON.
2. Walk through words sequentially, grouping into chunks of 3-4.
3. Prefer breaking at natural pause points:
   a. If there is a gap of ≥150ms between two consecutive words,
      break the chunk there (even if chunk is only 2 words).
   b. Otherwise, group into 3-4 words.
4. For each chunk:
   a. start_time = first_word.start - 0.050  (50ms pre-flash)
   b. end_time   = last_word.end + 0.200     (200ms hold)
   c. Identify keyword (if any) per Section 5.3 rules.
5. Validate: no two chunks overlap in time. If they would,
   trim the previous chunk's end_time to match the next chunk's
   start_time (no gap, no overlap).
```

### 7.3 Caption Timing Rules

- **Pre-flash:** Each caption chunk appears 50ms before the first word in the chunk is spoken. This gives the viewer's eye time to land on the text before the audio confirms it.
- **Hold:** Each caption chunk stays on screen for 200ms after the last word in the chunk finishes. This prevents the text from vanishing while the viewer is still reading.
- **Minimum display time:** 600ms. If a chunk's calculated duration (start to end including pre-flash and hold) is under 600ms, extend the hold to reach 600ms.
- **Maximum display time:** 2500ms. If a chunk would exceed this (e.g., a long pause in speech), split it or let it end at 2500ms.
- **No gaps between chunks:** When consecutive chunks have no natural pause between them, the previous chunk's end time should equal the next chunk's start time (seamless transition, hard cut).

### 7.4 Animation Behaviour

**Entrance — Emphasis Keyword:** Scale up from 80% to 100% over 150ms with a subtle ease-out curve. Optionally add a slight Y-offset pop (translate upward 10–16px during scale). This creates the "punch" effect.

**Entrance — Connector Text:** Fade in from 0% to 100% opacity over 100ms or cut in instantly (no animation). Connector text should never upstage the keyword animation.

**Exit:** All text cuts out instantly (opacity 100% → 0% in 1 frame). No fade-out. Hard cuts maintain energy and pacing.

**Stagger:** Connector text and keyword appear together (simultaneously). With only 3–4 words on screen, staggering is unnecessary and would desync from the voiceover. The 50ms pre-flash already provides the "setup before payoff" effect.

> **v2.0 change:** The v1.0 stagger (connector 50–80ms before keyword) is removed. At 3–4 words per chunk with tight Whisper timing, both tiers must appear and disappear as a single unit to stay synchronised with audio.

---

## 8. Graphic Overlay System

In addition to text, this style uses occasional graphic overlays to reinforce high-impact words visually. These are small, punchy images composited near the emphasis keyword.

### 8.1 When to Use Overlays

- Use when the keyword represents a concrete, universally recognisable concept (e.g., "money" → image of cash with a red X; "house" → house icon).
- Do **not** use overlays for abstract concepts (e.g., "freedom," "truth") — these clutter the frame without aiding comprehension.
- Maximum one overlay per caption chunk. Never stack multiple graphics.
- With larger text sizes, ensure overlays do not overlap with either the connector or emphasis text. Position overlays to the right of the keyword, or below it if horizontal space is tight.

### 8.2 Overlay Specifications

| Property | 9:16 Value | 16:9 Value |
|---|---|---|
| Max Size | 250 × 250px | 200 × 200px |
| Position | Adjacent to keyword, right-offset preferred. Min 30px gap from text. | Adjacent to keyword, right-offset preferred. Min 20px gap from text. |
| Style | PNG cutout, slight drop shadow, optional red X/check overlay | Same as 9:16 |
| Animation | Scale pop in sync with keyword (80%→100%, 150ms) | Same as 9:16 |

---

## 9. Technical Implementation

### 9.1 Recommended Tools

| Tool | Best For | Automation Level | Notes |
|---|---|---|---|
| FFmpeg + ASS subtitles | Fully programmatic pipelines | Full automation | Best for AI agent workflows. Supports all styling. |
| CapCut (Pro) | Semi-manual editing | Template-based | Good preset system for this style. Export captions as .srt then restyle. |
| After Effects + MOGRT | Highest visual quality | Template-based | Essential Graphics templates enable this style with drag-drop. |
| Remotion (React) | Web-rendered programmatic video | Full automation | React components for each caption style. Renders via headless browser. |

### 9.2 FFmpeg + ASS Implementation (Primary Method)

The ASS (Advanced SubStation Alpha) subtitle format provides full control over font, colour, size, position, and animation. Below is the template structure an AI agent should generate.

#### 9.2.1 ASS Header Template

The following header block should be placed at the top of every `.ass` file. Adjust `PlayResX`/`PlayResY` to match the target canvas.

```ass
[Script Info]
ScriptType: v4.00+
PlayResX: 1080          ; Set to 1920 for 16:9
PlayResY: 1920          ; Set to 1080 for 16:9
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding

; --- 9:16 VERTICAL STYLES (v2.0 — doubled sizes, wider spacing) ---
Style: Connector,Montserrat SemiBold,84,&H00FFFFFF,&H00FFFFFF,&H80000000,&H60000000,-1,0,0,0,100,100,1,0,1,4,5,2,60,60,520
Style: Emphasis,Montserrat ExtraBold,200,&H002A30E8,&H002A30E8,&H80000000,&H60000000,-1,0,0,0,100,100,2,0,1,5,6,2,60,60,280
Style: Uniform,Montserrat SemiBold,96,&H00FFFFFF,&H00FFFFFF,&H80000000,&H60000000,-1,0,0,0,100,100,1,0,1,4,5,2,60,60,400

; --- 16:9 HORIZONTAL STYLES (v2.0 — doubled sizes, wider spacing) ---
Style: Connector_H,Montserrat SemiBold,68,&H00FFFFFF,&H00FFFFFF,&H80000000,&H60000000,-1,0,0,0,100,100,1,0,1,3,4,1,100,100,280
Style: Emphasis_H,Montserrat ExtraBold,144,&H002A30E8,&H002A30E8,&H80000000,&H60000000,-1,0,0,0,100,100,2,0,1,4,5,1,100,100,120
Style: Uniform_H,Montserrat SemiBold,76,&H00FFFFFF,&H00FFFFFF,&H80000000,&H60000000,-1,0,0,0,100,100,1,0,1,3,4,1,100,100,200
```

**Key differences from v1.0:**

| Parameter | v1.0 (9:16) | v2.0 (9:16) | Why |
|---|---|---|---|
| Connector Fontsize | 42 | **84** | 2× increase |
| Emphasis Fontsize | 100 | **200** | 2× increase |
| Connector MarginV | 420 | **520** | Pushed higher to create gap |
| Emphasis MarginV | 350 | **280** | Pushed lower to create gap |
| Connector Outline | 2.5 | **4** | Thicker stroke for larger text |
| Emphasis Outline | 3 | **5** | Thicker stroke for larger text |
| Connector Shadow | 3 | **5** | Proportional increase |
| Emphasis Shadow | 4 | **6** | Proportional increase |

> **Colour format note:** ASS uses `&HAABBGGRR` format (alpha, blue, green, red). So the red emphasis colour `#E8302A` becomes `&H002A30E8`. White `#FFFFFF` stays `&H00FFFFFF`.

#### 9.2.2 Dialogue Line Patterns (Whisper-Driven)

Each 3–4 word chunk generates one or two dialogue lines — one for connector text (if present), one for the emphasis keyword (if present) — timed directly from Whisper word timestamps.

```ass
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text

; ═══ SENTENCE: "According to the Nilson Report, U.S. merchants paid 172
;                billion dollars in card acceptance fees"
; ═══ Chunked into 6 x 3-4 word groups from Whisper timestamps

; Chunk 1: "According to the" (uniform — no keyword dominates)
; Whisper: "According" 1.20-1.68, "to" 1.68-1.78, "the" 1.78-1.88
Dialogue: 0,0:00:01.15,0:00:02.08,Uniform,,0,0,0,,According to the

; Chunk 2: "Nilson Report" (uniform — proper noun reference)
; Whisper: "Nilson" 1.92-2.30, "Report" 2.30-2.72
Dialogue: 0,0:00:01.87,0:00:02.92,Uniform,,0,0,0,,Nilson Report

; Chunk 3: "U.S. merchants paid" (uniform — setup context)
; Whisper: "U.S." 2.80-3.10, "merchants" 3.10-3.52, "paid" 3.52-3.78
Dialogue: 0,0:00:02.75,0:00:03.98,Uniform,,0,0,0,,U.S. merchants paid

; Chunk 4: "172" (solo keyword — the shocking number)
; Whisper: "172" 3.82-4.40
Dialogue: 1,0:00:03.77,0:00:04.60,Emphasis,,0,0,0,,{\fscx80\fscy80\t(0,150,\fscx100\fscy100)}172

; Chunk 5: "billion dollars in" (uniform — contextual)
; Whisper: "billion" 4.44-4.80, "dollars" 4.80-5.18, "in" 5.18-5.28
Dialogue: 0,0:00:04.39,0:00:05.48,Uniform,,0,0,0,,billion dollars in

; Chunk 6: "card acceptance fees" (two-tier — "fees" is the keyword)
; Whisper: "card" 5.30-5.56, "acceptance" 5.56-6.02, "fees" 6.02-6.44
Dialogue: 0,0:00:05.25,0:00:06.64,Connector,,0,0,0,,card acceptance
Dialogue: 1,0:00:05.25,0:00:06.64,Emphasis,,0,0,0,,{\fscx80\fscy80\t(0,150,\fscx100\fscy100)}fees
```

> **Notice:** Chunks 1–3 and 5 are uniform mode (no word dominates), so they use the `Uniform` style. Only chunks 4 and 6 use emphasis. This is normal — most chunks in an informational voiceover will be uniform. Reserve red emphasis for the words that truly punch.

#### 9.2.3 Two-Tier Timing Rule

When a chunk uses two-tier layout (connector + emphasis), both dialogue lines **must share identical start and end times**. This ensures they appear and disappear as a single unit, maintaining sync with the voiceover.

```ass
; ✅ CORRECT — both lines have same start/end
Dialogue: 0,0:00:05.25,0:00:06.64,Connector,,0,0,0,,card acceptance
Dialogue: 1,0:00:05.25,0:00:06.64,Emphasis,,0,0,0,,{\fscx80\fscy80\t(0,150,\fscx100\fscy100)}fees

; ❌ WRONG — staggered timing desyncs from voiceover
Dialogue: 0,0:00:05.20,0:00:06.64,Connector,,0,0,0,,card acceptance
Dialogue: 1,0:00:05.30,0:00:06.64,Emphasis,,0,0,0,,fees
```

#### 9.2.4 FFmpeg Burn-In Command

Once the `.ass` file is generated, burn it into the video with a single FFmpeg command:

```bash
ffmpeg -i input.mp4 -vf "ass=captions.ass" -c:v libx264 -preset medium \
  -crf 18 -c:a copy output.mp4
```

For 9:16 content that needs to be re-encoded to a specific resolution:

```bash
ffmpeg -i input.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=decrease,\
  pad=1080:1920:(ow-iw)/2:(oh-ih)/2,ass=captions.ass" \
  -c:v libx264 -preset medium -crf 18 -c:a aac -b:a 192k output_9x16.mp4
```

### 9.3 Whisper-to-ASS Pipeline (End-to-End)

The complete automated pipeline for an AI agent:

```
Step 1: Transcribe with Whisper
─────────────────────────────────
whisper input.mp4 --model large-v3 --output_format json --word_timestamps True
→ produces input.json with word-level timestamps

Step 2: Chunk the transcript
─────────────────────────────────
For each segment in input.json:
  - Group words into 3-4 word chunks (prefer breaking at ≥150ms gaps)
  - For each chunk, identify keyword or flag as uniform mode
  - Calculate start_time (first_word.start - 0.050) and end_time (last_word.end + 0.200)

Step 3: Generate ASS file
─────────────────────────────────
- Write [Script Info] header with correct PlayResX/PlayResY for target platform
- Write [V4+ Styles] with the v2.0 style definitions
- For each chunk, write dialogue lines:
    - If uniform mode: 1 line using Uniform style
    - If two-tier mode: 2 lines (Connector + Emphasis), same start/end times
    - Apply scale animation tag to Emphasis lines

Step 4: Validate
─────────────────────────────────
- Check no two chunks overlap in time
- Check anti-overlap spacing (Section 6.1)
- Check all captions within safe zones (Section 2.2)

Step 5: Burn captions into video
─────────────────────────────────
ffmpeg -i input.mp4 -vf "ass=captions.ass" -c:v libx264 -preset medium \
  -crf 18 -c:a copy output_captioned.mp4
```

---

## 10. AI Agent Decision Tree

When processing a new video, the AI agent should follow this sequence:

1. **Transcribe with Whisper** → run `whisper` with `--word_timestamps True` to get word-level JSON.
2. **Determine target platform** → select 9:16 or 16:9 style set and corresponding safe zones.
3. **Chunk the transcript** → group words into 3–4 word chunks, preferring breaks at natural pauses (≥150ms gaps between words).
4. **Classify each chunk** → does it contain a single dominant emotional/informational word? If YES → Two-Tier Mode (connector + emphasis). If NO → Uniform Mode.
5. **Select keyword** (Two-Tier Mode only) → choose the single highest-impact word using the rules in Section 5.3.
6. **Check for overlay candidacy** → is the keyword a concrete, visualisable concept? If YES and it adds value, prepare a graphic overlay.
7. **Calculate timing** → chunk start = first word's Whisper start minus 50ms. Chunk end = last word's Whisper end plus 200ms. Enforce minimum 600ms / maximum 2500ms.
8. **Generate ASS dialogue lines** → create the dialogue lines with correct timing, style references, and animation tags. Two-tier chunks get two lines with identical timing.
9. **Validate** → run anti-overlap spacing check (Section 6.1), safe zone check (Section 2.2), and timing overlap check.
10. **Burn into video** → execute the FFmpeg command from Section 9.2.4.

---

## 11. Quality Assurance Checklist

Before finalising any captioned video, verify every item below:

- [ ] **No text overlap:** Connector and emphasis text have ≥60px clear gap between them at all times.
- [ ] **3–4 word max:** No caption appearance shows more than 4 words across both tiers.
- [ ] **Voiceover sync:** Each caption chunk aligns with its corresponding spoken words (±100ms tolerance). Scrub through the video and spot-check at least 5 points.
- [ ] No caption text is obscured by platform UI elements (like/comment/share buttons, username overlays, progress bars).
- [ ] Only one emphasis keyword is highlighted per screen (or zero in Uniform Mode).
- [ ] Emphasis keywords are visually dominant — at least 2× the font size of connector text.
- [ ] All text has a visible stroke (≥4px) and shadow for legibility on any background.
- [ ] No caption remains on screen for less than 600ms or more than 2500ms.
- [ ] The emphasis colour is consistent throughout the entire video (no colour switching mid-video).
- [ ] No style inconsistency — every chunk uses either Uniform or Two-Tier mode, never a random third style.
- [ ] Graphic overlays (if used) do not overlap with text and maintain ≥30px gap.
- [ ] For 9:16: captions are in the lower 55–75% of the frame.
- [ ] For 16:9: captions are in the lower-third region, not exceeding 50% of frame width.
- [ ] No grammatical errors or word omissions in the caption text.
- [ ] Text encoding is correct — apostrophes, accented characters, and special symbols render properly.

---

## Appendix A: ASS Colour Reference (Quick Lookup)

| Colour Name | Hex (Web) | ASS Format | Use Case |
|---|---|---|---|
| White | `#FFFFFF` | `&H00FFFFFF` | Connector text |
| Emphasis Red | `#E8302A` | `&H002A30E8` | Keyword emphasis |
| Black (stroke) | `#000000` | `&H00000000` | Outline / shadow |
| Black 60% opacity | `#000000` @ 60% | `&H99000000` | Drop shadow |
| Yellow (alt) | `#FACC15` | `&H0015CCFA` | Alt emphasis |

---

## Appendix B: Platform-Specific Reminder Cards

**Instagram Reels:** Caption zone Y:250–1520. Bottom 400px is a dead zone (username, audio label, CTA button). Right edge has like/comment icons from Y:800–1400 — keep captions centre or left.

**YouTube Shorts:** Very similar to Reels but the subscribe button and channel name sit lower. Safe bottom margin is 350px. Title overlay at top can extend to 200px.

**YouTube Landscape (16:9):** Progress bar and controls occupy bottom 120px on hover. Keep captions above Y:960 minimum. Left-align at 100px margin for talking-head content; centre-align for B-roll segments.

---

## Appendix C: Whisper Model Selection Guide

| Whisper Model | Speed | Accuracy | Recommended For |
|---|---|---|---|
| `tiny` | Fastest | Low | Quick previews only |
| `base` | Fast | Moderate | Draft passes |
| `small` | Moderate | Good | Acceptable for production if compute-limited |
| `medium` | Slow | Very good | Good production default |
| `large-v3` | Slowest | Best | **Recommended for final production.** Best word-level timestamp accuracy. |

> **Always use `large-v3` for final production** — the smaller models have noticeably worse word-boundary detection, which causes the exact sync drift that v2.0 is designed to eliminate.

---

## Appendix D: Thumbnail Adaptation (16:9 → 9:16)

When a video is published on both YouTube (16:9 landscape) and Instagram (9:16 vertical), the thumbnail must be redesigned — not simply cropped. A centre-crop of a 16:9 thumbnail into 9:16 destroys the composition every time. This appendix defines the adaptation rules.

### D.1 Core Layout Shift

The fundamental change is converting a **side-by-side** layout into a **vertically stacked** layout.

| Property | YouTube 16:9 (1920×1080) | Instagram 9:16 (1080×1920) |
|---|---|---|
| Layout | Two columns: text left, image right | Stacked: image top, text bottom |
| Image zone | Right 50% of frame, cropped to fit | Full width, occupies top 55–65% (Y: 0–1050 to 1250) |
| Text zone | Left 50% of frame, vertically centred | Bottom 35–45%, left-aligned (Y: 1050–1700) |
| Text alignment | Left-aligned, vertically centred in column | Left-aligned, anchored to bottom of text zone |
| Background behind text | Solid dark panel or dark half of frame | Gradient overlay on image (see D.3) |
| Max text width | ~50% of frame (960px) | ~90% of frame (960px with 60px margins each side) |

### D.2 Image Handling

On 16:9, the image occupies roughly half the frame and is often cropped or masked to fit the right column. On 9:16, the image becomes the dominant visual element:

- **Fill the full width** (1080px) and occupy the top 55–65% of the frame.
- The image should be re-cropped or re-framed for vertical composition. A landscape image that worked at 960×1080 will not look right stretched to 1080×1250 — re-crop to focus on the subject's face or the central element.
- If using AI-generated imagery, regenerate at 9:16 aspect ratio rather than cropping the 16:9 version.
- The subject (person, object, scene) should be centred or slightly offset to allow text to sit below without competing.

### D.3 Gradient Overlay for Text Legibility

On 16:9, text often sits on a solid dark background (the left panel). On 9:16, the image bleeds behind the text zone, so a gradient overlay is required:

**Gradient specification:**

```
Direction: bottom to top (darkest at bottom edge)
Start (bottom): rgba(0, 0, 0, 0.85)
Mid (text zone top): rgba(0, 0, 0, 0.50)
End (image zone): rgba(0, 0, 0, 0.0)
Gradient start Y: 1920px (bottom edge)
Gradient end Y: ~1000px (just above text zone)
```

**FFmpeg implementation:**

```bash
# Add a dark gradient overlay to the bottom portion of the frame
ffmpeg -i thumbnail_raw.png \
  -filter_complex "[0]split[bg][fg]; \
    [bg]crop=1080:920:0:1000,colorbalance=rs=0:gs=0:bs=0, \
    format=rgba,colorchannelmixer=aa=0.8[dark]; \
    [fg][dark]overlay=0:1000:format=auto" \
  thumbnail_with_gradient.png
```

Alternatively, if compositing programmatically (e.g., via Pillow or Canvas API), draw a linear gradient rectangle from Y:1000 to Y:1920 with the opacity values above, layered on top of the image before placing text.

### D.4 Text Block Adaptation

The kinetic typography hierarchy (white connector text + oversized red emphasis keywords) applies to thumbnails exactly as it does to captions, with these adjustments:

**Font sizes for thumbnails (static images, not animated):**

| Element | 16:9 Thumbnail | 9:16 Thumbnail |
|---|---|---|
| Connector / white text | 80–100px | 90–110px |
| Emphasis / red keywords | 100–140px | 120–160px |
| Line spacing | 0.9× line height (tight) | 1.0× line height (slightly more room) |

> **Why slightly larger on 9:16:** The text block occupies a narrower vertical slice of the frame on 9:16 (35–45% vs 50% on 16:9), so it needs to be proportionally larger to maintain the same visual weight relative to the image. The taller canvas also means more vertical room, so line heights can be slightly more generous.

**Text positioning:**

- Left padding: 60px from left edge.
- Right padding: 60px from right edge (text should not exceed 960px width on 1080px canvas).
- Bottom of lowest text line: no lower than Y: 1620 (to survive the 4:5 feed crop — see D.5).
- Top of highest text line: no higher than Y: 1050 (must stay below the image zone).

**Text stacking order** (top to bottom within the text zone):

For a title like "HOW THE INTERCHANGE FEE BECAME AMERICA'S HIDDEN TAX":

```
Line 1: "HOW THE"              → white, connector size (90–110px)
Line 2: "INTERCHANGE"          → red, emphasis size (120–160px)
Line 3: "FEE"                  → red, emphasis size (continuation)
Line 4: "BECAME"               → white, connector size
Line 5: "AMERICA'S"            → white, connector size
Line 6: "HIDDEN TAX"           → red, emphasis size
```

> **Thumbnail exception — ALL CAPS is acceptable.** Unlike in-video captions (where lowercase emphasis is preferred for the punchy, edgy feel), thumbnails use ALL CAPS because they are static images competing in a feed grid. All-caps reads faster at small sizes and matches the visual language viewers expect from YouTube/Instagram thumbnails.

### D.5 Instagram 4:5 Feed Crop Safe Zone

Instagram displays Reels thumbnails at 4:5 (1080×1350) in the profile grid and explore feed, cropping equally from the top and bottom of the 9:16 frame:

```
Full frame:        1080 × 1920
4:5 crop:          1080 × 1350
Cropped from top:  ~285px
Cropped from bottom: ~285px
Visible zone:      Y: 285 → Y: 1635
```

**All essential text and the subject's face/key visual must fall within Y: 285–1635.** This means:

- The lowest line of text must be above Y: 1620 (15px margin from crop edge).
- The highest line of text should be below Y: 1050 (well within safe zone).
- The subject's face or primary visual element should be centred around Y: 600–900 for maximum visibility in both full-frame and cropped views.

### D.6 Worked Example

**Original 16:9 thumbnail:** "HOW THE INTERCHANGE FEE BECAME AMERICA'S HIDDEN TAX" — text fills left 50% with solid dark background, suited man with credit card fills right 50%.

**Adapted 9:16 thumbnail:**

```
┌──────────────────────┐  Y: 0
│                      │
│   (suited man with   │
│    credit card and   │
│    $ signs, filling  │  Image zone: Y: 0–1100
│    full width,       │  Subject centred ~Y: 500–700
│    re-cropped for    │
│    vertical comp.)   │
│                      │
│ ░░░░ gradient ░░░░░░ │  Gradient starts ~Y: 1000
├──────────────────────┤  Y: 1100 (approx)
│                      │
│  HOW THE             │  White, 100px, Y: ~1120
│  INTERCHANGE         │  Red, 140px, Y: ~1240
│  FEE                 │  Red, 140px, Y: ~1360
│  BECAME AMERICA'S    │  White, 90px, Y: ~1450
│  HIDDEN TAX          │  Red, 140px, Y: ~1570
│                      │
│  ────────────────    │  Y: 1620 (4:5 crop safe limit)
│  (cropped in feed)   │
└──────────────────────┘  Y: 1920
```

### D.7 AI Agent Decision Tree for Thumbnail Adaptation

When the agent needs to produce both a 16:9 and 9:16 thumbnail for the same video:

1. **Design the 16:9 version first** — this is the primary thumbnail (YouTube search, suggested videos).
2. **Identify the text block and image block** — separate the two compositional elements.
3. **Re-crop or regenerate the image** for 9:16 vertical framing. Centre the subject.
4. **Place the image in the top 55–65%** of the 9:16 canvas.
5. **Apply the gradient overlay** from Y:1000 downward (see D.3).
6. **Stack the text block in the bottom 35–45%** using the adapted font sizes (see D.4).
7. **Validate the 4:5 crop safe zone** — all text within Y: 285–1635 (see D.5).
8. **Export at 1080×1920** for Instagram upload.

### D.8 Additional Instagram Format Considerations

**Instagram Feed Post (1:1 or 4:5):** If the thumbnail will also be used as a static feed post (not a Reel), design at 1080×1350 (4:5) directly rather than cropping from 9:16. The text block can occupy more of the frame since there are no Reel UI overlays.

**Instagram Stories (9:16 with interactive elements):** If used as a Story cover or swipe-up frame, reserve the bottom 200px for the swipe-up CTA and the top 100px for the user's profile bar. The effective text zone shrinks to Y: 1050–1620.

**Carousel cover slide:** If the thumbnail is the first slide of a carousel, design at 1080×1350 (4:5). Apply the same text hierarchy but with slightly smaller emphasis text (100–130px) since carousels are viewed at smaller sizes in the feed.

---

*End of Document*
