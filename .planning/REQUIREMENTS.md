# Requirements: Vision GridAI Platform

**Defined:** 2026-03-08
**Core Value:** Any niche typed into the dashboard produces publish-ready YouTube videos with full human control at 3 approval gates

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [ ] **FNDN-01**: Dashboard skeleton renders with React Router navigation across all 7 page routes
- [ ] **FNDN-02**: Supabase JS client initializes and connects to self-hosted Supabase instance
- [ ] **FNDN-03**: Reusable Realtime subscription hook (`useRealtimeSubscription`) with proper cleanup on unmount
- [ ] **FNDN-04**: TanStack Query data layer with Realtime-triggered cache invalidation
- [ ] **FNDN-05**: n8n webhook API layer with endpoints for all dashboard actions (project CRUD, topic actions, production triggers, approvals)
- [ ] **FNDN-06**: Simple password gate protecting dashboard access
- [ ] **FNDN-07**: Design system applied — colors, typography, spacing per MASTER.md
- [ ] **FNDN-08**: Infrastructure hardened — n8n timeouts configured, PostgreSQL max_connections increased, Docker memory limits set

### Niche Research

- [ ] **NICH-01**: User can create a new project by entering a niche name and optional description from the dashboard
- [ ] **NICH-02**: System researches niche via Claude + web search — competitor audit, audience pain points, keyword gaps, blue-ocean analysis
- [ ] **NICH-03**: Research results stored in `niche_profiles` table with structured JSONB fields
- [ ] **NICH-04**: System generates dynamic prompts (system prompt, expertise profile, topic generator, script passes, evaluator) per niche
- [ ] **NICH-05**: Dynamic prompts stored in `prompt_configs` table with versioning
- [ ] **NICH-06**: 3 playlist angles with names and themes generated per niche
- [ ] **NICH-07**: Projects Home page displays all projects as cards with status, topic count, spend, and revenue

### Topic Generation

- [ ] **TOPC-01**: User can trigger topic generation (25 topics + 25 avatars) from dashboard
- [ ] **TOPC-02**: Topics generated using blue-ocean methodology with quality benchmarks (2 AM Test, Share Test, Rewatch Test)
- [ ] **TOPC-03**: Each topic includes SEO title, narrative hook, key segments, CPM estimate, viral potential
- [ ] **TOPC-04**: Each avatar includes 10 data points (name/age, occupation, pain point, emotional driver, etc.)
- [ ] **TOPC-05**: Topic Review page displays all 25 topics as expandable cards with avatar data
- [ ] **TOPC-06**: User can approve individual topics from dashboard (Gate 1)
- [ ] **TOPC-07**: User can reject topics with feedback from dashboard
- [ ] **TOPC-08**: User can refine topics with custom instructions — system considers all 24 other topics to avoid overlap
- [ ] **TOPC-09**: User can inline edit topic fields (title, hook, avatar data)
- [ ] **TOPC-10**: Bulk actions available — approve all, approve by playlist group

### Script Generation

- [ ] **SCPT-01**: 3-pass script generation using dynamic prompts from `prompt_configs`
- [ ] **SCPT-02**: Pass 1 (Foundation, 5-7K words) generated with topic + avatar data injected
- [ ] **SCPT-03**: Pass 2 (Depth, 8-10K words) generated with full Pass 1 as context
- [ ] **SCPT-04**: Pass 3 (Resolution, 5-7K words) generated with summaries of Pass 1 + 2
- [ ] **SCPT-05**: Per-pass scoring on 7 dimensions — pass below 6.0 regenerated before next pass
- [ ] **SCPT-06**: Combined scoring after all 3 passes — below 7.0 triggers weakest pass regeneration
- [ ] **SCPT-07**: Max 3 regeneration attempts total, force-pass on attempt 3
- [ ] **SCPT-08**: Visual type assignment (static_image/i2v/t2v) by Claude for each scene
- [ ] **SCPT-09**: Scene rows inserted into `scenes` table (one row per scene, ~172 per video)
- [ ] **SCPT-10**: Script Review page shows full script by chapter, per-pass scores, combined score, visual distribution
- [ ] **SCPT-11**: User can approve script from dashboard (Gate 2)
- [ ] **SCPT-12**: User can reject script with feedback or refine specific passes

### Production Pipeline

- [ ] **PROD-01**: TTS audio generation for all scenes using Google Cloud TTS Chirp 3 HD
- [ ] **PROD-02**: Audio duration measured with FFprobe (master clock) — never estimated
- [ ] **PROD-03**: Master timeline computed from cumulative audio durations (start_time_ms, end_time_ms per scene)
- [ ] **PROD-04**: Image generation for static_image scenes using Kie.ai Seedream 4.5 (100 per video)
- [ ] **PROD-05**: I2V clip generation for i2v scenes using Kie.ai Kling 2.1 Standard (25 per video)
- [ ] **PROD-06**: T2V clip generation for t2v scenes using Kie.ai Kling 2.1 Standard (72 per video)
- [ ] **PROD-07**: Caption/subtitle file generated from scene narration + timestamps
- [ ] **PROD-08**: FFmpeg assembly — concat all scene clips with `-c copy` (no re-encoding), add captions, normalize audio
- [ ] **PROD-09**: Each asset uploaded to Google Drive immediately after generation
- [ ] **PROD-10**: Each scene row in Supabase updated immediately after each asset (not batched)
- [ ] **PROD-11**: Self-chaining — each workflow fires the next on completion
- [ ] **PROD-12**: Error handling — failures written to Supabase with `status = 'failed'` + `error_log`
- [ ] **PROD-13**: Production Monitor page shows real-time scene-by-scene progress via Supabase Realtime
- [ ] **PROD-14**: Project Dashboard page shows pipeline status table with all topics, progress bars, and scores

### Publishing

- [ ] **PUBL-01**: Video preview page with embedded player (from Google Drive URL)
- [ ] **PUBL-02**: Generated YouTube metadata displayed (title, description, tags, chapters)
- [ ] **PUBL-03**: Thumbnail preview displayed
- [ ] **PUBL-04**: User can approve and publish video (Gate 3)
- [ ] **PUBL-05**: User can edit metadata before publishing
- [ ] **PUBL-06**: YouTube upload with resumable upload, captions, thumbnail, playlist assignment
- [ ] **PUBL-07**: YouTube API quota respected (max 6 uploads/day)

### Analytics

- [ ] **ANLY-01**: Daily cron pulls YouTube analytics (views, watch hours, CTR, impressions, likes, comments, subscribers, revenue)
- [ ] **ANLY-02**: Analytics data written to `yt_*` columns on topics table
- [ ] **ANLY-03**: Analytics page displays per-video performance metrics
- [ ] **ANLY-04**: Per-video and per-project cost tracking displayed on dashboard

### Operations

- [ ] **OPS-01**: Supervisor agent runs every 30 minutes checking for stuck pipelines
- [ ] **OPS-02**: Supervisor can retry workflows, skip scenes, or alert owner based on error type
- [ ] **OPS-03**: Settings page allows per-project config (script approach, image/video models, word count, scene count)
- [ ] **OPS-04**: Settings page includes prompt editor for viewing/editing dynamic prompts

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Multi-Format

- **FMT-01**: Support YouTube Shorts format (< 60 seconds, vertical)
- **FMT-02**: Support 10-minute explainer format

### Team Features

- **TEAM-01**: Invite-based team access with role permissions
- **TEAM-02**: Supabase Row Level Security for multi-user data isolation

### Advanced Analytics

- **ANLY-05**: Cross-niche portfolio analytics (compare CPM, revenue, ROI across niches)
- **ANLY-06**: Content calendar view with scheduling optimization
- **ANLY-07**: A/B testing video titles/thumbnails

### Automation

- **AUTO-01**: Auto-approve toggle per gate (after manually approving 5+ items)
- **AUTO-02**: Production queue with priority ordering

## Out of Scope

| Feature | Reason |
|---------|--------|
| In-browser video editor | Massive complexity, FFmpeg re-encoding OOM risk, professional editors exist |
| AI chatbot for niche strategy | Unstructured chat produces inconsistent outputs; structured pipeline is better |
| Real-time collaboration | Auth complexity, WebSocket scaling — solo operator for v1 |
| Custom video templates | Each format needs different structure; ship 2hr documentary first |
| Mobile native app | Web-first; responsive layout in Phase 6 is sufficient |
| Thumbnail editor in dashboard | Image editing UI is complex; generate + preview + external edit |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FNDN-01 | — | Pending |
| FNDN-02 | — | Pending |
| FNDN-03 | — | Pending |
| FNDN-04 | — | Pending |
| FNDN-05 | — | Pending |
| FNDN-06 | — | Pending |
| FNDN-07 | — | Pending |
| FNDN-08 | — | Pending |
| NICH-01 | — | Pending |
| NICH-02 | — | Pending |
| NICH-03 | — | Pending |
| NICH-04 | — | Pending |
| NICH-05 | — | Pending |
| NICH-06 | — | Pending |
| NICH-07 | — | Pending |
| TOPC-01 | — | Pending |
| TOPC-02 | — | Pending |
| TOPC-03 | — | Pending |
| TOPC-04 | — | Pending |
| TOPC-05 | — | Pending |
| TOPC-06 | — | Pending |
| TOPC-07 | — | Pending |
| TOPC-08 | — | Pending |
| TOPC-09 | — | Pending |
| TOPC-10 | — | Pending |
| SCPT-01 | — | Pending |
| SCPT-02 | — | Pending |
| SCPT-03 | — | Pending |
| SCPT-04 | — | Pending |
| SCPT-05 | — | Pending |
| SCPT-06 | — | Pending |
| SCPT-07 | — | Pending |
| SCPT-08 | — | Pending |
| SCPT-09 | — | Pending |
| SCPT-10 | — | Pending |
| SCPT-11 | — | Pending |
| SCPT-12 | — | Pending |
| PROD-01 | — | Pending |
| PROD-02 | — | Pending |
| PROD-03 | — | Pending |
| PROD-04 | — | Pending |
| PROD-05 | — | Pending |
| PROD-06 | — | Pending |
| PROD-07 | — | Pending |
| PROD-08 | — | Pending |
| PROD-09 | — | Pending |
| PROD-10 | — | Pending |
| PROD-11 | — | Pending |
| PROD-12 | — | Pending |
| PROD-13 | — | Pending |
| PROD-14 | — | Pending |
| PUBL-01 | — | Pending |
| PUBL-02 | — | Pending |
| PUBL-03 | — | Pending |
| PUBL-04 | — | Pending |
| PUBL-05 | — | Pending |
| PUBL-06 | — | Pending |
| PUBL-07 | — | Pending |
| ANLY-01 | — | Pending |
| ANLY-02 | — | Pending |
| ANLY-03 | — | Pending |
| ANLY-04 | — | Pending |
| OPS-01 | — | Pending |
| OPS-02 | — | Pending |
| OPS-03 | — | Pending |
| OPS-04 | — | Pending |

**Coverage:**
- v1 requirements: 59 total
- Mapped to phases: 0
- Unmapped: 59 ⚠️

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-08 after initial definition*
