# VPS layout

The platform runs on a single Hostinger VPS. This page maps every
service to its filesystem location, container, and ownership boundary.

For request flow between services, see [Service Mesh](service-mesh.md).
For the post-rotation auth + secrets architecture, see
[Auth + Secrets](auth-secrets.md).

## Access

| Item | Value |
|---|---|
| SSH endpoint | `root@srv1297445.hstgr.cloud` |
| Key file | `~/.ssh/id_ed25519_antigravity` |
| Login command | `ssh -i ~/.ssh/id_ed25519_antigravity root@srv1297445.hstgr.cloud` |
| OS | Ubuntu 22.04 LTS (per Hostinger image) |
| Public hostnames (DNS / Traefik) | `n8n.srv1297445.hstgr.cloud`, `supabase.operscale.cloud`, `dashboard.operscale.cloud` |

## Filesystem layout

```text
/docker/
├── n8n/
│   ├── docker-compose.yml
│   ├── docker-compose.override.yml          # env vars (DASHBOARD_API_TOKEN, JWT, etc.)
│   └── (n8n-managed volumes)
├── supabase/
│   ├── docker-compose.yml
│   ├── .env                                 # Source of truth: JWT secret, DB password
│   ├── .env.bak.YYYY-MM-DD                  # Pre-rotation backups
│   └── supabase/
│       ├── kong.yml                         # Kong consumer keys (anon + service_role)
│       └── kong.yml.bak.YYYY-MM-DD
└── (other shared infra)

/data/
└── n8n-production/                          # n8n container volume mount for FFmpeg work
                                             # Hosts the localhost:9999 file server during assembly

/opt/
├── dashboard/                               # Static React build, served by nginx (Traefik-terminated)
└── caption-burn/
    ├── caption_burn_service.py              # Host-side FFmpeg + libass worker on :9998
    └── caption-burn.service                 # systemd unit

/root/
├── keys_new.env                             # Live-key source of truth (chmod 600, root-only)
└── backups/
    └── jwt-fix-YYYYMMDDTHHMMSSZ/            # Per-rotation rollback bundles (cred JSONs +
                                             # workflow JSONs + credentials_entity.sql)
```

## Containers

n8n stack (`/docker/n8n/`):

| Container | Image | Role |
|---|---|---|
| `n8n-n8n-1` | `n8nio/n8n` | n8n editor + worker (single-instance) |

Supabase stack (`/docker/supabase/`):

| Container | Role |
|---|---|
| `supabase-db-1` | Postgres 15 (the database) |
| `supabase-realtime-1` | Realtime websocket service |
| `supabase-rest-1` | PostgREST (auto-generated REST API) |
| `supabase-kong-1` | Kong gateway (key-auth plugin enforces ANON / SERVICE_ROLE keys) |
| `supabase-meta-1` | pg-meta (introspection for Studio) |
| `supabase-studio-1` | Studio UI (admin) |
| `supabase-auth-1` | GoTrue (auth — we don't use end-user auth, but the container is required) |
| `supabase-storage-1` | Storage API (unused; on for completeness) |
| `supabase-functions-1` | Edge functions runtime (unused) |
| `supabase-vector-1` | Logging vector |
| `supabase-imgproxy-1` | Image proxy (unused) |
| `supabase-analytics-1` | Logflare (analytics) |

Host-side services (not containerized):

| Service | Path | Port | systemd unit |
|---|---|---|---|
| Caption burn | `/opt/caption-burn/caption_burn_service.py` | `:9998` | `caption-burn.service` |
| Dashboard | `/opt/dashboard/` (static files via nginx in Traefik) | `:80` (internal) | nginx (containerized inside Traefik network) |
| Traefik | (Hostinger-managed) | `:443` | — |

The caption burn service runs **on the host** (not inside n8n) because
the n8n task runner OOMs when re-encoding with libass. The host
service uses `docker exec n8n-n8n-1 ffmpeg …` to run FFmpeg inside the
n8n container, where Drive credentials and the production volume live.

## Networking

- Docker bridge gateway: `172.18.0.1`. Use this from inside the
  `n8n-n8n-1` container to reach host-side services like the caption
  burn API on `:9998`. **Do not use `localhost`** — n8n's Node runtime
  resolves `localhost` to IPv6 `::1`, which doesn't reach the host.
- All public traffic terminates at Traefik; internal containers don't
  bind to host ports except the caption burn service (`:9998`) and the
  one-shot file server during assembly (`:9999`).

## Volumes

| Mount | Purpose |
|---|---|
| `n8n-production:/data/n8n-production` | Scratch space for FFmpeg-heavy steps. The captions/assembly workflow uses this as the source for the `:9999` HTTP file server during cross-container transfers. |
| `supabase-db-1:/var/lib/postgresql/data` | Postgres data dir |
| `n8n-n8n-1:/home/node/.n8n` | n8n state (workflows, credentials, executions) |

## Environment variables

The two files that hold runtime config:

- **`/docker/n8n/docker-compose.override.yml`** — n8n container env:
  `DASHBOARD_API_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `WF_*_ID` references, plus
  `NODE_FUNCTION_ALLOW_BUILTIN=child_process` (added Session 9 to
  unblock TTS + assembly Code nodes).
- **`/docker/supabase/.env`** — Supabase stack env: `POSTGRES_PASSWORD`,
  `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `SITE_URL`. Source of
  truth for the JWT chain (Kong consumers + Realtime tenants must be
  kept in sync — see [Auth + Secrets](auth-secrets.md)).

After editing either file, the affected stack must be restarted:

```bash
cd /docker/n8n && docker compose up -d
cd /docker/supabase && docker compose up -d
```

The Supabase Realtime container does **not** auto-pick-up new JWT
secrets from `.env` — the `_realtime.tenants.jwt_secret` rows must be
updated explicitly. See [Auth + Secrets](auth-secrets.md#after-rotation-checklist).

## Disk

```bash
df -h /
```

As of session 35 cleanup (2026-04-10): 39% used, 118 GB free. The biggest
ongoing growth sources are:

- `/data/n8n-production/` — production scratch (cleaned per topic
  after assembly).
- n8n binary data (`~/.n8n/binaryData/`) — re-clone every ~30 days or
  when individual run artifacts are no longer needed.
- Docker image layers — `docker system prune -af` after major upgrades.

## Health checks

Quick "is everything alive" command:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'n8n|supabase'
systemctl status caption-burn
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $DASHBOARD_API_TOKEN" \
  -X POST https://n8n.srv1297445.hstgr.cloud/webhook/status
```

The third command exercises the full Traefik → n8n auth path. Returns
`200` when healthy, `401` on stale token, `404` if `WF_WEBHOOK_STATUS`
is inactive.
