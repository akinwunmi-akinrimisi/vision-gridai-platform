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

### Topic Intelligence & Research
| Skill | Purpose |
|-------|---------|
| Reddit API (PRAW) | Fetch posts, comments, upvotes from subreddits |
| Apify Actors | Cloud scraping (TikTok, Quora, Reddit fallback) |
| pytrends | Google Trends interest data, breakout detection |
| SerpAPI | People Also Ask extraction |
| Anthropic API (Claude Haiku) | AI categorization, keyword derivation, title generation — direct, no proxy |

### Cinematic Production Pipeline
| Skill | Purpose |
|-------|---------|
| FFmpeg Ken Burns | Zoompan expressions (6 directions), scale + composite |
| FFmpeg Color Science | 7 color mood filter chains (eq + colorbalance + curves) |
| FFmpeg xfade Transitions | 5 transition types with offset calculation |
| FFmpeg Audio Ducking | Background music mixing under voiceover |
| ASS Subtitle Generation | Two-tone kinetic captions from word timestamps |
| Style DNA System | Locked visual identity per project (composition + subject + DNA) |
| Composition Library | 8 composition prefixes for image prompt architecture |
| Selective Color | Monochrome + one colored element prompt injection |
| Platform Export Profiles | CRF/bitrate/codec per platform (YouTube, TikTok, Instagram) |

### Content Management & Engagement
| Skill | Purpose |
|-------|---------|
| Content Calendar | Scheduling across YouTube/TikTok/Instagram |
| YouTube Comments API | Fetch + reply to comments |
| TikTok Comments API | Fetch engagement data |
| Instagram Graph API | Fetch comments + insights |
| AI Sentiment Analysis | Comment classification (positive/negative/neutral + intent) |

### Production Resilience
| Skill | Purpose |
|-------|---------|
| Resume/Checkpoint | Per-scene status check before processing |
| Exponential Backoff | Retry wrapper (1s→2s→4s→8s) for all API calls |
| Structured Production Logs | Per-API-call logging to production_logs table |
| Automated QA (13 checks) | Visual, caption, audio, platform compliance |

### Remotion Hybrid Rendering
| Skill | Purpose |
|-------|---------|
| Remotion Still Rendering | `npx remotion still` for single-frame data graphics |
| Remotion Template Design | React components following MoodTheme system |
| AI Scene Classification | Claude Haiku batch classification (fal_ai vs remotion) |
| Data Payload Extraction | Structured data generation for Remotion templates |
| Template Props Schema | JSON Schema validation for data_payload |

### Kinetic Typography Production
| Skill | Purpose |
|-------|---------|
| Pillow Frame Rendering | Background gradients, particle compositing, JPEG output |
| pycairo Text Rendering | Anti-aliased text, kerning, variable weight, glow effects |
| Animation Easing | ease_out_cubic, ease_in_out_quad, ease_out_back, ease_out_elastic |
| Cached Layer Optimization | Pre-render static layers ONCE per scene, composite per frame |
| Procedural Particles | Generate, update, render floating particles with drift |
| Chunked Script Generation | Chapter outline + per-chapter scenes for long-form (>15min) |
| TTS Preprocessing | ALL_CAPS conversion, symbol expansion, card index skip |
| Scene-by-Scene Rendering | Render → assemble → delete frames per scene (memory management) |

### Development Workflow Tools
| Tool | Type | Purpose |
|------|------|---------|
| ~~GSD (Get Shit Done)~~ | ~~Slash commands~~ | **DEPRECATED.** Legacy only. |
| **Superpowers** | Plugin + docs | **PRIMARY** build methodology. Specs → plans → subagent execution. |
| **gstack** | Selective only | Quality: `/qa`, `/browse`, `/careful`, `/freeze`, `/review`. No planning commands. |
| **frontend-design** | Auto-activating skill | Production-grade UI. Read SKILL.md before any React work. |
| UI UX Pro Max | Auto-activating skill | Design system generator (67 styles, 96 palettes). |
| Agency Agents (61) | Context-activated | Domain specialists. Auto-activate by task. |
| n8n Agent Commands | Slash commands | Workflow audit, Supabase queries. |
| Remotion | npm package | Kinetic captions for shorts. |

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
| **A:** Project + Niche Research | n8n Workflow, API Credentials | Supabase |
| **B:** Topics + Avatars → GATE 1 | n8n Expressions, API Credentials | Supabase |
| **C:** 3-Pass Script (extended schema) | Claude API, Style DNA, Composition Library | Supabase |
| **D1:** TTS Audio (172 scenes) | Google Cloud TTS, FFmpeg | Resume/Checkpoint |
| **D2:** Image Gen (172 Seedream 4.0) | Fal.ai, Style DNA, Composition Library, Selective Color | Negative Prompt, Resume/Checkpoint |
| **D3:** Ken Burns + Color Grade | FFmpeg Ken Burns, FFmpeg Color Science | Resume/Checkpoint |
| **D4:** Captions + Transitions + Assembly | ASS Subtitles, FFmpeg xfade, FFmpeg concat | Offset Calculation |
| **D5:** Background Music | FFmpeg Audio Ducking, Music Library | AI Music Mood |
| **D6:** End Card + Thumbnail | FFmpeg fade, Fal.ai, Sharp/Jimp text overlay | — |
| **D7:** Platform Renders | Platform Export Profiles | — |
| **E:** QA → GATE 3 → Publish | Automated QA (13 checks) | — |
| **F:** Analytics (cron) | YouTube/TikTok/Instagram APIs | Supabase |
| **G:** Shorts (clipped from long-form) → GATE 4 | Remotion, FFmpeg | — |
| **H:** Social Posting (calendar-scheduled) | Content Calendar, TikTok/Instagram APIs | Cron |
| **TI:** Topic Intelligence | Reddit, YouTube, TikTok, Trends, Quora scraping | AI Categorization |
| **Engagement:** Comment Management | YouTube/TikTok/Instagram Comment APIs | AI Sentiment, AI Reply |
| **C+:** Scene Classification | AI Classification (Haiku), Supabase | Dashboard review UI |
| **D2a:** Fal.ai Image Gen | Fal.ai, Style DNA, Composition Library | Negative Prompt, Resume |
| **D2b:** Remotion Rendering | Remotion Still, Template Design, MoodTheme | Data Payload Schema |
| **Supervisor** | n8n Workflow, Supabase | — |
| **Dashboard (15 pages)** | React, **frontend-design**, Supabase Realtime, **UI UX Pro Max** | shadcn/ui |
| **Build Process** | **Superpowers**, **Agency Agents** (61) | **gstack** (selective) |
| **K1:** Kinetic Script Gen | Claude API, Chunked Prompts | Supabase |
| **K2:** Frame Rendering | Pillow, pycairo, Animation Easing, Cached Layers | Particles, JPEG |
| **K3:** Voice (TTS) | Google Cloud TTS, TTS Preprocessing | Audio sync |
| **K4:** Audio Mix | Music Library, Audio Ducking | pydub, numpy |
| **K5:** Assembly | FFmpeg, Scene-by-Scene Assembly | Disk management |
| **K6:** Upload | Google Drive API | Supabase status update |

---

## When to Use Which Skill

**Starting a new feature?** → Superpowers spec + plan at `docs/superpowers/`. Execute via subagent-driven-development.
**Building a dashboard page?** → Read `frontend-design` SKILL.md first. Then `design-system/MASTER.md`. Use `@frontend-developer` agent. Run `/qa` after.
**Writing FFmpeg Ken Burns commands?** → Check zoom_direction, get Z/X/Y expressions from Agent.md Ken Burns table. Combine with color grade filter from Color Science table.
**Writing FFmpeg color grade?** → Match `color_mood` field to the 7 filter chains in Agent.md. Exception: skip if `selective_color_element` is set.
**Writing FFmpeg transitions?** → Use xfade type from `transition_to_next` field. Calculate offset with formula. Batch 15-20 scenes for memory safety.
**Building a scraper workflow?** → `n8n Workflow Design` + source-specific skill. `@api-developer` agent. Wrap API calls in WF_RETRY_WRAPPER.
**Writing AI prompts (categorization, metadata, keyword extraction)?** → `/careful` from gstack. `@prompt-engineer` agent. Test with real data.
**Building engagement features?** → `@frontend-developer` for dashboard. `@api-developer` for comment sync. `/careful` for sentiment analysis prompt.
**Before merging into main?** → `/freeze` then `/review`.
**Debugging a pipeline crash?** → Check `production_logs` table first. Then `topics.pipeline_stage` for resume point. Then scene-level status fields.
**Credential issues?** → `API Credentials Manager`. Never hardcode. All keys in n8n credential store.
**Scene shows numbers, charts, comparisons?** → Likely `remotion`. The AI classifier catches these, but if building manually: any scene where textual accuracy matters more than photorealism goes to Remotion.
**Building a new Remotion template?** → Start from `shared/MoodTheme.js` for colors. Follow the `props_schema` pattern from `remotion_templates` table. Test with all 7 color moods before shipping.
**Classification results look wrong?** → Operator can override any scene on the dashboard. If the classifier consistently misclassifies a scene type, refine the Classification Prompt in `prompt_configs`.
**Remotion render failing?** → Check `data_payload` matches `props_schema`. Check render service is running (`curl localhost:3100/health`). Check Remotion + Chrome dependencies installed.

---

## Cost Reference

### Per-Video Cost (Long-Form, 2 Hours, 172 Scenes)

| Item | Cost |
|------|------|
| Niche research + topics | ~$0.80 |
| 3-pass script + eval | ~$1.80 |
| **Scene classification (Haiku)** | **~$0.03** |
| TTS (172 scenes) | ~$0.30 |
| Images: Fal.ai (~108 × $0.03) | ~$3.24 |
| Images: Remotion (~64 × $0.00) | $0.00 |
| Ken Burns + Color Grade | $0.00 |
| Captions + Assembly | $0.00 |
| Music + End Card + Thumbnail | ~$0.03 |
| Platform renders | $0.00 |
| **Total** | **~$6.17** |

*Was $8.06 (all Fal.ai). Saving: $1.89/video. Niche-dependent: historical niche may save less.*

### Per-Video Cost (Kinetic Typography)

| Duration | Script | TTS | Music | Total |
|----------|--------|-----|-------|-------|
| 5 min | ~$0.05 | ~$0.10 | $0 | ~$0.15 |
| 15 min | ~$0.15 | ~$0.15 | $0 | ~$0.30 |
| 2 hours | ~$1.20 | ~$0.30 | $0 | ~$1.50 |

*Compare AI Cinematic 2hr: ~$6.17. Kinetic is 76% cheaper.*

### Topic Intelligence Per Run: ~$0.13 | Monthly (16 runs): ~$2.08
### Engagement (comment sync + analysis): ~$0.02/day via Haiku
