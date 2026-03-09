---
phase: 04-production-pipeline
plan: 03
subsystem: ui
tags: [react, tailwind, pipeline-table, status-badges, project-dashboard, topic-card, realtime]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Supabase client, useRealtimeSubscription hook, glass-card/badge CSS classes, SkeletonLoader"
  - phase: 04-production-pipeline
    provides: "04-01 useTopics, useProjectMetrics hooks; 04-00 Wave 0 test scaffolds"
provides:
  - "PipelineTable component with live topic status, progress bars, scores, views, revenue"
  - "Rewritten ProjectDashboard page with real metrics from useProjectMetrics + PipelineTable"
  - "TopicCard production status badges, mini progress bar, and Start Production button"
affects: [04-04, 04-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [responsive-table-with-overflow-scroll, progress-string-parsing, production-status-badge-system]

key-files:
  created: []
  modified:
    - dashboard/src/components/dashboard/PipelineTable.jsx
    - dashboard/src/pages/ProjectDashboard.jsx
    - dashboard/src/components/topics/TopicCard.jsx
    - dashboard/src/__tests__/PipelineTable.test.jsx

key-decisions:
  - "Single responsive table with overflow-x-auto instead of dual desktop/mobile layouts to avoid DOM duplication in tests"
  - "Production progress computed as weighted average: audio 20%, images 20%, i2v 15%, t2v 15%, assembly 30%"

patterns-established:
  - "Status badge config object: STATUS_CONFIG mapping status string to { label, cls } for consistent badge rendering"
  - "Progress string parser: parseProgress handles 'done:X/Y', 'complete', and 'pending' formats"

requirements-completed: [PROD-14]

# Metrics
duration: 5min
completed: 2026-03-09
---

# Phase 04 Plan 03: Pipeline Table & TopicCard Production Status Summary

**Live pipeline status table on Project Dashboard with color-coded status badges, progress bars, and TopicCard production indicators with Start Production navigation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-09T03:53:04Z
- **Completed:** 2026-03-09T03:58:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- PipelineTable component renders all topics with #, title, angle, color-coded status badges, progress bars, quality scores, views, and revenue
- ProjectDashboard fully rewritten with real metrics from useProjectMetrics hook and PipelineTable (no hardcoded values)
- TopicCard extended with production status badges, mini progress bar, and Start Production button for script-approved topics

## Task Commits

Each task was committed atomically:

1. **Task 1: Build PipelineTable component + rewrite ProjectDashboard** - `e3ae92d` (feat)
2. **Task 2: Update TopicCard with production status badges** - `da73d9c` (feat)

## Files Created/Modified
- `dashboard/src/components/dashboard/PipelineTable.jsx` - Live pipeline status table with Realtime subscription, status badges, progress bars
- `dashboard/src/pages/ProjectDashboard.jsx` - Full rewrite with useProjectMetrics and useTopics hooks for real data
- `dashboard/src/components/topics/TopicCard.jsx` - Added production badges, mini progress bar, Start Production button
- `dashboard/src/__tests__/PipelineTable.test.jsx` - Fixed Wave 0 test for non-unique playlist angle text

## Decisions Made
- Used single responsive table with `overflow-x-auto` and `min-w-[640px]` instead of separate desktop table + mobile card layouts, avoiding DOM duplication that breaks testing-library's `getByText` uniqueness assertion
- Production progress weighted: audio 20%, images 20%, i2v 15%, t2v 15%, assembly 30% (assembly weighted highest as final stage)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Wave 0 test non-unique text assertion**
- **Found during:** Task 1 (PipelineTable GREEN phase)
- **Issue:** Wave 0 test used `getByText('The Mathematician')` but mock data has 3 topics with that angle, causing multiple-match error
- **Fix:** Changed to `getAllByText('The Mathematician').length > 0`
- **Files modified:** `dashboard/src/__tests__/PipelineTable.test.jsx`
- **Verification:** All 6 PipelineTable tests pass
- **Committed in:** e3ae92d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test fix necessary for correctness. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PipelineTable and ProjectDashboard ready for live data display
- TopicCard production badges ready for Production Monitor integration (Plan 04-04)
- All existing tests pass (pre-existing RED placeholders from future plans unaffected)

---
*Phase: 04-production-pipeline*
*Completed: 2026-03-09*
