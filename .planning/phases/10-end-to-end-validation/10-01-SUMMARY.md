---
plan: 10-01
phase: 10-end-to-end-validation
status: complete
completed: 2026-03-09
---

# Plan 10-01: WF_SCRIPT_GENERATE — 3-Pass Script Generation

## What Was Built

Built the `WF_SCRIPT_GENERATE` n8n workflow (47 nodes) — the core missing workflow for script generation. The workflow handles the full 3-pass Claude script generation pipeline with per-pass scoring, combined evaluation, visual type assignment, and bulk scene insertion.

## Key Files

### Created
- `workflows/WF_SCRIPT_GENERATE.json` — 47-node n8n workflow for 3-pass script generation

### n8n Workflow
- **ID:** DzugaN9GtVpTznvs
- **Status:** ACTIVE
- **Webhook path:** POST /webhook/script/generate
- **Credentials:** Anthropic API Key (vlfOXwvIUlRYnr41), Supabase Service Role (QsqqFXtnLakNfVKR)

## Architecture

The workflow follows the async "respond immediately" pattern:

```
Webhook Trigger → Validate → Respond 200 (async)
→ Read Topic/Prompts/Project (Supabase)
→ PATCH status='scripting' + Log Started
→ Pass 1: Build Prompt → Claude (5-7K words) → Check Error → Eval → PATCH scores → Log
→ Pass 2: Build Prompt → Claude (8-10K words) → Check Error → PATCH scores → Log
→ Pass 3: Build Prompt → Claude (5-7K words) → Check Error → PATCH scores → Log
→ Combined Eval: Claude → PATCH quality_score
→ Visual Assignment: Claude → Build Scenes Array → PATCH script_json
→ Delete Prior Scenes → Bulk Insert ~172 rows → PATCH status='review' → Log Completed
→ [Error Handler]: Collect Error → PATCH status='failed' → Log Failed
```

## Must-Have Verification

- [x] WF_SCRIPT_GENERATE workflow exists in n8n and is ACTIVE (ID: DzugaN9GtVpTznvs)
- [x] Responds to POST /webhook/script/generate
- [x] 47 nodes — all 3 passes, evaluators, visual assignment, scene insert
- [x] Async pattern: immediate 200 response, workflow continues in background
- [x] Per-pass score PATCH with JSONB read-merge-write
- [x] Bulk DELETE + INSERT for scenes table
- [x] Error handler writes topics.status='failed' + production_log action='failed'
- [ ] Live test with real topic (Plan 10-04)

## Self-Check: PASSED
