---
phase: 05-publish-analytics
plan: 04
subsystem: analytics, workflow, ui
tags: [youtube-analytics, n8n-cron, recharts, cost-aggregation, supabase]

requires:
  - phase: 05-02
    provides: Analytics page with charts and performance table
provides:
  - YouTube analytics cron workflow (daily + manual refresh)
  - Private-to-public video transitions for scheduled/over-quota uploads
  - Cost aggregation across topics in useProjectMetrics
  - Net Profit financial card on Project Dashboard
affects: [06-polish, analytics, project-dashboard]

tech-stack:
  added: []
  patterns:
    - "n8n dual-trigger workflow (Schedule + Webhook) for cron + manual"
    - "YouTube Analytics API v2 reports endpoint for per-video metrics"
    - "Cost breakdown JSONB aggregation across topics"

key-files:
  created:
    - workflows/WF_ANALYTICS_CRON.json
  modified:
    - dashboard/src/hooks/useProjectMetrics.js
    - dashboard/src/pages/ProjectDashboard.jsx

key-decisions:
  - "CTR computed as views/impressions*100 since YouTube Analytics API does not return CTR as separate metric"
  - "Cost breakdown aggregated from topics.cost_breakdown JSONB with per-component sums (script, tts, images, i2v, t2v)"
  - "Net Profit card uses green/red color coding based on positive/negative profitability"

patterns-established:
  - "Dual-trigger cron pattern: Schedule Trigger + Webhook for same logic with optional project_id filter"
  - "Financial metrics use gradient icon backgrounds matching status cards visual pattern"

requirements-completed: [ANLY-01, ANLY-02, ANLY-04]

duration: 6min
completed: 2026-03-09
---

# Phase 5 Plan 4: Analytics Cron + Financial Metrics Summary

**YouTube analytics daily cron workflow with per-video metric writes and Project Dashboard 5-card financial row with cost aggregation**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-09T08:28:49Z
- **Completed:** 2026-03-09T08:34:22Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- n8n analytics cron workflow with Schedule Trigger (daily 6 AM UTC) and Webhook trigger for manual refresh
- YouTube Analytics API integration pulling views, watch hours, CTR, revenue, CPM per video
- Private-to-public transitions for scheduled and over-quota videos via YouTube Data API
- useProjectMetrics extended with netProfit, costBreakdown, pendingReview, scheduled fields
- Project Dashboard financial row expanded to 5 cards with Net Profit green/red color coding

## Task Commits

Each task was committed atomically:

1. **Task 1: n8n analytics cron workflow** - `fe3c6bb` (feat)
2. **Task 2: Wire Project Dashboard financial metrics + cost aggregation** - `e8e0346` (feat)

## Files Created/Modified
- `workflows/WF_ANALYTICS_CRON.json` - Daily analytics cron + manual refresh webhook (23 nodes)
- `dashboard/src/hooks/useProjectMetrics.js` - Extended with netProfit, costBreakdown, pendingReview, scheduled
- `dashboard/src/pages/ProjectDashboard.jsx` - 5-card financial grid with Net Profit + pending review badge

## Decisions Made
- CTR computed as views/impressions*100 since YouTube Analytics API does not return CTR as a separate dimension
- Cost breakdown aggregated from individual topic cost_breakdown JSONB fields
- Net Profit card shows green for positive, red for negative, with +/- prefix formatting
- Added Scheduled badge (purple) alongside Pending Review badge (amber) near pipeline section header

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. YouTube OAuth2 credentials must already exist in n8n credential manager with yt-analytics.readonly scope.

## Next Phase Readiness
- Analytics feedback loop complete: YouTube data flows back daily into dashboard
- Financial metrics display real cost and revenue data
- Ready for Phase 6 polish (Settings page, mobile responsiveness, cost tracker page)

---
*Phase: 05-publish-analytics*
*Completed: 2026-03-09*
