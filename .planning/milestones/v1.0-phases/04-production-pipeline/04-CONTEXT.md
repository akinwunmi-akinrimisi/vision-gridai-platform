# Phase 4: Production Pipeline - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

After script approval (Gate 2), run the full deterministic production pipeline: TTS audio generation (Google Cloud TTS Chirp 3 HD), image generation (Kie.ai Seedream 4.5), I2V + T2V video clip generation (Kie.ai Kling 2.1), SRT caption generation, FFmpeg assembly with audio normalization, Google Drive upload per asset. Real-time scene-by-scene progress visible on the Production Monitor dashboard page. Project Dashboard gets a live pipeline status table. Supervisor agent monitors for stuck pipelines every 30 minutes. Full n8n workflows built and deployed via Synta MCP.

</domain>

<decisions>
## Implementation Decisions

### Production Monitor Page Layout
- Active topic hero card at top: topic title, current stage name, overall % complete, elapsed time, rolling-average ETA, live cost counter with per-stage breakdown and estimated total
- Stage summary chips as horizontal row below hero: Audio, Images, I2V, T2V, Assembly — completed stages show checkmark, active stage gets pulse/glow animation, pending stages dimmed
- Dot grid below stage chips: one dot per scene (172 total), colored by furthest completed stage (gray=pending, blue=audio, cyan=image, purple=video, green=complete, red=failed)
- Dots grouped by chapter with chapter name labels above each row of dots
- Hover tooltip on dots shows: scene number, chapter, per-asset status breakdown (audio/image/video/clip status), audio duration
- Hover only — dots are not clickable
- Queue list below dot grid: compact list of upcoming topics with topic #, title (truncated), position
- Queue shows Remove button per topic (removes from queue, sends back to 'script_approved' status). No reorder — queue follows topic_number order
- Recently Completed section below queue: last 3 completed topics with final cost, duration, scene count
- Collapsible activity log at bottom (collapsed by default): last 10 production_log entries with timestamps
- Stop Production button (red) on active topic card with ConfirmDialog showing cost already spent
- Sidebar route only — no floating mini-widget elsewhere

### Production Monitor Empty State
- "No active production" message with count of approved topics ready
- "Start Production" CTA button that opens confirmation dialog listing topics to be queued with estimated total cost

### Production Completion Behavior
- Auto-advance to next queued topic after brief success animation (all dots green + checkmark, cost/duration summary, 3-5 second display)
- If no more in queue, show empty state with success summary of last completed topic

### Production Trigger & Queue
- Manual trigger per topic — user clicks "Start Production" (no auto-start after Gate 2)
- "Start Production" button available in TWO places: Topic Review cards (for script-approved topics) and Production Monitor (batch start for all approved topics)
- One topic produces at a time, others wait in queue ordered by topic_number
- Queue state tracked via topics.status field: 'queued' = in queue, 'producing' = active
- Every "Start Production" click shows ConfirmDialog with cost estimate breakdown (TTS, images, I2V, T2V per-unit costs from project config)
- Batch trigger from Production Monitor shows list of topics + combined estimated cost
- Starting production from Topic Review redirects to Production Monitor page
- Topic Review banner ("All topics reviewed! Start Production") navigates to Production Monitor (doesn't trigger directly)
- Topic Review cards show production status badge + mini progress bar for topics in production
- Status badges color-coded: Pending(gray), Approved(blue), Scripting(cyan), Script Approved(green), Producing(amber animated), Assembly(purple), Assembled(blue), Published(green), Failed(red)

### Stop, Resume, Restart
- Stop: sets topic.status='stopped' in Supabase. Workflow loops check status before each scene — if stopped, exit cleanly. Completed scenes kept.
- Resume: "Resume Production" button re-fires production/trigger webhook. Workflow reads scene statuses and skips completed assets, continues from first pending scene.
- Restart from Scratch: "Restart from Scratch" button with double confirmation (type 'RESTART'). Deletes all scene assets, resets scene statuses, re-runs from TTS. Warning shows cost already spent.

### Error Recovery
- 3 automatic retries per scene with exponential backoff (30s, 60s, 120s). If all 3 fail, scene marked 'failed' (red dot), pipeline continues to next scene.
- Failed Scenes section on Production Monitor (only visible when failures exist): scene number, user-friendly error summary, expandable raw API error details (API name, error code, prompt text, attempt count)
- Per-scene actions: Retry, Edit & Retry (opens image prompt textarea for editing before retry), Skip
- Batch actions: Retry All Failed, Skip All Failed
- Assembly blocked until all 172 scenes are either 'complete' or 'skipped'. Dashboard shows "N failed scenes must be resolved before assembly" with Retry All / Skip All buttons.
- Warning at 5+ skipped scenes before assembly: "N scenes will be missing. Consider retrying."
- Auto-start assembly if 0 skips. Confirmation dialog if any skips.

### Skipped Scene Handling
- Skipped scenes replaced with black frame + white text card ("[Scene skipped]") for the scene's audio duration. Maintains video length.

### Supervisor Agent (OPS-01, OPS-02)
- n8n cron workflow running every 30 minutes
- Checks for topics stuck in same production stage for >2 hours (based on last_status_change)
- Auto-retries all failed scenes for stuck topic (1 attempt)
- If still stuck after retry: sets supervisor_alerted=true, logs to production_log
- Dashboard alert: toast notification wherever user is + amber warning banner on Production Monitor + sidebar Production link gets amber dot badge
- Alert auto-dismisses when all failed scenes resolved (supervisor_alerted resets to false)

### Project Dashboard Pipeline Table (PROD-14)
- Live-updating table with Supabase Realtime subscription on topics table
- Columns: topic #, title (truncated), playlist angle, status badge, progress %, score, views, revenue
- Real-time status and progress updates as production progresses

### n8n Workflow Architecture
- Full n8n workflow JSONs (not contract stubs) — built AND deployed via Synta MCP
- Pipeline: TTS sequential first (audio = master clock), then Images + I2V + T2V in parallel, then Captions + Assembly
- Self-chaining via webhook calls (not Execute Workflow node) — each workflow fires next via HTTP POST
- TTS processes scenes sequentially one at a time (fast ~2s/scene, needs cumulative timeline)
- Kie.ai (images, I2V, T2V) uses sliding window batching: 5 concurrent submissions, poll results, replace completed with next scene
- Parallel visual completion sync: each visual workflow checks Supabase after finishing — if ALL visual scenes done, last one to finish fires captions + assembly
- Single production trigger webhook (POST /production/trigger): validates topic, creates Drive folders, sets status='audio', fires TTS
- Supabase state-driven stop/resume: workflows check topic.status before each scene, 'stopped' causes clean exit
- Queue auto-advance: on topic completion, query for next topic with status='queued', fire trigger webhook

### Drive Upload & Storage
- Immediate upload after each asset: generate → upload to Drive → update Supabase scene row
- Per-topic subfolder structure on Google Drive: /Project Name/Topic NN - Title/audio/, images/, video_clips/, captions/, final/
- Drive folder IDs stored in topics.drive_subfolder_ids JSONB
- Local temp files on VPS at /tmp/production/{topic_id}/ — cleanup after successful final upload

### FFmpeg Assembly
- Pre-build individual scene clips, then concat (not single-pass complex filter)
- Static image scenes: display image for audio duration (no zoompan, static)
- Video scenes (I2V/T2V): loop clip if audio > 5s, trim if audio < 5s. FFmpeg -stream_loop and -t flags.
- Concat with -c copy (no re-encoding) — fast, avoids OOM on 2hr videos
- Audio normalization on final video only: loudnorm=I=-16:TP=-1.5:LRA=11
- Captions: BOTH SRT file (for YouTube upload in Phase 5) AND optional burn-in to video

### Cost Tracking
- Workflows compute and write costs to Supabase after each asset
- topics.cost_breakdown JSONB updated incrementally: { script, tts, images, i2v, t2v }
- topics.total_cost decimal updated incrementally
- Dashboard reads pre-computed values from Supabase (no client-side calculation)

### Production Logging
- Key milestones only: stage start/end, failures, retries, skips, assembly start/end, final upload
- NOT individual scene completions (that data lives in scenes table)
- Logged to production_log table with project_id, topic_id, stage, action, details JSONB

### Topic Status Flow (Phase 4)
- queued → audio → images (parallel: images + i2v + t2v) → assembling → assembled
- 'assembled' = terminal state for Phase 4. Gate 3 video review added in Phase 5.
- 'stopped' = paused by user, can resume
- 'failed' = irrecoverable failure (manual intervention needed)

### Claude's Discretion
- Exact dot grid dimensions and responsive breakpoints
- Activity log entry format and timestamp styling
- Toast notification styling for supervisor alerts
- Kie.ai API polling interval and batch size tuning
- FFmpeg encoding parameters for scene clips (resolution, bitrate, codec)
- Caption burn-in styling (font, size, position, background)
- Error message categorization logic (which API errors map to which user-friendly messages)
- Exact ETA rolling average window size
- Success animation design (confetti vs checkmark vs both)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProductionMonitor.jsx`: Skeleton page with hardcoded stages and 60-dot grid placeholder — needs full rewrite with real data
- `ProjectDashboard.jsx`: Metrics grid placeholder — needs pipeline status table with real data
- `useRealtimeSubscription.js`: Established Realtime pattern with TanStack Query invalidation — reuse for scene + topic subscriptions
- `useScenes.js`: Scene fetch hook with Realtime — extend for production progress queries
- `useTopics.js`: Topic hooks with optimistic updates — extend with production mutations
- `lib/api.js`: webhookCall() helper — extend with production endpoints
- `ConfirmDialog.jsx`: Centered modal with children + variants (success/danger/primary) — reuse for all production confirmations
- `SidePanel.jsx`: Right-side slide panel — reuse if needed for scene edit & retry
- `SkeletonCard.jsx`: Loading placeholder — reuse for production loading states
- CSS: `glass-card`, `badge-*`, `animate-in`, `animate-shimmer`, `metric-value` all available
- TopicCard.jsx: Already has script status badges pattern — extend with production status + mini progress bar
- Existing n8n webhook workflow JSONs (WF_WEBHOOK_STATUS, WF_WEBHOOK_PROJECT_CREATE, WF_WEBHOOK_TOPICS_GENERATE, WF_WEBHOOK_TOPICS_ACTION) — use as templates for production webhook patterns

### Established Patterns
- TanStack Query + Supabase Realtime for live updates (same as topics/scripts)
- n8n webhook auth: DASHBOARD_API_TOKEN header check via IF node
- JSON envelope responses: { success, data, error }
- Optimistic updates with onMutate/onError/onSettled
- Glassmorphism UI with glass-card pattern
- Badge system for status indicators
- React Router 7 unified imports from 'react-router'

### Integration Points
- n8n webhooks needed: /webhook/production/trigger, /webhook/production/stop, /webhook/production/retry, /webhook/production/skip, /webhook/production/tts, /webhook/production/images, /webhook/production/i2v, /webhook/production/t2v, /webhook/production/captions, /webhook/production/assembly
- Supabase tables: topics (status, cost_breakdown, total_cost, drive_subfolder_ids), scenes (audio_status, image_status, video_status, clip_status, audio_duration_ms, start_time_ms, end_time_ms, *_drive_id), production_log
- New hooks: useProductionProgress(projectId), useProjectMetrics(projectId), production mutation hooks
- Synta MCP tools for workflow deployment: n8n_create_workflow, n8n_validate_workflow, n8n_test_workflow
- Google Drive API for folder creation + file upload (via n8n Google Drive node or HTTP Request)
- Google Cloud TTS API for Chirp 3 HD voiceover (via n8n HTTP Request node)
- Kie.ai API for image + video generation (async POST + poll pattern)
- FFmpeg + FFprobe in n8n Docker container for audio measurement + video assembly

</code_context>

<specifics>
## Specific Ideas

- Dot grid should feel like a GitHub contribution graph — compact, colorful, satisfying to watch fill in
- Chapter labels on dot grid make it feel like watching a book being written in real-time
- Active stage pulse animation should be subtle — a soft glow, not a strobe
- The cost counter incrementing in real-time should feel like watching a meter — satisfying, not alarming
- Success animation when topic completes should be brief and rewarding — all dots turning green is its own visual payoff
- Failed scene section should feel actionable, not scary — clear error messages, obvious retry/skip buttons
- The queue list should feel like a playlist — ordered, simple, with easy remove
- Supervisor alerts should be noticeable but not panic-inducing — amber, not red
- Static images displayed without motion (no Ken Burns/zoompan) — clean, still frames

</specifics>

<deferred>
## Deferred Ideas

- Auto-start production after Gate 2 approval — keep manual for v1 (AUTO-01)
- Concurrent multi-topic production (2-3 at once) — consider for v2 when API limits are better understood
- Drag-and-drop queue reordering — Phase 6 polish if needed
- Per-scene zoompan/Ken Burns effects on static images — v2 enhancement
- Speed-adjusted video clips (instead of loop/trim) — v2 if loop artifacts are noticeable
- Production priority ordering beyond topic_number — v2
- In-browser video preview during assembly — Phase 5 has video review
- Cost budget limits / auto-stop at cost threshold — v2

</deferred>

---

*Phase: 04-production-pipeline*
*Context gathered: 2026-03-08*
