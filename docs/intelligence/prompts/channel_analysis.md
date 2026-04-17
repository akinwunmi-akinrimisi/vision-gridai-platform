# Channel Analysis Prompt — WF_CHANNEL_ANALYZE

**Workflow:** WF_CHANNEL_ANALYZE (n8n ID: `ERkpYV8lBwViCj9L`)
**Model:** claude-opus-4-6 (deep analysis) + claude-haiku-4-5-20251001 (comment mining)
**Cost:** ~$0.15-0.30/channel (Opus) + ~$0.005 (Haiku)
**Trigger:** POST `/webhook/channel-analyze` with `{ channel_url, analysis_group_id }`

---

## Optimization Changelog (what changed and why)

| # | Change | Reason |
|---|--------|--------|
| 1 | System prompt expanded with anti-hallucination grounding rules | Original was 4 lines — too few constraints. Model could fabricate patterns not in the data. |
| 2 | Added scoring rubric for verdict_score | Without a rubric, scores drift 15-20 points between runs on identical input. Rubric anchors calibration. |
| 3 | Added evidence-citation requirement to strengths/weaknesses/opportunities | Original accepted assertions. Now every claim must reference a specific video or metric from the input. |
| 4 | Added minimum array counts | Original had no minimums — model sometimes returned 1 strength and 1 weakness. Now enforced: 3-5 strengths, 3-5 weaknesses, 5-8 blue-ocean opportunities. |
| 5 | Added saturation threshold definitions | Original said "oversaturated/moderate/underserved" with no definition. Now quantified: ≥4 videos in top 20 = oversaturated, 2-3 = moderate, 0-1 = underserved. |
| 6 | Restructured blue_ocean_opportunities with estimated_demand and confidence | Original only had difficulty. Now includes demand signal strength and confidence level so downstream systems can weight properly. |
| 7 | Added edge case handling instructions | Original had no guidance for channels with <20 videos, dormant channels, or non-English content. |
| 8 | Comment mining prompt expanded with deduplication and minimum counts | Original was bare — produced inconsistent output density. |
| 9 | Added explicit instruction that thumbnail_patterns is inference-only | Prevents model from claiming it "analyzed" images when it only has titles and metadata. |
| 10 | Added content_gap_vs_competition field | Original saturation map only showed topics THIS channel covers. Now also identifies topics that exist in the niche but this channel ignores — critical for blue-ocean. |

---

## System Prompt

```
You are an elite YouTube channel strategist and competitive intelligence analyst.

CORE RULES:
1. Every claim you make MUST cite specific evidence from the data provided. 
   When you say "this channel is strong at X," reference the specific video(s) 
   or metric(s) that prove it. No unsupported assertions.
2. You can ONLY analyze what is in the data. Do not infer revenue, CTR, 
   audience retention, or any metric not explicitly provided. If you need 
   data you don't have, say "insufficient data" for that field.
3. Thumbnail analysis is INFERENCE ONLY based on content type, titles, and 
   niche conventions. You have not seen the actual thumbnails unless images 
   are attached. Label this section clearly as inferred.
4. Scores must follow the rubric provided. Do not inflate or deflate. 
   A score of 80+ should be rare and reserved for genuinely exceptional signals.
5. Blue-ocean opportunities must be SPECIFIC and ACTIONABLE — not "make better 
   content" but "cover [specific topic] from [specific angle] because [specific 
   evidence from the data]."
6. Return ONLY valid JSON. No markdown, no backticks wrapping the JSON, no 
   commentary before or after. The first character of your response must be {.
```

---

## User Prompt

```
Analyze this YouTube channel in depth. Ground every finding in the data below.

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
1. "{{title}}" — {{views}} views, {{likes}} likes, {{comments}} comments, {{duration}}min, outlier: {{outlier_score}}x median
2. ...
(20 videos with full stats)

ALL {{N}} RECENT VIDEO TITLES:
1. {{title}}
2. ...
(up to 50 titles for pattern analysis)

ANALYSIS INSTRUCTIONS:

For primary_topics: Cluster the video titles into 5-10 distinct topic groups. 
Name each group specifically (not "general finance" but "credit card annual fee 
comparisons" or "airline miles transfer strategies").

For title_patterns: Analyze ALL {{N}} titles, not just the top 20. Count actual 
percentages — e.g., if 23 of 50 titles start with a number, uses_numbers_pct = 46.

For content_saturation_map: A topic is "oversaturated" if 4+ of the top 20 videos 
cover it. "moderate" if 2-3 cover it. "underserved" if 0-1 cover it. Count from the 
actual data, do not estimate.

For blue_ocean_opportunities: Identify at least 5. Each must reference a specific 
gap visible in the data — e.g., "No video in the top 20 covers [X] despite [Y 
evidence of demand]." Include an estimated_demand level and a confidence level 
for each.

For strengths and weaknesses: Provide 3-5 of each. Every strength must cite a 
specific video or metric as evidence. Every weakness must identify what is missing 
or underperforming with a specific reference.

VERDICT SCORING RUBRIC (use this, do not invent your own scale):
- 80-100: Exceptional opportunity. Multiple underserved high-demand topics. 
  Weak competition. Growing niche. Clear entry path.
- 60-79: Good opportunity. Several gaps exist. Competition is present but beatable 
  with differentiation. Niche is stable or growing.
- 40-59: Moderate opportunity. Some gaps but competition is strong. Requires 
  significant differentiation to succeed. Niche may be mature.
- 20-39: Weak opportunity. Few gaps. Strong entrenched competition. Niche may 
  be declining or oversaturated.
- 0-19: Avoid. No meaningful gaps. Dominant incumbents. Declining niche.

EDGE CASES:
- If the channel has fewer than 20 videos, analyze all available and note 
  "limited data — {{video_count}} videos analyzed" in verdict_reasoning.
- If growth_trajectory is "dormant," factor this heavily into the verdict — 
  a dormant competitor is an opportunity, not a threat.
- If video titles are in a non-English language, still analyze patterns but 
  note the language in content_style.

Return ONLY valid JSON with these exact fields:
{
  "primary_topics": ["specific topic 1", "specific topic 2", ...],
  
  "content_style": "description of their style and format approach",
  
  "target_audience_description": "who watches this channel — be specific about demographics, knowledge level, and intent",
  
  "title_patterns": {
    "common_formulas": ["[Number] + [Object] + [Curiosity Gap]", "How [X] Actually [Y]", ...],
    "uses_numbers_pct": 45,
    "uses_questions_pct": 30,
    "avg_title_length": 55,
    "emotional_triggers": ["curiosity", "fear", ...],
    "common_opening_words": ["Why", "How", "The", ...],
    "power_words_observed": ["secret", "actually", "never", ...]
  },
  
  "thumbnail_patterns": {
    "inferred_style": "inferred thumbnail style based on content type and niche conventions (NOT from actual image analysis)",
    "text_usage": "heavy|moderate|minimal",
    "face_likely": true,
    "brand_consistency": "high|medium|low",
    "analysis_note": "Inferred from content type and titles only — actual thumbnails not analyzed"
  },
  
  "scripting_depth": {
    "estimated_research_level": "surface|moderate|deep|expert",
    "narrative_structure": "how videos are structured based on titles and durations",
    "engagement_hooks": ["hook type 1 with example from data", ...],
    "production_quality": "low|medium|high|premium",
    "avg_video_length_minutes": 0,
    "estimated_words_per_video": 0
  },
  
  "strengths": [
    "Specific strength with evidence — e.g., 'Strong outlier performance on topic X (video Y achieved Z views, Nx median)'",
    ...
  ],
  
  "weaknesses": [
    "Specific weakness with evidence — e.g., 'No coverage of topic X despite Y evidence of demand'",
    ...
  ],
  
  "blue_ocean_opportunities": [
    {
      "opportunity": "specific underserved topic or angle",
      "rationale": "evidence from the data — which videos/gaps prove this is underserved",
      "difficulty": "easy|medium|hard",
      "estimated_demand": "high|medium|low",
      "confidence": "high|medium|low",
      "suggested_first_video": "a concrete title idea for the first video on this topic"
    }
  ],
  
  "content_saturation_map": [
    {
      "topic": "topic name",
      "saturation": "oversaturated|moderate|underserved",
      "video_count_seen": 5,
      "evidence": "which videos from the top 20 cover this"
    }
  ],
  
  "posting_schedule": "inferred posting pattern with evidence",
  
  "verdict": "strong_opportunity|moderate_opportunity|weak_opportunity|avoid",
  "verdict_reasoning": "2-3 sentences grounded in specific data points from this analysis",
  "verdict_score": 72
}
```

---

## Comment Mining (runs after deep analysis)

**Model:** claude-haiku-4-5-20251001
**Input:** Top 20 comments from each of top 10 videos (200 comments total)
**YouTube API cost:** 10 units (1 per commentThreads.list call)

### System Prompt

```
You are a YouTube audience analyst. You extract actionable intelligence from 
comment sections — not sentiment fluff, but specific content gaps, unmet needs, 
and demand signals. Deduplicate similar comments into single insights. Prioritize 
comments with high like counts as stronger signals of audience-wide sentiment.
Return ONLY valid JSON. No markdown, no backticks. First character must be {.
```

### User Prompt

```
Analyze these {{N}} YouTube comments from a channel about "{{primary_topics}}".

COMMENTS (sorted by like count within each video):
{{#each videos}}
--- Video: "{{this.video_title}}" ({{this.views}} views) ---
{{#each this.comments}}
[{{this.likes}} likes] {{this.author}}: "{{this.comment_text}}"
{{/each}}
{{/each}}

INSTRUCTIONS:
- Deduplicate: if 5 comments ask for the same topic, report it ONCE with a 
  count ("requested by ~5 commenters across 3 videos").
- Prioritize high-like comments as stronger demand signals.
- content_gaps: topics viewers explicitly ask for that this channel has NOT covered. 
  Minimum 3, maximum 10.
- pain_points: specific frustrations, NOT vague complaints. "The math was wrong 
  at 4:32" is a pain point. "Great video!" is not.
- requested_topics: deduplicated list of video ideas viewers suggest. Minimum 3.
- top_questions: the most common genuine questions (not rhetorical). Minimum 3.
- competitor_mentions: other channels or creators mentioned BY NAME.
- viral_comment_themes: themes in comments with the highest like counts 
  (10+ likes). What resonates with the broader audience?
- If comments are sparse or mostly generic ("great video", emoji-only), say so 
  explicitly in audience_sentiment and reduce confidence in other fields.

Return JSON:
{
  "content_gaps": [
    {"gap": "specific topic viewers want", "signal_strength": "strong|moderate|weak", "evidence": "~N commenters across M videos"}
  ],
  "pain_points": [
    {"pain_point": "specific frustration", "frequency": "how often seen", "severity": "high|medium|low"}
  ],
  "competitor_mentions": [
    {"name": "channel or creator name", "context": "why they were mentioned", "mention_count": 3}
  ],
  "requested_topics": [
    {"topic": "specific video idea", "demand_evidence": "how many requested, in which videos"}
  ],
  "audience_sentiment": "positive|mixed|negative",
  "audience_sophistication": "beginner|intermediate|advanced",
  "audience_sophistication_evidence": "what language/questions indicate this level",
  "top_questions": [
    {"question": "the actual question", "frequency": "how often asked", "video_context": "which videos triggered this"}
  ],
  "viral_comment_themes": [
    {"theme": "what resonates", "example_comment": "highest-liked example", "like_count": 150}
  ],
  "data_quality_note": "assessment of comment quality — sparse/generic/rich/highly engaged"
}
```

---

## Data Flow

```
Channel URL
  → YouTube API: resolve channel ID (handle, /c/, /channel/ formats)
  → YouTube API: fetch channel metadata (snippet, statistics, contentDetails)
  → YouTube API: fetch 50 videos from uploads playlist (playlistItems + videos.list)
  → Calculate metrics (avg/median views, upload frequency, growth trajectory)
  → Rank top 20 by views, calculate outlier scores (views / median)
  → Claude Opus 4.6: deep analysis (system + user prompt above)
  → YouTube API: fetch top 20 comments from each of top 10 videos (200 total)
  → Claude Haiku 4.5: comment mining
  → Merge comment insights into channel_analyses record
  → Write to channel_analyses table (status = 'completed')
  → Auto-trigger WF_DISCOVER_COMPETITORS (if first analysis in group)
```
