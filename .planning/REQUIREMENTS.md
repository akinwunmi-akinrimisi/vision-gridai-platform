# Requirements: Vision GridAI Platform

**Defined:** 2026-03-08
**Core Value:** Any niche typed into the dashboard produces publish-ready YouTube videos with full human control at 3 approval gates

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [x] **FNDN-01**: Dashboard skeleton renders with React Router navigation across all 7 page routes
- [x] **FNDN-02**: Supabase JS client initializes and connects to self-hosted Supabase instance
- [x] **FNDN-03**: Reusable Realtime subscription hook (`useRealtimeSubscription`) with proper cleanup on unmount
- [x] **FNDN-04**: TanStack Query data layer with Realtime-triggered cache invalidation
- [x] **FNDN-05**: n8n webhook API layer with endpoints for all dashboard actions (project CRUD, topic actions, production triggers, approvals)
- [x] **FNDN-06**: Simple password gate protecting dashboard access
- [x] **FNDN-07**: Design system applied — colors, typography, spacing per MASTER.md
- [ ] **FNDN-08**: Infrastructure hardened — n8n timeouts configured, PostgreSQL max_connections increased, Docker memory limits set

### Niche Research

- [x] **NICH-01**: User can create a new project by entering a niche name and optional description from the dashboard
- [ ] **NICH-02**: System researches niche via Claude + web search — competitor audit, audience pain points, keyword gaps, blue-ocean analysis
- [ ] **NICH-03**: Research results stored in `niche_profiles` table with structured JSONB fields
- [ ] **NICH-04**: System generates dynamic prompts (system prompt, expertise profile, topic generator, script passes, evaluator) per niche
- [ ] **NICH-05**: Dynamic prompts stored in `prompt_configs` table with versioning
- [ ] **NICH-06**: 3 playlist angles with names and themes generated per niche
- [x] **NICH-07**: Projects Home page displays all projects as cards with status, topic count, spend, and revenue

### Topic Generation

- [ ] **TOPC-01**: User can trigger topic generation (25 topics + 25 avatars) from dashboard
- [ ] **TOPC-02**: Topics generated using blue-ocean methodology with quality benchmarks (2 AM Test, Share Test, Rewatch Test)
- [ ] **TOPC-03**: Each topic includes SEO title, narrative hook, key segments, CPM estimate, viral potential
- [ ] **TOPC-04**: Each avatar includes 10 data points (name/age, occupation, pain point, emotional driver, etc.)
- [x] **TOPC-05**: Topic Review page displays all 25 topics as expandable cards with avatar data
- [x] **TOPC-06**: User can approve individual topics from dashboard (Gate 1)
- [x] **TOPC-07**: User can reject topics with feedback from dashboard
- [x] **TOPC-08**: User can refine topics with custom instructions — system considers all 24 other topics to avoid overlap
- [ ] **TOPC-09**: User can inline edit topic fields (title, hook, avatar data)
- [x] **TOPC-10**: Bulk actions available — approve all, approve by playlist group

### Script Generation

- [x] **SCPT-01**: 3-pass script generation using dynamic prompts from `prompt_configs`
- [x] **SCPT-02**: Pass 1 (Foundation, 5-7K words) generated with topic + avatar data injected
- [x] **SCPT-03**: Pass 2 (Depth, 8-10K words) generated with full Pass 1 as context
- [x] **SCPT-04**: Pass 3 (Resolution, 5-7K words) generated with summaries of Pass 1 + 2
- [x] **SCPT-05**: Per-pass scoring on 7 dimensions — pass below 6.0 regenerated before next pass
- [x] **SCPT-06**: Combined scoring after all 3 passes — below 7.0 triggers weakest pass regeneration
- [x] **SCPT-07**: Max 3 regeneration attempts total, force-pass on attempt 3
- [x] **SCPT-08**: Visual type assignment (static_image/i2v/t2v) by Claude for each scene
- [x] **SCPT-09**: Scene rows inserted into `scenes` table (one row per scene, ~172 per video)
- [x] **SCPT-10**: Script Review page shows full script by chapter, per-pass scores, combined score, visual distribution
- [x] **SCPT-11**: User can approve script from dashboard (Gate 2)
- [x] **SCPT-12**: User can reject script with feedback or refine specific passes

### Production Pipeline

- [x] **PROD-01**: TTS audio generation for all scenes using Google Cloud TTS Chirp 3 HD
- [x] **PROD-02**: Audio duration measured with FFprobe (master clock) — never estimated
- [x] **PROD-03**: Master timeline computed from cumulative audio durations (start_time_ms, end_time_ms per scene)
- [x] **PROD-04**: Image generation for static_image scenes using Kie.ai Seedream 4.5 (100 per video)
- [x] **PROD-05**: I2V clip generation for i2v scenes using Kie.ai Kling 2.1 Standard (25 per video)
- [x] **PROD-06**: T2V clip generation for t2v scenes using Kie.ai Kling 2.1 Standard (72 per video)
- [x] **PROD-07**: Caption/subtitle file generated from scene narration + timestamps
- [x] **PROD-08**: FFmpeg assembly — concat all scene clips with `-c copy` (no re-encoding), add captions, normalize audio
- [x] **PROD-09**: Each asset uploaded to Google Drive immediately after generation
- [x] **PROD-10**: Each scene row in Supabase updated immediately after each asset (not batched)
- [x] **PROD-11**: Self-chaining — each workflow fires the next on completion
- [x] **PROD-12**: Error handling — failures written to Supabase with `status = 'failed'` + `error_log`
- [x] **PROD-13**: Production Monitor page shows real-time scene-by-scene progress via Supabase Realtime
- [x] **PROD-14**: Project Dashboard page shows pipeline status table with all topics, progress bars, and scores

### Publishing

- [x] **PUBL-01**: Video preview page with embedded player (from Google Drive URL)
- [x] **PUBL-02**: Generated YouTube metadata displayed (title, description, tags, chapters)
- [x] **PUBL-03**: Thumbnail preview displayed
- [x] **PUBL-04**: User can approve and publish video (Gate 3)
- [x] **PUBL-05**: User can edit metadata before publishing
- [x] **PUBL-06**: YouTube upload with resumable upload, captions, thumbnail, playlist assignment
- [x] **PUBL-07**: YouTube API quota respected (max 6 uploads/day)

### Analytics

- [x] **ANLY-01**: Daily cron pulls YouTube analytics (views, watch hours, CTR, impressions, likes, comments, subscribers, revenue)
- [x] **ANLY-02**: Analytics data written to `yt_*` columns on topics table
- [x] **ANLY-03**: Analytics page displays per-video performance metrics
- [x] **ANLY-04**: Per-video and per-project cost tracking displayed on dashboard

### Operations

- [x] **OPS-01**: Supervisor agent runs every 30 minutes checking for stuck pipelines
- [x] **OPS-02**: Supervisor can retry workflows, skip scenes, or alert owner based on error type
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
| FNDN-01 | Phase 1 | Complete |
| FNDN-02 | Phase 1 | Complete |
| FNDN-03 | Phase 1 | Complete |
| FNDN-04 | Phase 1 | Complete |
| FNDN-05 | Phase 1 | Complete |
| FNDN-06 | Phase 1 | Complete |
| FNDN-07 | Phase 1 | Complete |
| FNDN-08 | Phase 1 | Pending |
| NICH-01 | Phase 2 | Complete |
| NICH-02 | Phase 2 | Pending |
| NICH-03 | Phase 2 | Pending |
| NICH-04 | Phase 2 | Pending |
| NICH-05 | Phase 2 | Pending |
| NICH-06 | Phase 2 | Pending |
| NICH-07 | Phase 2 | Complete |
| TOPC-01 | Phase 2 | Pending |
| TOPC-02 | Phase 2 | Pending |
| TOPC-03 | Phase 2 | Pending |
| TOPC-04 | Phase 2 | Pending |
| TOPC-05 | Phase 2 | Complete |
| TOPC-06 | Phase 2 | Complete |
| TOPC-07 | Phase 2 | Complete |
| TOPC-08 | Phase 2 | Complete |
| TOPC-09 | Phase 2 | Pending |
| TOPC-10 | Phase 2 | Complete |
| SCPT-01 | Phase 3 | Complete |
| SCPT-02 | Phase 3 | Complete |
| SCPT-03 | Phase 3 | Complete |
| SCPT-04 | Phase 3 | Complete |
| SCPT-05 | Phase 3 | Complete |
| SCPT-06 | Phase 3 | Complete |
| SCPT-07 | Phase 3 | Complete |
| SCPT-08 | Phase 3 | Complete |
| SCPT-09 | Phase 3 | Complete |
| SCPT-10 | Phase 3 | Complete |
| SCPT-11 | Phase 3 | Complete |
| SCPT-12 | Phase 3 | Complete |
| PROD-01 | Phase 4 | Complete |
| PROD-02 | Phase 4 | Complete |
| PROD-03 | Phase 4 | Complete |
| PROD-04 | Phase 4 | Complete |
| PROD-05 | Phase 4 | Complete |
| PROD-06 | Phase 4 | Complete |
| PROD-07 | Phase 4 | Complete |
| PROD-08 | Phase 4 | Complete |
| PROD-09 | Phase 4 | Complete |
| PROD-10 | Phase 4 | Complete |
| PROD-11 | Phase 4 | Complete |
| PROD-12 | Phase 4 | Complete |
| PROD-13 | Phase 4 | Complete |
| PROD-14 | Phase 4 | Complete |
| OPS-01 | Phase 4 | Complete |
| OPS-02 | Phase 4 | Complete |
| PUBL-01 | Phase 5 | Complete |
| PUBL-02 | Phase 5 | Complete |
| PUBL-03 | Phase 5 | Complete |
| PUBL-04 | Phase 5 | Complete |
| PUBL-05 | Phase 5 | Complete |
| PUBL-06 | Phase 5 | Complete |
| PUBL-07 | Phase 5 | Complete |
| ANLY-01 | Phase 5 | Complete |
| ANLY-02 | Phase 5 | Complete |
| ANLY-03 | Phase 5 | Complete |
| ANLY-04 | Phase 5 | Complete |
| OPS-03 | Phase 6 | Pending |
| OPS-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 59 total
- Mapped to phases: 59
- Unmapped: 0

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-08 after roadmap creation*
