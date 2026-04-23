# Security Remediation Status — 2026-04-21 Audit
_Last updated: 2026-04-23 — Batch 4 complete + post-ship UX hotfixes + JWT-rotation credential-sweep followup._
_Audit source: `docs/SECURITY_AUDIT_2026_04_21.md`_
_Current HEAD: `792c23b` on `origin/main` (synced)._

## Summary

| Severity | Total | Fixed | Deferred | Notes |
|---|---|---|---|---|
| Critical | 3  | 3 | 0 | C-1, C-2, C-3 — closed by migration 030 + WF_DASHBOARD_READ |
| High     | 4  | 4 | 0 | H-1, H-2, H-3, H-4 — closed in Batch 3 |
| Medium   | 4  | 4 | 0 | M-1 closed via RLS lockdown; M-2, M-3 via headers + writes-denied; M-4 via CORS allowlist |
| Low      | 3  | 3 | 0 | L-1 dep-scan clean; L-2 nginx-level generic 5xx; L-3 git history purged |
| **Total** | **14** | **14** | **0** | |

Plus all 7 follow-ups discovered during remediation: all closed.

## Commits on `main`

| Commit (post-rewrite) | Coverage |
|---|---|
| (predecessor, rewritten SHA) | security(C-1,C-2,C-3) — RLS lockdown migration 030 |
| (predecessor, rewritten SHA) | security(C-follow-up) — WF_DASHBOARD_READ + 6 hook refactor |
| (predecessor, rewritten SHA) | security(H-1,H-2,H-4) — JWT rotation + 36 webhook credentials + caption-burn validation |
| (predecessor, rewritten SHA) | security(H-3) — CSP/HSTS/CORS headers |
| (predecessor, rewritten SHA) | docs(security) — initial status doc |
| (predecessor, rewritten SHA) | security(B4.1) — caption-burn rebind + CSRF + linter version-join + delete webhook |
| `d9a8c5f` | security(B4.2,B4.3) — dep CVE scan + 5xx error shape |
| `89661d0` | security(B4.5) — useABTests migration + Realtime stub |
| `24ca3a9` | security(B4.6) — sub-5s polling + drop banner |
| `8c23984` | security(B4.7 + final status) — git history purge |
| `5715748` | fix(dashboard): silence WebSocket noise (1st attempt — see revert) |
| `8a9f319` | fix(dashboard): revert the realtime.params tweak that blanked the page |
| `1ddb427` | fix(sidebar): replace 2 Realtime channels with react-query derivations |
| `792c23b` | fix(dashboard): supabase-js shim + sb_query handler — restores every page |

## Post-B4.7 production hotfixes

After Batch 4 shipped, the live dashboard surfaced two residual
issues caused by the RLS lockdown that the batches hadn't covered:

- **"WebSocket not available" console spam.** The auto-connecting
  supabase-js Realtime client, plus `ConnectionStatus.jsx` opening a
  control channel, plus `Sidebar.jsx` opening two postgres_changes
  channels, kept retrying WS handshakes that anon can no longer auth.
  Commits `5715748` → `8a9f319` → `1ddb427` swapped every browser
  Realtime subscriber for webhook polling / react-query derivations.

- **Pages showing empty data (Channel Analyzer, Research, YouTube
  Discovery, Niche Research, Intelligence Hub, Keywords, Daily Ideas,
  Engagement Hub, Social Publisher, Content Calendar, Shorts Creator,
  Video Review, Settings).** 35+ files still had multi-line
  `supabase.from(...).select(...).eq(...)` chains that returned `[]`
  under the new RLS. Commit `792c23b` replaced
  `dashboard/src/lib/supabase.js` with a hand-rolled shim that
  preserves the supabase-js fluent API but routes every chain through
  a new `sb_query` handler in WF_DASHBOARD_READ, which runs the query
  with service_role against a 47-table allowlist. 100+ call sites
  restored without touching the pages themselves.

Net effect: no code in the browser holds a DB key, no WebSocket is
ever opened, no direct REST call to Supabase, every page hits only
`/webhook/dashboard/read` with the nginx-injected bearer.

_(The pre-B4.7 commit SHAs are shown as "rewritten" because the git-filter-repo pass in B4.7 rewrote every commit to redact old secrets. `git log` on `main` now shows the new SHAs.)_

## Verification invariants (all green)

```
$ python tools/verify_prompt_sync.py            → OK
$ SSH_KEY=~/.ssh/id_ed25519_antigravity python tools/lint_n8n_workflows.py
  → 0 errors, 0 warnings, 2 allowlisted
$ curl .../rest/v1/projects -H "apikey:$OLD_ANON"                       → HTTP 401
$ curl .../rest/v1/projects -H "apikey:$NEW_ANON"                       → HTTP 200 []   (RLS still blocks)
$ curl .../rest/v1/projects -H "apikey:$NEW_SVC"                        → HTTP 200 (rows)
$ curl -X POST .../webhook/production/tts                               → HTTP 403
$ curl -X POST .../webhook/dashboard/read {delete_project,...}          → HTTP 200/400/404/409 per validation
$ curl -X POST .../webhook/ -H "Origin: https://evil.example"           → HTTP 403 (CSRF blocked)
$ curl -I .../                                                          → CSP, HSTS, X-Frame: DENY, COOP, etc.
$ curl -X POST .../webhook/ -H "Authorization: Bearer $OLD_TOKEN"       → HTTP 403
$ ss -tln | grep 9998                                                   → 172.18.0.1:9998 only (not public)
$ git log --all -p | grep -c <any old secret>                           → 0
$ npm audit (dashboard, ffmpeg-api), pip-audit (audio-merger)           → 0 vulnerabilities
```

## Closed findings

### Critical
- **C-1 / C-2 / C-3** — RLS policies replaced with RESTRICTIVE `USING (false)` for anon on all 49 Vision GridAI tables via migration 030. Anon SELECT/INSERT/UPDATE/DELETE via ANON_KEY returns `[]` or HTTP 401. OAuth tokens in `social_accounts` unreachable pre-populate.

### High
- **H-1 — JWT secret rotated** — new JWT_SECRET with 1-year exp (2027-04-21 instead of 2099). ANON + SERVICE_ROLE reminted; Kong consumer credentials updated + reloaded; `_realtime.tenants.jwt_secret` synced; n8n + dashboard env updated; backups at `*.bak.2026-04-21`.
- **H-2 — 14 VG workflows, 36 webhook nodes** rebound to `headerAuth` credential `KtMyWD7uJJBZYLjt`. Auth enforced at node level before any Function/Code node executes. All 32 original AUTH-01 warnings cleared.
- **H-4 — caption_highlight_word sanitization + input validation** — migration 031 CHECK constraint (`[A-Za-z0-9 '-]{1,40}`); `caption_burn_service.py` validates `topic_id` (UUID), `srt_filename`, `video_filename`, `drive_folder_id`, `register` against strict regex patterns before any subprocess spawn.
- **H-3 — security headers + strict CORS** — CSP, HSTS, X-Frame: DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Cross-Origin-Opener-Policy. CORS locked to `https://dashboard.operscale.cloud` only (no more upstream reflection).

### Medium
- **M-1 — Drive ID enumeration** — CLOSED as a side effect of Batch 1. Anon can no longer read `drive_folder_id`, `image_drive_id`, `video_drive_id`, `thumbnail_url`. Dashboard reads go through service_role which the legitimate user already has via the webhook.
- **M-2 — security headers** — see H-3.
- **M-3 — `production_log` audit-trail integrity** — anon INSERT now HTTP 401 permission denied (migration 030 + REVOKE INSERT).
- **M-4 — CORS allowlist** — see H-3.

### Low
- **L-1 — dependency CVE scan** — dashboard + ffmpeg-api + audio-merger all show 0 vulnerabilities at any severity. See `docs/DEPENDENCY_SCAN_2026_04_21.md`.
- **L-2 — error response shape** — nginx intercepts upstream 5xx and rewrites to `{"success":false,"data":null,"error":"Internal error","request_id":"<uuid>","http_status":500}`. Entry workflows already use clean `JSON.stringify()` envelopes.
- **L-3 — git history secret purge** — `git filter-repo --replace-text` executed against main; 3 secrets redacted across every commit:
    * pre-2026-03-11 anon JWT → `__REDACTED_SUPABASE_ANON_KEY_OLD__`
    * pre-2026-03-11 service_role JWT → `__REDACTED_SUPABASE_SERVICE_ROLE_KEY_OLD__`
    * pre-2026-04-21 webhook bearer → `__REDACTED_DASHBOARD_API_TOKEN_OLD__`
  Force-pushed to `origin/main`. All commit SHAs changed. Any co-maintainer must `git fetch && git reset --hard origin/main`.

### Discovered follow-ups (all closed)

- **Caption-burn 0.0.0.0:9998 public port** — rebound to 172.18.0.1:9998 (docker bridge only). B4.1.
- **CSRF posture on /webhook/** — nginx Origin allowlist rejects state-changing requests from foreign origins with 403 while preserving OPTIONS preflight for CORS negotiation. B4.1.
- **Linter stale-cache false positives** — `tools/lint_n8n_workflows.py` now LEFT JOINs `workflow_published_version → workflow_history` for authoritative nodes JSON. B4.1.
- **useDeleteProject direct supabase.delete()** — now routed through `WF_DASHBOARD_READ.delete_project` with server-side status allowlist and cascade. B4.1.
- **Secondary dashboard hooks** — `useABTests` migrated to `dashboardRead` + new `ab_tests_for_project` / `update_ab_test_status` / `apply_ab_test_winner` queries. `useRealtimeSubscription` stubbed to a no-op (anon Realtime unusable). B4.5.
- **Realtime cadence replacement** — polling intervals lowered to 3–5 s on active pages (scenes, production progress, script, topics) and 10 s on project list; delivers near-realtime UX without a WebSocket proxy service. `LimitedModeBanner` removed. B4.6.
- **Dashboard Bearer token in git history** — rotated on VPS + redacted in history as part of L-3. The live nginx config and n8n credential `KtMyWD7uJJBZYLjt` both hold the new value. B4.7.

## Operational notes

- Live key source of truth on VPS: `/root/keys_new.env` (chmod 600, root only).
- Backups: `*.bak.2026-04-21` for `.env`, `docker-compose.override.yml`, `kong.yml`, `caption_burn_service.py`, nginx dashboard conf.
- `/docker/supabase/.env.bak.2026-04-21`, `/docker/n8n/docker-compose.override.yml.bak.2026-04-21`, `/docker/supabase/supabase/kong.yml.bak.2026-04-21`, `/opt/caption-burn/caption_burn_service.py.bak.2026-04-21`, `/opt/nginx-conf/dashboard.conf.bak.2026-04-21`.
- Dependency scan cron suggestion documented in `docs/DEPENDENCY_SCAN_2026_04_21.md`.

## 2026-04-23 followup — defects the Apr-21 rotation sweep missed

Two defect families surfaced on 2026-04-23 that the Batch 3 rotation (H-1) didn't catch. Root cause in both cases: the rotation updated environment files + Kong + realtime tenants, but did **not** sweep the encrypted n8n `credentials_entity` rows that some workflows use instead of `$env`, and did not rescan for pre-existing expression-authoring bugs whose error shape happens to look JWT-shaped.

### Family A — stale n8n credentials

| Credential ID | Name | Type | Stored JWT `iat` / `exp` | Scope of impact |
|---|---|---|---|---|
| `QsqqFXtnLakNfVKR` | Supabase Service Role | httpHeaderAuth | 2026-03-02 / 2099 (old) | 65+ HTTP Request nodes across **7 active workflows** |
| `J9VjA3SICbcxAq7G` | Supabase | supabaseApi | 2026-03-02 / 2099 (old) | 9 active non-VG workflows (Cal.com, WhatsApp, Lead Outreach) — cross-project, same symptom |
| `5JokeQj3U9W4Ys7p` | DASHBOARD_API_TOKEN | httpHeaderAuth | pre-rotation `825d069e…` | Inert in production (zero active workflow references) but was wrong by policy — fixed for consistency |

Affected active VG workflows that had been silently erroring or would error on next trigger:
- `WF_PROJECT_CREATE — Niche Research + Prompt Generation` (14 nodes)
- `WF_TOPICS_GENERATE — Generate 25 Topics + Avatars` (11 nodes)
- `WF_TOPICS_ACTION — Approve/Reject/Refine/Edit Topics` (15 nodes)
- `WF_SCRIPT_GENERATE — 3-Pass Script Generation` (11 nodes)
- `WF_SOCIAL_POSTER` (4 nodes)
- `WF_SOCIAL_ANALYTICS` (2 nodes) — already failed its 2026-04-21 22:00 + 2026-04-22 22:00 daily cron with `JWSError JWSInvalidSignature`
- `WF_MASTER` (8 nodes)

Closure pathway (per cred): `docker exec n8n-n8n-1 n8n export:credentials --id=<CID> --decrypted --output=<path>` → `jq` patch `.data.value` / `.data.serviceRole` to the fresh JWT from `/root/keys_new.env` → `docker exec n8n-n8n-1 n8n import:credentials --input=<path>`. Import preserves the credential ID so all 7 workflows automatically pick up the new value with zero workflow edits.

Verification: `WF_SOCIAL_ANALYTICS` ran successfully at 2026-04-23 14:24 (execution 76334) after two consecutive post-rotation cron failures. Direct curl with the post-patch credential value returns `HTTP 200`.

### Family B — pre-existing `=` prefix bug on 17 HTTP nodes

In n8n, a parameter value starting with `=` is evaluated as an expression; otherwise it's a literal string. Two workflows had the `Authorization` header value stored as the literal template:

```diff
-  "value": "Bearer {{$env.SUPABASE_SERVICE_ROLE_KEY}}"
+  "value": "=Bearer {{$env.SUPABASE_SERVICE_ROLE_KEY}}"
```

Supabase PostgREST then received the literal string `Bearer {{$env.SUPABASE_SERVICE_ROLE_KEY}}` in the Authorization header and replied `{"code":"PGRST301","message":"JWSError (CompactDecodeError Invalid number of parts: Expected 3 parts; got 2)"}`. This defect **predates** the Apr-21 rotation — `WF_SUPERVISOR` had been silently failing every 30 minutes for 30+ days (≈1,440 failures), ~80/day on the main cron sweep. The error text is JWT-flavoured which is why this got lumped into the same audit as Family A, but the root cause is authoring-time, not rotation.

Affected active workflows:
- `WF_SUPERVISOR` — 11 nodes (reliability watchdog, every 30 min)
- `WF_ANALYTICS_CRON` — 6 nodes (daily YouTube analytics pull)

Closure pathway (per workflow): `docker exec n8n-n8n-1 n8n export:workflow --id=<WID>` → `jq '.[0].nodes |= map(...)'` to prepend `=` to every `.headerParameters.parameters[].value` whose value starts with `Bearer {{` → `docker exec n8n-n8n-1 n8n import:workflow --input=<path>`. Import auto-deactivates; reactivate via `POST /api/v1/workflows/<id>/activate` with `X-N8N-API-KEY` so the schedule trigger re-registers without an n8n restart.

Verification: `WF_SUPERVISOR` ran successfully at 2026-04-23 14:30:00 (execution 76352) — first green tick in 30+ days.

### Broad re-scan (2026-04-23 post-patch)

```
$ jq '.[] | .parameters.headerParameters.parameters[] |
       select(((.value//""|tostring)|contains("{{"))
          and ((.value//""|tostring)|startswith("=") | not))' \
    <every active VG workflow>                                  → 0 matches
```

### Rollback material

`/root/backups/jwt-fix-20260423T142023Z/` — 3 credential JSONs (pre-patch, decrypted) + 9 workflow JSONs + `credentials_entity.sql` table dump.

### Rotation runbook (additions for next rotation)

1. **After updating `/docker/supabase/.env`**, also enumerate encrypted n8n credentials and patch them:
   ```bash
   sqlite3 /var/lib/docker/volumes/n8n_data/_data/database.sqlite \
     "SELECT id,name,type FROM credentials_entity
      WHERE type IN ('httpHeaderAuth','supabaseApi')
         OR name LIKE '%Supabase%' OR name LIKE '%Bearer%' OR name LIKE '%DASHBOARD%'"
   # For each ID: export --decrypted → jq patch → import
   ```
2. **Before calling it done, scan for expression-authoring bugs** — the JWT-shape error can mask a static defect that's been lurking for months:
   ```bash
   jq '.[] | .parameters.headerParameters.parameters[]? |
        select(((.value//""|tostring)|contains("{{"))
           and ((.value//""|tostring)|startswith("=") | not))'
   ```

## Re-verification commands (on-demand)

```bash
# From repo root — run after any future change:
python tools/verify_prompt_sync.py
SSH_KEY=~/.ssh/id_ed25519_antigravity python tools/lint_n8n_workflows.py

# Re-probe RLS:
curl -sS -o /dev/null -w "%{http_code}\n" \
  "https://supabase.operscale.cloud/rest/v1/projects?select=*&limit=1" \
  -H "apikey: $OLD_ANON" -H "Authorization: Bearer $OLD_ANON"
# -> must be 401

# Re-probe webhook CSRF:
curl -sS -o /dev/null -w "%{http_code}\n" \
  -X POST https://dashboard.operscale.cloud/webhook/dashboard/read \
  -H "Origin: https://evil.example.com" -H "Content-Type: application/json" -d '{}'
# -> must be 403
```
