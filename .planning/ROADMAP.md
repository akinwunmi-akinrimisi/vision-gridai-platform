# Roadmap: Vision GridAI Platform

## Overview

Build a multi-niche AI video production platform in 6 phases following the strict dependency chain: database + dashboard shell + webhooks first, then niche research and topic generation with Gate 1, then 3-pass script generation with Gate 2, then the full deterministic production pipeline (TTS, images, video, assembly) with supervisor monitoring, then video review Gate 3 with YouTube publishing and analytics, and finally settings and prompt management. Each phase delivers a complete, verifiable capability that unblocks the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Dashboard skeleton, Supabase client, webhook API, auth gate, infrastructure hardening (completed 2026-03-08)
- [ ] **Phase 2: Niche Research + Topics** - Project creation, niche research, topic generation, Gate 1 approval flow
- [ ] **Phase 3: Script Generation** - 3-pass script pipeline with per-pass scoring, scene segmentation, Gate 2 approval flow
- [x] **Phase 4: Production Pipeline** - TTS, images, video clips, FFmpeg assembly, real-time production monitor, supervisor agent (completed 2026-03-09)
- [ ] **Phase 5: Publish + Analytics** - Video preview, Gate 3 approval, YouTube upload, analytics cron, cost tracking
- [ ] **Phase 6: Polish** - Settings page, prompt editor, per-project configuration

## Phase Details

### Phase 1: Foundation
**Goal**: User can open the dashboard, navigate between pages, and see it connected to Supabase with live data wiring ready
**Depends on**: Nothing (first phase)
**Requirements**: FNDN-01, FNDN-02, FNDN-03, FNDN-04, FNDN-05, FNDN-06, FNDN-07, FNDN-08
**Success Criteria** (what must be TRUE):
  1. User can open the dashboard URL in a browser, enter a password, and see a navigation shell with routes for all 7 pages
  2. Dashboard connects to self-hosted Supabase and can read/write data (visible in browser devtools network tab)
  3. Supabase Realtime subscription fires when a row is updated in any tracked table (projects, topics, scenes) and the dashboard reflects the change without page refresh
  4. n8n webhook endpoints accept POST requests from the dashboard and return responses (testable via curl)
  5. Design system colors, typography, and spacing from MASTER.md are visibly applied across all page shells
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md -- Vite scaffold, routing, sidebar, auth gate, design system
- [ ] 01-02-PLAN.md -- Supabase client, TanStack Query, Realtime hook, webhook API
- [ ] 01-03-PLAN.md -- Infrastructure hardening (n8n timeouts, PostgreSQL tuning, Docker memory limits)
- [ ] 01-04-PLAN.md -- n8n webhook stub workflows (status, project/create, topics/generate, topics/action)

### Phase 2: Niche Research + Topics
**Goal**: User can create a project, have it researched automatically, generate 25 topics, and approve/reject/refine them from the dashboard
**Depends on**: Phase 1
**Requirements**: NICH-01, NICH-02, NICH-03, NICH-04, NICH-05, NICH-06, NICH-07, TOPC-01, TOPC-02, TOPC-03, TOPC-04, TOPC-05, TOPC-06, TOPC-07, TOPC-08, TOPC-09, TOPC-10
**Success Criteria** (what must be TRUE):
  1. User can type a niche name on the Projects Home page, click create, and see the system research the niche (competitor audit, pain points, blue-ocean analysis appear in database)
  2. User can trigger topic generation and see 25 topics with avatars appear on the Topic Review page as expandable cards
  3. User can approve, reject (with feedback), refine (with custom instructions that consider all 24 other topics), or inline-edit any topic from the dashboard
  4. Bulk actions work (approve all, approve by playlist group)
  5. Projects Home page shows all projects as cards with status, topic count, and key metrics
**Plans**: 5 plans

Plans:
- [ ] 02-00-PLAN.md -- Wave 0: Vitest test scaffolds for all Phase 2 UI components (5 test files)
- [ ] 02-01-PLAN.md -- Reusable UI components (Modal, SidePanel, ConfirmDialog, SkeletonCard, FilterDropdown), data hooks, route wiring, project-scoped sidebar
- [ ] 02-02-PLAN.md -- Projects Home page with real data, create project modal, n8n project creation + niche research workflow
- [ ] 02-03-PLAN.md -- Niche Research page with blue-ocean hero, competitor cards, pain points, keywords, playlist angles
- [ ] 02-04-PLAN.md -- Topic Review page with Gate 1 approval flow, n8n topic generation + action workflows

### Phase 3: Script Generation
**Goal**: User can trigger script generation for approved topics and review quality-scored scripts before production begins
**Depends on**: Phase 2
**Requirements**: SCPT-01, SCPT-02, SCPT-03, SCPT-04, SCPT-05, SCPT-06, SCPT-07, SCPT-08, SCPT-09, SCPT-10, SCPT-11, SCPT-12
**Success Criteria** (what must be TRUE):
  1. User can start production on an approved topic and see a 3-pass script generated (Foundation, Depth, Resolution) with total word count in the 18K-24K range
  2. Each pass is independently scored on 7 dimensions, and a pass scoring below 6.0 is automatically regenerated before the next pass begins
  3. Script Review page displays the full script organized by chapter, per-pass scores, combined score, visual type distribution, and scene count
  4. User can approve the script (Gate 2), reject it with feedback, or request refinement of specific passes
  5. After script approval, scene rows (~172) exist in the scenes table with visual types assigned (static_image, i2v, t2v)
**Plans**: 4 plans

Plans:
- [ ] 03-00-PLAN.md -- Wave 0: Vitest test scaffolds for Script Review components (5 test files)
- [ ] 03-01-PLAN.md -- Data hooks (useScript, useScenes, useScriptMutations), API helpers, ScorePanel, PassTracker, ForcePassBanner
- [ ] 03-02-PLAN.md -- Script Review page rewrite, ScriptContent, ChapterAccordion, SceneRow, SceneEditForm, ScriptToolbar, TopicCard update
- [ ] 03-03-PLAN.md -- n8n webhook stubs for 3-pass generation, approve, reject, refine, regen-prompts

### Phase 4: Production Pipeline
**Goal**: Approved scripts are automatically produced into assembled videos with real-time scene-level progress visible on the dashboard
**Depends on**: Phase 3
**Requirements**: PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, PROD-06, PROD-07, PROD-08, PROD-09, PROD-10, PROD-11, PROD-12, PROD-13, PROD-14, OPS-01, OPS-02
**Success Criteria** (what must be TRUE):
  1. After script approval, TTS audio generates for all scenes and the master timeline computes cumulative timestamps from FFprobe-measured durations
  2. Images (Seedream 4.5), I2V clips (Kling 2.1), and T2V clips (Kling 2.1) generate for their respective scene types, each uploaded to Google Drive immediately
  3. Production Monitor page shows real-time scene-by-scene progress (172 indicators updating live via Supabase Realtime as each asset completes)
  4. FFmpeg assembles the final video using concat with stream copy (no re-encoding), with captions and normalized audio
  5. Supervisor agent runs every 30 minutes and detects topics stuck for more than 2 hours, with ability to retry or skip
**Plans**: 8 plans

Plans:
- [ ] 04-00-PLAN.md -- Wave 0: Vitest test scaffolds + stub files for all Production Monitor components and hooks
- [ ] 04-01-PLAN.md -- Production API helpers, data hooks (useProductionProgress, useProductionMutations, useProductionLog, useProjectMetrics)
- [ ] 04-02-PLAN.md -- Production Monitor page rewrite with HeroCard, DotGrid, QueueList, FailedScenes, ActivityLog, SupervisorAlert
- [ ] 04-03-PLAN.md -- PipelineTable component, ProjectDashboard rewrite with real metrics, TopicCard production badges
- [ ] 04-04-PLAN.md -- n8n production webhook API + TTS audio generation workflow with master timeline
- [ ] 04-05-PLAN.md -- n8n visual generation workflows: Seedream 4.5 images, Kling 2.1 I2V, Kling 2.1 T2V (sliding window)
- [ ] 04-06-PLAN.md -- n8n captions + FFmpeg assembly workflow (SRT, scene clips, concat, audio normalization)
- [ ] 04-07-PLAN.md -- n8n supervisor agent (30-min cron) + sidebar alert indicators + webhook docs

### Phase 5: Publish + Analytics
**Goal**: User can preview assembled videos, approve for YouTube publishing, and see analytics flow back into the dashboard
**Depends on**: Phase 4
**Requirements**: PUBL-01, PUBL-02, PUBL-03, PUBL-04, PUBL-05, PUBL-06, PUBL-07, ANLY-01, ANLY-02, ANLY-03, ANLY-04
**Success Criteria** (what must be TRUE):
  1. User can preview the assembled video with thumbnail and generated YouTube metadata (title, description, tags, chapters) on the Video Review page
  2. User can approve and publish (Gate 3), edit metadata before publishing, or reject the video
  3. YouTube upload completes with metadata, captions, thumbnail, and correct playlist assignment, respecting the 6-upload daily quota
  4. Analytics page displays per-video YouTube metrics (views, watch hours, CTR, revenue) pulled by a daily cron
  5. Per-video and per-project cost tracking is visible on the dashboard
**Plans**: 5 plans

Plans:
- [ ] 05-00-PLAN.md -- Wave 0: Test scaffolds, stub files, publish/analytics API helpers, data hooks
- [ ] 05-01-PLAN.md -- Video Review page with Gate 3 approval flow, metadata display/editing, video player, upload progress
- [ ] 05-02-PLAN.md -- Analytics page with Recharts charts, metric cards, top performer, sortable performance table
- [ ] 05-03-PLAN.md -- n8n publish webhooks, YouTube upload workflow, batch publish dialog, pipeline status badges
- [ ] 05-04-PLAN.md -- n8n analytics cron workflow, Project Dashboard financial metrics wiring

### Phase 6: Polish
**Goal**: User can configure per-project settings and view/edit dynamic prompts from the dashboard
**Depends on**: Phase 5
**Requirements**: OPS-03, OPS-04
**Success Criteria** (what must be TRUE):
  1. Settings page allows changing per-project configuration (script approach, image/video models, target word count, target scene count, YouTube channel/playlist IDs)
  2. Prompt editor on the Settings page displays all dynamic prompts for the project and allows viewing and editing them
**Plans**: 3 plans

Plans:
- [ ] 06-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete   | 2026-03-08 |
| 2. Niche Research + Topics | 1/5 | Executing | - |
| 3. Script Generation | 3/4 | In Progress|  |
| 4. Production Pipeline | 8/8 | Complete   | 2026-03-09 |
| 5. Publish + Analytics | 0/5 | Not started | - |
| 6. Polish | 0/1 | Not started | - |
