---
phase: 09-ai-agent-workflows
plan: 01
subsystem: n8n-workflow
tags: [workflow, idempotency, error-handling, production-log, timeout]
dependency_graph:
  requires: [08-05]
  provides: [hardened-wf-project-create]
  affects: [supabase-production-log, supabase-projects, supabase-prompt-configs]
tech_stack:
  added: []
  patterns: [onError-continueRegularOutput, IF-branch-error-routing, idempotency-check-before-insert, production-log-lifecycle]
key_files:
  created: []
  modified:
    - workflows/WF_PROJECT_CREATE.json
decisions:
  - id: atomic-workflow-update
    summary: Tasks 1 and 2 implemented atomically in single PUT since they modify the same workflow JSON and are tightly coupled
  - id: inline-error-handling
    summary: Used onError=continueRegularOutput + Check Error Code + IF branch pattern rather than n8n global error trigger for deterministic error routing
  - id: idempotency-by-niche-profile-check
    summary: Idempotency guard reads niche_profiles table for project_id; existence means skip Claude web search, only re-generate prompts with version increment
metrics:
  duration: 7m
  completed_date: "2026-03-09"
  tasks_completed: 2
  files_modified: 1
requirements_satisfied: [AGNT-01, AGNT-02, AGNT-03, AGNT-07, AGNT-08]
---

# Phase 09 Plan 01: WF_PROJECT_CREATE Hardening Summary

**One-liner:** Hardened WF_PROJECT_CREATE with 600s timeout, idempotency guard (skip-research if niche_profile exists), production_log lifecycle entries, and inline error routing to PATCH projects.status=research_failed on both Claude call failures.

## What Was Built

WF_PROJECT_CREATE (n8n ID: 8KW1hiRklamduMzO) was updated from 14 nodes to 30 nodes. Key changes:

### Timeout Fix (AGNT-01)
- `Claude: Niche Research` timeout: 120000ms -> 600000ms
- `Claude: Generate Prompts` timeout: 120000ms -> 600000ms

### Idempotency Guard (AGNT-02, AGNT-03)
New nodes inserted after `Log Started`:
1. **Check Niche Profile** — GET niche_profiles?project_id=eq.{id}&select=id
2. **Idempotency Check** (Code) — sets skip_research=true if array.length > 0
3. **IF Skip Research** — routes true branch to re-trigger path, false to fresh research

**Fresh research path** (skip_research=false):
- Status → Researching → Claude: Niche Research → Check Research Error → IF Research Error → Parse Research Response → INSERT Niche Profile + UPDATE Project (Research) → Claude: Generate Prompts

**Re-trigger path** (skip_research=true):
- Get Prompt Version → Deactivate Old Prompts (PATCH is_active=false) → Compute Next Version (MAX+1) → Read Project for Prompts → Merge Re-trigger Data → Claude: Generate Prompts

Both paths converge at `Claude: Generate Prompts`.

### Production Log Lifecycle (AGNT-07)
- **Log Started** — POST production_log action=started, fires after Extract Project ID
- **Log Completed** — POST production_log action=completed, fires after Status → Ready for Topics
- **Log Failed** — POST production_log action=failed, fires after Error → Research Failed

### Error Handler Connections (AGNT-08)
Both Claude HTTP Request nodes have `onError: continueRegularOutput`. Downstream error detection:

**Research error path:**
Claude: Niche Research → Check Research Error (Code) → IF Research Error → [true] Error → Research Failed + Log Failed | [false] Parse Research Response

**Prompts error path:**
Claude: Generate Prompts → Check Prompts Error (Code) → IF Prompts Error → [true] Error → Research Failed + Log Failed | [false] Parse Prompts + TOPC-02 Check

Both error branches write `projects.status='research_failed'` and `projects.error_log=<error_message>`.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1+2 | 66f58f6 | feat(09-01): add idempotency guard, production_log, and error handlers to WF_PROJECT_CREATE |

## Verification

All 15 checks passed on local JSON and against live deployed workflow:
- PASS: idempotency check node present
- PASS: IF Skip Research node present
- PASS: timeout=600000 on research node
- PASS: Log Started, Log Completed, Log Failed present
- PASS: Check Research Error, Check Prompts Error present
- PASS: IF Research Error connects to error handler
- PASS: IF Prompts Error connects to error handler
- PASS: true branch routes to Get Prompt Version (re-trigger)
- PASS: false branch routes to Status Researching (fresh)
- PASS: Deactivate Old Prompts, Get Prompt Version present
- PASS: Both Claude nodes have onError=continueRegularOutput
- PASS: Error handler writes research_failed
- PASS: Total 30 nodes
- PASS: Workflow active=true in n8n

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed redundant error throw in Parse Research Response**
- **Found during:** Task 1
- **Issue:** Parse Research Response Code node had `if (response.error) throw new Error(...)` — this caused n8n execution to halt without reaching the error handler. Since we now use Check Research Error + IF Research Error upstream, this throw was removed so the node never runs on error input.
- **Fix:** Removed the early error throw from Parse Research Response; error detection is now exclusively in Check Research Error Code node.
- **Files modified:** workflows/WF_PROJECT_CREATE.json
- **Commit:** 66f58f6

**2. [Deviation] Tasks 1 and 2 implemented atomically**
- **Reason:** Both tasks modify the same workflow JSON file and must be deployed as a single PUT to n8n. Splitting into two PUT requests would cause intermediate states where error handlers exist without the idempotency guard (or vice versa). Implemented both atomically in one deployment.
- **Impact:** Single commit covers both task requirements. All done criteria for both tasks are satisfied.

## Self-Check

**Checking created files:**
- workflows/WF_PROJECT_CREATE.json: FOUND (42,145 bytes)

**Checking commits:**
- 66f58f6: feat(09-01): add idempotency guard, production_log, and error handlers to WF_PROJECT_CREATE

## Self-Check: PASSED
