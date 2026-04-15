# prompts/topic_scorer.md
> STATUS: NEW PROMPT
> Used by: WF_SEO_SCORE (Skill 20)
> Model: Claude Opus 4.6

---

## System Prompt

You are a YouTube SEO strategist. You analyze keyword data to determine how much search demand exists for a video topic and how competitive the landscape is. You output actionable opportunity scores, not opinions.

You distinguish between: topics people SEARCH for (SEO pull) vs topics the algorithm PUSHES (outlier momentum). Both matter, but they are different signals.

---

## User Prompt Template

```
SEO OPPORTUNITY ANALYSIS

Topic: {{topic_title}}
Niche: {{niche_context}}
Primary Keyword: {{primary_keyword}} (extracted from topic title)
Keyword Variants Generated: {{keyword_variants}}

AUTOCOMPLETE DATA:
Keyword 1 ({{keyword_variants[0]}}): {{autocomplete_count_1}} suggestions returned
Keyword 2 ({{keyword_variants[1]}}): {{autocomplete_count_2}} suggestions returned
Keyword 3 ({{keyword_variants[2]}}): {{autocomplete_count_3}} suggestions returned

COMPETITION DATA:
YouTube search results for "{{primary_keyword}}": {{total_results}} videos
Estimated top 10 videos average views: {{top10_avg_views}}
Top result published: {{top_result_age}} days ago
Channel size of top result: {{top_channel_subs}} subscribers

TASK: Return ONLY valid JSON with these fields:

1. seo_score (0-100): Overall search opportunity score
   Weight: autocomplete_demand (40%) + search_volume_proxy (30%) + competition_inverse (30%)
   
2. seo_classification:
   - "blue-ocean": total_results < 5,000 AND autocomplete suggestions > 4 → high opportunity
   - "competitive": total_results 5K–100K → normal landscape
   - "red-ocean": total_results > 100K → highly saturated
   - "dead-sea": total_results < 1,000 AND autocomplete suggestions < 2 → no demand

3. primary_keyword (string): The single best keyword to target (may differ from extracted)

4. keyword_variants (array): Best 3 keyword variants for description/tags

5. search_demand_signal (string): "high" | "medium" | "low" | "none"

6. competition_level (string): "low" | "medium" | "high"

7. opportunity_summary (string): 1 sentence. Be specific about the numbers.

Return ONLY this JSON:
{
  "seo_score": <integer 0-100>,
  "seo_classification": "<blue-ocean|competitive|red-ocean|dead-sea>",
  "primary_keyword": "<string>",
  "keyword_variants": ["<string>", "<string>", "<string>"],
  "search_demand_signal": "<high|medium|low|none>",
  "competition_level": "<low|medium|high>",
  "search_volume_proxy": <integer>,
  "opportunity_summary": "<string>"
}
```

---

## Scoring Logic Reference

```
autocomplete_demand_score:
  0 suggestions: 0
  1-2 suggestions: 20
  3-4 suggestions: 45
  5-6 suggestions: 65
  7-8 suggestions: 85
  8+ suggestions: 100

search_volume_proxy = avg(autocomplete_count_1, count_2, count_3) * 12.5

competition_inverse_score:
  >500K results: 0
  100K-500K: 15
  50K-100K: 35
  10K-50K: 55
  5K-10K: 70
  1K-5K: 85
  <1K: 95

seo_score = (autocomplete_demand * 0.40) + (min(search_volume_proxy, 100) * 0.30) + (competition_inverse * 0.30)
```

---

## Example Output

```json
{
  "seo_score": 68,
  "seo_classification": "competitive",
  "primary_keyword": "credit card hidden fees",
  "keyword_variants": [
    "credit card hidden charges",
    "what credit cards dont tell you about fees",
    "credit card fee secrets"
  ],
  "search_demand_signal": "high",
  "competition_level": "medium",
  "search_volume_proxy": 7,
  "opportunity_summary": "8 autocomplete suggestions confirm strong search demand; 23K competing videos indicates competitive but not saturated territory — realistically rankable for a channel with 10K+ subscribers."
}
```

---

## n8n Node Configuration

**Node sequence:**
1. HTTP Request: YouTube autocomplete (3 calls per topic, parallel)
2. HTTP Request: YouTube search.list (1 call per topic)
3. Code Node: Prepare prompt with all data
4. Claude API call
5. Code Node: Parse response → Supabase PATCH

```javascript
// Parse Claude response
const text = $input.first().json.content[0].text;
const clean = text.replace(/```json|```/g, '').trim();
const parsed = JSON.parse(clean);

return [{
  json: {
    topic_id: $('Input').first().json.topic_id,
    seo_score: parsed.seo_score,
    seo_classification: parsed.seo_classification,
    primary_keyword: parsed.primary_keyword,
    keyword_variants: parsed.keyword_variants,
    search_volume_proxy: parsed.search_volume_proxy,
    competition_level: parsed.competition_level
  }
}];
```
