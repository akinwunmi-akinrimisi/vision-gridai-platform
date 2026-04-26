# n8n Workflows — Production Set

This directory mirrors the **live** n8n workflow set on `n8n.srv1297445.hstgr.cloud`. Every active production workflow is exported as a sanitized JSON containing `name`, `nodes`, `connections`, `settings`, and `active`. See [`INVENTORY.md`](./INVENTORY.md) for the full snapshot (active + inactive, with IDs).

## What is and isn't in here

| Field | Committed? | Notes |
|-------|-----------|-------|
| Workflow name, nodes, connections, settings | yes | the actual workflow definition |
| Node `credentials` references | yes (IDs only) | n8n credential IDs are opaque pointers (e.g. `KtMyWD7uJJBZYLjt`) — they are NOT secrets, they map to entries in n8n's encrypted credential store |
| Actual API key values | **no** | every API key (Anthropic, Google, Fal.ai, Apify, SerpAPI, YouTube, Supabase JWT, dashboard bearer) lives in n8n's encrypted store and `/docker/n8n/docker-compose.override.yml` env — never in repo |
| Workflow IDs (in filenames for collisions) | yes | filenames use the format `WF_NAME.json` for unique names, `WF_NAME__<id>.json` when multiple workflows share a base name (e.g. four legacy `WF_MASTER` revisions) |

## Cloning to a new project / new n8n instance

1. **Provision n8n.** Stand up a fresh n8n instance (Docker compose recommended; the source-of-truth is `/docker/n8n/docker-compose.override.yml` on the production VPS — copy its env layout, not its secrets).

2. **Re-create credentials.** In the new n8n's UI → Settings → Credentials, create the following with the same NAMES as production (the names matter for find-and-replace; the IDs will differ):

   - `Anthropic API Key` (HTTP Header Auth: `x-api-key: <YOUR_KEY>`)
   - `Fal API Key` (HTTP Header Auth: `Authorization: Key <YOUR_KEY>`)
   - `Apify API Token` (HTTP Header Auth: `Authorization: Bearer <YOUR_KEY>`)
   - `SerpAPI Key` (HTTP Header Auth)
   - `Supabase` (httpHeaderAuth — `apikey: <SERVICE_ROLE_JWT>`)
   - `Supabase Service Role` (httpHeaderAuth — `Authorization: Bearer <SERVICE_ROLE_JWT>`)
   - `Authorization` (httpHeaderAuth — `Authorization: Bearer <DASHBOARD_API_TOKEN>`) — used by all dashboard-read shims
   - Google Drive OAuth2
   - Google Cloud TTS / Vertex AI service account
   - YouTube OAuth2
   - TikTok / Instagram OAuth (if shipping social posting)
   - Reddit (PRAW client_id + secret)

3. **Populate `.env` for n8n.** Mirror production's variable names; SET YOUR OWN VALUES:

   ```
   N8N_API_KEY=<generate-fresh>
   ANTHROPIC_API_KEY=sk-ant-...
   YOUTUBE_API_KEY=AIza...
   YOUTUBE_API_KEY_02=...
   YOUTUBE_API_KEY_03=...
   YOUTUBE_API_KEY_04=...
   YOUTUBE_TRANSCRIPT_API=...
   APIFY_TOKEN=...
   SERPAPI_KEY=...
   FAL_API_KEY=...
   SUPABASE_URL=https://<your-supabase>
   SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   DASHBOARD_API_TOKEN=<generate-fresh>
   ```

4. **Apply Supabase migrations.** Run `supabase/migrations/*.sql` in numeric order against the new Supabase instance. Includes RLS policies, RPC functions, AU overlay tables (033/034/035/036), and the v3 intelligence renderer.

5. **Import workflows.** For each `WF_*.json` in this directory (only the ACTIVE set listed in [INVENTORY.md](./INVENTORY.md) — skip inactive legacy unless you specifically need them):

   ```bash
   # Inside the new n8n container:
   docker exec -i n8n-n8n-1 n8n import:workflow --input=/path/to/WF_*.json
   ```

   Then in the n8n UI, open each imported workflow and re-link node credentials to the freshly-created credential rows (n8n preserves credential names but the underlying IDs differ between instances).

6. **Activate cron + webhook workflows.** Imports default to inactive. Activate via UI or the public API:

   ```bash
   curl -X POST https://<your-n8n>/api/v1/workflows/<id>/activate \
     -H "X-N8N-API-KEY: $N8N_API_KEY"
   ```

7. **Update env-baked workflow IDs.** A few production workflows reference other workflows by ID (e.g. `WF_COUNTRY_ROUTER_ID`, `WF_RETRY_WRAPPER`). After import, capture the new IDs from the new instance and update the env vars in `docker-compose.override.yml`, then `docker compose up -d`.

8. **Deploy dashboard.** `cd dashboard && npm ci && npm run build`. Deploy `dist/` to your nginx root (production uses `/opt/dashboard/`). Configure nginx to reverse-proxy `/webhook/` to n8n and inject the `Authorization: Bearer <DASHBOARD_API_TOKEN>` header.

9. **Set the dashboard PIN gate.** In `dashboard/.env`:

   ```
   VITE_PIN_HASH=<sha256 of your chosen PIN>
   ```

   Production PIN is private; pick your own.

10. **Smoke test.**
    - PIN-unlock the dashboard
    - Create a project (General + Australia tabs both open the modal cleanly)
    - Trigger a Niche Research run on `/research`
    - Run YouTube Discovery on `/youtube-discovery`
    - Verify cron workflows ticking in n8n executions

## Refresh procedure (for future re-syncs from live to repo)

```bash
# From a workstation with prod ssh access:
ssh -i ~/.ssh/<key> root@<prod-vps> 'bash -s' < tools/export-workflows.sh > /tmp/wf_dump.tar.gz
tar -xzf /tmp/wf_dump.tar.gz -C workflows/
git status workflows/
# Visual diff, then:
git add -f workflows/
git commit -m "chore: refresh workflow snapshot from live"
git push
```

The export step uses `jq '{name, nodes, connections, settings, active}'` to strip
n8n-instance metadata (versionId, ownership, IDs of unrelated entities) so the
diff stays meaningful and no instance secrets leak.
