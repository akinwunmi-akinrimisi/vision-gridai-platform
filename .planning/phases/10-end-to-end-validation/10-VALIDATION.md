---
phase: 10
slug: end-to-end-validation
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-03-09
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^2.1.0 (dashboard unit tests) |
| **Config file** | `dashboard/vite.config.js` (inlined test config) |
| **Quick run command** | `cd dashboard && npm test -- --reporter=verbose --run` |
| **Full suite command** | `cd dashboard && npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npm test -- --reporter=verbose --run 2>&1 | tail -20`
- **After every plan wave:** Run `cd dashboard && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green (193+ tests passing)
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | E2E-01 | manual | Import WF_SCRIPT_GENERATE to n8n, activate, check workflow list | N/A | ⬜ pending |
| 10-01-02 | 01 | 1 | E2E-01 | manual | Trigger `/webhook/script/generate` with a topic_id, verify script_review_status updates in Supabase | N/A | ⬜ pending |
| 10-02-01 | 02 | 1 | E2E-01 | manual | Import WF_SCRIPT_APPROVE + WF_SCRIPT_REJECT, activate both | N/A | ⬜ pending |
| 10-02-02 | 02 | 1 | E2E-01 | unit | `cd dashboard && npm test -- --run ScriptReview` | ✅ exists | ⬜ pending |
| 10-03-01 | 03 | 2 | E2E-01 | manual | Create US Credit Cards project from dashboard → research completes → niche profile visible | N/A | ⬜ pending |
| 10-03-02 | 03 | 2 | E2E-01 | manual | Generate 25 topics → Gate 1 actions (approve ≥1, reject ≥1, refine ≥1) all work | N/A | ⬜ pending |
| 10-04-01 | 04 | 2 | E2E-01 | manual | Trigger script generation → 3 passes complete → score ≥7.0 → Gate 2 approval works | N/A | ⬜ pending |
| 10-05-01 | 05 | 2 | E2E-01 | manual | Production pipeline runs (TTS → images → video → assembly) → Gate 3 shows reviewable video | N/A | ⬜ pending |
| 10-06-01 | 06 | 3 | E2E-01 | manual | All bugs from Wave 2 fixed and re-verified | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

*No new test files needed. New workflows (WF_SCRIPT_*) are backend-only n8n workflows that cannot be unit tested from the dashboard test suite. Dashboard unit tests already cover script review UI components.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| US Credit Cards project creates successfully | E2E-01 | Live n8n + Claude API call + Supabase write | Dashboard → New Project → "US Credit Cards" → observe status transitions |
| Niche research completes and displays | E2E-01 | Live web search + Claude AI + Supabase Realtime | Check NicheResearch page shows competitor_analysis, pain_points, blue_ocean after research |
| 25 topics + 25 avatars generated | E2E-01 | n8n workflow + Claude API + Supabase bulk INSERT | `SELECT count(*) FROM topics WHERE project_id=...` = 25; `SELECT count(*) FROM avatars WHERE project_id=...` = 25 |
| Gate 1 approve/reject/refine all work | E2E-01 | Live webhook calls + Supabase PATCH + Realtime | Dashboard: approve 1 topic, reject 1 topic, refine 1 topic, verify statuses update in real-time |
| Script generation 3-pass completes | E2E-01 | n8n multi-call workflow (~5 Claude API calls) | Trigger WF_SCRIPT_GENERATE, watch production_log, verify topic.script_review_status → 'pending' |
| Script quality score ≥7.0 | E2E-01 | Claude evaluation call + JSONB write | Check topics.script_quality_score and topics.script_evaluation after generation |
| Gate 2 script approval works | E2E-01 | Live webhook + Supabase PATCH + n8n chain | Dashboard Script Review page → Approve → verify status='script_approved' → production triggered |
| Production pipeline runs TTS→images→video→assembly | E2E-01 | Multiple n8n workflows + external APIs (Google TTS, Kie.ai, FFmpeg) | Production Monitor DotGrid fills in; scenes table audio/image/video_status update |
| Gate 3 video reviewable | E2E-01 | Drive video URL + video player in dashboard | Video Review page shows embedded player with assembled video |
| Production log entries appear in Production Monitor | AGNT-07 | Supabase Realtime subscription; requires browser + live workflow | Watch ProductionMonitor page while workflows run |
| topics_exist confirm dialog re-sends with force=true | DASH-01 | End-to-end browser interaction | Trigger topic generation twice; verify confirm dialog appears; click confirm; verify 25 more topics |
| Inline edit saves topic + avatar fields | DASH-01 | Live webhook + Supabase PATCH | Click pencil on TopicCard, edit title, click Save, verify DB updated |
| Retry Research button works for research_failed | DASH-01 | Live webhook re-trigger | Manually set project status=research_failed in DB, verify Retry button appears, click it |
| Error handlers write research_failed status | AGNT-08 | n8n error path; requires triggering actual failure | Temporarily use bad API key; verify projects.status='research_failed' in Supabase |
| system prompt = niche_system_prompt (not substring) | AGNT-09 | n8n node config; verified by reading execution payload | Check n8n execution input for WF_TOPICS_GENERATE Claude API call — system field = full niche_system_prompt |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
