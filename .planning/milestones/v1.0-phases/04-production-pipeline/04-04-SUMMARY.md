---
phase: 04-production-pipeline
plan: 04
subsystem: api
tags: [n8n, webhook, tts, google-cloud, ffprobe, google-drive, supabase]

# Dependency graph
requires:
  - phase: 04-production-pipeline/04-00
    provides: "Wave 0 test scaffolding and stub files for production components"
provides:
  - "Production webhook API with 11 endpoints (trigger, stop, resume, restart, retry, skip, assemble)"
  - "TTS audio generation workflow with sequential processing and master timeline"
  - "Self-chaining pattern: TTS fires parallel visual generation webhooks on completion"
affects: [04-05, 04-06, 04-07, 04-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "n8n multi-endpoint webhook workflow with per-endpoint auth check"
    - "Sequential TTS with cumulative timeline via workflow static data"
    - "Exponential backoff retry (30s, 60s, 120s) via n8n Wait node"
    - "Supabase state-driven stop/resume pattern"

key-files:
  created:
    - workflows/WF_WEBHOOK_PRODUCTION.json
    - workflows/WF_TTS_AUDIO.json
  modified:
    - workflows/WEBHOOK_ENDPOINTS.md

key-decisions:
  - "Single workflow file for all 11 production endpoints rather than separate files per endpoint"
  - "TTS uses workflow static data ($getWorkflowStaticData) for cumulative timeline tracking across loop iterations"
  - "Resume support: queries last completed scene end_time_ms to continue cumulative timeline"
  - "Respond to webhook immediately then continue processing (non-blocking for dashboard)"

patterns-established:
  - "Production webhook pattern: Webhook Trigger -> Auth Check -> Validate -> Supabase ops -> Log -> Fire next workflow -> Respond"
  - "Sequential processing with stop check: Loop iteration checks topic.status before each scene"
  - "Error recovery: 3 retries with exponential backoff, then mark failed and continue"

requirements-completed: [PROD-01, PROD-02, PROD-03, PROD-09, PROD-10, PROD-11, PROD-12]

# Metrics
duration: 6min
completed: 2026-03-09
---

# Phase 4 Plan 04: Production Webhook API + TTS Audio Workflow Summary

**n8n production webhook API (11 endpoints) and sequential TTS workflow with FFprobe master timeline and parallel visual self-chaining**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-09T03:52:52Z
- **Completed:** 2026-03-09T03:59:15Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Complete production webhook API with all 11 dashboard action endpoints (trigger, batch, stop, resume, restart, retry, skip, edit-retry, assemble)
- TTS audio workflow: sequential scene processing, FFprobe duration measurement, cumulative master timeline, Drive upload, Supabase writes per scene
- Self-chaining: TTS completion fires 3 parallel visual generation webhooks (images, I2V, T2V)
- Stop/resume support in TTS via topic.status check before each scene iteration

## Task Commits

Each task was committed atomically:

1. **Task 1: Build WF_WEBHOOK_PRODUCTION.json** - `0537439` (feat)
2. **Task 2: Build WF_TTS_AUDIO.json** - `8d8a375` (feat)

## Files Created/Modified
- `workflows/WF_WEBHOOK_PRODUCTION.json` - n8n workflow with 11 webhook endpoints for all production dashboard actions (77 nodes)
- `workflows/WF_TTS_AUDIO.json` - n8n workflow for sequential TTS, FFprobe, timeline, Drive upload, Supabase writes (39 nodes)
- `workflows/WEBHOOK_ENDPOINTS.md` - Updated endpoint reference table with 12 new production endpoints

## Decisions Made
- Single WF_WEBHOOK_PRODUCTION.json file contains all 11 endpoints as separate webhook triggers (not 11 separate workflow files) for easier deployment and management
- TTS workflow responds to webhook immediately (non-blocking) then continues processing in the background
- Cumulative timeline uses n8n workflow static data to persist across SplitInBatches iterations
- Resume queries last completed scene's end_time_ms from Supabase to continue timeline from correct position
- Google Drive credential reference uses placeholder ID (google-drive-cred) to be configured per environment

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Workflows reference n8n environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DASHBOARD_API_TOKEN, N8N_WEBHOOK_BASE) and credential references that must be configured in n8n.

## Next Phase Readiness
- Production webhook API ready for dashboard integration (Plan 04-06/04-07)
- TTS workflow ready for deployment to n8n
- Visual generation workflows (images, I2V, T2V) referenced in self-chaining but not yet built (Plan 04-05)
- Captions + assembly workflow referenced but not yet built (Plan 04-05)

---
*Phase: 04-production-pipeline*
*Completed: 2026-03-09*
