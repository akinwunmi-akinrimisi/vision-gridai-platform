# Niche Viability Assessment Prompt — WF_NICHE_VIABILITY

**Workflow:** WF_NICHE_VIABILITY (n8n ID: `ugk9Lr5hL3Tyh0hA`)
**Model:** claude-opus-4-6
**Max tokens:** 8192
**Cost:** ~$0.30-0.60 per assessment
**Trigger:** POST `/webhook/niche-viability` with `{ analysis_group_id }`

---

## System Prompt

```
You are a YouTube niche viability analyst. You assess whether a niche is 
worth entering based on monetization potential, audience demand, competition 
gaps, and entry difficulty. You score each factor 0-100 and provide a 
weighted total. You also identify defensible moat opportunities. Be specific, 
data-driven, and brutally honest. No generic advice.
```

## User Prompt

```
Analyze this YouTube niche for viability. {{channels_analyzed}} channels were analyzed.

CHANNEL SUMMARIES:
1. {{name}} — {{subscribers}} subs, {{monthly_views}} monthly views, avg {{avg_views}} views/video, 
   growth: {{growth}}, verdict: {{verdict}} ({{verdict_score}}/100), avg duration: {{avg_duration}}min
2. ...
(one per analyzed channel)

AGGREGATE STATS:
- Total subscribers across niche: {{total_subscribers}}
- Total estimated monthly views: {{total_monthly_views}}
- Average upload frequency: every {{avg_upload_frequency_days}} days

TOPIC LANDSCAPE (by coverage frequency):
- "{{topic}}" (covered by {{channel_count}} channels)
- ...
(top 20 topics)

NICHE-WIDE OUTLIER VIDEOS (highest views):
1. [{{channel}}] "{{title}}" — {{views}} views, outlier: {{outlier_score}}x
2. ...
(top 10 outliers)

TITLE PATTERNS:
Common formulas: 
- {{formula1}}
- {{formula2}}
Emotional triggers: {{triggers}}
Avg title length: {{avg_title_length}} chars

SCRIPTING/PRODUCTION DEPTH:
- {{channel}}: research={{research_level}}, quality={{production_quality}}
- ...

STRENGTHS ACROSS CHANNELS:
- [{{channel}}] {{strength}}
- ...
(up to 15)

WEAKNESSES ACROSS CHANNELS:
- [{{channel}}] {{weakness}}
- ...
(up to 15)

BLUE OCEAN OPPORTUNITIES IDENTIFIED:
- [{{channel}}] {{opportunity}} (difficulty: {{difficulty}})
- ...
(up to 15)

CONTENT SATURATION MAP:
- "{{topic}}" — {{saturation}} ({{video_count_seen}} videos seen, from {{source_channel}})
- ...
(up to 20)

AUDIENCE COMMENT INTELLIGENCE (aggregated across all channels):
Content gaps identified from comments: {{comment_derived_gaps}}
Audience pain points: {{comment_derived_pain_points}}
Topics viewers are requesting: {{comment_derived_requested_topics}}
Competitor channels mentioned by viewers: {{comment_derived_competitor_mentions}}

Return ONLY valid JSON with these exact fields:
{
  "monetization_score": <0-100>,
  "monetization_reasoning": "why this score",
  "estimated_rpm_range": { "low": 5.0, "mid": 12.0, "high": 25.0 },
  "ad_category": "Finance/Tech/Education/etc",
  "sponsorship_potential": "high|medium|low|none",
  
  "audience_demand_score": <0-100>,
  "audience_demand_reasoning": "why this score",
  
  "competition_gap_score": <0-100>,
  "competition_gap_reasoning": "why this score",
  
  "entry_difficulty_score": <0-100>,
  "entry_difficulty_reasoning": "why this score (100 = very easy to enter, 0 = impossible)",
  
  "viability_score": <0-100>,
  "viability_verdict": "strong_opportunity|moderate_opportunity|weak_opportunity|avoid",
  "viability_reasoning": "2-3 sentences",
  
  "blue_ocean_opportunities": [
    {
      "topic": "specific underserved topic",
      "reasoning": "evidence from data",
      "demand": "high|medium|low",
      "saturation": "none|low|moderate|high",
      "suggested_angle": "how to approach this differently",
      "moat_defensibility": "high|medium|low"
    }
  ],
  
  "saturated_topics": ["topic1", "topic2"],
  
  "recommended_angle": "the strategic positioning for a new channel",
  "recommended_content_pillars": ["pillar1", "pillar2", "pillar3", "pillar4", "pillar5"],
  "differentiation_strategy": "how to stand out from all analyzed competitors",
  
  "moat_indicators": [
    {
      "indicator": "what makes this defensible",
      "defensibility": "high|medium|low",
      "reasoning": "why"
    }
  ],
  
  "revenue_projections": {
    "at_10k_subs": { "monthly_usd": 500, "reasoning": "detailed explanation" },
    "at_50k_subs": { "monthly_usd": 3000, "reasoning": "detailed explanation" },
    "at_100k_subs": { "monthly_usd": 8000, "reasoning": "detailed explanation" }
  },
  
  "script_depth_targets": {
    "target_word_count": 18000,
    "vocabulary_level": "intermediate|advanced|expert",
    "explanation_depth": "surface|moderate|deep|expert",
    "reasoning": "based on competitor analysis"
  },
  
  "topics_to_avoid": ["saturated_topic1", "saturated_topic2"],
  
  "recommended_topics": [
    {
      "topic": "specific topic idea",
      "angle": "unique approach",
      "demand": "high|medium|low",
      "suggested_title_formula": "How [X] Actually [Y]: The [Z] Nobody Talks About"
    }
  ],
  
  "audience_demographics": "description of likely audience",
  "audience_size_estimate": "small|medium|large|very_large"
}
```

---

## Score Computation (Authoritative — overrides Claude's self-reported total)

```javascript
viability_score = Math.round(
  monetization_score * 0.30 +
  audience_demand_score * 0.25 +
  competition_gap_score * 0.25 +
  entry_difficulty_score * 0.20
)

// Each sub-score clamped to [0, 100]
// Verdict mapping:
//   >= 75: strong_opportunity
//   >= 50: moderate_opportunity
//   >= 25: weak_opportunity
//   < 25:  avoid
```

---

## Aggregation (what feeds into this prompt)

The "Aggregate Data" node collects from ALL completed channel_analyses in the group:

| Data | Source | Aggregation |
|------|--------|-------------|
| Channel summaries | channel_analyses rows | Per-channel: name, subs, views, growth, verdict |
| Topic landscape | primary_topics across all | Frequency count (how many channels cover each) |
| Niche outliers | top_videos across all | Top 10 by views, with outlier_score |
| Title formulas | title_patterns across all | Deduplicated common formulas |
| Scripting levels | scripting_depth across all | Per-channel research + quality level |
| Strengths | strengths across all | Attributed to source channel |
| Weaknesses | weaknesses across all | Attributed to source channel |
| Blue-ocean gaps | blue_ocean_opportunities across all | Attributed to source channel |
| Saturation map | content_saturation_map across all | Per-topic with source |
| Comment gaps | comment_insights.content_gaps | Deduplicated across all channels |
| Comment pain points | comment_insights.pain_points | Deduplicated across all channels |
| Comment requests | comment_insights.requested_topics | Deduplicated across all channels |
| Competitor mentions | comment_insights.competitor_mentions | Deduplicated across all channels |

---

## Downstream Data Flow (after viability report is created)

```
Niche Viability Report
  → Stored in niche_viability_reports table
  → WF_CREATE_PROJECT_FROM_ANALYSIS reads it
  → Injects into projects table:
     ├── niche_viability_score (0-100)
     ├── niche_viability_verdict
     ├── topics_to_avoid[] (saturated topics)
     ├── recommended_topics[] (with title formulas)
     ├── recommended_angle (differentiation)
     ├── revenue_projections (at 10K/50K/100K)
     ├── script_depth_targets (word count, vocab, depth)
     ├── title_dna_patterns
     ├── thumbnail_dna_patterns
     └── channel_analysis_context (JSONB with all intelligence)
  → WF_TOPICS_GENERATE reads projects.* and injects:
     ├── Blue-ocean gaps → topic seeds
     ├── Topics to avoid → exclusion list
     ├── Comment gaps/pain points/questions → demand signals
     ├── Content pillars → topic organization
     ├── Title DNA → CTR optimization
     └── Moat indicators → defensibility guidance
  → WF_SCRIPT_GENERATE reads projects.* and injects:
     ├── Channel positioning → script angle
     ├── Script depth targets → quality benchmark
     ├── Comment pain points → address in script
     ├── Content gaps → fill in script
     ├── Differentiation strategy → unique positioning
     └── Topics to avoid → exclusion
```
