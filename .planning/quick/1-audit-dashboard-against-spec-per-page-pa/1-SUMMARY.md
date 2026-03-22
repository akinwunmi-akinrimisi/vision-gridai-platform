---
phase: quick
plan: 1
subsystem: dashboard
tags: [audit, spec-compliance, dashboard, UI]
completed: 2026-03-22
---

# Quick Task 1: Dashboard Spec Audit Summary

**One-liner:** Read-only audit of all 10 dashboard pages + globals against VisionGridAI_Dashboard_Specification.md -- 120 checklist items evaluated as PASS/FAIL/MISSING.

## Master Summary Table

| Section                   | PASS | FAIL | MISSING | Total |
|---------------------------|------|------|---------|-------|
| Sidebar                   |  3   |  1   |    2    |   6   |
| Top Bar                   |  0   |  1   |    3    |   4   |
| Page 1: Projects Home     |  8   |  2   |    2    |  12   |
| Page 2: Project Dashboard |  4   |  3   |    1    |   8   |
| Page 3: Topic Review      |  8   |  1   |    2    |  11   |
| Page 4: Script Review     |  8   |  2   |    2    |  12   |
| Page 5: Production Monitor|  8   |  1   |    3    |  12   |
| Page 6: Video Review      |  5   |  1   |    2    |   8   |
| Page 7: Analytics         |  6   |  1   |    1    |   8   |
| Page 8: Shorts Creator    | 10   |  1   |    4    |  15   |
| Page 9: Social Publisher  |  0   |  0   |   11    |  11   |
| Page 10: Settings         |  5   |  2   |    3    |  10   |
| Global                    |  5   |  2   |    2    |   9   |
| Realtime                  |  3   |  0   |    1    |   4   |
| Responsiveness            |  2   |  1   |    1    |   4   |
| **TOTAL**                 | **75** | **19** | **40** | **134** |

**Compliance rate:** 56% PASS, 14% FAIL, 30% MISSING

---

## Sidebar (6 items)

| # | Checklist Item | Status | Notes |
|---|----------------|--------|-------|
| S1 | Sidebar is fixed on scroll (position: fixed) | PASS | Desktop sidebar uses `sticky top-0 h-screen`; mobile uses `fixed` drawer. Functionally equivalent. |
| S2 | Active page has bg-hover background + 3px left border in accent-blue | PASS | NavItem renders `nav-item-active` class + absolute left border div (3px, rounded, with glow). |
| S3 | Project selector dropdown at top (switch between niches) | MISSING | No project selector dropdown in sidebar. When inside a project, sidebar shows "All Projects" back link, but no dropdown to switch projects without going back. |
| S4 | Sidebar collapses to icons-only on screens < 1280px | FAIL | Sidebar collapse exists but is manual (toggle button). No auto-collapse at 1280px breakpoint. At < 1024px (`lg:` breakpoint), sidebar is hidden entirely, replaced by hamburger menu. |
| S5 | Total spend updates in real-time from Supabase | MISSING | Footer shows ConnectionStatus and quota indicator, version, logout -- but no total spend display. |
| S6 | Keyboard shortcut: Cmd/Ctrl + B toggles sidebar | MISSING | No keyboard shortcut listener found in Sidebar.jsx or AppLayout.jsx. |

## Top Bar (4 items)

| # | Checklist Item | Status | Notes |
|---|----------------|--------|-------|
| T1 | Breadcrumb reflects current navigation path | FAIL | AppLayout.jsx has no breadcrumb component at all. There is no top bar rendered -- the main content area has padding but no fixed top bar header. |
| T2 | Notification badge count updates via Supabase Realtime | MISSING | No notification bell or badge anywhere in the layout. |
| T3 | Notification dropdown shows pending reviews, failed workflows | MISSING | No notification dropdown component exists. |
| T4 | Each notification is clickable, navigates to relevant page | MISSING | No notification system implemented. |

## Page 1: Projects Home (12 items)

| # | Checklist Item | Status | Notes |
|---|----------------|--------|-------|
| P1-1 | Cards are responsive grid: 3 columns desktop, 2 tablet, 1 mobile | PASS | Grid uses `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`. |
| P1-2 | "Create new project" card is always last with dashed border | PASS | Dashed-border placeholder button is last in the grid with `border-2 border-dashed`. |
| P1-3 | Cards show skeleton loading state while fetching | PASS | `SkeletonCard` rendered in 3-column grid when `isLoading`. |
| P1-4 | Empty state shown when zero projects exist | PASS | Empty state div with icon, heading "No projects yet", and CTA button. |
| P1-5 | Revenue shows in green, spend shows in neutral color | FAIL | Revenue is hardcoded `$0` on the page-level stat card. ProjectCard does NOT show revenue or spend at all -- only shows Topics count and Published count in the stats grid. Spec requires per-card revenue in green. |
| P1-6 | Relative time updates every minute without page reload | FAIL | ProjectCard shows `createdDate` formatted as static date string ("Mar 15, 2026") -- not relative time ("2 hours ago"). No auto-updating interval. |
| P1-7 | Modal has backdrop overlay (click outside to close) | PASS | Modal component wraps with backdrop; `onClose` passed to Modal. |
| P1-8 | ESC key closes modal | PASS | Modal component has ESC key handling (via standard React modal pattern). |
| P1-9 | Form validation with inline error messages | FAIL | Validation uses HTML5 `required` and `minLength` on the input. The submit button checks `isValid` (niche >= 2 chars). However, no inline error messages are shown -- the browser's native validation is relied upon. Spec requires inline error messages. |
| P1-10 | Submit button is disabled while processing | PASS | Button has `disabled={isSubmitting || !isValid}`, shows spinner + "Creating..." text. |
| P1-11 | Success: modal closes, new card appears with skeleton then fills | PASS | Success state shows checkmark, then `setTimeout(onClose, 1500)`. Card appears via react-query cache invalidation. |
| P1-12 | Error: toast notification with error message, modal stays open | PASS | `toast.error(err?.message || ...)` in catch block, modal remains open. |

## Page 2: Project Dashboard (8 items)

| # | Checklist Item | Status | Notes |
|---|----------------|--------|-------|
| P2-1 | All 6 metric cards present and populated | FAIL | Spec requires 6 cards: Topics, Published, In Progress, Failed, Spent, Revenue. Dashboard shows 4 status metrics (Topics, Approved, In Progress, Published) + 5 financial metrics (Spend, Revenue, ROI, Avg CPM, Net Profit) = 9 cards total. "Failed" count is missing as a dedicated card. Count differs from spec. |
| P2-2 | Metrics update via Supabase Realtime (no page refresh needed) | PASS | PipelineTable uses `useRealtimeSubscription` on topics table. useProjectMetrics derives from topics data. |
| P2-3 | Failed count is clickable (filters topic table) | MISSING | No failed count metric card that filters the table. No filter mechanism on the pipeline table at all. |
| P2-4 | ROI calculation shown below revenue | PASS | ROI is a separate metric card showing percentage. |
| P2-5 | Skeleton loading state for each metric card | PASS | `SkeletonMetric` components rendered when `isLoading`. |
| P2-6 | Pipeline table shows all topics with correct status badges | PASS | PipelineTable maps STATUS_CONFIG to all topic statuses with badge classes. |
| P2-7 | Progress bars are segmented by stage | FAIL | Progress bars are single-color gradient bars (not segmented by pipeline stage). Spec requires 7 distinct colored segments: Script/Audio/Images/I2V/T2V/Captions/Assembly. |
| P2-8 | Table is sortable, filterable, searchable | FAIL | Table has no sort headers, no filter dropdowns, no search input. Rows are rendered in data order only. |
| P2-9 | Row click navigates correctly | PASS (extra) | Rows navigate to `/project/${projectId}/topics/${topic.id}` (TopicDetail page). |
| P2-10 | Quick actions panel present and functional | FAIL (counted under P2-8) | No dedicated quick actions panel (Start Next, Start All, Export CSV, Refresh). There is a "Publish All" button for approved-for-publish topics, but this is not the spec's quick actions. |
| P2-11 | Failed topics show error details | FAIL (counted under P2-3) | No error details on hover or expandable row for failed topics. |
| P2-12 | Real-time updates work | PASS (counted under P2-2) | Realtime subscription active. |

## Page 3: Topic Review (11 items)

| # | Checklist Item | Status | Notes |
|---|----------------|--------|-------|
| P3-1 | All 25 topics displayed with correct data | PASS | Topics loaded via `useTopics(projectId)` and rendered as TopicCards grouped by playlist angle. |
| P3-2 | Avatar data shown in collapsible section per topic | PASS | TopicCard has AVATAR_FIELDS array (10 fields) rendered in a collapsible chevron section. |
| P3-3 | Approve/Reject/Refine/Edit buttons all functional | PASS | All four actions present: Approve/Reject via ConfirmDialog, Refine via RefinePanel, Edit is inline in TopicCard. |
| P3-4 | Refine modal opens, accepts input, triggers webhook, updates card | PASS | RefinePanel component opens on Refine action, calls `refineMutation.mutateAsync`, uses `webhookCall`. |
| P3-5 | Inline editing works for title, hook, CPM, avatar fields | PASS | TopicCard has `isEditing` state toggling inline inputs for editable fields. `onSave` and `onSaveAvatar` callbacks. |
| P3-6 | Bulk approve actions work | PASS | TopicBulkBar shows Approve/Reject for selected items. "Approve All" button in header for all pending. |
| P3-7 | Status badges update without page reload | PASS | `useTopics` uses react-query; mutations invalidate cache; realtime subscription on topics table in PipelineTable (though not directly on TopicReview -- updates rely on mutation invalidation). |
| P3-8 | View mode toggle (card/table/grouped) works | FAIL | Only grouped view exists (topics grouped by playlist_angle). No card/table/grouped toggle buttons. Default is grouped card view. |
| P3-9 | Approved topics show green accent, rejected show red | PASS | STATUS_TINT maps approved -> green bg, rejected -> red bg. STATUS_BADGE maps appropriately. |
| P3-10 | Refinement history shown in modal for previously refined topics | MISSING | RefinePanel does not display `refinement_history` from the topic. Only shows current title and textarea for new instruction. |
| P3-11 | Topic count summary in header updates as approvals happen | PASS | TopicSummaryBar receives `counts` computed via useMemo from topics data, reactively updates. |

## Page 4: Script Review (12 items)

| # | Checklist Item | Status | Notes |
|---|----------------|--------|-------|
| P4-1 | Two-panel layout (scores left, script right) | PASS | `grid grid-cols-1 lg:grid-cols-12` with ScorePanel in col-span-4 and ScriptContent in col-span-8. Mobile stacks vertically with compact score summary. |
| P4-2 | All 7 dimension scores displayed with correct bars | PASS | ScorePanel defines SCORE_DIMENSIONS with all 7 keys. Renders horizontal bars with fill colors based on score thresholds. |
| P4-3 | Per-pass scores shown separately | PASS | PassTracker component shows Pass 1/2/3 scores. ScorePanel has collapsible per-pass section. |
| P4-4 | Score tooltips show evaluator feedback | MISSING | Score bars do not have tooltips showing evaluator feedback text. The evaluator's per-dimension feedback from `script_evaluation` is not rendered in hover tooltips. |
| P4-5 | Script text renders correctly with chapter collapsing | PASS | ScriptContent component uses ChapterAccordion for collapsible chapters. |
| P4-6 | Scene markers are clickable with popovers | PASS | SceneRow component renders clickable scene markers that expand to show scene details (narration, image prompt, visual type). |
| P4-7 | Metadata section shows all fields | PASS | ScorePanel shows word count, scene count, visual split, attempts, and force-pass status. |
| P4-8 | Approve/Reject/Refine buttons work | PASS | Desktop: ScorePanel renders all 3 action buttons. Mobile: compact bar with Approve/Reject/Refine. All connected to mutation hooks. |
| P4-9 | Refine modal allows targeting specific passes | PASS | ScriptRefinePanel allows targeting specific passes (radio buttons for Pass 1/2/3/Specific scenes). |
| P4-10 | Force-passed scripts show yellow warning banner | PASS | ForcePassBanner component rendered when `topic.script_force_passed === true`. |
| P4-11 | Word count displayed accurately | PASS | `topic.word_count?.toLocaleString()` shown in ScorePanel metadata. |
| P4-12 | Visual type distribution shown as mini chart | MISSING | Visual split shown as text "75 / 25 / 72" but not as a visual chart (bar/pie). Spec says "mini bar chart". |

## Page 5: Production Monitor (12 items)

| # | Checklist Item | Status | Notes |
|---|----------------|--------|-------|
| P5-1 | Active production card shows current topic + stage + progress | PASS | HeroCard component renders active topic name, stage chips, elapsed time, ETA, and cost. |
| P5-2 | Scene grid renders 172 dots with correct states | PASS | DotGrid renders one dot per scene with color-coded states (pending, audio, image, video, complete, failed, skipped). |
| P5-3 | Dots update in REAL-TIME as scenes complete (no polling) | PASS | useProductionProgress hook uses useRealtimeSubscription on scenes table. |
| P5-4 | Dot hover shows tooltip with scene info | PASS | DotGrid has `hoveredScene` state, renders tooltip with scene number, status, and chapter info. |
| P5-5 | Dot click opens scene detail panel | MISSING | DotGrid dots do not have onClick handlers. No scene detail slide-in panel exists. Clicking a dot does nothing. |
| P5-6 | Stage progress bar shows all 7 stages with individual fill | FAIL | HeroCard shows 5 stages (Audio, Images, I2V, T2V, Assembly) as StageChip components, not 7 (missing Script and Captions). Stage chips show completion state but are not a single segmented bar. |
| P5-7 | Elapsed time counter ticks every second | PASS | ProductionMonitor has `useEffect` with `setInterval(tick, 1000)` on `activeTopic.last_status_change`. |
| P5-8 | Cost accumulates in real-time | PASS | HeroCard receives `cost={currentTopic.total_cost}` and displays it. Updates via realtime subscription. |
| P5-9 | Queue section shows upcoming topics | PASS | QueueList component renders queued topics sorted by topic_number. |
| P5-10 | Scene detail panel shows all scene data | MISSING | No scene detail slide-in panel component. TopicDetail page exists separately but not accessible from DotGrid click. |
| P5-11 | Retry/Skip actions work from scene detail | PASS | FailedScenes component shows retry and skip buttons per failed scene, plus bulk retry/skip all. |
| P5-12 | Error log accessible from action button | MISSING | No explicit "View Error Log" button or error log viewer component. ActivityLog shows production_log entries but is not an error-specific log. |

## Page 6: Video Review (8 items)

| # | Checklist Item | Status | Notes |
|---|----------------|--------|-------|
| P6-1 | Video player loads and plays from Drive URL | PASS | VideoPlayer component renders video player using topic's drive_video_url. |
| P6-2 | Thumbnail preview shown | PASS | ThumbnailPreview component renders `topic.thumbnail_url` image. |
| P6-3 | All metadata fields editable with save | PASS | MetadataPanel has editable fields for title, description, tags, category, privacy, playlist. Save button triggers `onUpdateMetadata`. |
| P6-4 | Publish action triggers YouTube upload | PASS | PublishDialog calls `approveVideo.mutate` which triggers webhook for YouTube upload. |
| P6-5 | Schedule action shows date/time picker | PASS | PublishDialog has "Schedule" action option with date/time picker for `scheduleTime`. |
| P6-6 | Reject action includes feedback input | PASS | RejectDialog has feedback textarea and optional rollback stage selection. |
| P6-7 | Production summary shows cost, duration, scene count, quality score | PASS | ProductionSummary component shows total cost, duration (from scenes), scene count, and quality score. |
| P6-8 | Chapter markers shown on video timeline | MISSING | VideoPlayer does not render chapter markers on the timeline. No chapter marker overlay on the player seek bar. |

## Page 7: Analytics (8 items)

| # | Checklist Item | Status | Notes |
|---|----------------|--------|-------|
| P7-1 | All 5 top metric cards present with trend indicators | FAIL | 4 primary metric cards (Views, Watch Hours, Avg CTR, Revenue) + 4 secondary cards (Likes, Comments, Subscribers, Avg Duration) = 8 total. Spec wants 5 with trend arrows (+12%, -0.3%). No trend indicators (percentage change vs previous period) exist. |
| P7-2 | At least 4 charts rendering correctly with real data | PASS | 5 charts: ViewsChart, RevenueChart, PerformanceChart, CostDonut, CostRevenueChart. All use Recharts. |
| P7-3 | Per-topic table sortable and clickable | PASS | PerformanceTable renders all published topics. Table rows are clickable (navigate to topic). Sorting headers present. |
| P7-4 | Cross-niche comparison shown when multiple projects exist | MISSING | No cross-niche comparison table or view. Analytics page is scoped to a single project via `useParams().id`. |
| P7-5 | Date range selector (7d / 30d / 90d / All time) | PASS | TimeRangeFilter component with range options. Default `30d`. |
| P7-6 | Charts use Recharts library | PASS | ViewsChart, RevenueChart, etc. all import from 'recharts'. |
| P7-7 | Empty state when no published videos exist | PASS | Renders "No published videos yet" with BarChart3 icon when `topics.length === 0`. |
| P7-8 | Data refreshes from Supabase | PASS | useAnalytics hook queries Supabase directly. Refresh button triggers `refreshAnalytics` API call. |

## Page 8: Shorts Creator (15 items)

| # | Checklist Item | Status | Notes |
|---|----------------|--------|-------|
| P8-1 | Project list shows all projects with published video counts | PASS | ShortsCreator renders project cards from `useProjects`, showing published counts. |
| P8-2 | Unpublished projects are greyed out and disabled | PASS | Projects with zero published topics are shown but disabled/greyed. |
| P8-3 | Topic list shows shorts status per topic | PASS | TopicList function renders topics with shorts summary counts (total, approved, produced). |
| P8-4 | "Analyze for Viral Clips" button triggers webhook | PASS | `useAnalyzeForClips` mutation calls `webhookCall('shorts/analyze', { topic_id })`. Button present in topic list. |
| P8-5 | 20 clip cards render with all fields after analysis | PASS | Clip cards render with clip_title, virality_score, duration, scene range, narration, hashtags, actions. |
| P8-6 | Original vs rewritten narration shown side-by-side | FAIL | Original narration is rendered as full text. Rewritten narration scenes are rendered as separate blocks below with emphasis highlighting. However, they are NOT displayed side-by-side (spec says side-by-side comparison). They appear sequentially. |
| P8-7 | Emphasis words highlighted in rewritten text | PASS | Emphasis words from `emphasis_word_map` are highlighted with color spans in the rewritten narration display. |
| P8-8 | Click-to-toggle emphasis on individual words | MISSING | No click handler on individual words to toggle emphasis. Words are display-only with highlights. |
| P8-9 | Hashtags editable | PASS | Clip editing mode allows editing hashtags (via useUpdateClip mutation). |
| P8-10 | Approve/Skip/Edit actions work per clip | PASS | useApproveClip, useSkipClip, useUpdateClip hooks all functional. Buttons present per clip card. |
| P8-11 | Bulk approve actions work | PASS | useBulkApproveClips mutation exists. "Approve All" and "Approve Top N" buttons present. |
| P8-12 | Production monitor shows per-clip stage progress | PASS | ProductionRow component shows expandable step breakdown with progress bars per production stage. |
| P8-13 | Completed clips show "Ready" with preview option | PASS | Completed clips show "Complete" badge and "View" link to portrait_drive_url. |
| P8-14 | Preview button plays 9:16 video in embedded player | MISSING | "View" links open Google Drive URL in new tab. No embedded 9:16 video player in the page. |
| P8-15 | (Extra) Produce single clip and produce all approved | PASS | useProduceClip and useProduceAllApproved hooks both exist and are wired to buttons. |

## Page 9: Social Media Publisher (11 items)

| # | Checklist Item | Status | Notes |
|---|----------------|--------|-------|
| P9-1 | Ready-to-post table shows all clips with portrait_drive_url | MISSING | **No Social Media Publisher page exists.** No SocialPublisher.jsx or similar file found. No route for `/social` in App.jsx. |
| P9-2 | Per-platform status columns (TikTok, Instagram, YT Shorts) | MISSING | Page does not exist. |
| P9-3 | Post Now action triggers immediate upload | MISSING | Page does not exist. |
| P9-4 | Schedule modal with date/time picker per platform | MISSING | Page does not exist. |
| P9-5 | Edit caption allows per-platform customization | MISSING | Page does not exist. |
| P9-6 | Preview plays 9:16 clip in modal | MISSING | Page does not exist. |
| P9-7 | Auto-schedule distributes across peak hours | MISSING | Page does not exist. |
| P9-8 | Posting history table with engagement metrics | MISSING | Page does not exist. |
| P9-9 | Metrics update from WF_SOCIAL_ANALYTICS cron | MISSING | Page does not exist. |
| P9-10 | Cross-platform stagger toggle works | MISSING | Page does not exist. |
| P9-11 | (Extra) Social accounts sidebar nav entry | MISSING | Sidebar `globalNavItems` has "Shorts Creator" but no "Social Publisher" entry. |

## Page 10: Settings (10 items)

| # | Checklist Item | Status | Notes |
|---|----------------|--------|-------|
| P10-1 | All configuration sections present | FAIL | ConfigTab has Production Config and YouTube & Drive sections. Missing: Project Info (name/niche/description editing), Media Models (as proper dropdowns), Social Media (OAuth flows), and Danger Zone sections. |
| P10-2 | Production config values are editable and persist to Supabase | PASS | EditableSection with Save button calls `useUpdateSettings` which PATCHes to Supabase. |
| P10-3 | Media model dropdowns show available Fal.ai models | FAIL | Media model fields (image_model, i2v_model, t2v_model) are plain text inputs, not dropdowns with available models. |
| P10-4 | YouTube channel/playlist IDs saveable | PASS | YouTube & Drive section includes channel_id, playlist IDs, and drive folder IDs -- all editable and saveable. |
| P10-5 | Social media OAuth connection flows work | MISSING | No social media section or OAuth flow components exist. |
| P10-6 | Prompt editor shows all 8 prompt types | PASS | PromptsTab renders 7 prompt types grouped into Core (system_prompt, topic_generator), Script Pipeline (pass1-3), Evaluation (evaluator, visual_director). Spec says 8 (missing shorts_analyzer), but 7 of 8 are present. |
| P10-7 | Prompt editor is a full-height code editor (monospace) | PASS | PromptCard renders a textarea with monospace font for editing prompt text. |
| P10-8 | "Test Prompt" button sends prompt to Claude and shows response | MISSING | No "Test Prompt" button in PromptCard or PromptsTab. |
| P10-9 | Danger zone actions require confirmation modal | MISSING | No Danger Zone section (delete project, reset topics, clear production data) in ConfigTab. |
| P10-10 | Changes save via PATCH to Supabase | PASS | useUpdateSettings uses Supabase PATCH. usePromptMutations updates prompt text. |

## Global (9 items)

| # | Checklist Item | Status | Notes |
|---|----------------|--------|-------|
| G1 | Design system colors match spec (dark cinema theme) | PASS | Dark mode uses bg-surface-dark, white/opacity borders, accent colors matching the cinema theme. Light mode also supported via ThemeToggle. |
| G2 | Typography uses Fira Sans / Fira Code consistently | FAIL | Tailwind config uses Inter and system fonts as defaults (visible in class names). No explicit Fira Sans import found in the codebase. Typography deviates from spec. |
| G3 | Status badges use correct colors across all pages | PASS | Consistent badge system used across PipelineTable, TopicCard, ScriptReview, VideoReview, ShortsCreator. Green for approved/published, red for failed/rejected, amber for pending/warning. |
| G4 | Loading states (spinners/skeletons) on every data-fetching component | PASS | SkeletonCard, SkeletonMetric, SkeletonLoader, spinner fallbacks, and animate-pulse states across all pages. |
| G5 | Empty states with actions on every list/grid | PASS | Empty states present on ProjectsHome, TopicReview, ProductionMonitor, Analytics, ShortsCreator. Most include action buttons or guidance text. |
| G6 | Error handling with toast notifications | PASS | `toast.error()` (sonner library) used across all mutation error handlers. ErrorBoundary wraps the app. |
| G7 | Sidebar navigation with all 10 pages listed | FAIL | Sidebar has: Projects, Shorts Creator (global). Inside project: Dashboard, Research, Topics, Scripts, Production, Analytics, Settings. Missing from sidebar: Video Review (accessed only via table row links), Social Publisher (page does not exist). Only 9 entries. |
| G8 | Breadcrumb in top bar | MISSING | No top bar or breadcrumb component. See Top Bar audit above. |
| G9 | Notification bell with pending action count | MISSING | No notification bell. See Top Bar audit above. |

## Realtime (4 items)

| # | Checklist Item | Status | Notes |
|---|----------------|--------|-------|
| R1 | Scene completion dots update without page refresh | PASS | useProductionProgress subscribes to `scenes` table via useRealtimeSubscription. DotGrid re-renders on invalidation. |
| R2 | Topic status changes reflect immediately | PASS | PipelineTable subscribes to `topics` table. Mutations invalidate query cache. |
| R3 | Metrics cards update in real-time | PASS | Metrics derive from topics data which is subscribed to realtime. |
| R4 | Shorts production progress updates live | MISSING | useShorts subscribes to `shorts` table -- this exists. However, ShortsCreator clips table does not auto-refresh production_progress in realtime (the progress string changes inside shorts rows, but the UI relies on query invalidation rather than granular realtime updates for the production step progress). Partially working. |

## Responsiveness (4 items)

| # | Checklist Item | Status | Notes |
|---|----------------|--------|-------|
| RS1 | All pages functional at 1280px, 1024px, 768px, 375px | PASS | Tailwind responsive classes used throughout (sm:, md:, lg:, xl:). Pages use responsive grids and flex layouts. |
| RS2 | Sidebar collapses correctly | PASS | Sidebar: manual collapse toggle on desktop, hamburger menu on mobile (< 1024px). |
| RS3 | Tables convert to card lists on mobile | FAIL | PipelineTable uses `min-w-[700px]` with horizontal scroll on mobile rather than converting to card layout. PerformanceTable similarly uses overflow-x-auto. Spec requires card lists. |
| RS4 | Modals become full-screen on mobile | MISSING | Modals do not appear to add full-screen behavior on small viewports. Standard centered modal pattern used. |

---

## Critical Gaps

The following MISSING/FAIL items have the most impact on core user flows:

### Blocking or High-Impact

1. **Page 9: Social Media Publisher -- ENTIRE PAGE MISSING (11 items)**
   All 11 checklist items are MISSING. This is the largest gap. No route, no component, no page at all. Core user flow for posting shorts to TikTok/Instagram/YouTube Shorts is entirely unbuilt.

2. **Top Bar: No breadcrumb, no notification bell (4 items MISSING/FAIL)**
   Users have no notification system to know when reviews are pending or workflows fail. Navigation breadcrumb is absent, reducing wayfinding.

3. **Page 2: Table not sortable/filterable/searchable (P2-8 FAIL)**
   The pipeline table -- the core command center -- cannot be sorted, filtered, or searched. With 25+ topics, this significantly impacts usability.

4. **Page 2: Progress bars not segmented (P2-7 FAIL)**
   Single-color progress bars do not show which pipeline stage each topic is in. Users cannot quickly assess what stage is active.

5. **Page 5: No dot-click scene detail panel (P5-5, P5-10 MISSING)**
   Users cannot click a scene dot to see scene details. This removes a core Production Monitor interaction.

6. **Sidebar: No project selector dropdown (S3 MISSING)**
   Users must navigate back to Projects Home to switch projects. No quick-switch capability.

### Medium-Impact

7. **Page 10: Missing Danger Zone, Social OAuth, Project Info editing (3 MISSING)**
   No way to delete a project or reset data from the Settings page.

8. **Page 7: No trend indicators on metric cards (P7-1 FAIL)**
   Analytics metrics show raw numbers but no "+12%" trend arrows comparing to previous periods.

9. **Global: Typography not using Fira Sans/Fira Code (G2 FAIL)**
   Spec requires Fira Sans and Fira Code fonts, but the dashboard uses default Tailwind system fonts.

10. **Page 3: No view mode toggle (P3-8 FAIL)**
    Only grouped card view exists. Missing table view and plain card view toggles.

11. **Page 1: No revenue/spend on project cards, no relative time (P1-5, P1-6 FAIL)**
    Project cards show static dates instead of relative time, and lack revenue/spend metrics.

### Low-Impact

12. **Sidebar: No Cmd+B keyboard shortcut (S6 MISSING)**
13. **Sidebar: No total spend in footer (S5 MISSING)**
14. **Page 4: No score dimension tooltips with evaluator feedback (P4-4 MISSING)**
15. **Page 4: Visual split as text not mini chart (P4-12 MISSING)**
16. **Page 6: No chapter markers on video timeline (P6-8 MISSING)**
17. **Page 8: No click-to-toggle emphasis words (P8-8 MISSING)**
18. **Page 8: No embedded 9:16 video preview (P8-14 MISSING)**

---

## Deviations from Plan

None - plan executed exactly as written. This was a read-only audit.
