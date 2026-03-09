# Phase 8: Credentials & Deployment - Research

**Researched:** 2026-03-09
**Domain:** n8n credential management, workflow import via REST API, Docker env var injection
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Credential Setup:**
1. `Anthropic API Key` (httpHeaderAuth) — use `ANTHROPIC_API_KEY` from `.env`
2. `Supabase Service Role` (httpHeaderAuth) — use `SERVICE_ROLE_KEY` from `.env` (the actual JWT, not the `SUPABASE_SERVICE_ROLE_KEY` placeholder)
3. `Kie API Key` (httpHeaderAuth) — use `KIE_API` from `.env`
4. `Google Cloud TTS` (service account JSON) — `SERVICE_ACCOUNT=my-n8n-service-account.json` exists locally; upload/configure in n8n as a Google Cloud service account credential
5. `Google Drive` (googleDriveOAuth2Api) — already exists on server; verify with a test list call, skip setup
6. `YouTube OAuth2` (oAuth2Api) — already exists on server; verify with a test call, skip setup

**Credential entry method:** n8n REST API where possible (PATCH/POST to /api/v1/credentials). OAuth2 credentials already exist — verify only.

**Auth for n8n REST API:** `X-N8N-API-KEY` header using `N8N_API_KEY` from local `.env`.

**Stub Workflow Cleanup:** Discover via `GET /api/v1/workflows`, present list as checkpoint for user confirmation, delete confirmed stubs via `DELETE /api/v1/workflows/{id}`. Delete entirely (not deactivate-only).

**Workflow Import Strategy:** n8n REST API — `POST /api/v1/workflows` for each JSON file from local repo. 18 workflow JSON files in `workflows/` directory (CONTEXT.md says 17, actual count is 18 — confirm before planning).

**Activation order:**
- Wave 1: Webhook handlers first (WF_WEBHOOK_PRODUCTION, WF_WEBHOOK_PROJECT_CREATE, WF_WEBHOOK_PUBLISH, WF_WEBHOOK_SETTINGS, WF_WEBHOOK_STATUS, WF_WEBHOOK_TOPICS_ACTION, WF_WEBHOOK_TOPICS_GENERATE)
- Wave 2: Production workflows (all remaining)

**Env Var Configuration:**
- `N8N_WEBHOOK_BASE` and `DASHBOARD_API_TOKEN` added to `/docker/n8n/docker-compose.override.yml` on VPS, then container restarted
- `DASHBOARD_API_TOKEN` generated with `openssl rand -hex 32`, stored in local `.env` and n8n container env simultaneously

**Verification:**
- DEPL-01: `GET /api/v1/credentials` confirms all 6 exist by name; Anthropic test = POST to `/v1/messages` with minimal payload
- DEPL-02: `GET /api/v1/workflows` shows no stubs
- DEPL-03: `GET /api/v1/workflows` shows 18 production workflows with active=true
- DEPL-04: `docker exec n8n-n8n-1 env | grep N8N_WEBHOOK_BASE` shows correct URL

### Claude's Discretion

- Exact sequence of curl commands for bulk import (batch vs sequential with error checking)
- Whether to test credential connectivity (e.g., Anthropic ping) or just verify the credential record exists
- Error handling if a workflow import fails (continue others or stop)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPL-01 | n8n production credentials created (Anthropic API key, Supabase service role, Google Cloud TTS, Kie.ai API, Google Drive OAuth, YouTube OAuth) | Credential type mapping, REST API body format, exact credential IDs from workflow files |
| DEPL-02 | v1.0 stub workflows deactivated to clear webhook path collisions | n8n REST API discovery + delete pattern; user checkpoint before deletion |
| DEPL-03 | All v1.0 production workflow JSONs imported and activated in n8n | 18 workflow files confirmed in `workflows/`; two-wave activation order; REST API import format |
| DEPL-04 | Webhook URLs use $env.N8N_WEBHOOK_BASE expressions (not hardcoded URLs) for self-chaining | Env vars not yet in n8n container; docker-compose override pattern established in Phase 7 |
</phase_requirements>

---

## Summary

Phase 8 is a pure configuration and deployment phase — no new code is written. Four operations must complete in order: (1) add env vars to the n8n container so `$env.N8N_WEBHOOK_BASE` resolves, (2) create the 4 new credentials via n8n REST API (Anthropic, Supabase Service Role, Kie.ai, Google Cloud TTS), (3) clean up any stub workflows from the server, and (4) import and activate all 18 production workflow JSON files from the `workflows/` directory.

The technical path is well-understood from direct inspection of the workflow files and the established Phase 7 docker-compose override pattern. All credential values are present in the local `.env`. The workflows are already on disk and their credential reference IDs are verified — the n8n credentials must be created with IDs that exactly match what the workflow JSON files specify.

The one critical discovery: the TTS workflow uses `"authentication": "predefinedCredentialType"` with `"nodeCredentialType": "googleApi"` — this is n8n's built-in Google service account credential type, NOT httpHeaderAuth. The n8n REST API cannot create OAuth2 or Google service account credentials via JSON (they require browser-side token exchange). The Google Cloud TTS credential must be created via the n8n UI using the service account JSON file.

**Primary recommendation:** Do DEPL-04 (env vars) first as a separate plan — it requires an SSH session and container restart, and `$env.N8N_WEBHOOK_BASE` being available at import time prevents the `WF_SUPERVISOR` hardcoded fallback from persisting.

---

## Standard Stack

### Core Tools

| Tool | Version/Path | Purpose |
|------|-------------|---------|
| n8n REST API | `https://n8n.srv1297445.hstgr.cloud/api/v1` | Credential CRUD, workflow import, workflow activation |
| curl | system | HTTP calls from local machine to n8n API |
| SSH | system | Access VPS for docker-compose override edits |
| docker exec | system | Verify env vars inside running container |

### Established Patterns (from Phase 7)

| Pattern | Source | Reuse |
|---------|--------|-------|
| docker-compose override | Phase 7 07-01-PLAN.md | Add env vars to `/docker/n8n/docker-compose.override.yml` on VPS |
| n8n REST API auth | CONTEXT.md | `X-N8N-API-KEY: <N8N_API_KEY>` header on every call |
| Supabase REST | All workflows | `apikey` + `Authorization: Bearer` headers |

---

## Architecture Patterns

### Credential ID Mapping (CRITICAL)

Workflows reference credentials by ID string, not by UUID. The IDs hardcoded in the workflow JSON files must match the credential IDs created in n8n. If they don't match, workflows will fail at the credential lookup step.

**Verified credential IDs from workflow JSON inspection:**

| Workflow Credential ID | n8n Credential Name | Type | Env var / File |
|------------------------|--------------------|----|----------------|
| `anthropic-api-key` | `Anthropic API Key` | `httpHeaderAuth` | `ANTHROPIC_API_KEY` from `.env` |
| `supabase-service-role` | `Supabase Service Role` | `httpHeaderAuth` | `SERVICE_ROLE_KEY` from `.env` |
| `kie-api-key` | `Kie API Key` | `httpHeaderAuth` | `KIE_API` from `.env` |
| `google-drive-cred` | `Google Drive` | `googleDriveOAuth2Api` | Already exists — verify ID matches |
| `youtube-oauth2` | `YouTube OAuth2` | `oAuth2Api` | Already exists — verify ID matches |
| (TTS — no credential ID) | Google Cloud TTS | `googleApi` | `my-n8n-service-account.json` |

Note: The TTS node (`WF_TTS_AUDIO.json`, node `tts-api-call`) does NOT reference a credential by ID — it uses `"authentication": "predefinedCredentialType"` + `"nodeCredentialType": "googleApi"`. This means n8n resolves the credential by type (any `googleApi` credential on the instance). It must be created via n8n UI.

### n8n REST API Credential Creation

**POST `/api/v1/credentials`** — creates a new credential.

```bash
# httpHeaderAuth credential (for Anthropic, Supabase Service Role, Kie.ai)
curl -X POST https://n8n.srv1297445.hstgr.cloud/api/v1/credentials \
  -H "X-N8N-API-KEY: <N8N_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Anthropic API Key",
    "type": "httpHeaderAuth",
    "data": {
      "name": "x-api-key",
      "value": "<ANTHROPIC_API_KEY>"
    }
  }'
```

The response includes the created credential object. The credential `id` in the response is the UUID n8n assigns internally — but the workflow JSON files reference credentials by the string ID hardcoded in the JSON (e.g., `"id": "anthropic-api-key"`). When n8n imports a workflow and the credential ID in the JSON doesn't match an existing credential UUID, n8n will either prompt for re-linking or leave the credential unlinked. This is a known n8n behavior.

**Resolution approach:** After importing each workflow, verify the credential links are correct in the n8n UI or via `GET /api/v1/workflows/{id}` and inspect node credentials. If credential IDs don't auto-link (likely because JSON has string IDs like `"anthropic-api-key"` but n8n assigns UUIDs), use `PATCH /api/v1/workflows/{id}` to update the credential references in affected nodes.

**Confidence for REST API credential creation:** HIGH — this endpoint is documented and used in the n8n public API. The body format (`name`, `type`, `data`) is confirmed from n8n community and official docs.

### Google Cloud TTS Credential (UI-only)

The TTS node uses `nodeCredentialType: "googleApi"` which is n8n's built-in Google Service Account type. This credential type:

1. Cannot be created via the REST API (requires file upload or token exchange in browser)
2. Requires the service account JSON file to be provided via the n8n UI
3. Must have the Cloud Text-to-Speech API scope enabled for the service account

**Creation procedure:**
1. Open n8n UI → Settings → Credentials → New
2. Search for "Google" → select "Google API" (service account type, not OAuth2)
3. Paste the full contents of `my-n8n-service-account.json` into the "Service Account JSON" field
4. Save as "Google Cloud TTS"

The `my-n8n-service-account.json` file is confirmed at the project root:
- Service account: `my-n8n-service-account@vision-gridai.iam.gserviceaccount.com`
- Project: `vision-gridai`
- File is valid JSON with `private_key`, `client_email`, and all required fields

### Workflow Import Pattern

```bash
# Import a single workflow
curl -X POST https://n8n.srv1297445.hstgr.cloud/api/v1/workflows \
  -H "X-N8N-API-KEY: <N8N_API_KEY>" \
  -H "Content-Type: application/json" \
  -d @workflows/WF_WEBHOOK_STATUS.json
```

**Activation after import:**
```bash
# Activate a workflow by ID (returned in POST response)
curl -X PATCH https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/<id>/activate \
  -H "X-N8N-API-KEY: <N8N_API_KEY>"
```

**List all workflows:**
```bash
curl https://n8n.srv1297445.hstgr.cloud/api/v1/workflows \
  -H "X-N8N-API-KEY: <N8N_API_KEY>"
```

**Delete a workflow:**
```bash
curl -X DELETE https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/<id> \
  -H "X-N8N-API-KEY: <N8N_API_KEY>"
```

### Docker-Compose Override Pattern (Phase 7 established)

SSH to VPS, edit `/docker/n8n/docker-compose.override.yml`:

```yaml
services:
  n8n:
    environment:
      - N8N_WEBHOOK_BASE=https://n8n.srv1297445.hstgr.cloud/webhook
      - DASHBOARD_API_TOKEN=<generated-32-byte-hex>
```

Restart:
```bash
cd /docker/n8n
docker compose up -d
```

Verify:
```bash
docker exec n8n-n8n-1 env | grep N8N_WEBHOOK_BASE
docker exec n8n-n8n-1 env | grep DASHBOARD_API_TOKEN
```

The n8n container name is `n8n-n8n-1` (confirmed Phase 7, not `n8n-ffmpeg` as CLAUDE.md states).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Credential storage | Custom secret store | n8n credential manager | Handles encryption, scoping, audit trail |
| Workflow import | Script that modifies JSON | n8n REST API POST | API handles node linking, schema validation |
| Bulk activation | Shell loop with sleep | Sequential curl with response checking | API returns 200/error; check each before proceeding |
| Google TTS auth | httpHeaderAuth with manual JWT | n8n googleApi predefined type | Service account token rotation is automatic |

---

## Common Pitfalls

### Pitfall 1: Credential ID Mismatch After Import
**What goes wrong:** Workflow JSON has string IDs like `"id": "anthropic-api-key"`. n8n assigns UUID-based IDs when credentials are created. Importing the workflow does NOT auto-link credentials — nodes show "credential not found" errors.
**Why it happens:** n8n's import process matches credential references by UUID, not by name or string ID.
**How to avoid:** After importing each workflow, check if credentials are linked. If not, use n8n UI to re-select the correct credential for unlinked nodes, OR update the workflow JSON before import to use the actual UUID from the `POST /api/v1/credentials` response.
**Warning signs:** Workflow imports without error but fails on first execution with "credential not found" or "credential is not of type httpHeaderAuth".

### Pitfall 2: Container Restart Loses Prior Override Values
**What goes wrong:** When editing the docker-compose override to add N8N_WEBHOOK_BASE, existing override values (from Phase 7) are accidentally removed.
**Why it happens:** Overwriting the override file rather than appending to it.
**How to avoid:** Always read the current override file first (`cat /docker/n8n/docker-compose.override.yml`), then add the new env vars to the existing `environment:` block. Don't replace the whole file.
**Warning signs:** n8n starts but `NODE_OPTIONS` or `N8N_PAYLOAD_SIZE_MAX` env vars are missing from `docker exec n8n-n8n-1 env`.

### Pitfall 3: Workflow Import Creates Duplicate Webhook Paths
**What goes wrong:** Existing stub workflows on the server have webhook triggers with the same `path` values (e.g., `production/tts`). Importing v1.1 workflows without first deleting stubs causes path collision — n8n will refuse to activate the new workflow.
**Why it happens:** n8n enforces unique webhook paths per instance. Two active workflows cannot share the same webhook URL.
**How to avoid:** Complete stub cleanup (DEPL-02) before workflow import (DEPL-03). Confirm zero active stubs before starting import.
**Warning signs:** `PATCH .../activate` returns 400 or 409 error mentioning duplicate webhook path.

### Pitfall 4: WF_SUPERVISOR Env Var Fallback
**What goes wrong:** `WF_SUPERVISOR.json` has `$env.N8N_WEBHOOK_BASE || 'https://n8n.srv1297445.hstgr.cloud/webhook'` as a fallback. If `N8N_WEBHOOK_BASE` is not set before import, the hardcoded URL is used as a default in the Code node expression.
**Why it happens:** JavaScript `||` operator evaluates at runtime. If env var is missing, fallback activates.
**How to avoid:** Complete DEPL-04 (add N8N_WEBHOOK_BASE to container env) before importing workflows. Restart container and verify env var present before any import.
**Warning signs:** `docker exec n8n-n8n-1 env | grep N8N_WEBHOOK_BASE` returns nothing.

### Pitfall 5: Google Drive / YouTube Credential ID Mismatch
**What goes wrong:** Workflows reference `"id": "google-drive-cred"` and `"id": "youtube-oauth2"` but the existing credentials on the server have different UUIDs.
**Why it happens:** Credentials created in n8n UI get UUID-based IDs, not the human-readable string IDs in the workflow JSONs.
**How to avoid:** After discovering existing credentials via `GET /api/v1/credentials`, note their actual UUIDs. If the string IDs in the workflow JSON don't match, update nodes via `PATCH /api/v1/workflows/{id}` or re-link in the UI.
**Warning signs:** Google Drive upload or YouTube API nodes fail with authentication errors despite credentials existing.

### Pitfall 6: Workflow Count Discrepancy
**What goes wrong:** CONTEXT.md references 17 workflow files but the `workflows/` directory contains 18 JSON files.
**Why it happens:** One file was added after the CONTEXT.md was written.
**How to avoid:** Use `ls workflows/*.json | wc -l` before planning to get the exact count. Import all 18.
**Warning signs:** A workflow is missing from n8n after bulk import.

---

## Code Examples

### Anthropic Test Call (DEPL-01 verification)

```bash
# Minimal test — proves Anthropic credential works
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: <ANTHROPIC_API_KEY>" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-haiku-20240307","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
# Expected: {"id":"msg_...","content":[{"text":"Hi!","type":"text"}],...}
```

### Supabase Service Role Test Call

```bash
# Minimal test — proves Supabase credential works
curl "https://supabase.operscale.cloud/rest/v1/projects?select=id&limit=1" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
# Expected: [] or [{...}] — not 401
```

### n8n Workflow List Discovery

```bash
# Discover all current workflows (for stub identification)
curl "https://n8n.srv1297445.hstgr.cloud/api/v1/workflows?limit=100" \
  -H "X-N8N-API-KEY: <N8N_API_KEY>" \
  | python3 -c "import sys,json; wfs=json.load(sys.stdin)['data']; [print(w['id'], w['active'], w['name']) for w in wfs]"
```

### Bulk Workflow Import (sequential with error checking)

```bash
# Import all workflows in Wave 1 order
WEBHOOK_WORKFLOWS=(
  WF_WEBHOOK_STATUS
  WF_WEBHOOK_PROJECT_CREATE
  WF_WEBHOOK_TOPICS_GENERATE
  WF_WEBHOOK_TOPICS_ACTION
  WF_WEBHOOK_PRODUCTION
  WF_WEBHOOK_PUBLISH
  WF_WEBHOOK_SETTINGS
)

for wf in "${WEBHOOK_WORKFLOWS[@]}"; do
  echo "Importing $wf..."
  RESULT=$(curl -s -X POST "https://n8n.srv1297445.hstgr.cloud/api/v1/workflows" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    -d @"workflows/${wf}.json")
  WF_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','ERROR'))")
  echo "  -> ID: $WF_ID"
  if [ "$WF_ID" != "ERROR" ]; then
    curl -s -X PATCH "https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/${WF_ID}/activate" \
      -H "X-N8N-API-KEY: $N8N_API_KEY" > /dev/null
    echo "  -> Activated"
  fi
done
```

### DASHBOARD_API_TOKEN Generation

```bash
# Generate fresh token and store in local .env
NEW_TOKEN=$(openssl rand -hex 32)
echo "DASHBOARD_API_TOKEN=$NEW_TOKEN"
# Then: update local .env and add to /docker/n8n/docker-compose.override.yml on VPS
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| n8n credential IDs as arbitrary strings | n8n assigns UUIDs; JSON string IDs need re-linking after import | Workflow import always requires credential verification step |
| Single docker-compose file | Override files per environment | Phase 7 established the override pattern — reuse exactly |
| OAuth2 creds created via API | OAuth2/Google creds require UI (token exchange) | Google Cloud TTS and Drive/YouTube must be created/verified in UI |

---

## Open Questions

1. **Do existing Google Drive / YouTube credentials match the expected string IDs in the workflow JSON?**
   - What we know: Workflows expect `"id": "google-drive-cred"` and `"id": "youtube-oauth2"`
   - What's unclear: Whether the server credentials already have these exact string IDs or UUIDs
   - Recommendation: `GET /api/v1/credentials` early and check. If IDs don't match, the plan must include a step to patch credential references in the imported workflows.

2. **Exact count of stub workflows on the server**
   - What we know: Discovery step will reveal all current workflows
   - What's unclear: How many stubs exist from prior testing and what their names are
   - Recommendation: Discovery plan must present full list as a checkpoint before any deletion. Cannot plan exact delete count in advance.

3. **Does `/docker/n8n/docker-compose.override.yml` already exist on the VPS?**
   - What we know: Phase 7 used `/docker/supabase/` and `/docker/n8n/` as separate compose stacks; Phase 7 plans used `infra/docker-compose.override.yml` in the repo (which was then applied via `-f` flag), not a VPS-side override file
   - What's unclear: Whether a VPS-side `/docker/n8n/docker-compose.override.yml` already exists (vs the in-repo template)
   - Recommendation: SSH discovery step must check for existing override and read it before modifying.

---

## Validation Architecture

> nyquist_validation is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual curl verification (no automated test runner — infrastructure phase) |
| Config file | None |
| Quick run command | `curl -s https://n8n.srv1297445.hstgr.cloud/api/v1/workflows -H "X-N8N-API-KEY: $N8N_API_KEY" \| python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['data']), 'workflows')"` |
| Full suite command | See per-requirement verification commands below |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPL-01 | All 6 credentials exist and respond | smoke | `curl https://n8n.srv1297445.hstgr.cloud/api/v1/credentials -H "X-N8N-API-KEY: $N8N_API_KEY"` + count check | ❌ Wave 0 |
| DEPL-01 | Anthropic credential works | smoke | `curl -X POST https://api.anthropic.com/v1/messages -H "x-api-key: $ANTHROPIC_API_KEY" ...` | ❌ Wave 0 |
| DEPL-02 | Zero stub workflows active | smoke | `GET /api/v1/workflows` → count active stubs = 0 | ❌ Wave 0 |
| DEPL-03 | 18 workflows imported and active | smoke | `GET /api/v1/workflows` → count active = 18 | ❌ Wave 0 |
| DEPL-04 | N8N_WEBHOOK_BASE set in container | smoke | `docker exec n8n-n8n-1 env \| grep N8N_WEBHOOK_BASE` → returns value | ❌ Wave 0 |
| DEPL-04 | DASHBOARD_API_TOKEN set in container | smoke | `docker exec n8n-n8n-1 env \| grep DASHBOARD_API_TOKEN` → returns value | ❌ Wave 0 |

All tests are manual smoke tests executed via curl + SSH. No automated test file needed — these are direct API/container checks.

### Sampling Rate

- **Per task commit:** Run the relevant verification curl for that task
- **Per wave merge:** Run all 6 smoke checks above
- **Phase gate:** All 6 green before `/gsd:verify-work`

### Wave 0 Gaps

None — no test files to create. All verification is ad-hoc curl commands included directly in task plans.

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of `workflows/*.json` files — credential IDs, types, env var references
- Direct inspection of `.env` — available credential values
- `workflows/WF_TTS_AUDIO.json` node `tts-api-call` — confirmed `predefinedCredentialType: googleApi`
- `workflows/WF_SUPERVISOR.json` — confirmed `$env.N8N_WEBHOOK_BASE || 'https://...'` fallback pattern
- Phase 7 `07-01-PLAN.md` — established docker-compose override pattern
- `.planning/phases/08-credentials-deployment/08-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- n8n Community: `POST /rest/credentials` body structure for httpHeaderAuth type — `{"name": "...", "type": "httpHeaderAuth", "data": {"name": "<header-name>", "value": "<key>"}}`
- n8n Docs (https://docs.n8n.io/api/) — confirmed `/api/v1/credentials` endpoint exists; X-N8N-API-KEY auth required

### Tertiary (LOW confidence)
- n8n credential ID behavior after import: Based on community reports that UUIDs are assigned by n8n rather than using string IDs from workflow JSON. Needs live verification with actual import.

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all tools are established and confirmed in use
- Architecture / Credential IDs: HIGH — verified by direct JSON file inspection
- Google Cloud TTS credential type: HIGH — confirmed `predefinedCredentialType: googleApi` in workflow JSON
- n8n REST API credential creation body format: MEDIUM — confirmed from community + docs, specific encryption behavior unverified
- Credential ID matching after import: LOW — behavior needs live testing; plan must include a verification + re-link step

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable infrastructure domain)

---

## Plan Wave Recommendation

Based on dependencies, 4 plans are appropriate:

| Plan | Covers | Requirement |
|------|--------|-------------|
| 08-01 | Add N8N_WEBHOOK_BASE + DASHBOARD_API_TOKEN to VPS n8n container | DEPL-04 |
| 08-02 | Create 3 httpHeaderAuth credentials via REST API; create Google Cloud TTS via UI | DEPL-01 (partial) |
| 08-03 | Discover + user checkpoint + delete stub workflows | DEPL-02 |
| 08-04 | Bulk import 18 workflows (Wave 1 webhooks, then Wave 2 production), verify credential links, verify active count | DEPL-01 (verify) + DEPL-03 |

**Rationale:**
- DEPL-04 must go first (container restart before import ensures $env.N8N_WEBHOOK_BASE is live)
- Credentials before import so the import step can immediately verify credential linking
- Stub cleanup before import to avoid webhook path collisions
- Drive/YouTube credential verification happens in 08-04 as part of workflow import verification
