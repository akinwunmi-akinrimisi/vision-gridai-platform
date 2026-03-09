---
phase: 5
slug: publish-analytics
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.0 + @testing-library/react 16.1.0 |
| **Config file** | dashboard/vite.config.js (test block) |
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
| 05-00-01 | 00 | 0 | PUBL-01..07, ANLY-03..04 | scaffolding | `cd dashboard && npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 05-01-01 | 01 | 1 | PUBL-06 | unit | `cd dashboard && npx vitest run src/__tests__/publishApi.test.js` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | PUBL-01..05, PUBL-07 | unit | `cd dashboard && npx vitest run src/__tests__/VideoReview.test.jsx` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | PUBL-01..05 | unit | `cd dashboard && npx vitest run src/__tests__/VideoReview.test.jsx` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | PUBL-06, PUBL-07 | manual | n8n workflow test | N/A | ⬜ pending |
| 05-04-01 | 04 | 3 | ANLY-03, ANLY-04 | unit | `cd dashboard && npx vitest run src/__tests__/Analytics.test.jsx` | ❌ W0 | ⬜ pending |
| 05-05-01 | 05 | 3 | ANLY-01, ANLY-02 | manual | n8n workflow test | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/src/__tests__/VideoReview.test.jsx` — stubs for PUBL-01 through PUBL-05, PUBL-07
- [ ] `dashboard/src/__tests__/publishApi.test.js` — stubs for PUBL-06 (webhook endpoint calls)
- [ ] `dashboard/src/__tests__/Analytics.test.jsx` — stubs for ANLY-03, ANLY-04 (chart rendering, cost display)
- [ ] `dashboard/src/__tests__/useQuotaStatus.test.js` — stubs for PUBL-07 (quota tracking logic)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| YouTube upload completes with metadata, captions, thumbnail, playlist | PUBL-06 | Requires live YouTube API + n8n execution | Execute n8n workflow with test video, verify on YouTube Studio |
| Daily analytics cron pulls metrics | ANLY-01 | Requires live YouTube Analytics API | Trigger n8n cron manually, verify yt_* columns in Supabase |
| Analytics data written to topics table | ANLY-02 | Requires live Supabase + n8n | Check topics table after cron run for yt_* field updates |
| Private-to-public transition for scheduled videos | PUBL-06 | Requires live YouTube API + time-based trigger | Schedule a video, verify transition after scheduled time |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
