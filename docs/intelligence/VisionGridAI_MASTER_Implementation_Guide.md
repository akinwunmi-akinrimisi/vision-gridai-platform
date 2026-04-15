# Vision GridAI — MASTER Growth Intelligence Implementation Guide
## Consolidated from All Research: Uploaded Analysis (14 files) + Generated Analysis (2 files)
### April 2026 | Model: Claude Opus 4.6 (`claude-opus-4-6`)

**Build Methodology:** Superpowers (obra/superpowers) primary, Anthropic frontend-design skill for all UI work, gstack selectively (/qa, /browse, /careful, /freeze, /review only)

---

> **SOURCE-OF-TRUTH:** This master guide was reconciled 2026-04-15 against the
> post-Remotion/Kinetic-removal platform (branch `main` at `aa94932`). Six
> execution-gate decisions are locked in:
>
> 1. CF18 (Production Cost Optimizer) — **DROPPED** (moot under single-track pipeline)
> 2. Script generation model — **Claude Opus 4.6** (was Sonnet 4; +$45–$90/project accepted)
> 3. Analytics page — **extend existing per-project page** (no new global `/analytics`)
> 4. Niches page — **extend ProjectsHome** (no new `/niches` route)
> 5. Competitor monitor — **extend `WF_YOUTUBE_DISCOVERY`** (reuse `yt_discovery_*` backbone)
> 6. Docs import target — **`docs/intelligence/`** (this directory)
>
> See `/docs/INTELLIGENCE_LAYER_IMPLEMENTATION.md` for the full reconciliation analysis.

---

## What This Document Is

This is the SINGLE SOURCE OF TRUTH that merges and reconciles:

1. **Uploaded Analysis** (3,734 lines, 14 files): Detailed agent definitions, prompt files, architecture, integration specs, features F01-F14, shell commands, dashboard specs, workflows
2. **Generated Competitive Intelligence** (454 lines): 5-platform teardown, competitive matrix, features F1-F12 with sprint prompts
3. **Generated Feature Prompts** (684 lines): Sprint A-F implementation prompts

**Reconciliation result:** 18 unique features (deduplicated from 26 total across both analyses), organized into 8 execution sprints, with every document file either validated, merged, or flagged for update.

---

## PART 1: Consolidated Feature List (18 Features)

### Feature Mapping: Both Analyses Reconciled

| # | Feature Name | Uploaded (F#) | Generated (F#) | Status | Priority |
|---|-------------|---------------|-----------------|--------|----------|
| CF01 | Outlier Intelligence Engine | F01 ✅ | F2 ✅ | **MERGE** — uploaded has better agent definition + prompt; generated has better dashboard spec | 🔴 HIGH |
| CF02 | Topic SEO Scoring | F02 ✅ | F1 ✅ (Keyword Intelligence) | **MERGE** — uploaded has topic-level scoring; generated has broader keyword research. Both needed. | 🔴 HIGH |
| CF03 | RPM Niche Intelligence | F03 ✅ | — | **KEEP from uploaded** — generated missed this. Unique: predicts revenue per niche before committing. | 🔴 HIGH |
| CF04 | Competitor Channel Monitor | F04 ✅ | F3 ✅ | **MERGE** — nearly identical. Uploaded has better agent logic; generated has better UI wireframe. | 🔴 HIGH |
| CF05 | CTR Title Optimizer | F05 ✅ | — (partial in F7 SEO Studio) | **KEEP from uploaded** — generates 5 title variants with structural formula scoring. Generated only had SEO optimization. | 🔴 HIGH |
| CF06 | CTR Thumbnail Scorer | F06 ✅ | — | **KEEP from uploaded** — Claude Vision scoring of thumbnails on 7 factors. Generated missed this entirely. | 🔴 HIGH |
| CF07 | Background Music + Voice Ducking | — | F4 ✅ | **KEEP from generated** — uploaded completely missed background music. Critical gap. | 🔴 HIGH |
| CF08 | Daily Idea Engine | — | F5 ✅ | **KEEP from generated** — uploaded missed this VidIQ-inspired feature. 15-20 scored ideas/day. | 🟡 HIGH |
| CF09 | AI Growth Coach | — | F6 ✅ | **KEEP from generated** — uploaded missed the chat-based advisor. VidIQ's most differentiated feature. | 🟡 HIGH |
| CF10 | Post-Publish Analytics Dashboard | F08 ✅ | — (partial in existing spec) | **KEEP from uploaded** — richer spec with PPS accuracy scatter plot and revenue intelligence. | 🟡 HIGH |
| CF11 | Niche Health Score | F09 ✅ | — | **KEEP from uploaded** — weekly health score (0-100) tracking if a niche is dying or thriving. | 🟡 MEDIUM |
| CF12 | Viral Moment Pre-Scoring in Scripts | F10 ✅ | F10 ⭐ (Hook Analyzer) | **MERGE** — uploaded tags viral moments in Pass 3; generated scores hooks per chapter. BOTH are needed — they're complementary. | 🟡 MEDIUM |
| CF13 | ⭐ Predictive Performance Score (PPS) | F11 ✅ | F9 ⭐ | **MERGE** — both propose pre-production performance prediction. Uploaded has a weighted formula; generated has revenue ROI focus. Combine into one PPS system. | 🔴 HIGH |
| CF14 | ⭐ Style DNA Extractor | F12 ✅ | — | **KEEP from uploaded** — transparent reverse-engineering of competitor channel style. Unique feature. | 🟡 MEDIUM |
| CF15 | ⭐ Revenue Attribution Engine | F13 ✅ | — | **KEEP from uploaded** — maps production cost to actual revenue per topic. No competitor does this. | 🟡 MEDIUM |
| CF16 | ⭐ Audience Memory Layer | F14 ✅ | — | **KEEP from uploaded** — AI learns from audience comments over time. v4.0+ feature. | 🟢 LOW |
| CF17 | A/B Testing Engine | — | F8 ✅ | **KEEP from generated** — uploaded missed TubeBuddy's killer feature. Title/thumbnail rotation testing. | 🟡 HIGH |

### What Each Analysis Missed

| Uploaded Analysis Missed | Generated Analysis Missed |
|-------------------------|--------------------------|
| F4: Background Music (critical gap) | F03: RPM Niche Intelligence |
| F5: Daily Idea Engine (VidIQ's best feature) | F05: CTR Title Optimizer (5 variants) |
| F6: AI Growth Coach (VidIQ differentiator) | F06: CTR Thumbnail Scorer (Vision) |
| F8: A/B Testing (TubeBuddy's moat) | F09: Niche Health Score |
| — | F12: Style DNA Extractor |
| — | F13: Revenue Attribution Engine |
| — | F14: Audience Memory Layer |

---

## PART 2: Consolidated Execution Sprints

### Sprint Order (incorporating build methodology)

**Before starting:** Complete the existing 7-phase Dashboard Optimization (59 fix items, 17-25 hours).

**Methodology per sprint:**
- Start each sprint with Superpowers `/new-feature` flow
- Use Anthropic frontend-design skill for ALL React component work
- Use gstack `/qa` for verification, `/review` for code review, `/careful` for complex logic
- All Claude API calls use model: `claude-opus-4-6`

| Sprint | Features | Source | Effort | Prerequisites |
|--------|----------|--------|--------|--------------|
| **S1: Intelligence Foundation** | CF01 (Outlier) + CF02 (SEO) + CF03 (RPM) | Both | 14-18 hrs | Dashboard optimization done |
| **S2: Competitive Intel** | CF04 (Competitor Monitor) + CF14 (Style DNA) | Uploaded | 10-14 hrs | S1 |
| **S3: CTR Optimization** | CF05 (Title CTR) + CF06 (Thumbnail CTR) + CF17 (A/B Test) | Both | 12-16 hrs | S1 |
| **S4: Prediction Engine** | CF13 (PPS) + CF12 (Hook + Viral Scoring) | Both | 10-14 hrs | S1 + S2 |
| **S5: Media Enhancement** | CF07 (Background Music) | Generated | 4-6 hrs | Dashboard Phase 3 done |
| **S6: AI Advisory** | CF08 (Daily Ideas) + CF09 (AI Coach) | Generated | 14-18 hrs | S1 + S2 |
| **S7: Analytics Loop** | CF10 (Analytics Dashboard) + CF15 (Revenue Attribution) + CF11 (Niche Health) | Uploaded | 12-16 hrs | S1 + S4 |
| **S8: Audience Intelligence** | CF16 (Audience Memory) | Uploaded | 6-8 hrs | S7 |

**Total: 82-110 hours across 8 sprints**

---

## PART 3: File-by-File Reconciliation

### Which Uploaded Files to Use vs. Update

| File | Lines | Verdict | Action |
|------|-------|---------|--------|
| `ANALYSIS.md` | 615 | ✅ STRONG but missing 6 features | **SUPERSEDED by this document** — use this master guide instead |
| `agent.md` | 246 | ✅ EXCELLENT agent definitions | **USE AS-IS** but update all "Claude Sonnet" → "Claude Opus 4.6" (`claude-opus-4-6`) |
| `features.md` | 469 | ✅ EXCELLENT but missing CF07-CF09, CF17-CF18 | **EXTEND** — add 5 missing features from generated analysis |
| `architecture.md` | 227 | ✅ EXCELLENT system diagrams + token budgets | **UPDATE** — change model references to Opus 4.6, add Daily Ideas and AI Coach to architecture diagram |
| `dashboard.md` | 226 | ✅ GOOD new page specs | **EXTEND** — add Daily Ideas page, AI Coach page, A/B Testing panel |
| `workflows.md` | 260 | ✅ EXCELLENT user journeys | **EXTEND** — add "Daily Ideation Workflow" and "A/B Testing Workflow" |
| `skills.md` | 244 | ✅ EXCELLENT skills 19-26 | **EXTEND** — add Skills 27-31 (Daily Ideas, AI Coach, A/B Test, Background Music, Cost Optimizer) |
| `skills.sh` | 221 | ✅ EXCELLENT shell commands | **EXTEND** — add commands for new skills |
| `integrations.md` | 397 | ✅ EXCELLENT API specs + quota management | **EXTEND** — add Anthropic API (for Coach), background music storage |
| `outlier_intelligence.md` | 134 | ✅ PRODUCTION-READY prompt | **UPDATE** — change model to Opus 4.6 |
| `topic_scorer.md` | 147 | ✅ PRODUCTION-READY prompt | **UPDATE** — change model to Opus 4.6 |
| `title_ctr_scorer.md` | 167 | ✅ PRODUCTION-READY prompt | **UPDATE** — change model to Opus 4.6 |
| `thumbnail_ctr_scorer.md` | 179 | ✅ PRODUCTION-READY prompt | **UPDATE** — change model to Opus 4.6 |
| `style_dna_extractor.md` | 202 | ✅ PRODUCTION-READY prompt | **UPDATE** — change model to Opus 4.6 |

### New Files Needed (from Generated Analysis, not in Uploaded)

| File | Purpose | Source |
|------|---------|--------|
| `prompts/daily_ideas_generator.md` | NEW PROMPT — Daily idea generation prompt | Generated F5 |
| `prompts/ai_coach_system.md` | NEW PROMPT — AI Coach system prompt with context injection | Generated F6 |
| `prompts/hook_analyzer.md` | NEW PROMPT — Per-chapter hook scoring | Generated F10/⭐ |
| `prompts/ab_test_variant_generator.md` | NEW PROMPT — A/B test title/thumbnail variant generation | Generated F8 |
| `prompts/background_music_selector.md` | NEW PROMPT — Music mood selection per niche | Generated F4 |

---

## PART 4: Master Sprint Prompts

### Sprint S1: Intelligence Foundation (CF01 + CF02 + CF03)

```
You are executing Sprint S1 using Superpowers methodology. Your role combines
Senior Search Intelligence Engineer + YouTube Algorithm Analyst + Niche Revenue Strategist.

## BUILD METHODOLOGY
- Use Superpowers: /new-feature for each deliverable
- Use Anthropic frontend-design skill before creating any React component
- Use gstack /careful for all database migration work
- Use gstack /qa after each deliverable
- Model: claude-opus-4-6 for ALL API calls

## REFERENCE FILES (READ THESE FIRST)
1. uploaded_analysis/features.md → F01, F02, F03 specifications
2. uploaded_analysis/agent.md → OutlierIntelligenceAgent + SEOScoringAgent definitions
3. uploaded_analysis/integrations.md → YouTube API endpoints + quota management
4. uploaded_analysis/outlier_intelligence.md → Production prompt for outlier scoring
5. uploaded_analysis/topic_scorer.md → Production prompt for SEO scoring
6. uploaded_analysis/architecture.md → System architecture + token budgets
7. VisionGridAI_Competitive_Intelligence_Analysis.md → Feature F1, F2 dashboard specs
8. VisionGridAI_YouTube_Growth_Features_Prompts.md → Sprint A prompt (Keyword Intelligence)

## DELIVERABLE 1: Supabase Migration (gstack /careful)

Create supabase/migrations/003_intelligence_foundation.sql combining:
- From uploaded features.md F01: outlier_score, algorithm_momentum, competing_videos_count columns on topics
- From uploaded features.md F02: seo_score, seo_classification, primary_keyword columns on topics
- From uploaded features.md F03: niche_rpm_category, estimated_rpm_range columns on projects
- From generated F1: full keywords table (seed_keywords, keywords, topic_keywords junction)
- From generated F2: tracked_channels, outlier_videos tables
- All tables include project_id FK with ON DELETE CASCADE

## DELIVERABLE 2: n8n Workflows (3 new)

Build these following the exact agent logic from uploaded agent.md:

1. WF_OUTLIER_SCORE — follows OutlierIntelligenceAgent decision logic exactly
   - Uses prompt from uploaded outlier_intelligence.md (update model to claude-opus-4-6)
   - Triggered after WF_TOPIC_GENERATE
   - Writes to topics.outlier_score

2. WF_SEO_SCORE — follows SEOScoringAgent decision logic exactly
   - Uses prompt from uploaded topic_scorer.md (update model to claude-opus-4-6)
   - Runs parallel with WF_OUTLIER_SCORE
   - Writes to topics.seo_score + topics.primary_keyword

3. WF_KEYWORD_SCAN — from generated Sprint A
   - Broader keyword research (not topic-specific like SEO scoring)
   - Populates keywords table for the Keywords dashboard page
   - Triggered manually from dashboard or automatically during topic generation

## DELIVERABLE 3: RPM Intelligence (from uploaded F03)

Extend WF_NICHE_RESEARCH to include:
- YouTube category RPM classification (from uploaded features.md F03 spec)
- Writes estimated_rpm_range and niche_rpm_category to projects table
- Uses YouTube category data + Claude Opus 4.6 analysis

## DELIVERABLE 4: Dashboard Pages (use Anthropic frontend-design skill)

Before creating any component, read the frontend-design SKILL.md:
/mnt/skills/public/frontend-design/SKILL.md

1. Keywords Page (/project/{id}/keywords) — from generated Sprint A
   - Keyword table with scores, trends, related keywords
   - "Scan Keywords" action button
   - "Use in Topic Generation" per-keyword action

2. Enhanced Gate 1 (Topic Review) — from uploaded dashboard.md
   - Add outlier_score + seo_score badges to each topic card
   - Add Outlier vs SEO scatter chart (Recharts)
   - Add "Recommended" badge on top 5 by combined score
   - Add sort-by options: Combined Score, Outlier Score, SEO Score

3. Sidebar entries:
   - Add "Keywords" between Dashboard and Topics (icon: Search)

## DELIVERABLE 5: SEO Optimization Panel — from generated F7

Add to Video Review page (Gate 3):
- SEO Score panel (0-100) with per-field suggestions
- One-click title/description/tag optimization
- Uses keyword data from CF02

## VERIFICATION (gstack /qa)
After building, verify:
- [ ] outlier_score appears on all 25 topic cards in Gate 1
- [ ] seo_score appears alongside outlier_score
- [ ] Scatter chart renders with correct axes
- [ ] Keywords page loads and shows keyword table
- [ ] SEO panel appears on Video Review page
- [ ] All API calls use model: claude-opus-4-6
- [ ] No hardcoded API keys (use n8n credential store)
```

---

### Sprint S2: Competitive Intelligence (CF04 + CF14)

```
Sprint S2 using Superpowers methodology. Your role is Senior Competitive Intelligence Engineer.

## BUILD METHODOLOGY
Same as S1. Read frontend-design SKILL.md before any UI work.

## REFERENCE FILES
1. uploaded_analysis/features.md → F04, F12 specifications
2. uploaded_analysis/agent.md → CompetitorMonitorAgent definition
3. uploaded_analysis/integrations.md → YouTube Channels API + PlaylistItems API specs
4. uploaded_analysis/style_dna_extractor.md → Production prompt for Style DNA
5. uploaded_analysis/dashboard.md → Intelligence Hub page spec
6. VisionGridAI_YouTube_Growth_Features_Prompts.md → Sprint B prompt (Outlier Detection dashboard)

## DELIVERABLES
1. Supabase migration: competitor_channels, competitor_videos, competitor_alerts, style_profiles tables
2. WF_COMPETITOR_MONITOR (daily cron) — follows CompetitorMonitorAgent logic from agent.md
3. WF_STYLE_DNA (manual trigger) — uses style_dna_extractor.md prompt (update to Opus 4.6)
4. Intelligence Hub page (/project/{id}/intelligence) — merge uploaded dashboard.md spec + generated Outliers page wireframe
5. Sidebar: add "Intelligence" and "Outliers" entries
```

---

### Sprint S3: CTR Optimization (CF05 + CF06 + CF17)

```
Sprint S3. Your role is Senior CTR Optimization Engineer + Experimentation Specialist.

## REFERENCE FILES
1. uploaded_analysis/features.md → F05, F06 specifications
2. uploaded_analysis/agent.md → CTROptimizationAgent definition
3. uploaded_analysis/title_ctr_scorer.md → Production prompt (update to Opus 4.6)
4. uploaded_analysis/thumbnail_ctr_scorer.md → Production prompt (update to Opus 4.6)
5. VisionGridAI_YouTube_Growth_Features_Prompts.md → Sprint F (A/B Testing)

## DELIVERABLES
1. WF_CTR_OPTIMIZE — generates 5 title variants with CTR scores (from uploaded)
2. WF_THUMBNAIL_SCORE — Claude Vision analysis of thumbnails (from uploaded)
3. A/B Testing system — from generated F8: ab_tests table, WF_AB_TEST_ROTATE cron, Analytics panel
4. Gate 3 enhancement: Title Picker (5 variants ranked by CTR score), Thumbnail Score panel
```

---

### Sprint S4: Prediction Engine (CF13 + CF12)

```
Sprint S4. Your role is Senior Predictive Analytics Engineer.

## REFERENCE FILES
1. uploaded_analysis/features.md → F10 (viral moments), F11 (PPS)
2. VisionGridAI_YouTube_Growth_Features_Prompts.md → Sprint C (Predictive ROI + Hook Analyzer)

## DELIVERABLES — MERGE BOTH APPROACHES:

1. PPS Calculator (combine both):
   - Use uploaded F11's weighted formula: PPS = (0.30 × outlier) + (0.20 × seo) + (0.20 × script_quality) + (0.15 × niche_health) + (0.15 × ctr_pre_score)
   - Add generated F9's revenue ROI range: predicted views → revenue → ROI at niche CPM
   - Both displayed on Gate 1 topic cards

2. Hook Analyzer (from generated F10⭐):
   - Per-chapter hook scoring (curiosity gap, emotional trigger, specificity, pattern interrupt, open loop)
   - Rewrite suggestions for weak hooks
   - New tab on Script Review page

3. Viral Moment Pre-Scoring (from uploaded F10):
   - During Pass 3, tag each paragraph with viral_potential + shorts_worthiness scores
   - These pre-populate Gate 4 (shorts review) recommendations

```

---

### Sprint S5: Media Enhancement (CF07)

```
Sprint S5. Your role is Senior Audio Engineer.

## REFERENCE FILES
VisionGridAI_New_Feature_Implementation_Prompts.md → Feature N4 (Background Music)

## DELIVERABLES
1. Music library on VPS (/opt/vision-gridai/music/)
2. music_tracks Supabase table
3. FFmpeg voice ducking integration in WF_CAPTIONS_ASSEMBLY and WF_SHORTS_ASSEMBLY
4. Settings integration (music toggle, volume slider, mood selection)

Update all model references to claude-opus-4-6.
```

---

### Sprint S6: AI Advisory (CF08 + CF09)

```
Sprint S6. Your role is Senior Growth Product Manager + Conversational AI Engineer.

## REFERENCE FILES
VisionGridAI_YouTube_Growth_Features_Prompts.md → Sprint E (Daily Ideas + AI Coach)

## DELIVERABLES
1. daily_ideas table + WF_DAILY_IDEAS cron
2. Daily Ideas page (/project/{id}/ideas)
3. coach_sessions table
4. AI Coach page (/project/{id}/coach) — chat interface with context injection
5. NEW PROMPTS: prompts/daily_ideas_generator.md, prompts/ai_coach_system.md
6. Sidebar entries: "Daily Ideas" (icon: Lightbulb), "AI Coach" (icon: MessageCircle)

All using claude-opus-4-6.
```

---

### Sprint S7: Analytics Loop (CF10 + CF15 + CF11)

```
Sprint S7. Your role is Senior Analytics Engineer.

## REFERENCE FILES
1. uploaded_analysis/features.md → F08 (Analytics), F09 (Niche Health), F13 (Revenue Attribution)
2. uploaded_analysis/dashboard.md → Page 11 (Analytics) spec with PPS accuracy scatter

## DELIVERABLES
1. Enhanced Analytics page with PPS accuracy scatter plot, revenue intelligence
2. WF_REVENUE_ATTRIBUTION monthly workflow
3. WF_NICHE_HEALTH weekly workflow + niche_health_history table
4. Niche Health badge on project cards
5. PPS calibration loop (compare predicted vs actual, adjust weights)
```

---

### Sprint S8: Audience Intelligence (CF16)

```
Sprint S8. Your role is Senior Audience Research Engineer.

## REFERENCE FILES
uploaded_analysis/features.md → F14 (Audience Memory Layer)

## DELIVERABLES
1. WF_AUDIENCE_INTELLIGENCE weekly workflow (YouTube comments.list → Claude analysis)
2. audience_insights table
3. Script generation prompt extension: {{audience_context}} block injected into Pass 1
4. Dashboard: audience insights panel showing recurring questions, persona patterns
```

---

## PART 5: Model Update — Claude Opus 4.6

**CRITICAL: Apply across ALL files.**

Every reference to Claude Sonnet must be updated:

| File | Change |
|------|--------|
| All 5 uploaded prompt files (*.md) | `Model: Claude Sonnet` → `Model: Claude Opus 4.6 (claude-opus-4-6)` |
| uploaded agent.md | All `Model: Claude Sonnet` → `Model: Claude Opus 4.6` |
| uploaded architecture.md | Model Selection Strategy table: all Sonnet → Opus 4.6, Haiku stays for cost-sensitive tasks |
| uploaded skills.md | All model references → Opus 4.6 |
| uploaded integrations.md | Anthropic API reference → Opus 4.6 |
| All n8n workflows | HTTP Request body: `"model": "claude-opus-4-6"` |
| VisionGridAI_Platform_Agent.md | All Sonnet → Opus 4.6 |
| CLAUDE.md | Model reference → Opus 4.6 |
| prompt_configs table defaults | model field → Opus 4.6 |
| New feature code (CF01-CF18) | All use Opus 4.6 |

**Exception:** Keep Claude Haiku for cost-sensitive batch operations:
- WF_COMPETITOR_MONITOR daily monitoring (Haiku)
- WF_NICHE_HEALTH weekly aggregation (Haiku)
- Comment classification in WF_AUDIENCE_INTELLIGENCE (Haiku)

---

## PART 6: Architecture Diagram (Updated)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VISION GRIDAI PLATFORM v4.0                          │
│                    Model: Claude Opus 4.6 (claude-opus-4-6)                 │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                   INTELLIGENCE LAYER (18 features)                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │ Outlier  │ │   SEO    │ │Competitor│ │  Niche   │ │  Style   │  │  │
│  │  │ Intel    │ │ Scoring  │ │ Monitor  │ │  Health  │ │   DNA    │  │  │
│  │  │ (CF01)   │ │ (CF02)   │ │ (CF04)   │ │ (CF11)   │ │ (CF14)   │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │RPM Intel │ │ CTR Title│ │CTR Thumb │ │  Daily   │ │   AI     │  │  │
│  │  │ (CF03)   │ │ (CF05)   │ │ (CF06)   │ │  Ideas   │ │  Coach   │  │  │
│  │  │          │ │          │ │ (Vision) │ │ (CF08)   │ │ (CF09)   │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              ↕ feeds into                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │              PRODUCTION PIPELINE (14 stages + 4 gates)                │  │
│  │  Niche Research → Topics(25) → ⭐PPS+Hook Score → Gate1              │  │
│  │  → Script(3-pass) + Viral Tagging → Gate2 → TTS → Images            │  │
│  │  → 🎵Music+Ducking (single-track Fal.ai + Ken Burns) → Assembly → Gate3  │  │
│  │  → ⭐CTR Title Picker + Thumb Score → SEO Studio → Publish           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              ↕                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │               SHORTS PIPELINE (10 stages + Gate4)                     │  │
│  │  Viral Clip Analysis → Gate4 → 9:16 Media → Kinetic Captions         │  │
│  │  → 🎵Music → Assembly → Social Publish (TikTok/IG/YT Shorts)        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              ↕                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │               ANALYTICS FEEDBACK LOOP (new)                           │  │
│  │  YouTube Analytics → ⭐Revenue Attribution → ⭐PPS Calibration        │  │
│  │  → ⭐Audience Memory → A/B Testing → Next Topic Intelligence          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │               DASHBOARD (React 18 + Tailwind)                         │  │
│  │  Existing: Projects, Dashboard, Topics, Scripts, Production,          │  │
│  │            Video Review, Analytics, Shorts, Social, Settings          │  │
│  │  New:      Keywords, Intelligence Hub, Daily Ideas, AI Coach,         │  │
│  │            Niche Manager, A/B Testing panel                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  n8n: 38+ workflows | Supabase: 15+ tables | Fal.ai + GCP TTS + Opus 4.6  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PART 7: Complete File Inventory

### Files to Copy INTO the Repo (from uploaded analysis)

These are production-ready and should be placed in the repo with only the model update:

| File | Destination | Action |
|------|------------|--------|
| `agent.md` | `/docs/agent_intelligence.md` | Copy + update model refs to Opus 4.6 |
| `features.md` | `/docs/features_intelligence.md` | Copy + extend with CF07-CF09, CF17-CF18 |
| `architecture.md` | `/docs/architecture_intelligence.md` | Copy + update model refs + add new components |
| `dashboard.md` | `/docs/dashboard_intelligence.md` | Copy + extend with new pages |
| `workflows.md` | `/docs/workflows_intelligence.md` | Copy + extend with new journeys |
| `skills.md` | Append to existing `skills.md` | Merge new skills 19-26 + add 27-31 |
| `skills.sh` | Append to existing `skills.sh` | Merge new commands + add for CF07-CF09, CF17-CF18 |
| `integrations.md` | `/docs/integrations_intelligence.md` | Copy + extend with Anthropic API for Coach |
| `outlier_intelligence.md` | `/prompts/outlier_intelligence.md` | Copy + update model to Opus 4.6 |
| `topic_scorer.md` | `/prompts/topic_scorer.md` | Copy + update model to Opus 4.6 |
| `title_ctr_scorer.md` | `/prompts/title_ctr_scorer.md` | Copy + update model to Opus 4.6 |
| `thumbnail_ctr_scorer.md` | `/prompts/thumbnail_ctr_scorer.md` | Copy + update model to Opus 4.6 |
| `style_dna_extractor.md` | `/prompts/style_dna_extractor.md` | Copy + update model to Opus 4.6 |

### Files to Create NEW

| File | Purpose |
|------|---------|
| `/prompts/daily_ideas_generator.md` | CF08 — Daily idea generation prompt |
| `/prompts/ai_coach_system.md` | CF09 — AI Coach system prompt |
| `/prompts/hook_analyzer.md` | CF12 — Hook scoring prompt |
| `/prompts/ab_test_variants.md` | CF17 — A/B test variant generation prompt |
| `/prompts/background_music_selector.md` | CF07 — Music mood selection prompt |
| This document | `/docs/MASTER_IMPLEMENTATION_GUIDE.md` |

---

## PART 8: The Instructional Prompt to Start Building

Copy this into Claude Code to begin Sprint S1:

```
Read /docs/MASTER_IMPLEMENTATION_GUIDE.md for the overall plan.

We are executing Sprint S1: Intelligence Foundation (CF01 + CF02 + CF03).

Build methodology:
- Superpowers (obra/superpowers) as primary — use /new-feature flow
- Read /mnt/skills/public/frontend-design/SKILL.md BEFORE creating any React component
- Use gstack /careful for database migrations
- Use gstack /qa for verification after each deliverable
- Model: claude-opus-4-6 for ALL Claude API calls

Reference files to read FIRST:
1. /docs/features_intelligence.md → F01, F02, F03 full specs
2. /docs/agent_intelligence.md → Agent definitions with decision logic
3. /docs/integrations_intelligence.md → YouTube API endpoints + quota management
4. /prompts/outlier_intelligence.md → Production prompt for outlier scoring
5. /prompts/topic_scorer.md → Production prompt for SEO scoring
6. VisionGridAI_Dashboard_Specification.md → Design system + component patterns
7. VisionGridAI_YouTube_Growth_Features_Prompts.md → Sprint A dashboard specs

Build in this order:
1. Supabase migration (intelligence_foundation.sql)
2. WF_OUTLIER_SCORE n8n workflow
3. WF_SEO_SCORE n8n workflow
4. WF_KEYWORD_SCAN n8n workflow
5. RPM Intelligence extension to WF_NICHE_RESEARCH
6. Keywords dashboard page
7. Gate 1 (Topic Review) enhancements with intelligence scores
8. SEO Optimization panel on Gate 3

After completing, run gstack /qa and report verification results.
Then proceed to Sprint S2.
```
