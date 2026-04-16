# ENV_SAFETY.md — Environment Safety Rules
**Generated:** 2026-04-16 | **Phase:** 0 Reconnaissance

---

## Global Rules (Apply to ALL Phases)

1. **No live posts** to YouTube, TikTok, or Instagram from tests. Use sandbox channels/accounts or dry-run mode. Any real post requires explicit per-test approval from Akinwunmi.
2. **Daily spend cap:** $5/day on real API calls (Fal.ai + Google TTS + Anthropic combined). Prefer recorded fixtures for deterministic runs.
3. **Supabase test isolation:** All test traffic uses a dedicated `test_` project_id namespace (UUID prefix `00000000-test-...`). Never touch production rows.
4. **Log redaction:** All test logs MUST redact: `sk-ant-*`, `fal_*`, `AIza*`, Supabase service-role JWTs (`eyJhbG*`), YouTube/TikTok/IG OAuth tokens, `DASHBOARD_API_TOKEN`.
5. **Credentials source:** All API keys come from `.env` (local) or `$env.*` (n8n). Never hardcode in test files. Never commit `.env`.
6. **VPS access:** SSH via `ssh -i ~/.ssh/id_ed25519_antigravity root@srv1297445.hstgr.cloud`. Destructive VPS commands (docker restart, DROP TABLE, rm -rf) require explicit approval.
7. **n8n workflow edits:** Use `n8n_update_partial_workflow` MCP tool only. Never delete nodes. Backup before editing multi-node live workflows.
8. **Git hygiene:** One fix = one commit. Reference phase report and regression test in commit message.

---

## Phase 1 — Code-Level Correctness

| Parameter | Value |
|-----------|-------|
| **Environment** | Local development (Windows 11) |
| **Data set** | Mock data only. No real API calls for unit tests. |
| **Real-money cap** | $0 (all I/O mocked) |
| **Posting allow-list** | None |
| **Supabase access** | Mocked via vitest stubs. No live Supabase queries. |
| **n8n access** | None. Workflow JSONs read from `workflows/` directory only. |
| **FFmpeg** | Local binary for unit tests on execution scripts. Tiny test fixtures (<5s audio/video). |
| **Anthropic API** | Mocked. Use recorded response fixtures. |
| **Fal.ai** | Mocked. Use recorded response fixtures. |
| **Google TTS** | Mocked. Use recorded response fixtures. |
| **YouTube API** | Mocked. Use recorded response fixtures. |
| **Dashboard** | `vitest` with jsdom. No browser required. |

### Allowed real calls (Phase 1 only):
- `npm run build` in `dashboard/` to verify build succeeds
- `vitest run` for test execution
- `ffprobe` / `ffmpeg` on tiny local fixtures

---

## Phase 2 — System-Level Verification

| Parameter | Value |
|-----------|-------|
| **Environment** | Staging mirror of VPS (or live VPS with test namespace) |
| **Data set** | Deterministic seed project with `project_id = '00000000-test-0000-0000-000000000001'`. 1 topic, 3-5 scenes. |
| **Real-money cap** | $5/day across all APIs |
| **Posting allow-list** | YouTube UNLISTED to sandbox channel only (requires approval before first post). TikTok/IG: DRY RUN ONLY (no actual post). |
| **Supabase access** | Live Supabase, but only `test_` namespace rows. Reads from production rows allowed. Writes/deletes only to test rows. |
| **n8n access** | Live n8n webhooks. Manual trigger only (all crons remain disabled). |
| **FFmpeg** | Via n8n container `docker exec`. Small test fixtures (30s audio, 3 scenes). |
| **Anthropic API** | Live, capped. Max 10 Opus calls + 20 Haiku calls per test run. |
| **Fal.ai** | Live, capped. Max 5 image generations per test run ($0.15). |
| **Google TTS** | Live, capped. Max 5 scene TTS calls per test run (~$0.01). |
| **YouTube API** | Live for reads (search, videos, channels). Upload only to UNLISTED sandbox. Budget: max 2,000 units/test run. |

### Pre-flight checklist (Phase 2):
- [ ] Confirm test project exists with `test_` namespace UUID
- [ ] Confirm no crons are enabled in n8n
- [ ] Confirm daily spend tracker reset
- [ ] Confirm YouTube sandbox channel configured (not production channel)
- [ ] Confirm `.env` has correct credentials

---

## Phase 3 — Human-Facing Quality

| Parameter | Value |
|-----------|-------|
| **Environment** | Live dashboard at `https://dashboard.operscale.cloud` |
| **Data set** | Production data (read-only for visual audit). Test writes in `test_` namespace only. |
| **Real-money cap** | $0 (UI testing, accessibility, usability — no API calls) |
| **Posting allow-list** | None |
| **Browser testing** | Chrome, Firefox, Safari. Mobile viewports: 375x812, 390x844, 414x896. |
| **axe scans** | Local browser extension or CLI |
| **Keyboard/screen-reader** | Manual testing on live dashboard |

---

## Phase 4 — Pre-Release Validation

| Parameter | Value |
|-----------|-------|
| **Environment** | Live VPS (production) |
| **Data set** | One real niche, end-to-end. Separate from existing production projects. |
| **Real-money cap** | $50 total for one full 2hr render + one 20-clip shorts pack + 3 social posts. Requires explicit approval before starting. |
| **Posting allow-list** | YouTube UNLISTED (1 video). TikTok sandbox (3 clips). Instagram sandbox (3 clips). All require per-post approval. |
| **UAT criteria** | 100% pass on acceptance matrix or signed exception. |
| **Pilot** | One real niche to non-sandbox channel. Akinwunmi is rollback owner. Pre-commit PILOT_PLAN.md. |
| **Monitoring** | 48hr heightened monitoring post-publish. Rollback plan documented. |

---

## Phase 5 — Experimentation (Plans Only)

| Parameter | Value |
|-----------|-------|
| **Environment** | N/A (plans only, no live experiments in this campaign) |
| **Real-money cap** | $0 |
| **Posting allow-list** | None |
| **Deliverables** | EXPERIMENT_SPEC.md per A/B test, MVT_ASSESSMENT.md |

---

## API Cost Reference (for cap enforcement)

| API | Cost per call | Typical batch | Batch cost |
|-----|--------------|---------------|------------|
| Anthropic Opus 4.6 (8K out) | ~$0.15 | 1 script pass | $0.15 |
| Anthropic Haiku 4.5 (4K out) | ~$0.005 | 25 comment classifications | $0.125 |
| Fal.ai Seedream 4.0 | $0.03/image | 5 test images | $0.15 |
| Google Cloud TTS (Chirp 3 HD) | ~$0.002/scene | 5 test scenes | $0.01 |
| YouTube Data API v3 | 0 (quota units only) | 100 search units | 0 |
| YouTube Analytics API v2 | 0 (quota units only) | 10 report units | 0 |

**Maximum Phase 2 test run cost:** ~$0.50 (10 Opus + 5 images + 5 TTS)

---

## Emergency Procedures

1. **Budget exceeded:** STOP all test runs immediately. Check `production_logs` for cost tracking. Report actual spend.
2. **Accidental public post:** YouTube: set to private immediately via API. TikTok/IG: delete post. Log incident.
3. **Credential leak in test output:** Rotate affected key immediately. Check git history for exposure. Update `.env` and n8n credentials.
4. **VPS resource exhaustion:** `docker stats` to identify culprit. Kill FFmpeg processes first (`pkill ffmpeg`). Restart n8n container if needed.
5. **Supabase production data contamination:** Identify affected rows by `created_at` timestamp. Revert via SQL. Document in incident report.
