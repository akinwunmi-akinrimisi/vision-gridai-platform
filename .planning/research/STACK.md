# Technology Stack

**Project:** Vision GridAI Platform v1.1 — Backend & E2E
**Researched:** 2026-03-09
**Scope:** Stack additions for n8n AI agent workflows, workflow deployment, and infrastructure hardening. Dashboard stack (React 18, Tailwind 3.4, TanStack Query, Recharts, etc.) is validated and unchanged from v1.0 research.

## What Is NEW in v1.1

| Capability | Stack Addition | Why Needed |
|------------|---------------|------------|
| Niche research with web search | Anthropic Messages API `tool_use` with `web_search_20250305` | Claude needs real-time web data to audit competitors, mine Reddit/Quora, find keyword gaps |
| Workflow deployment | n8n REST API (`POST /api/v1/workflows`) | Import 18 workflow JSONs to n8n server programmatically |
| Infrastructure hardening | Docker memory limits + PostgreSQL tuning + n8n env vars | 16GB VPS needs proper resource allocation (current override targets 4GB VPS) |

## What NOT to Add

| Temptation | Why Skip |
|------------|----------|
| Anthropic Python/Node SDK in n8n | n8n workflows already use HTTP Request nodes for Anthropic API. Adding an SDK means a custom n8n node or Code node dependency. The HTTP Request pattern is explicit, debuggable, and consistent with every other API call in the project. |
| `web_search_20260209` (dynamic filtering) | Requires code execution tool as a dependency. Niche research queries are straightforward (competitor names, Reddit threads, keywords). The basic `web_search_20250305` is sufficient and ZDR-eligible. Save $10/1K searches on simpler queries. |
| OpenRouter proxy | CLAUDE.md explicitly says "Anthropic API direct (NOT OpenRouter)." Direct API gives full control over tool_use, prompt caching, and response parsing. |
| n8n native Supabase node | Already decided in v1.0: HTTP Request nodes give more control. Community node has maintenance risk. |
| Separate job queue (BullMQ, Redis) | n8n's self-chaining architecture handles sequencing. Adding Redis adds infrastructure complexity for zero benefit at this scale (1 user, 25 videos/batch). |
| Prompt caching via Anthropic API | Would save ~10% on repeat system prompts, but niche research is one-time per project (~$0.60). Not worth the implementation complexity for v1.1. Revisit if script generation (3-pass, repeating system prompts) becomes a cost concern. |

---

## Recommended Stack Additions

### Anthropic Claude API — Web Search Tool

| Parameter | Value | Notes |
|-----------|-------|-------|
| API Endpoint | `https://api.anthropic.com/v1/messages` | Same endpoint already used in existing workflows |
| Model | `claude-sonnet-4-6` | Latest Sonnet. $3/MTok input, $15/MTok output. Best cost/intelligence ratio for research tasks. |
| Tool type | `web_search_20250305` | Basic web search, no code execution dependency. ZDR-eligible. |
| Web search cost | **$10 per 1,000 searches** + standard token costs | Each search = one use regardless of results returned. Failed searches are not billed. |
| `max_uses` | 10 per niche research call | Prevents runaway searches. Niche research needs 5-8 searches (competitors, Reddit, keywords, gaps). Cap at 10 for safety. |
| `max_tokens` | 8192 | Research output is structured JSON (competitor analysis, pain points, keywords, blue ocean). 8K tokens is generous. |
| anthropic-version header | `2023-06-01` | Same version already used in existing workflows. No beta header needed for web search (GA). |
| Confidence | **HIGH** | Verified against official Anthropic docs. Tool type, pricing, and response format confirmed. |

#### n8n HTTP Request Node — Claude with Web Search

The request body for an n8n HTTP Request node calling Claude with web search tool:

```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 8192,
  "tools": [
    {
      "type": "web_search_20250305",
      "name": "web_search",
      "max_uses": 10,
      "user_location": {
        "type": "approximate",
        "country": "US"
      }
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "Research the niche '{{niche}}' for a YouTube channel..."
    }
  ]
}
```

Headers (same pattern as existing `WF_TOPICS_GENERATE`):
```
x-api-key: {{credential.anthropic-api-key}}
anthropic-version: 2023-06-01
content-type: application/json
```

#### Response Handling

The response contains interleaved `text`, `server_tool_use`, and `web_search_tool_result` content blocks. The Code node after the HTTP Request must:

1. Filter content blocks by `type === 'text'` to extract Claude's analysis
2. Concatenate all text blocks to get the full research output
3. Parse JSON from the concatenated text (same pattern as existing topic generation parser)
4. Handle `stop_reason === 'pause_turn'` by sending the response back for continuation (rare, but possible for long research)

```javascript
// In n8n Code node — parse Claude web search response
const response = $input.first().json;
if (response.error) throw new Error(`Anthropic: ${response.error.message}`);

// Extract text blocks (skip server_tool_use and web_search_tool_result blocks)
const textBlocks = (response.content || [])
  .filter(c => c.type === 'text')
  .map(c => c.text);
const fullText = textBlocks.join('');

// Parse JSON from response (same pattern as WF_TOPICS_GENERATE)
const jsonStart = fullText.indexOf('{');
const jsonEnd = fullText.lastIndexOf('}');
if (jsonStart === -1) throw new Error('No JSON object in research response');
const research = JSON.parse(fullText.substring(jsonStart, jsonEnd + 1));

return [{ json: { research } }];
```

#### Cost Estimate for Niche Research

| Component | Cost |
|-----------|------|
| Web searches (5-8 per niche) | $0.05-$0.08 |
| Input tokens (~2K system + ~25K search results) | ~$0.08 |
| Output tokens (~3K research JSON) | ~$0.05 |
| **Total per niche research** | **~$0.20** |

This is a one-time cost per project. The CLAUDE.md estimate of ~$0.60 is conservative and accounts for potential retries.

---

### n8n REST API — Workflow Import

| Parameter | Value | Notes |
|-----------|-------|-------|
| Endpoint | `POST https://n8n.srv1297445.hstgr.cloud/api/v1/workflows` | Creates a new workflow from JSON |
| Activate endpoint | `PATCH https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/{id}/activate` | Activates after import |
| Auth | API Key in header: `X-N8N-API-KEY: <key>` | Generate via n8n Settings > API |
| Request body | Full workflow JSON (same structure as exported files) | `name`, `nodes`, `connections`, `settings` fields |
| Credential mapping | Must reassign credential IDs after import | Exported JSON references credential IDs that differ per instance |
| Confidence | **MEDIUM** | Verified from n8n docs and community. Credential remapping is the known friction point. |

#### Import Script Pattern

```bash
#!/bin/bash
# Import all workflow JSONs to n8n server
N8N_URL="https://n8n.srv1297445.hstgr.cloud"
API_KEY="your-n8n-api-key"

for file in workflows/*.json; do
  echo "Importing: $file"
  RESPONSE=$(curl -s -X POST "$N8N_URL/api/v1/workflows" \
    -H "X-N8N-API-KEY: $API_KEY" \
    -H "Content-Type: application/json" \
    -d @"$file")

  WF_ID=$(echo "$RESPONSE" | jq -r '.id')
  echo "  Created workflow ID: $WF_ID"

  # Activate webhook-triggered workflows
  if echo "$file" | grep -q "WEBHOOK"; then
    curl -s -X PATCH "$N8N_URL/api/v1/workflows/$WF_ID/activate" \
      -H "X-N8N-API-KEY: $API_KEY"
    echo "  Activated"
  fi
done
```

#### Credential Remapping After Import

After importing, each workflow's HTTP Request nodes reference credential IDs (e.g., `"id": "supabase-service-role"`). These IDs are placeholders in the exported JSON. On the target n8n instance:

1. Create credentials manually in n8n UI: `Supabase Service Role`, `Anthropic API Key`, `Kie API Key`, etc.
2. Note the actual credential IDs assigned by n8n
3. Either: (a) update each workflow via n8n UI to select the correct credential, or (b) use `PATCH /api/v1/workflows/{id}` to update credential references in bulk

This is a one-time setup step, not an ongoing concern.

---

### Infrastructure Hardening — Docker + PostgreSQL + n8n

The current `infra/docker-compose.override.yml` allocates resources for a **4GB VPS** but the actual server has **16GB RAM**. This needs updating.

#### Updated Docker Memory Limits (16GB VPS)

| Service | Current Limit | Recommended Limit | Reservation | Rationale |
|---------|--------------|-------------------|-------------|-----------|
| n8n | 1536M | **4096M** | 1024M | Long-running AI agent calls (niche research with web search can take 60-120s, script gen 3-pass). Node.js heap needs room. |
| supabase-db | 1024M | **4096M** | 1024M | PostgreSQL benefits from more shared_buffers and effective_cache_size. 172 scene rows per topic written rapidly during production. |
| supabase-realtime | 512M | **1024M** | 256M | WebSocket connections from dashboard. Single user but multiple tabs/subscriptions. |
| supabase-rest | 256M | **512M** | 128M | PostgREST. Lightweight but handles burst writes during production (172 scenes). |
| **Total allocated** | **3.3GB** | **9.7GB** | | Leaves ~6GB for OS, Nginx, and headroom |
| Confidence | | **HIGH** | | Standard Docker resource allocation for 16GB VPS |

#### n8n Environment Variables

| Variable | Current | Recommended | Why |
|----------|---------|-------------|-----|
| `EXECUTIONS_TIMEOUT` | 600 (10min) | **900** (15min) | Niche research with 10 web searches can take 2-3 minutes per search. 3-pass script gen with evaluation is 3 Claude calls + 3 evaluator calls. 15 minutes is a safe ceiling. |
| `EXECUTIONS_TIMEOUT_MAX` | 900 (15min) | **1800** (30min) | Per-workflow override cap. Assembly workflow (FFmpeg concat of 172 clips) may need more time on large videos. |
| `NODE_OPTIONS` | `--max-old-space-size=1024` | `--max-old-space-size=2048` | With 4GB container limit, allocate 2GB to V8 heap. Leaves 2GB for native code, buffers, and overhead. |
| `N8N_DEFAULT_BINARY_DATA_MODE` | `filesystem` | `filesystem` (keep) | Correct. Binary data (audio files, images) goes to disk, not memory. |
| `EXECUTIONS_DATA_PRUNE` | `true` | `true` (keep) | Correct. Auto-delete old execution data. |
| `EXECUTIONS_DATA_MAX_AGE` | `168` (7 days) | `168` (keep) | 7 days of execution history is sufficient for debugging. |
| `N8N_PAYLOAD_SIZE_MAX` | not set | **67108864** (64MB) | Default is 16MB. Scene manifests (172 scenes with full text) and 3-pass scripts can exceed 16MB. 64MB is safe for 4GB container. |
| `EXECUTIONS_DATA_SAVE_ON_SUCCESS` | not set | **none** | Don't persist full execution data for successful runs. Saves disk and memory. Errors are still saved. |
| `EXECUTIONS_DATA_SAVE_ON_ERROR` | not set | **all** | Always save full data for failed executions (debugging). |
| Confidence | | **HIGH** | Verified from n8n docs and community production configs |

#### PostgreSQL Tuning (for 4GB container)

| Parameter | Current | Recommended | Why |
|-----------|---------|-------------|-----|
| `max_connections` | 200 | **100** | 200 is overkill for single-user. PostgREST pools connections. Each connection consumes ~5-10MB. Reducing to 100 frees memory for buffers. |
| `shared_buffers` | 256MB | **1GB** | 25% of container memory (4GB). PostgreSQL primary cache for table and index data. |
| `work_mem` | 8MB | **32MB** | Allows in-memory sorts for scene queries (ORDER BY scene_number). With 100 max_connections, worst case = 3.2GB (but concurrent queries are rare in single-user). |
| `effective_cache_size` | 512MB | **3GB** | Tells query planner how much OS cache is available. 75% of container memory. Doesn't allocate memory, just a hint. |
| `maintenance_work_mem` | not set | **256MB** | Used during VACUUM and index creation. Can be generous since maintenance is infrequent. |
| `statement_timeout` | 30s | **60s** | Some Supabase REST queries (fetching all 172 scenes with joins) may take longer than 30s on first load. |
| `idle_in_transaction_session_timeout` | 300s | **300s** (keep) | 5 minutes is reasonable. Kills idle transactions that hold locks. |
| `random_page_cost` | not set (default: 4) | **1.1** | NVMe storage has near-sequential access times. Default 4.0 biases planner toward sequential scans. 1.1 encourages index usage on NVMe. |
| `effective_io_concurrency` | not set (default: 1) | **200** | NVMe can handle 200 concurrent I/O operations. Enables parallel bitmap heap scans. |
| `wal_buffers` | not set | **16MB** | Matches shared_buffers increase. Buffers WAL (write-ahead log) writes. |
| `checkpoint_completion_target` | not set (default: 0.9) | **0.9** (keep default) | Spreads checkpoint writes over 90% of interval. Good for write-heavy workloads (172 scene writes per production run). |
| `shm-size` (Docker) | not set | **2g** | Docker default is 64MB shared memory, which is too low for 1GB shared_buffers. Set via `shm_size: 2g` in docker-compose. |
| Confidence | | **HIGH** | PostgreSQL wiki + PGTune recommendations for 4GB dedicated DB + NVMe |

#### Updated docker-compose.override.yml

```yaml
version: "3.8"

services:
  n8n:
    deploy:
      resources:
        limits:
          memory: 4096M
        reservations:
          memory: 1024M
    environment:
      - EXECUTIONS_TIMEOUT=900
      - EXECUTIONS_TIMEOUT_MAX=1800
      - N8N_EXECUTIONS_PROCESS_TIMEOUT=900
      - N8N_DEFAULT_BINARY_DATA_MODE=filesystem
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168
      - EXECUTIONS_DATA_SAVE_ON_SUCCESS=none
      - EXECUTIONS_DATA_SAVE_ON_ERROR=all
      - N8N_PAYLOAD_SIZE_MAX=67108864
      - NODE_OPTIONS=--max-old-space-size=2048

  supabase-db:
    shm_size: 2g
    deploy:
      resources:
        limits:
          memory: 4096M
        reservations:
          memory: 1024M
    command: >
      postgres
      -c max_connections=100
      -c shared_buffers=1GB
      -c work_mem=32MB
      -c effective_cache_size=3GB
      -c maintenance_work_mem=256MB
      -c statement_timeout=60s
      -c idle_in_transaction_session_timeout=300s
      -c random_page_cost=1.1
      -c effective_io_concurrency=200
      -c wal_buffers=16MB

  supabase-realtime:
    deploy:
      resources:
        limits:
          memory: 1024M
        reservations:
          memory: 256M

  supabase-rest:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 128M
```

---

## Existing Stack (Unchanged from v1.0)

These are validated and require NO changes for v1.1. Listed here for completeness:

### Dashboard
| Technology | Version | Status |
|------------|---------|--------|
| React | 18.2.x | Validated |
| Vite | 6.x | Validated |
| Tailwind CSS | 3.4.x | Validated (do NOT upgrade to v4) |
| React Router | 7.x | Validated |
| @tanstack/react-query | 5.x | Validated |
| @supabase/supabase-js | 2.98.x | Validated |
| Recharts | 3.8.x | Validated |
| Lucide React | 0.577.x | Validated |
| date-fns | 4.x | Validated |
| clsx | 2.x | Validated |
| react-hot-toast | 2.x | Validated |

### Backend / Media
| Technology | Version | Status |
|------------|---------|--------|
| n8n (self-hosted Docker) | Latest | Validated |
| FFmpeg/FFprobe | 6.x+ (Alpine apk) | Validated |
| Google Cloud TTS Chirp 3 HD | v1 | Validated |
| Kie.ai (Seedream 4.5, Kling 2.1) | Current | Validated |
| YouTube Data API v3 | v3 | Validated |
| Google Drive API | v3 | Validated |
| Supabase PostgreSQL | 15.x | Validated |

---

## Integration with Existing n8n HTTP Request Pattern

The Anthropic web search call follows the **exact same pattern** already used in `WF_TOPICS_GENERATE.json`:

| Aspect | Existing (Topic Gen) | New (Niche Research) |
|--------|---------------------|---------------------|
| Node type | `n8n-nodes-base.httpRequest` v4.2 | Same |
| URL | `https://api.anthropic.com/v1/messages` | Same |
| Auth | `genericCredentialType` / `httpHeaderAuth` | Same |
| Credential | `anthropic-api-key` | Same |
| Headers | `anthropic-version: 2023-06-01` | Same |
| Body | `{ model, max_tokens, messages }` | `{ model, max_tokens, tools, messages }` -- adds `tools` array |
| Timeout | `120000` (2 min) | `180000` (3 min) -- web search adds latency |
| Error handling | `continueRegularOutput` | Same |
| Response parsing | Code node extracts text, parses JSON | Same pattern, but filter for `type === 'text'` blocks only |

The only difference is the `tools` array in the request body. No new n8n nodes, no new credentials, no new dependencies.

---

## Claude Model Selection for v1.1 Workflows

| Workflow | Model | Why |
|----------|-------|-----|
| Niche Research (Phase A) | `claude-sonnet-4-6` | Web search + analysis. Sonnet is cost-effective ($3/$15 per MTok) and fully capable for research tasks. |
| Topic Generation (Phase B) | `claude-sonnet-4-6` | Already configured in WF_TOPICS_GENERATE. 25 topics in one call. |
| Script Generation 3-Pass (Phase C) | `claude-sonnet-4-6` | Long-form writing. Sonnet handles 18K-20K word scripts well. |
| Script Evaluation (Phase C) | `claude-sonnet-4-6` | Scoring rubric application. Temperature 0.3 for consistency. |
| Dynamic Prompt Generation (Phase A) | `claude-sonnet-4-6` | One-time generation of 7 prompt templates per niche. |
| Supervisor Agent | `claude-sonnet-4-6` | Light reasoning: diagnose stuck pipelines, decide retry/skip/alert. |

Use `claude-sonnet-4-6` everywhere. There is no v1.1 workflow that requires Opus-level reasoning. The cost difference is significant: Sonnet at $3/$15 vs Opus at $15/$75 per MTok.

---

## Sources

- [Anthropic Web Search Tool docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool) -- HIGH confidence, official docs, verified tool type `web_search_20250305`, pricing $10/1K searches
- [Anthropic Pricing page](https://platform.claude.com/docs/en/about-claude/pricing) -- HIGH confidence, official docs, Sonnet 4.6 at $3/$15 MTok confirmed
- [Anthropic Tool Use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) -- HIGH confidence, official docs
- [n8n REST API docs](https://docs.n8n.io/api/) -- MEDIUM confidence, POST /api/v1/workflows confirmed
- [n8n workflow import guide (Latenode)](https://latenode.com/blog/low-code-no-code-platforms/n8n-setup-workflows-self-hosting-templates/n8n-export-import-workflows-complete-json-guide-troubleshooting-common-failures-2025) -- MEDIUM confidence
- [n8n Community: Create workflow via REST API](https://community.n8n.io/t/create-a-workflow-by-n8n-public-rest-api/143898) -- MEDIUM confidence
- [n8n Environment Variables docs](https://docs.n8n.io/hosting/configuration/environment-variables/) -- HIGH confidence, official docs
- [n8n Memory errors docs](https://docs.n8n.io/hosting/scaling/memory-errors/) -- HIGH confidence, official docs
- [n8n Execution timeout docs](https://docs.n8n.io/hosting/configuration/configuration-examples/execution-timeout/) -- HIGH confidence, official docs
- [n8n production config guide (andreffs)](https://www.andreffs.com/blog/n8n-customizations-for-production/) -- MEDIUM confidence
- [n8n payload size fix (tva.sg)](https://www.tva.sg/solving-n8n-existing-execution-data-is-too-large-error-the-complete-fix-for-self-hosted-instances/) -- MEDIUM confidence
- [PostgreSQL Tuning wiki](https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server) -- HIGH confidence, official wiki
- [PGTune calculator](https://pgtune.leopard.in.ua/) -- HIGH confidence, community standard
- [PostgreSQL Resource Consumption docs](https://www.postgresql.org/docs/current/runtime-config-resource.html) -- HIGH confidence, official docs
- [PostgreSQL Docker shared memory](https://www.postgresql.org/message-id/CAGbX52Fm=k8hHJKEzo6-mnh7gn91s=Lz_t6B5uF1SotpXH3UeA@mail.gmail.com) -- HIGH confidence, official mailing list
- [Docker PostgreSQL best practices (sliplane)](https://sliplane.io/blog/best-practices-for-postgres-in-docker) -- MEDIUM confidence
