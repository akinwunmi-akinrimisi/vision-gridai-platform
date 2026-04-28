# Project Creation Prompt — Vision GridAI Platform

**Workflow**: `WF_PROJECT_CREATE` (id `8KW1hiRklamduMzO`)
**Model**: `claude-sonnet-4-20250514`, max_tokens 16384, with `web_search_20250305` tool (max 10 uses)
**Stage**: Runs once when user clicks "Create Project" in CreateProjectModal
**Inputs**:
- `niche` (user-typed string, e.g. "Australian Superannuation")
- `description` (optional, may be enriched with analysis_context from `Fetch Analysis Context` node)
- `reference_analyses` (UUID[] of yt_video_analyses to seed from — passed through but only used to build `analysis_context` in description)

---

## A. Master Prompt (Niche Research call) — what the AI sees

> **Note on assembly**: The `description` is enriched by `Fetch Analysis Context` with truncated highlights from each `reference_analyses` row (one_line_summary + weaknesses + ten_x_strategy.recommended_angle, max 5 analyses, ~3 sections each).

```
Research the niche "${niche}" for a YouTube 2-hour documentary channel.${description ? ` Context: ${description}` : ''}

Using web search, perform:

1. COMPETITOR AUDIT: Find top 10 YouTube channels in this niche. For each: channel name, subscriber count (estimate), avg views, topics they cover repeatedly (RED OCEAN), content gaps they miss.

2. AUDIENCE PAIN POINTS: Search Reddit, Quora, and niche forums for: most upvoted questions/complaints, common frustrations with existing YouTube content, what people say is "missing".

3. KEYWORD GAPS: Find high-volume, low-competition keywords in this niche that existing channels underserve.

4. BLUE OCEAN ANALYSIS: Identify 5-8 content angles no top channel covers well. Define value curve gaps (where content is shallow/biased). Write a channel positioning statement.

5. NICHE PROFILE: Generate:
   - A dynamic system prompt (what expertise the AI scriptwriter should embody for this niche)
   - An expertise description (e.g., "Senior Credit Card Analyst and Data Journalist")
   - 3 playlist angles, each with a creative name and theme description
   - 10+ red-ocean topics to AVOID (oversaturated)
   - Primary audience psychographic profile

Return ONLY valid JSON (no markdown fences) with these exact keys:
{
  "competitor_analysis": { "channels": [...], "top_videos": [...], "gaps": [...] },
  "audience_pain_points": { "reddit": [...], "quora": [...], "forums": [...] },
  "keyword_research": { "high_volume": [...], "low_competition": [...], "trending": [...] },
  "blue_ocean_opportunities": { "unoccupied_angles": [...], "value_curve_gaps": [...], "positioning_statement": "..." },
  "expertise_profile": "...",
  "system_prompt": "...",
  "playlist_angles": [{ "name": "...", "theme": "..." }, ...],
  "red_ocean_topics": [...],
  "audience_psychographic": "..."
}
```

---

## B. Second Claude call — Dynamic Prompt Generator (`Build Prompt Body` → `Claude: Generate Prompts`)

After niche research returns, this call generates 2 per-project prompt templates and stores them in `prompt_configs`:

```
You are generating dynamic prompt templates for an AI video production platform. The niche is "{niche}".

Niche expertise profile: {expertise_profile_from_research}
Niche system prompt (abbreviated): {system_prompt_from_research_first_500_chars}

Generate 2 prompt templates as JSON. Each prompt must use {{variable}} placeholders.

The 2 prompts are:

1. visual_director — Assigns visual composition and image prompts to scenes. ALL scenes are static_image (no i2v/t2v). Focus on composition, lighting, mood, and style. Keep concise.

2. scene_segmenter — Splits script into ~170 scenes with narration, image_prompt, visual_type (always "static_image"), emotional_beat, chapter. Keep concise.

Return ONLY valid JSON (no markdown) as an array:
[{ "prompt_type": "visual_director", "prompt_text": "..." }, { "prompt_type": "scene_segmenter", "prompt_text": "..." }]

Concise prompts only. Under 400 words each.
```

Model: `claude-sonnet-4-20250514`, max_tokens 4096. No tools.

---

## C. Australia overlay status at this stage

⚠️ **The niche-research prompt does NOT inject country-specific blocks.** No `{country_compliance_block}` / `{country_terminology_block}` / `{country_calendar_context}` / `{country_demonetization_constraints}` substitution happens here. WF_COUNTRY_ROUTER doesn't intercept project creation.

This is **intentional design**: the niche-research call is meant to be country-neutral so it surfaces the broadest competitive landscape via web search. The AU specifics flow in **downstream** at:
- Topic generation (WF_TOPICS_GENERATE → WF_COUNTRY_ROUTER substitution into `topic_generator_master`)
- Script generation (WF_SCRIPT_PASS → same router substitutes into `script_pass1/2/3`)

If you want AU-specific filtering at niche-research time too (e.g., to weight AU channels in COMPETITOR AUDIT), say so — that would be a follow-up to add a country hint to this prompt.

---

## D. Verdict

✅ **Grandmaster lineage**: Intact — the original 5-step research structure (competitor audit, pain points, keywords, blue ocean, niche profile output) is unchanged. Same JSON contract: competitor_analysis / audience_pain_points / keyword_research / blue_ocean_opportunities / expertise_profile / system_prompt / playlist_angles / red_ocean_topics / audience_psychographic.

✅ **Reference-video flow**: The user's analysed video(s) are surfaced via the enriched description. With the 037 + workflow patch, `reference_analyses` is now also persisted on `projects` so it's available downstream at topic + script time (where it WILL be UNIONed into the rendered intelligence regardless of niche string).

⚠️ **Country blend at THIS stage**: None — by design (see C). If you want AU-aware research, that's a future enhancement.

---

## E. Reference yt_video_analyses (your project's seed)

**Video**: "Planning to Retire at 60–67? Watch This First" — SuperGuy
**ID**: `e25f4a2a-4100-4bff-8feb-3f0e33f221f4`
**niche_category**: `super_au`
**country_target**: `AU`
**status**: `complete`
**overall_score**: 6/10 (room to outperform)
**opportunity_scorecard.verdict**: STRONG_GO (composite 8.0/10)

When you create the project, pass `reference_analyses=['e25f4a2a-4100-4bff-8feb-3f0e33f221f4']`. The Niche Research prompt will receive a Context line like:
> Context: <your description>
> --- ANALYSIS ---
> Reference Video: "Planning to Retire at 60–67? Watch This First" (201,610 views)
> Summary: Competent but generic retirement explainer that ignores the 70% of Australians with low-moderate super balances
> Weaknesses: <5 weaknesses joined>
> Angle: Real retirement planning for the 80% of Australians with under $400K super — practical for typical balances
