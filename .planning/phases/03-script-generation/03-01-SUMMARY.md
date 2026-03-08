---
phase: 03-script-generation
plan: 01
subsystem: ui
tags: [react, tanstack-query, supabase-realtime, hooks, script-review]

requires:
  - phase: 01-foundation
    provides: Supabase client, Realtime subscription hook, api.js webhookCall, glass-card design system
  - phase: 03-script-generation
    plan: 00
    provides: Wave 0 test stubs for RED phase validation

provides:
  - useScript hook with Realtime subscription for single topic script data
  - useScenes hook with Realtime subscription for scene rows
  - 5 script mutation hooks (generate, approve, reject, refine, regen-prompts)
  - 5 script webhook API helpers in api.js
  - ScorePanel component with 7-dimension bars and collapsible sections
  - PassTracker component for 3-pass generation progress
  - ForcePassBanner component for force-passed script warnings

affects: [03-02, 03-script-generation]

tech-stack:
  added: []
  patterns:
    - "Single-topic fetch pattern with .single() for useScript (vs array fetch in useTopics)"
    - "Mutation hooks parameterized by topicId for script-specific cache keys"
    - "CollapsibleSection reusable pattern within ScorePanel"
    - "scoreColor threshold function: >=8 emerald, >=7 amber, <7 red"

key-files:
  created:
    - dashboard/src/hooks/useScript.js
    - dashboard/src/hooks/useScenes.js
    - dashboard/src/components/script/ScorePanel.jsx
    - dashboard/src/components/script/PassTracker.jsx
    - dashboard/src/components/script/ForcePassBanner.jsx
  modified:
    - dashboard/src/hooks/useScriptMutations.js
    - dashboard/src/lib/api.js
    - dashboard/src/__tests__/useScenes.test.js
    - dashboard/src/__tests__/ScriptActions.test.jsx
    - dashboard/src/__tests__/ScriptGenerate.test.jsx
    - dashboard/src/__tests__/ScorePanel.test.jsx

key-decisions:
  - "ScorePanel uses CollapsibleSection sub-component for avatar, YouTube metadata, and per-pass breakdown"
  - "PassTracker includes combined evaluation as 4th step with separate visual separator"
  - "ForcePassBanner is dismissible via local state (not persisted)"

patterns-established:
  - "Single-topic Realtime subscription with id=eq.{topicId} filter"
  - "Separate query keys for script (['script', topicId]) vs scenes (['scenes', topicId])"
  - "Mutation hooks accept topicId at hook level, not per-call"

requirements-completed: [SCPT-01, SCPT-05, SCPT-09]

duration: 5min
completed: 2026-03-08
---

# Phase 3 Plan 01: Script Data Layer & Score Components Summary

**TanStack Query hooks for script/scenes with Supabase Realtime, 5 mutation hooks, and ScorePanel/PassTracker/ForcePassBanner components following glassmorphism design system**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-08T19:43:55Z
- **Completed:** 2026-03-08T19:48:26Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- 3 data hooks (useScript, useScenes, useScriptMutations) following the exact useTopics pattern with Realtime subscriptions
- 5 API helpers added to api.js for script webhook endpoints
- ScorePanel renders 7 dimension bars with color-coded thresholds, metadata grid, action buttons, and 3 collapsible sections
- PassTracker shows 3-step + combined evaluation progress with animated indicators
- ForcePassBanner provides dismissible amber warning for force-passed scripts
- 30 new tests pass (20 hook tests + 10 component tests), zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create data hooks and API helpers** - `d751ee7` (feat)
2. **Task 2: Create ScorePanel, PassTracker, and ForcePassBanner components** - `bd80aac` (feat)

## Files Created/Modified
- `dashboard/src/hooks/useScript.js` - Fetch single topic with avatars + Realtime subscription
- `dashboard/src/hooks/useScenes.js` - Fetch scenes ordered by scene_number + Realtime subscription
- `dashboard/src/hooks/useScriptMutations.js` - 5 mutation hooks with optimistic updates and rollback
- `dashboard/src/lib/api.js` - 5 script webhook helper exports
- `dashboard/src/components/script/ScorePanel.jsx` - Sticky score panel with 7 bars, metadata, actions, collapsible sections
- `dashboard/src/components/script/PassTracker.jsx` - 3-pass + combined evaluation step tracker
- `dashboard/src/components/script/ForcePassBanner.jsx` - Amber warning banner for force-passed scripts

## Decisions Made
- ScorePanel uses an internal CollapsibleSection sub-component with chevron toggle for avatar, YouTube metadata, and per-pass breakdown sections
- PassTracker treats the combined evaluation as a 4th visual step separated by a border, not inline with the 3 passes
- ForcePassBanner dismissal is local state only (no persistence needed since it reappears on page reload)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All hooks and components ready for Plan 02 to compose the full Script Review page
- useScript + useScenes provide the data layer; ScorePanel + PassTracker + ForcePassBanner provide the UI building blocks
- 25 pre-existing RED phase test failures remain (Phase 2 Wave 0 stubs) - these are expected and will be resolved in their respective plans

---
*Phase: 03-script-generation*
*Completed: 2026-03-08*
