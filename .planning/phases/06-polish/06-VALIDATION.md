---
phase: 6
slug: polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.0 + @testing-library/react 16.1.0 |
| **Config file** | dashboard/vite.config.js (test block) |
| **Quick run command** | `cd dashboard && npx vitest run --reporter=verbose -- Settings` |
| **Full suite command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npx vitest run --reporter=verbose -- Settings`
- **After every plan wave:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-00-01 | 00 | 0 | OPS-03, OPS-04 | scaffolding | `cd dashboard && npx vitest run --reporter=verbose` | No W0 | pending |
| 06-01-01 | 01 | 1 | OPS-03 | unit | `cd dashboard && npx vitest run -- Settings.test` | No W0 | pending |
| 06-01-02 | 01 | 1 | OPS-03 | unit | `cd dashboard && npx vitest run -- Settings.test` | No W0 | pending |
| 06-02-01 | 02 | 2 | OPS-04 | unit | `cd dashboard && npx vitest run -- Settings.test` | No W0 | pending |
| 06-02-02 | 02 | 2 | OPS-04 | unit | `cd dashboard && npx vitest run -- Settings.test` | No W0 | pending |
| 06-03-01 | 03 | 2 | OPS-03, OPS-04 | manual | n8n workflow test | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/src/__tests__/Settings.test.jsx` — stubs for OPS-03 (config editing, save behavior) and OPS-04 (prompt display, editing, version history)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Settings webhook saves to Supabase projects table | OPS-03 | Requires live n8n + Supabase | POST to webhook, verify projects row updated |
| Prompt update webhook writes new version | OPS-04 | Requires live n8n + Supabase | POST to webhook, verify prompt_configs row |
| Regenerate All creates new prompt versions | OPS-04 | Requires live n8n + Claude API | Trigger regenerate, verify 7 new versions in DB |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
