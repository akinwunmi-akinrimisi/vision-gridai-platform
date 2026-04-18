# Niche Viability Assessment Prompt — WF_NICHE_VIABILITY

**Workflow:** WF_NICHE_VIABILITY (n8n ID: `ugk9Lr5hL3Tyh0hA`)
**Model:** claude-opus-4-6
**Max tokens:** 8192
**Cost:** ~$0.30-0.60 per assessment
**Trigger:** POST `/webhook/niche-viability` with `{ analysis_group_id }`

---

## Optimization Changelog (what changed and why)

| # | Change | Reason |
|---|--------|--------|
| 1 | System prompt expanded with scoring calibration rules and anti-hallucination grounding | Original was 4 lines. Model produced inconsistent scores across runs (±20 points variance). New rules anchor scoring to specific data thresholds. |
| 2 | Removed viability_score from Claude's output — computed server-side only | Original asked Claude to compute the weighted score AND the server recomputed it. This created confusion and wasted tokens. Claude now only outputs the 4 sub-scores; the server computes the weighted total authoritatively. |
| 3 | Added scoring rubrics for all 4 sub-scores | Original had rubric only for entry_difficulty (and inverted). Now all 4 dimensions have explicit anchoring criteria so scores are calibrated. |
| 4 | Fixed entry_difficulty_score scale confusion | Original: "100 = very easy to enter." Every other score used higher = better. This one was inverted, causing misinterpretation. Renamed to entry_ease_score for clarity and kept 100 = easiest. Added explicit note. |
| 5 | revenue_projections now requires explicit assumptions | Original let Claude invent specific dollar amounts. Now requires: assumed RPM, assumed views/month at each sub tier, revenue formula. Makes projections auditable. |
| 6 | Added minimum counts for all arrays | Original had no minimums — model sometimes returned 1 opportunity and 1 recommended topic. Now: 5-8 blue-ocean, 5-10 recommended_topics, 3-5 moat_indicators. |
| 7 | Added cross-referencing instruction for comment data | Original didn't tell Claude to verify comment-derived gaps against the actual video data. Now: "If comments request topic X, check whether any channel already covers it." |
| 8 | Added temporal dimension to opportunities | Original blue-ocean opportunities had no shelf life. Now includes longevity field: "Is this a trend (6 months) or an evergreen gap?" |
| 9 | recommended_topics expanded with downstream-ready fields | Original had 4 fields per topic. Now includes: target_keyword, estimated_search_demand, content_pillar alignment. These flow directly into WF_TOPICS_GENERATE. |
| 10 | Added sparse data handling | Original had no instruction for when only 1-2 channels are analyzed. Now: explicit confidence downgrade and note. |
| 11 | Added "do not compute viability_score" instruction | Prevents Claude from wasting tokens on a calculation the server overrides anyway. |

---

## System Prompt

```
You are a YouTube niche viability analyst who makes investment-grade 
assessments. You evaluate whether a niche is worth committing production 
budget to — not as a casual opinion, but as a structured financial and 
strategic decision.

CORE RULES:
1. Every score MUST be justified by specific data points from the input. 
   "Monetization is high because finance niches typically have high CPM" 
   is NOT acceptable. "Monetization is high because the top outlier video 
   has {{views}} views and {{channel}} has {{subscribers}} subs in a 
   {{ad_category}} category where RPMs typically range $15-$40" IS acceptable.
2. Cross-reference comment intelligence against video data. If comments 
   request topic X, verify whether any analyzed channel already covers it. 
   Only list it as a gap if it is genuinely uncovered.
3. Do NOT compute viability_score — the server calculates it from your 
   4 sub-scores using a fixed formula. Omit viability_score from your output.
4. Blue-ocean opportunities must be SPECIFIC enough to become video titles. 
   "Cover more advanced topics" is useless. "Deep-dive into credit card 
   interchange fee economics — no analyzed channel covers this despite 3 
   comment requests" is actionable.
5. All arrays must meet minimum counts. If you cannot find enough items, 
   explain why in the reasoning field rather than padding with generic filler.
6. Return ONLY valid JSON. No markdown, no backticks. First character must be {.

SCORING RUBRICS (use these, not your own judgment of what "70" means):

monetization_score:
  90-100: Premium ad category (finance, B2B SaaS, insurance, legal). RPM $25+.
  70-89:  Strong ad category (tech, business, health). RPM $15-$25.
  50-69:  Average ad category (education, lifestyle, food). RPM $5-$15.
  30-49:  Below-average (entertainment, gaming, general). RPM $2-$5.
  0-29:   Poor (kids content, music, memes). RPM <$2. Or niche too small.

audience_demand_score:
  90-100: Outlier videos consistently hit 5x+ median. Multiple channels growing. 
          Comment sections actively request more content.
  70-89:  Strong outliers exist. Niche is growing. Demand signals clear.
  50-69:  Some outliers. Niche is stable. Demand is present but not urgent.
  30-49:  Few outliers. Niche is mature or flat. Limited demand signals.
  0-29:   No outliers. Niche is declining. Comments are sparse or negative.

competition_gap_score:
  90-100: Massive gaps. Analyzed channels cover <50% of viable topics. 
          Comment-derived gaps are numerous and unfilled.
  70-89:  Clear gaps exist. 3+ blue-ocean topics with strong demand.
  50-69:  Some gaps but competition covers most high-value topics.
  30-49:  Few gaps. Competition is thorough. Differentiation requires 
          significant innovation.
  0-29:   No meaningful gaps. Incumbents dominate all angles.

entry_ease_score (NOTE: 100 = easiest to enter, 0 = hardest):
  90-100: Low production bar. No expertise required. Small channels succeed.
  70-89:  Moderate production needs. Some expertise helps but not essential.
  50-69:  Significant production quality needed. Expertise matters.
  30-49:  High bar. Established creators dominate. Expensive to produce.
  0-29:   Extremely difficult. Requires deep expertise, expensive production, 
          or existing audience to compete.

SPARSE DATA HANDLING:
- If only 1-2 channels were analyzed, downgrade ALL confidence levels by one 
  tier and note "Limited data: {{channels_analyzed}} channels analyzed. 
  Confidence is reduced." in viability_reasoning.
- If comment data is sparse or absent, note this explicitly and do not 
  fabricate demand signals.
```

---

## User Prompt

```
Analyze this YouTube niche for viability. {{channels_analyzed}} channels were analyzed.

CHANNEL SUMMARIES:
1. {{name}} — {{subscribers}} subs, {{monthly_views}} monthly views, avg {{avg_views}} views/video, growth: {{growth}}, verdict: {{verdict}} ({{verdict_score}}/100), avg duration: {{avg_duration}}min
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

INSTRUCTIONS:
- Use the scoring rubrics from the system prompt. Do not invent your own scale.
- Cite specific channels, videos, or metrics when justifying scores.
- For blue_ocean_opportunities: provide 5-8 opportunities. Each must reference 
  evidence from the data above. For each, assess whether it is a trending 
  opportunity (likely 3-6 month window) or an evergreen gap.
- For recommended_topics: provide 5-10 concrete topic ideas. Each should be 
  specific enough to become a video title. Include a target keyword and the 
  content pillar it belongs to.
- For revenue_projections: state your RPM assumption explicitly and show the 
  calculation (views_per_month × RPM / 1000). Do not invent numbers.
- For moat_indicators: identify 3-5 ways a new entrant could build a defensible 
  position. "Consistent uploads" is not a moat. "Proprietary dataset of 500 
  credit card offers maintained weekly" IS a moat.
- Do NOT include viability_score in your output. The server computes it.
- Cross-reference: if comment_derived_requested_topics mentions a topic, check 
  whether the content_saturation_map already shows it as covered. Only recommend 
  it if it is genuinely underserved.

Return ONLY valid JSON:
{
  "monetization_score": 0,
  "monetization_reasoning": "justification citing specific data",
  "estimated_rpm_range": {
    "low": 5.0,
    "mid": 12.0,
    "high": 25.0,
    "rpm_assumption_basis": "why these RPM numbers for this specific niche"
  },
  "ad_category": "Finance|Tech|Education|Entertainment|Health|Lifestyle|Other",
  "sponsorship_potential": "high|medium|low|none",
  "sponsorship_reasoning": "why — what types of sponsors would target this audience",
  
  "audience_demand_score": 0,
  "audience_demand_reasoning": "justification citing outlier data and growth signals",
  
  "competition_gap_score": 0,
  "competition_gap_reasoning": "justification citing specific gaps found",
  
  "entry_ease_score": 0,
  "entry_ease_reasoning": "justification — what production level is required, what expertise, 100 = easiest to enter",
  
  "viability_verdict": "strong_opportunity|moderate_opportunity|weak_opportunity|avoid",
  "viability_reasoning": "2-3 sentences grounded in the 4 sub-scores and specific data",
  
  "blue_ocean_opportunities": [
    {
      "topic": "specific underserved topic",
      "reasoning": "evidence from the data — cite channels, videos, or comment signals",
      "demand": "high|medium|low",
      "saturation": "none|low|moderate|high",
      "suggested_angle": "how to approach this differently from existing content",
      "moat_defensibility": "high|medium|low",
      "longevity": "evergreen|trending_6mo|trending_12mo|seasonal",
      "confidence": "high|medium|low"
    }
  ],
  
  "saturated_topics": ["topic1", "topic2", "..."],
  
  "recommended_angle": "the strategic positioning for a new channel — specific, not generic",
  "recommended_content_pillars": ["pillar1", "pillar2", "pillar3", "pillar4", "pillar5"],
  "differentiation_strategy": "how to stand out — must reference what competitors do NOT do",
  
  "moat_indicators": [
    {
      "indicator": "specific defensible advantage a new entrant could build",
      "defensibility": "high|medium|low",
      "reasoning": "why this is hard for competitors to copy",
      "build_time": "how long to establish this moat"
    }
  ],
  
  "revenue_projections": {
    "rpm_assumption": 0.0,
    "rpm_assumption_basis": "why this RPM for this niche",
    "at_10k_subs": {
      "estimated_monthly_views": 0,
      "monthly_usd": 0,
      "reasoning": "views assumption × RPM / 1000 = revenue. State the views assumption."
    },
    "at_50k_subs": {
      "estimated_monthly_views": 0,
      "monthly_usd": 0,
      "reasoning": "same formula with stated assumptions"
    },
    "at_100k_subs": {
      "estimated_monthly_views": 0,
      "monthly_usd": 0,
      "reasoning": "same formula with stated assumptions"
    }
  },
  
  "script_depth_targets": {
    "target_word_count": 18000,
    "vocabulary_level": "intermediate|advanced|expert",
    "explanation_depth": "surface|moderate|deep|expert",
    "reasoning": "based on competitor scripting depth analysis — what level is needed to differentiate"
  },
  
  "topics_to_avoid": ["saturated_topic1", "saturated_topic2", "..."],
  
  "recommended_topics": [
    {
      "topic": "specific topic idea — concrete enough to be a video title",
      "angle": "unique approach that differentiates from competitors",
      "demand": "high|medium|low",
      "demand_evidence": "what data supports this demand level",
      "suggested_title_formula": "How [X] Actually [Y]: The [Z] Nobody Talks About",
      "target_keyword": "primary search keyword for this topic",
      "content_pillar": "which of the 5 pillars this belongs to"
    }
  ],
  
  "audience_demographics": "specific description of likely audience based on comment analysis and content type",
  "audience_size_estimate": "small|medium|large|very_large",
  "audience_size_reasoning": "what data supports this estimate"
}
```

---

## Score Computation (Authoritative — overrides Claude's output)

```javascript
// Claude outputs: monetization_score, audience_demand_score, 
// competition_gap_score, entry_ease_score
// Claude does NOT output viability_score — we compute it here.

const clamp = (v) => Math.max(0, Math.min(100, v));

const monetization = clamp(parsed.monetization_score);
const demand = clamp(parsed.audience_demand_score);
const gap = clamp(parsed.competition_gap_score);
const ease = clamp(parsed.entry_ease_score);

const viability_score = Math.round(
  monetization * 0.30 +
  demand * 0.25 +
  gap * 0.25 +
  ease * 0.20
);

// Verdict mapping (overrides Claude's verdict if score disagrees):
let viability_verdict;
if (viability_score >= 75) viability_verdict = 'strong_opportunity';
else if (viability_score >= 50) viability_verdict = 'moderate_opportunity';
else if (viability_score >= 25) viability_verdict = 'weak_opportunity';
else viability_verdict = 'avoid';

// Store both Claude's reasoning and the computed score/verdict
// If Claude's verdict disagrees with the computed verdict, 
// log a warning but use the COMPUTED verdict as authoritative.
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
     ├── niche_viability_score (0-100, server-computed)
     ├── niche_viability_verdict (server-computed)
     ├── topics_to_avoid[] (saturated topics)
     ├── recommended_topics[] (with title formulas + keywords + pillars)
     ├── recommended_angle (differentiation)
     ├── revenue_projections (at 10K/50K/100K with stated assumptions)
     ├── script_depth_targets (word count, vocab, depth)
     ├── title_dna_patterns
     ├── thumbnail_dna_patterns
     └── channel_analysis_context (JSONB with all intelligence)
  → WF_TOPICS_GENERATE reads projects.* and injects:
     ├── Blue-ocean gaps → topic seeds (with demand evidence + longevity)
     ├── Topics to avoid → exclusion list
     ├── Comment gaps/pain points/questions → demand signals
     ├── Content pillars → topic organization
     ├── Title DNA → CTR optimization
     ├── Target keywords → SEO alignment
     └── Moat indicators → defensibility guidance
  → WF_SCRIPT_GENERATE reads projects.* and injects:
     ├── Channel positioning (recommended_angle) → script angle
     ├── Script depth targets → quality benchmark
     ├── Comment pain points → address in script
     ├── Content gaps → fill in script
     ├── Differentiation strategy → unique positioning
     └── Topics to avoid → exclusion
```
