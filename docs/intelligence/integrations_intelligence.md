# Vision GridAI Platform — Integrations Reference
> STATUS: NEW FILE

---

## Existing Integrations (DO NOT MODIFY)
> Reference CLAUDE.md for existing integration specs:
> - YouTube Data API v3 (upload, metadata, analytics)
> - TikTok Content API
> - Instagram Graph API
> - Fal.ai (Seedream 4.0)
> - Google Cloud TTS (Chirp 3 HD)
> - Anthropic API (Claude Opus 4.6)
> - n8n (self-hosted)
> - Supabase (self-hosted PostgreSQL + Realtime)
> - Google Drive (storage)

---

## NEW INTEGRATIONS: Growth Intelligence Layer

---

### Integration 1: YouTube Data API v3 — Intelligence Extensions

**Existing credentials:** `YOUTUBE_API_KEY` (already in n8n credential store)

**NEW endpoints required:**

#### 1a. Search API — Outlier + SEO Scoring (F01, F02)
```
GET https://www.googleapis.com/youtube/v3/search
  ?part=snippet
  &q={{topic_title}}
  &type=video
  &order=viewCount
  &publishedAfter={{ISO_DATE_30_DAYS_AGO}}
  &maxResults=10
  &key={{YOUTUBE_API_KEY}}
```
**Quota cost:** 100 units/call
**Usage:** 25 calls per project (topic scoring) = 2,500 units
**Daily quota:** 10,000 units available. IMPORTANT: Topic scoring is NOT run daily — only on project creation. Schedule intelligently.

**Quota optimization strategy:**
- Run outlier scoring only when `topics.outlier_data_available = null` (never scored)
- Batch scoring: run 5 topics at a time with 30-second delays to avoid burst rate limits
- Fallback: if quota exceeded, skip scoring and set `outlier_data_available = false`

#### 1b. Videos.list — View Data for Outlier Calculation
```
GET https://www.googleapis.com/youtube/v3/videos
  ?part=statistics,snippet
  &id={{comma_separated_video_ids}}
  &key={{YOUTUBE_API_KEY}}
```
**Quota cost:** 1 unit/call (very cheap)
**Usage:** 2 calls per topic (get 10 video IDs → fetch statistics)

#### 1c. Channels.list — Competitor Monitoring (F04)
```
GET https://www.googleapis.com/youtube/v3/channels
  ?part=statistics,contentDetails
  &id={{channel_id}}
  &key={{YOUTUBE_API_KEY}}
```
**Quota cost:** 1 unit/call
**Usage:** 1 call/channel/day = 10 calls/project/day (for 10 competitors)

#### 1d. PlaylistItems.list — Latest Competitor Videos (F04)
```
GET https://www.googleapis.com/youtube/v3/playlistItems
  ?part=snippet,contentDetails
  &playlistId={{uploads_playlist_id}}
  &maxResults=5
  &key={{YOUTUBE_API_KEY}}
```
**Quota cost:** 1 unit/call
**Usage:** 1 call/channel/day

#### 1e. Comments.list — Audience Intelligence (F14)
```
GET https://www.googleapis.com/youtube/v3/commentThreads
  ?part=snippet
  &videoId={{video_id}}
  &maxResults=100
  &order=relevance
  &key={{YOUTUBE_API_KEY}}
```
**Quota cost:** 1 unit/call
**Usage:** 1 call/published video/week (for audience memory)

#### 1f. YouTube Analytics API — Revenue Attribution (F08, F13)
**Note:** Requires OAuth 2.0 (not just API key) + channel monetization.
```
GET https://youtubeanalytics.googleapis.com/v2/reports
  ?ids=channel=={{CHANNEL_ID}}
  &metrics=views,estimatedMinutesWatched,averageViewDuration,
           averageViewPercentage,impressions,impressionClickThroughRate,
           estimatedRevenue
  &dimensions=video,day
  &filters=video=={{video_id}}
  &startDate={{30_days_ago}}
  &endDate={{today}}
```
**Auth:** Store OAuth refresh token as n8n credential
**Quota:** 200 units/day (liberal for analytics)

---

### Integration 2: YouTube Autocomplete API — SEO Scoring (F02)

**Not official but widely used and stable:**
```
GET https://suggestqueries.google.com/complete/search
  ?client=firefox
  &ds=yt
  &q={{keyword}}
```
**Auth:** None required
**Returns:** Array of autocomplete suggestions
**Proxy for search volume:** Count of suggestions returned (0 = no demand, 8+ = high demand)
**Rate limit:** Generous, but add 200ms delays between calls
**n8n node:** HTTP Request (GET, no auth, JSON response parse)

---

### Integration 3: Google Trends via SerpAPI — Topic Intelligence (F07)

**Existing:** Check if SerpAPI is already configured. If not:
```
n8n Credential: serpapi_key
Type: Header Auth
Header: X-API-Key: {{SERPAPI_API_KEY}}
```

**Endpoint:**
```
GET https://serpapi.com/search.json
  ?engine=google_trends
  &q={{niche_keyword}}
  &date=today+3-m
  &api_key={{SERPAPI_API_KEY}}
```
**Cost:** ~$0.01/call (SerpAPI free tier: 100 searches/month; paid: $50/mo for 5K)
**Usage:** 1 call per project per week (trend monitoring)
**Alternative:** Google Trends unofficial API (less reliable, no API key needed)

---

### Integration 4: Reddit API — Topic Intelligence (F07)

**Auth:**
```
Client ID: {{REDDIT_CLIENT_ID}}
Client Secret: {{REDDIT_CLIENT_SECRET}}
Grant Type: client_credentials
Token URL: https://www.reddit.com/api/v1/access_token
```

**Hot posts endpoint:**
```
GET https://oauth.reddit.com/r/{{subreddit}}/hot
  ?limit=25
  Authorization: Bearer {{REDDIT_ACCESS_TOKEN}}
  User-Agent: VisionGridAI/1.0 (by /u/{{REDDIT_USERNAME}})
```

**Subreddit mapping** (add to Supabase `niche_config` table per project):
```json
{
  "credit_cards": ["CreditCards", "personalfinance", "churning"],
  "business": ["entrepreneur", "smallbusiness", "startups"],
  "health": ["fitness", "nutrition", "loseit"],
  "tech": ["technology", "software", "gadgets"]
}
```

**Rate limit:** 60 requests/minute (very generous)
**Cost:** Free

---

### Integration 5: Style DNA — YouTube Data API (F12)

No new integration required. Uses existing YouTube Data API v3 credentials.

**Additional Vision analysis via existing Anthropic API:**
```json
{
  "model": "claude-opus-4-6",
  "max_tokens": 1000,
  "messages": [{
    "role": "user",
    "content": [
      {"type": "image", "source": {"type": "url", "url": "{{thumbnail_url}}"}},
      {"type": "text", "text": "Analyze this YouTube thumbnail for: dominant colors (hex), text position (left/center/right), face presence (yes/no), emotional tone, background type, text density. Return JSON only."}
    ]
  }]
}
```
**Cost:** ~$0.002 per thumbnail analyzed (~$0.04 for 20 thumbnails per channel analysis)

---

## Daily Quota Budget

| Integration | Daily Calls | Quota Cost | Budget Status |
|-------------|-------------|------------|---------------|
| YouTube Search (topic scoring) | 0 (per-project only) | 100 units/call | ✅ OK |
| YouTube Videos.list (outlier calc) | 0 (per-project only) | 1 unit/call | ✅ OK |
| YouTube Channels.list (competitors) | 10/project | 1 unit/call | ✅ OK |
| YouTube PlaylistItems.list | 10/project | 1 unit/call | ✅ OK |
| YouTube Comments.list | ~5/week | 1 unit/call | ✅ OK |
| YouTube Analytics | ~3/day (published videos) | 1 unit/call | ✅ OK |
| **Total YouTube API (daily)** | ~25–30 calls | ~30 units | ✅ Well within 10K limit |
| Reddit API | 25/project/week | Free | ✅ OK |
| SerpAPI | 1/project/week | $0.01 | ✅ Minimal |
| Anthropic (Claude) | Existing | Existing billing | Adds ~$0.10/project/day |

---

## New n8n Credentials Required

| Credential Name | Type | Used By |
|-----------------|------|---------|
| `youtube_api_key` | Generic (Header) | Existing — already configured |
| `youtube_oauth` | OAuth 2.0 | YouTube Analytics API (F08, F13) |
| `reddit_oauth` | OAuth 2.0 | Reddit Topic Intelligence (F07) |
| `serpapi_key` | Generic (Header) | Google Trends (F07) — optional |

**To configure YouTube OAuth in n8n:**
1. Google Cloud Console → Create OAuth 2.0 Client (Web App)
2. Scopes: `https://www.googleapis.com/auth/yt-analytics.readonly`
3. Add to n8n: Credentials → YouTube → OAuth2
4. Refresh token: run once manually to authorize

---

## Supabase Schema Migrations

All new tables needed for the intelligence layer:

```sql
-- Migration: 20260413_intelligence_layer.sql

-- Competitor monitoring
CREATE TABLE competitor_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  channel_id VARCHAR(50) NOT NULL,
  channel_name VARCHAR(200),
  channel_url VARCHAR(500),
  uploads_playlist_id VARCHAR(60),
  subscriber_count INTEGER,
  avg_views_per_video FLOAT,
  avg_views_30d FLOAT,
  tracked_since TIMESTAMPTZ DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(project_id, channel_id)
);

CREATE TABLE competitor_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES competitor_channels(id) ON DELETE CASCADE,
  youtube_video_id VARCHAR(20) UNIQUE,
  title VARCHAR(500),
  thumbnail_url VARCHAR(500),
  published_at TIMESTAMPTZ,
  views_at_discovery INTEGER,
  views_24h INTEGER,
  views_7d INTEGER,
  views_30d INTEGER,
  is_outlier BOOLEAN DEFAULT false,
  outlier_ratio FLOAT,
  topic_pattern_match BOOLEAN DEFAULT false,
  first_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE competitor_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  channel_id UUID REFERENCES competitor_channels(id),
  video_id UUID REFERENCES competitor_videos(id),
  alert_type VARCHAR(50),
  alert_message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE competitor_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  week_of TIMESTAMPTZ,
  summary TEXT,
  top_topic_clusters JSONB,
  breakout_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Niche health
CREATE TABLE niche_health_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  health_score INTEGER,
  health_classification VARCHAR(20),
  momentum_trend VARCHAR(20),
  saturation_signal BOOLEAN,
  score_breakdown JSONB,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Style DNA
CREATE TABLE style_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  channel_url VARCHAR(500),
  channel_name VARCHAR(200),
  title_formulas JSONB,
  thumbnail_dna JSONB,
  content_pillars JSONB,
  upload_cadence JSONB,
  style_summary TEXT,
  applied_to_project BOOLEAN DEFAULT false,
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audience intelligence
CREATE TABLE audience_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  week_of TIMESTAMPTZ,
  recurring_questions JSONB,
  content_complaints JSONB,
  audience_persona_summary TEXT,
  vocabulary_level VARCHAR(20),
  topic_suggestions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PPS calibration
CREATE TABLE pps_calibration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id),
  predicted_pps INTEGER,
  actual_views_30d INTEGER,
  actual_ctr FLOAT,
  variance_pct FLOAT,
  calibration_run_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pps_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  outlier_weight FLOAT DEFAULT 0.30,
  seo_weight FLOAT DEFAULT 0.20,
  script_quality_weight FLOAT DEFAULT 0.20,
  niche_health_weight FLOAT DEFAULT 0.15,
  thumbnail_ctr_weight FLOAT DEFAULT 0.10,
  title_ctr_weight FLOAT DEFAULT 0.05,
  last_calibrated_at TIMESTAMPTZ,
  calibration_sample_count INTEGER DEFAULT 0
);

-- Topics table extensions
ALTER TABLE topics ADD COLUMN IF NOT EXISTS outlier_score INTEGER DEFAULT 50;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS algorithm_momentum VARCHAR(20) DEFAULT 'stable';
ALTER TABLE topics ADD COLUMN IF NOT EXISTS competing_videos_count INTEGER;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS outlier_data_available BOOLEAN DEFAULT true;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS seo_score INTEGER DEFAULT 50;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS seo_classification VARCHAR(20);
ALTER TABLE topics ADD COLUMN IF NOT EXISTS primary_keyword VARCHAR(200);
ALTER TABLE topics ADD COLUMN IF NOT EXISTS keyword_variants JSONB;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS title_options JSONB;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS selected_title VARCHAR(200);
ALTER TABLE topics ADD COLUMN IF NOT EXISTS title_ctr_score INTEGER;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS thumbnail_ctr_score INTEGER;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS thumbnail_score_breakdown JSONB;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS predicted_performance_score INTEGER;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS pps_light VARCHAR(10);
ALTER TABLE topics ADD COLUMN IF NOT EXISTS pps_recommendation TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS viral_moments JSONB;

-- Projects table extensions
ALTER TABLE projects ADD COLUMN IF NOT EXISTS niche_rpm_category VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_rpm_low FLOAT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_rpm_mid FLOAT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_rpm_high FLOAT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS niche_health_score INTEGER DEFAULT 50;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS niche_health_classification VARCHAR(20);

-- Enable Realtime for new tables (run in Supabase SQL editor)
ALTER TABLE competitor_alerts REPLICA IDENTITY FULL;
ALTER TABLE competitor_videos REPLICA IDENTITY FULL;
ALTER TABLE niche_health_history REPLICA IDENTITY FULL;
```
