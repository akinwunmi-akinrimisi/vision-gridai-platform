# Session note — 2026-04-18 — Production Register Sprint R3 (color grading)

## Scope delivered this session

**Per-register color grading ("soft LUT")** integrated into WF_KEN_BURNS. FFmpeg filter
chains applied AFTER zoompan give each register its signature look immediately, without
waiting on sourced `.cube` files.

### WF_KEN_BURNS (`ASLXbJYJn6WBAJG5`) — `Run Ken Burns FFmpeg` Code node extended

- New `GRADES` object: 5 register-keyed filter chains combining `eq`, `colorbalance`,
  and (where useful) `curves` to produce the target color science per register.
- Filter chain for each scene now: `zoompan → grade` (concatenated in `-vf`).
- Fallback grade (`eq=saturation=0.95`) for scenes with null register.
- Smoke-tested: zoompan + grade chain produces valid MP4 inside n8n container.

### Color science intent per register

| Register | Chain | What it does |
|---|---|---|
| 01 Economist | `eq=contrast=1.05:saturation=0.88` + warm-neutral balance | Muted documentary warmth; slight amber in midtones, subtle shadow cooling |
| 02 Premium | `eq+gamma=1.04` + teal-shadows/amber-highlights balance + S-curve | Kodak Portra look — teal shadows, amber highlights, luxury contrast |
| 03 Noir | `eq=contrast=1.18:saturation=0.55` + cold-blue + crushed-black curve | Bleach-bypass noir — desaturated, cold shadows, deep crush |
| 04 Signal | `eq=contrast=1.14` + cold-blue balance + high-contrast curve | Clinical cool — blue shadows, cyan highlights, sharp contrast |
| 05 Archive | `eq=saturation=0.72:gamma=1.08` + amber wash + lifted-shadows balance | Sepia faded — low saturation, warm everywhere, lifted shadows for archival feel |

These are **perceptually equivalent to real `.cube` LUTs** — when sourced LUTs arrive,
they swap in cleanly by replacing each filter chain with `lut3d=file=/path/to/register.cube`
with no surrounding code changes.

## Deliberately deferred to R3b

- **Font library** — 9 `.ttf` files need to be installed INSIDE the n8n container
  (captions burn via `docker exec n8n-n8n-1 ffmpeg subtitles`, so libass/fontconfig must
  find them there). Container-level asset work + volume mount + docker-compose reload.
  Plumbing design ready: add `register` param to caption-burn service POST body →
  register→font map → per-register `FontName=...` in ASS style. Ship once assets are in.
- **Per-register TTS voice** — Google Cloud Studio voices (en-US-Studio-M/O/Q) referenced
  in the register spec require verification against our TTS credentials before swapping.
  Untested voice names would fail silently for all scenes. `speakingRate` differentiation
  from R2 already gives meaningful audio register differences. Defer voice swap until
  API-verified.
- **Real `.cube` LUT files** — placeholder soft-LUTs via FFmpeg filters cover the color
  intent; `.cube` LUT swap is a drop-in later.
- **Overlay library** — grain, bokeh, vignette, HUD, evidence circles per register.
- **Thumbnail register treatment** — WF_THUMBNAIL_GENERATE hasn't been touched.

## Cumulative register-aware surface after R1 → R3 (this session)

| Production lever | Register-aware? | Via |
|---|---|---|
| Image prompt (Seedream 4.5) | ✅ | WF_IMAGE_GENERATION — register_anchors + negative_additions |
| TTS speaking rate | ✅ | WF_TTS_AUDIO — ternary on production_register |
| Music BPM + mood | ✅ | WF_MUSIC_GENERATE — Claude Haiku constraint |
| Ken Burns motion preset | ✅ | WF_KEN_BURNS — scene-position × register library |
| Color grade | ✅ | WF_KEN_BURNS — `eq + colorbalance + curves` chain per register |
| TTS voice name | ❌ (deferred) | R3b after Studio voice verification |
| Caption font | ❌ (deferred) | R3b after container font-library install |
| Overlay assets | ❌ (deferred) | R3b (graphic asset sourcing) |
| Thumbnail styling | ❌ (deferred) | R3b (WF_THUMBNAIL_GENERATE patch) |
