---
phase: 4
slug: production-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.0 + @testing-library/react 16.1.0 |
| **Config file** | `dashboard/vite.config.js` (test block) |
| **Quick run command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

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
| 04-00-01 | 00 | 0 | PROD-13 | unit | `cd dashboard && npx vitest run src/__tests__/ProductionMonitor.test.jsx -x` | ❌ W0 | ⬜ pending |
| 04-00-02 | 00 | 0 | PROD-13 | unit | `cd dashboard && npx vitest run src/__tests__/DotGrid.test.jsx -x` | ❌ W0 | ⬜ pending |
| 04-00-03 | 00 | 0 | PROD-13 | unit | `cd dashboard && npx vitest run src/__tests__/HeroCard.test.jsx -x` | ❌ W0 | ⬜ pending |
| 04-00-04 | 00 | 0 | PROD-13 | unit | `cd dashboard && npx vitest run src/__tests__/FailedScenes.test.jsx -x` | ❌ W0 | ⬜ pending |
| 04-00-05 | 00 | 0 | PROD-14 | unit | `cd dashboard && npx vitest run src/__tests__/PipelineTable.test.jsx -x` | ❌ W0 | ⬜ pending |
| 04-00-06 | 00 | 0 | PROD-01-12 | unit | `cd dashboard && npx vitest run src/__tests__/productionApi.test.js -x` | ❌ W0 | ⬜ pending |
| 04-00-07 | 00 | 0 | PROD-13 | unit | `cd dashboard && npx vitest run src/__tests__/useProductionProgress.test.js -x` | ❌ W0 | ⬜ pending |
| 04-00-08 | 00 | 0 | OPS-01 | unit | `cd dashboard && npx vitest run src/__tests__/SupervisorAlert.test.jsx -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/ProductionMonitor.test.jsx` — stubs for PROD-13 (page render, hero card, dot grid, queue)
- [ ] `src/__tests__/DotGrid.test.jsx` — stubs for PROD-13 (scene progress visualization, chapter grouping)
- [ ] `src/__tests__/HeroCard.test.jsx` — stubs for PROD-13 (active topic card, stage chips, cost)
- [ ] `src/__tests__/FailedScenes.test.jsx` — stubs for PROD-13 (error recovery UI, retry/skip actions)
- [ ] `src/__tests__/PipelineTable.test.jsx` — stubs for PROD-14 (pipeline status table)
- [ ] `src/__tests__/productionApi.test.js` — stubs for PROD-01-12 (webhook API helpers)
- [ ] `src/__tests__/useProductionProgress.test.js` — stubs for PROD-13 (hook + Realtime subscription)
- [ ] `src/__tests__/SupervisorAlert.test.jsx` — stubs for OPS-01 (supervisor alert banner/toast)
- [ ] Stub files for all new components/hooks so imports resolve

*Existing test infrastructure from Phase 2/3 Wave 0 covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| TTS audio generation via Google Cloud API | PROD-01 | External API call in n8n workflow | Deploy workflow, trigger via webhook, verify audio files in Drive |
| FFprobe duration measurement | PROD-02 | Requires real audio file in n8n container | Trigger TTS for 1 scene, verify audio_duration_ms in scenes table |
| Kie.ai image generation | PROD-04 | External API call with async polling | Deploy workflow, trigger, verify image_url in scenes table |
| Kie.ai I2V generation | PROD-05 | External API call with async polling | Deploy workflow, trigger, verify video_url in scenes table |
| Kie.ai T2V generation | PROD-06 | External API call with async polling | Deploy workflow, trigger, verify video_url in scenes table |
| FFmpeg assembly pipeline | PROD-08 | Requires real media files in n8n container | Run full production on 1 topic, verify final video in Drive |
| Google Drive upload | PROD-09 | External API call to Drive | Verify files appear in correct Drive subfolder structure |
| Self-chaining webhook firing | PROD-11 | n8n workflow orchestration | Trigger production, verify each stage fires next via webhook logs |
| Supervisor cron detection | OPS-01 | Requires stuck topic state + 30-min schedule | Set topic stuck for >2hrs, wait for supervisor cycle, verify alert |
| Supervisor auto-retry | OPS-02 | Requires failed scenes + supervisor action | Mark scenes failed, trigger supervisor, verify retry attempts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
