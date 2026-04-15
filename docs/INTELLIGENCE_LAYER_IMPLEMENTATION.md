# Intelligence Layer — Implementation Plan

**Date:** 2026-04-15
**Source:** `fresh-update/` planning package (VisionGridAI MASTER Implementation Guide + 11 supporting docs + 7 prompt files)
**Platform baseline:** branch `main` at `aa94932` — post Remotion/Kinetic removal, single visual pipeline (Fal.ai Seedream 4.0 + FFmpeg Ken Burns), AI Cinematic only.

---

## 1. Executive Summary

The Intelligence Layer is a **growth-intelligence overlay** on top of the existing 14-stage production pipeline. It does **not** change how videos are produced — it changes what topics you pick, how you decide to publish, how you price niches, and how you learn from what ships.

**Scope:** 18 features across 8 sprints, 82–110 hours total effort, ~10 new n8n workflows, ~7 new Supabase tables, ~15 ALTER TABLE column adds, 3 new dashboard pages, 2 existing gate pages get intelligence-score additions.

**Cost delta (per new-project cycle):** ~$0.55 intelligence overhead + ~$0.02/day ongoing monitoring.

**Recommendation:** Execute — but with 5 structural adjustments (see §5) to reconcile with the post-refactor platform.

---

## 2. Feature Inventory (18 Consolidated Features)

The source package reconciles two analyses (uploaded vs generated) into 18 unique features:

| ID | Feature | Sprint | Priority | Notes |
|----|---------|--------|----------|-------|
| CF01 | Outlier Intelligence Engine | S1 | 🔴 HIGH | Score each topic's algorithm-push potential |
| CF02 | Topic SEO Scoring | S1 | 🔴 HIGH | Score each topic's search-pull potential |
| CF03 | RPM Niche Intelligence | S1 | 🔴 HIGH | Niche-category → RPM range lookup |
| CF04 | Competitor Channel Monitor | S2 | 🔴 HIGH | Daily cron; outlier + topic-match alerts |
| CF05 | CTR Title Optimizer | S3 | 🔴 HIGH | 5 title variants + CTR score |
| CF06 | CTR Thumbnail Scorer | S3 | 🔴 HIGH | Claude Vision → 7-factor score + auto-regen |
| CF07 | Background Music + Voice Ducking | S5 | 🔴 HIGH | **Already partially built** (see §3) |
| CF08 | Daily Idea Engine | S6 | 🟡 HIGH | 15-20 scored ideas per day, per project |
| CF09 | AI Growth Coach | S6 | 🟡 HIGH | Chat UI with context injection |
| CF10 | Post-Publish Analytics Dashboard | S7 | 🟡 HIGH | PPS-accuracy scatter + revenue intel |
| CF11 | Niche Health Score | S7 | 🟡 MEDIUM | Weekly cron; 0–100 with trend |
| CF12 | Viral Moment Pre-Scoring (scripts) + Hook Analyzer | S4 | 🟡 MEDIUM | Pass-3 viral tags + per-chapter hook scoring |
| CF13 | Predictive Performance Score (PPS) | S4 | 🔴 HIGH | Weighted formula across CF01–CF06 |
| CF14 | Style DNA Extractor | S2 | 🟡 MEDIUM | Per-channel title/thumbnail/pillar patterns |
| CF15 | Revenue Attribution Engine | S7 | 🟡 MEDIUM | Production cost → actual revenue per topic |
| CF16 | Audience Memory Layer | S8 | 🟢 LOW | Weekly comment analysis → script context |
| CF17 | A/B Testing Engine | S3 | 🟡 HIGH | Title/thumbnail variant rotation |
| CF18 | Production Cost Optimizer | S4 | 🟡 MEDIUM | **MOOT** — see §4 conflicts |

---

## 3. Features Already Built in Current Platform

Before building, reconcile what the plan assumes is new vs what already exists:

| Planned Feature | Current Status | Action |
|-----------------|----------------|--------|
| **Topic Intelligence Engine (5-source)** — plan's F07 | ✅ Already built — `WF_RESEARCH_ORCHESTRATOR` + 5 sub-workflows (Reddit, YouTube, TikTok, Google Trends, Quora) landed Session 30 | **Skip** |
| **Background Music + Voice Ducking** — plan's CF07 | ⚠️ Partially built — `WF_MUSIC_GENERATE` uses Vertex AI Lyria; FFmpeg ducking at `volume=0.12` | **Verify + extend** — may only need the Settings toggle and mood selection prompt |
| **Thumbnails** — plan's CF06 | ⚠️ Partially built — `WF_THUMBNAIL_GENERATE` exists (3 styles, niche-aware) | **Extend** — add Claude Vision scoring + auto-regen loop |
| **YouTube Discovery + Analyze** — adjacent to CF04 | ✅ Already built — `WF_YOUTUBE_DISCOVERY` + `WF_YOUTUBE_ANALYZE` landed Session 30 | **Wire into** CF04 competitor monitor rather than building parallel |
| **SEO description/tags** — adjacent to CF05 | ✅ Already built — `WF_VIDEO_METADATA` generates full SEO payload post-assembly | **Extend** — plug title-CTR variants into Gate 3 title picker |
| **Kinetic ASS captions** — referenced in CF07 | ✅ Already built — caption burn service `:9998` (host-side libass) | **No action** |

**Net result:** 3 of 18 features are already done, 3 are partial. True build effort is closer to **14 features × ~6 hours = ~80 hours**.

---

## 4. 🚨 Conflicts with Current Platform

The Intelligence Layer planning package was drafted **before** the Remotion/Kinetic removal refactor. It contains stale references that must be reconciled:

### 4.1 Stale infrastructure references

| File | Line | Stale content | Fix |
|------|------|---------------|-----|
| `docs/architecture_intelligence.md` | 149 | `Node.js (Remotion rendering — local)` | **Remove** — service at `:3100` decommissioned |
| `docs/architecture_intelligence.md` | 150 | `Python 3.11 (Kinetic Typography engine)` | **Remove** — service at `:3200` decommissioned |
| `docs/workflows_intelligence.md` | 88 | `WF_I2V_GENERATION: 25 animated clips` | **Remove** — workflow deleted Phase 4 |
| `docs/workflows_intelligence.md` | 89 | `WF_T2V_GENERATION: 72 text-to-video clips` | **Remove** — workflow deleted Phase 4 |
| `docs/workflows_intelligence.md` | 87 | `WF_IMAGE_GENERATION: 75 Seedream 4.0 images` | **Change to** `172 Seedream 4.0 images` — single-track |
| `docs/workflows_intelligence.md` | 167–168 | `9:16 I2V clips via Wan 2.5` + `Remotion kinetic captions` | **Change to** `9:16 Ken Burns + FFmpeg libass via caption burn service :9998` |

### 4.2 🛑 CF18 Production Cost Optimizer is MOOT

The entire `prompts/cost_optimizer.md` premise — "downgrade I2V/T2V scenes to static + Ken Burns" — is already the default state. Every scene is `visual_type='static_image'` + FFmpeg Ken Burns today. There is nothing to downgrade. Cost per video is already floor-level at ~$8.09.

**Recommendation:** **DROP CF18** from the plan. Remove from Sprint S4. Delete `prompts/cost_optimizer.md` before importing. Reclaimed time (~2 hrs) can go to Sprint S3 A/B test work.

### 4.3 Model ID drift

| Location | Content | Issue |
|----------|---------|-------|
| `docs/integrations_intelligence.md` line 192 | `"model": "claude-opus-4-6-4-20250514"` | **Malformed** — should be `claude-opus-4-6` |
| All 7 prompt files | `Model: Claude Opus 4.6 (claude-opus-4-6)` | ✅ Valid per current env |
| Plan PART 5 directs: "All Sonnet → Opus 4.6" | Would swap `WF_SCRIPT_GENERATE` Sonnet 4 → Opus 4.6 | **Cost concern** — script gen is ~$1.80 today on Sonnet 4; Opus 4.6 ≈ 2–3× = $3.60–$5.40/video. At 25 videos that's +$45–$90/project. Decide explicitly. |

### 4.4 Migration numbering collision

| Plan says | Current reality |
|-----------|-----------------|
| `supabase/migrations/003_intelligence_foundation.sql` (Sprint S1 prompt) | `003_cinematic_fields.sql` **already taken** |
| `supabase/migrations/20260413_intelligence_layer.sql` (integrations doc) | Convention is `00N_name.sql`; we are at `009` |

**Fix:** Use `010_intelligence_foundation.sql`, `011_competitor_intel.sql`, `012_pps_calibration.sql`, etc. One migration per sprint to keep diffs readable.

### 4.5 Dashboard route overlap

| Plan adds | Current dashboard |
|-----------|-------------------|
| `/analytics` (global) | Existing `/project/:id/analytics` (per-project) |
| `/intelligence` (global) | No conflict — new |
| `/niches` (global) | Existing `/` (ProjectsHome) serves similar purpose |
| `/keywords` (per-project, Sprint S1) | No conflict — new |
| `/ideas` (per-project, Sprint S6) | No conflict — new |
| `/coach` (per-project, Sprint S6) | No conflict — new |

**Decision needed:** Is the Analytics page **global** (cross-project) or **per-project** (extending the existing page)? Current `Analytics.jsx` already uses the new design system (metric-card, gradient-border-visible, table-* classes) — extending is cheaper than rebuilding.

### 4.6 Design system reconciliation

Session 23-24 landed a complete dashboard design system overhaul (glass-card, metric-card, btn-primary/secondary/ghost, gradient-border-visible, stagger animations, etc.). The planning package was written before that. Every new page spec in `dashboard_intelligence.md` uses generic layouts. Before building:

- Read `design-system/MASTER.md` first
- Use the established component classes (`metric-card`, `card-elevated`, `glass-card`)
- Use Frontend Developer agent (per user's durable preference)
- Run `/qa` after each page

### 4.7 Gate 1/Gate 3 schema addition sequencing

CF01+CF02 add scores to Gate 1; CF05+CF06 add scores to Gate 3; CF13 PPS unifies both. Current Gate 1 and Gate 3 UIs were just rebuilt in Session 24. Any new column adds need to flow into the existing score panels cleanly, not bolt on separate panels.

### 4.8 File path drift

| Plan says | Current repo path |
|-----------|-------------------|
| `agent.md` / `features.md` / `architecture.md` / `dashboard.md` / `workflows.md` | Should land at `docs/agent_intelligence.md`, `docs/features_intelligence.md`, etc. (per Plan PART 7) |
| `uploaded_analysis/*` references inside sprint prompts | None of this directory structure exists — the sprint prompts reference files that don't live where they say |

**Fix:** Copy `fresh-update/docs/*.md` → `docs/intelligence/*.md` with cleaned content, and update sprint prompts to point at the new paths.

---

## 5. Recommended Structural Adjustments

Before starting Sprint S1, make these adjustments to the plan:

1. **Drop CF18** entirely (moot under single-track pipeline). Keep Sprint S4 but reduce scope to CF13 + CF12 (PPS + Hook Analyzer).

2. **Scope CF07** down to "music mood per niche + Settings toggle" — the Lyria generator, FFmpeg ducking, and `music_library` table already exist. ~1 hr, not 4–6.

3. **Treat CF04 as an extension of `WF_YOUTUBE_DISCOVERY`** rather than a new monitor workflow. Reuse `yt_discovery_runs`/`yt_discovery_results`/`yt_video_analyses` tables and add `competitor_channels` + `competitor_alerts` on top.

4. **Clarify the model cost question before Sprint S1** — do you want script gen on Opus 4.6 (+$45–$90/project) or keep Sonnet 4? Intelligence-layer features will still use Opus 4.6 as planned regardless.

5. **Decide Analytics global-vs-per-project** up front so `/analytics` route design is resolved before Sprint S7.

6. **Renumber all migrations** to `010_…` onward to match existing convention.

7. **Do an "already-built reconciliation pass"** in Sprint S1 kickoff — read `CLAUDE.md` + current schema + workflow list, mark what's already done, and trim the sprint prompts accordingly.

---

## 6. Sprint Plan (Adjusted for current platform)

| Sprint | Features | Effort | Dependencies | Output |
|--------|----------|--------|--------------|--------|
| **S0: Reconcile + stage** *(NEW)* | Import fresh-update docs with all §4 fixes; renumber migrations; draft `010_intelligence_foundation.sql` | 3–4 hrs | none | clean docs, empty migration stubs |
| **S1: Intelligence Foundation** | CF01 (Outlier) + CF02 (SEO) + CF03 (RPM) | 14–18 hrs | S0 | 3 workflows, Gate 1 score cards, Keywords page |
| **S2: Competitive Intel** | CF04 (Competitor Monitor — extend discovery) + CF14 (Style DNA) | 10–14 hrs | S1 | Intelligence Hub page, `WF_STYLE_DNA` |
| **S3: CTR + A/B Testing** | CF05 (Title CTR) + CF06 (Thumbnail CTR extension) + CF17 (A/B) | 12–16 hrs | S1 | Gate 3 title picker, Vision thumbnail scoring, A/B panel |
| **S4: Prediction** | CF13 (PPS) + CF12 (Hook Analyzer + viral pre-scoring) | 8–12 hrs | S1 + S2 | PPS card on Gate 3, hook scores on Gate 2 |
| **S5: Media polish** | CF07 verification (music mood + Settings toggle only) | 1–2 hrs | none | Settings surface update |
| **S6: AI Advisory** | CF08 (Daily Ideas) + CF09 (AI Coach) | 14–18 hrs | S1 + S2 | 2 new pages, 2 new workflows, chat context injection |
| **S7: Analytics Loop** | CF10 (extend existing Analytics) + CF15 (Revenue) + CF11 (Niche Health) | 12–16 hrs | S1 + S4 | PPS-accuracy scatter, revenue ROI, niche badge |
| **S8: Audience Memory** | CF16 (comment → script context) | 6–8 hrs | S7 | `WF_AUDIENCE_INTELLIGENCE`, Pass-1 context block |

**Total: 80–108 hours across 9 sprints** (S0 added).

---

## 7. Schema Impact

### New tables (migration `010_intelligence_foundation.sql` onward)

- `competitor_channels` (per project; ties into existing `yt_discovery_*` tables)
- `competitor_videos`
- `competitor_alerts`
- `competitor_intelligence` (weekly synthesis)
- `niche_health_history`
- `style_profiles`
- `audience_insights`
- `pps_calibration`
- `pps_config` (per-project weight tuning)
- `rpm_benchmarks` (static lookup; seed data)
- `keywords` (global keyword research — VidIQ-style)
- `topic_keywords` (junction)
- `daily_ideas` (CF08)
- `coach_sessions` (CF09)
- `ab_tests` (CF17)

### Column adds (existing tables)

- `topics`: `outlier_score`, `algorithm_momentum`, `competing_videos_count`, `outlier_data_available`, `seo_score`, `seo_classification`, `primary_keyword`, `keyword_variants`, `title_options`, `selected_title`, `title_ctr_score`, `thumbnail_ctr_score`, `thumbnail_score_breakdown`, `predicted_performance_score`, `pps_light`, `pps_recommendation`, `viral_moments`
- `projects`: `niche_rpm_category`, `estimated_rpm_low`, `estimated_rpm_mid`, `estimated_rpm_high`, `niche_health_score`, `niche_health_classification`

All adds use `ADD COLUMN IF NOT EXISTS` — idempotent, safe to re-run.

### ⚠️ Verify before migrating

Existing `topics` table already has YouTube analytics columns (`yt_ctr`, `yt_views`, etc.) from earlier sprints. The new `thumbnail_ctr_score` + `title_ctr_score` are *predicted* scores, not actual YouTube CTR. Name them `*_predicted_ctr_score` if there's any ambiguity risk.

---

## 8. Workflow Impact

**New workflows (10):**
- `WF_OUTLIER_SCORE`, `WF_SEO_SCORE`, `WF_KEYWORD_SCAN` (S1)
- `WF_COMPETITOR_MONITOR` (daily cron), `WF_STYLE_DNA` (manual) (S2)
- `WF_CTR_OPTIMIZE`, `WF_THUMBNAIL_SCORE`, `WF_AB_TEST_ROTATE` (S3)
- `WF_PREDICT_PERFORMANCE`, `WF_HOOK_ANALYZER` (S4)
- `WF_DAILY_IDEAS` (cron), `WF_AI_COACH` (on-demand) (S6)
- `WF_NICHE_HEALTH` (weekly cron), `WF_REVENUE_ATTRIBUTION` (monthly), `WF_PPS_CALIBRATE` (monthly) (S7)
- `WF_AUDIENCE_INTELLIGENCE` (weekly cron) (S8)

**Workflows to extend, not duplicate:**
- `WF_NICHE_RESEARCH` — add RPM classification step (CF03)
- `WF_TOPIC_GENERATE` — fire `WF_OUTLIER_SCORE` + `WF_SEO_SCORE` on completion
- `WF_SCRIPT_GENERATE` — embed viral pre-scoring in Pass 3, fire `WF_CTR_OPTIMIZE` on approval
- `WF_THUMBNAIL_GENERATE` — chain into `WF_THUMBNAIL_SCORE` + regen loop
- `WF_VIDEO_METADATA` — extend YouTube Analytics pull with CTR/traffic/revenue
- `WF_YOUTUBE_DISCOVERY` — reuse as competitor monitor backbone (CF04)

---

## 9. Dashboard Impact

**New pages:**
- `/project/:id/keywords` — keyword explorer (S1)
- `/intelligence` — Intelligence Hub (S2; global OR per-project — decide)
- `/project/:id/ideas` — Daily Ideas (S6)
- `/project/:id/coach` — AI Coach chat (S6)
- `/niches` — Niche Manager (S2; redundant with existing ProjectsHome — decide)

**Pages to extend:**
- **Gate 1** (Topic Review) — add outlier/SEO/combined score cards, quadrant scatter, "Recommended" badges, sort controls
- **Gate 2** (Script Review) — add Hook Analyzer tab (CF12)
- **Gate 3** (Video Review) — add PPS card, 5-variant title picker, thumbnail CTR score panel
- **Settings** — music mood + volume + budget alert threshold

**Design system compliance:** every new component uses the existing `metric-card` / `glass-card` / `btn-*` / `card-elevated` / `gradient-border-visible` / `progress-bar-*` / stagger-animation classes. Frontend Developer agent builds; `/qa` verifies.

---

## 10. Cost Impact Per Project

Pre-Intelligence baseline: ~$8.09/video × 25 topics = **~$202/project** for long-form.

Intelligence overhead per project:
| Item | Cost |
|------|------|
| CF01 Outlier scoring (25 topics × $0.002) | $0.05 |
| CF02 SEO scoring (25 topics × $0.003) | $0.08 |
| CF03 RPM classification | $0.01 |
| CF05 Title CTR (25 topics × $0.04) | $1.00 |
| CF06 Thumbnail CTR (25 thumbs × $0.10 w/ regen) | $2.50 |
| CF12 Hook Analyzer (25 × $0.05) | $1.25 |
| CF13 PPS (25 × $0.02) | $0.50 |
| CF17 A/B test variants (25 × $0.04) | $1.00 |
| CF04 Competitor monitor (daily × 30d) | $0.60 |
| CF11 Niche health (weekly × 4) | $0.04 |
| CF16 Audience memory (weekly × 4) | $0.20 |
| **Intelligence subtotal** | **~$7.23/project** |

**Optional Opus 4.6 script upgrade:** +$45 to +$90 per project (25 videos × $1.80–$3.60 Sonnet→Opus delta).

**Net:** ~$210 → ~$217/project with intelligence alone; $260–$310/project if script gen also moves to Opus 4.6.

---

## 11. Execution Gate — ALL 6 DECISIONS RESOLVED (2026-04-15)

1. ✅ **CF18 dropped** — Production Cost Optimizer is moot under single-track pipeline. `prompts/cost_optimizer.md` NOT imported. Sprint S4 scope shrunk to CF13 + CF12.
2. ✅ **Script gen → Claude Opus 4.6** — +$45–$90/project accepted. All Claude API calls (script gen + intelligence layer) use `claude-opus-4-6` except the cost-sensitive batch workflows (competitor monitor, niche health, comment classification) which stay on Haiku 4.5.
3. ✅ **Analytics extended, not replaced** — no new global `/analytics` route. The existing per-project `/project/:id/analytics` page gains PPS-accuracy scatter, revenue ROI, traffic-source breakdown, cost-vs-revenue waterfall.
4. ✅ **Niches → extend ProjectsHome** — no new `/niches` route. The existing project listing page gains niche health badges, RPM ranges, 8-week health sparklines, and a detail modal.
5. ✅ **Competitor monitor → extend `WF_YOUTUBE_DISCOVERY`** — reuse `yt_discovery_runs`/`yt_discovery_results`/`yt_video_analyses` tables. New `competitor_channels` + `competitor_alerts` sit on top (defined in migration `011_competitor_intel.sql`).
6. ✅ **Docs import target → `docs/intelligence/`** — all cleaned source files land there. Prompts land at `docs/intelligence/prompts/`.

**Sprint S0 complete:** cleaned docs imported, 7 migration stubs staged (`010_` through `016_`), master guide reconciled. Ready for Sprint S1.

---

## 12. Source File Inventory

From `fresh-update/`, the files that feed this plan:

**Primary (read first):**
- `VisionGridAI_MASTER_Implementation_Guide.md` — 30 KB — reconciled feature list + sprint prompts
- `docs/features_intelligence.md` — 19 KB — F01-F14 detailed specs
- `docs/architecture_intelligence.md` — 12 KB — system diagrams (has stale refs, see §4.1)
- `docs/agent_intelligence.md` — 13 KB — 8 new agent definitions
- `docs/workflows_intelligence.md` — 10 KB — user journeys (has stale refs, see §4.1)
- `docs/integrations_intelligence.md` — 13 KB — API endpoints + quota budget + full migration SQL
- `docs/dashboard_intelligence.md` — 8 KB — new pages 10-14 + route table
- `docs/skills_intelligence.md` — 9 KB — skills 19-26

**Production prompts (ready for import after model-ref update):**
- `prompts/outlier_intelligence.md`
- `prompts/topic_scorer.md`
- `prompts/title_ctr_scorer.md`
- `prompts/thumbnail_ctr_scorer.md`
- `prompts/style_dna_extractor.md`
- `Update/ab_test_variants.md` *(new, only in Update/)*
- ~~`Update/cost_optimizer.md`~~ *(DROP — see §4.2)*

**Background/historical (skim only):**
- `docs/ANALYSIS_original.md` — 46 KB — pre-reconciliation draft, superseded by MASTER guide
- `docs/VisionGridAI_Competitive_Intelligence_Analysis.md` — 37 KB — competitive teardown of VidIQ / TubeBuddy / 1of10 / Nexlev / Tubegen
- `docs/VisionGridAI_YouTube_Growth_Features_Prompts.md` — 33 KB — Sprint A-F raw prompts (superseded by master guide)
- `docs/skills_intelligence.sh` — 9 KB — shell commands for skills

**Duplicates (ignore):**
- `Update/docs/*` — byte-for-byte duplicates of `docs/*`
- `Update/prompts/*` — duplicates of `prompts/*`
- `Update/vision-gridai-intelligence-pack/vision-gridai-intelligence-pack/` — empty directory

---

**Next action:** Resolve the 6 execution-gate decisions in §11, then proceed to Sprint S0 (import + reconcile).
