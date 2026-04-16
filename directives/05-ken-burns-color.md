# SOP 05 — Ken Burns Motion + Color Grade

## Purpose
Apply FFmpeg zoompan (Ken Burns) motion and color grading to every scene image, producing individual .mp4 clips. Duration of each clip = audio duration from TTS (master clock).

## Trigger
- Image generation complete (`topics.pipeline_stage = 'images_complete'`)
- Internal chain from WF_IMAGE_GENERATION

## Inputs (per scene)
| Field | Source |
|-------|--------|
| Image file | `scenes.image_url` or Drive download |
| `audio_duration_ms` | `scenes` table (master clock) |
| `zoom_direction` | `scenes` table (6 options) |
| `color_mood` | `scenes` table (7 options) |
| `selective_color_element` | `scenes` table (null = apply color grade) |

## Ken Burns — 6 Direction Templates
| Direction | Z Expression | X Expression | Y Expression |
|-----------|-------------|-------------|-------------|
| `zoom_in_center` | `min(zoom+0.001,1.5)` | `iw/2-(iw/zoom/2)` | `ih/2-(ih/zoom/2)` |
| `zoom_out_center` | `if(lte(zoom,1.0),1.5,max(1.001,zoom-0.001))` | `iw/2-(iw/zoom/2)` | `ih/2-(ih/zoom/2)` |
| `pan_left` | `1.2` | `if(lte(on,1),(iw-iw/zoom),max(0,x-1))` | `ih/2-(ih/zoom/2)` |
| `pan_right` | `1.2` | `if(lte(on,1),0,min(iw-iw/zoom,x+1))` | `ih/2-(ih/zoom/2)` |
| `pan_up` | `1.2` | `iw/2-(iw/zoom/2)` | `if(lte(on,1),(ih-ih/zoom),max(0,y-1))` |
| `pan_down` | `1.2` | `iw/2-(iw/zoom/2)` | `if(lte(on,1),0,min(ih-ih/zoom,y+1))` |

**Zoom intensity:** 0.0008-0.001 for long-form (subtle), 0.0015 for short-form (aggressive).

## Color Grade — 7 Mood Profiles
| Mood | FFmpeg Filter Chain |
|------|-------------------|
| `warm_golden` | `eq=brightness=0.06:saturation=1.3,colorbalance=rs=0.15:gs=0.05:bs=-0.1` |
| `cool_blue` | `eq=brightness=0.02:saturation=1.1,colorbalance=rs=-0.1:gs=-0.05:bs=0.2` |
| `neutral` | `eq=brightness=0.03:saturation=1.0` |
| `dramatic` | `eq=contrast=1.3:brightness=-0.05:saturation=1.2,colorbalance=rs=0.05:bs=-0.05` |
| `vintage` | `eq=brightness=0.05:saturation=0.8,colorbalance=rs=0.1:gs=0.08:bs=-0.15` |
| `neon` | `eq=brightness=0.04:saturation=1.5,colorbalance=rs=0.05:gs=-0.1:bs=0.15` |
| `desaturated` | `eq=brightness=0.02:saturation=0.6` |

## FFmpeg Command Template
```bash
FRAMES=$((duration_seconds * 30))
ffmpeg -loop 1 -i {INPUT}.png -vf "
  scale=8000:-1,
  zoompan=z='{Z}':x='{X}':y='{Y}':d={FRAMES}:s=1920x1080:fps=30,
  {COLOR_FILTERS}
" -t {DURATION} -c:v libx264 -pix_fmt yuv420p -preset medium {OUTPUT}.mp4
```

## Workflow
```
WF_KEN_BURNS
```

## Critical Rules
1. **Audio is the master clock.** Clip duration (`-t`) = `scenes.audio_duration_ms / 1000`. No rounding errors allowed.
2. **FRAMES = duration_seconds x 30.** FPS must be 30 for all clips. Mixed fps causes silent truncation at concat.
3. **Selective color scenes SKIP color grading** — if `selective_color_element IS NOT NULL`, omit the color filter chain entirely.
4. **Resume/checkpoint** — only process scenes where `clip_status = 'pending'`. Skip completed.
5. **Process in batches of 20** to manage VPS memory.
6. **Output must be 30fps, h264, yuv420p** — homogeneous specs required for downstream concat.
7. **Write to Supabase after EVERY clip** — update `clip_status = 'uploaded'`, store Drive ID.
8. **Log to production_logs** with `stage='ken_burns'`, `scene_number`, `duration_ms`.

## Progress Tracking
- Update `topics.pipeline_stage` = `'ken_burns_complete'` on finish
- Chain to next stage: fire WF_CAPTIONS_ASSEMBLY

## Error Handling
- FFmpeg crash on single scene: retry once. If still fails, mark `clip_status = 'failed'`.
- OOM on batch: reduce batch size to 10, retry.
- Mismatched fps detected: auto re-encode to 30fps before proceeding.
- 5+ failed clips: alert supervisor.

## Cost
- $0.00 (FFmpeg only, runs on VPS)

## n8n Workflow
- `WF_KEN_BURNS.json`
