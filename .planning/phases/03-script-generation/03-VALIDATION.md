---
phase: 3
slug: script-generation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.0 + @testing-library/react 16.1.0 |
| **Config file** | `dashboard/vite.config.js` (test block) |
| **Quick run command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-00-01 | 00 | 0 | SCPT-10 | unit | `cd dashboard && npx vitest run src/__tests__/ScriptReview.test.jsx -x` | ❌ W0 | ⬜ pending |
| 03-00-02 | 00 | 0 | SCPT-11,12 | unit | `cd dashboard && npx vitest run src/__tests__/ScriptActions.test.jsx -x` | ❌ W0 | ⬜ pending |
| 03-00-03 | 00 | 0 | SCPT-01 | unit | `cd dashboard && npx vitest run src/__tests__/ScriptGenerate.test.jsx -x` | ❌ W0 | ⬜ pending |
| 03-00-04 | 00 | 0 | SCPT-05 | unit | `cd dashboard && npx vitest run src/__tests__/ScriptReview.test.jsx -x` | ❌ W0 | ⬜ pending |
| 03-00-05 | 00 | 0 | SCPT-08 | unit | `cd dashboard && npx vitest run src/__tests__/ScriptReview.test.jsx -x` | ❌ W0 | ⬜ pending |
| 03-00-06 | 00 | 0 | SCPT-09 | unit | `cd dashboard && npx vitest run src/__tests__/useScenes.test.js -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/ScriptReview.test.jsx` — stubs for SCPT-10, SCPT-05, SCPT-08 (page render, scores, visual badges)
- [ ] `src/__tests__/ScriptActions.test.jsx` — stubs for SCPT-11, SCPT-12 (approve/reject/refine)
- [ ] `src/__tests__/ScriptGenerate.test.jsx` — stubs for SCPT-01 (generate button calls webhook)
- [ ] `src/__tests__/useScenes.test.js` — stubs for SCPT-09 (scenes hook)

*Existing test infrastructure from Phase 2 Wave 0 covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 3-pass generation orchestration | SCPT-02, SCPT-03, SCPT-04 | n8n workflow execution, not dashboard code | Deploy workflow, trigger via webhook, verify 3 passes complete in Supabase |
| Combined scoring + force-pass | SCPT-06, SCPT-07 | n8n workflow logic | Trigger generation, verify scoring in script_pass_scores JSONB, verify force-pass after 3 attempts |
| Visual type assignment by Claude | SCPT-08 (n8n side) | Claude agentic output | Verify scenes table has correct visual_type distribution after script approval |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
