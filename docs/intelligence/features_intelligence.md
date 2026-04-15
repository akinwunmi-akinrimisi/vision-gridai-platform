# Vision GridAI Platform — Feature Documentation
> STATUS: NEW FILE
> This file documents the Growth Intelligence feature layer added in this upgrade.
> Existing pipeline features are documented in VisionGridAI_Platform_Agent.md.

---

## Feature Index

| # | Feature | Category | Priority | Status |
|---|---------|----------|----------|--------|
| F01 | Outlier Intelligence Engine | Pre-Production | HIGH | To Build |
| F02 | Topic SEO Scoring | Pre-Production | HIGH | To Build |
| F03 | RPM Niche Intelligence | Strategic | HIGH | To Build |
| F04 | Competitor Channel Monitor | Competitive Intel | HIGH | To Build |
| F05 | CTR Title Optimizer | Content Strategy | HIGH | To Build |
| F06 | CTR Thumbnail Scorer | Content Strategy | HIGH | To Build |
| F07 | Topic Intelligence Engine (5-source) | Pre-Production | HIGH | Designed (see existing) |
| F08 | Post-Publish Analytics Dashboard | Analytics | HIGH | To Build |
| F09 | Niche Health Score | Strategic | MEDIUM | To Build |
| F10 | Viral Moment Pre-Scoring | Content Strategy | MEDIUM | To Build |
| F11 | Predictive Performance Score (PPS) | Decision Intelligence | HIGH | To Build (depends on F01-F06) |
| F12 | Style DNA Extractor | Competitive Strategy | MEDIUM | To Build |
| F13 | Revenue Attribution Engine | Analytics | MEDIUM | To Build |
| F14 | Audience Memory Layer | Growth Systems | LOW | To Build |

---

## F01: Outlier Intelligence Engine

**Category:** Pre-Production Intelligence
**Priority:** HIGH
**Inspired by:** 1of10 (Outlier Finder) + VidIQ (Daily Ideas)

### What It Does
Before Gate 1 (topic approval), scores each of the 25 generated topics against algorithm momentum data. Answers: "Is the algorithm currently pushing content like this?"

### Implementation

**n8n Workflow:** `WF_OUTLIER_SCORE` (NEW)
- Trigger: HTTP Request from `WF_TOPIC_GENERATE` on completion
- For each topic (parallel batch, max 5 concurrent):
  1. YouTube Search API: `search.list?q={{topic_title}}&type=video&order=viewCount&publishedAfter={{30_days_ago}}&maxResults=10`
  2. Extract video IDs → `videos.list?id={{ids}}&part=statistics,snippet`
  3. Calculate: `avg_views = mean(views)`, `top_views = max(views)`, `outlier_ratio = top_views / avg_views`
  4. Calculate `algorithm_momentum`: count videos published in last 30 days vs last 90 days (rising if ratio > 1.5)
  5. Claude synthesis: given these stats, assign `outlier_score` 0–100
- Final aggregation: rank all 25 topics → write to Supabase `topics` table

**Supabase Schema Changes:**
```sql
ALTER TABLE topics ADD COLUMN outlier_score INTEGER DEFAULT 50;
ALTER TABLE topics ADD COLUMN algorithm_momentum VARCHAR(20) DEFAULT 'stable';
ALTER TABLE topics ADD COLUMN competing_videos_count INTEGER;
ALTER TABLE topics ADD COLUMN outlier_velocity_7d FLOAT;
ALTER TABLE topics ADD COLUMN outlier_data_available BOOLEAN DEFAULT true;
```

**Gate 1 UI Changes:**
- Each topic card shows "Outlier Score: 73 🔥" badge
- Sort topics by outlier_score option
- "Recommended" badge on top 5 by combined score
- Filter: "Show only high outlier topics"
- Dual-axis scatter (Outlier vs SEO) on overview panel

**Cost:** ~$0.005/project (25 API calls + Claude synthesis pass)
**YouTube API quota:** ~60 units/project (search.list = 100 units, but 25 light calls ≈ minimal)

**Edge Cases:**
- API quota exceeded → set `outlier_data_available = false`, score defaults to 50 (neutral)
- No results for exact topic → broaden query to niche keywords, flag as "estimated"
- New niche with no history → all scores normalized to 50, improve over time

---

## F02: Topic SEO Scoring

**Category:** Pre-Production Intelligence
**Priority:** HIGH
**Inspired by:** TubeBuddy (Keyword Explorer) + VidIQ (Keyword Research)

### What It Does
Measures the search-side demand for each topic. Answers: "Do people actively search for this?" Complements F01 (which measures algorithm push).

### Implementation

**n8n Workflow:** `WF_SEO_SCORE` (NEW)
- Runs in parallel with `WF_OUTLIER_SCORE`
- For each topic:
  1. Generate 3 keyword variants via Claude (exact, broad, narrow)
  2. YouTube autocomplete API (undocumented but stable): `suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={{keyword}}`
  3. Count autocomplete results → proxy for search demand (0 results = no demand, 8+ results = high demand)
  4. YouTube search.list: count `pageInfo.totalResults` for exact keyword
  5. Calculate `seo_opportunity_score = (autocomplete_density * 40) + (demand_score * 40) + (competition_inverse * 20)`
  6. Classify: `totalResults < 1000` = blue-ocean; 1K–50K = competitive; 50K+ = red-ocean

**Supabase Schema Changes:**
```sql
ALTER TABLE topics ADD COLUMN seo_score INTEGER DEFAULT 50;
ALTER TABLE topics ADD COLUMN seo_classification VARCHAR(20);
ALTER TABLE topics ADD COLUMN primary_keyword VARCHAR(200);
ALTER TABLE topics ADD COLUMN keyword_variants JSONB;
ALTER TABLE topics ADD COLUMN search_volume_proxy INTEGER;
ALTER TABLE topics ADD COLUMN competition_level VARCHAR(10);
```

**Cost:** ~$0.003/project (3 queries × 25 topics)

---

## F03: RPM Niche Intelligence

**Category:** Strategic Intelligence
**Priority:** HIGH
**Inspired by:** Nexlev (RPM Explorer) + TubeGen (Niche RPM Tagging)

### What It Does
Provides RPM estimate for the project's niche, enabling revenue-aware decisions about niche selection and investment level.

### Implementation

**Static RPM Lookup Table** (Supabase `rpm_benchmarks` table):
```json
{
  "finance": {"low": 12, "mid": 22, "high": 35},
  "credit_cards": {"low": 18, "mid": 28, "high": 45},
  "insurance": {"low": 15, "mid": 25, "high": 40},
  "health_wellness": {"low": 8, "mid": 14, "high": 22},
  "software_saas": {"low": 10, "mid": 18, "high": 30},
  "education": {"low": 5, "mid": 9, "high": 14},
  "business": {"low": 8, "mid": 15, "high": 25},
  "gaming": {"low": 1, "mid": 2.5, "high": 5},
  "entertainment": {"low": 1, "mid": 2, "high": 4},
  "travel": {"low": 3, "mid": 6, "high": 10},
  "cooking": {"low": 2, "mid": 4, "high": 8},
  "tech_reviews": {"low": 5, "mid": 10, "high": 18}
}
```

**Integration into Phase A (Niche Research):**
- New node in `WF_NICHE_RESEARCH`: after niche classification, Claude assigns `niche_category` from enum list
- Lookup RPM benchmarks → write `estimated_rpm_low`, `estimated_rpm_mid`, `estimated_rpm_high` to `projects` table
- Project dashboard card shows: "Estimated RPM: $18–$45/1K views 💰"
- Add to niche research prompt: "Classify this niche into one of: finance, credit_cards, insurance, health_wellness, software_saas, education, business, gaming, entertainment, travel, cooking, tech_reviews"

**Supabase Schema Changes:**
```sql
ALTER TABLE projects ADD COLUMN niche_rpm_category VARCHAR(50);
ALTER TABLE projects ADD COLUMN estimated_rpm_low FLOAT;
ALTER TABLE projects ADD COLUMN estimated_rpm_mid FLOAT;
ALTER TABLE projects ADD COLUMN estimated_rpm_high FLOAT;
ALTER TABLE projects ADD COLUMN revenue_potential_score INTEGER;
```

**Cost:** ~$0.01/project (one Claude niche classification call)

---

## F04: Competitor Channel Monitor

**Category:** Competitive Intelligence
**Priority:** HIGH
**Inspired by:** Nexlev (Channel Tracking) + VidIQ (Competitor Tracking) + 1of10 (Virality Monitoring)

### What It Does
Continuously monitors competitor channels for new uploads and breakout performance. Surfaces actionable alerts when competitors hit a viral moment.

### Implementation

**Supabase Schema (NEW TABLES):**
```sql
CREATE TABLE competitor_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  channel_id VARCHAR(50) NOT NULL,
  channel_name VARCHAR(200),
  channel_url VARCHAR(500),
  subscriber_count INTEGER,
  avg_views_per_video FLOAT,
  tracked_since TIMESTAMPTZ DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE competitor_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES competitor_channels(id),
  youtube_video_id VARCHAR(20),
  title VARCHAR(500),
  thumbnail_url VARCHAR(500),
  published_at TIMESTAMPTZ,
  views_24h INTEGER,
  views_7d INTEGER,
  views_30d INTEGER,
  is_outlier BOOLEAN DEFAULT false,
  outlier_ratio FLOAT,
  first_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE competitor_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  channel_id UUID REFERENCES competitor_channels(id),
  video_id UUID REFERENCES competitor_videos(id),
  alert_type VARCHAR(50), -- 'outlier_breakout' | 'topic_match' | 'rapid_growth'
  alert_message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**n8n Workflow:** `WF_COMPETITOR_MONITOR` (NEW)
- Schedule: Daily at 06:00 UTC
- For each project with active competitor channels:
  1. `channels.list?id={{channel_id}}&part=statistics` → update subscriber count
  2. `playlistItems.list?playlistId={{uploads_playlist_id}}&maxResults=5` → get latest uploads
  3. For each new video: `videos.list?id={{id}}&part=statistics,snippet`
  4. Calculate `outlier_ratio = views / channel_avg_views` (rolling 90-day average)
  5. If `outlier_ratio > 3.0` → set `is_outlier = true` → create `competitor_alerts` record
  6. Weekly Sunday: Claude synthesis of all competitor data → `competitor_intelligence` summary

**Dashboard:** New "Intelligence" tab with:
- Competitor feed (sorted by `published_at desc`)
- 🔥 Outlier breakout alert cards (red border, prominent)
- Topic match alerts ("Competitor just posted about credit card rewards — you have a topic queued on this")
- "Add Competitor" button → input channel URL

**Limit:** 10 competitors per project (YouTube API quota management)
**Cost:** ~$0.02/project/day

---

## F05: CTR Title Optimizer

**Category:** Content Strategy — Packaging
**Priority:** HIGH
**Inspired by:** 1of10 (Title Generator) + VidIQ (Title Optimizer)

### What It Does
After script approval (Gate 2), generates 5 CTR-optimized title variants and scores them, enabling the creator to choose the highest-probability title before the video goes live.

### Implementation

**5 Title Formula Patterns:**
- **Pattern A — Numbers + Promise:** "[Number] [Topic Nouns] That [Big Promise] (e.g., 7 Credit Card Mistakes That Cost You Thousands)"
- **Pattern B — Curiosity Gap + Stakes:** "Why [Common Belief/Action] Is [Surprising Consequence] (e.g., Why Paying Off Your Credit Card Early Is Costing You)"
- **Pattern C — Identity + Stakes:** "[Who You Think You Are] vs [What You Actually Are] (e.g., You Think You're Getting Cashback — Here's What Actually Happens)"
- **Pattern D — Insider Secret:** "The [Topic] Strategy [Authority Group] Doesn't Want You to Know"
- **Pattern E — Story Hook:** "I [Surprising Action] with [Topic] — Here's What Happened After [Timeframe]"

**Scoring Rubric (0–100):**
- Length 55–70 chars: +20
- Contains a number: +15
- Power word present (secret, never, always, shocking, proven): +10/word (max 20)
- Curiosity gap structure: +15
- Emotional trigger classified (curiosity/fear/desire): +10
- Under 100 chars total: +10
- Niche keyword in first 40 chars: +10

**Prompt:** `prompts/title_ctr_scorer.md`

**n8n Integration:** New node at end of `WF_SCRIPT_GENERATE` → fires `WF_CTR_TITLE` → stores in `topics.title_options` (JSONB array). Gate 3 UI renders a title picker with scores.

**Supabase Schema Changes:**
```sql
ALTER TABLE topics ADD COLUMN title_options JSONB; 
-- [{title, ctr_score, formula_pattern, reasoning}]
ALTER TABLE topics ADD COLUMN selected_title VARCHAR(200);
ALTER TABLE topics ADD COLUMN title_ctr_score INTEGER;
```

**Cost:** ~$0.04/video

---

## F06: CTR Thumbnail Scorer

**Category:** Content Strategy — Packaging
**Priority:** HIGH
**Inspired by:** TubeBuddy (Thumbnail Analyzer) + 1of10 (CTR-trained Thumbnail AI)

### What It Does
After thumbnail generation, analyzes the image with Claude Vision and scores it against 7 CTR factors. If score < 60, auto-regenerates with an improved prompt.

### 7 CTR Factors:

| Factor | Max Score | Rationale |
|--------|-----------|-----------|
| Face + emotion clarity | 20 | Faces with visible emotion (surprise, fear, excitement) drive the most clicks |
| Text readability at 160px | 20 | Most mobile thumbnails display at ~160px — text must be legible |
| Color contrast ratio | 15 | High contrast against YouTube's white background increases visibility |
| Visual complexity | -15 penalty if >4 main elements | Too busy = viewer eyes don't know where to focus |
| Curiosity element | 10 | Visual mystery (cropped face, dramatic scene, question implied by image) |
| Niche relevance | 15 | Does the thumbnail clearly signal what the video is about? |
| Brand consistency | 5 | Does it match the channel's established visual style? |

**Regeneration Logic:**
- Score ≥ 75: Accept, no regeneration needed
- Score 60–74: Accept but flag for manual review
- Score < 60: Auto-regenerate (max 3 attempts), each attempt improves the prompt based on specific failing factors

**Prompt:** `prompts/thumbnail_ctr_scorer.md`

**n8n Integration:** New `WF_THUMBNAIL_SCORE` step fires immediately after `WF_THUMBNAIL_GENERATE`. Writes score and decision to `topics`. If regeneration needed, re-fires `WF_THUMBNAIL_GENERATE` with enhanced prompt.

---

## F08: Post-Publish Analytics Dashboard

**Category:** Analytics
**Priority:** HIGH
**Inspired by:** VidIQ (Channel Analytics) + TubeBuddy (Channel Audit)

### What It Does
Dedicated analytics page showing per-video and per-project performance. Closes the feedback loop between production decisions and real-world results.

### Dashboard Page: `analytics.jsx` (NEW)

**Sections:**

1. **Channel Overview**
   - Total views, subscribers, estimated revenue (30-day rolling)
   - Views by traffic source: Homepage / Search / Suggested / External
   - Avg CTR across all videos: trend line (last 90 days)

2. **Video Performance Table**
   - Columns: Title | Published Date | Views (7d / 30d) | CTR | AVD | Est. Revenue | PPS vs Actual Delta
   - Sort by any column
   - Color coding: Green (outperforming PPS prediction), Yellow (at prediction), Red (underperforming)
   - Filter by: niche, date range, production cost tier

3. **Performance vs Prediction**
   - Scatter plot: X = Predicted Performance Score, Y = Actual 30-day views
   - Shows calibration quality of the PPS model
   - Trendline: if points cluster above trendline → model is underestimating; below → overestimating

4. **ROI Calculator**
   - Per video: Production cost vs 30-day estimated revenue
   - Per niche: Total production cost vs total revenue (lifetime)
   - Break-even view count for each video (cost / RPM × 1000)

5. **Traffic Source Intelligence**
   - If >60% views from Homepage: algorithmically healthy (outlier_score is working)
   - If >60% views from Search: SEO-dependent channel (good for long-term but algorithm-fragile)
   - If <5% from Homepage: needs better packaging (title/thumbnail CTR issues)

**YouTube Analytics API Extensions** (add to `WF_VIDEO_METADATA`):
```
analyticsReports: 
  dimensions: video, day
  metrics: views, estimatedMinutesWatched, averageViewDuration, averageViewPercentage, 
           impressions, impressionClickThroughRate, estimatedRevenue
  filters: traffic source
```

---

## F09: Niche Health Score

**Category:** Strategic Intelligence
**Priority:** MEDIUM

### Scoring Formula:
```
niche_health_score = 
  (competitor_view_velocity_trend * 30)  # Is competitor content still getting views?
  + (new_channel_entry_rate_inverse * 20) # Fewer new entrants = less crowded
  + (topic_freshness * 25)               # Are new topic clusters emerging?
  + (rpm_stability * 25)                 # Is RPM holding (static estimate + category trend)
```

### Classifications:
- 80–100: **Thriving** — Strong momentum, growing audience, underserved topics available
- 60–79: **Stable** — Normal competitive dynamics, steady growth possible
- 40–59: **Warning** — Saturation signals, slowing momentum, differentiation needed
- 0–39: **Critical** — Consider niche pivot or major content differentiation

### Alert Thresholds:
- Score drops 15+ points in one week → high-priority email alert
- Score < 40 for 3 consecutive weeks → pivot recommendation (Claude generates 3 alternative niches)

---

## F11: Predictive Performance Score (PPS)

**Category:** Decision Intelligence
**Priority:** HIGH (depends on F01–F06)

### Formula:
```
PPS = (outlier_score × 0.30)
    + (seo_score × 0.20)
    + (script_quality_score × 0.20)
    + (niche_health_score × 0.15)
    + (thumbnail_ctr_score × 0.10)
    + (title_ctr_score × 0.05)
```

### Classification:
- PPS ≥ 75: 🟢 **Green Light** — Strong publish candidate. Expected to outperform channel average.
- PPS 55–74: 🟡 **Yellow Light** — Publishable but with optimization opportunity. Agent identifies top 2 drag factors.
- PPS < 55: 🔴 **Red Light** — High risk of underperformance. Agent recommends: (a) rework specific weakness, (b) deprioritize and move to next topic, or (c) repurpose as Short instead.

### Self-Calibration:
- Monthly `WF_PPS_CALIBRATE` workflow
- Compares PPS predictions to actual 30-day performance
- Calculates mean absolute error per factor
- Adjusts weights (stored in `pps_config` table) to improve accuracy
- After 20+ published videos: recalibrates weights based on regression analysis

---

## F12: Style DNA Extractor

**Category:** Competitive Strategy
**Priority:** MEDIUM

### Outputs (per channel):
```json
{
  "title_formulas": [
    {"pattern": "Number + [Topic Noun] That [Big Outcome]", "example": "5 Credit Cards That Pay You Back", "frequency": 0.45},
    {"pattern": "[Surprising Revelation] About [Common Behavior]", "frequency": 0.30},
    {"pattern": "[Insider Secret] Strategy", "frequency": 0.25}
  ],
  "thumbnail_dna": {
    "dominant_colors": ["#FF0000", "#FFFFFF", "#000000"],
    "text_position": "left",
    "face_presence_pct": 85,
    "emotional_tone": "surprise",
    "background_type": "solid",
    "text_size": "large"
  },
  "content_pillars": [
    "Credit card rewards maximization",
    "Hidden fees and gotchas",
    "Bank comparison reviews"
  ],
  "upload_cadence": {
    "frequency_per_week": 2.3,
    "preferred_days": ["Tuesday", "Thursday"],
    "avg_length_minutes": 18
  },
  "style_summary": "Channel leans heavily into fear-based curiosity titles combined with high-contrast red/white thumbnails. 85% of videos feature the creator's face showing surprise or concern. Content clusters around financial gotchas rather than positive advice. Upload rhythm is consistent 2x/week on Tue/Thu."
}
```

---

## Implementation Order (Phased Rollout)

### Phase 1 (Immediate — 2 sprints)
- F03: RPM Niche Intelligence (low complexity, high value)
- F02: Topic SEO Scoring (low complexity)
- F01: Outlier Intelligence Engine (medium complexity)
- F05: CTR Title Optimizer (medium complexity)

### Phase 2 (Next 2 sprints)
- F04: Competitor Channel Monitor (medium-high complexity)
- F06: CTR Thumbnail Scorer (medium complexity)
- F08: Post-Publish Analytics Dashboard (medium complexity)
- F11: Predictive Performance Score (depends on Phase 1)

### Phase 3 (Following sprints)
- F09: Niche Health Score (depends on F04)
- F10: Viral Moment Pre-Scoring in Scripts
- F12: Style DNA Extractor
- F13: Revenue Attribution Engine
- F14: Audience Memory Layer
