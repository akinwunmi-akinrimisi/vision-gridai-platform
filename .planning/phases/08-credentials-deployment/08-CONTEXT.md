# Phase 8: Credentials & Deployment — Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up n8n to run the production platform end-to-end: create the 6 required credentials, remove old stub workflows, import all 17 production workflow JSONs from the repo, activate them in the correct order, and ensure self-chaining env vars are set in the n8n container. No new code written — configuration and deployment only.

</domain>

<decisions>
## Implementation Decisions

### Credential Setup

**Credentials to create (in n8n credential manager):**

1. `Anthropic API Key` (httpHeaderAuth) — use `ANTHROPIC_API_KEY` from `.env`
2. `Supabase Service Role` (httpHeaderAuth) — use `SERVICE_ROLE_KEY` from `.env` (the actual JWT, not the `SUPABASE_SERVICE_ROLE_KEY` placeholder)
3. `Kie API Key` (httpHeaderAuth) — use `KIE_API` from `.env`
4. `Google Cloud TTS` (service account JSON) — `SERVICE_ACCOUNT=my-n8n-service-account.json` exists locally; upload/configure in n8n as a Google Cloud service account credential
5. `Google Drive` (googleDriveOAuth2Api) — **already exists on server**; verify with a test list call, skip setup
6. `YouTube OAuth2` (oAuth2Api) — **already exists on server**; verify with a test call, skip setup

**Credential entry method:** n8n REST API where possible (PATCH/POST to /api/v1/credentials). OAuth2 credentials already exist — verify only.

**Auth for n8n REST API:** `X-N8N-API-KEY` header using `N8N_API_KEY` from local `.env`.

### Stub Workflow Cleanup

- Discover via `GET /api/v1/workflows` — list all workflows currently on server
- Present the full list as a checkpoint for user confirmation (names + active status)
- User confirms which are stubs; executor then deletes confirmed ones via `DELETE /api/v1/workflows/{id}`
- Action: **Delete entirely** (not deactivate-only) — clean state for production

### Workflow Import Strategy

- **Method:** n8n REST API — `POST /api/v1/workflows` for each JSON file from local repo
- **Source:** `workflows/` directory in the repo — curl posts directly to n8n URL (no SCP needed)
- **Count:** 18 workflow JSON files to import (confirmed by research — CONTEXT.md originally said 17)
- **Activation order:**
  1. **Wave 1 — Webhook handlers first** (WF_WEBHOOK_PRODUCTION, WF_WEBHOOK_PROJECT_CREATE, WF_WEBHOOK_PUBLISH, WF_WEBHOOK_SETTINGS, WF_WEBHOOK_STATUS, WF_WEBHOOK_TOPICS_ACTION, WF_WEBHOOK_TOPICS_GENERATE) — these must be active before production workflows self-chain into them
  2. **Wave 2 — Production workflows** (all remaining: WF_TTS_AUDIO, WF_IMAGE_GENERATION, WF_I2V_GENERATION, WF_T2V_GENERATION, WF_CAPTIONS_ASSEMBLY, WF_YOUTUBE_UPLOAD, WF_ANALYTICS_CRON, WF_SUPERVISOR, WF_PROJECT_CREATE, WF_TOPICS_GENERATE, WF_TOPICS_ACTION)

### Env Var Configuration

**N8N_WEBHOOK_BASE:**
- Not currently set in n8n container (only in local `.env`)
- Add to `/docker/n8n/docker-compose.override.yml` on VPS, then restart n8n container
- Value: `https://n8n.srv1297445.hstgr.cloud/webhook`
- Same pattern as Phase 7 INFR-01 (docker-compose override)

**DASHBOARD_API_TOKEN:**
- Currently a placeholder in local `.env`
- Generate with `openssl rand -hex 32`
- Store generated value in local `.env` (replacing placeholder)
- Add to n8n container env (same docker-compose override as N8N_WEBHOOK_BASE)
- Workflows use this to authenticate callbacks to the dashboard

### Verification Method

For each requirement:
- DEPL-01: `GET /api/v1/credentials` confirms all 6 exist by name; Anthropic test = POST to `/v1/messages` with minimal payload
- DEPL-02: `GET /api/v1/workflows` shows no stubs in the list
- DEPL-03: `GET /api/v1/workflows` shows 17 production workflows with active=true
- DEPL-04: `docker exec n8n-n8n-1 env | grep N8N_WEBHOOK_BASE` shows the correct URL

### Claude's Discretion

- Exact sequence of curl commands for bulk import (batch vs sequential with error checking)
- Whether to test credential connectivity (e.g., Anthropic ping) or just verify the credential record exists
- Error handling if a workflow import fails (continue others or stop)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `workflows/*.json` (17 files): All production workflow JSONs ready to import. Already use `$env.N8N_WEBHOOK_BASE` for self-chaining in most workflows.
- `.env`: Contains `N8N_API_KEY`, `SERVICE_ROLE_KEY`, `KIE_API`, `N8N_WEBHOOK_BASE` — executor reads these for credential values and API auth
- `my-n8n-service-account.json`: Google service account file referenced in `.env` — needed for Google Cloud TTS credential

### Established Patterns
- **docker-compose override on VPS** — Phase 7 established: edit `/docker/n8n/docker-compose.override.yml`, restart container. Same pattern for adding N8N_WEBHOOK_BASE and DASHBOARD_API_TOKEN.
- **n8n REST API auth** — `X-N8N-API-KEY: <N8N_API_KEY>` header pattern for all n8n API calls
- **Supabase credential pattern** — httpHeaderAuth with `apikey` and `Authorization: Bearer` headers; value = SERVICE_ROLE_KEY JWT

### Integration Points
- `workflows/` → n8n server (import via REST API)
- `/docker/n8n/docker-compose.override.yml` on VPS → n8n container env vars
- `.env` (local) → source of truth for credential values used in n8n

### Key Detail: Supabase Keys
- `.env` has TWO Supabase key entries:
  - `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here` — placeholder (do NOT use)
  - `SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` — actual JWT (use this)
  - `ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` — actual anon JWT

### WF_SUPERVISOR Note
- Has a hardcoded fallback: `$env.N8N_WEBHOOK_BASE || 'https://n8n.srv1297445.hstgr.cloud/webhook'`
- Once N8N_WEBHOOK_BASE is set in container, the env var takes precedence — no code change needed

</code_context>

<specifics>
## Specific Ideas

- Discovery-first for stub cleanup: present the list of current n8n workflows as a checkpoint before any deletions proceed — user confirms
- Activation in two waves preserves self-chain integrity (webhook receivers live before producers fire)
- DASHBOARD_API_TOKEN generated fresh; value stored in both local .env and n8n container env simultaneously

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-credentials-deployment*
*Context gathered: 2026-03-09*
