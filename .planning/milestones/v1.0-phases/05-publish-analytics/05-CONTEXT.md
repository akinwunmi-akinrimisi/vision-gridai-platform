# Phase 5: Publish + Analytics - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Video preview page with Gate 3 approval, YouTube upload with metadata/captions/thumbnails/playlist assignment, scheduling support, analytics cron pulling YouTube metrics daily, and cost tracking displayed across dashboard. User previews assembled videos, edits metadata, approves/publishes/schedules, and sees performance data flow back into the analytics page.

</domain>

<decisions>
## Implementation Decisions

### Video Review Page Layout
- Two-column layout matching Script Review pattern: sticky left metadata panel + scrollable right content panel
- Left panel (sticky): Title, description (template preview + raw edit), tags (chip badges + input), chapters (editable timestamps), playlist assignment dropdown, action buttons (Approve, Reject, Edit Metadata)
- Right panel (scrollable): Google Drive embedded iframe video player, large 16:9 thumbnail preview below player, download video button below player, collapsible SRT caption preview, collapsible production summary (total cost with per-stage breakdown, scene count, production duration, skipped scenes)
- Full-width header bar above columns: topic number, SEO title, playlist badge, status badge, prev/next topic arrows (cycle through assembled topics)
- Mobile: metadata panel collapses to compact top bar (same pattern as Script Review)
- Navigate to Video Review from Pipeline Table on Project Dashboard — topics with status='assembled' show "Review Video" button
- Published videos remain accessible at same route in read-only mode — green "Published" banner, YouTube embed replaces Drive player, analytics summary shown
- Toast notification + Pipeline Table amber "Ready for Review" badge when assembly completes

### Metadata Editing
- Inline edit on left panel — click "Edit Metadata" transforms display fields to editable inputs in-place, Save/Cancel buttons appear
- All fields editable: title, description, tags, chapters, playlist assignment, thumbnail prompt
- Tags shown as removable chip/pill badges with text input to add new tags (Enter to add)
- Chapters auto-generated from script chapter names + cumulative audio timestamps (start_time_ms), editable list (rename chapters, adjust timestamps)
- Description auto-generated with template formatting: hook paragraph, chapter list with timestamps, hashtags, affiliate disclaimer, channel links. Shown as formatted preview; click Edit for raw textarea
- Thumbnail regeneration: edit prompt text → click Regenerate → webhook to n8n → Kie.ai generates new thumbnail → Realtime update shows new preview

### Gate 3 Approval Flow
- Clicking Approve opens ConfirmDialog with three options:
  1. "Publish Now" — immediate public upload to YouTube
  2. "Schedule" — date/time picker (user's local timezone, converts to UTC), uploads as private, transitions to public at scheduled time
  3. "Approve Only" — marks as approved, no upload yet (for batch publish later)
- Dialog shows: topic title, cost, scene count, YouTube quota usage ("4 uploads remaining today")
- Reject opens ConfirmDialog with feedback textarea + stage rollback radio options:
  1. Assembly only (free) — re-run FFmpeg with existing assets
  2. Visuals + assembly (~$15) — keep audio, redo images/video/assembly
  3. Full re-production (~$17) — start from TTS
- Each rollback option shows estimated cost

### Upload Progress
- After clicking Publish Now, Video Review page shows multi-step progress:
  1. Uploading video (progress %) — resumable upload protocol for large 2hr files
  2. Setting metadata
  3. Uploading captions
  4. Setting thumbnail
  5. Assigning playlist
- Each step gets checkmark as it completes, active step shows spinner
- After success: green success banner with YouTube URL link, "View on YouTube" button, published timestamp
- Upload failure: auto-retry 2x, then shows error on Video Review page with "Retry Upload" button

### YouTube Upload Workflow
- Resumable upload protocol (required for 2-5GB 2hr videos)
- "Publish Now" sets video as public immediately
- "Schedule" uploads as private, transitions to public at scheduled time via analytics cron
- YouTube OAuth2 credential managed in n8n credential manager (not dashboard OAuth flow)
- Quota: 10,000 units/day, 1,600 per upload = max 6 uploads/day
- Beyond quota: continue uploading as private, analytics cron transitions to public next day
- No end screens or cards in v1 — manage on YouTube Studio
- No re-upload or un-publish from dashboard — manage on YouTube Studio once published

### Batch Publish
- Project Dashboard shows "Publish All Approved" button when 1+ videos have video_review_status='approved'
- Opens dialog listing approved videos with checkboxes + combined quota check
- Sequential upload with progress list: current video highlighted, completed ones get checkmarks
- Beyond daily quota: remaining videos uploaded as private, transitioned next day
- Quota indicator shown in sidebar footer near connection status

### Pipeline Status Badges (new states)
- assembled → blue
- ready-review → amber (new)
- video_approved → blue (new)
- publishing → amber animated (new)
- scheduled → purple (new)
- published → green with checkmark (new)
- upload_failed → red (new)

### Analytics Page Layout
- Top: metric summary cards (Views, Watch Hours, CTR, Revenue — existing scaffolding) + secondary metrics (Likes, Comments, Subscribers, Avg Duration — existing)
- "Last updated: Mar 9, 2026 06:00 UTC" in header area + "Refresh Now" manual trigger button
- Top performer highlight card: best video by views with thumbnail, title, key metrics
- Time range filter: dropdown with Last 7 days, Last 30 days (default), Last 90 days, All time
- Charts section (Recharts):
  1. Views over time — area chart
  2. Revenue over time — line chart
  3. CTR + Avg View Duration per video — bar chart
  4. Cost distribution by stage — donut chart (Script, TTS, Images, I2V, T2V)
  5. Cost vs Revenue per video — grouped bar chart (cost in orange, revenue in green)
- Per-video performance table: sortable by any column, columns: #, Title, Views, Watch Hours, CTR, Avg Duration, Revenue, Cost, P/L (profit/loss with green/red indicator), CPM, Published Date
- Default sort by published date descending
- Clicking video row navigates to Video Review (read-only) for published videos

### Analytics Cron
- Daily at 6 AM UTC via n8n cron workflow
- Pulls per-video: views, watchTimeMinutes, averageViewDuration, averageViewPercentage, impressions, clicks (CTR), likes, comments, subscribersGained, estimatedRevenue, cpm
- Data written to yt_* columns on topics table
- Also handles: private→public transitions for scheduled/over-quota videos
- Manual "Refresh Now" button triggers same workflow via webhook

### Cost Tracking Display
- Project Dashboard: existing financial metrics row (Total Spend, Revenue, ROI, Avg CPM) + add Net Profit card (5th card or rearrange)
- Analytics page: dedicated Cost & Revenue section with per-stage cost breakdown donut + cost vs revenue bar chart + per-video P/L in table
- Video Review page: collapsible production summary with per-stage cost breakdown
- Production Monitor: live cost counter (already decided in Phase 4)
- Per-stage breakdown: Script, TTS, Images, I2V, T2V with percentages
- All cost data read from pre-computed values in Supabase (topics.cost_breakdown, topics.total_cost)

### Claude's Discretion
- Exact Google Drive iframe embed parameters and sizing
- Upload progress percentage tracking mechanism (Supabase field or webhook polling)
- Recharts color palette and chart styling
- Exact donut chart segment colors for cost stages
- Time range filter implementation details
- Caption preview formatting and scroll height
- Schedule date picker component choice
- Thumbnail regeneration loading state design
- Batch publish dialog checkbox UX details
- Error message formatting for upload failures

</decisions>

<specifics>
## Specific Ideas

- Video Review should feel like the final quality gate — professional, focused, confident
- The approve dialog with Publish Now / Schedule / Approve Only should feel like a launch pad — important moment, clear options
- Upload progress steps should feel like the pass tracker from Script Review — named steps with animated checkmarks
- Published Video Review (read-only) with YouTube embed should feel like a "trophy case" — you built this, here it is
- Analytics charts should use the design system colors — primary blue for main metrics, amber/orange for cost, green for revenue
- Top performer highlight card should feel special — slightly larger, maybe gradient border like the blue-ocean hero from Phase 2
- Cost vs Revenue bar chart should make profitable videos visually obvious — green towering over orange is satisfying
- Quota indicator in sidebar should be subtle unless running low (< 2 remaining = amber warning)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Analytics.jsx`: Has metric card scaffolding (4 primary + 4 secondary metric cards) + chart placeholder — needs real data wiring and chart implementation
- `ProjectDashboard.jsx`: Has financial metrics row (Total Spend, Revenue, ROI, Avg CPM) — needs real data from topics.cost_breakdown
- `PipelineTable.jsx`: Topic status table — needs new badge states and "Review Video" link for assembled topics
- `ConfirmDialog.jsx`: Centered modal with children + variants — reuse for Gate 3 approve/reject dialogs
- `SidePanel.jsx`: Available but not needed — inline edit on metadata panel decided instead
- `useProjectMetrics.js`: Computes project-level metrics from topics — extend with cost aggregation
- `useTopics.js`: Topic data hooks — extend with publish mutations
- `productionApi.js`: Production webhook helpers — extend with publish/analytics endpoints
- `lib/api.js`: webhookCall() helper with Bearer token auth — reuse for all new endpoints
- `useRealtimeSubscription.js`: Realtime hook — reuse for upload progress and analytics updates
- Recharts already in package.json — ready for chart implementation
- CSS: `glass-card`, `badge-*`, `animate-in`, `metric-value`, `card-elevated` all available
- FilterDropdown.jsx: Custom dropdown — reuse for time range filter

### Established Patterns
- Two-column sticky layout (Script Review) — reuse for Video Review
- TanStack Query + Supabase Realtime for live updates
- n8n webhook auth: DASHBOARD_API_TOKEN header check
- JSON envelope responses: { success, data, error }
- Badge system for status indicators (extend with new publish states)
- Glassmorphism UI with glass-card pattern
- React Router 7 unified imports from 'react-router'

### Integration Points
- n8n webhooks needed: /webhook/video/approve, /webhook/video/reject, /webhook/video/publish, /webhook/video/schedule, /webhook/video/batch-publish, /webhook/thumbnail/regenerate, /webhook/analytics/refresh
- n8n cron workflow: daily analytics pull at 6 AM UTC + private→public transitions
- n8n upload workflow: YouTube Data API v3 resumable upload + metadata + captions + thumbnail + playlist
- Supabase tables: topics (video_review_status, youtube_url, youtube_video_id, published_at, yt_* columns), scenes (for caption data)
- New route: /project/:id/topics/:topicId/review — Video Review page
- New hooks: useVideoReview(topicId), useAnalytics(projectId), usePublishMutations()
- YouTube Data API v3: videos.insert (resumable), videos.update (metadata), captions.insert, thumbnails.set, playlistItems.insert, youtube.analytics (reporting)

</code_context>

<deferred>
## Deferred Ideas

- YouTube end screens and cards — v2 enhancement
- Re-upload or un-publish from dashboard — manage on YouTube Studio
- Cross-niche portfolio analytics (compare CPM across niches) — v2 (ANLY-05)
- Content calendar view with scheduling optimization — v2 (ANLY-06)
- A/B testing video titles/thumbnails — v2 (ANLY-07)
- Channel-level analytics (total subscribers, total views) — v2
- Custom date range picker for analytics — v2 if preset ranges prove insufficient

</deferred>

---

*Phase: 05-publish-analytics*
*Context gathered: 2026-03-09*
