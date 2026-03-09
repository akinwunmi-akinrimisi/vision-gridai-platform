# Requirements: Vision GridAI Platform

**Defined:** 2026-03-09
**Core Value:** Any niche typed into the dashboard produces publish-ready YouTube videos with full human control at 3 approval gates

## v1.1 Requirements

Requirements for v1.1 Backend & E2E milestone. Closes v1.0 known gaps.

### Infrastructure

- [x] **INFR-01**: Docker memory limits set for all containers (n8n 4GB, supabase-db 4GB, realtime 1GB, rest 512MB)
- [x] **INFR-02**: PostgreSQL tuned for NVMe VPS (shared_buffers 1GB, effective_cache_size 3GB, random_page_cost 1.1, shm_size 256m)
- [x] **INFR-03**: n8n environment variables configured (EXECUTIONS_TIMEOUT=600, NODE_OPTIONS=--max-old-space-size=2048, N8N_PAYLOAD_SIZE_MAX=256, binary data pruning enabled)
- [x] **INFR-04**: Dashboard built and deployed to Nginx root on VPS

### Credentials & Deployment

- [x] **DEPL-01**: n8n production credentials created (Anthropic API key, Supabase service role, Google Cloud TTS, Kie.ai API, Google Drive OAuth, YouTube OAuth)
- [x] **DEPL-02**: v1.0 stub workflows deactivated to clear webhook path collisions
- [x] **DEPL-03**: All v1.0 production workflow JSONs imported and activated in n8n (status, production, publish, settings, supervisor, analytics)
- [x] **DEPL-04**: Webhook URLs use $env.N8N_WEBHOOK_BASE expressions (not hardcoded URLs) for self-chaining

### AI Agent Workflows

- [x] **AGNT-01**: Niche research workflow calls Claude API with web_search_20250305 tool via HTTP Request node (timeout 300s, max_uses 10)
- [x] **AGNT-02**: Niche research writes structured results to niche_profiles table (competitor_analysis, pain_points, keywords, blue_ocean as JSONB)
- [x] **AGNT-03**: Dynamic prompt generation creates 7 prompt types per niche in prompt_configs table with version tracking
- [x] **AGNT-04**: Topic generation workflow produces 25 topics + 25 avatars using niche-specific prompts with blue-ocean methodology
- [x] **AGNT-05**: Topic action workflow handles approve/reject/refine with all-24-topics context for refinement
- [x] **AGNT-06**: Idempotency guards prevent duplicate topic/avatar creation on re-trigger
- [x] **AGNT-07**: All AI workflows write production_log entries for dashboard activity tracking
- [x] **AGNT-08**: Error handlers connected on all failure branches with status written to Supabase
- [x] **AGNT-09**: System prompt loaded from projects.niche_system_prompt (not substring hack)

### Dashboard

- [ ] **DASH-01**: Inline editing of topic fields (title, hook, avatar data) on Topic Review page

### Validation

- [ ] **E2E-01**: Full pipeline test with US Credit Cards niche: create project → research → topics → Gate 1 approve → script generation → Gate 2 approve → TTS → images → video → assembly → Gate 3 → publish

## v2 Requirements

Deferred to future release.

- **SRCH-01**: Upgrade to web_search_20260209 for dynamic filtering and lower token cost
- **AGNT-10**: pause_turn loop handling for extensive research sessions (10+ searches)
- **COST-01**: Per-workflow cost tracking with Anthropic API usage aggregation

## Out of Scope

| Feature | Reason |
|---------|--------|
| Streaming research progress to dashboard | Over-engineering; Supabase Realtime status updates sufficient |
| User-specified search queries | AI agent should decide queries; user controls via niche description |
| Automatic topic regeneration on low quality | User controls quality via Gate 1 approval flow |
| n8n AI Agent node (built-in) | HTTP Request node gives more control over tool_use config |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFR-01 | Phase 7 | Complete |
| INFR-02 | Phase 7 | Complete |
| INFR-03 | Phase 7 | Complete |
| INFR-04 | Phase 7 | Complete |
| DEPL-01 | Phase 8 | Complete |
| DEPL-02 | Phase 8 | Complete |
| DEPL-03 | Phase 8 | Complete |
| DEPL-04 | Phase 8 | Complete |
| AGNT-01 | Phase 9 | Complete |
| AGNT-02 | Phase 9 | Complete |
| AGNT-03 | Phase 9 | Complete |
| AGNT-04 | Phase 9 | Complete |
| AGNT-05 | Phase 9 | Complete |
| AGNT-06 | Phase 9 | Complete |
| AGNT-07 | Phase 9 | Complete |
| AGNT-08 | Phase 9 | Complete |
| AGNT-09 | Phase 9 | Complete |
| DASH-01 | Phase 9 | Pending |
| E2E-01 | Phase 10 | Pending |

**Coverage:**
- v1.1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-03-09*
*Last updated: 2026-03-09 after roadmap creation*
