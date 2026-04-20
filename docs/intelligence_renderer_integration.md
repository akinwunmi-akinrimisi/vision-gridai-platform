# Intelligence Renderer — Workflow Integration Guide

Migrations `028_intelligence_renderer.sql` + `029_intelligence_renderer_v2.sql`
are live. This document is the authoritative reference for the
`render_project_intelligence(project_id, stage)` RPC and the safeguards that
prevent intelligence from ever dropping between the data layer and Claude.

## Why this exists

Prior to migration 028, every downstream workflow hand-assembled an
"intelligence block" from cached project columns. Each assembly was imperative
(pick fields A, B, C by name), so any new intelligence column added upstream
was silently dropped until someone manually audited every consumer. We fixed
this class of bug four times (`0cb601a`, `7ef85e9`, `b6eae76`, `7d10bae`) and
it kept returning.

Shape C solution: one PL/pgSQL function renders all intelligence into
stage-appropriate markdown. A coverage check fails any migration deploy
that adds a new column on one of the source tables without updating the
renderer — or explicitly whitelisting the column as operational-only.

## v2 coverage (9 source tables)

Migration 028 covered 3 tables. Migration 029 extended the renderer and the
coverage check to cover **all 9 intelligence-bearing tables** in the project
schema, and added a SQL-side template-variable verifier. Residual drift risks
are closed.

| Source table | How it's reached | What the renderer emits |
|---|---|---|
| `projects` | by `id` | niche, niche_description, channel_style, expertise profile, blue-ocean strategy, pain-point sources, red-ocean topics, known competitor channels |
| `niche_viability_reports` | by `analysis_group_id`, latest row | viability score + all 4 sub-scores + per-sub-score reasoning, ad_category, sponsorship_potential + reasoning, RPM estimates, revenue projections @ 10k/50k/100k subs, audience_size + reasoning, audience_demographics, engagement_benchmarks, posting cadence, recommended_angle, differentiation_strategy, content_pillars, moat_indicators, blue_ocean_opportunities, saturated_topics, topics_to_avoid, recommended_topics (with angle/title_formula/demand_evidence), script_depth_targets, title_dna_patterns, thumbnail_dna_patterns, defensibility_assessment |
| `channel_analyses` | by `analysis_group_id`, all completed rows | per-channel: verdict + reasoning, target_audience, content_style, scripting_depth, strengths, weaknesses, comment_insights (content_gaps, pain_points, requested_topics, top_questions, viral_comment_themes, competitor_mentions, audience_sentiment), title_patterns (formulas, power_words, emotional_triggers, opening_words, stats), thumbnail_patterns, top_videos, content_saturation_map, blue_ocean_opportunities, primary_topics, posting_schedule, growth_trajectory |
| `niche_profiles` (NEW) | by `project_id`, latest row | blue_ocean_opportunities (positioning_statement, unoccupied_angles, value_curve_gaps), competitor_analysis (channels, top_videos, gaps), audience_pain_points (reddit, quora, forums), keyword_research (high_volume, low_competition, trending), search_queries_used |
| `yt_video_analyses` (NEW) | by `niche_category = projects.niche` text match, top 10 by views, status=complete | per-video: overall_score, one_line_summary, strengths, weaknesses, content_quality (depth_score, missing_topics, unique_insights, accuracy_concerns), ten_x_strategy (recommended_angle, suggested_title, opening_hook_suggestion, target_duration, key_differentiators), comment_insights (topic_opportunities with suggested_video_title, requests, complaints, top_questions, sentiment_summary) |
| `research_runs` (NEW) | by `project_id`, latest complete | niche_input, time_range, platforms scanned, derived_keywords, total_results, total_categories |
| `research_categories` (NEW) | by latest `run_id` | all rows ordered by rank: label, summary, total_engagement, result_count, AI-suggested video title per cluster |
| `research_results` (NEW) | by latest `run_id`, top 25 by engagement | per-item: source, engagement_score, upvotes, comments, shares, raw_text, ai_video_title, metadata (subreddit, author) |
| `audience_insights` (NEW) | by `project_id`, latest `week_of`, script stage only | audience_context_block (preferred pre-packaged), else audience_persona_summary + dominant_persona_traits + vocabulary_level + assumed_prior_knowledge + recurring_questions + content_complaints + topic_suggestions + frequent_objections + weekly counts |

## The contract

```
POST https://supabase.operscale.cloud/rest/v1/rpc/render_project_intelligence
Headers:
  apikey: $SUPABASE_ANON_KEY
  Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY
  Content-Type: application/json
Body: {"p_project_id":"<uuid>","p_stage":"topics|script|metadata|all"}
Response: JSON-encoded string (markdown). Size scales with project data —
         empty projects ~1KB, fully-loaded projects ~40-80KB.
```

## Drop-in fetch snippet for n8n Code nodes

Already integrated in every relevant Code node. Reference for future consumers:

```javascript
let renderedIntelligence = '';
try {
  const intelRes = await fetch(`${$env.SUPABASE_URL}/rest/v1/rpc/render_project_intelligence`, {
    method: 'POST',
    headers: {
      apikey: $env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${$env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_project_id: projectId, p_stage: 'topics' /* or script|metadata */ })
  });
  if (intelRes.ok) renderedIntelligence = await intelRes.json();
} catch (_) {}

// Prepend to the Claude user prompt:
const userPrompt = renderedIntelligence + '\n\n---\n\n' + existingUserPrompt;
```

## Current consumers

| Consumer | Node | Stage | What else it passes |
|---|---|---|---|
| `WF_TOPICS_GENERATE` (`J5NTvfweZRiKJ9fG`) | `Build Prompt` | `topics` | masterPrompt (Grand Master Topic Generator v3), analysisPayload (§2 JSON contract), existingTitles |
| `WF_SCRIPT_PASS` (`CRC9USwaGgk7x6xN`) | `Generate With Retry` | `script` | System prompt + Pass 1/2/3 templates (Grand Master Script Generator v1) with 12 topic-row variables filled via `v` dict, word-count requirement prefix |
| `WF_VIDEO_METADATA` (`k0F6KAtkn74PEIDl`) | `Generate Metadata` | `metadata` | base SEO-builder prompt filled with title/hook/segments/playlists |
| `WF_SCRIPT_GENERATE.Prep & Read Avatar` (`DzugaN9GtVpTznvs`) | — | — | Pass-through only. After migration 029 it no longer assembles `research_brief` (RPC covers all 4 tables it queried). Passes `research_brief: ''` for backward compat. |

## Three safeguards that keep intelligence from dropping

1. **Coverage check** (`_intelligence_coverage_check()`) runs at the end of
   migration 029. It scans every column on all 9 source tables and fails the
   migration deploy if any column isn't either referenced in the renderer or
   on the explicit operational whitelist. Adding a new intelligence column =
   must update the renderer. **Guaranteed.**

2. **Template variable verifier** (`_verify_script_template_vars()`) scans
   `system_prompts.prompt_text` for every `{placeholder}` token and returns
   which ones are in the caller-supplied known-vars set. Run after any
   prompt edit to catch new placeholders the workflow variable-fill dict
   hasn't been updated to cover. Example invocation:

   ```sql
   SELECT * FROM _verify_script_template_vars(ARRAY[
     'subtopic', 'niche_category', 'target_audience_segment', 'audience_avatar',
     'psychographics', 'key_emotional_drivers', 'viewer_search_intent',
     'core_domain_framework', 'primary_problem_trigger', 'content_angle_blue_ocean',
     'video_style_structure', 'practical_takeaways',
     'PASS_1_OUTPUT', 'PASS_1_SUMMARY', 'PASS_2_SUMMARY', 'CHARACTER_NAME',
     'PASS_NUMBER', 'WORD_TARGET_FOR_THIS_PASS', 'ATTEMPT_NUMBER', 'PASS_OUTPUT',
     'COMPOSITE_SCORE', 'FAILURES_LIST', 'RETRY_GUIDANCE_FROM_EVALUATOR',
     'WORD_COUNT_ESTIMATE', 'ORIGINAL_PASS_PROMPT',
     'LIST_OF_METAPHORS_USED_IN_PASSES_1_AND_2',
     'LIST_OF_NOTABLE_PHRASES_FROM_PASSES_1_AND_2'
   ]);
   ```

   Any `is_known = false` row = a placeholder that needs either a fill
   handler in `WF_SCRIPT_PASS.Generate With Retry` or a pattern-based
   regex replace already present in that node. Note: the verifier uses an
   exact-match regex `\{([A-Za-z_][A-Za-z0-9_\-]*)\}` — placeholders with
   spaces or dashes inside (e.g., `{1-sentence description}`) are not
   surfaced; those are handled by the workflow's own regex fill patterns.

3. **Prompt checksum verifier** (`tools/verify_prompt_sync.py`) detects drift
   between local Grand Master `.md` design docs and the DB rows in
   `system_prompts` + `prompt_configs` that Claude actually executes. Any
   change to either side — DB edit or file edit — is flagged until an
   operator explicitly runs `update` and commits the new snapshot.

   ```bash
   # Verify (CI-friendly; exits non-zero on drift)
   python tools/verify_prompt_sync.py

   # Accept changes (after intentional edit)
   python tools/verify_prompt_sync.py update
   git add tools/prompt_snapshot.expected.txt
   git commit -m "chore(prompts): sync prompt snapshot"
   ```

## Verification procedure

After any prompt-adjacent change:

1. Run `tools/verify_prompt_sync.py` — fails on drift.
2. Apply migration (if schema changes) — coverage check fails on drift.
3. Trigger a test execution against a known-good project:
   - `4bdfbbe3-2a9c-4532-95e9-41a743e8c253` (NotSoDistantFuture, 1 channel analysis + 1 viability report)
   - `75eb2712-ef3e-47b7-b8db-5be3740233ff` (US Credit Cards, 1 niche_profile + 12 research_runs)
4. Inspect execution trace for the Claude-calling node.
5. Confirm the `userPrompt` contains `# CHANNEL INTELLIGENCE (stage=<stage>)`
   and the relevant ## section headers for data that exists on that project.
6. Confirm Claude's output references fields only the RPC could have injected
   (e.g., `ten_x_strategy.recommended_angle`, per-channel `verdict_reasoning`,
   niche profile `positioning_statement`, research cluster suggested titles).

## What NOT to change

- `WF_CREATE_PROJECT_FROM_ANALYSIS` (`jU9VEw5SaKEHjvUn`) — bridge workflow.
  The renderer reads the source tables directly (channel_analyses +
  niche_viability_reports), so the bridge just needs to seed the `projects`
  row with `analysis_group_id`. Don't couple intelligence to the cached
  project columns.

- Cached aggregate columns on `projects` (`channel_analysis_context`,
  `script_reference_data`, `niche_viability_score`, `niche_viability_verdict`,
  `topics_to_avoid`, `recommended_topics`, `title_dna_patterns`,
  `thumbnail_dna_patterns`, `revenue_projections`, `recommended_angle`,
  `script_depth_targets`) — intentionally whitelisted OUT of the renderer to
  avoid stale-cache bugs. Dashboard reads them for speed; Claude reads source
  tables for correctness.

## When to add a new intelligence source

1. Add the column/table at DB level.
2. Update `render_project_intelligence()` in a new migration (030+) — render
   the new field in the appropriate stage sections.
3. Update `_intelligence_coverage_check()`'s table list + whitelist.
4. Run the migration. If coverage check fails, the migration won't apply —
   fix the renderer before anything else.
5. Run `tools/verify_prompt_sync.py` to snapshot any prompt-template edits.
6. No workflow changes required — consumers will pick up the new content
   automatically on next invocation because they all call the same RPC.
