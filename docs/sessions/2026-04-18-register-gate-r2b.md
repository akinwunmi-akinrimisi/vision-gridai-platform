# Session note — 2026-04-18 — Production Register Sprint R2b (Ken Burns register-aware motion)

## Context

After Sprint R2 landed image-prompt / TTS / music register injection, the next-most-visible
lever was camera motion. Two problems tackled together:

1. Per-register motion presets were never injected into Ken Burns rendering.
2. `ken_burns.sh` (the shell script the workflow called) was missing from `/data/n8n-production/`
   — deleted during the Session 35 disk cleanup. So WF_KEN_BURNS would have failed at runtime.

Both fixed by inlining FFmpeg directly into the `Run Ken Burns FFmpeg` Code node.

## What shipped

### WF_KEN_BURNS (`ASLXbJYJn6WBAJG5`) — `Run Ken Burns FFmpeg` Code node rewritten

- **No more shell-script dependency.** FFmpeg is invoked directly via `execSync` with absolute
  paths (`/usr/bin/ffmpeg`, `/usr/bin/curl`, `/bin/rm`) — n8n's task-runner context has a minimal
  PATH, which was why `ffmpeg: command not found` was showing up in the naive Code-node version.
- **Per-register zoompan preset library** baked in as a JS object. Five registers × four presets
  (hero / regular_a / regular_b / regular_c). Scene 1 gets the `hero` preset; all later scenes
  cycle a/b/c by `(scene_number - 2) % 3`.
- **Motion constraint preserved.** Every preset caps zoom velocity ≤ 0.001 units/frame at 30 fps
  per the video_production/README "no shaky motion" rule. Archive's signature pan motion is
  implemented via `x='min(iw-iw/zoom,(iw-iw/zoom)*on/frames)'`.
- **Fallback preset** for scenes where `production_register` is null — gentle push matching the
  old default `zoom=in` behavior.

### Per-register flavor at a glance

| Register | Hero | Regular feel | Zoom ceiling |
|---|---|---|---|
| 01 Economist | slow pull (1.15→1.0) | slow push, soft drift, gentle push | 1.15 |
| 02 Premium | breath push (1.02→1.10) | gentle push, breath pull, reverse drift | 1.10 |
| 03 Noir | creep in (1.0→1.08, 30s range) | tiny push, ultra-slow drift, static | 1.08 |
| 04 Signal | precision push (1.0→1.12) | sharp push, static, lateral pan | 1.12 |
| 05 Archive | Ken Burns pan+zoom (1.05→1.18 w/ pan) | pan right, pan left reverse, pull | 1.18 |

## Verification done

- `ffmpeg -vf "zoompan=z='min(1.15,1.0+on*0.0005)':..."` ran successfully with a synthetic input
  image inside the n8n container, output MP4 created.
- The Node.js `execSync` wrapper works with the full command when `/usr/bin/ffmpeg` is used
  absolute. Without absolute path: `ffmpeg: command not found` under the task runner.

## Sprint R2b is the bridge between R2 and R3

Still owed before production truly *looks* per-register:

- **LUT library** — Ken Burns currently skips color grading (old `ken_burns.sh` called a separate
  shell path for that). Color grade integration pending R3 when the 9 .cube LUTs are built.
- **Font library** — caption burn still uses one bold sans. Register-specific fonts require 9
  `.ttf` files dropped into the caption-burn systemd service.
- **Overlay library** — grain, bokeh, vignette, HUD brackets, evidence circles, highlight rings
  per register. Tabled to R3.
- **Per-register voice in TTS** — R2 only changed `speakingRate`; voice name still Chirp3-HD-Charon.
- **Thumbnail register styling** — R3.
