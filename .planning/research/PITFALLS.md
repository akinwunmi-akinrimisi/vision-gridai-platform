# Pitfalls Research

**Domain:** Multi-niche AI video production platform (single VPS, async APIs, 2-hour video assembly)
**Researched:** 2026-03-09 (updated for v1.1 milestone: AI agent workflows + deployment + infra hardening)
**Confidence:** HIGH (most pitfalls verified via official docs, community reports, and multiple sources)

---

## Critical Pitfalls -- v1.1 Milestone (AI Agents + Deployment + Infra)

These pitfalls are specific to the current milestone: building Claude API agentic workflows with web search, deploying n8n workflow JSONs to production, and tuning PostgreSQL/Docker on a 16GB VPS.

### Pitfall 9: Claude tool_use Loop Doesn't Terminate -- Runaway Web Search Costs

**What goes wrong:**
When calling Claude API with `tool_use` for niche research (web search), the agentic loop requires the caller to execute tool calls and feed results back until Claude returns `stop_reason: "end_turn"`. If the n8n workflow doesn't implement this loop correctly, two failure modes occur: (1) the loop never terminates because Claude keeps requesting more searches (it's thorough by design -- researching competitors, Reddit, Quora, keywords can trigger 8-15 searches per niche), costing $0.01/search plus ~$0.03-0.05 in tokens per search iteration, or (2) the loop terminates too early (only handling one tool call) and returns incomplete research with missing competitor data or pain points.

**Why it happens:**
The Claude API `tool_use` pattern requires a multi-turn conversation loop in the calling code. Each response with `stop_reason: "tool_use"` must have its tool results fed back as a new message. n8n has no native "agentic loop" construct -- you must build it with a Loop/SplitInBatches node or a recursive webhook call. Developers either build a fixed 1-turn call (missing the loop entirely) or build an unbounded loop with no max iteration cap.

**How to avoid:**
- Implement a max iteration cap of 15 turns in the agentic loop. If Claude hasn't returned `end_turn` after 15 tool calls, force-stop by sending a final message: "Please synthesize all research gathered so far and return your final analysis." This caps web search cost at ~$0.15 per niche research run plus ~$0.45-0.75 in token costs.
- Check `stop_reason` in every Claude API response. If `stop_reason === "tool_use"`, extract ALL tool_use blocks from the `content` array (Claude can request multiple searches in one response), execute them, and send results back. If `stop_reason === "end_turn"`, extract the text content and exit the loop.
- Budget alert: set a hard cost cap. Each niche research run should cost $0.30-0.60 total (search fees + tokens). If the loop exceeds 15 iterations, something is wrong.
- Log every iteration to `production_log` with the search query and result summary. This creates an audit trail and helps debug incomplete research.

**Warning signs:**
- n8n execution runs for more than 10 minutes on the niche research workflow
- Claude API bill shows unexpectedly high web search request counts
- Niche profile in Supabase has incomplete sections (e.g., competitor analysis present but pain points missing)
- The `search_queries_used` array in `niche_profiles` has fewer than 3 or more than 20 entries

**Phase to address:**
v1.1 -- when building the niche research workflow. Build the agentic loop with the max iteration cap from day one.

---

### Pitfall 10: Claude API tool_use Response Parsing Fails Silently in n8n

**What goes wrong:**
Claude's `tool_use` responses contain mixed content blocks -- both `text` and `tool_use` types in the same `content` array. In n8n's HTTP Request node, the response body is a JSON object. Developers parse `response.content[0].text` to get the result, but when Claude returns a tool call, `content[0]` is type `tool_use` (not `text`), so `.text` is undefined. The workflow continues with `undefined` data, writes null/empty values to Supabase, and the error only surfaces much later when topic generation fails because the niche profile is empty.

**Why it happens:**
The Claude API response structure changes based on `stop_reason`:
- `stop_reason: "end_turn"` -- `content` contains `text` blocks with the final answer
- `stop_reason: "tool_use"` -- `content` contains one or more `tool_use` blocks AND optionally a `text` block with Claude's thinking
- The `text` block may appear at any position in the array, not necessarily first

Developers test with simple prompts that return text-only responses, then deploy with tool_use enabled where the response structure is different.

**How to avoid:**
- In the n8n Code node that processes Claude responses, always filter by content type:
  ```javascript
  const textBlocks = response.content.filter(b => b.type === 'text');
  const toolBlocks = response.content.filter(b => b.type === 'tool_use');

  if (response.stop_reason === 'tool_use' && toolBlocks.length > 0) {
    // Execute tool calls, feed results back
  } else if (response.stop_reason === 'end_turn' && textBlocks.length > 0) {
    // Extract final text result
    const result = textBlocks.map(b => b.text).join('\n');
  }
  ```
- Never access `content[0]` by index. Always filter by `.type`.
- Add a validation step after the agentic loop completes: check that the final result contains all required fields (competitor_analysis, pain_points, keyword_research, blue_ocean_opportunities) before writing to Supabase.
- If the final response is supposed to be JSON, use Claude's `response_format` or parse the text content with JSON.parse inside a try/catch. Claude sometimes wraps JSON in markdown code fences.

**Warning signs:**
- `niche_profiles` rows have null or empty JSONB columns
- `projects.niche_system_prompt` is null after research workflow completes
- n8n execution shows "Success" but the data written to Supabase is incomplete
- Downstream topic generation fails with "missing niche context" errors

**Phase to address:**
v1.1 -- when building the niche research workflow. Write a dedicated n8n Code node for Claude response parsing that handles all content block types.

---

### Pitfall 11: n8n Workflow JSON Import Breaks All Credential References

**What goes wrong:**
Workflow JSON files exported from development (or built manually) contain credential references by ID (e.g., `"credentialId": "7"`). When imported to the production n8n instance, these IDs don't exist. The workflow imports successfully (no error), but every node that uses credentials shows "Credential not found" when executed. The first production run fails on every API call -- Supabase reads return 401, Claude calls return authentication errors, Google Drive uploads fail.

**Why it happens:**
n8n workflow JSON files store credential references as `credentialId` (a numeric ID) and `credentialName` (a string). On import to a different instance, n8n tries to match by name first, then falls back to ID. If the production instance has credentials with different names (e.g., "Anthropic API" vs "Anthropic API Key"), the match fails silently. The workflow imports without errors but credentials are unlinked.

**How to avoid:**
- Before building any workflow JSON, establish a credential naming convention and create ALL credentials on the production n8n instance first:
  - `Anthropic API` -- for Claude API calls (httpHeaderAuth)
  - `Supabase API` -- for Supabase REST calls (httpHeaderAuth with apikey + Authorization)
  - `Google Drive` -- for Drive OAuth2
  - `YouTube` -- for YouTube Data API v3 OAuth2
  - `Kie API` -- for Kie.ai image/video generation (httpHeaderAuth)
  - `Google Cloud TTS` -- for Chirp 3 HD voiceover
- Use EXACTLY these names in all workflow JSONs. When the JSON references `"credentialName": "Supabase API"`, it will auto-match on import.
- After importing each workflow, open it in the n8n UI and verify every node's credential assignment before activating. Check every HTTP Request node, not just the first one.
- Create a post-import checklist script: export all workflows via n8n API, grep for `credentialId` references, and verify each maps to a valid credential.

**Warning signs:**
- Imported workflow shows orange warning indicators on nodes in the n8n editor
- First execution fails with 401/403 on the very first API call
- n8n execution error: "No credentials found for type 'httpHeaderAuth'"
- Workflow runs fine in dev but fails immediately in production

**Phase to address:**
v1.1 -- establish credential naming convention and create production credentials BEFORE importing any workflows.

---

### Pitfall 12: Docker Memory Allocation Starves PostgreSQL or n8n

**What goes wrong:**
The 16GB VPS runs n8n, Supabase (PostgreSQL + PostgREST + Realtime + Auth + Kong + Studio), Nginx, and FFmpeg containers. Without explicit memory limits, Docker containers compete for RAM. PostgreSQL's `shared_buffers` defaults to 128MB (far too low for production), while n8n's Node.js heap can grow to consume 4GB+ during large workflow executions. When n8n runs a heavy workflow (e.g., processing 172 scene results from Claude), it starves PostgreSQL of memory. PostgreSQL starts swapping, Realtime subscriptions lag, and dashboard queries timeout.

**Why it happens:**
Docker containers have no memory limits by default -- they can consume all available host RAM. PostgreSQL inside Supabase's Docker Compose uses the default `shared_buffers` (128MB). n8n's Node.js process defaults to a heap limit of ~1.7GB but can exceed this with binary data in memory. The OS kernel's OOM killer eventually picks a victim, and it's often PostgreSQL (larger memory footprint = higher OOM score).

**How to avoid:**
- Set explicit Docker memory limits in docker-compose.override.yml:
  ```yaml
  services:
    db:  # Supabase PostgreSQL
      deploy:
        resources:
          limits:
            memory: 4G
          reservations:
            memory: 2G

    n8n:
      deploy:
        resources:
          limits:
            memory: 3G
          reservations:
            memory: 1G
      environment:
        - NODE_OPTIONS=--max-old-space-size=2048

    n8n-ffmpeg:
      deploy:
        resources:
          limits:
            memory: 3G
          reservations:
            memory: 512M

    realtime:
      deploy:
        resources:
          limits:
            memory: 512M

    rest:  # PostgREST
      deploy:
        resources:
          limits:
            memory: 512M

    kong:
      deploy:
        resources:
          limits:
            memory: 512M
  ```
- Tune PostgreSQL for the 4GB container allocation:
  ```
  shared_buffers = 1GB          # 25% of container memory
  effective_cache_size = 2GB    # Tells planner about available cache
  work_mem = 16MB               # Per-operation sort/hash memory
  maintenance_work_mem = 256MB  # VACUUM, CREATE INDEX operations
  max_connections = 200         # Support all Supabase services + n8n
  ```
- Set Docker `--shm-size=256m` on the PostgreSQL container (Docker defaults to 64MB shared memory, which causes "could not resize shared memory segment" errors under load).
- Memory budget for 16GB VPS:
  - OS + system: 2GB
  - PostgreSQL: 4GB (limit)
  - n8n main: 3GB (limit)
  - n8n-ffmpeg: 3GB (limit, shared with n8n when not assembling)
  - Supabase services (Realtime, PostgREST, Kong, Auth, Studio): 2GB total
  - Nginx: 256MB
  - Buffer: ~1.7GB

**Warning signs:**
- `dmesg | grep -i oom` shows OOM killer events
- PostgreSQL logs show "out of shared memory" or "could not resize shared memory segment"
- n8n crashes with "JavaScript heap out of memory" (check `docker logs n8n`)
- VPS swap usage exceeds 1GB (check `free -h`)
- Dashboard becomes unresponsive during production workflows

**Phase to address:**
v1.1 -- apply memory limits and PostgreSQL tuning as the first infrastructure hardening task, before deploying any workflows.

---

### Pitfall 13: n8n HTTP Request Node Timeout Too Short for Claude Agentic Calls

**What goes wrong:**
The Claude API with web search tool_use can take 30-90 seconds per turn (search execution + result processing + response generation). The niche research workflow may have 8-15 turns, but each individual HTTP Request to Claude's `/v1/messages` endpoint must complete within n8n's HTTP timeout. The default HTTP Request node timeout is 30,000ms (30 seconds). Claude with web search regularly exceeds this, especially on Sonnet models processing complex research queries. The n8n node throws a timeout error, the agentic loop breaks mid-conversation, and partial research data is lost.

**Why it happens:**
n8n's HTTP Request node has a default timeout of 30 seconds, which is reasonable for typical API calls but not for AI model inference with tool execution. Claude's server-side web search can take 10-20 seconds alone, and the model then needs time to process results and formulate a response. A single turn can legitimately take 45-90 seconds.

**How to avoid:**
- Set the HTTP Request node timeout to 300000ms (5 minutes) for ALL Claude API calls. In the node's Options section: `"timeout": 300000`.
- Also set the n8n environment variable `N8N_RUNNERS_TASK_TIMEOUT=600` (10 minutes) to prevent the task runner from killing long-running Code nodes that process Claude responses.
- Set `EXECUTIONS_TIMEOUT=7200` (2 hours) to prevent the overall workflow from timing out during extended research sessions.
- Add retry logic with `"retryOnFail": true, "maxTries": 3, "waitBetweenTries": 5000` on the HTTP Request node. Transient timeouts are common with AI APIs under load.
- If a timeout does occur mid-loop, the conversation state (all previous messages) should be stored in n8n's workflow data. On retry, resume from the last successful turn rather than restarting from scratch.

**Warning signs:**
- n8n execution error: "ESOCKETTIMEDOUT" or "ETIMEDOUT" on Claude API calls
- Niche research workflow completes in under 30 seconds (suspiciously fast -- likely timed out on first call and returned error)
- Claude API dashboard shows requests with >30s latency
- Partial research data in Supabase (some sections populated, others null)

**Phase to address:**
v1.1 -- configure timeout values on every HTTP Request node that calls Claude API. Set as a template pattern for all agentic workflows.

---

### Pitfall 14: Web Search Cost Explosion on Multi-Niche Research

**What goes wrong:**
Each niche research run triggers 8-15 web searches at $0.01/search. But each search also generates 2,000-5,000 input tokens of search results that Claude must process. Over a multi-turn conversation with 10 search iterations, the accumulated context grows: turn 1 has the initial prompt (~1K tokens), turn 2 adds search results (~3K tokens), turn 3 adds more results (~3K tokens)... by turn 10, the total input is ~35K tokens. At Sonnet's $3/MTok input rate, that's ~$0.10 in input tokens alone, plus ~$0.05 in output tokens, plus ~$0.10 in search fees. Total: ~$0.25-0.60 per niche research run.

The danger: if you're testing/iterating on the research prompt and running it 10-20 times to get the output format right, you burn $5-12 in testing alone. If you have 10 niches queued for research, that's $2.50-6.00 in production -- manageable, but the token costs compound because search results from ALL previous turns are re-sent as conversation history.

**Why it happens:**
The tool_use loop requires sending the full conversation history on each turn (Claude is stateless). Every search result from every previous turn is included as input tokens on every subsequent turn. This creates quadratic token growth: turn N sends all results from turns 1 through N-1.

**How to avoid:**
- Summarize search results before adding to conversation. Instead of feeding raw search results back to Claude, use a Code node to truncate each search result to 500 tokens (first 2,000 characters). This caps per-turn growth.
- Use Haiku ($1/MTok input) for the research phase instead of Sonnet ($3/MTok). Haiku 4.5 is capable enough for web search synthesis and costs 3x less. Reserve Sonnet for script generation where quality matters more.
- Implement prompt caching: set `cache_control` on the system prompt and niche description (which don't change between turns). Cache hits cost 10% of input price. Over 10 turns, this saves ~50% on the static portion of the prompt.
- Set a budget cap in the workflow: track cumulative search count and estimated token usage. If estimated cost exceeds $0.75, force the loop to conclude.
- Test the research prompt with a single niche end-to-end before running multiple niches. Lock down the prompt before scaling.

**Warning signs:**
- Anthropic API dashboard shows >$5 spend on a day with only research runs
- Individual niche research runs taking >15 minutes
- `niche_profiles.search_queries_used` arrays with >15 entries
- Token usage reports showing >50K input tokens per research run

**Phase to address:**
v1.1 -- implement cost controls and result summarization in the niche research workflow. Consider Haiku for research, Sonnet for script generation.

---

### Pitfall 15: n8n Binary Data Mode Fills VPS Disk During Production

**What goes wrong:**
n8n stores binary data (HTTP response bodies, file downloads) in memory by default. Setting `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` moves this to disk, preventing OOM crashes. But the filesystem mode writes to n8n's data directory and NEVER automatically cleans up. After 10 video productions (each downloading ~270 files through n8n), the binary data directory grows to 50GB+. On a 200GB NVMe VPS that also stores video assets, PostgreSQL data, and Docker images, this fills the disk. When the disk is full, PostgreSQL crashes (can't write WAL), n8n can't save executions, and the entire platform goes down.

**Why it happens:**
n8n's filesystem binary data mode is a write-only operation -- it creates temp files but relies on execution pruning settings to clean them up. If `EXECUTIONS_DATA_PRUNE` is not enabled, or if execution data is retained for too long, binary data accumulates indefinitely. Developers enable filesystem mode to fix OOM issues but don't configure the corresponding cleanup.

**How to avoid:**
- Set ALL three environment variables together:
  ```
  N8N_DEFAULT_BINARY_DATA_MODE=filesystem
  EXECUTIONS_DATA_PRUNE=true
  EXECUTIONS_DATA_MAX_AGE=168        # 7 days in hours
  EXECUTIONS_DATA_SAVE_ON_ERROR=all  # Keep failed executions for debugging
  EXECUTIONS_DATA_SAVE_ON_SUCCESS=none  # Don't save successful execution data (saves disk)
  ```
- Add a daily cron job to clean up orphaned binary data:
  ```bash
  find /home/node/.n8n/binaryData -type f -mtime +7 -delete
  ```
- Monitor disk usage with a simple check in the supervisor workflow:
  ```bash
  df -h / | awk 'NR==2 {print $5}' | tr -d '%'
  ```
  Alert if usage exceeds 80%.
- For video production workflows that download large files (scene clips, assembled videos), use n8n's "Write Binary File" node to save directly to a known directory (e.g., `/data/assets/`), not n8n's internal binary data storage. Clean up after successful upload to Drive.

**Warning signs:**
- `df -h` shows disk usage >80% on the VPS
- PostgreSQL logs show "no space left on device" errors
- n8n execution starts failing with "ENOSPC" errors
- Docker containers fail to start after VPS reboot (no disk space for container layers)

**Phase to address:**
v1.1 -- configure as part of infrastructure hardening, alongside Docker memory limits and PostgreSQL tuning.

---

### Pitfall 16: Webhook URL Mismatch Between Workflow JSON and Production n8n

**What goes wrong:**
Self-chaining workflows trigger the next workflow via HTTP Request to a webhook URL. In the workflow JSON files built during development, webhook URLs may reference `localhost:5678` or the development n8n URL. When deployed to production, these URLs don't update automatically. The self-chain calls go to the wrong URL (localhost returns connection refused, old dev URL returns 404), and the pipeline stalls after the first workflow completes.

**Why it happens:**
n8n webhook URLs are generated from the workflow's webhook path (e.g., `/webhook/production/trigger`) combined with the instance's base URL. But when Workflow A calls Workflow B's webhook, that call URL is hardcoded in the HTTP Request node of Workflow A. If the workflow was built referencing a specific base URL, that URL persists in the JSON.

**How to avoid:**
- Use n8n environment variables for the webhook base URL. Set `N8N_WEBHOOK_BASE_URL=https://n8n.srv1297445.hstgr.cloud` as an environment variable. In every HTTP Request node that calls another workflow's webhook, use the expression: `{{ $env.N8N_WEBHOOK_BASE_URL }}/webhook/next-workflow-path`.
- Alternatively, use n8n's "Execute Workflow" node instead of HTTP webhook calls for self-chaining. This calls the next workflow directly within the same n8n instance, bypassing URL issues entirely. Trade-off: tighter coupling but no URL problems.
- Before deploying, search all workflow JSONs for hardcoded URLs:
  ```bash
  grep -r "localhost:5678\|127.0.0.1\|your-dev-domain" workflows/*.json
  ```
  Replace all matches with the environment variable expression.
- Create a deployment script that does a find-and-replace on webhook URLs during import.

**Warning signs:**
- Self-chaining works in dev but fails in production
- n8n execution history shows "Connection refused" or "ECONNREFUSED" errors on HTTP Request nodes
- Pipeline completes first workflow but never starts the second
- Webhook URLs in workflow JSON contain "localhost" or a dev domain

**Phase to address:**
v1.1 -- standardize webhook URL references to use environment variables in all workflow JSONs before importing to production.

---

## Critical Pitfalls -- v1.0 (Production Pipeline & Infrastructure)

These pitfalls were identified during v1.0 research and remain relevant.

### Pitfall 1: FFmpeg OOM on 2-Hour Video Assembly in Docker

**What goes wrong:**
FFmpeg concat of 172 scene clips into a 2-hour video inside a Docker container (n8n-ffmpeg) exhausts memory and gets OOM-killed. The container silently dies, no error is written to Supabase, the pipeline stalls, and the supervisor agent finds a topic stuck in "assembly" status indefinitely.

**Why it happens:**
Two common mistakes: (1) Using the FFmpeg `concat` filter (which decodes and re-encodes all streams, holding multiple frames in memory) instead of the concat demuxer with `-c copy` (stream copy, near-zero memory). (2) Not setting Docker memory limits, so a runaway FFmpeg process consumes all 16GB of VPS RAM and crashes other services (Supabase, n8n).

**How to avoid:**
- Always use the concat demuxer (`-f concat -safe 0 -i concat.txt -c copy -movflags +faststart`) for final assembly. This does stream copy and uses minimal RAM regardless of video length.
- Set Docker memory limits on the n8n-ffmpeg container: `--memory=4g --memory-swap=4g`. This protects Supabase and the OS from a runaway process.
- For the zoompan filter (Ken Burns on static images), process each scene individually into a clip file first, then concat the clips. Never apply filters during the concat step.
- Write assembly status to Supabase BEFORE starting FFmpeg and update on completion. If the container dies, the status remains "assembling" and the supervisor can detect the stall.
- Use `-loglevel warning` to reduce FFmpeg stdout buffering in Docker.

**Warning signs:**
- Docker container restarts during assembly (check `docker inspect n8n-ffmpeg | grep RestartCount`)
- Assembly takes more than 30 minutes for a 2-hour video (concat with `-c copy` should take 2-5 minutes)
- VPS load average spikes above 8.0 during assembly
- Other services (Supabase, n8n web UI) become unresponsive during video assembly

**Phase to address:**
Phase 4 (Production Pipeline) -- when building WF09 FFmpeg Assembly workflow. Docker memory limits should be set in v1.1 (infrastructure hardening).

---

### Pitfall 2: Async API Polling Without Backoff Hammers Kie.ai and Wastes n8n Executions

**What goes wrong:**
Kie.ai video generation (Kling 2.1) is async -- POST creates a task, you poll `/v1/task/result` for completion. Naive polling at fixed intervals (e.g., every 5 seconds for 97 tasks) creates 97 concurrent polling loops, each hitting the API every 5 seconds. This triggers Kie.ai's rate limit (20 requests per 10 seconds), causes HTTP 429 errors, and creates thousands of unnecessary n8n executions that clutter logs and consume resources.

**Why it happens:**
n8n doesn't have native "poll with exponential backoff" built in. Developers build a Wait node + HTTP Request loop, but forget that 97 concurrent video generation tasks all polling simultaneously creates a thundering herd. Kie.ai's rate limit of 20 req/10s means you can only check ~2 tasks per second.

**How to avoid:**
- Use Kie.ai's callback/webhook URL feature instead of polling. Pass your n8n webhook URL as the callback parameter in the generation request. Kie.ai calls your webhook when the task completes. Zero polling required.
- If callbacks aren't reliable, implement a single "batch poller" workflow: one workflow runs every 60 seconds, queries Supabase for all scenes with `video_status = 'generating'`, polls Kie.ai for each in sequence (not parallel), and writes results back. This stays well under the 20 req/10s limit.
- Stagger generation requests. Don't fire all 97 video tasks simultaneously. Queue them in batches of 10-15 with 30-second gaps between batches.
- Download generated content immediately -- Kie.ai URLs expire after 24 hours.

**Warning signs:**
- n8n execution log shows thousands of "poll" executions per video
- HTTP 429 responses from Kie.ai in n8n error logs
- Video generation tasks show as "failed" but work when manually retried
- n8n UI becomes sluggish due to execution history bloat

**Phase to address:**
Phase 4 (Production Pipeline) -- when building WF07A (I2V) and WF07B (T2V) workflows.

---

### Pitfall 3: Supabase Realtime Subscriptions Leak Memory in React Dashboard

**What goes wrong:**
The Production Monitor page subscribes to `scenes` table changes filtered by `topic_id`. When the user navigates between topics or pages, old subscriptions aren't cleaned up. Each orphaned WebSocket channel holds ~800KB of retained memory. After navigating between 10-15 topics, the browser tab consumes over 500MB and eventually crashes or becomes unresponsive.

**Why it happens:**
React 18's Strict Mode calls useEffect twice in development, which creates two subscriptions but only cleans up one. In production, the issue is subtler: navigating away from a component doesn't automatically call `supabase.removeChannel()` unless the cleanup function is explicitly returned from useEffect.

**How to avoid:**
- Always return a cleanup function from useEffect that calls `supabase.removeChannel(channel)`.
- Create a custom `useRealtimeSubscription` hook that encapsulates this pattern.
- Limit active subscriptions: only subscribe to the currently viewed topic's scenes.
- On the Projects Home page, subscribe to `topics` table (25 rows) not `scenes` table (4,300 rows across 25 topics).

**Warning signs:**
- Browser DevTools Memory tab shows steadily increasing heap size when navigating between pages
- Dashboard becomes sluggish after 10+ minutes of use

**Phase to address:**
v1.0 (already addressed in dashboard code). Verify during v1.1 E2E testing.

---

### Pitfall 4: n8n Workflow Timeout Kills Long-Running Production Stages

**What goes wrong:**
n8n's default workflow execution timeout is 3600 seconds (1 hour). The HTTP Request node defaults to 30 seconds. A video production workflow that generates 172 TTS audio files sequentially will take 15-30 minutes -- fine for the workflow timeout, but individual Kie.ai API calls can take 3-5 minutes each, exceeding the 30-second HTTP timeout.

**Why it happens:**
Three timeout layers are misconfigured: (1) Nginx proxy_read_timeout defaults to 60s, (2) n8n HTTP Request node timeout defaults to 30s, (3) n8n workflow execution timeout defaults to 3600s.

**How to avoid:**
- Dashboard webhook calls should use "Respond Immediately" mode on the n8n Webhook node.
- Set HTTP Request node timeout to 300000ms (5 minutes) for all API calls.
- Set n8n environment variables: `EXECUTIONS_TIMEOUT=7200` (2 hours) and `EXECUTIONS_TIMEOUT_MAX=14400` (4 hours).
- Configure Nginx: `proxy_read_timeout 120s` for the `/webhook/` location block.
- Every workflow must write its status to Supabase on start, on each scene completion, and on finish/failure.

**Warning signs:**
- Dashboard shows "Error" when triggering production, but the workflow actually ran
- n8n execution history shows "Timed Out" executions
- Topics stuck in intermediate status but n8n shows no running executions

**Phase to address:**
v1.1 -- configure all timeout values as part of infrastructure hardening.

---

### Pitfall 5: YouTube API Quota Exhaustion Blocks All Uploads for 24 Hours

**What goes wrong:**
YouTube Data API v3 gives 10,000 units/day. A video upload costs 1,600 units (max 6 uploads/day). Analytics pull using `search.list` (100 units each) can consume the remaining budget. Combined with uploads, you silently hit the quota limit.

**How to avoid:**
- Use `videos.list` (1 unit per call, up to 50 IDs per call) instead of `search.list` (100 units) for analytics.
- Cap uploads at 5/day (leaving 2,000 units buffer for analytics).
- Track quota usage in Supabase.

**Phase to address:**
Phase 5 (Publish) -- when building WF11 and WF12.

---

### Pitfall 6: Self-Hosted Supabase PostgreSQL Connection Exhaustion

**What goes wrong:**
Self-hosted Supabase's services consume 50+ connections by default. With max_connections at 100, rapid scene writes during production saturate the pool.

**How to avoid:**
- Increase PostgreSQL `max_connections` to 200.
- Set PostgREST's `PGRST_DB_POOL` to 20.
- Batch scene writes (10-20 at a time, not 172 in parallel).
- Monitor connections: `SELECT count(*) FROM pg_stat_activity;`

**Phase to address:**
v1.1 -- configure as part of PostgreSQL tuning.

---

### Pitfall 7: Pipeline Stalls Silently When Self-Chaining Workflow Fails to Fire Next

**What goes wrong:**
The self-chaining architecture means each workflow fires the next on completion. If the trigger HTTP call fails, the pipeline stops silently.

**How to avoid:**
- Enable `retry on fail` with 3 retries and exponential backoff on the self-chain HTTP Request node.
- Write expected next stage to Supabase before attempting to trigger.
- Build the Supervisor Agent early to detect topics stuck >2 hours.
- Add a "Resume Pipeline" button to the dashboard.

**Phase to address:**
v1.1 -- add retry on all self-chain nodes when deploying workflows to production.

---

### Pitfall 8: Google Drive API Rate Limits During Bulk Asset Upload

**What goes wrong:**
Each video produces ~270 files. The n8n Google Drive node makes multiple API calls per upload. 270 uploads create 800+ API calls, triggering rate limits.

**How to avoid:**
- Upload in batches with delays.
- Only upload final video + captions to Drive (use local VPS storage for intermediates).
- Enable retry with exponential backoff.

**Phase to address:**
Phase 4 (Production Pipeline).

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing scene data in `topics.script_json` JSONB instead of the `scenes` table | Simpler queries, single read | Can't subscribe to individual scene changes via Realtime, can't index scene-level fields | Never -- always use the `scenes` table |
| Hardcoding Kie.ai model names in n8n workflows | Faster to build | Model versions change, requires editing every workflow | Never -- read from `projects` table |
| Skipping the production_log table | Fewer writes, simpler workflows | No audit trail, can't debug failures, supervisor has no data | Never -- log every stage transition |
| Using n8n's native Supabase community node | Cleaner workflow UI | Community node may break on n8n updates | Only in MVP if HTTP Request setup is too slow |
| Skipping prompt caching on Claude API calls | Simpler request format | 3-10x higher token costs on multi-turn agentic calls | Never for agentic workflows; acceptable for single-turn calls |
| Hardcoding webhook URLs in workflow JSON | Works immediately in dev | Breaks on deploy to production, requires manual URL replacement | Never -- use `$env.N8N_WEBHOOK_BASE_URL` expressions |
| Testing with `EXECUTIONS_DATA_SAVE_ON_SUCCESS=all` | Full debugging visibility | n8n database and disk grow rapidly, UI slows down | Only during initial testing; disable after validation |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Claude API tool_use | Parsing `content[0].text` without checking type | Filter `content` array by `.type === 'text'` and `.type === 'tool_use'` separately |
| Claude API tool_use | Handling only one tool_use block per response | Claude can return multiple tool_use blocks in one response; iterate all of them |
| Claude API tool_use | Not sending `tool_result` for every `tool_use` block | Every tool_use ID must have a corresponding tool_result in the next user message, or Claude errors |
| Claude API web search | Assuming web search is free | $0.01 per search request PLUS token costs for search result content (~2K-5K input tokens per search) |
| Claude API web search | Sending full search results in conversation history | Summarize/truncate search results before adding to history to avoid quadratic token growth |
| Supabase REST API | Using `Authorization: Bearer ANON_KEY` for writes | Use `Authorization: Bearer SERVICE_ROLE_KEY` for n8n server-side writes |
| Supabase REST API | Forgetting `Prefer: return=representation` on INSERT | Without this header, POST returns empty body; add header to get the created row back |
| Kie.ai | Assuming 200 response means generation is complete | 200 only means task was created. Must poll or use callback. Check `task.status` field. |
| Kie.ai | Not downloading generated URLs immediately | Generated content URLs expire after 24 hours |
| Google Cloud TTS | Estimating audio duration from text length or file size | Always use FFprobe to measure actual audio duration |
| YouTube API | Using `search.list` to find own videos | Costs 100 quota units. Use `videos.list` with known IDs (1 unit) |
| n8n Webhooks | Expecting webhook response after long workflow | Use "Respond Immediately" webhook mode |
| n8n Workflow Import | Assuming credentials auto-map on import | Credentials match by name only; standardize naming across instances |
| n8n Environment Variables | Setting `NODE_OPTIONS` in Dockerfile instead of docker-compose | Docker Compose env vars override Dockerfile; set in docker-compose.yml for consistency |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Single Supabase Realtime channel for all scenes | Dashboard freezes, missed updates | Filter by `topic_id`, subscribe only to active topic | >500 scene updates in a production run |
| Loading all 172 scenes into React state at once | Slow initial render, re-render on every update | Virtualize scene list or show summary with drill-down | First video production |
| n8n storing all execution history | n8n SQLite DB grows to GB, UI becomes unusable | Set `EXECUTIONS_DATA_MAX_AGE=168` (7 days) and `EXECUTIONS_DATA_PRUNE=true` | After ~50 video productions |
| All 25 topics in production simultaneously | VPS CPU/RAM saturated, all 25 fail | Queue system: max 2 topics in production at once | First attempt at bulk production |
| Supabase `production_log` table without cleanup | Table grows to millions of rows, queries slow | Delete logs older than 30 days or partition by month | After ~100 videos |
| Full conversation history in Claude agentic loop | Token costs grow quadratically per turn | Summarize search results, use prompt caching | After 8+ search turns per research call |
| n8n filesystem binary data without cleanup | VPS disk fills to 100% | Enable `EXECUTIONS_DATA_PRUNE=true` + cleanup cron | After ~10 video productions |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Supabase anon key exposed in React build | Anyone with the key can read all data (no RLS) | Enable RLS on all tables, or use n8n webhooks as the API layer |
| n8n webhook endpoints have no authentication | Anyone can trigger workflows | Add shared secret header check in each webhook workflow |
| API keys in n8n workflow JSON exports | Exporting/sharing leaks credentials | Always use n8n credential references, never inline keys |
| YouTube OAuth refresh token in plain text | Full channel access | Store in n8n credential manager only |
| `.env` file committed to git | All service keys exposed | Add `.env` to `.gitignore` |
| Claude API key in n8n environment variable visible in Docker inspect | Key exposed via `docker inspect` | Use n8n's built-in credential manager, not environment variables, for API keys |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indication during niche research (Phase A) | User thinks app crashed during 2-3 minute AI research | Show streaming status via production_log Realtime: "Searching competitors...", "Analyzing Reddit..." |
| Approval gate shows raw JSON for script | User can't evaluate script quality | Render as formatted chapters with highlighted avatar usage and visual type indicators |
| No cost estimate before starting production | User doesn't know a video will cost ~$17 until it's done | Show estimated cost breakdown before "Start Production" click |
| "Reject" with no guidance on what to write | User types vague feedback | Provide refinement templates: "Change the angle to...", "Make it more specific to..." |
| Production monitor shows only current stage | User can't see completed/upcoming stages | Show full pipeline timeline with timestamps |
| Niche research errors show raw API error | User sees "ESOCKETTIMEDOUT" | Catch errors and show "Research is taking longer than expected. Retrying..." with a retry button |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **n8n workflow import:** Credentials show as linked but are mapped to wrong credential -- verify by opening each node and checking the credential dropdown
- [ ] **Claude tool_use loop:** Returns a result but only executed 1 of 3 requested tool calls -- verify `search_queries_used` array length matches expected research depth
- [ ] **Docker memory limits:** Set in docker-compose.yml but `deploy.resources` requires Docker Compose v3+ and swarm mode or `--compatibility` flag -- verify with `docker stats`
- [ ] **PostgreSQL shared_buffers:** Changed in config but PostgreSQL wasn't restarted -- verify with `SHOW shared_buffers;` inside psql
- [ ] **n8n timeout config:** Environment variable set but n8n container wasn't recreated (env vars only apply on container creation) -- verify with `docker exec n8n env | grep TIMEOUT`
- [ ] **Supabase schema:** Missing `REPLICA IDENTITY FULL` on tables -- without it, Realtime UPDATE events don't include the full row
- [ ] **FFmpeg assembly:** Missing `-movflags +faststart` -- YouTube upload works but playback requires full download before streaming
- [ ] **TTS audio:** Missing loudness normalization (`loudnorm` filter) -- individual scenes sound fine but assembled video has inconsistent volume
- [ ] **n8n webhooks:** Missing CORS headers -- dashboard fetch calls work in dev (same origin) but fail in production
- [ ] **Self-chain webhook URLs:** Contain hardcoded dev URLs -- workflow works in dev but chain breaks in production
- [ ] **n8n binary data cleanup:** Filesystem mode enabled but pruning not configured -- works for weeks then disk fills up

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Claude agentic loop doesn't terminate | LOW | Kill the n8n execution manually. Check iteration count and add max cap. Re-run with cap in place. |
| Claude response parsing fails | LOW | Fix the Code node parser. Re-run research workflow for affected niche. No data corruption (just empty fields). |
| Credential mapping broken after import | LOW | Open each workflow in n8n UI, re-assign credentials on affected nodes, save. 15-30 minutes per workflow. |
| Docker OOM kills PostgreSQL | MEDIUM | Restart Supabase stack: `docker compose restart`. Check if WAL corruption occurred. If yes, restore from last backup. Set memory limits to prevent recurrence. |
| VPS disk full from binary data | MEDIUM | Clean up: `find /home/node/.n8n/binaryData -type f -mtime +3 -delete`. Free Docker space: `docker system prune`. Enable pruning settings. |
| Webhook URL mismatch in production | LOW | Search and replace URLs in all workflow JSONs. Re-import affected workflows. Standardize on environment variable expressions. |
| FFmpeg OOM killed assembly | LOW | Restart container, verify concat.txt, re-run assembly. All scene clips are already on disk. |
| Kie.ai rate limited (429s) | LOW | Wait 60 seconds, re-run only failed scenes. |
| YouTube quota exceeded | LOW | Wait until midnight Pacific Time. Queue upload for next day. |
| Self-chain broken (pipeline stalled) | LOW | Identify stuck topic, manually trigger next workflow via dashboard "Resume" button. |
| PostgreSQL data corruption (self-hosted) | HIGH | Restore from backup. Ensure automated daily `pg_dump` cron is running. |

## Pitfall-to-Phase Mapping

How v1.1 milestone tasks should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Claude tool_use loop runaway | v1.1 (AI agent workflows) | Niche research completes in <10 min, costs <$0.75, search_queries_used has 5-15 entries |
| Claude response parsing | v1.1 (AI agent workflows) | niche_profiles has all 4 JSONB columns populated; projects has niche_system_prompt populated |
| Credential mapping on import | v1.1 (deployment) | All 17 workflows import and execute first node without credential errors |
| Docker memory starving PostgreSQL | v1.1 (infra hardening) | `docker stats` shows all containers within limits; `free -h` shows <1GB swap usage during production |
| HTTP timeout on Claude calls | v1.1 (AI agent workflows) | Claude API call that takes 60s completes without n8n timeout error |
| Web search cost explosion | v1.1 (AI agent workflows) | 5 niche research runs cost <$3.00 total on Anthropic bill |
| Binary data disk fill | v1.1 (infra hardening) | Disk usage stays <70% after 10 video productions |
| Webhook URL mismatch | v1.1 (deployment) | Self-chaining works end-to-end on production instance |
| FFmpeg OOM on long video | v1.1 (Docker limits) + Phase 4 | Assembly completes in <5 min using <500MB RAM |
| PostgreSQL connection exhaustion | v1.1 (PG tuning) | `pg_stat_activity` stays under 150 connections during peak production |
| n8n workflow timeouts | v1.1 (infra hardening) | Webhook returns 200 immediately; workflow runs 30+ min without timeout |
| YouTube quota exhaustion | Phase 5 | 5 uploads + analytics for 25 videos stays under 8,000 quota units |
| Self-chain failure | v1.1 (deployment) + Phase 4 | Supervisor detects topics stuck >2 hours; resume button works |
| Pipeline stall detection | v1.1 (supervisor) | Supervisor alerts within 30 min of a stalled topic |

## Sources

- [Anthropic Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing) -- web search at $10/1000 searches ($0.01/search), verified from official docs (HIGH confidence)
- [Anthropic Claude API tool_use implementation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use) -- response format, stop_reason handling (HIGH confidence)
- [Anthropic handling stop reasons](https://docs.anthropic.com/en/api/handling-stop-reasons) -- end_turn vs tool_use behavior (HIGH confidence)
- [Anthropic API rate limits](https://platform.claude.com/docs/en/api/rate-limits) -- tier system, token bucket algorithm (HIGH confidence)
- [n8n Timeout Configuration](https://docs.n8n.io/hosting/configuration/configuration-examples/execution-timeout/) -- EXECUTIONS_TIMEOUT env var (HIGH confidence)
- [n8n Memory Errors](https://docs.n8n.io/hosting/scaling/memory-errors/) -- NODE_OPTIONS, binary data mode (HIGH confidence)
- [n8n Community: Claude timeout at 300s](https://community.n8n.io/t/claude-4-5-on-n8n-cloud-fails-after-1-min-300000-ms-timeout-how-to-increase-execution-time/213031) -- AI Agent node hardcoded 5-min timeout (MEDIUM confidence)
- [n8n Community: AI Agent timeout configurable](https://community.n8n.io/t/make-timeout-for-ai-agent-node-configurable/175546) -- feature request for configurable timeout (MEDIUM confidence)
- [n8n Task Runner Timeout](https://github.com/n8n-io/n8n/issues/14865) -- N8N_RUNNERS_TASK_TIMEOUT=300 default (MEDIUM confidence)
- [n8n Export/Import Guide](https://docs.n8n.io/workflows/export-import/) -- credential mapping by name (HIGH confidence)
- [n8n Credential Import Issue](https://github.com/n8n-io/n8n/issues/20049) -- credentials break across instances (HIGH confidence)
- [n8n Community: Memory leaks in long-running HTTP workflows](https://community.n8n.io/t/n8n-keeps-crashing-due-to-memory-leaks-in-long-running-http-workflows/144155) -- OOM patterns (MEDIUM confidence)
- [PostgreSQL Wiki: Tuning Your Server](https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server) -- shared_buffers 25% of RAM rule (HIGH confidence)
- [PostgreSQL Docker shared memory](https://www.instaclustr.com/blog/postgresql-docker-and-shared-memory/) -- --shm-size requirement (HIGH confidence)
- [Supabase Self-Hosting Docker](https://supabase.com/docs/guides/self-hosting/docker) -- resource requirements (HIGH confidence)
- [Supabase Resource Discussion](https://github.com/orgs/supabase/discussions/26159) -- memory baselines for self-hosted services (MEDIUM confidence)
- [n8n Binary Data Scaling](https://docs.n8n.io/hosting/scaling/binary-data/) -- filesystem mode configuration (HIGH confidence)
- [n8n Community: Binary data fills filesystem](https://github.com/n8n-io/n8n/issues/8028) -- cleanup issues (MEDIUM confidence)

---
*Pitfalls research for: Multi-niche AI video production platform -- v1.1 milestone (AI agents + deployment + infra)*
*Researched: 2026-03-09*
