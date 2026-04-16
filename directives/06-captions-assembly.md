# SOP 06 — Captions + Transitions + Assembly

## Purpose
Generate kinetic ASS subtitles, apply xfade transitions between scenes, concatenate all clips into a single video, normalize audio, and burn captions via the caption burn service.

## Trigger
- Ken Burns stage complete (`topics.pipeline_stage = 'ken_burns_complete'`)
- Manual: `POST /webhook/production/assemble` with `{ topic_id }`

## Inputs
| Field | Source |
|-------|--------|
| All scene clips (.mp4) | Google Drive / local |
| `scenes[].audio_duration_ms` | `scenes` table |
| `scenes[].transition_to_next` | `scenes` table |
| `scenes[].narration_text` | `scenes` table (for captions) |
| `scenes[].caption_highlight_word` | `scenes` table |

## Pipeline Steps
```
1. Build individual scene clips (video + TTS audio merge)
2. Apply xfade transitions between clips (batched)
3. Concatenate batches
4. Normalize audio (loudnorm -16 LUFS)
5. Generate ASS subtitles (word-by-word pop-in)
6. Burn captions via caption burn service (:9998)
7. Upload final video to Google Drive
```

## Transition System — 5 Types
| Script Value | FFmpeg xfade | Duration |
|-------------|-------------|----------|
| `crossfade` | `fade` | 0.5s |
| `hard_cut` | (plain concat) | 0s |
| `zoom_blur` | `circleopen` | 0.8s |
| `wipe_left` | `wipeleft` | 0.6s |
| `dissolve_slow` | `dissolve` | 1.0s |

**Offset formula:** `offset_N = SUM(durations[0..N-1]) - SUM(transition_durations[0..N-2])`

## Batched Assembly (Memory Safety)
172-scene xfade chains hit FFmpeg memory limits. Assemble in batches:
1. Scenes 1-20 with xfade -> `batch_1.mp4`
2. Scenes 21-40 with xfade -> `batch_2.mp4`
3. ... (15-20 scenes per batch)
4. Final: concat all batches with crossfade between them

## Caption System
- **Whisper forced alignment** generates `word_timings.json` from TTS audio
- `generate_kinetic_ass.py` builds ASS subtitle file with word-by-word pop-in animation
- Emphasis words (from `caption_highlight_word`) rendered in yellow/red
- Center screen positioning, bold sans-serif, strong drop shadow
- **Caption burn service** (:9998) on host runs FFmpeg libass via `docker exec n8n-n8n-1 ffmpeg ...`
- Service timeout: 3 hours. Host-side to bypass n8n task runner OOM.

## Audio Normalization
```bash
ffmpeg -i final.mp4 -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:v copy normalized.mp4
```

## Critical Rules
1. **Audio is the master clock.** Every clip's `-t` flag = `audio_duration_ms / 1000`.
2. **ALL clips must have identical specs before concat** — 30fps, 24kHz (or 48kHz), h264, aac. Mixed specs cause silent truncation. Auto-validate and re-encode mismatches.
3. **3-layer crash prevention in WF_CAPTIONS_ASSEMBLY:**
   - Layer 1: Build Scene Clip verifies fps/sample_rate after generation, auto re-encodes
   - Layer 2: Concat Video scans ALL clips before concat, fixes outliers
   - Layer 3: Post-concat duration check — output must be >95% of expected total, video/audio drift <5s
4. **FFmpeg `-map 0:v -map 1:a` REQUIRED** when merging video clip with TTS audio. Without explicit mapping, FFmpeg may use the video's embedded audio instead of TTS.
5. **Post-concat verification** — `ffprobe` output duration vs sum of scene durations. If drift >5s, log WARNING.
6. **Caption burn runs on host** (not inside n8n) via `docker exec`. Service at `/opt/caption-burn/caption_burn_service.py`, managed by systemd (`caption-burn.service`).
7. **Write assembly status to Supabase** — `topics.assembly_status = 'assembling'` at start, `'complete'` on success.
8. **Drive upload after caption burn** calls `/webhook/drive-upload` for the re-upload step.

## PPS Integration
After assembly, if CF13 (Predictive Performance Score) is active, the PPS is calculated and stored in `topics.predicted_performance_score` before Gate 3.

## Error Handling
- FFmpeg crash during batch assembly: retry that batch. If persistent, reduce batch size.
- Post-concat duration mismatch (>5% short): identify missing/truncated clips, re-encode, re-concat.
- Caption burn service timeout (>3hr): restart service, retry.
- Drive upload failure: retry via WF_RETRY_WRAPPER.

## n8n Workflow
- `WF_CAPTIONS_ASSEMBLY.json` (ID: `Fhdy66BLRh7rAwTi`)
- Caption burn service: `/opt/caption-burn/caption_burn_service.py` (systemd: `caption-burn.service`, port 9998)
