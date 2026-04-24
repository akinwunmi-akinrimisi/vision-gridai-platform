# Where prompts live

Vision GridAI uses prompts in seven physical locations. The right one
depends on whether the prompt is **global** (same for every project),
**per-project** (regenerated when a project is created), or **per-call**
(assembled at runtime from the other two).

If you're hunting an "AI is doing the wrong thing" bug, this matrix tells
you which location to inspect first.

## The matrix

| Category | Stored in | Seeded by | Local reference | Edited via | Used by |
|---|---|---|---|---|---|
| **System prompts** (8 master prompts) | `system_prompts` table (DB) | `supabase/migrations/007_seed_system_prompts.sql` | — | Dashboard `PromptCard` (Settings) → `WF_WEBHOOK_SETTINGS` (`/webhook/prompts/regenerate`) | `WF_TOPICS_GENERATE`, `WF_SCRIPT_GENERATE`, `WF_SCRIPT_PASS`, `WF_VIDEO_METADATA` |
| **Project niche prompts** (system / topic / script / evaluator / visual director per project) | `prompt_configs` table (DB) | `WF_PROJECT_CREATE` (Phase A — AI-generated from niche research) | — | Dashboard `Settings → Prompts` per project | All script + topic workflows for that project |
| **Style DNA** (locked visual identity string) | `projects.style_dna` column | `WF_STYLE_DNA` (Phase A) — Claude generates from niche research | `image_creation_guidelines_prompts/REGISTER_*_IMAGE_PROMPTS.md` (per-register variants) | Dashboard `Settings → Style DNA` | `WF_IMAGE_GENERATION` (appended to **every** image prompt), `WF_THUMBNAIL_GENERATE` |
| **Composition prefix library** (8 prefixes) | `prompt_templates` table (DB), `template_type='composition'` | Seeded during Phase 1 build (per `GUIDE.md` Prompt 1.2) | `image_creation_guidelines_prompts/REGISTER_*_IMAGE_PROMPTS.md` | Not edited from dashboard — schema-level | `WF_IMAGE_GENERATION` (prefix selected per scene by `scenes.composition_prefix`) |
| **Universal negative prompt** | `prompt_templates` table, `template_type='negative'` | Seeded during Phase 1 build | — | Not edited from dashboard | Every Fal.ai call (`WF_IMAGE_GENERATION`, `WF_THUMBNAIL_GENERATE`, shorts visual workflows) |
| **Register-aware image prompts** (5 registers × variants) | Source-of-truth: markdown files | hand-curated | `image_creation_guidelines_prompts/REGISTER_01..05_IMAGE_PROMPTS.md` | Edit the markdown, then rerun the register seeder | `WF_SCENE_CLASSIFY` (selects register), `WF_IMAGE_GENERATION` (loads per-register prompts via `production_registers`) |
| **Inline workflow prompts** (one-shot prompts hard-coded in n8n nodes) | `workflows/*.json` Code nodes / HTTP body templates | Workflow author (manual) | each `workflows/WF_*.json` | n8n UI only | Whichever workflow owns the node |

## Per-call prompt assembly

The prompt that actually hits Anthropic / Fal.ai is **assembled** from
multiple locations at request time. Two examples:

### Image prompt (per scene)

```text
[composition_prefix from prompt_templates]
+ [scene.image_prompt narrative subject from scripts]
+ [project.style_dna]
+ [universal negative_prompt as Fal.ai negative_prompt field]
```

So a single image generation request reads from `prompt_templates` (×2),
`scenes`, and `projects` — four database accesses to assemble one
prompt. The intelligence renderer (migration 029) consolidates the
project-side reads into a single RPC call.

### Script prompt (per pass)

```text
[system_prompts.script_system_prompt]                       (global)
+ [prompt_configs.script_pass{1,2,3} for this project]      (per-project, niche-aware)
+ [render_project_intelligence(project_id, 'script')]       (RPC: 9 source tables)
+ [topic.seo_title + avatar fields]                         (per-topic)
+ [prior_pass_summary]                                      (passes 2 + 3 only)
```

The 029 RPC is the consolidation point. Before 029, each workflow
hand-assembled the intelligence block in a Code node, with ~5% coverage
of the available signal. After 029, all 4 consumers (`WF_SCRIPT_PASS`,
`WF_VIDEO_METADATA`, `WF_TOPICS_GENERATE`, `WF_SCRIPT_GENERATE`) get the
same answer for the same `project_id`.

## Where prompts are **not**

These look like they might hold prompts but don't:

- **`CLAUDE.md`** — project rules and routing for the human / Claude
  Code session. Contains zero runtime prompts.
- **`.env` / Docker env vars** — only API keys, URLs, JWT secrets, the
  dashboard bearer token. Never prompt text.
- **`directives/00..10-*.md`** — these are SOPs (per-stage runbooks)
  for **the team**, not runtime prompts. They describe what each
  workflow does and the contract it owns; the prompts those workflows
  send live in the DB or in the workflow JSON.
- **`Agent.md`, `GUIDE.md`, `Dashboard_Implementation_Plan.md`** —
  build-time documentation. They quote prompt text for reference but
  the executed prompts live in `system_prompts` / `prompt_configs`.
- **Source code in `dashboard/src/`** — the dashboard never talks to
  Anthropic directly; it triggers webhooks, and the webhook target
  reads its prompts from the DB.
- **Workflow JSONs as the source of truth for system prompts** — the
  JSONs reference `system_prompts.prompt_type` keys; the actual text
  lives in the DB row. Editing the JSON is *not* enough to change a
  system prompt.

## Editing prompts safely

The dashboard `PromptCard` UI is the supported editing surface for
**system prompts** and **per-project prompt_configs**. It writes the
new text + `version + 1` to the DB through `WF_WEBHOOK_SETTINGS`
(`/webhook/prompts/regenerate`), which keeps the old version
`is_active = false` for rollback.

Editing prompts **directly in the DB** (raw `UPDATE`) bypasses
versioning. Use it only when the dashboard is broken; document the
change in a `production_log` row.

For **inline workflow prompts**, edit the workflow JSON, push to git,
and re-import via n8n. There's no version trail — the git log is the
audit.

For **register markdowns**
(`image_creation_guidelines_prompts/REGISTER_*.md`), edit the markdown,
then re-run the register seeder. The
[Production Registers subsystem](../subsystems/registers.md) covers the
seed flow.

## Audit checks

- `tools/verify_prompt_sync.py` (added in migration 029) detects drift
  between hand-assembled intelligence blocks and the canonical RPC
  output. Runs in CI; failures block the merge.
- Migration 029's `_verify_script_template_vars()` SQL function checks
  that every variable a script prompt references is supplied by the
  RPC. Add a new variable to a prompt without adding it to the RPC —
  CI red.

If a prompt change ships and the AI output regresses, look here first
before suspecting model drift:

1. Did `system_prompts.is_active` flip to a different version?
2. Did `prompt_configs` for that project regenerate (`PromptCard`
   "Reset")?
3. Did a new register markdown roll out without a re-seed?
4. Did a workflow JSON inline prompt change in git history?
