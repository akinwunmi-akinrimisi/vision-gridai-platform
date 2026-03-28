# Resume/Checkpoint Pattern

Every production workflow MUST check scene status before processing.
If a workflow crashes at scene N, it resumes from N+1 on restart.

## SQL Templates (use in n8n HTTP Request nodes against Supabase REST API)

### TTS Audio (only process scenes without audio)
```
GET /rest/v1/scenes?topic_id=eq.{TOPIC_ID}&audio_status=eq.pending&order=scene_number.asc
```

### Image Generation (only process scenes without images)
```
GET /rest/v1/scenes?topic_id=eq.{TOPIC_ID}&image_status=eq.pending&select=id,scene_number,image_prompt,composition_prefix,selective_color_element&order=scene_number.asc
```

### Ken Burns (only process scenes without clips, that have images)
```
GET /rest/v1/scenes?topic_id=eq.{TOPIC_ID}&clip_status=eq.pending&image_url=not.is.null&select=id,scene_number,zoom_direction,color_mood,selective_color_element&order=scene_number.asc
```

### Captions (only process scenes with audio + clips)
```
GET /rest/v1/scenes?topic_id=eq.{TOPIC_ID}&audio_status=eq.generated&clip_status=neq.pending&select=id,scene_number,narration_text,caption_highlight_word&order=scene_number.asc
```

## Pipeline Stage Tracking

After each stage completes for ALL scenes, update the topic:
```
PATCH /rest/v1/topics?id=eq.{TOPIC_ID}
Body: { "pipeline_stage": "{STAGE}" }
```

Stages: `pending` → `scripting` → `tts` → `images` → `ken_burns` → `captions` → `assembly` → `render` → `complete` → `failed`

## n8n Implementation Pattern

1. HTTP Request node: GET pending scenes (query above)
2. IF node: check if array is empty → if yes, skip to next stage
3. SplitInBatches node: process N scenes at a time
4. For each scene: do work → update status → log to production_logs
5. After loop: update topic pipeline_stage

## Key Rule

**NEVER re-process a scene that already has a completed status.** The query filters ensure this. If you add a new stage, add a corresponding status field to the scenes table.
