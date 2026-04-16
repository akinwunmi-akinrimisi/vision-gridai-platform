# SOP 03 — TTS Audio Generation

## Purpose
Generate voiceover audio for all scenes using Google Cloud TTS (Chirp 3 HD). Audio duration is the master clock — every downstream visual and assembly step derives timing from FFprobe measurements.

## Trigger
- Script approved at Gate 2
- Webhook: `POST /webhook/production/tts` with `{ topic_id }` (internal, called by WF_SCRIPT_APPROVE)

## Inputs
| Field | Source |
|-------|--------|
| `topic_id` | pipeline chain |
| `scenes[].narration_text` | `scenes` table |

## Outputs (per scene)
- Audio file uploaded to Google Drive (`audio/scene_NNN.mp3`)
- `scenes.audio_duration_ms` — FFprobe-measured duration (THE master clock)
- `scenes.audio_file_drive_id` — Drive file ID
- `scenes.audio_file_url` — Drive download URL
- `scenes.start_time_ms` / `end_time_ms` — cumulative timeline positions
- `scenes.audio_status` = `'uploaded'`

## Workflow
```
WF_TTS_AUDIO
```

## Critical Rules
1. **Audio is the master clock.** Measure duration with FFprobe (`ffprobe -v quiet -show_entries format=duration -of csv=p=0`), NOT file size estimation. Every visual's duration = its audio duration.
2. **Resume/checkpoint** — before processing, query: `SELECT id FROM scenes WHERE topic_id = X AND audio_status = 'pending'`. Only process pending scenes. Skip completed.
3. **Cumulative timeline** — after generating each scene's audio, calculate `start_time_ms = previous_scene.end_time_ms` and `end_time_ms = start_time_ms + audio_duration_ms`.
4. **ALL_CAPS preprocessing** — convert to title case before sending to TTS. Journey-D voice spells ALL_CAPS letter-by-letter.
5. **Journey-D voice does NOT support pitch parameter.** Omit `pitch` from the TTS request or it throws `INVALID_ARGUMENT`.
6. **Write to Supabase after EVERY scene** — not in batch. Dashboard uses Realtime and depends on instant writes.
7. **Exponential backoff** on Google Cloud TTS API via WF_RETRY_WRAPPER (1s->2s->4s->8s).
8. **Google Drive upload** uses OAuth2 credential (`z0gigNHVnhcGz2pD`). Resumable upload for files >5MB.
9. **Log every API call** to `production_logs` with `stage='tts'`, `duration_ms`, `scene_number`.

## Progress Tracking
- Update `topics.audio_progress` = `'done:N/172'` after each scene
- Update `topics.audio_progress` = `'complete'` when all scenes done
- Update `topics.pipeline_stage` = `'tts_complete'` on finish
- Chain to next stage: fire WF_IMAGE_GENERATION

## Error Handling
- TTS API failure on single scene: retry 4x via WF_RETRY_WRAPPER. If still fails, set `scenes.audio_status = 'failed'`.
- 3+ failed scenes: set `topics.supervisor_alerted = true`. Supervisor will auto-retry.
- Network timeout during Drive upload: retry upload only (audio already generated).
- Empty narration text: skip scene, set `scenes.skipped = true`, `skip_reason = 'empty_narration'`.

## Supabase Writes (per scene)
```sql
PATCH scenes SET audio_status='uploaded', audio_duration_ms=X,
  audio_file_drive_id='...', start_time_ms=X, end_time_ms=X
  WHERE id = scene_id
```

## n8n Workflow
- `WF_TTS_AUDIO.json` (ID: `4L2j3aU2WGnfcvvj`)
