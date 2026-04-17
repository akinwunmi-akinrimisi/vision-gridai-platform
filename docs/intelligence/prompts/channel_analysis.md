# Channel Analysis Prompt — WF_CHANNEL_ANALYZE

**Workflow:** WF_CHANNEL_ANALYZE (n8n ID: `ERkpYV8lBwViCj9L`)
**Model:** claude-opus-4-6 (deep analysis) + claude-haiku-4-5-20251001 (comment mining)
**Cost:** ~$0.15-0.30/channel (Opus) + ~$0.005 (Haiku)
**Trigger:** POST `/webhook/channel-analyze` with `{ channel_url, analysis_group_id }`

---

## System Prompt

```
You are an elite YouTube channel strategist with deep expertise in content 
analysis, audience psychology, and competitive positioning. You analyze 
channels with surgical precision, identifying exactly what works, what fails, 
and where the blue-ocean opportunities are. Be specific and data-driven. 
No generic advice.
```

## User Prompt

```
Analyze this YouTube channel in depth.

CHANNEL INFO:
- Name: {{channel_name}}
- Description: {{channel_description (first 1500 chars)}}
- Country: {{country}}
- Created: {{channel_created_at}}
- Subscribers: {{subscriber_count}}
- Total views: {{total_view_count}}
- Video count: {{video_count}}

METRICS:
- Avg views/video: {{avg_views_per_video}}
- Median views/video: {{median_views_per_video}}
- Upload frequency: every {{upload_frequency_days}} days
- Avg video duration: {{avg_video_duration_seconds / 60}} minutes
- Growth trajectory: {{growth_trajectory}}
- Est. monthly views: {{estimated_monthly_views}}

TOP 20 VIDEOS BY VIEWS:
1. "{{title}}" — {{views}} views, {{likes}} likes, {{comments}} comments, 
   {{duration}}min, outlier: {{outlier_score}}x median
2. ...
(20 videos with full stats)

ALL {{N}} RECENT VIDEO TITLES:
1. {{title}}
2. ...
(50 titles for pattern analysis)

Return ONLY valid JSON with these exact fields:
{
  "primary_topics": ["topic1", "topic2", ...],
  "content_style": "brief description of their style (educational/entertainment/hybrid etc)",
  "target_audience_description": "who watches this channel",
  "title_patterns": {
    "common_formulas": ["formula1", "formula2"],
    "uses_numbers_pct": 45,
    "uses_questions_pct": 30,
    "avg_title_length": 55,
    "emotional_triggers": ["curiosity", "fear"]
  },
  "thumbnail_patterns": {
    "inferred_style": "description of likely thumbnail style based on content type",
    "text_usage": "heavy/moderate/minimal",
    "face_likely": true,
    "brand_consistency": "high/medium/low"
  },
  "scripting_depth": {
    "estimated_research_level": "surface/moderate/deep/expert",
    "narrative_structure": "description of how videos are structured",
    "engagement_hooks": ["hook type 1", "hook type 2"],
    "production_quality": "low/medium/high/premium"
  },
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "blue_ocean_opportunities": [
    {"opportunity": "description", "rationale": "why this is underserved", "difficulty": "easy/medium/hard"}
  ],
  "content_saturation_map": [
    {"topic": "topic name", "saturation": "oversaturated/moderate/underserved", "video_count_seen": 5}
  ],
  "posting_schedule": "inferred posting pattern",
  "verdict": "strong_opportunity|moderate_opportunity|weak_opportunity|avoid",
  "verdict_reasoning": "2-3 sentences explaining the verdict",
  "verdict_score": 72
}
```

---

## Comment Mining (runs after deep analysis)

**Model:** claude-haiku-4-5-20251001
**Input:** Top 20 comments from each of top 10 videos (200 comments total)
**YouTube API cost:** 10 units (1 per commentThreads.list call)

### Prompt

```
Analyze these {{N}} YouTube comments from a channel about "{{primary_topics}}".

COMMENTS:
[Video: "{{video_title}}" | {{likes}} likes] {{author}}: "{{comment_text}}"
...

Extract in JSON:
{
  "content_gaps": ["topics viewers request that this channel does not cover"],
  "pain_points": ["frustrations or complaints viewers express"],
  "competitor_mentions": ["other channels or creators viewers mention"],
  "requested_topics": ["specific video ideas viewers ask for"],
  "audience_sentiment": "positive|mixed|negative",
  "audience_sophistication": "beginner|intermediate|advanced",
  "top_questions": ["most common questions in comments"],
  "viral_comment_themes": ["themes in the highest-liked comments"]
}
```

---

## Data Flow

```
Channel URL
  → YouTube API: resolve channel ID
  → YouTube API: fetch channel metadata (snippet, statistics, contentDetails)
  → YouTube API: fetch 50 videos from uploads playlist
  → Calculate metrics (avg/median views, upload frequency, growth trajectory)
  → Rank top 20 by views, calculate outlier scores
  → Claude Opus 4.6: deep analysis (system + user prompt above)
  → YouTube API: fetch 200 comments from top 10 videos
  → Claude Haiku: comment mining
  → Write to channel_analyses table
  → Auto-trigger WF_DISCOVER_COMPETITORS (if first in group)
```
