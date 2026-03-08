# Project Research Summary

**Project:** Vision GridAI Platform
**Domain:** Multi-niche AI video production with dashboard orchestration
**Researched:** 2026-03-08
**Confidence:** HIGH

## Executive Summary

Vision GridAI is a multi-service platform that automates the production of 2-hour documentary-style YouTube videos from niche research through publishing. The architecture follows a well-established pattern: a React SPA dashboard reads from a Supabase PostgreSQL database (with Realtime for live updates) and writes mutations through n8n webhook endpoints that orchestrate the full pipeline. The pipeline is a chain of independent n8n workflows -- each one fires the next on completion -- that call external APIs (Anthropic Claude for scripts, Google TTS for voiceover, Kie.ai for images/video, YouTube for publishing) and write every result to Supabase immediately. This is not a novel architecture; the individual pieces are battle-tested. The novelty is in the domain application: dynamic niche research via web search, 3-pass script generation with per-pass scoring, and a 172-scene assembly pipeline with 3 human approval gates.

The recommended approach is a strict 6-phase build following the dependency chain: Foundation (Supabase schema + dashboard skeleton + webhook API) must come first because everything reads from and writes to the database. Then Niche Research + Topics (the differentiating feature), Scripts, Production Pipeline (the longest and most integration-heavy phase), Publish + Analytics, and finally Polish. The stack is locked: React 18, Tailwind CSS 3.4 (NOT v4), Vite 6, TanStack Query for server state, Supabase JS client for Realtime, and Recharts for visualization. All versions are verified current and compatible.

The top risks are infrastructure-level: FFmpeg OOM during 2-hour video assembly (mitigated by stream-copy concat, never re-encoding), Supabase PostgreSQL connection exhaustion on the self-hosted VPS (mitigated by increasing max_connections and using Supavisor), Kie.ai async polling creating a thundering herd (mitigated by callbacks or batch polling), and silent pipeline stalls when self-chaining workflows fail to fire the next step (mitigated by a Supervisor Agent that should be built in Phase 4, not deferred to Phase 6). All critical pitfalls have known prevention strategies with clear verification criteria.

## Key Findings

### Recommended Stack

The stack is mature and high-confidence across the board. React 18.2 (not 19), Vite 6 (requires Node 20.19+), and Tailwind CSS 3.4 (explicitly NOT v4 due to breaking changes that would break the pre-generated design system). TanStack Query v5 handles server state with Supabase Realtime invalidation -- when a Realtime event fires, invalidate queries and let TanStack refetch cleanly rather than manually merging payloads.

**Core technologies:**
- **React 18 + Vite 6 + Tailwind 3.4:** Dashboard SPA served by Nginx. Stable, no bleeding-edge risk.
- **@supabase/supabase-js 2.98 + TanStack Query 5:** Database reads via REST, live updates via Realtime WebSocket, mutations through n8n webhooks. Query invalidation pattern eliminates manual state management.
- **n8n (self-hosted Docker):** Workflow orchestration with webhook triggers, HTTP Request nodes for all Supabase and external API calls. 17 modular workflows, 5-10 nodes each.
- **Supabase (self-hosted PostgreSQL 15):** Source of truth. PostgREST for REST API, Realtime via WAL replication for live dashboard updates. No RLS needed for solo user.
- **FFmpeg 6 (in n8n Docker):** Scene clip creation (zoompan + audio overlay) and concat assembly. Must use `-c copy` for concat to avoid OOM.
- **Kie.ai:** Single gateway to Seedream 4.5 (images, $0.032/each) and Kling 2.1 Standard (video clips, $0.125/each). Async task model.
- **Claude Sonnet (Anthropic API direct):** 3-pass script generation, niche research with web search, topic generation, script evaluation.
- **Recharts 3.8 + Lucide React:** Charts for analytics/scores and icons. Both tree-shakeable.

**Critical version constraint:** Tailwind must stay on v3.4. The design system at `design-system/MASTER.md` was generated for v3 class syntax. Tailwind v4 has incompatible changes (CSS-first config, removed utilities, changed defaults).

### Expected Features

**Must have (table stakes):**
- Project/niche CRUD and pipeline status visibility
- 3 approval gates (topics, scripts, video) with approve/reject/refine actions
- Script quality scoring display (7-dimension radar/bar chart)
- Scene-level progress tracking (172 dots/cells with Realtime updates)
- YouTube upload with metadata, captions, thumbnails
- Per-video cost tracking and basic YouTube analytics
- Error state visibility with retry capability
- Production log / audit trail

**Should have (differentiators):**
- Dynamic niche research via live web search (competitor audit, Reddit pain points, blue-ocean analysis) -- this is the moat
- AI-generated dynamic prompts per niche (stored in prompt_configs, not hardcoded)
- 3-pass script generation with independent per-pass scoring
- Topic refinement with full 24-topic context to prevent overlap
- Real-time scene-by-scene production monitor via Supabase Realtime
- Multi-niche portfolio management with cross-niche analytics
- Supervisor agent for automated pipeline health monitoring

**Defer (v2+):**
- In-browser video editing, multi-format templates (Shorts, 10-min), team access / multi-user, mobile responsive, A/B testing, content calendar, auto-approve toggle

### Architecture Approach

The architecture enforces a clean separation: the dashboard reads from Supabase and writes through n8n. N8n owns all business logic, self-chains between pipeline stages via webhook calls, and writes every result to Supabase immediately (no batch writes). Supabase Realtime pushes changes to the dashboard in sub-second latency. No polling anywhere.

**Major components:**
1. **React SPA** -- UI layer, approval gates, monitoring. Reads from Supabase (REST + Realtime), writes through n8n webhooks.
2. **n8n Docker** -- Pipeline orchestration. 17 self-chaining workflows. Owns business logic, credentials, retry state. Calls all external APIs.
3. **Supabase PostgreSQL** -- Source of truth. 7 tables (projects, topics, scenes, avatars, niche_profiles, prompt_configs, production_log). Realtime via WAL replication.
4. **Nginx** -- Reverse proxy. Serves React build, proxies `/webhook/` to n8n, upgrades WebSocket for Realtime.
5. **FFmpeg** -- Video/audio processing inside n8n Docker container. Scene clips + concat assembly.

**Key architectural decisions:**
- Dashboard never writes to Supabase for pipeline actions (prevents split-brain)
- No optimistic updates (200ms latency is acceptable for solo user; avoids rollback complexity)
- Each workflow writes status to Supabase BEFORE firing the next workflow (enables supervisor detection of stalls)
- All media stored on Google Drive; only IDs/URLs in Supabase (keeps rows small, avoids 8KB NOTIFY limit)

### Critical Pitfalls

1. **FFmpeg OOM on 2-hour assembly** -- Use concat demuxer with `-c copy` (stream copy), never the concat filter. Set Docker memory limits to 4GB. Process scene clips individually, then concat. Verification: assembly completes in <5 minutes using <500MB RAM.

2. **Kie.ai polling thundering herd** -- 97 concurrent polling loops at 5s intervals overwhelm the 20 req/10s rate limit. Use Kie.ai callback webhooks instead of polling. If callbacks are unreliable, use a single batch-poller workflow every 60 seconds. Stagger generation requests in batches of 10-15.

3. **Supabase Realtime memory leaks in React** -- Orphaned WebSocket channels from navigation accumulate ~800KB each. Build a `useRealtimeSubscription` hook in Phase 1 that always cleans up channels. Never use raw supabase.channel() in components.

4. **n8n workflow timeouts** -- Three timeout layers (Nginx 60s, n8n HTTP node 30s, workflow 3600s) all misconfigured by default. Use "Respond Immediately" on webhook nodes. Set HTTP node timeout to 300s. Set workflow timeout to 7200s. Dashboard monitors via Realtime, not webhook response.

5. **Self-chaining pipeline stalls silently** -- If the webhook call to the next workflow fails, the pipeline stops and nobody knows. Enable retry-on-fail (3x exponential backoff) on all chain-forward HTTP calls. Build the Supervisor Agent in Phase 4 (not Phase 6) to detect topics stuck >2 hours.

6. **PostgreSQL connection exhaustion** -- Self-hosted Supabase consumes 50+ connections by default. Increase max_connections to 200, set PostgREST pool to 20, use Supavisor in transaction mode. Monitor via pg_stat_activity.

7. **YouTube API quota exhaustion** -- 10K units/day shared between uploads (1,600 each) and analytics. Use `videos.list` (1 unit) instead of `search.list` (100 units) for analytics. Cap uploads at 5/day. Track quota usage in Supabase.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation
**Rationale:** Everything depends on the database schema, the dashboard shell, and the webhook API. Architecture research confirms these are the three foundational components with zero alternatives to ordering.
**Delivers:** Deployed Supabase schema (7 tables with REPLICA IDENTITY FULL), React dashboard skeleton (routing, Supabase client, auth gate, useRealtimeSubscription hook), n8n webhook API layer with "Respond Immediately" pattern.
**Addresses:** Project CRUD, pipeline status visibility, Supabase Realtime wiring, simple password gate.
**Avoids:** Realtime memory leaks (hook built here), n8n timeouts (configured here), PostgreSQL connection exhaustion (configured here). Also: set Docker memory limits, configure n8n execution timeouts, set up daily pg_dump backups.

### Phase 2: Niche Research + Topics
**Rationale:** This is the first differentiator and the start of the pipeline dependency chain. Cannot build scripts without topics, cannot generate topics without niche research.
**Delivers:** Phase A workflows (project creation, niche research with web search, dynamic prompt generation), Phase B workflows (topic + avatar generation), Topic Review page with Gate 1 (approve/reject/refine/edit), first Supabase Realtime usage (topic status updates).
**Uses:** Claude Sonnet with web search tool, Supabase REST via n8n HTTP Request nodes, React dashboard components.
**Implements:** Self-chaining pattern (first use), dynamic prompt system (prompt_configs table).

### Phase 3: Script Generation
**Rationale:** Depends on topics table being populated. Scripts are the input to all production stages. Contains the complex 3-pass generation + per-pass scoring logic.
**Delivers:** WF03 (3-pass script generation), WF04 (scene segmentation + visual type assignment), Script Review page with Gate 2, Production Monitor page skeleton.
**Addresses:** 3-pass script generation with scoring, script quality display (7-dimension), inline script review.
**Avoids:** n8n timeout issues (already configured in Phase 1). Large context window calls to Claude need the 300s HTTP timeout.

### Phase 4: Production Pipeline
**Rationale:** Longest phase with the most external API integrations. Depends on scenes table being populated from script generation. TTS must complete first (master clock), then images and video clips can run in parallel.
**Delivers:** WF05 (TTS), WF06 (images), WF07a (I2V), WF07b (T2V), WF08 (captions), WF09 (FFmpeg assembly), WF10 (Drive upload). Full Production Monitor page with scene-level Realtime tracking. Supervisor Agent (core detection + alerting).
**Addresses:** Scene-level progress tracking, real-time production monitor, per-video cost tracking, error state visibility with retry.
**Avoids:** FFmpeg OOM (concat with -c copy), Kie.ai thundering herd (callbacks or batch poller), Google Drive rate limits (batch uploads with delays, or local-only intermediate storage), self-chain stalls (supervisor built here).

### Phase 5: Publish + Analytics
**Rationale:** Depends on assembled video existing on Google Drive. Final gate before YouTube.
**Delivers:** Video Review page with Gate 3, WF11 (YouTube upload with metadata/captions/thumbnail), WF12 (YouTube analytics daily cron), Analytics page.
**Addresses:** YouTube upload, basic analytics, video preview and approval.
**Avoids:** YouTube quota exhaustion (use videos.list not search.list, cap at 5 uploads/day, track quota usage).

### Phase 6: Polish
**Rationale:** No hard dependencies. All incremental improvements.
**Delivers:** Settings page (per-project config), enhanced cost tracker page, mobile responsiveness, supervisor agent enhancements (alerting, auto-resume).
**Addresses:** Cross-niche portfolio analytics, inline scene editing, auto-approve toggle (after N manual approvals).

### Phase Ordering Rationale

- The ordering is dictated by a strict dependency chain: schema -> webhook API -> niche research -> topics -> scripts -> production -> publish -> analytics. Each phase produces outputs consumed by the next.
- The Supervisor Agent is moved from Phase 6 to Phase 4 because pitfall research shows self-chaining failures are a critical risk during production. Detecting stalls within 30 minutes prevents hours of wasted time.
- Within Phase 4, TTS must complete before assembly (master clock), but images and video clips are independent of each other and can be built/tested in parallel.
- Phase 6 items are genuinely independent -- settings, mobile, and enhanced analytics have no downstream dependencies.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Niche research workflow requires understanding Claude's web search tool capabilities, prompt engineering for competitor analysis, and the dynamic prompt generation pipeline. Complex agentic workflow.
- **Phase 4:** Most integration-heavy phase. Kie.ai callback vs. polling strategy needs validation. FFmpeg zoompan parameters need testing. Concurrent production queuing needs design.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Standard Supabase schema deployment, React project scaffolding, n8n webhook setup. All well-documented.
- **Phase 3:** 3-pass script generation is complex but the pattern is fully specified in Agent.md. Implementation is straightforward Claude API calls with stored prompts.
- **Phase 5:** YouTube Data API v3 is thoroughly documented. Upload and analytics patterns are standard.
- **Phase 6:** Settings pages, cost displays, and responsive CSS are standard UI work.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against official sources (npm, changelogs, docs). Tailwind v3 vs v4 decision well-justified. No bleeding-edge dependencies. |
| Features | HIGH | Feature set derived from Agent.md spec + Dashboard Implementation Plan + competitive analysis. Clear MVP vs. v2 separation. Anti-features well-identified. |
| Architecture | HIGH | Pattern is standard (SPA + API + DB + orchestrator). Self-chaining and Realtime patterns verified against Supabase and n8n docs. All data flows mapped. |
| Pitfalls | HIGH | Critical pitfalls verified via official docs, GitHub issues, and community reports. Each has concrete prevention strategy and verification criteria. |

**Overall confidence:** HIGH

### Gaps to Address

- **Kie.ai callback reliability:** Research recommends callbacks over polling but Kie.ai's callback feature reliability is unverified. During Phase 4 planning, test callbacks with a simple workflow before committing to the pattern. Have batch-polling as fallback.
- **Kie.ai rate limits:** The exact rate limit (20 req/10s) is from docs but may vary in practice. Test with 10 concurrent tasks during Phase 4.
- **VPS disk space during concurrent production:** 200GB NVMe with ~10GB per video assembly. Need to verify cleanup scripts run reliably. Monitor disk space before each assembly.
- **Supabase Realtime throughput under rapid scene updates:** 172 scenes updating in quick succession on a single-threaded Realtime processor. Likely fine since only one video produces at a time, but should be monitored during Phase 4 testing.
- **n8n execution history bloat:** After ~50 video productions, n8n's execution database could grow large. Set `EXECUTIONS_DATA_MAX_AGE=168` and `EXECUTIONS_DATA_PRUNE=true` in Phase 1.

## Sources

### Primary (HIGH confidence)
- Supabase Realtime Postgres Changes docs -- subscription patterns, REPLICA IDENTITY, WAL replication
- Supabase Realtime Limits docs -- 8KB NOTIFY limit, single-thread processing
- Supabase Self-Hosting Docker Guide -- connection management, Supavisor
- React Router v7 changelog and upgrade guide -- unified package import
- Vite 6 releases -- Node.js 20.19+ requirement
- Tailwind CSS v4 upgrade guide -- breaking changes documented
- YouTube Data API v3 quota docs -- 10K units/day, 1,600 per upload
- Google Cloud TTS Chirp 3 HD docs -- pricing, SSML support
- n8n Error Handling and timeout docs -- retry patterns, execution timeout config
- FFmpeg FAQ -- concat demuxer vs filter, stream copy
- Docker Resource Constraints docs -- memory limits

### Secondary (MEDIUM confidence)
- TanStack Query + Supabase integration patterns (Makerkit blog)
- n8n workflow best practices 2026 (community blog)
- Kie.ai API docs -- async task model, rate limits, model pricing
- Supabase Realtime architecture deep dive (Medium)
- Supabase self-hosted connection pooling discussions (GitHub)
- React Supabase Realtime memory leak diagnosis (Dr. Droid)

### Tertiary (needs validation)
- Kie.ai callback/webhook reliability -- untested in our environment
- Kie.ai exact rate limits under concurrent load -- needs empirical testing
- n8n execution memory under 172-iteration workflows -- needs monitoring

---
*Research completed: 2026-03-08*
*Ready for roadmap: yes*
