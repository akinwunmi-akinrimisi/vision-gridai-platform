# Vision GridAI Platform — Agent Definitions
> STATUS: UPDATE TO EXISTING FILE (VisionGridAI_Platform_Agent.md)
> MERGE INSTRUCTION: Add the new agent definitions below to the existing agent file.
> DO NOT overwrite existing agent logic — append the Growth Intelligence section.

---

## Existing Agent Roles (DO NOT MODIFY)
> Reference: VisionGridAI_Platform_Agent.md for existing definitions

---

## NEW SECTION: Growth Intelligence Agents

### Agent: OutlierIntelligenceAgent

**Role:** Pre-production virality researcher. Activates during Phase B (topic generation).

**Trigger:** Fires automatically after `WF_TOPIC_GENERATE` completes, before Gate 1.

**Decision Logic:**
1. Receives 25 generated topics from `topics` table.
2. For each topic: executes YouTube search query → counts results → measures view velocity of top 10 results (via YouTube Data API `videos.list` with `order=viewCount` and recent `publishedAfter` filter).
3. Calculates `outlier_density_score`: How many of the top 10 results have views > 3x the channel's historical average in the same niche?
4. Calculates `algorithm_momentum_score`: Is this topic's search result set trending upward (increasing upload frequency in last 30 days) or decaying?
5. Outputs `outlier_score` (0–100) per topic. Writes to `topics.outlier_score`.
6. Flags any topic with `outlier_score < 30` as "Algorithm Cold" — includes a warning in Gate 1 UI.
7. Surfaces the top 5 topics by combined `(outlier_score * 0.6 + seo_score * 0.4)` as "Recommended" in Gate 1.

**Input:** `project_id`, `topics[]` (25 records), `niche_context`
**Output:** `topics.outlier_score`, `topics.algorithm_momentum`, `topics.outlier_recommendation_rank`
**Model:** Claude Opus 4.6 (for synthesis), YouTube Data API (for raw data)
**Error handling:** If YouTube API quota exceeded, defaults to `outlier_score = 50` (neutral) and adds `outlier_data_unavailable: true` flag.

---

### Agent: SEOScoringAgent

**Role:** Search-side validation layer. Activates during Phase B alongside OutlierIntelligenceAgent.

**Trigger:** Fires alongside `WF_OUTLIER_SCORE` after topic generation.

**Decision Logic:**
1. For each topic, generates 3 keyword variants (exact topic, broad topic, narrow sub-topic).
2. Queries YouTube autocomplete for each variant → counts how many suggestions appear (proxy for search volume).
3. Counts competing videos in YouTube search results for exact keyword (proxy for competition).
4. Calculates `seo_opportunity_score = log(autocomplete_hits + 1) / log(competing_videos_count + 1)`. Higher = better opportunity.
5. Classifies: "Blue Ocean" (high opportunity, low competition), "Red Ocean" (high competition, high volume), "Dead Sea" (low volume, low competition = no demand).
6. Writes `seo_score`, `seo_classification`, `primary_keyword`, `keyword_variants[]` to `topics` table.

**Input:** `topics[]`
**Output:** `topics.seo_score`, `topics.seo_classification`, `topics.primary_keyword`
**Model:** Claude Opus 4.6, YouTube Search API
**Cost:** ~$0.05/project (25 API calls + 1 Claude synthesis pass)

---

### Agent: CompetitorMonitorAgent

**Role:** Continuous competitive intelligence. Runs on a daily cron schedule.

**Trigger:** `WF_COMPETITOR_MONITOR` — daily at 06:00 UTC.

**Decision Logic:**
1. Loads all `competitor_channels` records grouped by `project_id`.
2. For each channel: fetches latest 5 uploads via `channels.list` → `playlistItems.list`.
3. For each new video (not seen before): fetches `videos.list` for view count, likes, duration.
4. Calculates `outlier_flag`: `video_views_7d / channel_avg_views_7d > 3.0`.
5. Calculates `topic_pattern_match`: does this video's title/description match any of our project's current topic pipeline? (Claude semantic similarity check)
6. Inserts new records into `competitor_videos`. Updates `competitor_channels.last_checked_at`.
7. For any `outlier_flag = true`: creates a `competitor_alerts` record → pushes to dashboard notification feed.
8. Weekly summary: Claude synthesizes competitor upload patterns → writes to `competitor_intelligence` table → surfaces on Intelligence dashboard tab.

**Input:** `competitor_channels` table records
**Output:** `competitor_videos`, `competitor_alerts`, `competitor_intelligence`
**Model:** Claude Haiku 4.5 (daily monitoring, cost-sensitive), Claude Opus 4.6 (weekly synthesis)
**Cost:** ~$0.02/project/day (API calls + Haiku)
**Error handling:** Individual channel fetch failures are logged but don't stop the batch. Max 3 retries per channel.

---

### Agent: CTROptimizationAgent

**Role:** Pre-publish CTR maximization. Activates at Gate 2 (script approval) → Gate 3 (video review).

**Trigger:** `WF_CTR_OPTIMIZE` — fires when script status changes to `approved` at Gate 2.

**Decision Logic:**

_Title CTR Scoring:_
1. Receives approved script + niche context.
2. Generates 5 title variants using formula patterns learned from high-CTR niche videos:
   - Pattern A: [Number] + [Noun] + [Curiosity Gap]
   - Pattern B: [Controversy/Surprise] + [Topic] + [Specificity]
   - Pattern C: [Identity Statement] + [Topic] + [Stakes]
   - Pattern D: [How/Why] + [Topic] + [Promise]
   - Pattern E: [Story Hook] + [Topic]
3. Scores each variant: length penalty (>70 chars = -10), power word bonus (+5 per word), number presence (+8), curiosity gap structure (+15), emotional trigger type classification.
4. Returns `title_options[]` with `ctr_score` per variant. Top scoring variant pre-populated in Gate 3 UI.

_Thumbnail CTR Scoring (post-generation):_
1. After thumbnail is generated by `WF_THUMBNAIL_GENERATE`, runs Vision analysis.
2. Scores: face presence (+20), emotional expression legibility (+15), text readability at 160px width (+20), color contrast ratio (+15), visual complexity penalty (>4 main elements = -15), curiosity element (+10), niche relevance (+20).
3. If score < 60: generates specific improvement prompt → triggers regeneration with enhanced prompt.
4. Max 3 regeneration attempts.

**Input:** `topics.script_id`, `topics.niche_context`, generated thumbnail file
**Output:** `topics.title_options[]`, `topics.selected_title`, `topics.thumbnail_ctr_score`
**Model:** Claude Opus 4.6 (title generation + thumbnail scoring)
**Cost:** ~$0.08/video

---

### Agent: NicheHealthAgent

**Role:** Long-running niche viability monitor. Weekly background intelligence.

**Trigger:** `WF_NICHE_HEALTH` — weekly cron, Sunday 03:00 UTC.

**Decision Logic:**
1. For each active project: loads `competitor_channels` (last 4 weeks of `competitor_videos`).
2. Calculates: avg view velocity trend (up/down/flat), new channel entry rate (how many new channels in this niche in last 30 days), topic freshness (are new topic clusters emerging or repeating?), RPM stability (static estimate, flagged for manual review if niche category changes).
3. Computes `niche_health_score` (0–100). Thresholds:
   - 80–100: Thriving. High momentum, growing audience.
   - 60–79: Stable. Normal competitive dynamics.
   - 40–59: Warning. Signs of saturation or declining momentum.
   - 0–39: Critical. Consider niche pivot or content differentiation.
4. Writes to `projects.niche_health_score` + inserts record in `niche_health_history`.
5. If score drops 15+ points week-over-week: creates high-priority alert → email notification to creator.

**Input:** `projects` table + `competitor_videos` (4-week window)
**Output:** `projects.niche_health_score`, `niche_health_history`, alerts
**Model:** Claude Haiku 4.5
**Cost:** ~$0.01/project/week

---

### Agent: PredictivePerformanceAgent

**Role:** Pre-production ROI calculator. Pre-greenlight decision intelligence.

**Trigger:** Activates at Gate 3 (video review), before publish decision.

**Decision Logic:**
1. Loads all available scores for the video: `outlier_score`, `seo_score`, `script_quality_score` (from existing 3-pass evaluation), `niche_health_score`, `thumbnail_ctr_score`, `title_ctr_score`.
2. Applies weighted formula:
   ```
   PPS = (outlier_score * 0.30) 
       + (seo_score * 0.20) 
       + (script_quality_score * 0.20) 
       + (niche_health_score * 0.15) 
       + (thumbnail_ctr_score * 0.10) 
       + (title_ctr_score * 0.05)
   ```
3. Classifies:
   - PPS ≥ 75: Green Light (strong publish candidate)
   - PPS 55–74: Yellow Light (publish with optimizations — agent suggests specific fixes)
   - PPS < 55: Red Light (recommend revisions or deprioritize)
4. For Yellow/Red: generates natural language explanation of which scores are dragging down PPS and what to fix.
5. Stores `predicted_performance_score`, `pps_breakdown`, `pps_recommendation` in `topics`.
6. After publish: compares PPS to actual 30-day performance → stores delta in `pps_calibration` table for model refinement.

**Input:** All scores from features 1–6
**Output:** `topics.predicted_performance_score`, `topics.pps_breakdown`, `topics.pps_recommendation`
**Model:** Claude Opus 4.6
**Cost:** ~$0.02/video

---

### Agent: StyleDNAAgent

**Role:** Competitor style intelligence and pattern extraction.

**Trigger:** Manual activation from dashboard → "Analyze Competitor Channel" action.

**Decision Logic:**
1. Receives competitor channel URL.
2. Fetches last 20 videos: titles, thumbnail URLs, upload dates, view counts, durations.
3. Title analysis: extracts structural patterns (word count, number usage, question format, curiosity gap frequency, emotional trigger distribution).
4. Thumbnail analysis (Claude Vision): dominant colors, text position (left/center/right), face presence %, background complexity, primary visual metaphor type.
5. Content analysis: average video length, upload frequency, topic clustering (groups topics into 3–5 content pillars).
6. Synthesizes: "This channel's top 3 title formulas are X, Y, Z. Their thumbnail DNA is [color palette] + [text position] + [face/no-face]. Their content pillars are A, B, C."
7. Stores as `style_profiles` record.
8. Optional: Apply DNA to project → injects style constraints into topic generation and title optimization prompts.

**Input:** Channel URL
**Output:** `style_profiles` record (title_formulas[], thumbnail_dna{}, content_pillars[], upload_cadence)
**Model:** Claude Opus 4.6 + Vision
**Cost:** ~$0.15/channel analysis

---

### Agent: AudienceMemoryAgent

**Role:** Long-running audience intelligence accumulation. Weekly listener.

**Trigger:** `WF_AUDIENCE_INTELLIGENCE` — weekly cron.

**Decision Logic:**
1. For each published video in the last 30 days: fetches top 100 comments via YouTube Data API.
2. Claude Haiku 4.5 pass: classify each comment as: Question (potential video idea), Complaint (quality issue), Praise (what's working), Suggestion (improvement idea), or Noise.
3. Weekly Sonnet synthesis: identifies top 5 recurring questions → generates video idea suggestions. Identifies top 3 complaints → quality improvement flags. Identifies dominant audience persona signals (vocabulary level, referenced prior knowledge, geographic hints).
4. Builds `audience_insights` record: persona summary, recurring questions, content improvement flags, audience vocabulary level.
5. Injects `{{audience_context}}` block into Pass 1 of script generation: "Our audience frequently asks [X]. They already know [Y]. They want [Z]."

**Input:** Published video `video_id`s from `topics` table
**Output:** `audience_insights` table, script generation context enrichment
**Model:** Claude Haiku 4.5 (comment classification), Claude Opus 4.6 (weekly synthesis)
**Cost:** ~$0.05/week (for active channel with 10+ published videos)

---

## Agent Coordination Map

```
Phase A (Niche Research)
└── [existing] NicheResearchAgent
    └── [NEW] NicheHealthAgent initializes project score
    └── [NEW] CompetitorMonitorAgent seeds competitor_channels

Phase B (Topic Generation)
└── [existing] TopicGeneratorAgent
    ├── [NEW] OutlierIntelligenceAgent → scores outlier potential
    └── [NEW] SEOScoringAgent → scores search opportunity
        └── Combined scores surface at Gate 1

Phase C (Script Generation)
└── [existing] ScriptGeneratorAgent (3-pass)
    └── [NEW] viral tagging embedded in Pass 3
    └── [NEW] CTROptimizationAgent (title variants)

Phase D (Production)
└── [existing] TTS + Image + Video + Assembly agents
    └── [NEW] CTROptimizationAgent (thumbnail scoring + regeneration)

Phase E (Review + Publish)
└── [existing] VideoReviewAgent
    └── [NEW] PredictivePerformanceAgent → final PPS score at Gate 3

Phase F (Post-Publish)
└── [existing] AnalyticsAgent (daily)
    └── [NEW] CompetitorMonitorAgent (daily)
    └── [NEW] AudienceMemoryAgent (weekly)
    └── [NEW] NicheHealthAgent (weekly)
    └── [NEW] PPS calibration (monthly)
```
