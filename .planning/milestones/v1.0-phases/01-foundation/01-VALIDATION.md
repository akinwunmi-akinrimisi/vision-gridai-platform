---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (compatible with Vite, zero-config for Vite projects) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd dashboard && npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd dashboard && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | FNDN-07 | unit | `npx vitest run src/__tests__/tailwind.test.js` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | FNDN-01 | smoke | `npx vitest run src/__tests__/routes.test.jsx` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | FNDN-06 | unit | `npx vitest run src/__tests__/useAuth.test.js` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 2 | FNDN-02 | unit | `npx vitest run src/__tests__/supabase.test.js` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 2 | FNDN-03 | unit | `npx vitest run src/__tests__/useRealtimeSubscription.test.js` | ❌ W0 | ⬜ pending |
| 01-02-03 | 02 | 2 | FNDN-04 | unit | `npx vitest run src/__tests__/queryClient.test.js` | ❌ W0 | ⬜ pending |
| 01-02-04 | 02 | 2 | FNDN-05 | unit | `npx vitest run src/__tests__/api.test.js` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 3 | FNDN-05 | integration | `curl -s -X POST https://n8n.srv1297445.hstgr.cloud/webhook/status` | N/A | ⬜ pending |
| 01-03-02 | 03 | 3 | FNDN-08 | manual | SSH check | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/vitest.config.js` — Vitest configuration (jsdom environment)
- [ ] `dashboard/src/__tests__/setup.js` — Test setup file (Testing Library matchers)
- [ ] `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom` — testing dependencies
- [ ] Test stubs for FNDN-01 through FNDN-06

*Wave 0 is embedded in Plan 01 as the first task.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Design system colors match MASTER.md | FNDN-07 | Visual inspection of rendered UI | Open dashboard, compare sidebar/card/text colors against MASTER.md hex values in both light and dark mode |
| Infrastructure hardening applied | FNDN-08 | Server-side configuration | SSH into VPS, check `docker inspect n8n-ffmpeg` for memory limits, check PostgreSQL `max_connections`, check Nginx timeout config |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
