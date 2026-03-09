---
phase: 04-production-pipeline
plan: 06
subsystem: api
tags: [n8n, ffmpeg, captions, srt, assembly, google-drive, supabase]

# Dependency graph
requires:
  - phase: 04-production-pipeline/04-04
    provides: "Production webhook API and TTS audio workflow with master timeline"
provides:
  - "SRT caption generation from FFprobe-measured scene timestamps"
  - "Per-scene FFmpeg clip building (static image, video loop/trim, skipped black frame)"
  - "Final video concat with -c copy (no re-encoding) and audio normalization"
  - "Google Drive upload for final video and SRT file"
  - "Queue auto-advance to next queued topic on completion"
affects: [04-07, 04-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SplitInBatches loop for sequential scene clip building with per-scene FFmpeg commands"
    - "Workflow static data for tracking clip success/failure counts across loop iterations"
    - "Three FFmpeg clip types: static image display, video loop/trim, black frame with text overlay"
    - "Two-step assembly: build individual clips then concat -c copy"

key-files:
  created:
    - workflows/WF_CAPTIONS_ASSEMBLY.json
  modified: []

key-decisions:
  - "SRT includes skipped scenes with '[Scene skipped]' marker text for timeline continuity"
  - "Node.js fs.writeFileSync used for SRT writing instead of shell echo to handle special characters safely"
  - "Concat list dynamically checks which clips exist on disk, skipping failed clips that were never built"
  - "Google Drive credential reference uses placeholder ID (google-drive-cred) matching TTS workflow pattern"
  - "Cleanup only runs after successful upload path; temp files preserved on failure for debugging"

patterns-established:
  - "Assembly workflow pattern: SRT gen -> asset download -> per-scene clip build -> concat -> normalize -> upload -> status update -> queue advance -> cleanup"
  - "Per-scene clip determination: Code node builds FFmpeg command string based on visual_type and skipped status"

requirements-completed: [PROD-07, PROD-08, PROD-09, PROD-11]

# Metrics
duration: 4min
completed: 2026-03-09
---

# Phase 4 Plan 06: Captions + FFmpeg Assembly Workflow Summary

**SRT caption generation and FFmpeg video assembly with per-scene clip building, concat -c copy, loudnorm audio normalization, and Google Drive upload**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-09T04:03:05Z
- **Completed:** 2026-03-09T04:06:42Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Complete n8n workflow (42 nodes) for the final production stage: captions + assembly
- SRT generation from FFprobe-measured scene timestamps (start_time_ms/end_time_ms) with skipped scene markers
- Per-scene FFmpeg clip building with three visual types: static image (loop 1), video (stream_loop or trim), skipped (black frame + drawtext)
- Final video assembly via concat -c copy (no re-encoding) with loudnorm audio normalization (I=-16, TP=-1.5, LRA=11)
- Queue auto-advance fires production/trigger for next queued topic on completion

## Task Commits

Each task was committed atomically:

1. **Task 1: Build WF_CAPTIONS_ASSEMBLY.json** - `c9959f1` (feat)

## Files Created/Modified
- `workflows/WF_CAPTIONS_ASSEMBLY.json` - n8n workflow with 42 nodes: webhook trigger, auth, SRT generation, asset download, per-scene FFmpeg clip building loop, concat, audio normalization, Drive upload (video + SRT), status updates, queue auto-advance, temp cleanup

## Decisions Made
- SRT captions include skipped scenes with "[Scene skipped]" text to maintain timeline continuity for YouTube caption upload
- Used Node.js fs module for SRT file writing instead of shell echo to handle special characters in narration text
- Concat list generation checks file existence on disk, automatically excluding failed clips that were never built
- Video scene loop threshold at 5000ms (5 seconds) per CONTEXT.md specification
- Both video and SRT uploaded to Google Drive in parallel paths after normalization succeeds
- Error paths for concat and normalization failures log to production_log and mark topic as failed with error details

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - workflow references n8n environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DASHBOARD_API_TOKEN, N8N_WEBHOOK_BASE) and Google Drive credential reference that must be configured in n8n.

## Next Phase Readiness
- Assembly workflow ready for deployment to n8n
- Integrates with TTS workflow (Plan 04-04) and visual generation workflows (Plan 04-05) via webhook chaining
- Dashboard Production Monitor (Plan 04-07) can subscribe to assembly status changes
- Supervisor agent (Plan 04-08) can detect stuck assembly via last_status_change

---
*Phase: 04-production-pipeline*
*Completed: 2026-03-09*
