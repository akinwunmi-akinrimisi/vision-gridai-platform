# Security Remediation Status — 2026-04-21 Audit
_Last updated: 2026-04-21 end-of-day._
_Audit source: `docs/SECURITY_AUDIT_2026_04_21.md`_

## Summary

| Severity | Total | Fixed | Deferred | Notes |
|---|---|---|---|---|
| Critical | 3    | 3 (C-1, C-2, C-3)     | 0          | closed by migration 030 + WF_DASHBOARD_READ |
| High     | 4    | 4 (H-1, H-2, H-3, H-4)| 0          | all landed in Batch 3 |
| Medium   | 4    | 2 (M-2, M-3)          | 2 (M-1, M-4*) | *M-4 origin-echo CORS tightened; follow-up = CSRF |
| Low      | 3    | 0                     | 3 (L-1..L-3) | see Batch 4 queue below |
| **Total**| **14** | **9**               | **5**       | |

Plus 4 follow-ups discovered during remediation (dashboard partial, caption-burn bind, Realtime path, dashboard.env rotation telemetry).

## Fixed (merged + deployed)

| Finding | Commit | Artefact |
|---|---|---|
| C-1, C-2, C-3 | `699861a` | supabase/migrations/030_lock_down_rls.sql — RLS `USING (false)` on 49 VG tables + REVOKE writes from anon |
| C-follow-up  | `5d3f663` | workflows/WF_DASHBOARD_READ.json + 6 hooks + LimitedModeBanner. Dashboard reads now go through authenticated n8n webhook. |
| H-1, H-2, H-4 | `c220174` | JWT secret + ANON + SERVICE_ROLE rotated (new exp 2027-04-21). 14 VG workflows, 36 webhook nodes bound to credential `KtMyWD7uJJBZYLjt`. Migration 031 + caption-burn regex input validation. |
| H-3 | `cb4f5f4` | dashboard/nginx.conf — CSP, HSTS, X-Frame, X-Content-Type, Referrer, Permissions, COOP headers + CORS allowlist for /webhook/. |

## Verification invariants (all green)

```
$ python tools/verify_prompt_sync.py          → OK
$ SSH_KEY=~/.ssh/id_ed25519_antigravity python tools/lint_n8n_workflows.py
  → 0 errors, 0 warnings, 2 allowlisted
$ curl .../rest/v1/projects -H "apikey:$OLD_ANON"   → HTTP 401
$ curl .../rest/v1/projects -H "apikey:$NEW_ANON"   → HTTP 200 []   (RLS still blocks)
$ curl .../rest/v1/projects -H "apikey:$NEW_SVC"    → HTTP 200 (rows)
$ curl -X POST .../webhook/production/tts           → HTTP 403
$ curl -X POST .../webhook/production/ken-burns     → HTTP 403
$ curl -I .../                                      → CSP, HSTS, X-Frame: DENY, etc.
$ curl -I -X OPTIONS .../webhook/ -H "Origin: https://evil" → no ACAO
```

## Deferred — Batch 4 queue (not blocking production)

### Medium
- **M-1 — Drive file ID enumeration** (unchanged). `topics.drive_folder_id`, `scenes.image_drive_id`, `scenes.video_drive_id`, `scenes.video_clip_url`, `topics.thumbnail_url` still contain Drive URLs. Service-account-scoped Drive sharing + dashboard preview via signed URLs needed. **Effort: ~1 day.**

### Low
- **L-1 — Dependency CVE scan**. Run `npm audit --production` on `dashboard/`, `trivy fs .`, write results to `docs/DEPENDENCY_SCAN.md`. **Effort: ~2 hrs.**
- **L-2 — Error response shape**. Several webhooks leak n8n node names in error messages. Wrap every webhook workflow in an Error Trigger sub-workflow returning `{success:false, error:"Internal error", request_id:uuid}`. **Effort: ~1 day.**
- **L-3 — Git history secret purge**. `git filter-repo --replace-text` to redact the pre-2026-03-11 tokens + the 2026-04-21-old-and-now-revoked tokens from `git log -p`. Requires `git push --force` coordination. **Effort: ~2 hrs.**

### Follow-ups discovered during remediation
- **CSRF posture on /webhook/**. Nginx injects the Bearer for any POST, so any origin can fire-and-forget state-changing requests (the browser just can't read the response, because H-3 removed ACAO reflection). Mitigate with either (a) custom `X-Requested-With: XMLHttpRequest` header required (browsers block custom headers on cross-origin without preflight, which we also block), or (b) strict Origin check in the nginx `location /webhook/` block. **Effort: ~1 hr.**
- **Caption-burn service bound on 0.0.0.0:9998**. Only n8n (Docker gateway `172.18.0.1`) needs to reach it. Rebind to `172.18.0.1:9998` only, and drop the 0.0.0.0 listener. Requires a small edit to `caption_burn_service.py` + systemd restart. **Effort: ~20 min.**
- **Dashboard secondary-page hooks still query supabase.from() directly**. After migration 030 they return `[]` and the pages show empty data. Already banner-flagged in LimitedModeBanner. Migrate the rest of the hooks (Engagement, Calendar, Keywords, Settings integrations, A/B tests, audience intelligence…) to `dashboardRead()` as new query types on `WF_DASHBOARD_READ`. **Effort: ~2 days across ~15 hooks.**
- **useDeleteProject does direct supabase.from().delete()** and now 403s. Needs a `/webhook/projects/delete` that cascades on the server. **Effort: ~1 hr.**
- **Realtime (WebSocket) never reauth'd after H-1 rotation**. Before H-1 it was already broken (migration 030 blocked anon). For future Realtime support we would need an anon-role policy scoped to `auth.uid()` or a Realtime proxy through WF_DASHBOARD_READ. Not urgent. **Effort: ~1 day.**
- **Linter reads `workflow_entity.nodes` which lags the active version**. Two H-2 warnings were false positives before the lag caught up. Upgrade `tools/lint_n8n_workflows.py` to join `workflow_published_version → workflow_history` for the authoritative nodes JSON. **Effort: ~1 hr.**

## Proposed ordering for Batch 4

1. Caption-burn rebind to 172.18.0.1 (20 min, high-value/low-risk).
2. CSRF Origin check (1 hr).
3. Dashboard delete webhook + dashboard useDeleteProject switch (1 hr).
4. Batch the dashboard secondary hooks onto WF_DASHBOARD_READ (2 days, can be incremental).
5. L-1 dependency scan (2 hrs).
6. L-2 error shape (1 day).
7. L-3 git history purge (2 hrs, requires force-push coordination).
8. M-1 Drive signed URLs (1 day).
9. Linter upgrade (1 hr).
10. Realtime-over-webhook proxy (1 day — only if user wants live updates back).
