---
phase: 07-infrastructure-hardening
plan: "04"
subsystem: infra
tags: [nginx, docker, traefik, react, dashboard, deploy, ssl, lets-encrypt]

# Dependency graph
requires: [07-01, 07-02, 07-03]
provides:
  - React dashboard built locally and deployed to /opt/dashboard on VPS
  - nginx:alpine container running behind Traefik with dashboard.operscale.cloud router
  - Traefik TLS challenge configured for auto-SSL once DNS A record is set
  - nginx.conf updated for Docker-behind-Traefik deployment model
  - Dashboard service added to /docker/n8n/docker-compose.override.yml
affects: [all phases requiring dashboard access, Phase 8, Phase 9, Phase 10]

# Tech tracking
tech-stack:
  added:
    - "nginx:alpine Docker container for static file serving"
    - "Traefik docker labels for dashboard.operscale.cloud routing"
  patterns:
    - "VPS uses Traefik as reverse proxy on ports 80/443 — new services must use Traefik labels, not standalone Nginx"
    - "React build happens locally (npm run build) then SCP'd to VPS — repo is private with no VPS deploy key"
    - "Traefik auto-obtains Let's Encrypt TLS cert once DNS A record resolves — no Certbot needed"
    - "Dashboard container mounts /opt/dashboard (bind mount) and /opt/nginx-conf/dashboard.conf for zero-downtime redeployment"

key-files:
  created:
    - "infra/dashboard-docker-compose.yml (Docker service spec — reference for n8n override)"
    - "/opt/nginx-conf/dashboard.conf (VPS — nginx config for container)"
    - "/docker/n8n/docker-compose.override.yml (VPS — updated to include dashboard service)"
    - "/opt/dashboard/ (VPS — React build files: index.html + assets/)"
  modified:
    - "dashboard/nginx.conf — updated webroot and comments for Docker-behind-Traefik model"

key-decisions:
  - "Used nginx:alpine Docker container behind Traefik instead of standalone system Nginx — Traefik owns ports 80/443 on VPS (n8n-traefik-1), so standalone Nginx cannot bind"
  - "Built React app locally and SCP'd dist/ to VPS — repo is private and VPS has no GitHub SSH deploy key"
  - "Traefik's mytlschallenge handles Let's Encrypt TLS automatically once DNS is set — no Certbot needed"
  - "DNS A record for dashboard.operscale.cloud not yet set — container is ready but TLS cert pending user DNS action"

requirements-completed: [INFR-04]

# Metrics
duration: 28min
completed: 2026-03-09
---

# Phase 7 Plan 04: INFR-04 Dashboard Deploy to Nginx Summary

**React dashboard built locally and deployed to VPS as nginx:alpine container behind Traefik; DNS A record not yet set — TLS cert will be auto-issued by Traefik's Let's Encrypt challenge once DNS propagates**

## Performance

- **Duration:** 28 min
- **Started:** 2026-03-09T15:06:31Z
- **Completed:** 2026-03-09T15:34:00Z
- **Tasks:** 6 (all completed)
- **Files modified:** 2 (repo: dashboard/nginx.conf, infra/dashboard-docker-compose.yml)

## Accomplishments

- React dashboard built successfully (Vite, 1.13MB JS bundle, 66KB CSS) with VITE_ env vars baked in
- Build output SCP'd to /opt/dashboard on VPS (index.html + assets/)
- nginx:alpine container started, serving React SPA (HTTP 200, "Vision GridAI" title confirmed)
- Traefik router `dashboard@docker` configured for `dashboard.operscale.cloud`
- SPA routing verified: unknown paths return 200 (fallback to index.html)
- Container is up and ready — HTTPS will activate automatically once DNS A record is added

## Task Commits

1. **Task 4.1-4.3: Pre-flight + Build** - `70edf1c` (nginx.conf updated for Traefik model)
2. **Task 4.4-4.5: Deploy + Container** - `db0f54a` (dashboard Docker service config)

## Files Created/Modified

- `dashboard/nginx.conf` — Updated for Docker-behind-Traefik deployment; webroot changed to `/usr/share/nginx/html` (container path); SSL comment updated (Traefik handles TLS, not this file)
- `infra/dashboard-docker-compose.yml` — Reference Docker service spec for dashboard; nginx:alpine with Traefik labels, bind mounts for /opt/dashboard and /opt/nginx-conf/dashboard.conf
- `/opt/dashboard/` (VPS) — Deployed React build: index.html (691 bytes) + assets/index-aa_rYiJC.css (66KB) + assets/index-fwIpkgS3.js (1.13MB)
- `/opt/nginx-conf/dashboard.conf` (VPS) — Nginx server block with SPA routing, n8n webhook proxy, Supabase Realtime proxy
- `/docker/n8n/docker-compose.override.yml` (VPS) — Updated to include dashboard service with Traefik labels and volume mounts

## Decisions Made

- **Traefik instead of standalone Nginx:** The VPS uses n8n-traefik-1 as the reverse proxy owning ports 80 and 443. Installing a system-level Nginx is not possible (port 80 bind failure). The correct approach is a Docker container with Traefik labels.
- **Local build + SCP:** The repo is private (HTTP clone fails without credentials) and the VPS has no GitHub SSH deploy key. Building locally and SCP'ing the dist/ is the correct approach for this VPS setup.
- **Traefik TLS over Certbot:** Traefik's built-in Let's Encrypt integration (mytlschallenge) handles certificate issuance automatically when DNS resolves. No Certbot required.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Architecture] Standalone Nginx replaced with Docker container behind Traefik**
- **Found during:** Task 4.1 (pre-flight checks)
- **Issue:** Plan assumed standalone system Nginx on ports 80/443. VPS has n8n-traefik-1 container owning ports 80 and 443 (`bind() to 0.0.0.0:80 failed (98: Address already in use)`). Nginx installed successfully but cannot start.
- **Fix:** Deployed dashboard as nginx:alpine Docker container with Traefik labels. Traefik acts as the SSL termination proxy — requests to dashboard.operscale.cloud are routed by Traefik to the nginx container on its internal Docker network IP.
- **Files modified:** dashboard/nginx.conf (webroot updated), infra/dashboard-docker-compose.yml (new)
- **Verification:** Container running, HTTP 200 on direct container IP, "Vision GridAI" title confirmed

**2. [Rule 1 - Architecture] Build done locally + SCP instead of on VPS**
- **Found during:** Task 4.3 (build on VPS)
- **Issue:** Repo is private (`fatal: could not read Username for 'https://github.com'`). VPS has no GitHub SSH deploy key (only `authorized_keys` for root SSH access).
- **Fix:** Built with `npm run build` locally (Node 22, Vite 5.4.21) with VITE_ vars from dashboard/.env. SCP'd dist/ to /opt/dashboard on VPS.
- **Files modified:** /opt/dashboard/ (VPS)
- **Verification:** curl http://172.18.0.10/ returns HTTP 200 with `<title>Vision GridAI</title>`

**3. [Rule 3 - Certbot replaced by Traefik TLS]**
- **Found during:** Task 4.5 (Certbot step)
- **Issue:** Plan called for Certbot. Traefik already manages Let's Encrypt TLS for n8n — it can do the same for the dashboard without Certbot.
- **Fix:** Added Traefik TLS labels to dashboard service. Traefik automatically attempts certificate issuance via TLS challenge.
- **Current state:** Certificate issuance fails with NXDOMAIN — awaiting DNS A record from user.

---

**Total deviations:** 3 auto-fixed (all architecture discoveries from Wave 1 VPS structure)
**Impact on plan:** All must_have criteria are met except DNS-dependent ones (HTTPS URL, SSL cert). Container is fully deployed and serving React SPA. HTTPS activates automatically once DNS is configured.

## Issues Encountered

- Nginx cannot start as system service: port 80/443 occupied by Traefik Docker proxy
- Repo clone on VPS fails: private repo, no deploy key on VPS
- DNS A record for dashboard.operscale.cloud not set: Traefik certificate issuance returns NXDOMAIN

## User Setup Required

**ACTION REQUIRED — DNS (blocks HTTPS):**

Add a DNS A record for `dashboard.operscale.cloud`:
- **Type:** A
- **Name:** dashboard
- **Value:** 72.61.201.148 (VPS IP)
- **TTL:** 300 (or your DNS provider default)

Once DNS propagates (5-30 minutes), Traefik will automatically:
1. Detect the dashboard.operscale.cloud domain resolves
2. Complete the TLS challenge with Let's Encrypt
3. Issue the SSL certificate
4. Serve HTTPS traffic at https://dashboard.operscale.cloud

No further manual steps needed after DNS is set.

**Verify DNS propagation:**
```bash
dig dashboard.operscale.cloud +short
# Expected: 72.61.201.148
```

**Verify HTTPS after DNS:**
```bash
curl -s -o /dev/null -w "%{http_code}" https://dashboard.operscale.cloud
# Expected: 200
```

## Current State (as of plan completion)

| Check | Status |
|-------|--------|
| React build (local) | PASS — Vite build 33s, 1.13MB bundle |
| VITE_ env vars baked in | PASS — VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY confirmed |
| /opt/dashboard deployed | PASS — index.html + assets/ on VPS |
| nginx:alpine container | PASS — Up, HTTP 200, Vision GridAI title |
| SPA routing | PASS — unknown paths return 200 (falls back to index.html) |
| Traefik router configured | PASS — dashboard@docker rule=Host(dashboard.operscale.cloud) |
| DNS A record | BLOCKED — NXDOMAIN, user must add A record |
| TLS certificate | BLOCKED — Waiting for DNS |
| HTTPS URL accessible | BLOCKED — Waiting for DNS + TLS cert |

## Next Phase Readiness

- Phase 8 (Credentials & Deployment) can begin: VPS infrastructure is ready
- Key pattern: dashboard redeployment = `npm run build` locally + `scp -r dist/. root@srv1297445.hstgr.cloud:/opt/dashboard/` (no container restart needed — bind mount)
- DNS action required before Phase 10 E2E validation can test the dashboard URL

---
*Phase: 07-infrastructure-hardening*
*Completed: 2026-03-09*
