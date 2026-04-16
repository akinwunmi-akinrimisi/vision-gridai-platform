# SOP 01 — Topic Generation + Gate 1

## Purpose
Generate 25 SEO-optimized topics with customer avatars, score each for outlier potential and SEO strength, then pause at Gate 1 for human review.

## Trigger
- Dashboard: user clicks "Generate Topics" on a project with status `ready_for_topics`
- Webhook: `POST /webhook/topics/generate` with `{ project_id }`

## Inputs
| Field | Source |
|-------|--------|
| `project_id` | dashboard |
| Dynamic prompts | `prompt_configs` table (topic_generator) |
| Niche profile | `niche_profiles` + `projects` table |
| Red ocean list | `projects.niche_red_ocean_topics` |

## Outputs
- 25 `topics` rows with `review_status = 'pending'`
- 25 `avatars` rows (10 data points each)
- Outlier scores on each topic (`topics.outlier_score`, `algorithm_momentum`)
- SEO scores on each topic (`topics.seo_score`, `seo_classification`, `primary_keyword`)

## Workflow Chain
```
WF_WEBHOOK_TOPICS_GENERATE → WF_TOPICS_GENERATE → WF_OUTLIER_SCORE → WF_SEO_SCORE
```

## Critical Rules
1. **Blue-ocean methodology** — topics use Four Actions Framework. Avoid all red-ocean topics listed in `projects.niche_red_ocean_topics`.
2. **3 playlist groups** — topics distribute across the 3 AI-generated playlist angles (roughly 8-9 per group).
3. **Each topic includes avatar** with 10 categories: name/age, occupation/income, life stage, pain point, spending profile, knowledge level, emotional driver, online hangouts, objection, dream outcome.
4. **Quality benchmarks** — 2 AM Test, Share Test, Rewatch Test applied during generation.
5. **Outlier scoring** (CF01) fires after generation. Scores algorithm-push potential 0-100 using YouTube search volume, competing video count, and freshness signals.
6. **SEO scoring** (CF02) fires after outlier. Scores search-pull potential 0-100 using keyword difficulty, search volume, and content gap analysis.
7. **Write each topic to Supabase immediately** — not in batch.
8. **All external API calls wrapped in WF_RETRY_WRAPPER.**

## GATE 1 — Topic Review (Pipeline Pauses)
Dashboard presents all 25 topics as cards with outlier/SEO scores. User actions:

| Action | Effect |
|--------|--------|
| Approve | `review_status = 'approved'` — enters production queue |
| Reject | `review_status = 'rejected'` — removed from pipeline |
| Refine | Opens text input. Claude regenerates that topic with instruction + all 24 other topics as context to avoid overlap. Stored in `refinement_history`. |
| Edit | Inline edit of title, hook, avatar fields |
| Approve All | Bulk approve |

**Refinement is expensive** (~$0.15/topic) because it includes all 24 other topics as context.

Pipeline pauses until at least 1 topic is approved.

## Error Handling
- Generation failure: retry once. If still fails, set `projects.status = 'topic_generation_failed'`.
- Outlier/SEO scoring failure: non-blocking. Topics proceed with null scores. Dashboard shows "Score unavailable."
- Partial generation (e.g., 20 of 25): save what succeeded, log warning, allow user to regenerate missing.

## n8n Workflows
- `WF_WEBHOOK_TOPICS_GENERATE.json` — auth + trigger
- `WF_TOPICS_GENERATE.json` — 25-topic generation
- `WF_TOPICS_ACTION.json` — approve/reject/refine handler
- `WF_OUTLIER_SCORE.json` — outlier intelligence scoring
- `WF_SEO_SCORE.json` — SEO scoring
