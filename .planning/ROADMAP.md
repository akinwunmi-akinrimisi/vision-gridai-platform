# Roadmap: Vision GridAI Platform

## Overview

Build a multi-niche AI video production platform in phases following the strict dependency chain: database + dashboard shell + webhooks first, then niche research and topic generation with Gate 1, then 3-pass script generation with Gate 2, then the full deterministic production pipeline (TTS, images, video, assembly) with supervisor monitoring, then video review Gate 3 with YouTube publishing and analytics, and finally settings and prompt management.

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-03-09) — [Archive](milestones/v1.0-ROADMAP.md)
- [ ] **v1.1 Backend & E2E** — Phases 7-10 — Deploy, harden, build AI agents, validate pipeline

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-09</summary>

- [x] **Phase 1: Foundation** — Dashboard skeleton, Supabase client, webhook API, auth gate (completed 2026-03-08)
- [x] **Phase 2: Niche Research + Topics** — Project creation, niche research page, topic review with Gate 1 (completed 2026-03-08)
- [x] **Phase 3: Script Generation** — Script Review page, 3-pass scoring, Gate 2 approval (completed 2026-03-08)
- [x] **Phase 4: Production Pipeline** — Production Monitor, n8n workflows (TTS, images, video, assembly), supervisor (completed 2026-03-09)
- [x] **Phase 5: Publish + Analytics** — Video Review, Gate 3, YouTube upload, Analytics page (completed 2026-03-09)
- [x] **Phase 6: Polish** — Settings page, prompt editor, per-project configuration (completed 2026-03-09)

**29 plans total | 256 files | 49K LOC**

</details>

### v1.1 Backend & E2E

- [x] **Phase 7: Infrastructure Hardening** — Docker memory limits, PostgreSQL tuning, n8n env vars, dashboard deploy (completed 2026-03-09)
- [x] **Phase 8: Credentials & Deployment** — Production credentials, stub deactivation, workflow import, webhook URL config (completed 2026-03-09)
- [ ] **Phase 9: AI Agent Workflows** — Niche research, prompt generation, topic generation, topic actions, inline editing
- [ ] **Phase 10: End-to-End Validation** — Full pipeline test with US Credit Cards niche through all 3 gates

## Phase Details

### Phase 7: Infrastructure Hardening
**Goal**: VPS runtime is stable and correctly configured for production workloads
**Depends on**: Nothing (first v1.1 phase)
**Requirements**: INFR-01, INFR-02, INFR-03, INFR-04
**Success Criteria** (what must be TRUE):
  1. Docker containers run with explicit memory limits and do not OOM-kill each other under load
  2. PostgreSQL responds to queries using NVMe-optimized settings (shared_buffers 1GB, effective_cache_size 3GB)
  3. n8n accepts workflow executions up to 600s timeout with 2GB heap and 256MB payload limit
  4. Dashboard is accessible via browser at the production URL serving the latest React build
**Plans**: TBD

### Phase 8: Credentials & Deployment
**Goal**: All v1.0 production workflows are running on the n8n server with valid credentials
**Depends on**: Phase 7
**Requirements**: DEPL-01, DEPL-02, DEPL-03, DEPL-04
**Success Criteria** (what must be TRUE):
  1. All six production credentials exist in n8n and pass a manual test call (Anthropic, Supabase, Google TTS, Kie.ai, Drive, YouTube)
  2. No v1.0 stub workflows are active — only full v1.1 implementations respond to webhook paths
  3. All production workflow JSONs are imported, activated, and visible in n8n workflow list
  4. Self-chaining webhook URLs resolve correctly using environment variable expressions (not hardcoded)
**Plans**: 4 plans

Plans:
- [ ] 08-01-PLAN.md — Add N8N_WEBHOOK_BASE + DASHBOARD_API_TOKEN to n8n container env (DEPL-04)
- [ ] 08-02-PLAN.md — Create 4 new n8n credentials, verify 2 existing, record all UUIDs (DEPL-01)
- [ ] 08-03-PLAN.md — Discover stubs, user checkpoint, delete confirmed stubs (DEPL-02)
- [ ] 08-04-PLAN.md — Import 18 workflows in 2 waves, activate, re-link credentials (DEPL-01, DEPL-03)

### Phase 9: AI Agent Workflows
**Goal**: Users can create a project, research a niche, generate topics, and take actions on them from the dashboard
**Depends on**: Phase 8
**Requirements**: AGNT-01, AGNT-02, AGNT-03, AGNT-04, AGNT-05, AGNT-06, AGNT-07, AGNT-08, AGNT-09, DASH-01
**Success Criteria** (what must be TRUE):
  1. Creating a project and triggering research produces a complete niche profile (competitors, pain points, keywords, blue-ocean) visible on the dashboard
  2. Generating topics produces exactly 25 topics and 25 avatars with all required fields, and re-triggering does not create duplicates
  3. Approve, reject, and refine actions update topic status in real-time on the dashboard, with refinement considering all 24 other topics
  4. Inline editing of topic fields (title, hook, avatar data) saves changes without full page reload
  5. All AI workflow failures write error status to Supabase and produce production_log entries visible in the dashboard
**Plans**: 4 plans

Plans:
- [ ] 09-01-PLAN.md — WF_PROJECT_CREATE hardening: timeout 600s, idempotency guard, production_log, error handlers (AGNT-01, AGNT-02, AGNT-03, AGNT-07, AGNT-08)
- [ ] 09-02-PLAN.md — WF_TOPICS_GENERATE hardening: idempotency + force batches, system prompt fix, dedup context, production_log, error handlers (AGNT-04, AGNT-06, AGNT-07, AGNT-08, AGNT-09)
- [ ] 09-03-PLAN.md — WF_TOPICS_ACTION hardening: edit_avatar route, production_log for all actions, refine error handler (AGNT-05, AGNT-07, AGNT-08)
- [ ] 09-04-PLAN.md — Dashboard inline editing: TopicCard edit mode, fix useEditTopic path, useEditAvatar, useRetryResearch, ProjectCard retry button (DASH-01)

### Phase 10: End-to-End Validation
**Goal**: The full pipeline works from niche input to YouTube publish with the US Credit Cards niche
**Depends on**: Phase 9
**Requirements**: E2E-01
**Success Criteria** (what must be TRUE):
  1. A new "US Credit Cards" project completes niche research and displays results on the dashboard
  2. 25 topics pass Gate 1 approval (mix of approve, reject, refine actions all work)
  3. At least one topic completes script generation, passes Gate 2, and enters production pipeline
  4. Production pipeline (TTS, images, video, assembly) completes and the video is reviewable at Gate 3
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 4/4 | Complete | 2026-03-08 |
| 2. Niche Research + Topics | v1.0 | 5/5 | Complete | 2026-03-08 |
| 3. Script Generation | v1.0 | 4/4 | Complete | 2026-03-08 |
| 4. Production Pipeline | v1.0 | 8/8 | Complete | 2026-03-09 |
| 5. Publish + Analytics | v1.0 | 5/5 | Complete | 2026-03-09 |
| 6. Polish | v1.0 | 3/3 | Complete | 2026-03-09 |
| 7. Infrastructure Hardening | v1.1 | 4/4 | Complete | 2026-03-09 |
| 8. Credentials & Deployment | v1.1 | 4/4 | Complete | 2026-03-09 |
| 9. AI Agent Workflows | 3/4 | In Progress|  | - |
| 10. End-to-End Validation | v1.1 | 0/? | Not started | - |
