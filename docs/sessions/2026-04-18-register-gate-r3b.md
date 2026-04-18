# Session note — 2026-04-18 — Production Register Sprint R3b

## Scope delivered

Three more register-aware production levers landed: **TTS voice**, **thumbnail register grade**,
**caption font per register**. After this sprint, **8 of the 9 planned production levers** are
register-aware — only the overlay/grain/HUD asset library remains.

### 1. WF_TTS_AUDIO — per-register voice

`Google Cloud TTS` node's `jsonBody` expression now resolves voice name from `$json.production_register`:

| Register | Chirp3 HD voice | speakingRate (from R2) |
|---|---|---|
| 01 Economist | `en-US-Chirp3-HD-Charon` (neutral, authoritative) | 0.95 |
| 02 Premium | `en-US-Chirp3-HD-Aoede` (refined, feminine) | 0.92 |
| 03 Noir | `en-US-Chirp3-HD-Fenrir` (deep, masculine) | 0.90 |
| 04 Signal | `en-US-Chirp3-HD-Puck` (crisp, clinical) | 1.00 |
| 05 Archive | `en-US-Chirp3-HD-Leda` (warm, patient) | 0.93 |

Fallback: `Charon` (the previous default for all registers). `continueOnFail: true` on the
Google Cloud TTS node means invalid voice names surface as per-scene failures, never a
pipeline crash.

### 2. WF_THUMBNAIL_GENERATE — per-register grade + context in concept prompt

- `Fetch Topic` node's SELECT extended to pull `production_register` + `register_era_detected`.
- `Generate Concepts` Code node now fetches the register config (via `production_registers`
  table) and sets `registerGrade` to one of five register-specific grade descriptions.
- The mandatory "Color grade: dark cinematic background with teal-orange color grade" line in
  the Claude prompt is replaced with the register's grade description:

| Register | Thumbnail grade intent |
|---|---|
| 01 Economist | muted editorial warmth, amber midtones, subtle shadow cooling |
| 02 Premium | Kodak Portra teal-shadows / amber-highlights, golden hour warmth |
| 03 Noir | bleach-bypass desaturation, crushed blacks, cold blue shadows |
| 04 Signal | clinical cool, blue-black shadows, cyan highlights, high contrast |
| 05 Archive | sepia-faded warmth, lifted shadows, low saturation, archival patina |

- Register + era are also added as prompt context (`PRODUCTION REGISTER: REGISTER_05_ARCHIVE (1960s) — sepia-faded warmth...`).
- Per-niche emotion profiles preserved as-is (they describe subject, not grade).

### 3. Caption-burn service — per-register font

- `/opt/caption-burn/caption_burn_service.py` (host-side systemd service on `:9998`) patched
  to accept optional `register` field in POST body.
- `REGISTER_FONT_MAP` keyed to font families currently present in the n8n container
  (`/usr/share/fonts/`). No new font files installed in this session — map uses available
  proxies that can be replaced with sourced OFL/licensed fonts later:

| Register | ASS `FontName=` | Source |
|---|---|---|
| 01 Economist | `Inter` | `/usr/share/fonts/custom/Inter-Bold.ttf` (present) |
| 02 Premium | `Georgia` | MS core fonts (proxy for GT Sectra) |
| 03 Noir | `Courier New` | MS core fonts (exact match for Courier Prime feel) |
| 04 Signal | `Trebuchet MS` | MS core fonts (proxy for JetBrains Mono) |
| 05 Archive | `Georgia` | MS core fonts (proxy for Playfair Display) |
| fallback | `Arial` | MS core fonts (previous hardcoded default) |

Service reload verified: `systemctl is-active caption-burn.service` → `active`; health
endpoint returns `{"status": "ok"}`.

### 4. WF_CAPTIONS_ASSEMBLY — passes register to caption-burn

`Trigger Caption Burn` node now includes `"production_register": "{{ $('Load Topic').first().json.production_register || '' }}"` in the POST body to `http://172.18.0.1:9998/burn`.
Empty string when no register is set → service falls back to Arial.

## Cumulative register-aware surface (R1 → R3b)

| Lever | Sprint | Status |
|---|---|---|
| Gate UI (RegisterSelector, top-2 recs) | R1 | ✅ |
| Image prompt anchors + negatives | R2 | ✅ |
| TTS speaking rate | R2 | ✅ |
| Music BPM + mood constraints | R2 | ✅ |
| Ken Burns motion preset (scene-position × register) | R2b | ✅ |
| Color grade (soft-LUT via eq + colorbalance + curves) | R3 | ✅ |
| TTS voice name (Chirp3 HD per register) | R3b | ✅ |
| Caption font family | R3b | ✅ |
| Thumbnail register grade + context | R3b | ✅ |
| Overlay asset library (grain, bokeh, HUD, evidence) | R3c | ⏳ |
| Real `.cube` LUT files (drop-in replacement for soft-LUTs) | R3c | ⏳ |
| Actual OFL/GT Sectra font files (drop-in replacement for proxies) | R3c | ⏳ |

## Verification done

- Caption-burn service reloaded under systemd; health check returns 200.
- TTS jsonBody verified to include all 5 register voice branches.
- Thumbnail `Generate Concepts` node verified to contain `registerGrade` variable + per-register grade overrides.
- WF_CAPTIONS_ASSEMBLY `Trigger Caption Burn` verified to include `production_register` in body with `$('Load Topic')` reference.

## Deferred to R3c (asset sourcing work)

1. **Overlay PNG/WebM library** — grain (5 register tonings), bokeh, vignette, HUD corner
   brackets (Signal), evidence circles (Noir), highlight rings (Economist), year stamps
   (Archive), gold rules (Premium). ~25 assets. Best produced via DaVinci Resolve / After
   Effects. Integration adds a second FFmpeg pass to Ken Burns that overlays the selected
   WebM on the graded clip.
2. **Real `.cube` LUT files** — 9 files (5 main registers + 4 Archive era sub-LUTs). Produced
   in DaVinci. Drop-in: replace each entry in the Ken Burns `GRADES` object with
   `lut3d=file=/data/luts/registerXX.cube`.
3. **Authentic OFL / licensed font files** — Inter Tight (OFL), GT Sectra (licensed, user
   confirmed), Courier Prime (OFL), JetBrains Mono (OFL), Playfair Display (OFL), Space
   Grotesk (OFL). Drop into a mounted volume (e.g. `/data/fonts/`) + update docker-compose.override.yml
   to mount into the n8n container at `/usr/share/fonts/custom/`. Then update `REGISTER_FONT_MAP`
   in caption_burn_service.py to point to the authoritative family names.
