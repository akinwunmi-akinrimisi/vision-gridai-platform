# Pitfalls Research

**Domain:** Multi-niche AI video production platform (single VPS, async APIs, 2-hour video assembly)
**Researched:** 2026-03-08
**Confidence:** HIGH (most pitfalls verified via official docs, community reports, and multiple sources)

## Critical Pitfalls

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
Phase 4 (Production Pipeline) -- when building WF09 FFmpeg Assembly workflow. Docker memory limits should be set in Phase 1 (Foundation) when configuring infrastructure.

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
Phase 4 (Production Pipeline) -- when building WF07A (I2V) and WF07B (T2V) workflows. Design the polling/callback strategy before building these workflows.

---

### Pitfall 3: Supabase Realtime Subscriptions Leak Memory in React Dashboard

**What goes wrong:**
The Production Monitor page subscribes to `scenes` table changes filtered by `topic_id`. When the user navigates between topics or pages, old subscriptions aren't cleaned up. Each orphaned WebSocket channel holds ~800KB of retained memory. After navigating between 10-15 topics, the browser tab consumes over 500MB and eventually crashes or becomes unresponsive.

**Why it happens:**
React 18's Strict Mode calls useEffect twice in development, which creates two subscriptions but only cleans up one. In production, the issue is subtler: navigating away from a component doesn't automatically call `supabase.removeChannel()` unless the cleanup function is explicitly returned from useEffect. Route changes in React Router v6 unmount components, but if the subscription setup is async, the cleanup might reference a stale channel variable.

**How to avoid:**
- Always return a cleanup function from useEffect that calls `supabase.removeChannel(channel)`:
  ```javascript
  useEffect(() => {
    const channel = supabase.channel(`scenes-${topicId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'scenes', filter: `topic_id=eq.${topicId}` }, handler)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [topicId]);
  ```
- Create a custom `useRealtimeSubscription` hook that encapsulates this pattern. Use it everywhere instead of raw supabase channel calls.
- Limit active subscriptions: only subscribe to the currently viewed topic's scenes, not all topics at once.
- On the Projects Home page, subscribe to `topics` table (25 rows) not `scenes` table (4,300 rows across 25 topics).

**Warning signs:**
- Browser DevTools Memory tab shows steadily increasing heap size when navigating between pages
- "WebSocket connection closed" errors in browser console
- Dashboard becomes sluggish after 10+ minutes of use
- Chrome task manager shows dashboard tab using >300MB

**Phase to address:**
Phase 1 (Foundation) -- build the `useRealtimeSubscription` hook as part of the dashboard skeleton. Every subsequent phase uses this hook instead of raw subscriptions.

---

### Pitfall 4: n8n Workflow Timeout Kills Long-Running Production Stages

**What goes wrong:**
n8n's default workflow execution timeout is 3600 seconds (1 hour). The HTTP Request node defaults to 30 seconds. A video production workflow that generates 172 TTS audio files sequentially will take 15-30 minutes -- fine for the workflow timeout, but individual Kie.ai API calls (image or video generation) can take 3-5 minutes each, exceeding the 30-second HTTP timeout. The workflow fails mid-production, but only some scenes are marked complete in Supabase, leaving the topic in an inconsistent state.

Additionally, when the dashboard triggers a workflow via n8n webhook, Nginx's default proxy timeout (60 seconds) returns a 504 Gateway Timeout to the dashboard even though the workflow is still running. The user sees an error and thinks it failed.

**Why it happens:**
Three timeout layers are misconfigured: (1) Nginx proxy_read_timeout defaults to 60s, (2) n8n HTTP Request node timeout defaults to 30s, (3) n8n workflow execution timeout defaults to 3600s. Developers fix one but forget the others. n8n versions after 1.57.0 changed webhook response behavior, making this worse.

**How to avoid:**
- Dashboard webhook calls should use "Respond Immediately" mode on the n8n Webhook node. Return a 200 with `{ "status": "started", "topic_id": "..." }` immediately. The dashboard then monitors progress via Supabase Realtime, not by waiting for the webhook response.
- Set HTTP Request node timeout to 300000ms (5 minutes) for all API calls to Kie.ai, Google TTS, and Anthropic.
- Set n8n environment variables: `EXECUTIONS_TIMEOUT=7200` (2 hours) and `EXECUTIONS_TIMEOUT_MAX=14400` (4 hours) to handle the longest possible production run.
- Configure Nginx: `proxy_read_timeout 120s` for the `/webhook/` location block. But this is a safety net -- the real fix is "Respond Immediately."
- Every workflow must write its status to Supabase on start, on each scene completion, and on finish/failure. This makes the pipeline observable regardless of timeouts.

**Warning signs:**
- Dashboard shows "Error" or "Network Error" when triggering production, but the workflow actually ran
- n8n execution history shows "Timed Out" executions
- Topics stuck in "scripting" or "audio" status but n8n shows no running executions
- Nginx error logs contain `504 Gateway Time-out` entries

**Phase to address:**
Phase 1 (Foundation) -- configure all timeout values and establish the "Respond Immediately" pattern in the webhook API layer. Every subsequent workflow inherits these settings.

---

### Pitfall 5: YouTube API Quota Exhaustion Blocks All Uploads for 24 Hours

**What goes wrong:**
YouTube Data API v3 gives 10,000 units/day. A video upload costs 1,600 units (max 6 uploads/day). But the analytics pull (WF12) uses `search.list` (100 units each) and `videos.list` (1 unit each) calls. If the daily analytics cron pulls data for 25 published videos with pagination, it can consume 2,500+ units. Combined with uploads, you silently hit the quota limit. The next upload fails with a cryptic `quotaExceeded` error, and all uploads are blocked until midnight Pacific Time.

**Why it happens:**
Developers test uploads one at a time and don't account for analytics reads consuming the same quota pool. The YouTube API doesn't give a "quota remaining" header -- you only discover you're over when a request fails.

**How to avoid:**
- Track quota usage in Supabase. Create a `api_quota_usage` table or add a column to `production_log`. Before each API call, check estimated remaining quota.
- Use `videos.list` (1 unit per call, up to 50 IDs per call) instead of `search.list` (100 units) for analytics. You already have `youtube_video_id` stored -- use it directly.
- Schedule analytics pulls for off-peak hours (e.g., 2 AM UTC) and uploads during peak hours to avoid conflicts.
- Batch analytics: pull all 25 video IDs in a single `videos.list` call (1 unit) instead of 25 individual calls.
- Cap uploads at 5/day (leaving 2,000 units buffer for analytics and metadata updates).
- Implement a queue: if quota is near limit, defer uploads to the next day automatically.

**Warning signs:**
- YouTube upload returns HTTP 403 with `quotaExceeded` reason
- Analytics data stops updating (cron ran but all calls failed)
- More than 4 uploads attempted in a single day

**Phase to address:**
Phase 5 (Publish) -- when building WF11 (YouTube Upload) and WF12 (Analytics). Quota tracking should be built into both workflows from day one.

---

### Pitfall 6: Self-Hosted Supabase PostgreSQL Connection Exhaustion

**What goes wrong:**
Self-hosted Supabase's `supabase_admin` role alone consumes 50+ connections by default. PostgreSQL's default `max_connections` is 100. n8n workflows making HTTP requests to the Supabase REST API create connections through PostgREST, which holds its own connection pool. With 97 concurrent scene writes during production (one per completed scene), the connection pool saturates. New requests queue up, then timeout. The dashboard's Realtime subscription drops because Realtime needs its own connections. Pipeline writes fail silently.

**Why it happens:**
Self-hosted Supabase runs multiple services (PostgREST, Realtime, Auth, Storage) all competing for PostgreSQL connections from the same pool. The default configuration assumes lightweight usage. A video production pipeline doing rapid sequential writes (172 scenes) while the dashboard maintains Realtime subscriptions and PostgREST handles REST API calls creates unexpected connection pressure.

**How to avoid:**
- Increase PostgreSQL `max_connections` to 200 in the Supabase Docker Compose config (`POSTGRES_MAX_CONNECTIONS=200`).
- Use Supavisor (included in self-hosted Supabase) in transaction mode (port 6543) for n8n REST API calls. This pools connections and prevents exhaustion.
- In n8n workflows, don't fire 172 parallel HTTP requests to Supabase. Process scenes in batches of 10-20 with sequential writes within each batch.
- Monitor connections: run `SELECT count(*) FROM pg_stat_activity;` periodically via the supervisor agent.
- Set PostgREST's `PGRST_DB_POOL` to 20 (default is 100, which is too high for a 200-connection PostgreSQL).

**Warning signs:**
- Supabase REST API returns HTTP 503 or connection timeout errors
- Dashboard Realtime subscriptions disconnect and don't reconnect
- `pg_stat_activity` shows connections near `max_connections`
- PostgREST logs show "too many connections" errors

**Phase to address:**
Phase 1 (Foundation) -- configure PostgreSQL connection limits and Supavisor settings when deploying the Supabase schema. Test with simulated load before Phase 4.

---

### Pitfall 7: Pipeline Stalls Silently When Self-Chaining Workflow Fails to Fire Next

**What goes wrong:**
The self-chaining architecture means WF03 (TTS) fires WF04 (Images) on completion, which fires WF05 (Video), etc. If any workflow completes but fails to trigger the next one (n8n webhook call fails, n8n is temporarily overloaded, HTTP 500), the entire pipeline stops. The topic sits in an intermediate status forever. Without active monitoring, you don't discover it for hours or days.

**Why it happens:**
The "fire next workflow" HTTP call is treated as a fire-and-forget operation. If n8n is processing another heavy workflow and can't accept the webhook, the chain breaks. There's no retry on the self-chain trigger because the workflow considers itself "done" after writing to Supabase.

**How to avoid:**
- The self-chain trigger (HTTP Request to next workflow's webhook) must have `retry on fail` enabled with 3 retries and exponential backoff.
- Write the expected next stage to Supabase before attempting to trigger it: `UPDATE topics SET status = 'audio_complete_pending_images' WHERE id = ...`. The supervisor agent can then detect topics where status indicates "pending next stage" but no execution is running.
- Build the Supervisor Agent (WF_SUPERVISOR) early, not as a Phase 6 polish item. It should run every 30 minutes and check for stuck topics: `SELECT * FROM topics WHERE status LIKE '%pending%' AND last_status_change < NOW() - INTERVAL '2 hours'`.
- Add a manual "Resume Pipeline" button to the dashboard for each topic, which re-fires the appropriate workflow based on the topic's current status.

**Warning signs:**
- Topics stuck in the same status for more than 2 hours
- n8n execution history shows workflow completed successfully but next workflow never started
- Supervisor agent alerts (once built)
- Dashboard shows no active production but topics aren't complete

**Phase to address:**
Phase 2/3/4 (every phase that builds self-chaining workflows). The supervisor agent core should be built in Phase 4 alongside the production pipeline, not deferred to Phase 6.

---

### Pitfall 8: Google Drive API Rate Limits During Bulk Asset Upload

**What goes wrong:**
Each video produces ~270 files (172 audio, ~100 images). Uploading all files to Google Drive in rapid succession hits the per-user rate limit (20,000 calls per 100 seconds is generous, but upload calls are heavier than reads). More critically, the n8n Google Drive node creates multiple API calls per upload (create file + set permissions + get file metadata). With 270 uploads, this becomes 800+ API calls in quick succession. Occasional 429 errors cause individual uploads to fail, leaving gaps in the asset folder.

**Why it happens:**
Google Drive API limits are per-user per-project. The rate limit seems generous (20,000/100s) but upload operations are more expensive than reads, and the n8n Google Drive node makes multiple calls per logical "upload." Network latency on a VPS also means connections stay open longer, hitting concurrent connection limits.

**How to avoid:**
- Upload assets in batches with 500ms delays between uploads. Process 10 files, wait 2 seconds, then next 10.
- Implement retry with exponential backoff on 429 responses. The n8n HTTP Request node has built-in retry -- enable it.
- Don't upload intermediate assets if not needed. Audio files and images are intermediate -- only upload the final assembled video and captions to Drive. Store intermediate assets locally on the VPS (200GB NVMe) and clean up after assembly.
- If you must upload intermediate files (for debugging/audit), upload them asynchronously after the pipeline completes, not blocking the production flow.

**Warning signs:**
- Google Drive node in n8n returns 429 errors
- Some scenes are missing audio/image files in Drive but show as "uploaded" in Supabase
- Upload workflow takes more than 1 hour for a single video's assets

**Phase to address:**
Phase 4 (Production Pipeline) -- decide the upload strategy early. Recommend: local storage for intermediate assets, Drive upload only for final video + captions.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing scene data in `topics.script_json` JSONB instead of the `scenes` table | Simpler queries, single read | Can't subscribe to individual scene changes via Realtime, can't index scene-level fields, bloated row size | Never -- always use the `scenes` table for per-scene data |
| Hardcoding Kie.ai model names in n8n workflows | Faster to build | Model versions change (Kling 2.1 to 2.6), requires editing every workflow | Never -- use `projects.i2v_model` and `projects.t2v_model` from Supabase |
| Skipping the production_log table | Fewer writes, simpler workflows | No audit trail, can't debug failures, supervisor has no data | Never -- log every stage transition |
| Using n8n's native Supabase community node | Cleaner workflow UI | Community node may break on n8n updates, less control over headers/retry | Only in MVP if HTTP Request setup is too slow; migrate to HTTP Request before Phase 4 |
| Polling Supabase from dashboard instead of Realtime | Works without WebSocket setup | 15-second refresh lag, unnecessary load on PostgREST, poor UX | Only during Phase 1 development before Realtime is configured |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase REST API | Using `Authorization: Bearer ANON_KEY` for writes | Use `Authorization: Bearer SERVICE_ROLE_KEY` for n8n server-side writes. Anon key is for client-side reads with RLS. |
| Supabase REST API | Forgetting `Prefer: return=representation` on INSERT | Without this header, POST returns empty body. Add header to get the created row back (needed for chaining). |
| Kie.ai | Assuming 200 response means generation is complete | 200 only means task was created. Must poll or use callback. Check `task.status` field, not just HTTP status. |
| Kie.ai | Not downloading generated URLs immediately | Generated content URLs expire after 24 hours. Download to local storage or Drive within minutes of completion. |
| Google Cloud TTS | Estimating audio duration from text length or file size | Always use FFprobe to measure actual audio duration. TTS output duration varies by voice, speed, and pauses. |
| YouTube API | Using `search.list` to find own videos | Costs 100 quota units. Use `videos.list` with known IDs (1 unit) or `channels.list` with `contentDetails` part. |
| n8n Webhooks | Expecting webhook response after long workflow | Use "Respond Immediately" webhook mode. Dashboard monitors via Supabase Realtime, not webhook response. |
| FFmpeg | Using filter_complex for concat | Stream copy concat (`-f concat -c copy`) uses near-zero memory. Filter-based concat decodes everything. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Single Supabase Realtime channel for all scenes | Dashboard freezes, missed updates | Filter by `topic_id`, subscribe only to active topic | >500 scene updates in a production run |
| Loading all 172 scenes into React state at once | Slow initial render, re-render on every update | Virtualize scene list, paginate, or show summary with drill-down | First video production (172 rows is already heavy with frequent updates) |
| n8n storing all execution history | n8n SQLite DB grows to GB, UI becomes unusable | Set `EXECUTIONS_DATA_MAX_AGE=168` (7 days) and `EXECUTIONS_DATA_PRUNE=true` | After ~50 video productions (~10,000+ executions) |
| All 25 topics in production simultaneously | VPS CPU/RAM saturated, all 25 fail | Queue system: max 2 topics in production at once | First attempt at bulk production |
| Supabase `production_log` table without cleanup | Table grows to millions of rows, queries slow | Add retention policy: delete logs older than 30 days, or partition by month | After ~100 videos (100 * 172 scenes * 5 stages = 86,000 rows) |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Supabase anon key exposed in React build | Anyone with the key can read all data (no RLS configured) | Enable RLS on all tables. For solo use, add a simple `authenticated` check. Or use n8n webhooks as the API layer and never expose Supabase directly. |
| n8n webhook endpoints have no authentication | Anyone who discovers the URL can trigger workflows, approve topics, or start production | Add a shared secret header check in each webhook workflow: `if (headers['x-api-key'] !== 'YOUR_SECRET') return 401` |
| API keys in n8n workflow JSON exports | Exporting/sharing workflow JSON leaks credentials | Always use n8n credential references, never inline keys. Verify before any export. |
| YouTube OAuth refresh token in plain text | Token gives full channel access (upload, delete, modify) | Store in n8n credential manager only. Never log or write to Supabase. |
| `.env` file committed to git | All service keys exposed | Add `.env` to `.gitignore` before first commit. Verify with `git status`. |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indication during niche research (Phase A) | User thinks app crashed during 2-3 minute AI research | Show streaming status: "Searching competitors...", "Analyzing Reddit...", "Generating prompts..." via production_log Realtime |
| Approval gate shows raw JSON for script | User can't evaluate script quality | Render script as formatted chapters with highlighted avatar usage, emotional beats, and visual type indicators |
| No cost estimate before starting production | User doesn't know a video will cost ~$17 until it's done | Show estimated cost breakdown before "Start Production" click. Calculate from project config (images * cost + clips * cost). |
| "Reject" with no guidance on what to write | User types vague feedback, AI generates equally vague replacement | Provide refinement templates: "Change the angle to...", "Make it more specific to...", "Replace the hook with..." |
| Production monitor shows only current stage | User can't see what already completed or what's next | Show full pipeline timeline: completed stages (with timestamps), current stage (with progress), upcoming stages (greyed out) |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Supabase schema:** Often missing `REPLICA IDENTITY FULL` on tables -- without it, Realtime UPDATE events don't include the full row, breaking dashboard subscriptions
- [ ] **FFmpeg assembly:** Often missing `-movflags +faststart` -- without it, YouTube upload works but playback requires full download before starting (no streaming)
- [ ] **TTS audio:** Often missing loudness normalization (`loudnorm` filter) -- individual scenes sound fine but assembled video has inconsistent volume across 2 hours
- [ ] **n8n webhooks:** Often missing CORS headers -- dashboard fetch calls work in dev (same origin) but fail in production (different origin/port)
- [ ] **YouTube upload:** Often missing caption upload -- video publishes without captions, losing accessibility and SEO benefit
- [ ] **Topic refinement:** Often missing context of other 24 topics -- refined topic overlaps with existing approved topics
- [ ] **Scene status tracking:** Often missing the `last_status_change` timestamp update -- supervisor can't detect stalls because the timestamp never changes
- [ ] **Supabase Realtime:** Often missing channel unsubscription in React cleanup -- works in testing but leaks memory in production usage

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| FFmpeg OOM killed assembly | LOW | Restart container, check Docker logs for OOM, verify concat.txt is correct, re-run assembly. All scene clips are already on disk. |
| Kie.ai rate limited (429s) | LOW | Wait 60 seconds, re-run only failed scenes. Query Supabase for `video_status = 'failed'` and re-trigger only those. |
| Supabase connection exhaustion | MEDIUM | Restart Supabase Docker stack, increase `max_connections`, reduce PostgREST pool size. No data loss but pipeline needs restart. |
| YouTube quota exceeded | LOW | Wait until midnight Pacific Time. Queue the upload for next day. No data loss. |
| Self-chain broken (pipeline stalled) | LOW | Identify stuck topic via `SELECT * FROM topics WHERE last_status_change < NOW() - INTERVAL '2 hours'`. Manually trigger the appropriate next workflow via n8n UI or dashboard "Resume" button. |
| React memory leak from subscriptions | LOW | User refreshes browser. Fix: add proper cleanup to useEffect. Deploy fix, no data impact. |
| Google Drive upload gaps (missing files) | MEDIUM | Query Supabase for scenes where `audio_file_drive_id IS NULL AND audio_status = 'generated'`. Re-run upload for those specific scenes. |
| PostgreSQL data corruption (self-hosted) | HIGH | Restore from backup. Ensure automated daily backups of the Supabase PostgreSQL data volume (`pg_dump` cron or Docker volume backup). |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| FFmpeg OOM on long video | Phase 1 (Docker limits) + Phase 4 (concat strategy) | Assembly of a test 2-hour video completes in <5 minutes using <500MB RAM |
| Async API polling thundering herd | Phase 4 (I2V/T2V workflows) | 97 video generation tasks complete without any 429 errors from Kie.ai |
| Realtime subscription memory leak | Phase 1 (useRealtimeSubscription hook) | Browser memory stays under 200MB after 30 minutes of active dashboard use |
| n8n workflow timeouts | Phase 1 (infrastructure config) | Dashboard trigger returns 200 immediately; workflow runs for 30+ min without timeout |
| YouTube quota exhaustion | Phase 5 (upload + analytics) | 5 uploads + analytics pull for 25 videos stays under 8,000 quota units |
| PostgreSQL connection exhaustion | Phase 1 (Supabase config) | `pg_stat_activity` stays under 150 connections during peak production |
| Self-chain failure | Phase 2-4 (all chaining workflows) + Phase 4 (supervisor) | Supervisor detects and alerts on any topic stuck >2 hours; manual resume works |
| Google Drive rate limits | Phase 4 (upload strategy) | 270 file upload completes without 429 errors |
| No database backups | Phase 1 (infrastructure) | Daily `pg_dump` cron verified; test restore succeeds |

## Sources

- [FFmpeg FAQ - concatenation methods](https://ffmpeg.org/faq.html)
- [Kie.ai API Docs - async task model and rate limits](https://docs.kie.ai/)
- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits)
- [Supabase Self-Hosting Docker Guide](https://supabase.com/docs/guides/self-hosting/docker)
- [Supabase Connection Management](https://supabase.com/docs/guides/database/connection-management)
- [Supabase self-hosted connection pooling discussion](https://github.com/orgs/supabase/discussions/40399)
- [Supabase self-hosted supabase_admin 50+ connections issue](https://github.com/supabase/supabase/issues/33099)
- [n8n Error Handling Docs](https://docs.n8n.io/flow-logic/error-handling/)
- [n8n Timeout Troubleshooting](https://logicworkflow.com/blog/fix-n8n-timeout-errors/)
- [n8n 504 Gateway Timeout Issues](https://github.com/n8n-io/n8n/issues/17710)
- [n8n Best Practices 2026](https://michaelitoback.com/n8n-workflow-best-practices/)
- [YouTube Data API Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [Google Drive API Usage Limits](https://developers.google.com/workspace/drive/api/guides/limits)
- [React Supabase Realtime memory leak diagnosis](https://drdroid.io/stack-diagnosis/supabase-realtime-client-side-memory-leak)
- [Supabase Realtime React Strict Mode issue](https://github.com/supabase/realtime-js/issues/169)
- [Docker Resource Constraints](https://docs.docker.com/engine/containers/resource_constraints/)

---
*Pitfalls research for: Multi-niche AI video production platform*
*Researched: 2026-03-08*
