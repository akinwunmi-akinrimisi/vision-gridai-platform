---
phase: 2
slug: niche-research-topics
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1+ with @testing-library/react 16.1+ |
| **Config file** | dashboard/vite.config.js (vitest inline config) |
| **Quick run command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | NICH-01 | unit | `cd dashboard && npx vitest run src/__tests__/CreateProjectModal.test.jsx -x` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | NICH-07 | unit | `cd dashboard && npx vitest run src/__tests__/ProjectsHome.test.jsx -x` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | TOPC-05 | unit | `cd dashboard && npx vitest run src/__tests__/TopicReview.test.jsx -x` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | TOPC-06 | unit | `cd dashboard && npx vitest run src/__tests__/TopicActions.test.jsx -x` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 1 | TOPC-07 | unit | `cd dashboard && npx vitest run src/__tests__/TopicActions.test.jsx -x` | ❌ W0 | ⬜ pending |
| 02-02-04 | 02 | 1 | TOPC-08 | unit | `cd dashboard && npx vitest run src/__tests__/TopicActions.test.jsx -x` | ❌ W0 | ⬜ pending |
| 02-02-05 | 02 | 1 | TOPC-10 | unit | `cd dashboard && npx vitest run src/__tests__/TopicBulkActions.test.jsx -x` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | NICH-02 | manual | Manual: trigger webhook, verify Supabase data | N/A | ⬜ pending |
| 02-03-02 | 03 | 2 | NICH-04 | manual | Manual: verify prompt_configs table after research | N/A | ⬜ pending |
| 02-03-03 | 03 | 2 | TOPC-01 | manual | Manual: trigger webhook, verify Supabase counts | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/src/__tests__/CreateProjectModal.test.jsx` — stubs for NICH-01
- [ ] `dashboard/src/__tests__/ProjectsHome.test.jsx` — update for NICH-07 (real data)
- [ ] `dashboard/src/__tests__/TopicReview.test.jsx` — stubs for TOPC-05
- [ ] `dashboard/src/__tests__/TopicActions.test.jsx` — stubs for TOPC-06, TOPC-07, TOPC-08
- [ ] `dashboard/src/__tests__/TopicBulkActions.test.jsx` — stubs for TOPC-10

*Existing test infrastructure from Phase 1 covers framework install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Niche research via n8n + Claude web search | NICH-02 | n8n workflow execution, external API | Trigger /webhook/project/create, verify niche_profiles row in Supabase |
| Dynamic prompt generation | NICH-04 | n8n workflow, Claude output | Verify prompt_configs rows created with correct prompt_type values |
| Topic generation (25 topics + avatars) | TOPC-01 | n8n workflow, Claude output | Trigger /webhook/topics/generate, verify 25 topic + 25 avatar rows |
| Playlist angle generation | NICH-06 | n8n workflow, Claude output | Verify projects row has playlist1/2/3 name and theme populated |
| Research results in niche_profiles | NICH-03 | n8n workflow output | Verify JSONB fields (competitor_analysis, audience_pain_points, etc.) populated |
| Prompt versioning | NICH-05 | Database writes from n8n | Verify prompt_configs rows have version=1, is_active=true |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
