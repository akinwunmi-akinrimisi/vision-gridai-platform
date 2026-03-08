---
phase: 03-script-generation
plan: 03
subsystem: api
tags: [n8n, webhook, supabase, script-generation, gate-2]

# Dependency graph
requires:
  - phase: 03-script-generation/03-00
    provides: "Supabase schema awareness (topics, scenes, prompt_configs tables)"
provides:
  - "5 n8n webhook stub specifications for script pipeline backend"
  - "Full 3-pass generation contract with per-pass scoring"
  - "Gate 2 approval/rejection/refinement webhook contracts"
  - "Batch image prompt regeneration webhook contract"
affects: [04-production, dashboard-api-layer, n8n-workflow-implementation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "n8n webhook stub JSON format for documenting backend contracts"
    - "Async webhook pattern: immediate response + Supabase Realtime for progress"
    - "Sync webhook pattern: immediate response with result data"

key-files:
  created:
    - "dashboard/src/n8n-stubs/script-generate.json"
    - "dashboard/src/n8n-stubs/script-approve.json"
    - "dashboard/src/n8n-stubs/script-reject.json"
    - "dashboard/src/n8n-stubs/script-refine.json"
    - "dashboard/src/n8n-stubs/script-regen-prompts.json"
  modified: []

key-decisions:
  - "Script refine targets weakest pass by score, not user-selected pass"
  - "Prompt regen batches scenes into groups of 10-20 per Claude call for efficiency"
  - "Partial success acceptable for prompt regeneration (individual scene failures logged, not blocking)"

patterns-established:
  - "Async webhook stubs: webhook.immediate_response + async_steps array + error_handling + supabase_writes_summary + realtime_events"
  - "Sync webhook stubs: webhook.response + sync_steps array + error_handling + supabase_writes_summary"

requirements-completed: [SCPT-01, SCPT-02, SCPT-03, SCPT-04, SCPT-05, SCPT-06, SCPT-07, SCPT-08, SCPT-09]

# Metrics
duration: 3min
completed: 2026-03-08
---

# Phase 3 Plan 03: n8n Webhook Stubs Summary

**5 n8n webhook stub specs defining the full script pipeline backend contract: 3-pass generation with per-pass scoring, Gate 2 approval/rejection, targeted refinement, and batch prompt regeneration**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-08T20:03:04Z
- **Completed:** 2026-03-08T20:06:14Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Complete 7-step async pipeline specification for 3-pass script generation with per-pass scoring thresholds
- Gate 2 approval and rejection webhook contracts with correct Supabase write patterns
- Script refinement spec that targets the weakest pass and re-evaluates the combined score
- Batch image prompt regeneration spec for the Script Review toolbar action

## Task Commits

Each task was committed atomically:

1. **Task 1: Create n8n webhook stub for script/generate** - `095758e` (feat)
2. **Task 2: Create n8n webhook stubs for approve, reject, refine, regen-prompts** - `5b50e23` (feat)

## Files Created/Modified
- `dashboard/src/n8n-stubs/script-generate.json` - Full 7-step 3-pass generation pipeline with scoring, visual assignment, and scene insertion
- `dashboard/src/n8n-stubs/script-approve.json` - Sync Gate 2 approval, sets status='approved'
- `dashboard/src/n8n-stubs/script-reject.json` - Sync rejection with optional feedback
- `dashboard/src/n8n-stubs/script-refine.json` - Async 8-step refinement targeting weakest pass
- `dashboard/src/n8n-stubs/script-regen-prompts.json` - Async batch image prompt regeneration

## Decisions Made
- Script refinement automatically identifies the weakest pass by comparing per-pass scores rather than requiring user to select which pass to regenerate
- Prompt regeneration uses batching (10-20 scenes per Claude call) for efficiency rather than one-by-one
- Partial success is acceptable for prompt regen — failed scenes keep original prompts, successes are persisted

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 5 webhook stubs define the exact contracts the dashboard is built against
- n8n workflow implementation can proceed using these stubs as specifications
- Dashboard Script Review page can call these endpoints with confidence in request/response shapes

## Self-Check: PASSED

- All 5 stub files exist on disk
- Commit `095758e` found (Task 1)
- Commit `5b50e23` found (Task 2)

---
*Phase: 03-script-generation*
*Completed: 2026-03-08*
