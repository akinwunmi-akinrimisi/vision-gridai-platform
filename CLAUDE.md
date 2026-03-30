# Vision GridAI Platform — Multi-Niche AI Video Production

## What This Is
A platform that turns any niche into a YouTube channel. Input a niche → research it → generate topics → produce 2-hour documentary videos → publish to YouTube. Full dashboard control with 3 approval gates.

## Tech Stack
- **Database:** Supabase (self-hosted PostgreSQL) at `https://supabase.operscale.cloud`
- **Orchestration:** n8n (self-hosted Docker) at `https://n8n.srv1297445.hstgr.cloud`
- **Dashboard:** React 18 + Tailwind CSS + Supabase JS client
- **Scripts:** Claude Sonnet via Anthropic API direct
- **Voiceover:** Google Cloud TTS (Chirp 3 HD)
- **Images:** Fal.ai → Seedream 4.0 ($0.03/image, supports 16:9 + 9:16)
- **Ken Burns Motion:** FFmpeg zoompan (6 direction templates, $0/scene)
- **Color Grading:** FFmpeg eq + colorbalance (7 mood profiles per scene)
- **Transitions:** FFmpeg xfade (5 transition types between scenes)
- **Background Music:** Google Vertex AI Lyria (lyria-002, custom AI-generated music per video) + FFmpeg voice-ducking
- **Assembly:** FFmpeg (in n8n Docker container)
- **Remotion Hybrid Rendering:** Scenes AI-classified as fal_ai (photorealistic) or remotion (data/typographic). Remotion renders pixel-perfect stats, charts, comparisons, timelines. Both produce .png → same Ken Burns pipeline.
- **Remotion Render Service:** Node.js on VPS, renders via `npx remotion still`. Called by n8n for Remotion-classified scenes.
- **Kinetic Captions:** Remotion (React-based video renderer, free, local on VPS)
- **Thumbnails:** Fal.ai image + text overlay via Sharp/Jimp, auto-uploaded
- **End Cards:** FFmpeg from static branded image (3s short, 5-8s long)
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
- @GUIDE.md — Consolidated build guide (31 features, Superpowers + gstack + Agency Agents)
- @VisionGridAI_Video_Effects_Playbook.docx — Cinematic production playbook (prompts, FFmpeg, color science)
- @docs/superpowers/specs/ — Superpowers feature specs
- @docs/superpowers/plans/ — Superpowers implementation plans

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
│   ├── src/pages/         ← React SPA (12 pages)
│   │   ├── Research.jsx           ← Topic Intelligence (global)
│   │   ├── ContentCalendar.jsx    ← Content Calendar
│   │   └── EngagementHub.jsx      ← Engagement Hub
│   ├── src/components/
│   │   ├── research/              ← Topic Intelligence components
│   │   ├── calendar/              ← Calendar components
│   │   └── engagement/            ← Engagement components
│   ├── src/hooks/
│   │   ├── useResearch.js         ← Research queries + realtime
│   │   ├── useSchedule.js         ← Calendar scheduling
│   │   ├── useComments.js         ← Comment fetching
│   │   └── useEngagement.js       ← Engagement metrics
│   └── src/remotion/      ← Kinetic caption renderer (Remotion components)
├── supabase/migrations/   ← SQL schema files (incl. shorts + social_accounts tables)
│   ├── 002_research_tables.sql        ← Topic Intelligence schema
│   ├── 003_cinematic_fields.sql       ← Cinematic production fields
│   └── 004_calendar_engagement_music.sql ← Calendar, engagement, music tables
├── data/                  ← Source files per project
├── docs/superpowers/      ← Superpowers specs + plans
│   ├── specs/             ← Feature specifications
│   └── plans/             ← Implementation plans
└── workflows/             ← n8n workflow JSONs (40+ workflows)
    ├── WF_RESEARCH_ORCHESTRATOR.json
    ├── WF_RESEARCH_REDDIT.json
    ├── WF_RESEARCH_YOUTUBE.json
    ├── WF_RESEARCH_TIKTOK.json
    ├── WF_RESEARCH_GOOGLE_TRENDS.json
    ├── WF_RESEARCH_QUORA.json
    ├── WF_RESEARCH_CATEGORIZE.json
    ├── WF_KEN_BURNS.json              ← Replaces WF_I2V + WF_T2V
    ├── WF_THUMBNAIL.json
    ├── WF_PLATFORM_METADATA.json
    ├── WF_SCHEDULE_PUBLISHER.json
    ├── WF_COMMENTS_SYNC.json
    ├── WF_COMMENT_ANALYZE.json
    ├── WF_QA_CHECK.json
    ├── WF_RETRY_WRAPPER.json
    ├── WF_MUSIC_GENERATE.json
    ├── WF_ENDCARD.json
    ├── WF_SCENE_CLASSIFY.json         ← NEW (Remotion hybrid)
    └── WF_REMOTION_RENDER.json        ← NEW (Remotion hybrid)
├── dashboard/src/remotion/
│   ├── templates/
│   │   ├── index.js
│   │   ├── shared/
│   │   │   ├── MoodTheme.js
│   │   │   ├── Typography.js
│   │   │   ├── AnimatedNumber.js
│   │   │   ├── TrendArrow.js
│   │   │   └── GlassCard.js
│   │   ├── StatCallout.jsx
│   │   ├── ComparisonLayout.jsx
│   │   ├── BarChart.jsx
│   │   ├── TimelineGraphic.jsx
│   │   ├── QuoteCard.jsx
│   │   ├── ListBreakdown.jsx
│   │   ├── ChapterTitle.jsx
│   │   ├── DataTable.jsx
│   │   ├── BeforeAfter.jsx
│   │   ├── PercentageRing.jsx
│   │   ├── MapVisual.jsx
│   │   └── MetricHighlight.jsx
│   └── render-service.js        ← Node.js render endpoint
├── dashboard/src/components/production/
│   └── SceneClassificationReview.jsx  ← NEW
├── dashboard/src/hooks/
│   └── useSceneClassification.js      ← NEW
├── supabase/migrations/
│   └── 005_remotion_hybrid_rendering.sql  ← NEW
```

## Critical Rules

**IMPORTANT: Read Agent.md before building ANY workflow or dashboard component.** It's the single source of truth.

**IMPORTANT: This project uses Superpowers (obra/superpowers) as the PRIMARY build methodology.** Specs at docs/superpowers/specs/. Plans at docs/superpowers/plans/. GSD at .claude/commands/gsd/ is DEPRECATED. Use gstack selectively: /qa, /browse, /careful, /freeze, /review ONLY. Use frontend-design skill for all React work.

**IMPORTANT: Read `design-system/MASTER.md` before building any dashboard page or component.** UI UX Pro Max skill is installed at `.claude/skills/ui-ux-pro-max/` and auto-activates for UI work. All dashboard pages must follow the master design system for visual consistency. For page-specific overrides, check `design-system/pages/{page-name}.md` first.

**IMPORTANT: Never hardcode API keys or niche-specific content.** All prompts are dynamically generated per project and stored in `prompt_configs` table. System prompts, expertise profiles, and topic constraints are NEVER hardcoded in workflows.

**IMPORTANT: Audio is the master clock.** Measure duration with FFprobe (NOT file size estimation). Every visual's duration = its audio duration via FFmpeg `-t`.

**IMPORTANT: Write to Supabase after EVERY asset.** Each scene row is updated immediately — not in batch. Dashboard uses Supabase Realtime and depends on instant writes.

**IMPORTANT: 4 approval gates are mandatory.** Gate 1: Topics. Gate 2: Script. Gate 3: Video (before YouTube). Gate 4: Shorts (viral clips review before production). Pipeline PAUSES at each gate until user acts from dashboard.

**IMPORTANT: Fal.ai is the image provider.** Images via Seedream 4.0 (`fal-ai/bytedance/seedream/v4/text-to-image`). Auth: `Authorization: Key {{FAL_API_KEY}}`. Async pattern: POST to `queue.fal.run` → poll for result.

**IMPORTANT: ALL scenes use text-to-image + FFmpeg Ken Burns. No I2V or T2V.** Every scene: Seedream 4.0 image → FFmpeg zoompan (Ken Burns) + color grade → .mp4 clip. visual_type stays 'static_image' for backwards compatibility.

**IMPORTANT: Hybrid rendering — Fal.ai + Remotion.** After script approval (Gate 2), ALL scenes are AI-classified as fal_ai or remotion via WF_SCENE_CLASSIFY. Results visible on dashboard. Operator reviews and can override any classification. Must click "Accept & Proceed" before image generation starts. This applies to both long-form and short-form production. Remotion scenes use data_payload (structured JSON), not image prompts. Both tracks produce .png files that enter the same Ken Burns + color grade pipeline.

**IMPORTANT: Agency Agents (61 specialists) are installed at `~/.claude/agents/`.** They auto-activate based on context. Key agents: Frontend Developer (dashboard), Backend Architect (n8n workflows), DevOps Automator (VPS/Docker), Image Prompt Engineer (thumbnail/visual prompts), TikTok Strategist + Instagram Curator (social media posting). GSD executor agents inherit their expertise automatically.

**IMPORTANT: Shorts pipeline uses Remotion for kinetic captions.** Word-by-word pop-in, center screen, emphasis words in yellow/red. Remotion renders transparent overlays that FFmpeg composites onto clips. Installed locally on VPS, free, React-based. All shorts visuals are native 9:16 portrait with TikTok-bold aesthetic — NOT cropped from 16:9.

**IMPORTANT: 3-pass script generation.** Pass 1 (Foundation 5-7K words) → evaluate → Pass 2 (Depth 8-10K words, Pass 1 as context) → evaluate → Pass 3 (Resolution 5-7K words, summaries) → evaluate → combined evaluation. Per-pass threshold: 6.0. Combined threshold: 7.0. Max 3 regeneration attempts total.

**IMPORTANT: Topic refinement considers all 24 other topics.** When user rejects/refines one topic, Claude receives all 24 others as context to avoid overlap.

**IMPORTANT: Self-chaining architecture.** Each workflow fires the next on completion. WF_MASTER is a launcher. Every workflow handles its own errors and writes failure to Supabase.

**IMPORTANT: 9-stage cinematic production system.** Script → Image Gen → Color Grade → Ken Burns → TTS → Captions → Transitions/Assembly → End Card → Platform Render. Every scene gets: composition prefix + subject + style DNA for image prompt, FFmpeg color grading per color_mood, FFmpeg zoompan per zoom_direction, and xfade transitions between scenes. See VisionGridAI_Platform_Agent.md for all FFmpeg filter chains.

**IMPORTANT: Style DNA is LOCKED per project.** Generated during script creation, stored in projects.style_dna, appended to EVERY image prompt. Never modify between scenes. Prompt = composition_prefix + scene_subject + style_dna.

**IMPORTANT: Universal negative prompt on ALL Fal.ai calls.** Stored in n8n workflow static data. Prevents artifacts, text in images, style drift.

**IMPORTANT: Resume/checkpoint on every production workflow.** Check scene status before processing. If audio_status/image_status/clip_status != 'pending', skip that scene. topics.pipeline_stage tracks last completed stage globally.

**IMPORTANT: Exponential backoff retry on ALL external API calls.** 1s → 2s → 4s → 8s, max 4 attempts. Applied via WF_RETRY_WRAPPER sub-workflow.

**IMPORTANT: Content Calendar at /project/:id/calendar.** Visual scheduling across YouTube, TikTok, Instagram. WF_SCHEDULE_PUBLISHER cron checks every 15 min.

**IMPORTANT: Engagement Hub at /project/:id/engagement.** Unified comments from all platforms. AI intent scoring. AI-suggested replies.

**IMPORTANT: Auto-pilot mode per project.** When enabled: topics auto-approved if score > threshold, scripts auto-approved if eval > threshold, videos publish as UNLISTED. Never public automatically.

**IMPORTANT: Topic Intelligence research engine.** The `/research` route is a global page (not project-scoped) for mining 5 data sources (Reddit, YouTube Comments, TikTok, Google Trends + PAA, Quora). Results feed into project creation via a dropdown in CreateProjectModal. Research tables: `research_runs`, `research_results`, `research_categories`. Orchestrator webhook: POST `/webhook/research/run` with `{ project_id }`. Keywords are derived dynamically from the project's niche + description via AI — never hardcoded.

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
| A | Project creation + niche research | Agentic | ~$0.60 |
| B | Topic + avatar generation → GATE 1 | Agentic | ~$0.20 |
| C | 3-pass script + scoring → GATE 2 | Agentic | ~$1.80 |
| C+ | Scene render classification → operator review | Agentic + Dashboard | ~$0.03 |
| D1 | TTS audio (172 scenes) | Deterministic | ~$0.30 |
| D2 | Images (Fal.ai ~108 + Remotion ~64 scenes) | Deterministic | ~$3.24 |
| D3 | Ken Burns + Color Grade (FFmpeg) | Deterministic | Free |
| D4 | Captions (ASS) + Transitions (xfade) + Assembly | Deterministic | Free |
| D5 | Background music selection + ducking | Deterministic | Free |
| D6 | End card + Thumbnail generation | Deterministic | ~$0.03 |
| D7 | Platform-specific renders (4 exports) | Deterministic | Free |
| E | QA check → Video review → GATE 3 → Publish | Dashboard | Free |
| F | YouTube/TikTok/Instagram analytics (daily cron) | Deterministic | Free |
| G | Shorts: clip from long-form → GATE 4 | Agentic + Det | ~$0.50 |
| H | Social posting (scheduled via calendar) | Cron | Free |
| TI | Topic Intelligence (5-source research) | On-demand | ~$0.13 |
| Sup | Supervisor + Comment sync + Engagement | Cron | ~$14/mo |
| **Total per video** | | | **~$6.17** |

## Development Workflow (Superpowers)

Superpowers for planning + execution. gstack for quality gates.

Workflow per feature:
1. Write spec:    docs/superpowers/specs/{date}-{feature}.md
2. Create plan:   docs/superpowers/plans/{date}-{feature}.md
3. Execute:       Superpowers subagent-driven-development
4. Quality gate:  /qa + /review (gstack)

Quality commands (gstack selective):
  /qa       — After completing any deliverable
  /browse   — Research external docs/APIs
  /careful  — AI prompts, scoring logic, FFmpeg filter chains
  /freeze   — Before merging into main
  /review   — Before marking any phase complete

> Note: GSD phases below are legacy reference. New work uses Superpowers.
> All 31 features documented in GUIDE.md.

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

## Gotchas
- Supabase REST API uses `eq.` syntax for filters: `?status=eq.pending`
- Supabase Realtime requires the table to have `REPLICA IDENTITY FULL` for UPDATE events
- Fal.ai is async — POST to `queue.fal.run/...` creates a task, poll `queue.fal.run/.../requests/{id}` for result. Auth header: `Authorization: Key {{FAL_API_KEY}}`
- Fal.ai supports native 9:16 via `image_size: "portrait_9_16"` for images — no post-processing crop needed
- YouTube API quota: 10,000 units/day, 1,600 per upload = max 6 uploads/day
- FFmpeg concat with `-c copy` avoids re-encoding and OOM on 2hr videos
- React build must be deployed to Nginx's root directory after each dashboard change
- Topic refinement is expensive (~$0.15/refinement) because it includes all 24 other topics as context
- Remotion caption rendering: ~3-5 min per clip on KVM 4 VPS. Budget ~90 min for 20 clips. Runs in background.
- Agency Agents (61 files in `~/.claude/agents/`) auto-activate by context. Don't need explicit invocation — GSD executors inherit them.
- TikTok Content Posting API requires Developer account + app approval. Instagram requires Facebook Business account.
- YouTube Shorts auto-detect by 9:16 aspect ratio + ≤60s duration. Clips >60s upload as regular vertical videos on same channel.
- Research keywords are AI-derived, not stored in the projects table. They're in `research_runs.derived_keywords`.
- Apify actors may time out on first run due to cold starts. Set timeout to 120s minimum.
- The CreateProjectModal dropdown only shows results from the latest complete research run.
- Superpowers specs/plans go in `docs/superpowers/`, NOT `.planning/` (that's legacy GSD state).
- ALL scenes now use text-to-image + FFmpeg Ken Burns. WF_I2V and WF_T2V are deprecated. WF_KEN_BURNS replaces both.
- 172-scene xfade chains hit FFmpeg memory limits. Assemble in 15-20 scene batches, then concat batches.
- Style DNA must be IDENTICAL across all scenes. Store once in projects table, never regenerate mid-video.
- Selective color scenes SKIP FFmpeg color grading — check `selective_color_element IS NOT NULL`.
- Content Calendar `/project/:id/calendar` is NEW. Engagement Hub `/project/:id/engagement` is NEW.
- Topic Intelligence `/research` is global (not project-scoped). `/project/:id/research` (NicheResearch) is per-project. They coexist.
- Auto-pilot NEVER publishes as public. Always unlisted. Human changes visibility.
- Background music ducking uses `volume=0.12` — NOT 0.5. Music should be barely perceptible under voice.
- End card duration: 3s for shorts, 5-8s for long-form. Include in total video length calculation.
- WF_RETRY_WRAPPER must be called as sub-workflow, not inline code, for n8n compatibility.
- Platform export profiles differ: TikTok CRF 20-23, YouTube Long CRF 17-19. Do NOT use one export for all.
- Ken Burns zoom intensity: 0.0015 increment for short-form (aggressive), 0.0008-0.001 for long-form (subtle).
- Composition prefixes and Style DNA templates are stored in `prompt_templates` table, not hardcoded.
- Remotion render service must be running on VPS for image generation to work. Check with `curl localhost:3100/health`.
- Remotion templates derive colors from `color_mood` field. If color_mood is null, template defaults to `cool_neutral`.
- `data_payload` must match the template's `props_schema` from `remotion_templates` table. Mismatched schema = render failure.
- Classification runs in batches of 30 scenes per Haiku call (context management).
- Operator must explicitly "Accept & Proceed" after classification review. This is NOT automatic even with auto-pilot on. Auto-pilot skips Gates 1-3 but NOT classification review (it auto-accepts if classification completes without errors).
- Short-form scenes inherit classification from parent long-form scenes. If shorts pipeline regenerates 9:16 visuals, classification runs again.
- Remotion rendering: ~1-2 seconds per scene. 64 scenes = ~90 seconds total. Much faster than Fal.ai (~3-5 seconds per image).
- Preview renders use the same Remotion service but skip Drive upload. Preview PNGs are temporary.
