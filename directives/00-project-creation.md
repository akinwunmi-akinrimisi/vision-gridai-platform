# SOP 00 — Project Creation + Niche Research

## Purpose
Create a new project, run niche research via web search, classify RPM tier, generate dynamic prompts, and seed the database for topic generation.

## Trigger
- Dashboard: user clicks "New Project" and submits niche name + description
- Webhook: `POST /webhook/project/create`

## Inputs
| Field | Required | Source |
|-------|----------|--------|
| `name` | yes | user input |
| `niche` | yes | user input |
| `niche_description` | no | user input |
| `target_video_count` | no | default 25 |

## Outputs
- `projects` row with status `ready_for_topics`
- `niche_profiles` row with research data
- `prompt_configs` rows (system prompt, topic generator, script pass 1/2/3, evaluator, visual director)
- Google Drive root + assets folders created
- RPM classification stored in `projects.niche_rpm_category`, `estimated_rpm_low/mid/high`

## Workflow Chain
```
WF_WEBHOOK_PROJECT_CREATE → WF_PROJECT_CREATE → WF_RPM_CLASSIFY
```

## Critical Rules
1. **Never hardcode niche content.** All prompts are AI-generated from the niche input and stored in `prompt_configs`.
2. **RPM classification runs immediately** after niche research. Uses the `rpm_benchmarks` lookup table to map niche category to RPM range (e.g., Finance $25-$50, Tech $15-$30).
3. **Dynamic prompt generation** produces 7 prompt types: `system_prompt`, `topic_generator`, `script_pass1`, `script_pass2`, `script_pass3`, `evaluator`, `visual_director`.
4. **Style DNA** is generated once and stored in `projects.style_dna`. It is locked for the project lifetime.
5. **All API calls use WF_RETRY_WRAPPER** (exponential backoff 1s->2s->4s->8s, max 4 attempts).
6. **Write to Supabase after every step** — project row, niche profile, each prompt config.

## Error Handling
- Web search failure: retry 3x, then proceed with reduced research (skip that source).
- RPM lookup miss: default to "General" category ($8-$15 range). Log warning.
- Prompt generation failure: block pipeline, set `projects.status = 'research_failed'`.
- Drive folder creation failure: retry via WF_RETRY_WRAPPER. If still fails, proceed without Drive (manual setup needed).

## Supabase Writes
```
INSERT projects (status='created')
INSERT niche_profiles
UPDATE projects SET niche_system_prompt, playlist angles, rpm fields, status='ready_for_topics'
INSERT prompt_configs (7 rows)
```

## n8n Workflows
- `WF_WEBHOOK_PROJECT_CREATE.json` — auth + validation
- `WF_PROJECT_CREATE.json` — niche research + prompt generation
- `WF_RPM_CLASSIFY.json` — RPM tier classification
