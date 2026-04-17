#!/usr/bin/env python3
"""Deploy optimized prompts to WF_CHANNEL_ANALYZE and WF_NICHE_VIABILITY."""
import json, sys

mode = sys.argv[1]  # 'channel' or 'viability'
wf = json.load(sys.stdin)

if mode == 'channel':
    # === Update Claude Deep Analysis node ===
    SYSTEM_PROMPT = """You are an elite YouTube channel strategist and competitive intelligence analyst.

CORE RULES:
1. Every claim you make MUST cite specific evidence from the data provided. When you say "this channel is strong at X," reference the specific video(s) or metric(s) that prove it. No unsupported assertions.
2. You can ONLY analyze what is in the data. Do not infer revenue, CTR, audience retention, or any metric not explicitly provided. If you need data you don't have, say "insufficient data" for that field.
3. Thumbnail analysis is INFERENCE ONLY based on content type, titles, and niche conventions. You have not seen the actual thumbnails unless images are attached. Label this section clearly as inferred.
4. Scores must follow the rubric provided. Do not inflate or deflate. A score of 80+ should be rare and reserved for genuinely exceptional signals.
5. Blue-ocean opportunities must be SPECIFIC and ACTIONABLE — not "make better content" but "cover [specific topic] from [specific angle] because [specific evidence from the data]."
6. Return ONLY valid JSON. No markdown, no backticks wrapping the JSON, no commentary before or after. The first character of your response must be {."""

    for n in wf['nodes']:
        if n['name'] == 'Claude Deep Analysis':
            code = n['parameters']['jsCode']

            # Replace old system prompt
            old_sys = "You are an elite YouTube channel strategist with deep expertise in content analysis, audience psychology, and competitive positioning. You analyze channels with surgical precision, identifying exactly what works, what fails, and where the blue-ocean opportunities are. Be specific and data-driven. No generic advice."
            code = code.replace('`' + old_sys + '`', json.dumps(SYSTEM_PROMPT))
            if old_sys in code:
                code = code.replace(old_sys, SYSTEM_PROMPT.replace('\n', '\\n'))

            # Replace user prompt - find the template literal and update
            # Add analysis instructions before "Return ONLY valid JSON"
            old_return = 'Return ONLY valid JSON with these exact fields:'
            new_instructions = """ANALYSIS INSTRUCTIONS:

For primary_topics: Cluster the video titles into 5-10 distinct topic groups. Name each group specifically (not "general finance" but "credit card annual fee comparisons").

For title_patterns: Analyze ALL titles, not just the top 20. Count actual percentages.

For content_saturation_map: A topic is "oversaturated" if 4+ of the top 20 videos cover it. "moderate" if 2-3 cover it. "underserved" if 0-1 cover it. Count from the actual data.

For blue_ocean_opportunities: Identify at least 5. Each must reference a specific gap visible in the data. Include an estimated_demand level and a confidence level for each.

For strengths and weaknesses: Provide 3-5 of each. Every strength must cite a specific video or metric. Every weakness must identify what is missing with a specific reference.

VERDICT SCORING RUBRIC:
- 80-100: Exceptional opportunity. Multiple underserved high-demand topics. Weak competition. Growing niche.
- 60-79: Good opportunity. Several gaps exist. Competition is present but beatable with differentiation.
- 40-59: Moderate opportunity. Some gaps but competition is strong. Requires significant differentiation.
- 20-39: Weak opportunity. Few gaps. Strong entrenched competition. Niche may be declining.
- 0-19: Avoid. No meaningful gaps. Dominant incumbents. Declining niche.

EDGE CASES:
- If the channel has fewer than 20 videos, note "limited data" in verdict_reasoning.
- If growth_trajectory is "dormant," factor this heavily — a dormant competitor is an opportunity.

Return ONLY valid JSON with these exact fields:"""

            code = code.replace(old_return, new_instructions)

            # Update the JSON schema to include new fields
            old_opportunity = '"blue_ocean_opportunities": [\n    {"opportunity": "description", "rationale": "why this is underserved", "difficulty": "easy/medium/hard"}'
            new_opportunity = '"blue_ocean_opportunities": [\n    {"opportunity": "specific topic", "rationale": "evidence from the data", "difficulty": "easy/medium/hard", "estimated_demand": "high/medium/low", "confidence": "high/medium/low", "suggested_first_video": "concrete title idea"}'
            code = code.replace(old_opportunity, new_opportunity)

            old_saturation = '"content_saturation_map": [\n    {"topic": "topic name", "saturation": "oversaturated/moderate/underserved", "video_count_seen": 5}'
            new_saturation = '"content_saturation_map": [\n    {"topic": "topic name", "saturation": "oversaturated/moderate/underserved", "video_count_seen": 5, "evidence": "which videos cover this"}'
            code = code.replace(old_saturation, new_saturation)

            # Add new fields to thumbnail_patterns
            code = code.replace(
                '"brand_consistency": "high/medium/low"\n  }',
                '"brand_consistency": "high/medium/low",\n    "analysis_note": "Inferred from content type and titles only"\n  }'
            )

            # Add evidence requirement to strengths
            code = code.replace(
                '"strengths": ["strength1", "strength2", "strength3"]',
                '"strengths": ["Specific strength with evidence — cite video or metric"]'
            )
            code = code.replace(
                '"weaknesses": ["weakness1", "weakness2", "weakness3"]',
                '"weaknesses": ["Specific weakness with evidence — cite what is missing"]'
            )

            n['parameters']['jsCode'] = code
            print('Updated Claude Deep Analysis with optimized prompt', file=sys.stderr)
            break

    # === Update Comment Mining node ===
    COMMENT_SYSTEM = "You are a YouTube audience analyst. You extract actionable intelligence from comment sections — not sentiment fluff, but specific content gaps, unmet needs, and demand signals. Deduplicate similar comments into single insights. Prioritize comments with high like counts as stronger signals. Return ONLY valid JSON. No markdown, no backticks. First character must be {."

    for n in wf['nodes']:
        if n['name'] == 'Fetch & Analyze Comments':
            code = n['parameters']['jsCode']

            # Replace the simple comment prompt with structured one
            old_prompt_start = "var prompt = 'Analyze these '"
            if old_prompt_start not in code:
                # Try the other format
                old_extract = "'Analyze these ' + allComments.length + ' YouTube comments"
                if old_extract in code:
                    # Replace entire prompt construction
                    code = code.replace(
                        "'Analyze these ' + allComments.length + ' YouTube comments from a channel about \"' + topicStr + '\".",
                        "'You are a YouTube audience analyst extracting actionable intelligence from comments. Deduplicate similar comments. Prioritize high-like comments.\\n\\nAnalyze these ' + allComments.length + ' YouTube comments from a channel about \"' + topicStr + '\"."
                    )

            # Replace the JSON schema in the prompt
            old_schema = '"content_gaps": ["topics viewers request that this channel does not cover"]'
            new_schema = '"content_gaps": [{"gap": "specific topic", "signal_strength": "strong/moderate/weak", "evidence": "~N commenters across M videos"}]'
            code = code.replace(old_schema, new_schema)

            old_pain = '"pain_points": ["frustrations or complaints viewers express"]'
            new_pain = '"pain_points": [{"pain_point": "specific frustration", "frequency": "how often seen", "severity": "high/medium/low"}]'
            code = code.replace(old_pain, new_pain)

            old_comp = '"competitor_mentions": ["other channels or creators viewers mention"]'
            new_comp = '"competitor_mentions": [{"name": "channel name", "context": "why mentioned", "mention_count": 1}]'
            code = code.replace(old_comp, new_comp)

            old_req = '"requested_topics": ["specific video ideas viewers ask for"]'
            new_req = '"requested_topics": [{"topic": "specific idea", "demand_evidence": "how many requested"}]'
            code = code.replace(old_req, new_req)

            old_q = '"top_questions": ["most common questions in comments"]'
            new_q = '"top_questions": [{"question": "the question", "frequency": "how often asked"}]'
            code = code.replace(old_q, new_q)

            old_viral = '"viral_comment_themes": ["themes in the highest-liked comments"]'
            new_viral = '"viral_comment_themes": [{"theme": "what resonates", "example_comment": "highest-liked example", "like_count": 0}]'
            code = code.replace(old_viral, new_viral)

            # Add data_quality_note field
            if 'data_quality_note' not in code:
                code = code.replace(
                    '"viral_comment_themes"',
                    '"data_quality_note": "assessment of comment quality — sparse/generic/rich/engaged",\n  "viral_comment_themes"'
                )

            n['parameters']['jsCode'] = code
            print('Updated Fetch & Analyze Comments with optimized prompt', file=sys.stderr)
            break

elif mode == 'viability':
    # === Update Claude Viability Analysis node ===
    SYSTEM_PROMPT = """You are a YouTube niche viability analyst who makes investment-grade assessments. You evaluate whether a niche is worth committing production budget to — not as a casual opinion, but as a structured financial and strategic decision.

CORE RULES:
1. Every score MUST be justified by specific data points from the input. "Monetization is high because finance niches typically have high CPM" is NOT acceptable. Cite specific channels, videos, or metrics.
2. Cross-reference comment intelligence against video data. If comments request topic X, verify whether any analyzed channel already covers it.
3. Do NOT compute viability_score — the server calculates it from your 4 sub-scores using a fixed formula. Omit viability_score from your output.
4. Blue-ocean opportunities must be SPECIFIC enough to become video titles.
5. All arrays must meet minimum counts. If you cannot find enough, explain why rather than padding with filler.
6. Return ONLY valid JSON. No markdown, no backticks. First character must be {.

SCORING RUBRICS:

monetization_score:
  90-100: Premium ad category (finance, B2B SaaS, insurance, legal). RPM $25+.
  70-89:  Strong ad category (tech, business, health). RPM $15-$25.
  50-69:  Average ad category (education, lifestyle, food). RPM $5-$15.
  30-49:  Below-average (entertainment, gaming, general). RPM $2-$5.
  0-29:   Poor (kids content, music, memes). RPM <$2.

audience_demand_score:
  90-100: Outlier videos consistently hit 5x+ median. Multiple channels growing. Comments actively request more.
  70-89:  Strong outliers exist. Niche is growing. Demand signals clear.
  50-69:  Some outliers. Niche is stable. Demand present but not urgent.
  30-49:  Few outliers. Niche is mature or flat.
  0-29:   No outliers. Niche declining.

competition_gap_score:
  90-100: Massive gaps. Channels cover <50% of viable topics. Comment-derived gaps numerous.
  70-89:  Clear gaps. 3+ blue-ocean topics with strong demand.
  50-69:  Some gaps but competition covers most high-value topics.
  30-49:  Few gaps. Differentiation requires significant innovation.
  0-29:   No meaningful gaps.

entry_ease_score (100 = easiest, 0 = hardest):
  90-100: Low production bar. No expertise required.
  70-89:  Moderate production needs. Some expertise helps.
  50-69:  Significant production quality needed.
  30-49:  High bar. Expensive to produce.
  0-29:   Extremely difficult. Deep expertise and existing audience required.

SPARSE DATA: If only 1-2 channels analyzed, downgrade confidence and note it."""

    for n in wf['nodes']:
        if n['name'] == 'Claude Viability Analysis':
            code = n['parameters']['jsCode']

            # Replace old system prompt
            old_sys = "You are a YouTube niche viability analyst. You assess whether a niche is worth entering based on monetization potential, audience demand, competition gaps, and entry difficulty. You score each factor 0-100 and provide a weighted total. You also identify defensible moat opportunities. Be specific, data-driven, and brutally honest. No generic advice."
            code = code.replace(old_sys, SYSTEM_PROMPT.replace('"', '\\"').replace('\n', '\\n'))
            # Also try with backtick format
            code = code.replace('`' + old_sys + '`', json.dumps(SYSTEM_PROMPT))

            # Add instructions before "Return ONLY valid JSON"
            old_return = 'Return ONLY valid JSON with these exact fields:'
            new_instructions = """INSTRUCTIONS:
- Use the scoring rubrics from the system prompt. Do not invent your own scale.
- Cite specific channels, videos, or metrics when justifying scores.
- For blue_ocean_opportunities: provide 5-8. Each must cite evidence. Assess longevity (evergreen vs trending).
- For recommended_topics: provide 5-10 concrete topic ideas with target keywords and content pillar alignment.
- For revenue_projections: state RPM assumption and show calculation (views/month x RPM / 1000).
- For moat_indicators: identify 3-5 defensible advantages. "Consistent uploads" is NOT a moat.
- Do NOT include viability_score — server computes it.
- Cross-reference comment requests against saturation map before recommending.

Return ONLY valid JSON:"""
            code = code.replace(old_return, new_instructions)

            # Replace entry_difficulty_score with entry_ease_score in the JSON schema
            code = code.replace('"entry_difficulty_score"', '"entry_ease_score"')
            code = code.replace('"entry_difficulty_reasoning"', '"entry_ease_reasoning"')

            # Add longevity to blue-ocean opportunities
            code = code.replace(
                '"moat_defensibility": "high|medium|low"',
                '"moat_defensibility": "high|medium|low",\n      "longevity": "evergreen|trending_6mo|trending_12mo|seasonal",\n      "confidence": "high|medium|low"'
            )

            # Add build_time to moat_indicators
            code = code.replace(
                '"reasoning": "..."\n    }',
                '"reasoning": "...",\n      "build_time": "time to establish"\n    }'
            )

            # Add rpm_assumption to revenue_projections
            if 'rpm_assumption' not in code:
                code = code.replace(
                    '"at_10k_subs"',
                    '"rpm_assumption": 0.0,\n    "rpm_assumption_basis": "why this RPM",\n    "at_10k_subs"'
                )

            # Add estimated_monthly_views to each tier
            code = code.replace(
                '"at_10k_subs": { "monthly_usd": 500, "reasoning": "..." }',
                '"at_10k_subs": { "estimated_monthly_views": 0, "monthly_usd": 500, "reasoning": "views x RPM / 1000" }'
            )
            code = code.replace(
                '"at_50k_subs": { "monthly_usd": 3000, "reasoning": "..." }',
                '"at_50k_subs": { "estimated_monthly_views": 0, "monthly_usd": 3000, "reasoning": "views x RPM / 1000" }'
            )
            code = code.replace(
                '"at_100k_subs": { "monthly_usd": 8000, "reasoning": "..." }',
                '"at_100k_subs": { "estimated_monthly_views": 0, "monthly_usd": 8000, "reasoning": "views x RPM / 1000" }'
            )

            # Add demand_evidence and content_pillar to recommended_topics
            code = code.replace(
                '"suggested_title_formula": "..."',
                '"suggested_title_formula": "...",\n      "target_keyword": "primary search keyword",\n      "content_pillar": "which pillar",\n      "demand_evidence": "what data supports this"'
            )

            # Add sponsorship_reasoning
            if 'sponsorship_reasoning' not in code:
                code = code.replace(
                    '"sponsorship_potential": "high|medium|low|none"',
                    '"sponsorship_potential": "high|medium|low|none",\n  "sponsorship_reasoning": "what types of sponsors"'
                )

            # Add audience_size_reasoning
            if 'audience_size_reasoning' not in code:
                code = code.replace(
                    '"audience_size_estimate": "small|medium|large|very_large"',
                    '"audience_size_estimate": "small|medium|large|very_large",\n  "audience_size_reasoning": "what data supports this"'
                )

            n['parameters']['jsCode'] = code
            print('Updated Claude Viability Analysis with optimized prompt', file=sys.stderr)
            break

    # === Update Compute Final Score to use entry_ease_score ===
    for n in wf['nodes']:
        if n['name'] == 'Compute Final Score':
            code = n['parameters']['jsCode']
            code = code.replace('entry_difficulty_score', 'entry_ease_score')
            n['parameters']['jsCode'] = code
            print('Updated Compute Final Score: entry_difficulty -> entry_ease', file=sys.stderr)
            break

    # === Update Write Report to use entry_ease_score ===
    for n in wf['nodes']:
        if n['name'] == 'Write Report':
            code = n['parameters']['jsCode']
            code = code.replace('entry_difficulty_score', 'entry_ease_score')
            code = code.replace('entry_difficulty_breakdown', 'entry_ease_breakdown')
            n['parameters']['jsCode'] = code
            print('Updated Write Report: entry_difficulty -> entry_ease', file=sys.stderr)
            break

# Output clean workflow
clean = {'name': wf['name'], 'nodes': wf['nodes'], 'connections': wf['connections']}
s = {}
for k in ['executionOrder', 'callerPolicy', 'executionTimeout']:
    if k in wf.get('settings', {}):
        s[k] = wf['settings'][k]
if s:
    clean['settings'] = s

json.dump(clean, sys.stdout)
