# Vision GridAI — Production Cost Calculator + Hybrid Scene Pipeline

## Claude Code Prompt

Paste this into Claude Code to build the feature:

---

```
Read /mnt/skills/public/frontend-design/SKILL.md before creating any React component.
Use Superpowers /new-feature flow. Use gstack /careful for Supabase migrations. Use gstack /qa after each deliverable.
Model for all Claude API calls: claude-opus-4-6

---

## CONTEXT — What You Are Building

You are building a **Production Cost Calculator** and a **Hybrid Scene Pipeline** for the Vision GridAI platform. This is a major architectural change to how videos are produced.

### What Changed (Old → New)

OLD PIPELINE (being replaced):
- 3 media types: static_image ($0.03, Seedream 4.0), i2v ($0.50/clip, Wan 2.5), t2v ($0.50/clip, Wan 2.5)
- Scene segmentation assigns each scene ONE type
- Images, I2V, and T2V run in parallel
- 75 static + 25 I2V + 72 T2V = ~$50.75 per video

NEW PIPELINE (what you are building):
- 2 models only: Seedream 4.5 ($0.04/image) + Seedance 2.0 Fast I2V ($0.2419/second at 720p)
- T2V is ELIMINATED entirely
- ALL 172 scenes get an image first (Seedream 4.5)
- A user-selected percentage of scenes ALSO get a 10-second I2V clip (Seedance 2.0 Fast)
- "Video" scenes are HYBRID: Ken Burns on static image + 10-second I2V clip + Ken Burns, within a single 42-second scene
- Production is SEQUENTIAL: all images generated first → then I2V on selected images
- I2V output is 720p → upscaled to 1080p via FFmpeg for final assembly

### Scene Structure (Critical — Read Carefully)

Each scene is approximately **42 seconds** of narration.

A **pure image scene** (the majority):
- Single Seedream 4.5 image with FFmpeg Ken Burns zoompan for 42 seconds
- Cost: $0.04

A **hybrid video scene** (the selected percentage):
- The SAME Seedream 4.5 image is used for:
  1. Ken Burns zoompan for the NON-video portion (e.g., seconds 0-18 and 28-42)
  2. Fed into Seedance 2.0 Fast as the starting frame for a 10-second I2V clip
  3. The I2V clip is placed at the optimal dramatic moment within the 42-second scene
- Claude Opus 4.6 analyzes the narration and decides WHERE the 10-second I2V clip goes (e.g., at the dramatic reveal, not at the beginning)
- Transitions: 0.5-second crossfade dissolve between Ken Burns ↔ I2V clip
- If Seedance generates a clip slightly longer than needed: speed up (setpts) to fit the target window
- Cost: $0.04 (image) + $2.42 (10s × $0.2419) = $2.46 per hybrid scene

### Pricing Summary

| Component | Model | Unit Price |
|-----------|-------|-----------|
| Image (all scenes) | Seedream 4.5 | $0.04/image |
| I2V clip (selected scenes) | Seedance 2.0 Fast | $0.2419/second at 720p |
| I2V clip duration | Fixed | 10 seconds per clip |
| I2V clip cost | Calculated | $2.419 per clip |
| Ken Burns | FFmpeg zoompan | $0.00 (free) |
| Upscale 720p→1080p | FFmpeg scale | $0.00 (free) |

### Cost Per Ratio Option (172 scenes)

| Option | Image Scenes | Video Scenes | Image Cost | Video Cost | Total |
|--------|-------------|-------------|-----------|-----------|-------|
| 100% images / 0% video | 172 | 0 | $6.88 | $0.00 | **$6.88** |
| 95% images / 5% video | 172 | 9 | $6.88 | $21.77 | **$28.65** |
| 90% images / 10% video | 172 | 17 | $6.88 | $41.12 | **$48.00** |
| 85% images / 15% video | 172 | 26 | $6.88 | $62.89 | **$69.77** |

Note: ALL 172 scenes get images regardless. Video cost is ADDITIONAL.

---

## DELIVERABLE 1: Supabase Schema Changes

File: supabase/migrations/009_hybrid_scene_pipeline.sql

```sql
-- 1. Add cost calculator selection to topics table
ALTER TABLE topics ADD COLUMN video_ratio TEXT DEFAULT '100_0'
  CHECK (video_ratio IN ('100_0', '95_5', '90_10', '85_15'));
ALTER TABLE topics ADD COLUMN estimated_image_cost NUMERIC(10,2);
ALTER TABLE topics ADD COLUMN estimated_video_cost NUMERIC(10,2);
ALTER TABLE topics ADD COLUMN estimated_total_media_cost NUMERIC(10,2);
ALTER TABLE topics ADD COLUMN cost_option_selected_at TIMESTAMPTZ;

-- 2. Update scenes table for hybrid pipeline
-- Remove old visual_type enum values, replace with new system
ALTER TABLE scenes ADD COLUMN has_video BOOLEAN DEFAULT false;
ALTER TABLE scenes ADD COLUMN video_placement_start_ms INTEGER; -- where I2V starts within scene
ALTER TABLE scenes ADD COLUMN video_placement_end_ms INTEGER;   -- where I2V ends within scene
ALTER TABLE scenes ADD COLUMN video_clip_url TEXT;               -- Seedance output URL
ALTER TABLE scenes ADD COLUMN video_clip_duration_ms INTEGER;    -- actual Seedance output duration
ALTER TABLE scenes ADD COLUMN video_upscaled_url TEXT;           -- after FFmpeg 720p→1080p
ALTER TABLE scenes ADD COLUMN scene_classification TEXT          -- claude's reasoning
  CHECK (scene_classification IN ('motion_required', 'motion_beneficial', 'static_optimal'));
ALTER TABLE scenes ADD COLUMN classification_reasoning TEXT;     -- 1-sentence explanation

-- 3. Store the cost calculator snapshot for audit
CREATE TABLE cost_calculator_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_count INTEGER NOT NULL,
  options JSONB NOT NULL, -- array of 4 options with costs
  selected_option TEXT NOT NULL, -- '100_0', '95_5', '90_10', '85_15'
  scene_classifications JSONB, -- claude's per-scene classification results
  selected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## DELIVERABLE 2: Cost Calculator Dashboard Panel

Location: New section on the dashboard that appears AFTER scene segmentation (Stage 7) completes and BEFORE production starts.

### Where It Appears

After the user approves the script at Gate 2 and scene segmentation runs (Stage 7), the pipeline currently proceeds directly to TTS audio (Stage 8). 

INSERT a new step between segmentation and production:
- Stage 7: Scene Segmentation (existing)
- **Stage 7.5: Cost Calculator (NEW)** — pipeline PAUSES here until user selects a ratio
- Stage 8: TTS Audio (existing, proceeds after selection)

### UI Component

Create: src/components/production/CostCalculator.jsx

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 💰 Production Cost Calculator                                               │
│                                                                             │
│ {scene_count} scenes segmented. Select your image-to-video ratio:           │
│                                                                             │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐│
│ │ 🟢 100% / 0%    │ │ 🔵 95% / 5%    │ │ 🟡 90% / 10%   │ │ 🟠 85%/15% ││
│ │                 │ │                 │ │                 │ │             ││
│ │ 172 images      │ │ 172 images      │ │ 172 images      │ │ 172 images  ││
│ │ 0 video clips   │ │ 9 video clips   │ │ 17 video clips  │ │ 26 clips   ││
│ │                 │ │                 │ │                 │ │             ││
│ │ Images: $6.88   │ │ Images: $6.88   │ │ Images: $6.88   │ │ Img: $6.88 ││
│ │ Videos: $0.00   │ │ Videos: $21.77  │ │ Videos: $41.12  │ │ Vid: $62.89││
│ │ ────────────    │ │ ────────────    │ │ ────────────    │ │ ──────────  ││
│ │ TOTAL: $6.88    │ │ TOTAL: $28.65   │ │ TOTAL: $48.00   │ │ TOT: $69.77││
│ │                 │ │                 │ │                 │ │             ││
│ │ [Select]        │ │ [Select]        │ │ [Select]        │ │ [Select]   ││
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────┘│
│                                                                             │
│ Models: Seedream 4.5 ($0.04/img) + Seedance 2.0 Fast ($0.2419/s × 10s)    │
│ All scenes get images. Video scenes are hybrid (Ken Burns + 10s I2V clip). │
│                                                                             │
│ ⚠️ Pipeline pauses here until you select an option.                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Behavior

1. Cards are radio-selectable (only one active at a time). Selected card gets accent-blue border + checkmark.
2. [Select] button on the active card becomes [Confirm & Start Production].
3. On confirm:
   a. UPDATE topics SET video_ratio, estimated_image_cost, estimated_video_cost, estimated_total_media_cost, cost_option_selected_at
   b. INSERT into cost_calculator_snapshots
   c. Trigger WF_SCENE_CLASSIFY (Deliverable 3) to determine which specific scenes get video
   d. After classification: trigger WF_TTS_AUDIO (Stage 8) to resume normal pipeline
4. Dynamic calculation: if scene_count differs from 172 (varies by topic), recalculate all 4 options dynamically:
   - video_count = ROUND(scene_count × ratio_percentage)
   - image_cost = scene_count × 0.04
   - video_cost = video_count × 2.419
   - total = image_cost + video_cost

---

## DELIVERABLE 3: Scene Classification Workflow

Create n8n workflow: WF_SCENE_CLASSIFY

Trigger: POST /webhook/scene-classify with { topic_id, video_ratio }
Runs AFTER user selects cost option, BEFORE production.

### Steps

1. **Fetch data:**
   - Query scenes WHERE topic_id ORDER BY scene_number → get all scenes with narration_text, image_prompt, duration_ms
   - Calculate video_count from ratio (e.g., 10% of 172 = 17)

2. **Claude Opus 4.6 classification (batched, 30 scenes per batch):**

   System prompt:
   ```
   You are a cinematic scene analyst for AI-generated documentary videos. Each scene is approximately 42 seconds long. Your job is to classify which scenes would benefit most from a 10-second image-to-video (I2V) animation clip, and which should remain as static images with Ken Burns pan/zoom.

   VIDEO scenes should depict: physical motion (vehicles, people moving, water flowing), transformation (before/after, growth, change over time), dramatic reveals, action sequences, or any content where stillness would feel unnatural.

   STATIC scenes should depict: data/statistics, conceptual illustrations, objects at rest, talking points, abstract ideas, portraits, landscapes without motion, or any content where a well-composed static image with Ken Burns is perceptually equivalent to video.

   You must select EXACTLY {{video_count}} scenes for video treatment from the full set. Prioritize scenes where motion IS the content, not just decoration.
   ```

   User prompt per batch:
   ```
   SCENE CLASSIFICATION — Batch {{batch_number}}/{{total_batches}}

   Select the best scenes for 10-second I2V video treatment.
   Total video slots remaining: {{remaining_slots}}

   SCENES:
   {{#each scenes}}
   Scene {{this.scene_number}} ({{this.duration_ms}}ms):
     Narration: "{{this.narration_text}}"
     Image prompt: "{{this.image_prompt}}"
     Chapter: {{this.chapter_name}}
   {{/each}}

   For EACH scene, classify:
   {
     "scene_number": N,
     "classification": "motion_required|motion_beneficial|static_optimal",
     "reasoning": "1 sentence",
     "recommended_for_video": true/false
   }

   Remember: you must recommend exactly {{target_for_this_batch}} scenes for video in this batch.
   ```

3. **Rank and select:**
   - Collect all classifications across batches
   - Sort by priority: motion_required first, then motion_beneficial
   - Select top N scenes (where N = video_count from ratio)
   - Ensure video scenes are distributed across chapters (not all clustered in one chapter)

4. **Video placement within each selected scene:**

   For each scene classified as video, make a SECOND Claude Opus 4.6 call:

   ```
   SCENE {{scene_number}} — VIDEO PLACEMENT

   This scene is {{duration_ms}}ms long. A 10-second (10000ms) I2V clip will be placed within it.
   The remaining time is filled with Ken Burns on the static image.
   Transitions are 0.5-second crossfade dissolves.

   NARRATION:
   "{{full_narration_text}}"

   Analyze the narration and determine the OPTIMAL 10-second window for the I2V clip.
   Place it where the narration describes action, reveals, or dramatic moments.
   Do NOT place it during data recitation, list items, or transitional phrases.

   Respond in JSON:
   {
     "video_start_ms": <integer>,
     "video_end_ms": <integer>,
     "reasoning": "The narration describes [X] at this point, which benefits from motion."
   }

   CONSTRAINTS:
   - video_end_ms - video_start_ms must equal 10000 (10 seconds)
   - video_start_ms must be >= 500 (room for opening crossfade)
   - video_end_ms must be <= duration_ms - 500 (room for closing crossfade)
   - If the scene is shorter than 11000ms, the video fills the entire scene (no Ken Burns portions)
   ```

5. **Write results:**
   - UPDATE scenes SET has_video, video_placement_start_ms, video_placement_end_ms, scene_classification, classification_reasoning
   - INSERT scene_classifications into cost_calculator_snapshots
   - Log: "Scene classification complete: {video_count} scenes assigned video treatment"

---

## DELIVERABLE 4: Modified Production Pipeline

### Stage 8: TTS Audio (unchanged)
Proceeds as before. All 172 scenes get TTS audio.

### Stage 9: ALL Images Generated (modified)
- Previously: only static_image scenes got images
- NOW: ALL 172 scenes get Seedream 4.5 images, regardless of has_video flag
- Endpoint: fal-ai/bytedance/seedream/v4.5/text-to-image
- Price: $0.04/image
- Aspect ratio: 16:9 for long-form, 9:16 for shorts
- Store image URL in scenes.image_url (existing column)

### Stage 10: I2V Video Generation (modified — replaces old I2V + T2V stages)
- Only runs for scenes WHERE has_video = true
- Sequential processing (not parallel)
- For each video scene:
  1. Take the image from Stage 9 (scenes.image_url) as the input image
  2. POST to Seedance 2.0 Fast I2V:
     - Endpoint: bytedance/seedance-2.0/fast/image-to-video
     - image_url: scenes.image_url
     - duration: "10" (fixed 10 seconds)
     - resolution: "720p"
     - aspect_ratio: "16:9"
     - prompt: scenes.image_prompt (motion-enhanced version — see step 3)
  3. Motion prompt enhancement: before sending to Seedance, Claude Opus 4.6 rewrites the static image_prompt into a MOTION prompt:
     ```
     Original image prompt: "A gleaming Amex Platinum card on a marble countertop"
     Motion prompt: "A gleaming Amex Platinum card slowly rotating on a marble countertop, light reflections shifting across the metallic surface, subtle camera push-in"
     ```
  4. Store result: UPDATE scenes SET video_clip_url, video_clip_duration_ms
  5. Upscale 720p → 1080p:
     ```bash
     ffmpeg -i input_720p.mp4 -vf "scale=1920:1080:flags=lanczos" -c:a copy output_1080p.mp4
     ```
  6. Store: UPDATE scenes SET video_upscaled_url

### Stage 11: Assembly (modified)
For each scene in sequence:

**If has_video = false (pure image scene):**
- FFmpeg zoompan on image for full scene duration (unchanged from current behavior)

**If has_video = true (hybrid scene):**
- Split into 3 segments:
  a. **Pre-video Ken Burns**: zoompan on image from 0 to video_placement_start_ms
  b. **I2V clip**: video_upscaled_url, speed-adjusted if duration doesn't match exactly:
     ```bash
     # If Seedance output is 10.5s but window is 10.0s:
     ffmpeg -i clip.mp4 -filter:v "setpts=PTS*(10000/10500)" -af "atempo=1.05" adjusted.mp4
     ```
     NOTE: discard Seedance audio — we use our own TTS narration
  c. **Post-video Ken Burns**: zoompan on image from video_placement_end_ms to scene_end
- Join with 0.5-second crossfade dissolves:
  ```bash
  ffmpeg -i pre_kb.mp4 -i i2v_clip.mp4 -i post_kb.mp4 \
    -filter_complex \
    "[0][1]xfade=transition=fade:duration=0.5:offset={pre_duration-0.5}[v01]; \
     [v01][2]xfade=transition=fade:duration=0.5:offset={pre_duration+clip_duration-1.0}[vout]" \
    -map "[vout]" scene_assembled.mp4
  ```

Then concatenate all scenes + overlay TTS audio + captions as before.

---

## DELIVERABLE 5: Update Existing References

1. **VisionGridAI_Platform_Agent.md**: Update Stage 9-11 descriptions. Remove T2V references. Add Stage 7.5 Cost Calculator.
2. **pipeline-stages.md**: Update the 14-stage table. T2V stage removed. I2V stage modified. Cost Calculator added.
3. **n8n credential**: Add new Fal.ai credential entry for Seedance 2.0 endpoints (or update existing Fal.ai HTTP Header Auth).
4. **Settings page**: Update Production Config → Model dropdowns:
   - Image model: "Seedream 4.5 ($0.04/img)" (was Seedream 4.0)
   - Video model: "Seedance 2.0 Fast ($0.2419/s)" (was Wan 2.5)
   - Remove T2V model option entirely
5. **Cost tracking**: Update per-scene cost calculation:
   - image scene: $0.04
   - hybrid video scene: $0.04 + $2.419 = $2.459
   - Ken Burns: $0.00

---

## DELIVERABLE 6: Update CF18 (Cost Optimizer) Relationship

The Cost Optimizer (CF18, documented in prompts/cost_optimizer.md) previously analyzed the 3-type scene allocation (static/i2v/t2v). 

Update CF18 to sit DOWNSTREAM of this Cost Calculator:
- Cost Calculator (this feature): user picks ratio → Claude classifies scenes → has_video set
- Cost Optimizer (CF18): reviews Claude's classifications → suggests FURTHER downgrades (e.g., "Scene 47 was classified as motion_beneficial but the narration is just listing numbers — downgrade to static")
- CF18 can only REMOVE video from scenes (downgrade), never ADD video (that would exceed the user's selected ratio)

Do NOT modify the CF18 prompt files now. Just ensure the schema is compatible.

---

## VERIFICATION CHECKLIST (gstack /qa)

After building, verify:
- [ ] Cost Calculator panel appears after scene segmentation, before production
- [ ] All 4 ratio options show correct calculated costs
- [ ] Pipeline PAUSES until user selects an option
- [ ] After selection, scene classification runs and assigns correct number of video scenes
- [ ] Video scenes are distributed across chapters (not clustered)
- [ ] Each video scene has video_placement_start_ms and video_placement_end_ms set
- [ ] ALL 172 scenes get Seedream 4.5 images (not just static scenes)
- [ ] Only has_video=true scenes go through Seedance 2.0 Fast
- [ ] I2V clips are upscaled 720p → 1080p via FFmpeg
- [ ] Assembly handles hybrid scenes correctly (Ken Burns → crossfade → I2V → crossfade → Ken Burns)
- [ ] Seedance audio is DISCARDED (our TTS is the audio source)
- [ ] I2V clips that are slightly long are speed-adjusted to fit
- [ ] Total cost displayed matches: (scene_count × $0.04) + (video_count × $2.419)
- [ ] No hardcoded API keys — use n8n credential store
- [ ] All Claude API calls use model: claude-opus-4-6
- [ ] T2V references removed from codebase (Wan 2.5 no longer used)
- [ ] Seedream 4.0 references replaced with Seedream 4.5
```

---
