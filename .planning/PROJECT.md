# Vision GridAI Platform

## What This Is

A multi-niche AI video production platform that turns any niche into a YouTube channel. Users input a niche via a React dashboard, the system researches it, generates 25 SEO-optimized topics, produces 2-hour documentary-style videos through a fully automated pipeline, and publishes to YouTube — all with 3 mandatory approval gates for quality control. Built on Supabase (database + realtime), n8n (orchestration), React + Tailwind (dashboard), and external AI/media APIs.

## Core Value

Any niche typed into the dashboard produces publish-ready YouTube videos with full human control at 3 approval gates — topics, scripts, and final video.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Supabase schema deployed and operational (projects, topics, scenes, avatars, niche_profiles, prompt_configs, production_log)
- [ ] React dashboard with 7 pages (Projects Home, Project Dashboard, Topic Review, Script Review, Production Monitor, Video Review/not in v1 sprint order, Analytics, Settings)
- [ ] n8n webhook API layer bridging dashboard actions to pipeline workflows
- [ ] Supabase Realtime subscriptions powering live dashboard updates (no polling)
- [ ] Phase A: Project creation + niche research via Claude + web search
- [ ] Phase B: Topic + avatar generation (25 per project) with Gate 1 approval (approve/reject/refine/edit)
- [ ] Phase C: 3-pass script generation with per-pass scoring (7 dimensions) and Gate 2 approval
- [ ] Phase D: Deterministic production — TTS (Chirp 3 HD), images (Seedream 4.5), I2V + T2V (Kling 2.1), captions, FFmpeg assembly
- [ ] Phase E: Video preview + Gate 3 approval + YouTube upload with metadata/captions/thumbnails
- [ ] Phase F: YouTube analytics daily cron pulling performance data back into dashboard
- [ ] Supervisor agent monitoring pipeline health every 30 minutes
- [ ] Dynamic prompt system — all prompts generated per niche, stored in prompt_configs, never hardcoded
- [ ] Audio as master clock — FFprobe-measured durations, every visual timed to its audio
- [ ] Self-chaining workflow architecture — each workflow fires the next on completion
- [ ] Per-scene Supabase writes — every asset update written immediately, not batched
- [ ] Topic refinement with full context — all 24 other topics sent as context to avoid overlap
- [ ] Cost tracking per video and per project
- [ ] Simple password gate for solo-user auth

### Out of Scope

- Multi-user auth / team features — solo operator for v1
- Mobile app — web-first, responsive later (Sprint 6)
- Real-time chat or collaboration features — single-user platform
- Custom video templates beyond 2hr documentary — one format for now
- Direct video editing in browser — review and approve only

## Context

- **Infrastructure:** Hostinger KVM 4 VPS (4 vCPU, 16GB RAM, 200GB NVMe) running n8n Docker, Supabase Docker, and Nginx
- **Supabase:** Self-hosted at `https://supabase.operscale.cloud` — schema already deployed from `001_initial_schema.sql`
- **n8n:** Docker container `n8n-ffmpeg` at `https://n8n.srv1297445.hstgr.cloud` — running, no workflows yet
- **Nginx:** Running, ready to serve dashboard build
- **First niche:** US Credit Cards (high CPM $35-50+, well-defined in Agent.md examples)
- **Spec documents:** `VisionGridAI_Platform_Agent.md` (full architecture + schema + pipeline), `Dashboard_Implementation_Plan.md` (detailed dashboard pages + Supabase patterns), `design-system/` (pre-generated design system for all 7 pages)
- **Design system:** Already generated via UI UX Pro Max at `design-system/vision-gridai/MASTER.md` with per-page overrides
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
| Supabase over Google Sheets | Relational data, Realtime subscriptions, no rate limits, proper indexing, JSON support | — Pending |
| HTTP Request nodes over native Supabase n8n node | More control, no dependency on community node maintenance | — Pending |
| 3-pass script generation with per-pass scoring | Catches problems early (e.g., Pass 1 has no avatar usage → fix before Pass 2 builds on it) | — Pending |
| React SPA over SSR/Next.js | Simpler deployment (Nginx serves static), no server-side rendering needed for solo dashboard | — Pending |
| Self-chaining workflows over central orchestrator | Each workflow is independently testable, failure isolation, no single point of failure | — Pending |
| Follow 6-sprint build order from spec | Foundation → Niche/Topics → Scripts → Production → Publish → Polish matches dependency chain | — Pending |

---
*Last updated: 2026-03-08 after initialization*
