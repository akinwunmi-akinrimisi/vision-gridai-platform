# Vision GridAI Platform — Multi-Niche AI Video Production

## What This Is
A platform that turns any niche into a YouTube channel. Input a niche → research it → generate topics → produce 2-hour documentary videos → publish to YouTube. Full dashboard control with 3 approval gates.

## Tech Stack
- **Database:** Supabase (self-hosted PostgreSQL) at `https://supabase.operscale.cloud`
- **Orchestration:** n8n (self-hosted Docker) at `https://n8n.srv1297445.hstgr.cloud`
- **Dashboard:** React 18 + Tailwind CSS + Supabase JS client
- **Scripts:** Claude Sonnet via Anthropic API direct (NOT OpenRouter)
- **Voiceover:** Google Cloud TTS (Chirp 3 HD)
- **Images:** Kie.ai → Seedream 4.5
- **Video clips:** Kie.ai → Kling 2.1 Standard I2V + T2V
- **Assembly:** FFmpeg (in n8n Docker container)
- **Storage:** Google Drive
- **Upload:** YouTube Data API v3

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
├── .planning/             ← GSD state (PROJECT.md, ROADMAP.md, STATE.md)
├── design-system/         ← Generated design system
│   ├── MASTER.md          ← Global design rules (colors, fonts, spacing)
│   └── pages/             ← Per-page overrides
├── directives/            ← Per-stage SOPs (00–14)
├── execution/             ← Shell scripts (FFmpeg, download, cleanup)
├── dashboard/             ← React + Tailwind SPA (7 pages)
├── supabase/migrations/   ← SQL schema files
├── data/                  ← Source files per project
└── workflows/             ← n8n workflow JSONs (17 workflows)
```

## Critical Rules

**IMPORTANT: Read Agent.md before building ANY workflow or dashboard component.** It's the single source of truth.

**IMPORTANT: This project uses GSD (Get Shit Done) for structured development.** Use `/gsd:` commands for planning and execution. Each sprint = one GSD phase. GSD spawns fresh sub-agents per task to avoid context rot. Read `.planning/` for current sprint state. Do NOT create competing planning structures.

**IMPORTANT: Read `design-system/MASTER.md` before building any dashboard page or component.** UI UX Pro Max skill is installed at `.claude/skills/ui-ux-pro-max/` and auto-activates for UI work. All dashboard pages must follow the master design system for visual consistency. For page-specific overrides, check `design-system/pages/{page-name}.md` first.

**IMPORTANT: Never hardcode API keys or niche-specific content.** All prompts are dynamically generated per project and stored in `prompt_configs` table. System prompts, expertise profiles, and topic constraints are NEVER hardcoded in workflows.

**IMPORTANT: Audio is the master clock.** Measure duration with FFprobe (NOT file size estimation). Every visual's duration = its audio duration via FFmpeg `-t`.

**IMPORTANT: Write to Supabase after EVERY asset.** Each scene row is updated immediately — not in batch. Dashboard uses Supabase Realtime and depends on instant writes.

**IMPORTANT: 3 approval gates are mandatory.** Gate 1: Topics (after generation). Gate 2: Script (after 3-pass + scoring). Gate 3: Video (after assembly, before YouTube). Pipeline PAUSES at each gate until user acts from dashboard.

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
| D2 | Images (100 Seedream 4.5) | Deterministic | $3.20/video |
| D3 | I2V (25) + T2V (72) clips | Deterministic | $12.13/video |
| D4 | Captions + FFmpeg assembly | Deterministic | Free |
| E | Video review → ⏸ GATE 3 → YouTube publish | Dashboard | Free |
| F | YouTube analytics pull (daily cron) | Deterministic | Free |
| Supervisor | Pipeline monitor (30 min cron) | ⚡ Agentic | ~$14.40/month |
| **Total** | | | **~$17/video** |

## Development Workflow (GSD Phases → Sprints)

This project is built using GSD phases. Each phase maps to a sprint:

| GSD Phase | Sprint | What Gets Built |
|-----------|--------|----------------|
| Phase 1 | Foundation | Supabase schema + dashboard skeleton + n8n webhook API |
| Phase 2 | Niche Research | Project creation + niche research + topic generation + Gate 1 |
| Phase 3 | Scripts | 3-pass script generation + per-pass scoring + Gate 2 |
| Phase 4 | Production | Migrate WF03–WF09 from Google Sheets to Supabase |
| Phase 5 | Publish | Video preview + Gate 3 + YouTube upload + Analytics |
| Phase 6 | Polish | Cost tracker + Settings page + Supervisor agent + Mobile |

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
- Kie.ai is async — POST creates a task, poll `/v1/task/result` for completion
- YouTube API quota: 10,000 units/day, 1,600 per upload = max 6 uploads/day
- FFmpeg concat with `-c copy` avoids re-encoding and OOM on 2hr videos
- React build must be deployed to Nginx's root directory after each dashboard change
- Topic refinement is expensive (~$0.15/refinement) because it includes all 24 other topics as context
