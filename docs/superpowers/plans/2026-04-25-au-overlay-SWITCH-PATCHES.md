# AU Overlay — Switch-Node Patches for 6 Existing Workflows

**Companion to:** `2026-04-25-au-overlay.md` Phase 2.6
**Purpose:** Per-workflow surgical edit instructions to make existing General workflows country-aware. **No full workflow rewrites** — each is a 1-3 node insertion.

The pattern is identical for every patch:

1. After the project lookup (or topic lookup if the workflow operates on topics), insert a **Resolve Prompt** node that calls `WF_COUNTRY_ROUTER` via Execute Workflow.
2. Wire the `prompt_text` output through an existing Anthropic call node by replacing the hardcoded `system` parameter with `={{ $('Resolve Prompt').first().json.prompt_text }}`.
3. The Switch logic is internal to `WF_COUNTRY_ROUTER` — workflows themselves don't need a Switch node, just a swap of where the prompt text comes from.

**Universal rollback:** revert the patched node's `system`/`prompt` parameter to the prior hardcoded value. Each patch is one parameter change per workflow.

---

## Patch 1 — `WF_TOPICS_GENERATE`

**n8n ID:** *not in MEMORY's table — confirm via n8n UI*
**Webhook:** `/webhook/topics/generate`
**Effect:** Topic-generator master prompt now picks up the 4 country slot variables (auto-populated for AU projects, empty for General).

### Insertion point

Locate the existing "Build Topic Prompt" node (Code node that constructs the user message). **No change to that node.** Locate the Anthropic HTTP Request node immediately downstream (look for `https://api.anthropic.com/v1/messages`).

### Node insertion

Insert a single new node *between* the project-lookup HTTP Request node and the Anthropic call:

| Field | Value |
|---|---|
| Type | `n8n-nodes-base.executeWorkflow` |
| Name | `Resolve Prompt (Country Router)` |
| Workflow ID | `={{ $env.WF_COUNTRY_ROUTER_ID }}` (env var set in `docker-compose.override.yml`) |
| Inputs | `{ workflow_name: "WF_TOPICS_GENERATE", country_target: "{{ $json.country_target }}", prompt_stage: "topic_master" }` |

### Anthropic node parameter swap

In the Anthropic HTTP Request node, change `system` parameter:

**Before:**
```text
"You are a YouTube topic strategist…" (hardcoded)
```

**After:**
```text
={{ $('Resolve Prompt (Country Router)').first().json.prompt_text }}
```

That's the entire patch. The same `topic_generator_master` prompt is used for all countries; the country slot variables (filled by `render_project_intelligence`) are what differentiates AU from General.

### Verification

```bash
curl -X POST https://n8n.srv1297445.hstgr.cloud/webhook/topics/generate \
  -H "Authorization: Bearer $DASHBOARD_API_TOKEN" \
  -d '{"project_id":"<au_hub_id>"}'
```

Then:

```sql
SELECT topic_number, niche_variant, country_target FROM topics
WHERE project_id = '<au_hub_id>' ORDER BY created_at DESC LIMIT 25;
```

Expected: 25 rows with `country_target = 'AU'`, `niche_variant` populated with one of the 5 AU values.

---

## Patch 2 — `WF_SCRIPT_PASS`

**n8n ID:** `CRC9USwaGgk7x6xN`
**Trigger:** Execute Workflow Trigger (called by `WF_SCRIPT_GENERATE`)
**Effect:** Each of the 3 passes + evaluator + retry + metadata-extractor calls now receives the country-aware prompt text.

### Insertion points

`WF_SCRIPT_PASS` has 5 internal Anthropic calls (one per stage). Each gets a Resolve Prompt sibling. Use a **single Resolve Prompt node** at the top of the workflow that runs once per execution and pre-fetches all 5 prompt texts into a `prompt_map`:

```js
// In a Code node placed right after the trigger
const inputs = $input.first().json;
const country = inputs.country_target || 'GENERAL';

return [{ json: {
  ...inputs,
  pass1_prompt: null,  // Will populate via Execute Workflow calls below
  pass2_prompt: null,
  pass3_prompt: null,
  evaluator_prompt: null,
  retry_prompt: null,
  metadata_extractor_prompt: null
}}];
```

Then 5 Execute Workflow calls in parallel (one per stage), each calling `WF_COUNTRY_ROUTER` with `prompt_stage` = `pass1`/`pass2`/`pass3`/`evaluator`/`retry`/`metadata_extractor`.

A Merge node combines them into a single `prompt_map` object.

Each downstream Anthropic node's `system` parameter changes to:

```text
={{ $('Resolve Prompts').first().json.prompt_map.pass1_prompt }}
```

(or `.pass2_prompt`, etc.)

### Verification

After the patch, generate a script for an AU topic:

```sql
SELECT
  topic_id,
  jsonb_array_length(script_json->'scenes') AS scene_count,
  script_quality_score
FROM topics
WHERE country_target = 'AU' AND script_review_status = 'approved'
ORDER BY updated_at DESC LIMIT 1;
```

Expected: `scene_count` ≈ 140-180; AU disclaimer scenes present (search `script_json->>'narration' LIKE '%general information only%'`).

---

## Patch 3 — `WF_REGISTER_ANALYZE`

**n8n ID:** `Miy5h5O7ncIIrnRg`
**Webhook:** `/webhook/register/analyze`
**Effect:** AU topics get the sub-niche addendum appended to the existing classifier prompt.

### Insertion point

After the existing project + topic fetch, insert:

| Node | Type | Notes |
|---|---|---|
| `Resolve AU Addendum` | `n8n-nodes-base.executeWorkflow` | Calls `WF_COUNTRY_ROUTER` with stage = `register_classify` (returns `register_classify_au_addendum` for AU, returns null for General) |
| `Build Final Prompt` | `n8n-nodes-base.code` | Concatenates: existing prompt + (au_addendum if AU else '') |

### Code node: `Build Final Prompt`

```js
const basePrompt = $('Existing Prompt Builder').first().json.prompt_text;
const country = $('Get Topic').first().json.country_target;
const addendum = $('Resolve AU Addendum').first().json.prompt_text;

const finalPrompt = country === 'AU' && addendum
  ? basePrompt + '\n\n' + addendum
  : basePrompt;

return [{ json: { prompt_text: finalPrompt } }];
```

The downstream Anthropic node uses `={{ $('Build Final Prompt').first().json.prompt_text }}` for `system`.

### Verification

```sql
SELECT id, niche_variant, register_recommendations
FROM topics WHERE country_target='AU' ORDER BY created_at DESC LIMIT 5;
```

Expected: `niche_variant` is one of the 5 AU values (not `'primary'`); `register_recommendations.top_2[0].register_id` is set.

---

## Patch 4 — `WF_VIDEO_METADATA`

**n8n ID:** `k0F6KAtkn74PEIDl`
**Trigger:** chained from `WF_CAPTIONS_ASSEMBLY`
**Effect:** AU videos generate title + description + tags via AU-specific prompts.

### Insertion point

Three separate prompt resolutions (title / description / tags). Either three Execute Workflow calls or a single one with a stage parameter list — recommend three separate for clarity.

| Node | Stage param value | Effect for AU |
|---|---|---|
| `Resolve Title Prompt` | `title` | Returns `seo_title_au` for AU, `seo_title` for General (or current hardcoded text) |
| `Resolve Description Prompt` | `description` | Returns `seo_desc_au` for AU |
| `Resolve Tags Prompt` | `tags` | Returns `seo_tags_au` for AU |

Each downstream Anthropic node's `system` is updated identically.

### Verification

For an AU video:

```sql
SELECT id, seo_title, length(yt_description) AS desc_chars, jsonb_array_length(yt_tags) AS tag_count
FROM topics WHERE country_target='AU' AND assembly_status='completed' LIMIT 1;
```

Expected: title 50-70 chars; description 1500-2500 chars; tag_count 12-20.

---

## Patch 5 — `WF_THUMBNAIL_GENERATE`

**n8n ID:** `7GqpEAug8hxxU7f6`
**Trigger:** chained from `WF_CAPTIONS_ASSEMBLY`
**Effect:** AU thumbnail concept + Seedream prompt use AU-specific prompts.

### Insertion point

Same pattern as Patch 4. Two Resolve Prompt calls (concept stage + prompt stage).

For v1 launch: AU returns single concept (no A/B). When Feature N4 ships, swap the AU concept stage to return 3 variants.

### Verification

```sql
SELECT id, thumbnail_url FROM topics
WHERE country_target='AU' AND assembly_status='completed' LIMIT 1;
```

Plus visual confirm in Drive that the thumbnail honors AU brand cues (no US currency, no foreign building, AU-specific aesthetic per Strategy §11.1 Style DNA).

---

## Patch 6 — `WF_ANALYTICS_CRON`

**Trigger:** daily cron
**Effect:** Adds a per-AU-topic retention analysis after the standard metrics pull.

### Insertion point

Inside the loop over published topics, after the YouTube Analytics fetch, add an If branch on `country_target = 'AU'`. Inside the AU branch:

| Node | Purpose |
|---|---|
| `Resolve retention_analyze_au` | Execute Workflow → `WF_COUNTRY_ROUTER` with stage=`retention` |
| `Call Claude (Retention)` | Anthropic Sonnet call with the resolved prompt + retention_curve + script_scenes |
| `Update topic.next_video_directives` | PATCH topics with the retention analysis result |

### Verification

```sql
SELECT id, seo_title, next_video_directives
FROM topics
WHERE country_target='AU' AND published_at < NOW() - interval '7 days'
  AND next_video_directives IS NOT NULL
ORDER BY published_at DESC LIMIT 3;
```

Expected: `next_video_directives` populated 7+ days post-publish with retention diagnoses + recommendations.

---

## Universal smoke test (after all 6 patches)

Verify a single full pipeline run for an AU topic:

```sql
-- 1. Topic with all AU intelligence flowing
SELECT id, seo_title, niche_variant, gap_score, production_register, country_target,
       script_quality_score,
       (script_json->'scenes'->0->>'narration') AS hook_scene,
       compliance_review_status, demonetization_audit_result->>'overall_decision' AS audit_decision
FROM topics
WHERE country_target='AU' AND status='published'
ORDER BY published_at DESC LIMIT 1;
```

Expected fields populated: `niche_variant` is one of the 5 AU values; `gap_score` is numeric; `production_register` is one of the 5 register IDs; `script_quality_score` ≥ 7.0; `compliance_review_status = 'approved'`; `audit_decision = 'clear'`.

---

## Rollback per patch

Every patch is a single Execute Workflow node insertion + one parameter swap. To roll back any individual patch:

1. Revert the Anthropic node's `system` parameter to its prior hardcoded value (export-import the prior workflow JSON or edit in n8n UI).
2. Optionally remove the Resolve Prompt node (cosmetic — orphan nodes don't fire).

The country router itself stays — disabling it has no effect since unmodified workflows don't call it.
