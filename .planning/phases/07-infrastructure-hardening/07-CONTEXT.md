# Phase 7: Infrastructure Hardening — Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply Docker memory limits, PostgreSQL NVMe tuning, n8n environment variables, and deploy the React dashboard to Nginx on the VPS. This phase makes the VPS runtime stable and correctly configured for production workloads. No application code changes — infrastructure and deployment only.

</domain>

<decisions>
## Implementation Decisions

### Plan Structure
- 4 plans, one per requirement: INFR-01 (memory limits), INFR-02 (PG tuning), INFR-03 (n8n env vars), INFR-04 (dashboard deploy)
- Each plan is independently verifiable and can be executed in parallel waves

### Config Update Strategy
- Source of truth: `infra/docker-compose.override.yml` in the repo (updated with correct 16GB VPS limits)
- Workflow: **commit first, then apply** — update file locally → commit and push → SSH into VPS → git pull → docker compose restart
- Rollback: `git revert HEAD` on VPS if a container fails to start
- Apply method: SSH + step-by-step commands (no CI/CD pipeline, no Ansible)
- VPS SSH: `ssh root@srv1297445.hstgr.cloud`

### Docker Memory Limits (INFR-01)
- Target limits (updating from current conservative values):
  - n8n: 4GB (was 1536M)
  - supabase-db: 4GB (was 1024M)
  - supabase-realtime: 1GB (was 512M)
  - supabase-rest: 512MB (was 256M)
- Downtime: brief full restart is acceptable (solo operator, no active users during maintenance)
- Restart: `docker compose down && docker compose up -d` — all at once, no staging
- Verification: `docker stats --no-stream` to confirm memory limits per container

### PostgreSQL NVMe Tuning (INFR-02)
- Target values: `shared_buffers=1GB`, `effective_cache_size=3GB`, `random_page_cost=1.1`
- Applied via command-line flags in the docker-compose override (existing pattern)
- Add `shm_size: 256m` at the supabase-db service level (required for shared_buffers=1GB to work in Docker)
- Verification: `docker exec <postgres-container> psql -U postgres -c 'SHOW shared_buffers; SHOW effective_cache_size; SHOW random_page_cost;'`
- Postgres container name: determine with `docker ps --format '{{.Names}}' | grep -i postgres` first

### n8n Environment Variables (INFR-03)
- Add to the n8n service in docker-compose.override.yml:
  - `N8N_PAYLOAD_SIZE_MAX=256` (missing from current override)
  - `N8N_BINARY_DATA_TTL=168` (7 days — completes pruning config)
  - `NODE_OPTIONS=--max-old-space-size=2048` (update from current 1024)
  - `EXECUTIONS_TIMEOUT=600` (already set — verify it survives the update)
- Container name for exec commands: `n8n-ffmpeg` (per CLAUDE.md)
- Verification: `docker exec n8n-ffmpeg env | grep -E 'EXECUTIONS|NODE_OPTIONS|N8N_PAYLOAD|N8N_BINARY'`

### Dashboard Deploy Target (INFR-04)
- URL: `https://dashboard.operscale.cloud`
- SSL: HTTPS via Certbot (Let's Encrypt) — same pattern as n8n on the VPS
- Nginx root: `/opt/dashboard` (matches existing nginx.conf template)
- Nginx proxy section: keep as-is (proxies /webhook/ to n8n, /supabase/ to Supabase)
- DNS: include `dig dashboard.operscale.cloud` check — if not resolved, surface for manual DNS A record setup before Certbot
- Nginx installed: include `which nginx` check — if not installed, `apt install nginx`

### Dashboard Build Process
- Build location: **on the VPS** (SSH in, not local build + SCP)
- Repo location on VPS: `/root/vision-gridai-platform`
- Repo status: include `ls /root/vision-gridai-platform` check — if missing, `git clone <repo>`, else `git pull`
- Node.js: include `node --version` check — if missing, install via nvm or apt
- Env vars: `supabase.js` uses `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY` (confirmed from source)
  - Check if `dashboard/.env` exists on VPS first
  - If missing, create it with correct VITE_ values before building
- Build command: `npm install && npm run build`
- Deploy: `rm -rf /opt/dashboard/* && cp -r /root/vision-gridai-platform/dashboard/dist/. /opt/dashboard/`
- Permissions: `chown -R www-data:www-data /opt/dashboard` after copy
- Pre-deploy: `mkdir -p /opt/dashboard` if it doesn't exist
- Disk check: `df -h /root` — verify ≥2GB free before npm install
- Nginx reload: `nginx -t && systemctl reload nginx` after config install

### Supabase Compose Location
- Location on VPS: unknown — include `find /root -name docker-compose.yml 2>/dev/null` to locate it
- The docker-compose.override.yml in the repo (`infra/docker-compose.override.yml`) is applied with `-f` flag targeting the found Supabase compose directory

### VPS Access
- SSH: `ssh root@srv1297445.hstgr.cloud`
- User: root (Hostinger KVM standard)

### Claude's Discretion
- Exact Nginx site config filename (e.g., `vision-gridai` or `dashboard`)
- Whether to use `sites-available` + symlink or write directly to `sites-enabled`
- Order of operations within a plan (e.g., verify → configure → restart → verify)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `infra/docker-compose.override.yml`: Exists with lower limits. Update in place — same structure, just update memory values and add missing env vars.
- `dashboard/nginx.conf`: Template already written for HTTP on `dashboard.operscale.cloud` with correct proxy rules. Needs port 80 → 443 upgrade and SSL directives for Certbot.
- `dashboard/vite.config.js`: Build config ready (`npm run build` outputs to `dist/`). No changes needed.
- `dashboard/package.json`: Standard Vite React setup. `npm run build` is the correct command.
- `dashboard/src/lib/supabase.js`: Uses `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY` — VITE_ env vars **must** be present in `dashboard/.env` before build.

### Established Patterns
- CLAUDE.md uses `docker exec n8n-ffmpeg` for container access — container name is `n8n-ffmpeg`, not `n8n`
- n8n URL: `https://n8n.srv1297445.hstgr.cloud` — used in nginx proxy config and vite proxy config
- Supabase URL: `https://supabase.operscale.cloud` — used in nginx proxy config
- All commands reference the VPS via hostname `srv1297445.hstgr.cloud`

### Integration Points
- `infra/docker-compose.override.yml` feeds into whatever docker-compose.yml hosts n8n + Supabase on the VPS
- `dashboard/nginx.conf` gets deployed to `/etc/nginx/sites-available/` on the VPS
- `dashboard/dist/` gets deployed to `/opt/dashboard/` on the VPS

</code_context>

<specifics>
## Specific Ideas

- "Commit first, then apply" — repo is source of truth for config, VPS always catches up via git pull
- Docker stats verification is the primary acceptance check for INFR-01 (visual memory limit confirmation)
- psql SHOW commands are the primary acceptance check for INFR-02 (confirms PG actually loaded tuning values)
- docker exec env grep is the primary acceptance check for INFR-03 (confirms n8n env vars in live container)
- Browser access to https://dashboard.operscale.cloud is the acceptance check for INFR-04

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-infrastructure-hardening*
*Context gathered: 2026-03-09*
