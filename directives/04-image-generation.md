# SOP 04 — Image Generation (Fal.ai Seedream 4.0)

## Purpose
Generate photorealistic images for all 172 scenes using Fal.ai Seedream 4.0. Every scene gets an image — there is no I2V or T2V track. Single visual pipeline.

## Trigger
- TTS audio stage complete (`topics.pipeline_stage = 'tts_complete'`)
- Internal chain from WF_TTS_AUDIO on completion

## Inputs
| Field | Source |
|-------|--------|
| `topic_id` | pipeline chain |
| `scenes[].image_prompt` | `scenes` table |
| `projects.style_dna` | `projects` table |
| Composition prefixes | `prompt_templates` table |
| Negative prompt | `prompt_templates` table (universal) |

## Prompt Construction
```
Final prompt = composition_prefix + scene_subject + style_dna
```
- `composition_prefix` — from scene's `composition_prefix` field (8 options)
- `scene_subject` — the `image_prompt` from script generation
- `style_dna` — LOCKED per project, from `projects.style_dna`

## Outputs (per scene)
- Image uploaded to Google Drive (`images/scene_NNN.png`)
- `scenes.image_url` — Fal.ai result URL
- `scenes.image_drive_id` — Drive file ID
- `scenes.image_status` = `'uploaded'`

## API Details
```
Endpoint: POST https://queue.fal.run/fal-ai/bytedance/seedream/v4/text-to-image
Auth: Authorization: Key {{FAL_API_KEY}}
Body: {
  "prompt": "<constructed_prompt>",
  "negative_prompt": "<universal_negative>",
  "image_size": "landscape_16_9",   // 16:9 for long-form
  "num_images": 1
}

Response: async — POST creates task, poll queue.fal.run/.../requests/{id}
```

## Workflow
```
WF_IMAGE_GENERATION → WF_SCENE_IMAGE_PROCESSOR (per scene)
```

## Critical Rules
1. **Style DNA is LOCKED per project.** Generated once during project creation, stored in `projects.style_dna`, appended to EVERY image prompt. Never modify between scenes.
2. **Universal negative prompt on ALL Fal.ai calls.** Stored in `prompt_templates` table or n8n workflow static data. Prevents artifacts, text in images, style drift.
3. **Resume/checkpoint** — only process scenes where `image_status = 'pending'`. Skip completed.
4. **Fal.ai is async** — POST to `queue.fal.run` creates a task, poll `queue.fal.run/.../requests/{id}` for result. Auth: `Authorization: Key {{FAL_API_KEY}}`.
5. **Rate limits** — Images: 2 concurrent / 10s cooldown. Process in controlled batches.
6. **Write to Supabase after EVERY image** — not in batch.
7. **Exponential backoff** via WF_RETRY_WRAPPER for both queue submission and result polling.
8. **Log every API call** to `production_logs` with `stage='image'`, `cost_usd=0.03`, `scene_number`.
9. **Selective color scenes** — if `scenes.selective_color_element IS NOT NULL`, inject selective color instruction into prompt (monochrome + one colored element).
10. **16:9 for long-form, 9:16 (portrait_9_16) for shorts.** Never mix aspect ratios.

## Progress Tracking
- Update `topics.images_progress` = `'done:N/172'` after each scene
- Update `topics.images_progress` = `'complete'` when all done
- Update `topics.pipeline_stage` = `'images_complete'` on finish
- Chain to next stage: fire WF_KEN_BURNS

## Error Handling
- Fal.ai queue timeout (>120s poll): retry submission. Max 4 attempts.
- NSFW/content filter rejection: log, skip scene, mark `image_status = 'failed'`.
- 5+ failed images: alert supervisor.
- Drive upload failure: retry upload only (image already generated).

## Cost
- $0.03/image x 172 scenes = ~$5.16 per video

## n8n Workflows
- `WF_IMAGE_GENERATION.json` (ID: `ScP3yoaeuK7BwpUo`)
- `WF_SCENE_IMAGE_PROCESSOR.json` (ID: `Lik3MUT0E9a6JUum`)
