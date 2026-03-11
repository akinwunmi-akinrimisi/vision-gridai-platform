# Vision GridAI Platform — Multi-Niche AI Video Production

## What This Is
A platform that turns any niche into a YouTube channel. Input a niche → research it → generate topics → produce 2-hour documentary videos → publish to YouTube. Full dashboard control with 3 approval gates.

## Tech Stack
- **Database:** Supabase (self-hosted PostgreSQL) at `https://supabase.operscale.cloud`
- **Orchestration:** n8n (self-hosted Docker) at `https://n8n.srv1297445.hstgr.cloud`
- **Dashboard:** React 18 + Tailwind CSS + Supabase JS client
- **Scripts:** Claude Sonnet via Anthropic API direct (NOT OpenRouter)
- **Voiceover:** Google Cloud TTS (Chirp 3 HD)
- **Images:** Fal.ai → Seedream 4.0 ($0.03/image, supports 16:9 + 9:16)
- **Video clips:** Fal.ai → Wan 2.5 I2V + T2V ($0.05/sec, supports 16:9 + 9:16)
- **Assembly:** FFmpeg (in n8n Docker container)
- **Kinetic Captions:** Remotion (React-based video renderer, free, local on VPS)
- **Storage:** Google Drive
- **Upload:** YouTube Data API v3 + TikTok Content API + Instagram Graph API
- **Agent Expertise:** Agency Agents (61 specialists in `~/.claude/agents/`)

## Key Reference Files
- @Agent.md — Full platform architecture, Supabase schema, all pipeline phases, scoring rubric, dashboard spec
- @skills.md — Skills reference map (18 skills across pipeline stages)
- @skills.sh — Skill installer + environment verification
- @Dashboard_Implementation_Plan.md — Detailed dashboard page specs and Supabase Realtime patterns
- @design-system/MASTER.md — Dashboard design system (colors, typography, spacing, components). Read before building any dashboard page.
- @.planning/ — GSD state files (PROJECT.md, ROADMAP.md, STATE.md). Read for current sprint context.

## Project Structure
```
vision-gridai-platform/
├── CLAUDE.md              ← This file
├── Agent.md               ← Platform architecture (DOE)
├── skills.md              ← Skills reference map
├── skills.sh              ← Environment setup
├── .env                   ← API keys (NEVER commit)
├── .claude/
│   ├── commands/gsd/      ← GSD slash commands (installed by npx)
│   ├── commands/n8n/      ← n8n-specific commands (cherry-picked)
│   └── skills/ui-ux-pro-max/  ← UI UX Pro Max skill (installed by uipro)
├── ~/.claude/agents/      ← Agency Agents (61 specialists, installed globally)
├── .planning/             ← GSD state (PROJECT.md, ROADMAP.md, STATE.md)
├── design-system/         ← Generated design system
│   ├── MASTER.md          ← Global design rules (colors, fonts, spacing)
│   └── pages/             ← Per-page overrides
├── directives/            ← Per-stage SOPs (00–14)
├── execution/             ← Shell scripts (FFmpeg, download, cleanup)
├── dashboard/
│   ├── src/pages/         ← React SPA (9 pages incl. Shorts Creator + Social Publisher)
│   └── src/remotion/      ← Kinetic caption renderer (Remotion components)
├── supabase/migrations/   ← SQL schema files (incl. shorts + social_accounts tables)
├── data/                  ← Source files per project
└── workflows/             ← n8n workflow JSONs (28 workflows incl. shorts + social)
```

## Critical Rules

**IMPORTANT: Read Agent.md before building ANY workflow or dashboard component.** It's the single source of truth.

**IMPORTANT: This project uses GSD (Get Shit Done) for structured development.** Use `/gsd:` commands for planning and execution. Each sprint = one GSD phase. GSD spawns fresh sub-agents per task to avoid context rot. Read `.planning/` for current sprint state. Do NOT create competing planning structures.

**IMPORTANT: Read `design-system/MASTER.md` before building any dashboard page or component.** UI UX Pro Max skill is installed at `.claude/skills/ui-ux-pro-max/` and auto-activates for UI work. All dashboard pages must follow the master design system for visual consistency. For page-specific overrides, check `design-system/pages/{page-name}.md` first.

**IMPORTANT: Never hardcode API keys or niche-specific content.** All prompts are dynamically generated per project and stored in `prompt_configs` table. System prompts, expertise profiles, and topic constraints are NEVER hardcoded in workflows.

**IMPORTANT: Audio is the master clock.** Measure duration with FFprobe (NOT file size estimation). Every visual's duration = its audio duration via FFmpeg `-t`.

**IMPORTANT: Write to Supabase after EVERY asset.** Each scene row is updated immediately — not in batch. Dashboard uses Supabase Realtime and depends on instant writes.

**IMPORTANT: 4 approval gates are mandatory.** Gate 1: Topics. Gate 2: Script. Gate 3: Video (before YouTube). Gate 4: Shorts (viral clips review before production). Pipeline PAUSES at each gate until user acts from dashboard.

**IMPORTANT: Fal.ai is the media provider.** Images via Seedream 4.0 (`fal-ai/bytedance/seedream/v4/text-to-image`). Video via Wan 2.5 (`fal-ai/wan-25-preview`). Auth: `Authorization: Key {{FAL_API_KEY}}`. Async pattern: POST to `queue.fal.run` → poll for result.

**IMPORTANT: Agency Agents (61 specialists) are installed at `~/.claude/agents/`.** They auto-activate based on context. Key agents: Frontend Developer (dashboard), Backend Architect (n8n workflows), DevOps Automator (VPS/Docker), Image Prompt Engineer (thumbnail/visual prompts), TikTok Strategist + Instagram Curator (social media posting). GSD executor agents inherit their expertise automatically.

**IMPORTANT: Shorts pipeline uses Remotion for kinetic captions.** Word-by-word pop-in, center screen, emphasis words in yellow/red. Remotion renders transparent overlays that FFmpeg composites onto clips. Installed locally on VPS, free, React-based. All shorts visuals are native 9:16 portrait with TikTok-bold aesthetic — NOT cropped from 16:9.

**IMPORTANT: 3-pass script generation.** Pass 1 (Foundation 5-7K words) → evaluate → Pass 2 (Depth 8-10K words, Pass 1 as context) → evaluate → Pass 3 (Resolution 5-7K words, summaries) → evaluate → combined evaluation. Per-pass threshold: 6.0. Combined threshold: 7.0. Max 3 regeneration attempts total.

**IMPORTANT: Topic refinement considers all 24 other topics.** When user rejects/refines one topic, Claude receives all 24 others as context to avoid overlap.

**IMPORTANT: Self-chaining architecture.** Each workflow fires the next on completion. WF_MASTER is a launcher. Every workflow handles its own errors and writes failure to Supabase.

## n8n ↔ Supabase Pattern
```
READ:  GET  https://supabase.operscale.cloud/rest/v1/{{table}}?{{filters}}
WRITE: PATCH https://supabase.operscale.cloud/rest/v1/{{table}}?id=eq.{{id}}
INSERT: POST https://supabase.operscale.cloud/rest/v1/{{table}}

Headers:
  apikey: {{SUPABASE_ANON_KEY}}
  Authorization: Bearer {{SUPABASE_SERVICE_ROLE_KEY}}
  Content-Type: application/json
```

## Dashboard Tech
- React 18 + React Router for SPA
- Tailwind CSS for styling (utility classes only, no custom CSS unless necessary)
- @supabase/supabase-js for Realtime subscriptions + direct reads
- n8n webhook calls for actions (trigger production, approve, reject, refine)
- Nginx serves React build + reverse proxies /webhook/ to n8n
- **UI UX Pro Max** skill provides design intelligence (67 styles, 96 palettes, 57 font pairings, 100 reasoning rules)
- Design system persisted at `design-system/MASTER.md` — all pages reference it for consistency

## Common Commands
```bash
# Supabase
psql -h localhost -p 54321 -U postgres  # Direct DB access
curl https://supabase.operscale.cloud/rest/v1/topics?project_id=eq.XXX -H "apikey: KEY"

# n8n
docker ps | grep n8n
docker logs n8n-n8n-1 --tail 50

# FFmpeg (unchanged)
ffprobe -v quiet -show_entries format=duration -of csv=p=0 scene_001.mp3
ffmpeg -loop 1 -i img.png -i audio.mp3 -vf "zoompan=..." -t DURATION out.mp4
ffmpeg -f concat -safe 0 -i concat.txt -c copy -movflags +faststart final.mp4
ffmpeg -i final.mp4 -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:v copy normalized.mp4

# Dashboard
cd dashboard && npm run build  # Build React app
cp -r build/* /opt/dashboard/  # Deploy to Nginx
```

## Pipeline Quick Reference

| Phase | What | Type | Cost |
|-------|------|------|------|
| A | Project creation + niche research (web search) | ⚡ Agentic | ~$0.60/project |
| B | Topic + avatar generation → ⏸ GATE 1 | ⚡ Agentic | ~$0.20/project |
| C | 3-pass script + per-pass scoring → ⏸ GATE 2 | ⚡ Agentic | $0.80–$1.80/video |
| D1 | TTS audio (172 scenes, Master Clock) | Deterministic | ~$0.30/video |
| D2 | Images (75 Seedream 4.0 on Fal.ai) | Deterministic | $2.25/video |
| D3 | I2V (25) + T2V (72) Wan 2.5 on Fal.ai | Deterministic | $24.25/video |
| D4 | Captions + FFmpeg assembly | Deterministic | Free |
| E | Video review → ⏸ GATE 3 → YouTube publish | Dashboard | Free |
| F | YouTube analytics pull (daily cron) | Deterministic | Free |
| G | Shorts: viral analysis + production → ⏸ GATE 4 | ⚡ + Deterministic | ~$22/topic |
| H | Social media posting (TikTok, Instagram, YT Shorts) | Scheduled cron | Free |
| Supervisor | Pipeline monitor (30 min cron) | ⚡ Agentic | ~$14.40/month |
| **Main video** | | | **~$28/video** |
| **Shorts (20 clips)** | | | **~$22/topic** |
| **Total per topic** | | | **~$50** |

## Development Workflow (GSD Phases → Sprints)

This project is built using GSD phases. Each phase maps to a sprint:

| GSD Phase | Sprint | What Gets Built |
|-----------|--------|----------------|
| Phase 1 | Foundation | Supabase schema + dashboard skeleton + n8n webhook API |
| Phase 2 | Niche Research | Project creation + niche research + topic generation + Gate 1 |
| Phase 3 | Scripts | 3-pass script generation + per-pass scoring + Gate 2 |
| Phase 4 | Production | WF03–WF09 pipeline (TTS, images, video, assembly) |
| Phase 5 | Publish | Video preview + Gate 3 + YouTube upload + Analytics |
| Phase 6 | Polish | Cost tracker + Settings page + Supervisor agent + Mobile |
| **v3.0 Milestone** | | |
| Phase 7 | Shorts Foundation | `shorts` + `social_accounts` tables + Shorts Creator pages + Remotion setup |
| Phase 8 | Shorts Pipeline | Viral analysis + audio + images + video + captions + assembly workflows |
| Phase 9 | Social Media | Social Media Publisher page + posting workflows + analytics pull |

**Workflow per phase:**
```
/gsd:discuss-phase N   → Define layout/interaction preferences
/gsd:plan-phase N      → Research + create atomic task plans
/gsd:execute-phase N   → Build (parallel agents, fresh context per task)
/gsd:verify-work N     → Test deliverables
```

**Dashboard pages — generate design system FIRST:**
```
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "AI video production dashboard" --design-system --persist -p "Vision GridAI"
```
Then for each page:
```
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "real-time monitoring" --design-system --persist -p "Vision GridAI" --page "production-monitor"
```

## Gotchas
- Supabase REST API uses `eq.` syntax for filters: `?status=eq.pending`
- Supabase Realtime requires the table to have `REPLICA IDENTITY FULL` for UPDATE events
- Fal.ai is async — POST to `queue.fal.run/...` creates a task, poll `queue.fal.run/.../requests/{id}` for result. Auth header: `Authorization: Key {{FAL_API_KEY}}`
- Fal.ai supports native 9:16 via `image_size: "portrait_9_16"` (images) and `aspect_ratio: "9:16"` (video) — no post-processing crop needed
- YouTube API quota: 10,000 units/day, 1,600 per upload = max 6 uploads/day
- FFmpeg concat with `-c copy` avoids re-encoding and OOM on 2hr videos
- React build must be deployed to Nginx's root directory after each dashboard change
- Topic refinement is expensive (~$0.15/refinement) because it includes all 24 other topics as context
- Remotion caption rendering: ~3-5 min per clip on KVM 4 VPS. Budget ~90 min for 20 clips. Runs in background.
- Agency Agents (61 files in `~/.claude/agents/`) auto-activate by context. Don't need explicit invocation — GSD executors inherit them.
- TikTok Content Posting API requires Developer account + app approval. Instagram requires Facebook Business account.
- YouTube Shorts auto-detect by 9:16 aspect ratio + ≤60s duration. Clips >60s upload as regular vertical videos on same channel.
