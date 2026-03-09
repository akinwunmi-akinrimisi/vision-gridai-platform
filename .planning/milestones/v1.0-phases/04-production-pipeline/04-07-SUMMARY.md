---
phase: 04-production-pipeline
plan: 07
subsystem: ops, ui
tags: [n8n, cron, supervisor, realtime, toast, sidebar]

requires:
  - phase: 04-02
    provides: Production webhook endpoints (retry-all-failed, tts, images, i2v, t2v, assembly)
  - phase: 04-04
    provides: SupervisorAlert component and ProductionMonitor page
provides:
  - WF_SUPERVISOR.json n8n cron workflow (30-min stuck detection + auto-retry + alerting)
  - SupervisorToastProvider global toast context for supervisor alerts on any page
  - Sidebar amber dot badge on Production link when supervisor_alerted=true
  - Complete webhook endpoint documentation for all Phase 4 endpoints
affects: [05-publish, 06-polish]

tech-stack:
  added: []
  patterns: [global-toast-provider-pattern, realtime-alert-subscription, cron-supervisor-agent]

key-files:
  created:
    - workflows/WF_SUPERVISOR.json
    - dashboard/src/components/SupervisorToastProvider.jsx
  modified:
    - dashboard/src/components/layout/AppLayout.jsx
    - dashboard/src/components/layout/Sidebar.jsx
    - workflows/WEBHOOK_ENDPOINTS.md

key-decisions:
  - "SupervisorToastProvider wraps AppLayout children so toasts render on every page"
  - "Sidebar uses useSupervisorToasts hook for hasSupervisorAlert flag instead of separate Supabase query"
  - "Supervisor workflow uses Code node async/await fetch for multi-endpoint re-fire (no SplitInBatches)"

patterns-established:
  - "Global toast pattern: Context provider wrapping AppLayout for cross-page notifications"
  - "NavItem badge prop: boolean badge renders absolute-positioned indicator dot"

requirements-completed: [OPS-01, OPS-02]

duration: 5min
completed: 2026-03-09
---

# Phase 4 Plan 07: Supervisor Agent + Dashboard Alerts Summary

**30-minute cron supervisor workflow with auto-retry escalation, global amber toast on any page, and sidebar badge indicator**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-09T04:09:55Z
- **Completed:** 2026-03-09T04:15:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- WF_SUPERVISOR.json implements full supervisor loop: find stuck topics (>2h), auto-retry failed scenes, wait 5 min, escalate if unresolved, re-fire stalled workflows, auto-dismiss resolved alerts
- SupervisorToastProvider renders amber toast notifications on any page via Supabase Realtime subscription
- Sidebar Production link shows pulsing amber dot when any topic has supervisor_alerted=true
- WEBHOOK_ENDPOINTS.md now documents all 15+ production endpoints with request/response specs

## Task Commits

Each task was committed atomically:

1. **Task 1: Build WF_SUPERVISOR.json** - `65d3e02` (feat)
2. **Task 2: SupervisorToastProvider + sidebar amber dot + webhook docs** - `d72ac39` (feat)

## Files Created/Modified
- `workflows/WF_SUPERVISOR.json` - 26-node n8n cron workflow for stuck pipeline detection and auto-retry
- `dashboard/src/components/SupervisorToastProvider.jsx` - Global toast context + provider with Realtime subscription
- `dashboard/src/components/layout/AppLayout.jsx` - Wrapped with SupervisorToastProvider
- `dashboard/src/components/layout/Sidebar.jsx` - Added amber dot badge on Production nav link
- `workflows/WEBHOOK_ENDPOINTS.md` - Complete Phase 4 endpoint documentation

## Decisions Made
- SupervisorToastProvider wraps AppLayout children so toasts render on every page (per user decision: "toast notification wherever user is")
- Sidebar uses useSupervisorToasts hook for hasSupervisorAlert flag rather than adding another Supabase query
- NavItem component accepts a `badge` boolean prop for reusable indicator pattern
- Supervisor workflow uses Code node with async/await fetch for multi-endpoint re-fire rather than SplitInBatches

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. WF_SUPERVISOR.json needs to be imported into n8n and activated.

## Next Phase Readiness
- Phase 4 Production Pipeline is complete (all 8 plans executed)
- Supervisor agent monitors production health with auto-retry and user alerting
- Dashboard has full production monitoring with real-time updates, scene-level tracking, and supervisor notifications
- Ready for Phase 5 (Publish) which adds video preview, Gate 3, and YouTube upload

---
*Phase: 04-production-pipeline*
*Completed: 2026-03-09*
