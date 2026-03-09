# Vision GridAI Platform

## What This Is

A multi-niche AI video production platform that turns any niche into a YouTube channel. Users input a niche via a React dashboard, the system researches it, generates 25 SEO-optimized topics, produces 2-hour documentary-style videos through a fully automated pipeline, and publishes to YouTube — all with 3 mandatory approval gates for quality control. Built on Supabase (database + realtime), n8n (orchestration), React + Tailwind (dashboard), and external AI/media APIs.

## Core Value

Any niche typed into the dashboard produces publish-ready YouTube videos with full human control at 3 approval gates — topics, scripts, and final video.

## Requirements

### Validated

- ✓ React dashboard with 7 pages, PIN auth, dark mode, glassmorphism design system — v1.0
- ✓ Supabase JS client + Realtime subscriptions powering live dashboard updates — v1.0
- ✓ n8n webhook API layer with stub workflows for all dashboard actions — v1.0
- ✓ TanStack Query data layer with Realtime-triggered cache invalidation — v1.0
- ✓ Topic Review page with Gate 1 approval flow (approve/reject/refine/bulk) — v1.0
- ✓ Script Review page with 3-pass scoring (7 dimensions) and Gate 2 approval — v1.0
- ✓ Production Monitor with real-time 172-scene DotGrid, supervisor alerts — v1.0
- ✓ Video Review with Gate 3 publish flow, YouTube metadata editing — v1.0
- ✓ Analytics page with Recharts charts, per-video/per-project cost tracking — v1.0
- ✓ Settings page with per-project config editing and prompt version history editor — v1.0
- ✓ n8n production workflow JSONs (TTS, images, I2V, T2V, captions, assembly, supervisor, publish, analytics) — v1.0

### Active

- [ ] Deploy n8n workflows to server and validate end-to-end pipeline
- [ ] Apply infrastructure hardening configs to VPS (n8n timeouts, PG tuning, Docker limits)
- [ ] Build n8n AI agent workflows: niche research (Claude + web search), topic generation, avatar generation
- [ ] Build n8n dynamic prompt generation workflow (system prompt, expertise profile per niche)
- [ ] Implement inline topic field editing on Topic Review page
- [ ] End-to-end pipeline test: create project → research → topics → scripts → production → publish

### Out of Scope

- Multi-user auth / team features — solo operator for v1
- Mobile native app — web-first, responsive dashboard sufficient
- Real-time chat or collaboration features — single-user platform
- Custom video templates beyond 2hr documentary — one format for now
- Direct video editing in browser — review and approve only
- Prompt A/B testing — v2 feature
- Settings import/export between projects — v2 feature

## Current Milestone: v1.1 Backend & E2E

**Goal:** Close all v1.0 gaps — build the n8n AI agent workflows, deploy all workflows to server, apply infrastructure hardening, and validate the full pipeline end-to-end with US Credit Cards niche.

**Target features:**
- n8n niche research workflow (Claude API with tool_use web search via HTTP Request node)
- n8n topic + avatar generation workflow (25 topics, 25 avatars per project)
- n8n dynamic prompt generation workflow (7 prompt types per niche)
- Inline topic field editing on Topic Review page
- Infrastructure hardening applied to VPS (n8n timeouts, PostgreSQL tuning, Docker memory limits)
- All v1.0 workflow JSONs deployed and imported to n8n server
- End-to-end pipeline validation: create project → research → topics → scripts → production → publish

## Context

- **Current state:** v1.0 MVP shipped (2026-03-09). Full dashboard + n8n workflow JSONs complete. 256 files, 49K LOC.
- **Tech stack:** React 18 + Tailwind CSS + Vite (dashboard), n8n workflows (orchestration), Supabase PostgreSQL + Realtime (database), Claude Sonnet via Anthropic API (AI)
- **Infrastructure:** Hostinger KVM 4 VPS (4 vCPU, 16GB RAM, 200GB NVMe) running n8n Docker, Supabase Docker, and Nginx
- **Next steps:** Deploy workflows to n8n server, apply infra configs, build AI agent workflows for niche research + topic generation
- **First niche:** US Credit Cards (high CPM $35-50+)
- **Cost target:** ~$17 per video, ~$440/month for 25 videos

## Constraints

- **Tech stack**: React 18 + Tailwind CSS + Vite (dashboard), n8n workflows (orchestration), Supabase PostgreSQL + Realtime (database), Claude Sonnet via Anthropic API direct (AI)
- **Media APIs**: Kie.ai for images (Seedream 4.5) and video (Kling 2.1), Google Cloud TTS Chirp 3 HD for voiceover
- **YouTube quota**: 10,000 units/day, 1,600 per upload = max 6 uploads/day
- **No hardcoded keys**: All API keys in n8n credential manager or .env, never in workflow JSON
- **Audio master clock**: FFprobe-measured durations only, never estimated from file size
- **3 mandatory gates**: Pipeline must pause at topics, scripts, and video review — no auto-publishing
- **Self-hosted**: All infrastructure on single VPS, no cloud services except AI/media APIs

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase over Google Sheets | Relational data, Realtime subscriptions, no rate limits, proper indexing, JSON support | ✓ Good — Realtime powers live dashboard updates |
| HTTP Request nodes over native Supabase n8n node | More control, no dependency on community node maintenance | ✓ Good — consistent pattern across all workflows |
| 3-pass script generation with per-pass scoring | Catches problems early (e.g., Pass 1 has no avatar usage → fix before Pass 2 builds on it) | ✓ Good — cleanly modeled in UI |
| React SPA over SSR/Next.js | Simpler deployment (Nginx serves static), no server-side rendering needed for solo dashboard | ✓ Good — fast builds, simple deploys |
| Self-chaining workflows over central orchestrator | Each workflow is independently testable, failure isolation, no single point of failure | ✓ Good — modular workflow JSONs |
| GSD wave-based parallel execution | Fresh 200K context per agent, parallel plan execution within waves | ✓ Good — 29 plans in ~3 hours |
| TanStack Query + Supabase Realtime pattern | Query for initial data, Realtime for cache invalidation, optimistic updates for mutations | ✓ Good — consistent across all pages |
| Glassmorphism design system | backdrop-blur glass cards with dark mode support, professional look | ✓ Good — cohesive visual identity |
| Production progress weighted formula | audio 20%, images 20%, i2v 15%, t2v 15%, assembly 30% | — Pending production validation |
| Single n8n workflow per webhook domain | One JSON file per domain (status, production, publish, settings) not per endpoint | ✓ Good — manageable file count |
| Claude API with tool_use for niche research | Direct Anthropic API via n8n HTTP Request node with web search tool. Full control, matches existing pattern | — Pending |

---
*Last updated: 2026-03-09 after v1.1 milestone start*
