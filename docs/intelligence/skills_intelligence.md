# Vision GridAI Platform — Skills Reference Map
> STATUS: UPDATE TO EXISTING FILE (skills.md)
> MERGE INSTRUCTION: Append the NEW SKILLS section to the existing skills.md.
> Existing 18 skills remain unchanged.

---

## Existing Skills (DO NOT MODIFY)
> Reference: existing skills.md for skills 1–18

---

## NEW SKILLS: Growth Intelligence Layer (Skills 19–26)

---

### Skill 19: `outlier-intel`

**Domain:** Pre-Production Intelligence
**Phase:** Phase B — Topic Generation (post-generation, pre-Gate 1)
**Invoked by:** `WF_OUTLIER_SCORE` n8n workflow

**What it does:**
Queries YouTube Data API to measure algorithm momentum for each generated topic. Calculates outlier density (how many videos on this topic are performing 5x+ above channel average) and algorithm momentum (is the topic accelerating or decelerating in the algorithm).

**Inputs:**
- `topic_title` (string): The generated topic title
- `niche_context` (string): Niche description
- `project_niche_keywords` (string[]): Core niche keywords

**Outputs:**
- `outlier_score` (0–100): Composite outlier potential
- `algorithm_momentum` (enum: accelerating/stable/decelerating)
- `competing_videos_count` (integer)
- `avg_views_per_video` (float): For top 10 results on this topic

**Prompt file:** `prompts/outlier_intelligence.md`
**Model:** Claude Opus 4.6
**API calls:** YouTube Search API + videos.list
**Cost:** ~$0.002/topic

---

### Skill 20: `seo-score`

**Domain:** Pre-Production Intelligence
**Phase:** Phase B — Topic Generation (concurrent with outlier-intel)
**Invoked by:** `WF_SEO_SCORE` n8n workflow

**What it does:**
Measures search-side opportunity for each generated topic. Generates keyword variants, measures autocomplete density (proxy for search volume), counts competing video results (proxy for competition), calculates opportunity score.

**Inputs:**
- `topic_title` (string)
- `niche_context` (string)

**Outputs:**
- `seo_score` (0–100): Overall search opportunity
- `seo_classification` (enum: blue-ocean/competitive/red-ocean/dead-sea)
- `primary_keyword` (string)
- `keyword_variants` (string[]): 3 variants
- `search_volume_proxy` (integer)
- `competition_level` (enum: low/medium/high)

**Prompt file:** `prompts/topic_scorer.md`
**Model:** Claude Opus 4.6
**API calls:** YouTube Search API (3 queries per topic)
**Cost:** ~$0.003/topic

---

### Skill 21: `competitor-monitor`

**Domain:** Continuous Intelligence
**Phase:** Post-publish (daily background)
**Invoked by:** `WF_COMPETITOR_MONITOR` daily cron

**What it does:**
Monitors tracked competitor channels for new uploads, calculates outlier flags on their content, detects topic patterns that overlap with our pipeline.

**Inputs:**
- `competitor_channels` table records (project-scoped)
- `project_id`: To scope analysis

**Outputs:**
- `competitor_videos` records (new uploads with view data)
- `competitor_alerts` records (outlier breakouts)
- `competitor_intelligence` summary (weekly Claude synthesis)

**Prompt file:** `prompts/competitor_monitor_synthesis.md`
**Model:** Claude Haiku 4.5 (daily), Claude Opus 4.6 (weekly synthesis)
**API calls:** YouTube channels.list + videos.list
**Cost:** ~$0.02/project/day

---

### Skill 22: `ctr-optimize-title`

**Domain:** Content Strategy — Packaging
**Phase:** Gate 2 → Gate 3 transition
**Invoked by:** `WF_CTR_OPTIMIZE` workflow

**What it does:**
Generates 5 CTR-optimized title variants for a video. Scores each variant against length, power words, emotional triggers, curiosity gap structure, and niche-specific patterns. Recommends top variant.

**Inputs:**
- `script_summary` (string): 200-word script summary
- `niche_context` (string)
- `target_audience` (string): From customer avatar
- `topic_title` (string): Original generated title

**Outputs:**
- `title_options[]`: Array of 5 objects: `{title, ctr_score, formula_pattern, reasoning}`
- `recommended_title` (string): Highest-scoring variant

**Prompt file:** `prompts/title_ctr_scorer.md`
**Model:** Claude Opus 4.6
**Cost:** ~$0.04/video

---

### Skill 23: `ctr-optimize-thumbnail`

**Domain:** Content Strategy — Packaging
**Phase:** Post-thumbnail generation (within WF_THUMBNAIL_GENERATE)
**Invoked by:** `WF_THUMBNAIL_SCORE` step (new sub-workflow within thumbnail generation)

**What it does:**
Uses Claude Vision to analyze a generated thumbnail image. Scores against 7 CTR factors. If score < 60, generates an improved generation prompt and triggers regeneration.

**Inputs:**
- `thumbnail_url` (string): URL of generated thumbnail
- `niche_context` (string)
- `title` (string): Approved title (context for relevance scoring)

**Outputs:**
- `thumbnail_ctr_score` (0–100)
- `score_breakdown` (object): 7 factor scores
- `improvement_suggestions` (string[])
- `improved_prompt` (string): Enhanced generation prompt if score < 60
- `needs_regeneration` (boolean)

**Prompt file:** `prompts/thumbnail_ctr_scorer.md`
**Model:** Claude Opus 4.6 with Vision
**Cost:** ~$0.03/thumbnail scored

---

### Skill 24: `niche-health`

**Domain:** Strategic Intelligence
**Phase:** Background (weekly cron)
**Invoked by:** `WF_NICHE_HEALTH` weekly workflow

**What it does:**
Computes a weekly Niche Health Score by analyzing competitor upload velocity, view momentum, topic freshness, and saturation indicators. Generates trend alerts when score drops significantly.

**Inputs:**
- `project_id`
- `competitor_videos` (4-week window)
- `current_niche_health_score`

**Outputs:**
- `niche_health_score` (0–100)
- `health_classification` (enum: thriving/stable/warning/critical)
- `momentum_trend` (enum: growing/stable/declining)
- `saturation_signal` (boolean)
- `alert_required` (boolean + message)

**Prompt file:** `prompts/niche_health_analyzer.md`
**Model:** Claude Haiku 4.5
**Cost:** ~$0.01/project/week

---

### Skill 25: `predictive-performance`

**Domain:** Pre-Publish Decision Intelligence
**Phase:** Gate 3 (video review, before publish decision)
**Invoked by:** `WF_PREDICT_PERFORMANCE` step within video review workflow

**What it does:**
Combines all available scores into a Predicted Performance Score (PPS). Classifies as green/yellow/red light. For yellow/red, generates specific, actionable improvement recommendations.

**Inputs:**
- `outlier_score` (from skill 19)
- `seo_score` (from skill 20)
- `script_quality_score` (from existing 3-pass scoring)
- `niche_health_score` (from skill 24)
- `thumbnail_ctr_score` (from skill 23)
- `title_ctr_score` (from skill 22)

**Outputs:**
- `predicted_performance_score` (0–100)
- `pps_light` (enum: green/yellow/red)
- `pps_breakdown` (object): Per-factor contribution
- `pps_recommendation` (string): Natural language advice

**Prompt file:** `prompts/predictive_performance.md`
**Model:** Claude Opus 4.6
**Cost:** ~$0.02/video

---

### Skill 26: `style-dna`

**Domain:** Competitive Strategy
**Phase:** Optional — activated manually from dashboard
**Invoked by:** `WF_STYLE_DNA` workflow (manual trigger)

**What it does:**
Extracts a competitor channel's style fingerprint: title formula patterns, thumbnail visual DNA, content pillars, upload cadence. Optionally injects this DNA into the project's prompt configuration.

**Inputs:**
- `channel_url` (string): Target competitor channel
- `project_id` (optional): If provided, writes style to project's prompt config

**Outputs:**
- `title_formulas[]`: 3 dominant structural patterns with examples
- `thumbnail_dna` (object): Dominant colors, text position, face presence, emotional tone
- `content_pillars[]`: 3–5 topic clusters
- `upload_cadence` (object): Frequency, day-of-week pattern, length pattern
- `style_summary` (string): 200-word narrative

**Prompt file:** `prompts/style_dna_extractor.md`
**Model:** Claude Opus 4.6 + Vision
**API calls:** YouTube Data API v3 + Vision analysis
**Cost:** ~$0.15/channel

---

## Updated Skills Summary Table

| # | Skill | Domain | Phase | Type |
|---|-------|--------|-------|------|
| 1–18 | [Existing skills] | Various | Various | See skills.md |
| 19 | `outlier-intel` | Pre-Production | Phase B | AI + Data |
| 20 | `seo-score` | Pre-Production | Phase B | AI + Data |
| 21 | `competitor-monitor` | Continuous | Background | AI + Data |
| 22 | `ctr-optimize-title` | Content Strategy | Gate 2→3 | AI |
| 23 | `ctr-optimize-thumbnail` | Content Strategy | Phase D | AI + Vision |
| 24 | `niche-health` | Strategic | Background | AI + Data |
| 25 | `predictive-performance` | Decision Intelligence | Gate 3 | AI |
| 26 | `style-dna` | Competitive Strategy | Manual | AI + Vision + Data |
