# Session note — 2026-04-18 — Cost Calculator gate wiring + Visual Assignment fix

## Context

Topic `2967980a` ("What Happened to the Family Kitchen?") got stuck after generating all 3 script passes cleanly (7.1 / 9.0 / 9.2 → combined 8.4, 19,049 words). The parent WF_SCRIPT_GENERATE errored at "Build Scenes Array" with an Anthropic 400 response from the `Claude: Visual Assignment` HTTP Request node:

```
Visual Assignment failed: 400 — {"type":"invalid_request_error","message":"model: Field required"}
```

The topic remained in `status=scripting` with no scenes inserted — a $1.80 script sitting orphaned.

## Root cause

The `Claude: Visual Assignment` node was configured with `parameters.specifyBody="string"` plus both `jsonBody` and `body` fields holding the same ~134KB expression. In n8n HTTP Request v4.x, `"string"` mode evaluates the `body` expression at runtime — and with a 100KB+ templated body containing the full 19K-word script, the expression silently evaluates to empty. Anthropic then rightly rejects the request with "model: Field required."

WF_SCRIPT_PASS (which also calls Claude with long prompts) does NOT hit this because it uses a Code node with native `fetch()` rather than an HTTP Request node — entirely different body-handling path.

## Fixes applied (n8n — persisted server-side, not in git)

### 1. `WF_SCRIPT_GENERATE` (`DzugaN9GtVpTznvs`) — `Claude: Visual Assignment` node

Replaced `parameters` wholesale via MCP `updateNode`:

- Removed `parameters.body` (redundant with `jsonBody`)
- Set `parameters.contentType="json"` + `parameters.specifyBody="json"`
- Kept existing `parameters.jsonBody` expression

### 2. `WF_SCRIPT_APPROVE` (`qRsX9Ec7DWxqJiaS`) — Cost Calculator gate now wired

Before this session, Gate 2 approval skipped the Cost Calculator entirely — `Patch Topic Approved → Trigger Production → /webhook/production/trigger` fired TTS immediately with every scene defaulted to `visual_type='static_image'`.

Patched:

- `Patch Topic Approved.parameters.jsonBody` now sets `pipeline_stage: 'cost_selection'` alongside `status='script_approved'` and `script_review_status='approved'`.
- Connection rewired via `rewireConnection`: `Patch Topic Approved` now points to `Log Approved`, bypassing the (now dead) `Trigger Production` node.

### 3. `WF_SCENE_CLASSIFY` (`WaPnGhyhQO2gDemX`) — `Update Pipeline Stage` node

WF_SCENE_CLASSIFY previously set `pipeline_stage='tts'` and stopped, assuming the dashboard or another watcher would resume production. Nothing did.

Extended the Code node's `jsCode` to additionally POST `/webhook/production/trigger` with `{topic_id}` after the `pipeline_stage` PATCH succeeds. Uses `$env.N8N_WEBHOOK_BASE` + `$env.DASHBOARD_API_TOKEN`.

## New end-to-end flow

1. Script generation → Gate 2 (`status=review`)
2. User clicks Approve → `WF_SCRIPT_APPROVE` sets `pipeline_stage='cost_selection'` (pipeline pauses)
3. Production Monitor shows `CostCalculator.jsx` with four ratio options:

   | Ratio | Images | I2V Clips | Media total (for 161 scenes) |
   |-------|--------|-----------|------------------------------|
   | 100 / 0 | 161 | 0 | **$6.44** |
   | 95 / 5 | 161 | 8 | **$25.79** |
   | 90 / 10 | 161 | 16 | **$45.14** |
   | 85 / 15 | 161 | 24 | **$64.50** |

4. User picks a ratio → dashboard POSTs `/webhook/scene-classify`
5. `WF_SCENE_CLASSIFY` flips X% of scenes to `visual_type='i2v'`, sets `pipeline_stage='tts'`, POSTs `/webhook/production/trigger`
6. TTS → images → Ken Burns → captions → assembly

## Resume script used for the stuck topic

`/tmp/resume_visual.js` inside the `n8n-n8n-1` container (inherits env vars). Reproduces the downstream steps of WF_SCRIPT_GENERATE from "Build Visual Prompt" onward using the existing `topic.script_json` — NO pass regeneration. Result: 161 scenes inserted, topic flipped to `status=review`, scene_count=161, 100% word preservation. Scratch artifact only; not committed.

## Permanent rule for future HTTP Request nodes

For any `n8n-nodes-base.httpRequest` v4.x node that sends a large JSON body (AI prompts, script chunks, anything >~100KB):

- **Use** `sendBody: true` + `contentType: "json"` + `specifyBody: "json"` + `jsonBody` expression
- **Never** use `specifyBody: "string"` with a `body` expression — the evaluator silently drops large results
- The MCP validator blocks `body` coexisting with `specifyBody="json"` — use `updateNode` with a full `parameters` replacement to transition cleanly

Saved to memory as `feedback_n8n_http_body_large_payload.md`.
