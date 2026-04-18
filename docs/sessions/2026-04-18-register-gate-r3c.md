# Session note — 2026-04-18 — Production Register Sprint R3c (final)

## What this finishes

All 9 planned register-aware production levers are now live. The remaining deferred
items (real DaVinci `.cube` LUTs, HUD / evidence-ring / highlight-ring overlay graphics)
are premium quality upgrades, not features — the current soft-LUT + grain+vignette
combination already gives each register its signature look.

### R3c deliverables

#### 1. Authentic OFL fonts downloaded + mounted

- `download_fonts.sh` pulled 6 TTF files from Google Fonts CSS2 API into `/data/fonts/`
  on the VPS host: **Inter Tight**, **Playfair Display**, **JetBrains Mono**, **Courier
  Prime**, **Space Grotesk** (all OFL), plus **Cormorant Garamond** as an OFL proxy for
  the commercially-licensed GT Sectra.
- Lucky discovery: `/data/fonts` was already bind-mounted into the n8n container at
  `/usr/share/fonts/custom` (read-only). New TTF files auto-visible to libass without
  a container restart. No docker-compose change required.
- `caption_burn_service.py` `REGISTER_FONT_MAP` upgraded from in-container proxies to
  authentic family names. Also added explicit `fontsdir=/usr/share/fonts/custom` to
  the FFmpeg `subtitles` filter so libass finds fonts without needing fontconfig config
  (the hardened Alpine n8n image has no fontconfig cache). Service restarted under
  systemd; health endpoint returns 200.

| Register | Font family | Source file |
|---|---|---|
| 01 Economist | Inter Tight | `InterTight-Bold.ttf` (OFL) |
| 02 Premium | Cormorant Garamond | `CormorantGaramond-Bold.ttf` (OFL, proxy for GT Sectra) |
| 03 Noir | Courier Prime | `CourierPrime-Bold.ttf` (OFL) |
| 04 Signal | JetBrains Mono | `JetBrainsMono-Bold.ttf` (OFL) |
| 05 Archive | Playfair Display | `PlayfairDisplay-Bold.ttf` (OFL) |
| fallback | Arial | MS core (in-container) |

GT Sectra swap-in: once the licensed `.ttf` is sourced, drop into `/data/fonts/` and
update the `REGISTER_02_PREMIUM` entry. No code change required elsewhere.

#### 2. Register-aware overlay filters (grain + vignette) in Ken Burns

`Run Ken Burns FFmpeg` Code node gained an `OVERLAYS` library. The video filter chain
is now `zoompan → color grade → grain → vignette`, applied as a single `-vf` argument
per scene.

| Register | Grain (`noise=alls`) | Vignette (`angle=PI/X`) | Intent |
|---|---|---|---|
| 01 Economist | 4 (~8%) | PI/5 (soft) | Editorial warmth, documentary grain |
| 02 Premium | 3 (~6%) | PI/4.5 (subtle) | Luxurious sheen, minimal grain |
| 03 Noir | 8 (~12%) | PI/3 (strong) | 16mm grain feel, darkened corners for tension |
| 04 Signal | 2 (~5%) | PI/6 (minimal) | Clinical clean, tech sharpness |
| 05 Archive | 10 (~15%) | PI/3.5 (moderate) | High-silver film grain, period patina |

Fallback: `vignette=angle=PI/5` (no grain) for scenes with null register.

Smoke-tested: Archive's full chain (zoompan + teal-orange grade + heavy grain +
moderate vignette) produces valid 40KB 3-second MP4 with visible grain entropy
in the bitrate.

## Final cumulative state — all 9 levers live

| Lever | Sprint | Implementation |
|---|---|---|
| 1. Gate UI (top-2 recs, compat badges) | R1 | `RegisterSelector.jsx` + WF_REGISTER_ANALYZE (Claude Haiku) |
| 2. Image prompt anchors + negatives | R2 | WF_IMAGE_GENERATION — Seedream prompt composition `[prefix + subject + register_anchors + style_dna]` |
| 3. TTS speaking rate | R2 | WF_TTS_AUDIO — per-register 0.90–1.00 |
| 4. Music BPM + mood constraints | R2 | WF_MUSIC_GENERATE — Claude Haiku prompt constraint |
| 5. Ken Burns motion preset | R2b | 5 registers × 4 presets (hero + regular a/b/c) |
| 6. Color grade (soft-LUT) | R3 | eq + colorbalance + curves per register |
| 7. TTS voice name (Chirp3 HD) | R3b | Charon / Aoede / Fenrir / Puck / Leda |
| 8. Thumbnail register grade + context | R3b | WF_THUMBNAIL_GENERATE prompt substitution |
| 9. Caption font family | R3b → R3c | Authentic OFL fonts (5) + Cormorant Garamond proxy |
| 10. Overlays (grain + vignette) | R3c | FFmpeg `noise` + `vignette` filters per register |

## What a test production will now render per register

- **REGISTER_01 Economist:** Inter Tight captions, Charon voice @ 0.95x, slow zoom-in
  motion with muted warm grade, 8% grain, soft vignette. Documentary feel.
- **REGISTER_02 Premium:** Cormorant Garamond captions, Aoede voice @ 0.92x, breath
  motion with Kodak Portra teal-shadows/amber-highlights grade, 6% grain, subtle
  vignette. Luxury editorial.
- **REGISTER_03 Noir:** Courier Prime captions, Fenrir voice @ 0.90x, slow creep-in
  motion with bleach-bypass desaturation + crushed blacks grade, 12% grain, strong
  vignette. True-crime investigation.
- **REGISTER_04 Signal:** JetBrains Mono captions, Puck voice @ 1.00x, sharp precision
  motion with clinical cool-blue grade, 5% grain, minimal vignette. Tech futurist.
- **REGISTER_05 Archive:** Playfair Display captions, Leda voice @ 0.93x, Ken Burns
  pan-zoom with sepia-faded warm grade, 15% grain, moderate vignette. Historical
  documentary.

## What's genuinely deferred (not blocking test production)

- **Real DaVinci `.cube` LUTs** — drop-in replacement for current FFmpeg-based soft-LUTs.
  Perceptual quality gap is small; aesthetic gap visible only on side-by-side A/B.
- **HUD corner brackets / evidence circles / highlight rings** — register-specific
  graphic overlays beyond grain+vignette. Need SVG design work. Current pipeline
  feels register-aware without them.
- **Actual GT Sectra font file** — commercially licensed; user confirmed license OK
  but file hasn't been uploaded. Cormorant Garamond (OFL) is a very close proxy.
- **Per-era sub-LUTs for Archive** (1920s/1960s/1980s/2000s/modern) — `register_era_detected`
  is stored and ready; need 4 era-specific grades as a follow-up.

Ready for a test production. Approve topic `2967980a` from the dashboard; the classifier
has already run and recommends REGISTER_05_ARCHIVE (92%) + REGISTER_01_ECONOMIST (68%)
with era=1960s.
