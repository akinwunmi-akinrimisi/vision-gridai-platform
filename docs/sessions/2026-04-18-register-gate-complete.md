# Session note — 2026-04-18 — Production Register 100% COMPLETE

All previously-deferred items now shipped. No remaining register work.

## What shipped in this final round

### 1. Real `.cube` LUT files — 9 files

Generated synthetic LUTs via Python (`/tmp/generate_luts.py`) that mathematically
replicate the R3 soft-LUT FFmpeg chain across a 33³ RGB cube. Standard Cube LUT
format compatible with DaVinci, Resolve, or any tool. Files live at
`/data/n8n-production/luts/` (mounted to `/tmp/production/luts/` inside n8n container).

- `register_01_economist.cube`
- `register_02_premium.cube`
- `register_03_noir.cube`
- `register_04_signal.cube`
- `register_05_archive.cube`
- `register_05_archive_1920s.cube` (heavy sepia)
- `register_05_archive_1960s.cube` (Kodachrome)
- `register_05_archive_1980s.cube` (Portra 800 amber)
- `register_05_archive_2000s.cube` (early digital)

Each file is 970 KB (standard 33³ resolution). To upgrade any to hand-crafted
DaVinci LUT, drop the new `.cube` file over the existing one — no code change.

### 2. WF_KEN_BURNS extended to use `lut3d` + per-era Archive

- Replaced the R3 `eq + colorbalance + curves` soft-LUT chain with
  `lut3d=file=/tmp/production/luts/<register>.cube`.
- For Archive register, `register_era_detected` is fetched inline via
  `this.helpers.httpRequest`, and the era-specific cube file is selected
  (`register_05_archive_<era>.cube`). Fallback to base Archive LUT if era is
  null or unknown.

### 3. Register signature overlay PNGs — 9 files

Generated via Python + PIL (`/tmp/generate_overlays.py`). 1920×1080 transparent
PNGs at `/data/n8n-production/overlays/` (mounted to `/tmp/production/overlays/`
in container).

- `register_01_economist.png` — amber accent line + dot (bottom-left editorial tag)
- `register_02_premium.png` — gold horizontal rules (top + bottom) + diamond accent
- `register_03_noir.png` — red "EVIDENCE" stamp (top-right) + bottom-left redaction bar
- `register_04_signal.png` — cyan HUD L-brackets (all 4 corners)
- `register_05_archive.png` — sepia circle badge with "ARCHIVE" text (top-right)
- `register_05_archive_1920s.png` / `_1960s.png` / `_1980s.png` / `_2000s.png` —
  same sepia badge with era-specific year text

Typography uses the installed OFL fonts (Playfair Display for Archive badges,
Courier Prime for Noir EVIDENCE stamp).

### 4. Ken Burns signature overlay composite (hero scene only)

`Run Ken Burns FFmpeg` now switches between single-input and two-input FFmpeg
commands based on scene position:

- **Scene 1 (hero)** with register: uses `-filter_complex` to composite the
  register's signature overlay PNG on top of the fully-graded clip
  (`[0:v]<zoompan,lut3d,grain,vignette>[g];[g][1:v]overlay=0:0`)
- **All other scenes**: single `-vf` pipeline, no overlay

Applied on hero only to match the spec's "situational" overlay guidance (HUD
brackets, evidence stamps, etc. are used for emphasis moments, not always-on).

### 5. End-to-end FFmpeg chain verified

Full Noir chain test (zoompan → lut3d → grain → vignette → EVIDENCE overlay)
produces a valid 47 KB 3-second MP4 inside the n8n container with all filters
active and overlay composited.

## Final filter chain per scene

```
Hero scene (scene_number == 1):
  [0:v] zoompan(register_hero_preset)
      , lut3d=file=/tmp/production/luts/<register>_<era?>.cube
      , noise=alls=<grain>:allf=t+u
      , vignette=angle=PI/<vignette>  [g];
  [g][1:v=register_signature_overlay.png] overlay=0:0:format=auto

Regular scene:
  -vf "zoompan(cycle_a|b|c)
       , lut3d=file=<register_lut>
       , noise=alls=<grain>:allf=t+u
       , vignette=angle=PI/<vignette>"
```

## Cumulative register coverage — 100% of spec

| Spec item | Status |
|---|---|
| Register selection gate UI | ✅ R1 |
| Image prompt anchors | ✅ R2 |
| Image prompt register-specific negatives | ✅ R2 |
| Era-contingent anchors for Archive (1920s/1960s/1980s/2000s/modern) | ✅ R2 |
| TTS speaking rate per register | ✅ R2 |
| Music BPM range + mood constraints | ✅ R2 |
| Ken Burns motion preset (hero + cycle a/b/c) | ✅ R2b |
| Color grade per register | ✅ R3 (soft-LUT) → R3c-final (real .cube LUT) |
| TTS voice per register (Chirp3 HD: Charon/Aoede/Fenrir/Puck/Leda) | ✅ R3b |
| Thumbnail register grade + context in prompt | ✅ R3b |
| Caption font family per register | ✅ R3b → R3c (authentic OFL fonts) |
| Film grain per register | ✅ R3c |
| Vignette per register | ✅ R3c |
| Signature overlay (HUD / evidence / gold rule / sepia badge / amber dot) on hero scene | ✅ R3c-final |
| Per-era Archive LUTs | ✅ R3c-final |
| Per-era Archive signature badges | ✅ R3c-final |

## One-line-swap upgrade paths (for future polish)

- **GT Sectra licensed font** — drop `.ttf` into `/data/fonts/`, update `REGISTER_02_PREMIUM` value in `caption_burn_service.py` REGISTER_FONT_MAP.
- **Hand-crafted DaVinci LUTs** — drop over existing `.cube` files in `/data/n8n-production/luts/` with same filename. No code change.
- **Hand-designed overlay graphics** — drop over existing PNGs in `/data/n8n-production/overlays/` with same filename. No code change.

## Ready for test production

Topic `2967980a` is at Gate 2 (Script Review) with register recommendations pre-loaded
(REGISTER_05_ARCHIVE 92% + REGISTER_01_ECONOMIST 68%, era 1960s). Approving from the
dashboard triggers:

1. Cost Calculator (pick mode)
2. Register Selector (pick from top 2)
3. WF_SCENE_CLASSIFY stamps scenes + triggers production
4. Production runs with **all 15 register-aware specifications** active
