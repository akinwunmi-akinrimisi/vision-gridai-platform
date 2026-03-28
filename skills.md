# Vision GridAI Platform — Skills Reference Map

## LobeHub Skills (installed via skills.sh)

18 skills from the LobeHub marketplace, organized by pipeline relevance.

### n8n Workflow Development
| Skill | Purpose |
|-------|---------|
| n8n Workflow Design | Core workflow architecture, node selection, error handling |
| n8n Hub | Community workflow templates and patterns |
| n8n Expression Syntax | JavaScript expressions in n8n nodes |
| n8n Custom Node Builder | For custom nodes if needed (Supabase integration, Fal.ai) |

### Google Ecosystem
| Skill | Purpose |
|-------|---------|
| Google Drive | File upload/download, folder management, permissions |
| Google Sheets CLI | Legacy reference (replaced by Supabase, but useful for data migration) |
| Google Workspace CLI (gog) | Cross-service Google operations |

### Media Production
| Skill | Purpose |
|-------|---------|
| FFmpeg Core | Fundamental FFmpeg operations, codecs, formats |
| FFmpeg Video Toolkit | Advanced video processing, concatenation, filters |
| FFmpeg Reference | Command reference for complex pipelines |
| Video Processor | General video processing patterns |

### YouTube
| Skill | Purpose |
|-------|---------|
| YouTube Uploader | Upload mechanics, resumable uploads, quota management |
| YouTube Data API v3 | Metadata, captions, thumbnails, playlists, analytics |

### AI & Automation
| Skill | Purpose |
|-------|---------|
| Google Gemini Media | TTS patterns, audio processing |
| API Credentials Manager | Secure credential handling in n8n |
| Automation Workflows | General automation patterns |

### Database & Frontend
| Skill | Purpose |
|-------|---------|
| Supabase Integration | REST API patterns, Realtime subscriptions, RLS policies |
| React Dashboard | Component architecture, state management, Tailwind patterns |

### Topic Intelligence — Data Scraping & Research
| Skill | Purpose |
|-------|---------|
| Reddit API (PRAW) | Fetch posts, comments, upvotes from subreddits |
| Apify Actors (Reddit, TikTok, Quora) | Cloud scraping for platforms without free APIs |
| YouTube Data API v3 | Already listed — also used for comment extraction in research |
| pytrends | Google Trends interest data, related queries, breakout detection |
| SerpAPI | People Also Ask extraction from Google Search |
| OpenRouter (Claude Haiku) | AI categorization, keyword derivation, video title generation |

### Development Workflow Tools
| Tool | Type | Purpose |
|------|------|---------|
| ~~GSD (Get Shit Done)~~ | ~~Slash commands~~ | **DEPRECATED for new work.** Legacy commands remain but are not used. |
| **Superpowers** (obra/superpowers) | Plugin + docs at `docs/superpowers/` | **PRIMARY build methodology.** Specs → plans → subagent-driven execution. Replaces GSD for all new work. |
| **gstack** (garrytan/gstack) | Selective commands only | Quality gates: `/qa`, `/browse`, `/careful`, `/freeze`, `/review`. Do NOT use gstack planning commands. |
| **frontend-design** (anthropics/skills) | Auto-activating skill | Production-grade UI design patterns. Read SKILL.md before any React component work. |
| UI UX Pro Max | Auto-activating skill | Design intelligence — 67 styles, 96 palettes, 57 font pairings, design system generator |
| Agency Agents (61) | Context-activated | Domain expertise. Auto-activate by task type. |
| n8n Agent Commands | Slash commands (`/n8n:*`) | n8n workflow audit, Supabase query generation |
| Remotion | Local tool (npm) | React-based video renderer for kinetic captions |

---

## Agency Agents (61 specialists in `~/.claude/agents/`)

All 61 agents from [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) are installed globally. They auto-activate based on context when GSD executor agents work on tasks.

### Most Relevant Agents Per Pipeline Area

| Area | Agent | Why |
|------|-------|-----|
| Dashboard pages | Frontend Developer | React component architecture, state management, performance |
| n8n workflows | Backend Architect | API design, data flow, error handling |
| VPS/Docker/Nginx | DevOps Automator | Infrastructure, deployment, container management |
| Supabase RLS, API keys | Security Engineer | Auth patterns, credential management |
| Webhook testing | API Tester | Endpoint validation, integration testing |
| Pipeline efficiency | Workflow Optimizer | Process analysis, bottleneck identification |
| Dashboard performance | Performance Benchmarker | Load testing, Realtime subscription handling |
| Multi-agent workflows | Agents Orchestrator | Coordinating agentic stages + supervisor |
| Shorts thumbnails/visuals | Image Prompt Engineer | AI image prompts for 9:16 TikTok aesthetic |
| TikTok posting strategy | TikTok Strategist | Platform-specific optimization, timing |
| Instagram posting strategy | Instagram Curator | Visual storytelling, Reels best practices |
| Analytics dashboard | Analytics Reporter | Data visualization, KPI tracking |
| Script quality | Content Creator | Narrative quality, engagement patterns |
| Niche research | Trend Researcher | Market intelligence, competitive analysis |
| User feedback | Feedback Synthesizer | User feedback analysis for refinement flows |
| Research scraper workflows | API Developer | External API integration, rate limits, pagination |
| Research orchestration | Backend Architect | Parallel execution, error recovery, state management |
| AI categorization prompts | Prompt Engineer | Prompt crafting, iteration, structured output |
| Google Trends normalization | Data Scientist | Trend interpretation, statistical normalization |
| Research dashboard page | Frontend Developer | React, Supabase Realtime, responsive design |
| Research E2E testing | QA Engineer | Test plans, edge cases, data integrity verification |

### Full Agency Roster (9 divisions)

**Engineering (8):** Frontend Developer, Backend Architect, Mobile App Builder, AI Engineer, DevOps Automator, Rapid Prototyper, Senior Developer, Security Engineer

**Design (7):** UI Designer, UX Researcher, UX Architect, Brand Guardian, Visual Storyteller, Whimsy Injector, Image Prompt Engineer

**Marketing (11):** Growth Hacker, Content Creator, Twitter Engager, TikTok Strategist, Instagram Curator, Reddit Community Builder, App Store Optimizer, Social Media Strategist, Xiaohongshu Specialist, WeChat Official Account Manager, Zhihu Strategist

**Product (3):** Sprint Prioritizer, Trend Researcher, Feedback Synthesizer

**Project Management (5):** Studio Producer, Project Shepherd, Studio Operations, Experiment Tracker, Senior Project Manager

**Testing (8):** Evidence Collector, Reality Checker, Test Results Analyzer, Performance Benchmarker, API Tester, Tool Evaluator, Workflow Optimizer, Accessibility Auditor

**Support (6):** Support Responder, Analytics Reporter, Finance Tracker, Infrastructure Maintainer, Legal Compliance Checker, Executive Summary Generator

**Spatial Computing (6):** XR Interface Architect, macOS Spatial/Metal Engineer, XR Immersive Developer, XR Cockpit Interaction Specialist, visionOS Spatial Engineer, Terminal Integration Specialist

**Specialized (7):** Agents Orchestrator, Data Analytics Reporter, LSP/Index Engineer, Sales Data Extraction Agent, Data Consolidation Agent, Report Distribution Agent, Agentic Identity & Trust Architect

---

## Skills × Pipeline Stage Matrix

| Pipeline Stage | Primary Skills | Secondary Skills |
|---------------|---------------|-----------------|
| **Phase A:** Project Creation + Niche Research ⚡ | n8n Workflow Design, API Credentials | Supabase Integration |
| **Phase B:** Topic + Avatar Generation ⚡ ⏸ | n8n Expressions, API Credentials | Supabase Integration |
| **Phase C:** Script Generation (3-pass) ⚡ ⏸ | API Credentials, n8n Expressions | Supabase Integration |
| **WF04:** Scene Segmentation ⚡ | API Credentials, n8n Expressions | n8n Workflow Design |
| **WF05:** Voiceover (TTS Master Clock) | Google Gemini Media, FFmpeg Core | API Credentials, Google Drive |
| **WF06:** Image Generation (Fal.ai) | API Credentials, n8n Hub | Supabase Integration |
| **WF07A:** Image-to-Video (Fal.ai) | API Credentials, n8n Hub | Supabase Integration |
| **WF07B:** Text-to-Video (Fal.ai) | API Credentials, n8n Hub | Supabase Integration |
| **WF08:** Caption Generation | n8n Expressions | Video Processor |
| **WF09:** FFmpeg Assembly | FFmpeg Core, FFmpeg Toolkit, FFmpeg Reference | Video Processor |
| **WF10:** Drive Upload | Google Drive | Supabase Integration |
| **WF11:** YouTube Upload | YouTube Uploader, YouTube Data API | API Credentials |
| **WF12:** YouTube Analytics | YouTube Data API | Supabase Integration |
| **Shorts Analysis ⚡** | API Credentials, n8n Workflow Design | Supabase Integration |
| **Shorts Production** | FFmpeg Core, Google Gemini Media, API Credentials | Supabase, Google Drive |
| **Shorts Captions** | **Remotion**, FFmpeg Core | Video Processor |
| **Social Media Posting** | API Credentials, Automation Workflows | Supabase Integration |
| **Supervisor Agent ⚡** | n8n Workflow Design, n8n Hub | Supabase Integration |
| **Dashboard (9 pages)** | React Dashboard, Supabase Integration, **UI UX Pro Max** | n8n Workflow Design |
| **Webhook API** | n8n Workflow Design, n8n Expressions | Supabase Integration |
| **Build Process** | **Superpowers** (specs → plans → subagents), **Agency Agents** (61 specialists) | gstack (`/qa`, `/review`), n8n Agent Commands |
| **TI-1:** Research Environment Setup | Supabase Integration, API Credentials, Apify | Docker (infra) |
| **TI-2:** Reddit Scraper | Reddit API (PRAW) or Apify, n8n Workflow Design | Supabase Integration |
| **TI-3:** YouTube Comments Scraper | YouTube Data API v3, n8n Workflow Design | Supabase Integration |
| **TI-4:** TikTok Scraper | Apify TikTok, n8n Workflow Design | Supabase Integration |
| **TI-5:** Google Trends + PAA | pytrends, SerpAPI, n8n Workflow Design | Data normalization |
| **TI-6:** Quora Scraper | Apify Quora, n8n Workflow Design | Deduplication |
| **TI-7:** Research Orchestrator | n8n Workflow Design, n8n Expressions | Error handling, parallel execution |
| **TI-8:** AI Categorization | OpenRouter (Haiku), Prompt Engineering | JSON parsing, retry logic |
| **TI-9:** Research Dashboard + Modal | React Dashboard, **frontend-design**, Supabase Realtime, **UI UX Pro Max** | Supabase Integration |
| **TI-10:** E2E Testing | SQL queries, API validation | Performance profiling, cost tracking |

---

## When to Use Which Skill

**Starting a new sprint?** → `/gsd:discuss-phase N` then `/gsd:plan-phase N` — GSD handles structured planning
**Building a dashboard page?** → UI UX Pro Max auto-activates. Read `design-system/MASTER.md` first. Frontend Developer agent enhances execution.
**Building a new workflow?** → Start with `n8n Workflow Design` + the stage-specific primary skill. Backend Architect agent enhances execution.
**Writing FFmpeg commands?** → `FFmpeg Core` for basics, `FFmpeg Toolkit` for assembly, `FFmpeg Reference` for edge cases
**Supabase queries not working?** → `Supabase Integration` for REST API patterns, or `/n8n:supabase-query` for n8n-specific config
**Building kinetic captions?** → Remotion components in `dashboard/src/remotion/`. Render via CLI script.
**Fal.ai integration?** → `API Credentials Manager` + async queue pattern (POST → poll). Auth: `Key` prefix, not `Bearer`.
**Social media posting?** → TikTok Strategist + Instagram Curator agents for platform strategy. API Credentials for auth.
**Credential issues?** → `API Credentials Manager` — never hardcode keys
**YouTube upload failing?** → `YouTube Uploader` for resumable upload, `YouTube Data API` for quota management
**Quick ad-hoc fix?** → `/gsd:quick` — GSD guarantees (atomic commits, state tracking) without full planning
**Starting a new Topic Intelligence phase?** → Write a Superpowers spec at `docs/superpowers/specs/`, then a plan at `docs/superpowers/plans/`. Execute via subagent-driven-development.
**Building a scraper workflow?** → Start with `n8n Workflow Design` + the source-specific skill (PRAW, Apify, pytrends, SerpAPI). Use `@api-developer` agent.
**Writing the AI categorization prompt?** → Use `/careful` from gstack. Use `@prompt-engineer` agent. Test with real data before committing.
**Building the Research page or modifying CreateProjectModal?** → Read `frontend-design` SKILL.md first. Then read `design-system/MASTER.md`. Use `@frontend-developer` agent. Run `/qa` after completion.
**Before merging Topic Intelligence into main?** → `/freeze` the current state, then `/review` all changes.
**Researching Apify actors or API docs?** → `/browse` from gstack.
**Engagement scoring logic?** → `/careful` — the normalization weights affect every result ranking.

---

## Topic Intelligence Cost Reference

| Service | Per Run | Monthly (16 runs) |
|---------|---------|-------------------|
| Reddit (PRAW) | $0.00 | $0.00 |
| YouTube Data API v3 | $0.00 | $0.00 |
| TikTok (Apify) | ~$0.05 | ~$0.80 |
| Google Trends (pytrends) | $0.00 | $0.00 |
| SerpAPI (PAA) | ~$0.01 | ~$0.16 |
| Quora (Apify) | ~$0.05 | ~$0.80 |
| OpenRouter (Haiku) | ~$0.02 | ~$0.32 |
| **Total** | **~$0.13** | **~$2.08** |
