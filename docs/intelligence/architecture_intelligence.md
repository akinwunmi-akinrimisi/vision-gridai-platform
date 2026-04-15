# Vision GridAI Platform — Architecture Overview
> STATUS: NEW FILE

---

## System Purpose

Vision GridAI is a multi-niche AI video production operating system. It takes a niche concept from zero to a published YouTube video with minimal human intervention, controlled at 4 quality gates. This architecture document covers the full system after the Growth Intelligence Layer upgrade.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       VISION GRIDAI PLATFORM                            │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    INTELLIGENCE LAYER (NEW)                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │  │
│  │  │ Outlier  │  │   SEO    │  │Competitor│  │ Niche Health     │ │  │
│  │  │ Intel    │  │ Scoring  │  │ Monitor  │  │ + RPM Intel      │ │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │  │
│  └───────┼─────────────┼─────────────┼──────────────────┼───────────┘  │
│          │             │             │                  │               │
│  ┌───────▼─────────────▼─────────────▼──────────────────▼───────────┐  │
│  │                    PRODUCTION PIPELINE                            │  │
│  │  Niche Research → Topics(25) → Gate1 → Script(3-pass) → Gate2    │  │
│  │  → TTS → Images → Video → Assembly → Gate3 → Publish             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    SHORTS PIPELINE                                │  │
│  │  Viral Analysis → Gate4 → 9:16 Media → Kinetic Captions →       │  │
│  │  FFmpeg Assembly → Social Publish (TikTok/IG/YT Shorts)          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    ANALYTICS FEEDBACK LOOP                       │  │
│  │  YouTube Analytics → Revenue Attribution → PPS Calibration →    │  │
│  │  Audience Memory → Next Project Intelligence                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Architecture

```
EXTERNAL DATA SOURCES
├── YouTube Data API v3
│   ├── Search API → outlier scoring, SEO scoring
│   ├── Videos.list → view statistics
│   ├── Channels.list → competitor monitoring
│   ├── PlaylistItems.list → competitor new uploads
│   ├── Comments.list → audience intelligence
│   └── Analytics API → revenue + performance
├── Reddit API → trending discussions
├── Google Trends (SerpAPI) → rising search queries
├── Google Autocomplete → search volume proxy
└── Fal.ai / Google Cloud TTS / Anthropic API → media generation

↓ (via n8n HTTP Request nodes)

N8N ORCHESTRATION LAYER (self-hosted Docker, Hostinger KVM 4)
├── 38 workflows (28 existing + 10 new intelligence workflows)
├── Self-chaining: each workflow fires next on completion
├── Error handling: all failures write to Supabase + escalate
├── Cron schedules:
│   ├── Daily 06:00 UTC: WF_COMPETITOR_MONITOR + WF_VIDEO_METADATA
│   ├── Weekly Sun 03:00 UTC: WF_NICHE_HEALTH + WF_AUDIENCE_INTELLIGENCE
│   └── Monthly 1st: WF_REVENUE_ATTRIBUTION + WF_PPS_CALIBRATE

↓ ↑ (read/write)

SUPABASE (self-hosted PostgreSQL + Realtime)
├── Core tables: projects, topics, scripts, scenes, analytics
├── Intelligence tables (NEW):
│   ├── competitor_channels, competitor_videos, competitor_alerts
│   ├── niche_health_history
│   ├── style_profiles
│   ├── audience_insights
│   └── pps_calibration, pps_config
└── Realtime subscriptions: topics, competitor_alerts, niche_health_history

↓ (served via)

REACT DASHBOARD (SPA, React 18 + Tailwind, served by Nginx)
├── Existing pages: Projects, Production Monitor, Gates 1-4, Shorts, Social
├── New pages: Intelligence Hub, Analytics, Niche Manager
└── Updated pages: Gate 1 (+ intelligence scores), Gate 3 (+ PPS + title picker)
```

---

## AI Orchestration Logic

### Model Selection Strategy

| Task | Model | Rationale |
|------|-------|-----------|
| Script generation (3-pass) | Claude Opus 4.6 | Highest quality needed — this is the core product |
| Outlier scoring synthesis | Claude Opus 4.6 | Complex multi-signal analysis |
| SEO scoring | Claude Opus 4.6 | Pattern recognition across keywords |
| CTR title generation | Claude Opus 4.6 | Creative + analytical combination |
| Thumbnail CTR scoring | Claude Opus 4.6 + Vision | Vision capability required |
| Style DNA analysis | Claude Opus 4.6 + Vision | Thumbnail + title pattern analysis |
| Competitor monitor (daily) | Claude Haiku 4.5 | Repetitive, cost-sensitive batch task |
| Niche health (weekly) | Claude Haiku 4.5 | Simple aggregation, cost-sensitive |
| Comment classification | Claude Haiku 4.5 | Simple classification at scale |
| PPS calculation | Claude Opus 4.6 | Final gatekeeping decision — worth quality |
| Niche research | Claude Opus 4.6 | Complex agentic web search + synthesis |

### Context Management Rules
- Each n8n workflow passes only the data it needs to Claude — no full-schema dumps
- `prompt_configs` table stores all system prompts, user-facing prompts, and niche constraints
- Scripts table stores `pass1_summary`, `pass2_summary` for Pass 3 context (not full pass text)
- Intelligence context is injected as a structured block at the top of relevant prompts

### Token Budget by Phase
| Phase | Typical Input Tokens | Typical Output Tokens | Cost |
|-------|---------------------|----------------------|------|
| Niche research | 2K | 1.5K | ~$0.60/project |
| Topic generation (25) | 3K | 4K | ~$0.20/project |
| Outlier scoring | 5K | 2K | ~$0.08/project |
| Script Pass 1 | 4K | 12K | ~$0.60/video |
| Script Pass 2 | 14K | 16K | ~$0.80/video |
| Script Pass 3 | 12K | 12K | ~$0.60/video |
| CTR title generation | 2K | 1K | ~$0.04/video |
| Thumbnail CTR scoring | 2K+image | 0.5K | ~$0.03/video |
| PPS calculation | 1K | 0.5K | ~$0.02/video |
| Competitor monitor | 3K | 1K | ~$0.02/day |

---

## Infrastructure Topology

```
Hostinger KVM 4 VPS (Lagos/EU edge)
├── Docker Compose:
│   ├── n8n (orchestration engine)
│   ├── Supabase stack:
│   │   ├── postgres (database)
│   │   ├── realtime (websocket subscriptions)
│   │   ├── storage (file storage)
│   │   └── kong (API gateway)
│   └── nginx (reverse proxy + React serving)
├── ├── ├── FFmpeg (video assembly)
└── Cron jobs (wrapper for n8n webhook triggers)

External services:
├── Fal.ai (image + video generation)
├── Google Cloud TTS (voiceover)
├── Anthropic API (Claude)
├── YouTube Data API v3
├── Google Drive (asset storage)
└── TikTok + Instagram APIs (social publishing)
```

---

## Scalability Observations + Mitigation

### Current Constraints

1. **Single-VPS bottleneck**
   - Problem: All FFmpeg, n8n, caption burn service on one machine
   - Mitigation: Sequential workflow execution (no parallel video production)
   - Future path: Add second VPS for media processing when running >3 concurrent projects

2. **YouTube API Quota (10K units/day)**
   - Problem: Outlier scoring (2,500 units) + competitor monitor (30 units) + daily analytics (~10 units)
   - Mitigation: Topic scoring runs ONCE per project (not daily). Budget: ~2,600 units/new project + 40 units/day ongoing
   - At 3 active projects: ~2,640 units/day → well within 10K limit

3. **Caption burn service throughput (host-side :9998)**
   - Problem: FFmpeg libass re-encode is CPU-intensive; 3hr timeout per topic
   - Mitigation: Runs host-side via `docker exec` to bypass n8n task-runner OOM; systemd manages lifecycle
   - Future path: Offload to dedicated render VPS when shorts volume exceeds ~20/day

4. **Supabase self-hosted (single instance)**
   - Problem: No automatic failover
   - Mitigation: Daily pg_dump to Google Drive (add to existing backup cron)

---

## Security Architecture

- **No hardcoded API keys** — all credentials in n8n credential store (existing rule)
- **Environment variables** in `.env` (gitignored, existing)
- **Supabase RLS** — dashboard uses `SUPABASE_ANON_KEY` for reads, `SERVICE_ROLE_KEY` for writes (server-side only)
- **Intelligence data is project-scoped** — all new tables include `project_id` foreign key with `ON DELETE CASCADE`
- **Competitor data is public** — only public YouTube data tracked (channel views, video counts). No private channel data.
- **Reddit API** — uses app-only authentication (client credentials). No user data.

---

## Upgrade Priority Roadmap

### Sprint 1 (Next): Intelligence Foundation
1. Add migration `20260413_intelligence_layer.sql` to `supabase/migrations/`
2. Build `WF_OUTLIER_SCORE` (n8n workflow)
3. Build `WF_SEO_SCORE` (n8n workflow)
4. Update Gate 1 UI: add score cards + scatter chart + sort/filter
5. Add `niche_rpm_category` classification to `WF_NICHE_RESEARCH`

### Sprint 2: CTR + Prediction Layer
1. Build `WF_CTR_OPTIMIZE` (title variants)
2. Build `WF_THUMBNAIL_SCORE` (Vision analysis + regeneration)
3. Build `WF_PREDICT_PERFORMANCE` (PPS calculator)
4. Update Gate 3 UI: PPS card + title picker + thumbnail score

### Sprint 3: Competitor + Analytics
1. Build `WF_COMPETITOR_MONITOR` (daily cron)
2. Build new Intelligence Hub dashboard page (`/intelligence`)
3. Build Analytics dashboard page (`/analytics`)
4. Extend `WF_VIDEO_METADATA` to pull CTR + traffic sources + revenue

### Sprint 4: Health + Feedback Loops
1. Build `WF_NICHE_HEALTH` (weekly cron)
2. Build `WF_STYLE_DNA` (manual trigger)
3. Build Niche Manager dashboard page (`/niches`)
4. Build `WF_REVENUE_ATTRIBUTION` (monthly)
5. Build PPS calibration loop
