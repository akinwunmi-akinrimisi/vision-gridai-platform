---
phase: 8
slug: credentials-deployment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — configuration/deployment phase, no automated test suite |
| **Config file** | none |
| **Quick run command** | `curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" https://n8n.srv1297445.hstgr.cloud/api/v1/workflows | jq '.data | length'` |
| **Full suite command** | see Manual-Only Verifications table |
| **Estimated runtime** | ~30 seconds (curl checks) |

---

## Sampling Rate

- **After every task commit:** Run quick run command (workflow count check)
- **After every plan wave:** Run all manual verification commands in the wave
- **Before `/gsd:verify-work`:** All 4 success criteria must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 8-01-01 | 01 | 1 | INFR (env vars) | manual | `docker exec n8n-n8n-1 env \| grep N8N_WEBHOOK_BASE` | ⬜ pending |
| 8-01-02 | 01 | 1 | INFR (env vars) | manual | `docker exec n8n-n8n-1 env \| grep DASHBOARD_API_TOKEN` | ⬜ pending |
| 8-02-01 | 02 | 1 | DEPL-01 | manual | `curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" https://n8n.srv1297445.hstgr.cloud/api/v1/credentials \| jq '[.data[].name]'` | ⬜ pending |
| 8-02-02 | 02 | 1 | DEPL-01 | manual | Anthropic ping: POST /v1/messages with minimal payload | ⬜ pending |
| 8-03-01 | 03 | 2 | DEPL-02 | manual | `curl -s ... /api/v1/workflows \| jq '[.data[] \| select(.active==true) \| .name]'` shows no stubs | ⬜ pending |
| 8-04-01 | 04 | 2 | DEPL-03 | manual | `curl -s ... /api/v1/workflows \| jq '.data \| length'` returns 18 | ⬜ pending |
| 8-04-02 | 04 | 2 | DEPL-03 | manual | All webhook-path workflows show active=true | ⬜ pending |
| 8-04-03 | 04 | 2 | DEPL-04 | manual | `docker exec n8n-n8n-1 env \| grep N8N_WEBHOOK_BASE` returns correct URL | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — this is a pure configuration/deployment phase. No test files to create.

*Existing infrastructure covers all phase requirements (manual verification via curl/docker exec).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All 6 credentials exist and are named correctly | DEPL-01 | n8n credential manager has no automated test runner | `GET /api/v1/credentials` — check names match: "Anthropic API Key", "Supabase Service Role", "Kie API Key", "Google Cloud TTS", "Google Drive", "YouTube OAuth2" |
| Anthropic credential makes a real API call | DEPL-01 | Requires live API call to validate key works | POST `https://api.anthropic.com/v1/messages` with `x-api-key` header, check 200 response |
| Google Cloud TTS credential works | DEPL-01 | Requires n8n UI for service account JSON upload; OAuth flow | POST to `https://texttospeech.googleapis.com/v1/text:synthesize` using the credential from n8n, check 200 |
| No stub workflows active | DEPL-02 | Must inspect n8n workflow list live | `GET /api/v1/workflows?active=true` returns only production workflow names |
| 18 workflows imported and active | DEPL-03 | Requires checking n8n server state | `GET /api/v1/workflows` returns 18 items; all webhook handlers active |
| Self-chaining URL resolves correctly | DEPL-04 | Requires live env var check in container | `docker exec n8n-n8n-1 env \| grep N8N_WEBHOOK_BASE` shows `https://n8n.srv1297445.hstgr.cloud/webhook` |
| Webhook handler responds to POST | DEPL-03 | Confirms activation — not just import | `curl -X POST https://n8n.srv1297445.hstgr.cloud/webhook/status` returns non-404 |

---

## Validation Sign-Off

- [ ] All tasks have manual verify commands documented
- [ ] Each wave has end-of-wave verification steps
- [ ] Credential IDs in workflow JSONs match n8n-assigned IDs (post-import re-link verified)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter after execution

**Approval:** pending
