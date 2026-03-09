---
phase: 09-ai-agent-workflows
plan: "02"
subsystem: n8n-workflows
tags: [idempotency, error-handling, system-prompt-fix, production-log, topic-generation]
dependency_graph:
  requires: []
  provides: [hardened-topic-generation, idempotency-guard, error-handlers, production-log-entries]
  affects: [WF_TOPICS_GENERATE, dashboard-production-monitor]
tech_stack:
  added: []
  patterns:
    - idempotency-check-before-insert (Check Existing Topics + Idempotency Guard + IF Early Return)
    - continueRegularOutput + Check Error Code node (Claude API error handler)
    - production_log entries at start/complete/fail lifecycle points
    - existingTitles dedup injection in Claude user message
key_files:
  created: []
  modified:
    - workflows/WF_TOPICS_GENERATE.json
decisions:
  - "Check Existing Topics runs after Read Project (serial, not parallel) so Idempotency Guard has project status available via $('Read Project').first()"
  - "Idempotency Guard uses $input for existing topics count and $('Read Project') by name reference for project status — standard n8n pattern"
  - "Both IF node branches (true=early return, false=generate) use index 0 and 1 respectively in connections array"
  - "Parse Topics substring call is intentional JSON extraction; the bug was prompt.substring(0,500) in jsonBody system param"
  - "Log Started fires in parallel with Read Project via fan-out from Validate (fire-and-forget)"
  - "n8n API key: full JWT from user_api_keys table with audience=public-api (short ID: ADyreGvv5lhNECh5)"
metrics:
  duration: "~18 minutes"
  completed: "2026-03-09"
  tasks_completed: 2
  files_modified: 1
---

# Phase 9 Plan 02: WF_TOPICS_GENERATE Hardening Summary

WF_TOPICS_GENERATE hardened with idempotency guard, system prompt fix, dedup context injection, production_log lifecycle entries, and Claude API error handler — deployed and active on n8n (ID: J5NTvfweZRiKJ9fG).

## What Was Built

### AGNT-09 Fix: System Prompt (Task 1)
The `wf-tg-anthropic` node's `jsonBody` `system` parameter was changed from:
```
$('Build Prompt').first().json.prompt.substring(0, 500)
```
to:
```
$('Read Project').first().json[0].niche_system_prompt
```
This eliminates the 500-character truncation and uses the full niche-specific system prompt generated during Phase A research.

### AGNT-06: Idempotency Guard (Task 1)
Three new nodes inserted after `Read Project`/`Read Prompt Config` and before `Status → Generating`:

1. **Check Existing Topics** (HTTP GET): fetches `topic_number, seo_title, narrative_hook` for the project ordered by `topic_number.asc`
2. **Idempotency Guard** (Code node): evaluates existing count + force flag + project status to determine:
   - `__early_return: true` when count > 0 and force != true
   - `startTopicNumber`, `topicsNeeded` for additive batches
   - `isCrashResume` detection (force=true + status=generating_topics)
   - `existingTitles` array for dedup context
3. **IF Early Return** (IF node): routes to `Respond Topics Exist` (true branch) or continues to generation (false branch)
4. **Respond Topics Exist** (Respond to Webhook): returns `{ topics_exist: true, count: N }` HTTP 200

### AGNT-04: Dedup Context Injection (Task 1)
`Build Prompt` node updated to:
- Accept `startTopicNumber`, `topicsNeeded`, `existingTitles` from `Idempotency Guard`
- Append `IMPORTANT: Generate exactly N topics. Start numbering from topic_number X.` to prompt
- Append `EXISTING TOPICS — avoid overlap with these: [...]` when existingTitles.length > 0

### AGNT-07: production_log Entries (Task 2)
Three new HTTP POST nodes:
- **Log Started**: fires via fan-out from `Validate` (parallel to reads), records `action: started`
- **Log Completed**: fires after `Status → Topics Pending`, records `action: completed` with topics_inserted + avatars_inserted counts
- **Log Generation Failed**: fires on error branch after `IF Generation Error`, records `action: failed` with error message

### AGNT-08: Error Handler (Task 2)
Claude API failure path:
- `wf-tg-anthropic` already had `onError: continueRegularOutput`
- **Check Claude Error** (Code node): inspects response for `response.error` or `response.type === 'error'`, returns `{ isError: true, error_message, project_id }` or `{ ...response, isError: false }`
- **IF Generation Error** (IF node): routes error branch to `PATCH Generation Failed` + `Log Generation Failed`
- **PATCH Generation Failed**: patches project `status: generating_failed` and `error_log: error_message`

## Workflow Node Map (23 nodes total)

```
Webhook Trigger
  └─ Validate
       ├─ Log Started (fire-and-forget)
       ├─ Read Project ─────────────────────┐
       └─ Read Prompt Config ───────────────┤
                                            └─ Check Existing Topics
                                                  └─ Idempotency Guard
                                                        └─ IF Early Return
                                                              ├─ [true]  Respond Topics Exist
                                                              └─ [false] Respond (immediate) + Status → Generating
                                                                              └─ Build Prompt
                                                                                    └─ Claude: Generate Topics
                                                                                          └─ Check Claude Error
                                                                                                └─ IF Generation Error
                                                                                                      ├─ [error]  PATCH Generation Failed + Log Generation Failed
                                                                                                      └─ [ok]     Parse Topics
                                                                                                                        └─ INSERT Topics
                                                                                                                              └─ Map Avatars
                                                                                                                                    └─ INSERT Avatars
                                                                                                                                          └─ Status → Topics Pending
                                                                                                                                                └─ Log Completed
```

## Deviations from Plan

None — plan executed exactly as written. Both tasks implemented as a combined single JSON modification and deployed in one PUT operation.

## Verification Results

```
active: True
node_count: 23
missing_nodes: none
has_niche_system_prompt: True
has_substring_bug: False
```

## Self-Check

All required nodes confirmed present in live deployed workflow:
- Check Existing Topics: FOUND
- Idempotency Guard: FOUND
- IF Early Return: FOUND
- Respond Topics Exist: FOUND
- Log Started: FOUND
- Log Completed: FOUND
- Log Generation Failed: FOUND
- Check Claude Error: FOUND
- IF Generation Error: FOUND
- PATCH Generation Failed: FOUND

Workflow active on n8n: CONFIRMED (active: True)

## Self-Check: PASSED
