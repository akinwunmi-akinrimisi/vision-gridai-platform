# Feature Research

**Domain:** AI Video Production Platform with Dashboard (Multi-Niche YouTube Channel Automation)
**Researched:** 2026-03-08
**Confidence:** HIGH (domain well-defined in Agent.md and Dashboard_Implementation_Plan.md; competitive landscape verified via web search)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Project/niche CRUD | Every dashboard has entity management. Without it, there's no starting point. | LOW | Simple forms + Supabase inserts. Already spec'd in Dashboard_Implementation_Plan.md Page 1. |
| Pipeline status visibility | If production is running, the user must see what stage each video is in. Blind automation is anxiety-inducing. | MEDIUM | Requires Supabase Realtime subscriptions on `topics` and `scenes` tables. Core value prop of having a dashboard at all. |
| Approval gates with approve/reject | The 3-gate model is the product's quality control mechanism. Without it, you have an uncontrolled content farm. | MEDIUM | Webhook calls to n8n + Supabase status updates. Gates at topics, scripts, and final video. |
| Script quality scoring display | If AI scores scripts, users expect to see the scores. Opaque scoring = distrust. | LOW | Read-only display of `script_evaluation` JSONB from topics table. 7-dimension radar or bar chart. |
| YouTube upload with metadata | The entire pipeline ends at YouTube. Manual upload after automated production defeats the purpose. | MEDIUM | YouTube Data API v3 with resumable uploads, metadata (title, description, tags), captions, thumbnail. Quota limit: 6/day. |
| Per-video cost tracking | Users paying ~$17/video need to know where money goes. AI API costs are opaque without tracking. | LOW | Aggregate from `cost_breakdown` JSONB on topics table. Display as breakdown chart. |
| Basic YouTube analytics | After publishing, users need to know if videos perform. Views, watch hours, CTR, and revenue are minimum. | MEDIUM | Daily cron pulling YouTube Analytics API data. Already spec'd as Phase F. |
| Error state visibility | When a scene fails (TTS timeout, image generation error), user must see it and have recourse. | MEDIUM | Display `error_log` from topics, failed scene indicators from scenes table. Retry buttons. |
| Production log / audit trail | Users need to trace what happened and when. Essential for debugging production issues. | LOW | Read from `production_log` table. Chronological event list with filters. |
| Scene-level progress tracking | 172 scenes per video means progress needs granularity beyond "in progress." Users expect to see individual scene completion. | MEDIUM | Supabase Realtime on `scenes` table. Visual grid of 172 dots/cells showing status per scene. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Dynamic niche research with web search | No competitor auto-researches a niche via live web search (competitor audit, Reddit pain points, keyword gaps, blue-ocean analysis). VidIQ/TubeBuddy give keyword data but don't build a complete niche profile. | HIGH | Phase A agentic workflow. Claude + web search tool. Produces system prompts, playlist angles, red-ocean topics, competitor analysis. This is the moat. |
| AI-generated dynamic prompts per niche | Prompts aren't hardcoded -- they're generated from research. "Credit cards" gets a Credit Card Analyst persona; "stoic philosophy" gets a Classical Philosophy Scholar. No existing platform does this. | HIGH | Depends on niche research output. Stored in `prompt_configs` table. Makes the platform truly niche-agnostic. |
| 3-pass script generation with per-pass scoring | Most AI video tools generate scripts in one shot. 3-pass (Foundation/Depth/Resolution) with independent scoring catches quality issues early. | HIGH | Pass 1 (5-7K words) -> evaluate -> Pass 2 (8-10K, Pass 1 as context) -> evaluate -> Pass 3 (5-7K, summaries) -> evaluate -> combined. Per-pass threshold: 6.0, combined: 7.0. |
| Topic refinement with full context (24 other topics) | When refining one topic, Claude sees all 24 others to avoid overlap. Prevents the common problem of AI generating near-duplicate topics. | MEDIUM | Expensive (~$0.15/refinement) but prevents topic cannibalization across the 25-video library. |
| Inline script editing with scene-level granularity | Users can edit individual scene narration and image prompts without regenerating the entire script. Fine-grained human control over AI output. | MEDIUM | Inline editing on scenes table rows. Changes propagate to downstream production. Need to handle re-triggering TTS/images for edited scenes only. |
| Real-time scene-by-scene production monitor | Live visualization showing 172 scenes filling in as each asset completes -- audio, images, video clips. No polling, instant via Supabase Realtime. Most production tools show coarse-grained progress bars. | MEDIUM | Supabase Realtime `postgres_changes` on scenes table filtered by topic_id. Visual grid with color-coded status per asset type. |
| Multi-niche portfolio management | Run multiple niches simultaneously from one dashboard. Compare CPM, revenue, and ROI across niches. No YouTube automation tool offers cross-niche portfolio analytics. | LOW | Already architected via `projects` table. Dashboard needs project switcher and cross-project analytics aggregation. |
| Customer avatar integration into scripts | Each topic has a 10-data-point avatar (name, age, occupation, pain points, emotional driver, objections, etc.) that's woven into the script. Makes scripts feel personal, not generic. | MEDIUM | Avatar data injected into script generation prompts. Display alongside topic cards for review. |
| Supervisor agent (pipeline health monitor) | Automated 30-minute cron that detects stalled workflows, failed scenes, and quota issues. Alerts before the user notices. | MEDIUM | n8n cron workflow checking for stuck states. Writes alerts to production_log. Dashboard surfaces supervisor alerts prominently. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| In-browser video editor | "Let me tweak the final video." | Massive complexity (timeline editing in browser), FFmpeg re-encoding on VPS with 16GB RAM, scope explosion. Professional editors exist. | Preview-and-approve flow. If video needs changes, reject at Gate 3 with specific feedback, re-run affected production stages. |
| Full automation (no gates) | "Just produce and publish everything automatically." | YouTube's 2025/2026 "Inauthentic Content" policy penalizes mass-produced low-quality content. One bad video can damage channel trust. Quality gates are the feature. | Keep 3 gates mandatory. Add "auto-approve" toggle per gate only after user has manually approved 5+ items and understands the quality bar. |
| Multi-format video templates | "Support Shorts, 10-minute explainers, and 2-hour docs." | Each format needs different script structure, scene counts, visual ratios, audio pacing. Supporting all multiplies complexity by 3x for v1. | Ship 2-hour documentary format only. It's the hardest format to produce manually, so automation value is highest. Add formats in v2. |
| Real-time collaboration / multi-user | "My team needs to review together." | Auth complexity, permission models, conflict resolution on concurrent edits, WebSocket scaling. Solo operator for v1. | Simple password gate for v1. If demand emerges, add invite-based team access in v2 with Supabase RLS. |
| AI chatbot for niche strategy | "Let me chat with AI about my niche strategy." | Unstructured chat produces inconsistent outputs. The structured niche research pipeline (Phase A) is more reliable. Chat encourages endless iteration without shipping. | Structured niche research with editable outputs. User reviews the generated profile and prompts, edits what they want. |
| Thumbnail editor / generator in dashboard | "Generate and customize thumbnails in the dashboard." | Image editing UI is complex. Thumbnail quality is highly subjective and benefits from external tools (Canva, Photoshop). | Generate thumbnail prompt in script metadata. Use Seedream to generate a thumbnail image. Display preview. User can download and edit externally if needed. |
| A/B testing video titles/thumbnails | "Test which title performs better." | Requires YouTube API manipulation of live videos, complex analytics tracking, and statistical significance calculations. Over-engineered for v1. | Display YouTube analytics (CTR, impressions) per video. User manually adjusts future titles based on performance data. Consider A/B testing in v2 after establishing baseline analytics. |
| Scheduling queue with calendar view | "Show me a content calendar." | Calendar UIs are complex. Publishing schedule depends on YouTube quota (6/day max) and production completion times, which are unpredictable. | Simple publish queue: approved videos listed in order. User clicks "Publish Now" or "Schedule" with a date picker. No full calendar view needed for v1. |

## Feature Dependencies

```
[Supabase Schema]
    |-- required by --> [All Dashboard Pages]
    |-- required by --> [All n8n Workflows]
    |-- required by --> [Supabase Realtime Subscriptions]

[n8n Webhook API Layer]
    |-- required by --> [Dashboard Actions (approve/reject/trigger)]
    |-- required by --> [Production Pipeline Triggers]

[Niche Research (Phase A)]
    |-- required by --> [Dynamic Prompt Generation]
                            |-- required by --> [Topic Generation (Phase B)]
                                                    |-- required by --> [Script Generation (Phase C)]
                                                                            |-- required by --> [Production Pipeline (Phase D)]
                                                                                                    |-- required by --> [Video Review + Publish (Phase E)]
                                                                                                                            |-- required by --> [YouTube Analytics (Phase F)]

[Supabase Realtime]
    |-- enhances --> [Production Monitor Page]
    |-- enhances --> [Scene Progress Tracking]
    |-- enhances --> [Topic/Script Review Pages]

[Topic Approval (Gate 1)]
    |-- required by --> [Script Generation]

[Script Approval (Gate 2)]
    |-- required by --> [TTS Audio Generation]
    |-- required by --> [Image Generation]
    |-- required by --> [Video Clip Generation]

[TTS Audio (Master Clock)]
    |-- required by --> [FFmpeg Assembly] (audio durations drive visual timing)
    |-- parallel with --> [Image Generation]
    |-- parallel with --> [I2V + T2V Generation]

[Video Approval (Gate 3)]
    |-- required by --> [YouTube Upload]

[Supervisor Agent]
    |-- enhances --> [Pipeline Health] (detects stalls, retries failures)
    |-- independent of --> [Dashboard] (runs on cron, writes to production_log)
```

### Dependency Notes

- **Supabase Schema is foundational:** Every feature reads from or writes to the database. Must be deployed first.
- **n8n Webhook API bridges dashboard to pipeline:** Without it, dashboard buttons do nothing. Must exist before any dashboard action features.
- **Niche Research -> Dynamic Prompts -> Topics -> Scripts is a strict chain:** Each phase produces outputs consumed by the next. Cannot be parallelized.
- **TTS Audio is the master clock:** Image and video generation can run in parallel with audio, but FFmpeg assembly requires all audio durations to be known. Audio MUST complete before assembly.
- **Supervisor Agent is independent:** Can be added at any point. It reads existing tables and writes to production_log. No other feature depends on it.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed to validate the concept with the first niche (US Credit Cards).

- [ ] Supabase schema deployed (all 7 tables) -- foundation for everything
- [ ] Projects Home page (create project, view all projects) -- entry point
- [ ] Project Dashboard page (pipeline status table, metrics bar) -- command center
- [ ] n8n webhook API (create project, generate topics, approve/reject/refine) -- bridge to pipeline
- [ ] Niche research workflow (Phase A: web search + Claude analysis) -- the differentiator
- [ ] Dynamic prompt generation (stored in prompt_configs) -- niche-agnostic scripts
- [ ] Topic generation + Gate 1 (approve/reject/refine with context) -- first quality gate
- [ ] Topic Review page (card layout with actions) -- human review interface
- [ ] 3-pass script generation + scoring + Gate 2 -- second quality gate
- [ ] Script Review page (quality scores + script viewer) -- human review interface
- [ ] Production pipeline (TTS -> images -> I2V/T2V -> assembly) -- the core engine
- [ ] Production Monitor page (real-time scene progress) -- visibility into production
- [ ] Video Review + Gate 3 + YouTube upload -- final gate and delivery
- [ ] Per-video cost tracking (read from cost_breakdown) -- cost awareness
- [ ] Basic YouTube analytics pull (daily cron) -- performance feedback loop
- [ ] Simple password gate -- solo operator auth

### Add After Validation (v1.x)

Features to add once the first 5-10 videos are published and performing.

- [ ] Analytics dashboard page (charts, trends, cross-video comparison) -- add when enough data exists to chart
- [ ] Settings page (per-project config: models, word counts, playlist IDs) -- add when running multiple niches
- [ ] Supervisor agent -- add when pipeline runs unattended for extended periods
- [ ] Topic refinement with full 24-topic context -- add when topic quality issues emerge
- [ ] Inline scene editing -- add when users want fine-grained script control
- [ ] Cross-niche portfolio analytics -- add when operating 2+ niches

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Additional video formats (Shorts, 10-min explainers) -- defer until 2-hour format is proven profitable
- [ ] Team access with Supabase RLS -- defer until multi-user demand exists
- [ ] Mobile-responsive dashboard -- defer until desktop workflow is solid
- [ ] A/B testing for titles/thumbnails -- defer until baseline analytics establish what "good" looks like
- [ ] Auto-approve toggle (bypass gates after N manual approvals) -- defer until trust in AI quality is established
- [ ] Content calendar / scheduling queue -- defer until publishing cadence is predictable

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Supabase schema | HIGH | LOW | P1 |
| n8n webhook API layer | HIGH | MEDIUM | P1 |
| Projects Home page | HIGH | LOW | P1 |
| Project Dashboard page | HIGH | MEDIUM | P1 |
| Niche research (Phase A) | HIGH | HIGH | P1 |
| Dynamic prompt generation | HIGH | HIGH | P1 |
| Topic generation + Gate 1 | HIGH | MEDIUM | P1 |
| Topic Review page | HIGH | MEDIUM | P1 |
| 3-pass script generation + Gate 2 | HIGH | HIGH | P1 |
| Script Review page | HIGH | MEDIUM | P1 |
| Production pipeline (D1-D4) | HIGH | HIGH | P1 |
| Production Monitor page | HIGH | MEDIUM | P1 |
| Video Review + Gate 3 | HIGH | MEDIUM | P1 |
| YouTube upload | HIGH | MEDIUM | P1 |
| Per-video cost display | MEDIUM | LOW | P1 |
| YouTube analytics cron | MEDIUM | MEDIUM | P1 |
| Simple password gate | MEDIUM | LOW | P1 |
| Analytics dashboard page | MEDIUM | MEDIUM | P2 |
| Settings page | MEDIUM | LOW | P2 |
| Supervisor agent | MEDIUM | MEDIUM | P2 |
| Topic refinement with context | MEDIUM | MEDIUM | P2 |
| Inline scene editing | MEDIUM | MEDIUM | P2 |
| Cross-niche analytics | LOW | LOW | P2 |
| Additional video formats | MEDIUM | HIGH | P3 |
| Team access / multi-user | LOW | HIGH | P3 |
| Mobile responsive | LOW | MEDIUM | P3 |
| A/B testing | LOW | HIGH | P3 |
| Content calendar | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | VidIQ / TubeBuddy | Pictory / Visla / Synthesia | n8n Community Workflows | Vision GridAI (Our Approach) |
|---------|-------------------|---------------------------|------------------------|------------------------------|
| Niche research | Keyword data only; no competitor audit, no pain point mining, no blue-ocean analysis | None | None | Full agentic research: competitor audit, Reddit/Quora pain points, keyword gaps, blue-ocean strategy, auto-generated prompts |
| Topic generation | AI topic suggestions based on channel history | None (user provides script) | Basic concept generation | 25 SEO-optimized topics with 10-data-point avatars, 3 playlist angles, viral potential scoring |
| Script writing | None | Basic script-to-video (short form) | Single-pass script | 3-pass (18-20K words), per-pass scoring, 7-dimension evaluation, 2-hour documentary format |
| Approval workflows | None (analytics only) | None (direct generation) | Basic webhook triggers | 3 mandatory gates (topics, scripts, video) with approve/reject/refine/edit actions |
| Production monitoring | N/A | N/A | Google Sheets status tracking | Real-time Supabase Realtime, scene-by-scene progress (172 scenes), color-coded asset status |
| Cost tracking | Subscription pricing only | Per-video pricing shown | Manual tracking | Automatic per-video cost breakdown (script, TTS, images, I2V, T2V) with project totals |
| YouTube analytics | Extensive (their core product) | None | Basic via API | Daily cron pull of views, watch hours, CTR, revenue, CPM per video |
| Multi-niche support | Channel-specific | N/A | N/A | Unlimited niches, each with isolated research, prompts, topics, and production |
| Video length support | N/A | Short-form (< 5 min) | Short-form (< 3 min) | 2-hour documentary (highest automation value, highest barrier to manual production) |

## Sources

- [Zapier: Best AI Video Generators 2026](https://zapier.com/blog/best-ai-video-generator/)
- [n8n: Fully Automated AI Video Generation Workflow](https://n8n.io/workflows/3442-fully-automated-ai-video-generation-and-multi-platform-publishing/)
- [Activepieces: Content Workflow Management Guide 2026](https://www.activepieces.com/blog/content-workflow-management)
- [RevID: Ultimate Guide to YouTube Automation 2026](https://www.revid.ai/blog/youtube-automation)
- [VidIQ vs TubeBuddy Comparison 2026](https://linodash.com/vidiq-vs-tubebuddy/)
- [GitHub: prakashdk/video-creator (offline AI video pipeline)](https://github.com/prakashdk/video-creator)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Supabase Reports Documentation](https://supabase.com/docs/guides/realtime/reports)
- [OutlierKit: YouTube Automation Niches 2026](https://outlierkit.com/blog/youtube-automation-niches)
- [YouTube Automation 2026 Guide (Thinkpeak AI)](https://thinkpeak.ai/youtube-automations-2026-guide/)

---
*Feature research for: AI Video Production Platform with Dashboard (Multi-Niche YouTube Channel Automation)*
*Researched: 2026-03-08*
