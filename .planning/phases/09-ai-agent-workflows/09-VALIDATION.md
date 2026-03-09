---
phase: 9
slug: ai-agent-workflows
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-03-09
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^2.1.0 |
| **Config file** | `dashboard/vite.config.js` (inlined test config) |
| **Quick run command** | `cd dashboard && npm test -- --reporter=verbose --run` |
| **Full suite command** | `cd dashboard && npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npm test -- --reporter=verbose --run 2>&1 | tail -20`
- **After every plan wave:** Run `cd dashboard && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | AGNT-01 | manual | SSH to VPS, trigger workflow, check timeout in n8n execution logs | N/A | ⬜ pending |
| 9-01-02 | 01 | 1 | AGNT-09 | manual | Check n8n execution input JSON for Claude call — system field = niche_system_prompt | N/A | ⬜ pending |
| 9-01-03 | 01 | 1 | AGNT-06 | manual | Trigger WF_TOPICS_GENERATE twice; second call returns `topics_exist:true` | N/A | ⬜ pending |
| 9-02-01 | 02 | 1 | AGNT-08 | manual | Trigger with bad API key; check projects.status = research_failed | N/A | ⬜ pending |
| 9-02-02 | 02 | 1 | AGNT-07 | manual | Check ProductionMonitor in browser — production_log entries appear | N/A | ⬜ pending |
| 9-03-01 | 03 | 2 | AGNT-02 | manual | Check Supabase niche_profiles table after research run | N/A | ⬜ pending |
| 9-03-02 | 03 | 2 | AGNT-03 | manual | Re-trigger research; prompt_configs rows get version incremented, is_active toggled | N/A | ⬜ pending |
| 9-03-03 | 03 | 2 | AGNT-04 | manual | Check topics + avatars count = 25 each after generation | N/A | ⬜ pending |
| 9-04-01 | 04 | 2 | AGNT-05 | unit | `cd dashboard && npm test -- --run TopicActions` | ✅ exists | ⬜ pending |
| 9-04-02 | 04 | 2 | DASH-01 | unit | `cd dashboard && npm test -- --run TopicActions` | ✅ exists | ⬜ pending |
| 9-04-03 | 04 | 2 | DASH-01 | unit | `cd dashboard && npm test -- --run TopicReview` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `dashboard/src/__tests__/TopicActions.test.jsx` — Add/fix stubs for DASH-01 inline edit mode (file exists; Task 1 of Plan 09-04 replaces RED stubs with real assertions)
- [x] `dashboard/src/__tests__/ProjectsHome.test.jsx` — Add test for `research_failed` retry button visibility (covered in Plan 09-04 Task 1)
- [x] `dashboard/src/__tests__/TopicReview.test.jsx` — Add/fix stubs for AGNT-06 dashboard confirm dialog and DASH-01 edit-no-SidePanel (covered in Plan 09-04 Task 1)

*Wave 0 installs no new framework — Vitest already configured in dashboard/vite.config.js*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude research call uses 600s timeout | AGNT-01 | n8n workflow config; no unit test infrastructure for workflow JSON | SSH to VPS, trigger WF_PROJECT_CREATE, check execution timeout setting in n8n execution logs |
| niche_profiles row created after research | AGNT-02 | n8n workflow; Supabase write verified by checking DB | Check Supabase: `SELECT count(*) FROM niche_profiles WHERE project_id = '{id}'` after E2E run |
| prompt_configs rows versioned on re-trigger | AGNT-03 | n8n workflow; version tracking in DB | Re-trigger research; check `SELECT version, is_active FROM prompt_configs ORDER BY version DESC` |
| 25 topics + 25 avatars inserted | AGNT-04 | n8n workflow; count verified in DB | `SELECT count(*) FROM topics WHERE project_id=...` and `SELECT count(*) FROM avatars WHERE project_id=...` |
| Refine reads all 24 other topics | AGNT-05 | Already confirmed working in Phase 8 | No action needed |
| Error handlers write research_failed status | AGNT-08 | n8n error path; requires triggering actual failure | Trigger WF_PROJECT_CREATE with invalid Anthropic API key; check `projects.status = 'research_failed'` |
| system param = niche_system_prompt | AGNT-09 | n8n node config; verified by reading execution payload | Check n8n execution input for WF_TOPICS_GENERATE Claude API call node |
| production_log entries appear in Production Monitor | AGNT-07 | Realtime subscription; requires browser + live workflow run | Run research/generate flow; watch ProductionMonitor page for entries appearing in real-time |
| topics_exist confirm dialog re-sends with force=true | DASH-01 | End-to-end confirm flow; requires live WF_TOPICS_GENERATE returning topics_exist:true | Trigger topic generation twice; second time verify browser shows confirm dialog; click confirm; verify new topics appear in Supabase |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
