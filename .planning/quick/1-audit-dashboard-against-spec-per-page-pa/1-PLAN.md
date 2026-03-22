---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified: [".planning/quick/1-audit-dashboard-against-spec-per-page-pa/1-SUMMARY.md"]
autonomous: true
requirements: ["AUDIT-01"]

must_haves:
  truths:
    - "Every audit checklist item from VisionGridAI_Dashboard_Specification.md is evaluated as PASS, FAIL, or MISSING"
    - "Summary table shows pass/fail/missing counts per page and globally"
    - "Each FAIL or MISSING item includes a brief explanation of what is wrong or absent"
  artifacts:
    - path: ".planning/quick/1-audit-dashboard-against-spec-per-page-pa/1-SUMMARY.md"
      provides: "Complete audit report with per-page and global results"
      min_lines: 150
  key_links: []
---

<objective>
Audit the current dashboard codebase against VisionGridAI_Dashboard_Specification.md. For every audit checklist item in the spec, read the corresponding JSX/JS source files and determine PASS, FAIL, or MISSING. Produce a structured SUMMARY.md report with a per-page results table and a global summary.

Purpose: Identify gaps between the spec and current implementation before the next development phase.
Output: `.planning/quick/1-audit-dashboard-against-spec-per-page-pa/1-SUMMARY.md`
</objective>

<execution_context>
@C:/Users/DELL/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/DELL/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@VisionGridAI_Dashboard_Specification.md — The spec containing all audit checklists (14 checklist sections, ~120 individual items)

Dashboard source files to read and evaluate:
- dashboard/src/App.jsx — Router, layout, page imports
- dashboard/src/components/layout/Sidebar.jsx — Global sidebar navigation
- dashboard/src/components/layout/AppLayout.jsx — Top bar, breadcrumb, layout wrapper
- dashboard/src/components/layout/ConnectionStatus.jsx — Supabase connection indicator
- dashboard/src/pages/ProjectsHome.jsx — Page 1: Projects Home
- dashboard/src/components/projects/ProjectCard.jsx — Project card component
- dashboard/src/components/projects/CreateProjectModal.jsx — New project modal
- dashboard/src/pages/ProjectDashboard.jsx — Page 2: Project Dashboard
- dashboard/src/components/dashboard/PipelineTable.jsx — Pipeline status table
- dashboard/src/pages/TopicReview.jsx — Page 3: Topic Review (Gate 1)
- dashboard/src/components/topics/TopicCard.jsx — Topic card component
- dashboard/src/components/topics/RefinePanel.jsx — Refine modal
- dashboard/src/components/topics/TopicSummaryBar.jsx — Summary bar
- dashboard/src/components/topics/TopicBulkBar.jsx — Bulk actions
- dashboard/src/pages/ScriptReview.jsx — Page 4: Script Review (Gate 2)
- dashboard/src/components/script/ScorePanel.jsx — Quality scores
- dashboard/src/components/script/ChapterAccordion.jsx — Chapter collapsing
- dashboard/src/components/script/SceneRow.jsx — Scene markers
- dashboard/src/components/script/SceneEditForm.jsx — Scene editing
- dashboard/src/components/script/ScriptRefinePanel.jsx — Script refine modal
- dashboard/src/components/script/ForcePassBanner.jsx — Force pass warning
- dashboard/src/components/script/PassTracker.jsx — Per-pass scores
- dashboard/src/pages/ProductionMonitor.jsx — Page 5: Production Monitor
- dashboard/src/components/production/HeroCard.jsx — Active production card
- dashboard/src/components/production/DotGrid.jsx — Scene dot grid
- dashboard/src/components/production/QueueList.jsx — Production queue
- dashboard/src/components/production/ActivityLog.jsx — Activity log
- dashboard/src/components/production/FailedScenes.jsx — Failed scenes
- dashboard/src/pages/VideoReview.jsx — Page 6: Video Review (Gate 3)
- dashboard/src/components/video/VideoPlayer.jsx — Video player
- dashboard/src/components/video/ThumbnailPreview.jsx — Thumbnail preview
- dashboard/src/components/video/MetadataPanel.jsx — Metadata editor
- dashboard/src/components/video/PublishDialog.jsx — Publish dialog
- dashboard/src/components/video/RejectDialog.jsx — Reject dialog
- dashboard/src/components/video/ProductionSummary.jsx — Production summary
- dashboard/src/pages/Analytics.jsx — Page 7: Analytics
- dashboard/src/components/analytics/PerformanceTable.jsx — Per-topic table
- dashboard/src/components/analytics/TimeRangeFilter.jsx — Date range selector
- dashboard/src/components/analytics/ViewsChart.jsx — Views chart
- dashboard/src/components/analytics/RevenueChart.jsx — Revenue chart
- dashboard/src/components/analytics/TopPerformerCard.jsx — Top performer
- dashboard/src/pages/ShortsCreator.jsx — Page 8: Shorts Creator (Gate 4)
- dashboard/src/hooks/useShorts.js — Shorts data hook
- dashboard/src/pages/Settings.jsx — Page 10: Settings
- dashboard/src/components/settings/ConfigTab.jsx — Config sections
- dashboard/src/components/settings/PromptsTab.jsx — Prompt editor
- dashboard/src/components/settings/PromptCard.jsx — Prompt card
- dashboard/src/hooks/useRealtimeSubscription.js — Realtime subscription hook
- dashboard/src/hooks/useTopics.js — Topics data hook
- dashboard/src/hooks/useProjects.js — Projects data hook
- dashboard/src/hooks/useAnalytics.js — Analytics data hook
- dashboard/src/hooks/useScenes.js — Scenes data hook
- dashboard/src/hooks/useProductionProgress.js — Production progress hook
- dashboard/src/hooks/useVideoReview.js — Video review hook
</context>

<tasks>

<task type="auto">
  <name>Task 1: Audit Global Layout + Pages 1-5 against spec checklists</name>
  <files>.planning/quick/1-audit-dashboard-against-spec-per-page-pa/1-SUMMARY.md</files>
  <action>
READ-ONLY audit. Do NOT modify any dashboard source files.

Read VisionGridAI_Dashboard_Specification.md in full to extract every audit checklist item (lines 189-196 Sidebar, 213-217 Top Bar, 267-273 Page 1 Cards, 316-322 Page 1 Modal, 350-355 Page 2 Metrics, 429-437 Page 2 Full, 561-572 Page 3, 693-705 Page 4, 810-822 Page 5).

For each checklist section, read the corresponding JSX/JS source files and evaluate each item:

**Sidebar checklist (6 items):** Read Sidebar.jsx. Check: position fixed, active page styling (bg-hover + left border), project selector dropdown, collapse at 1280px, total spend realtime, Cmd+B shortcut.

**Top Bar checklist (4 items):** Read AppLayout.jsx. Check: breadcrumb, notification badge with realtime, notification dropdown contents, clickable notifications.

**Page 1 — Projects Home (12 items total):**
- Cards (6): Read ProjectsHome.jsx + ProjectCard.jsx. Check: responsive grid (3/2/1 cols), create card last with dashed border, skeleton loading, empty state, revenue green/spend neutral, relative time auto-updates.
- Modal (6): Read CreateProjectModal.jsx. Check: backdrop click-to-close, ESC close, form validation inline errors, disabled during processing, success closes modal + new card, error toast with modal staying open.

**Page 2 — Project Dashboard (8 items):** Read ProjectDashboard.jsx + PipelineTable.jsx. Check: 6 metrics present/populated/realtime, pipeline table with correct badges, segmented progress bars, sortable/filterable/searchable table, row click navigates, quick actions panel, failed topic error details, realtime updates.

**Page 3 — Topic Review (11 items):** Read TopicReview.jsx + TopicCard.jsx + RefinePanel.jsx + TopicSummaryBar.jsx + TopicBulkBar.jsx. Check: all topics displayed, avatar collapsible section, approve/reject/refine/edit buttons, refine modal with webhook, inline editing, bulk approve, realtime status badges, view mode toggle (card/table/grouped), approved=green/rejected=red, refinement history in modal, topic count summary updates.

**Page 4 — Script Review (12 items):** Read ScriptReview.jsx + ScorePanel.jsx + ChapterAccordion.jsx + SceneRow.jsx + SceneEditForm.jsx + ScriptRefinePanel.jsx + ForcePassBanner.jsx + PassTracker.jsx. Check: two-panel layout, 7 dimension scores with bars, per-pass scores, score tooltips, chapter collapsing, scene markers clickable with popovers, metadata section, approve/reject/refine buttons, refine modal targets passes, force-pass banner, word count, visual type distribution chart.

**Page 5 — Production Monitor (12 items):** Read ProductionMonitor.jsx + HeroCard.jsx + DotGrid.jsx + QueueList.jsx + FailedScenes.jsx + ActivityLog.jsx + useScenes.js + useProductionProgress.js. Check: active production card, 172 dots with correct states, realtime dot updates (no polling), dot hover tooltip, dot click opens detail panel, 7-stage progress bar, elapsed time ticking, cost accumulating realtime, queue section, scene detail panel data, retry/skip actions, error log access.

For each item, assign:
- **PASS** — Feature exists and matches spec behavior
- **FAIL** — Feature exists but deviates from spec (explain deviation)
- **MISSING** — Feature/component does not exist at all

Begin writing the SUMMARY.md with the results for Global + Pages 1-5. Use a structured markdown table format per section.
  </action>
  <verify>
    <automated>test -f ".planning/quick/1-audit-dashboard-against-spec-per-page-pa/1-SUMMARY.md" && grep -c "PASS\|FAIL\|MISSING" ".planning/quick/1-audit-dashboard-against-spec-per-page-pa/1-SUMMARY.md" | xargs test 30 -le</automated>
  </verify>
  <done>SUMMARY.md exists with audit results for Global Layout (Sidebar + Top Bar) and Pages 1-5, covering at least 55 individual checklist items, each marked PASS/FAIL/MISSING with explanations for non-passing items.</done>
</task>

<task type="auto">
  <name>Task 2: Audit Pages 6-10 + Realtime + Responsiveness, produce final summary table</name>
  <files>.planning/quick/1-audit-dashboard-against-spec-per-page-pa/1-SUMMARY.md</files>
  <action>
READ-ONLY audit. Do NOT modify any dashboard source files. Continue appending to the SUMMARY.md started in Task 1.

Read the remaining spec audit checklists (lines 899-907 Page 6, 964-972 Page 7, 1109-1123 Page 8, 1190-1200 Page 9, 1245-1255 Page 10, 1383-1416 Master Summary).

**Page 6 — Video Review (8 items):** Read VideoReview.jsx + VideoPlayer.jsx + ThumbnailPreview.jsx + MetadataPanel.jsx + PublishDialog.jsx + RejectDialog.jsx + ProductionSummary.jsx + useVideoReview.js. Check: video player loads from Drive URL, thumbnail preview, metadata fields editable with save, publish triggers YouTube upload, schedule shows date/time picker, reject includes feedback input, production summary (cost/duration/scenes/score), chapter markers on timeline.

**Page 7 — Analytics (8 items):** Read Analytics.jsx + PerformanceTable.jsx + TimeRangeFilter.jsx + ViewsChart.jsx + RevenueChart.jsx + TopPerformerCard.jsx + CostDonut.jsx + CostRevenueChart.jsx + PerformanceChart.jsx + useAnalytics.js. Check: 5 top metrics with trends, 4+ charts rendering, per-topic table sortable/clickable, cross-niche comparison, date range selector (7d/30d/90d/All), Recharts library used, empty state, data from Supabase.

**Page 8 — Shorts Creator (15 items):** Read ShortsCreator.jsx + useShorts.js. Check: project list with published counts, unpublished greyed out, topic list with shorts status, analyze button triggers webhook, 20 clip cards with all fields, original vs rewritten side-by-side, emphasis words highlighted, click-to-toggle emphasis, hashtags editable, approve/skip/edit per clip, bulk approve, production monitor per-clip, completed clips show Ready, preview plays 9:16 video.

**Page 9 — Social Media Publisher (11 items):** Check if a Social Media Publisher page exists (note: no SocialPublisher.jsx was found in glob results). If MISSING, mark all 11 items as MISSING. If a ComingSoon placeholder exists instead, note that.

**Page 10 — Settings (10 items):** Read Settings.jsx + ConfigTab.jsx + PromptsTab.jsx + PromptCard.jsx + useProjectSettings.js + usePromptConfigs.js. Check: all config sections present, production config editable/persists, media model dropdowns, YouTube IDs saveable, social media OAuth flows, 8 prompt types in editor, full-height code editor (monospace), test prompt button, danger zone with confirmation, changes save via PATCH.

**Realtime audit (4 items from Master Summary lines 1406-1410):** Read useRealtimeSubscription.js and check which pages subscribe. Check: scene dots update without refresh, topic status changes reflect, metrics cards update realtime, shorts progress updates.

**Responsiveness audit (4 items from lines 1412-1416):** Read Sidebar.jsx + App.jsx for breakpoint handling. Check: functional at 1280/1024/768/375px, sidebar collapses, tables convert to card lists on mobile, modals become full-screen.

**Global audit (9 items from lines 1383-1392):** Check across all files: design system colors match, Fira Sans/Code typography, status badges consistent, loading states everywhere, empty states with actions, error handling toasts, sidebar has all 10 pages, breadcrumb in top bar, notification bell.

After all sections are evaluated, append a **Master Summary Table** at the top of the SUMMARY.md:

```
| Section              | PASS | FAIL | MISSING | Total |
|----------------------|------|------|---------|-------|
| Sidebar              |  X   |  Y   |    Z    |   6   |
| Top Bar              |  X   |  Y   |    Z    |   4   |
| Page 1: Projects Home|  X   |  Y   |    Z    |  12   |
| Page 2: Dashboard    |  X   |  Y   |    Z    |   8   |
| ...                  |      |      |         |       |
| TOTAL                |  XX  |  YY  |   ZZ    |  NNN  |
```

Also include a **Critical Gaps** section listing the most impactful FAIL/MISSING items that block core user flows.
  </action>
  <verify>
    <automated>test -f ".planning/quick/1-audit-dashboard-against-spec-per-page-pa/1-SUMMARY.md" && grep -c "PASS\|FAIL\|MISSING" ".planning/quick/1-audit-dashboard-against-spec-per-page-pa/1-SUMMARY.md" | xargs test 80 -le</automated>
  </verify>
  <done>Complete SUMMARY.md with all ~120 audit items evaluated across all 14 checklist sections. Master summary table at top with per-section pass/fail/missing counts. Critical Gaps section highlights blocking issues. Every FAIL and MISSING item has a brief explanation.</done>
</task>

</tasks>

<verification>
- SUMMARY.md exists at .planning/quick/1-audit-dashboard-against-spec-per-page-pa/1-SUMMARY.md
- Every audit checklist item from VisionGridAI_Dashboard_Specification.md is accounted for
- Master summary table has accurate counts
- No dashboard source files were modified (this is a read-only audit)
</verification>

<success_criteria>
- All ~120 audit checklist items from the spec are evaluated as PASS, FAIL, or MISSING
- Per-page summary table with counts at the top of the report
- Critical Gaps section identifies the most impactful missing/failing items
- Report is actionable — a developer can use it to prioritize fixes
</success_criteria>

<output>
After completion, the SUMMARY.md serves as both the audit report and the plan summary.
File: `.planning/quick/1-audit-dashboard-against-spec-per-page-pa/1-SUMMARY.md`
</output>
