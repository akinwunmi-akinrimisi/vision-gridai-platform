# Auth + secrets architecture

How Vision GridAI authenticates between layers, and how to rotate
without breaking the chain. This page documents the **post-rotation
state** (after the 2026-04-21 + 2026-04-23 sweeps in `MEMORY.md`) and
the procedure that hardens future rotations against repeating the bugs
those sweeps uncovered.

!!! danger "No key material in this page"
    This page describes locations and procedures only. Live keys are
    on the VPS at `/root/keys_new.env` (`chmod 600`, root-only).
    Backup bundles live at `/root/backups/jwt-fix-<TIMESTAMP>/` —
    these are also root-only. Anyone who needs to read live values
    SSH's in.

## Three trust boundaries

The platform has three places where one component decides whether to
trust another:

1. **Browser → n8n webhooks** — `Authorization: Bearer
   $DASHBOARD_API_TOKEN`. The dashboard, an external operator with a
   token, or another workflow chain firing the next step in the pipeline.
2. **Anything → Supabase (PostgREST + Realtime)** — Kong's `key-auth`
   plugin checks `apikey` (ANON) and a JWT signed with `JWT_SECRET`
   (SERVICE_ROLE for server-to-server, ANON for read-only browser).
3. **n8n → external APIs** — n8n's stored credential store (encrypted
   at rest in `~/.n8n/database.sqlite`). HTTP Request nodes reference a
   credential ID; the secret never lives in the workflow JSON.

Every rotation must update **all the places that participate in a
boundary**. The 2026-04-23 sweep found the rotation that shipped on
2026-04-21 had only updated some of them.

## Webhook bearer auth

Token: `DASHBOARD_API_TOKEN`. Single shared secret bound to:

- **Dashboard:** `dashboard/.env` (local) and `/opt/dashboard/.env`
  (live VPS). The dashboard's API client injects it as
  `Authorization: Bearer ${import.meta.env.VITE_DASHBOARD_API_TOKEN}`.
- **n8n container:** `/docker/n8n/docker-compose.override.yml` env var.
  Resolved as `{{ $env.DASHBOARD_API_TOKEN }}` inside workflow nodes.
- **n8n credentials:** an `httpHeaderAuth` credential (id stored in
  `MEMORY.md`, currently `KtMyWD7uJJBZYLjt`) that wraps the same
  literal value, used by HTTP Request nodes that fire downstream
  webhooks.

After rotation, all three locations must be updated and the dashboard
must be rebuilt + redeployed (the token gets baked into the bundle).

### The missing-`=` expression trap

n8n string parameters that begin with `=` evaluate as expressions.
Without `=`, the literal `{{ $env.DASHBOARD_API_TOKEN }}` is sent over
the wire and the receiving endpoint rejects it. A 17-node sweep
(`WF_SUPERVISOR` 11, `WF_ANALYTICS_CRON` 6) had been failing silently
this way for ~30 days before Session 38 caught it.

**Lint rule `AUTH-01`** (in `tools/lint_n8n_workflows.py`) now fails
CI when an `Authorization` header value contains `{{` but does not
start with `=`. See [Architecture](../workflows/architecture.md#webhook-bearer-auth-the-missing-expression-trap).

## Supabase JWT chain

The single secret that signs every Supabase token is `JWT_SECRET` in
`/docker/supabase/.env`. From there, **four** downstream copies must
stay in sync:

| Location | What it holds | After rotation, do |
|---|---|---|
| `/docker/n8n/docker-compose.override.yml` | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` env vars | Replace literal values, restart n8n stack |
| `_realtime.tenants.jwt_secret` (DB rows) | Per-tenant JWT secret for Realtime — **two rows**: `realtime` and `realtime-dev` | `UPDATE _realtime.tenants SET jwt_secret = '<NEW>' WHERE name IN ('realtime', 'realtime-dev')` |
| `/docker/supabase/supabase/kong.yml` | Kong consumer credentials (key-auth plugin) | Replace ANON + SERVICE_ROLE values; **`docker exec supabase-kong-1 kong reload`** |
| `dashboard/.env` + `/opt/dashboard/.env` | `VITE_SUPABASE_ANON_KEY` | Replace, rebuild + redeploy dashboard |

Skipping any of these produces a different failure mode:

- Skip n8n env: HTTP Requests to PostgREST get
  `JWSError JWSInvalidSignature`.
- Skip Realtime tenants: dashboard's WSS subscription connects but
  immediately gets `401 jwt invalid`.
- Skip Kong reload: Kong serves the cached old keys; the new ones are
  rejected even though `kong.yml` has them.
- Skip dashboard: dashboard reads cached tokens from the prior build.

A typical rotation takes ~5 minutes when followed in order. A
rotation that misses one step typically isn't detected for days
because the failures are silent at most layers.

### After-rotation checklist

```bash
# 1. Generate new key + JWTs (locally)
openssl rand -base64 64 > /tmp/new_jwt_secret
# … use the secret to sign new ANON + SERVICE_ROLE tokens with
#    role=anon and role=service_role respectively, exp ~12 months.

# 2. SSH in
ssh -i ~/.ssh/id_ed25519_antigravity root@srv1297445.hstgr.cloud

# 3. Backup
mkdir -p /root/backups/jwt-fix-$(date -u +%Y%m%dT%H%M%SZ)
cp /docker/supabase/.env /docker/n8n/docker-compose.override.yml \
   /docker/supabase/supabase/kong.yml \
   /root/backups/jwt-fix-*/

# 4. Update Supabase .env
nano /docker/supabase/.env   # JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY

# 5. Update Kong + reload
nano /docker/supabase/supabase/kong.yml   # consumer creds
docker exec supabase-kong-1 kong reload

# 6. Update Realtime tenants (BOTH rows)
docker exec -it supabase-db-1 psql -U postgres -c \
  "UPDATE _realtime.tenants SET jwt_secret = '<NEW>' WHERE name IN ('realtime','realtime-dev');"

# 7. Restart Supabase stack
cd /docker/supabase && docker compose up -d

# 8. Update n8n env + restart
nano /docker/n8n/docker-compose.override.yml
cd /docker/n8n && docker compose up -d

# 9. Rotate stale n8n credentials (the most-missed step — see below)
#    For each httpHeaderAuth / supabaseApi credential that holds the
#    Supabase JWT or dashboard bearer:
docker exec -it n8n-n8n-1 n8n export:credentials --id=<ID> --decrypted --output=/tmp/cred.json
#    edit /tmp/cred.json, then:
docker exec -it n8n-n8n-1 n8n import:credentials --input=/tmp/cred.json

# 10. Update dashboard .env (local + VPS), rebuild, deploy
npm run build && scp -r dist/. root@srv1297445.hstgr.cloud:/opt/dashboard/

# 11. Update /root/keys_new.env (live source-of-truth, root-only)
chmod 600 /root/keys_new.env
```

### The post-rotation cleanup audit (Session 38 part 8)

After the 2026-04-21 rotation, **17 webhook nodes** across active VG
workflows were still firing with the wrong credential, and **2 more
workflows** (`WF_PROJECT_CREATE`, `WF_SCRIPT_APPROVE`) had a
`HTTP → Execute Workflow` chain pattern that lost auth on the
re-trigger. Total: **22 structural fixes across 16 workflows**.

The audit was deterministic — a sqlite scan of n8n's `credentials_entity`
table found every credential ID that was bound to a literal Supabase
JWT or dashboard bearer (rather than referenced through the credential
store). Each got `n8n export:credentials --decrypted` → jq patch →
`n8n import:credentials`.

**Lint rule `CRED-01`** now blocks PRs that add an HTTP node bound to
an inline `Authorization` header where a stored credential should be
used.

## n8n credential store

Stored at `~/.n8n/database.sqlite` inside `n8n-n8n-1`. Encrypted at
rest with `N8N_ENCRYPTION_KEY` (set in
`docker-compose.override.yml`). Workflow JSONs reference credentials
by ID; the secret never appears in the JSON.

Inspect:

```bash
docker exec -it n8n-n8n-1 sh -c \
  'sqlite3 /home/node/.n8n/database.sqlite \
   "SELECT id, name, type FROM credentials_entity ORDER BY name"'
```

Common types in this project:

- `httpHeaderAuth` — generic header-based auth (Anthropic, Fal.ai,
  Apify, SerpAPI, dashboard bearer).
- `supabaseApi` — Supabase service-role connection.
- `googleDriveOAuth2Api` — Drive OAuth (id `z0gigNHVnhcGz2pD`).
- `googleApi` — Google Cloud TTS, YouTube.
- `anthropicApi` — Anthropic API native auth (sometimes used in place of
  httpHeaderAuth).

## Lessons from the 2026-04-21 audit

The full audit is in `docs/SECURITY_AUDIT_2026_04_21.md`; the items
that drove permanent infrastructure changes:

- **C-1, C-2, C-3 (RLS lockdown).** Every VG public table was
  `FOR ALL USING (true)`. Migration 030 replaced that with
  `RESTRICTIVE FOR anon DENY` + `PERMISSIVE FOR service_role` across
  every table. The dashboard now reads through PostgREST with the
  service-role key (held only inside the dashboard's Vite env, not
  exposed to the browser at runtime — the build inlines it into the
  bundle that nginx serves over Traefik TLS).
- **H-1 (year-2099 JWT exp).** Old keys had `exp` in 2099 — effectively
  immortal. Rotation now defaults to a 1-year `exp`.
- **H-4 (caption_highlight_word shell injection).** The column was
  rendered into FFmpeg subtitle filters; user input could break out.
  Migration 031 adds a CHECK constraint blocking shell metacharacters.

The two outcomes that mattered structurally:

1. The `tools/lint_n8n_workflows.py` linter (147 workflows, 0 errors,
   advisory warnings only as of 2026-04-20) — the structural guarantee
   that the credential + auth bugs above don't reappear.
2. The `/root/backups/` discipline. Every rotation (and every linter
   batch) writes a timestamped bundle including the JSONs that were
   modified, so any rotation can be rolled back atomically.

If you're about to rotate, read this page top to bottom, then read
`MEMORY.md` "Auth (ROTATED AGAIN 2026-04-21 per audit H-1 …)" — that
section is the post-incident playbook in concrete shell commands.
