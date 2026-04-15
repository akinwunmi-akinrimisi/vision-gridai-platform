# prompts/outlier_intelligence.md
> STATUS: NEW PROMPT
> Used by: WF_OUTLIER_SCORE (Skill 19)
> Model: Claude Opus 4.6

---

## System Prompt

You are an expert YouTube algorithm analyst. Your job is to analyze raw YouTube search data and determine whether a given video topic has strong algorithm momentum — meaning the algorithm is currently pushing content on this topic and videos are outperforming expectations.

You think like a data scientist, not a marketer. Your outputs are scored signals, not advice.

---

## User Prompt Template

```
TOPIC ANALYSIS REQUEST

Topic: {{topic_title}}
Niche: {{niche_context}}
Channel Niche Keywords: {{niche_keywords}}

YOUTUBE SEARCH DATA (last 30 days, ordered by views):
{{#each search_results}}
- "{{this.title}}" | Views: {{this.view_count}} | Published: {{this.published_at}} | Channel Subs: {{this.channel_subscriber_count}}
{{/each}}

HISTORICAL BASELINE:
Average views per video in this niche (90-day rolling): {{niche_avg_views}}
Upload frequency (videos on this topic in last 30 days): {{recent_upload_count}}
Upload frequency (videos on this topic in last 90 days): {{older_upload_count}}

TASK: Calculate the following scores and return ONLY valid JSON.

1. outlier_score (0-100): How strong is the algorithm pushing this topic?
   - 80-100: Exceptional momentum. Multiple videos significantly outperforming niche avg. Fast-rising.
   - 60-79: Strong momentum. Clear outperformers. Topic is gaining.
   - 40-59: Neutral. Mixed performance. Normal competitive landscape.
   - 20-39: Weak momentum. Few outperformers. Algorithm not actively pushing this.
   - 0-19: Dead. No outlier performance. Topic is saturated or ignored.

2. algorithm_momentum (string): "accelerating" | "stable" | "decelerating"
   - accelerating: recent_upload_count / (older_upload_count/3) > 1.5 AND avg views trending up
   - decelerating: opposite pattern
   - stable: neither

3. outlier_ratio (float): top_video_views / niche_avg_views (capped at 20.0)

4. avg_views_top10 (integer): average views of the top 10 results

5. reasoning (string): 1-2 sentence explanation of your score. Be specific about what data drove the score.

Return ONLY this JSON object, no other text:
{
  "outlier_score": <integer 0-100>,
  "algorithm_momentum": "<accelerating|stable|decelerating>",
  "outlier_ratio": <float>,
  "avg_views_top10": <integer>,
  "competing_videos_count": <integer>,
  "reasoning": "<1-2 sentences>"
}
```

---

## Example Output

```json
{
  "outlier_score": 74,
  "algorithm_momentum": "accelerating",
  "outlier_ratio": 8.3,
  "avg_views_top10": 412000,
  "competing_videos_count": 847,
  "reasoning": "The top video on this topic has 3.4M views vs a niche average of 410K — an 8.3x outlier. Upload frequency has increased 2.1x in the last 30 days vs the prior period, indicating the algorithm is actively surfacing this content cluster."
}
```

---

## Fallback Behavior

If `search_results` array is empty (API error or no results):
```json
{
  "outlier_score": 50,
  "algorithm_momentum": "stable",
  "outlier_ratio": 1.0,
  "avg_views_top10": 0,
  "competing_videos_count": 0,
  "reasoning": "Insufficient data to score this topic. Default neutral score applied.",
  "data_unavailable": true
}
```

---

## n8n Node Configuration

```javascript
// Code node before Claude call — prepare the prompt
const topics = $input.all();
const results = [];

for (const topic of topics) {
  const searchData = topic.json.youtube_search_results; // from YouTube API node
  const prompt = `TOPIC ANALYSIS REQUEST\n\nTopic: ${topic.json.title}\nNiche: ${topic.json.niche_context}\n...`;
  results.push({ topic_id: topic.json.id, prompt });
}

return results;
```

```javascript
// Code node after Claude response — parse and write to Supabase
const response = $input.first().json;
const text = response.content[0].text;
const clean = text.replace(/```json|```/g, '').trim();
const parsed = JSON.parse(clean);

return [{
  json: {
    topic_id: $('Prepare Prompt').first().json.topic_id,
    outlier_score: parsed.outlier_score,
    algorithm_momentum: parsed.algorithm_momentum,
    outlier_ratio: parsed.outlier_ratio,
    avg_views_top10: parsed.avg_views_top10,
    competing_videos_count: parsed.competing_videos_count,
    outlier_data_available: !parsed.data_unavailable
  }
}];
```
