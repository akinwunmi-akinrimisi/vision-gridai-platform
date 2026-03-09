---
phase: 04-production-pipeline
plan: 05
subsystem: api
tags: [n8n, kie-ai, seedream, kling, image-generation, video-generation, sliding-window, supabase]

# Dependency graph
requires:
  - phase: 04-production-pipeline/04-04
    provides: "Production webhook API and TTS workflow with self-chaining to visual generation"
provides:
  - "Seedream 4.5 image generation workflow with sliding window batch (5 concurrent)"
  - "Kling 2.1 I2V generation workflow with sliding window batch (5 concurrent)"
  - "Kling 2.1 T2V generation workflow with sliding window batch (5 concurrent)"
  - "Parallel completion sync pattern: last visual workflow to finish fires assembly"
affects: [04-06, 04-07, 04-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sliding window batch: 5 concurrent Kie.ai API slots with async poll loop"
    - "Parallel completion sync: atomic PATCH claim on assembly_status to prevent race conditions"
    - "Per-task timeout (10min) with retry on timeout for video generation"
    - "I2V null image_url guard: skip scenes where source image failed"

key-files:
  created:
    - workflows/WF_IMAGE_GENERATION.json
    - workflows/WF_I2V_GENERATION.json
    - workflows/WF_T2V_GENERATION.json
  modified: []

key-decisions:
  - "All 3 workflows use n8n Code node with async/await fetch for the entire sliding window loop rather than SplitInBatches"
  - "I2V filters out scenes with null image_url and tracks skipped count separately"
  - "Video generation workflows use 5s poll interval vs 3s for images (video gen takes longer)"
  - "10-minute timeout per video task with automatic retry on timeout"

patterns-established:
  - "Kie.ai sliding window: submit up to 5 tasks, poll all, replace completed with next pending scene"
  - "Parallel completion sync: count uploaded+skipped scenes, if equals total visual scenes atomically claim assembly"
  - "Cost tracking: read-modify-write on topics.cost_breakdown JSONB per asset completion"

requirements-completed: [PROD-04, PROD-05, PROD-06, PROD-09, PROD-10, PROD-11, PROD-12]

# Metrics
duration: 5min
completed: 2026-03-09
---

# Phase 4 Plan 05: Visual Generation Workflows Summary

**3 Kie.ai visual generation n8n workflows (Seedream 4.5 images, Kling 2.1 I2V, Kling 2.1 T2V) with sliding window batching and parallel completion sync**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-09T04:03:04Z
- **Completed:** 2026-03-09T04:07:47Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- WF_IMAGE_GENERATION: Seedream 4.5 image generation with 5-slot sliding window, 3s poll interval, $0.032/image cost tracking
- WF_I2V_GENERATION: Kling 2.1 image-to-video with 5-slot sliding window, requires image_url from prior step, skips scenes with missing images
- WF_T2V_GENERATION: Kling 2.1 text-to-video with 5-slot sliding window, text prompt only (no image dependency)
- All 3 implement parallel completion sync: last workflow to finish atomically claims and fires assembly webhook

## Task Commits

Each task was committed atomically:

1. **Task 1: Build WF_IMAGE_GENERATION.json** - `7c7097c` (feat)
2. **Task 2: Build WF_I2V_GENERATION.json and WF_T2V_GENERATION.json** - `4f04fd3` (feat)

## Files Created/Modified
- `workflows/WF_IMAGE_GENERATION.json` - n8n workflow for Seedream 4.5 image generation (15 nodes, sliding window batch)
- `workflows/WF_I2V_GENERATION.json` - n8n workflow for Kling 2.1 image-to-video generation (15 nodes, requires image_url)
- `workflows/WF_T2V_GENERATION.json` - n8n workflow for Kling 2.1 text-to-video generation (15 nodes, text prompt only)

## Decisions Made
- Used n8n Code node with full async/await sliding window loop rather than SplitInBatches approach for cleaner control flow with async Kie.ai polling
- I2V workflow filters scenes with null image_url and tracks skipped count (scenes where image generation failed are automatically excluded)
- Video workflows (I2V/T2V) use 5-second poll interval and 10-minute per-task timeout vs 3-second poll for images (video generation is significantly slower)
- All workflows store Kie.ai result URLs directly in Supabase (Drive upload integrated into the URL storage for now)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - workflows reference n8n environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, KIE_API_KEY, DASHBOARD_API_TOKEN, N8N_WEBHOOK_BASE) that must be configured in n8n.

## Next Phase Readiness
- All 3 visual generation workflows ready for n8n import/deploy
- Parallel completion sync ensures exactly one workflow fires captions + assembly (Plan 04-06)
- TTS workflow (Plan 04-04) self-chains to these 3 workflows in parallel on completion

---
*Phase: 04-production-pipeline*
*Completed: 2026-03-09*
