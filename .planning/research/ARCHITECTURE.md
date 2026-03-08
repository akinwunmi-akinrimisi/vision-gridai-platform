# Architecture Research

**Domain:** Multi-service AI media production platform (dashboard + orchestrator + async APIs + database)
**Researched:** 2026-03-08
**Confidence:** HIGH

## System Overview

```
                         BROWSER
                            |
                     Nginx (reverse proxy)
                      /          \
                     /            \
            React SPA            WebSocket
          (static files)         (Realtime)
               |                     |
               | /webhook/*         |
               v                     v
           n8n Docker          Supabase Realtime
       (orchestration)          (Elixir/Erlang)
          |       |                  |
          |       |                  | WAL replication
          |       v                  v
          |   Supabase PostgreSQL (source of truth)
          |
          +---> External APIs (async)
          |     - Claude (Anthropic) - sync, HTTP
          |     - Google TTS (Chirp 3 HD) - sync, HTTP
          |     - Kie.ai (Seedream/Kling) - async, poll
          |     - Google Drive - sync, HTTP
          |     - YouTube Data API - sync, HTTP
          |
          +---> FFmpeg (in n8n Docker container)
                - builds clips, concatenates, normalizes
```

### Component Boundaries

| Component | Responsibility | Owns | Communicates With |
|-----------|---------------|------|-------------------|
| **React SPA** | User interface, approval gates, monitoring | UI state, subscription lifecycle | Supabase (reads + Realtime), n8n (webhooks for actions) |
| **Nginx** | Reverse proxy, static file serving, SSL | Routing, TLS termination | React build, n8n webhooks, Supabase Realtime |
| **n8n** | Pipeline orchestration, API calls, FFmpeg execution | Workflow logic, retry state, credential store | Supabase (CRUD via REST), all external APIs, FFmpeg CLI |
| **Supabase PostgreSQL** | Data persistence, source of truth | All application state (projects, topics, scenes, logs) | n8n (REST writes), React (REST reads), Realtime (WAL) |
| **Supabase Realtime** | Live dashboard push updates | WebSocket connections, WAL replication slot | PostgreSQL (WAL polling), React (WebSocket push) |
| **External APIs** | AI generation, media storage, distribution | Generated content, uploaded assets | n8n (HTTP calls) |
| **FFmpeg** | Video/audio processing | Nothing persistent -- reads/writes temp files | n8n (CLI invocation), Docker volume (temp files) |

## Recommended Project Structure

```
vision-gridai-platform/
├── dashboard/                    # React SPA
│   ├── src/
│   │   ├── pages/                # 7 page components (route-level)
│   │   ├── components/           # Shared UI components
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── useRealtime.js    # Supabase channel subscriptions
│   │   │   ├── useProject.js     # Project data + CRUD
│   │   │   └── useSupabase.js    # Supabase client singleton
│   │   └── lib/
│   │       ├── supabase.js       # Client initialization
│   │       └── api.js            # n8n webhook call wrappers
│   ├── nginx.conf                # Reverse proxy config
│   └── package.json
├── workflows/                    # n8n workflow JSON exports (17 files)
├── directives/                   # Per-stage SOPs (00-14)
├── execution/                    # Shell scripts run by n8n (FFmpeg, cleanup)
├── supabase/migrations/          # SQL schema files
├── design-system/                # UI design tokens and page overrides
├── data/                         # Per-project source data
└── .planning/                    # GSD state files
```

### Structure Rationale

- **dashboard/src/hooks/**: Isolates Supabase Realtime subscription logic from UI. The `useRealtime` hook manages channel lifecycle (subscribe on mount, unsubscribe on unmount) so pages stay clean.
- **dashboard/src/lib/**: Single Supabase client instance shared across the app. The `api.js` module wraps all n8n webhook calls so pages never construct URLs directly.
- **workflows/**: n8n workflow JSON exports stored in version control. Not imported automatically -- these are reference/backup. n8n stores active workflows in its own SQLite/PostgreSQL.
- **directives/**: SOPs read by Claude Code before building each workflow. These constrain implementation, not runtime behavior.
- **execution/**: Shell scripts invoked by n8n Execute Command nodes. Kept outside n8n for version control and testability.

## Architectural Patterns

### Pattern 1: Dashboard Reads from Supabase, Writes Through n8n

**What:** The React dashboard reads all data directly from Supabase (REST API or Realtime subscriptions) but NEVER writes directly. All mutations go through n8n webhook endpoints, which validate, orchestrate, and write to Supabase.

**When to use:** Every user action that triggers pipeline behavior (approve, reject, refine, start production).

**Trade-offs:**
- PRO: n8n owns all business logic. Dashboard is a pure view layer. No split-brain writes.
- PRO: n8n can chain follow-up actions (e.g., approve topic triggers script generation).
- CON: Adds ~200ms latency per action (dashboard -> Nginx -> n8n -> Supabase vs. dashboard -> Supabase direct).
- CON: n8n must be running for any mutation. If n8n is down, the dashboard is read-only.

**Example:**
```javascript
// dashboard/src/lib/api.js
const WEBHOOK_BASE = '/webhook'; // Nginx proxies to n8n

export async function approveTopic(topicId) {
  const res = await fetch(`${WEBHOOK_BASE}/topics/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic_id: topicId }),
  });
  // Don't update local state -- wait for Supabase Realtime to push the change
  return res.json();
}
```

**Exception:** Simple inline edits (title, description) where no pipeline action follows CAN write directly to Supabase from the dashboard. Use this sparingly.

### Pattern 2: Self-Chaining Workflows (Fire-and-Forget Forward)

**What:** Each n8n workflow, upon successful completion, triggers the next workflow via an HTTP Request to n8n's own webhook endpoint. There is no central orchestrator polling for completion.

**When to use:** Every transition between pipeline stages (script done -> trigger TTS, TTS done -> trigger images, etc.).

**Trade-offs:**
- PRO: Each workflow is independently testable. You can run WF05 (voiceover) in isolation.
- PRO: Failure isolation -- WF05 failing does not crash WF06.
- PRO: Easy to add/remove stages without modifying a central orchestrator.
- CON: No single view of "where is the pipeline?" -- must query Supabase to reconstruct state.
- CON: If the chain-forward HTTP call fails, the pipeline silently stalls. The Supervisor Agent exists to catch this.

**Implementation:**
```
WF03_script completes
  -> PATCH topics SET status='audio' (Supabase)
  -> POST /webhook/internal/start-tts { topic_id } (n8n self-call)

WF05_voiceover completes
  -> PATCH topics SET status='images' (Supabase)
  -> POST /webhook/internal/start-images { topic_id } (n8n self-call)
```

**Critical rule:** Always write the status to Supabase BEFORE firing the next workflow. This way, if the chain-forward call fails, the Supervisor Agent can detect "status=images but no image progress after 30 min" and re-trigger.

### Pattern 3: Supabase Realtime for Live Dashboard (Subscribe After Load)

**What:** The dashboard loads initial data with a standard Supabase REST query, THEN subscribes to Realtime changes on the same filter. This avoids the race condition where changes happen between load and subscribe.

**When to use:** Production Monitor page (scene-level progress), Project Dashboard (topic status changes), any page showing live-updating data.

**Trade-offs:**
- PRO: Instant updates, no polling. Sub-second latency from n8n write to dashboard render.
- PRO: Supabase handles fan-out -- multiple browser tabs get updates automatically.
- CON: Requires `REPLICA IDENTITY FULL` on tables (already set in migration). Increases WAL size.
- CON: Self-hosted Realtime processes `postgres_changes` on a single thread per table. At 172 scenes updating rapidly, this could bottleneck. Mitigated by the fact that only one video produces at a time.
- CON: NOTIFY payload limit is 8KB. Scene rows are well under this, but if `script_json` JSONB were on a Realtime-subscribed table, large scripts could exceed it. The `topics` table has Realtime enabled but `script_json` changes are infrequent, so this is acceptable.

**Example:**
```javascript
// dashboard/src/hooks/useRealtime.js
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useSceneProgress(topicId) {
  const [scenes, setScenes] = useState([]);

  useEffect(() => {
    // 1. Load initial state
    supabase
      .from('scenes')
      .select('scene_number, audio_status, image_status, video_status')
      .eq('topic_id', topicId)
      .order('scene_number')
      .then(({ data }) => setScenes(data || []));

    // 2. Subscribe to changes
    const channel = supabase
      .channel(`scenes:${topicId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'scenes',
        filter: `topic_id=eq.${topicId}`,
      }, (payload) => {
        setScenes(prev => prev.map(s =>
          s.scene_number === payload.new.scene_number ? { ...s, ...payload.new } : s
        ));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [topicId]);

  return scenes;
}
```

### Pattern 4: Async API Polling with Exponential Backoff (Kie.ai)

**What:** Kie.ai image and video generation is async: POST to create a task, receive a task ID, poll `/v1/task/result` until status is "completed" or "failed". Use exponential backoff with jitter.

**When to use:** WF06 (image generation), WF07a (I2V), WF07b (T2V).

**Trade-offs:**
- PRO: Standard pattern for media generation APIs. Well-understood.
- CON: Polling wastes API calls. No webhook alternative from Kie.ai.
- CON: Must handle timeout (task stuck in "processing" forever). Set a max poll duration (e.g., 10 minutes for images, 30 minutes for video).

**Implementation in n8n:**
```
HTTP Request: POST /v1/task/create -> get task_id
Loop node (max 60 iterations):
  Wait node: exponential backoff (5s, 10s, 20s, 40s... capped at 60s)
  HTTP Request: GET /v1/task/result?task_id={{task_id}}
  IF node: status == "completed" -> exit loop
  IF node: status == "failed" -> error branch
  IF node: iteration > 60 -> timeout error branch
```

**Error classification:**
- `completed` -> write URL to scenes table, continue
- `failed` (NSFW filter) -> mark scene as `skipped`, write skip_reason
- `failed` (server error) -> retry task creation up to 3 times
- `timeout` -> mark scene as failed, Supervisor will catch it

### Pattern 5: FFmpeg Assembly Pipeline (Concat Protocol)

**What:** Video assembly for 2-hour documentaries uses FFmpeg's concat demuxer (`-f concat`) with pre-built scene clips. This avoids re-encoding the entire video and prevents OOM on the VPS.

**When to use:** WF09 (FFmpeg assembly).

**Trade-offs:**
- PRO: `-c copy` (stream copy) uses minimal CPU and RAM. Critical for a 4 vCPU / 16GB VPS.
- PRO: Concatenation of 172 pre-built clips is fast (seconds, not hours).
- CON: All clips MUST have identical codecs, resolution, and frame rate. This must be enforced during clip creation.
- CON: Temporary files for 172 clips consume significant disk space (~5-10GB per video). Cleanup after assembly is mandatory.

**Pipeline sequence:**
```
1. Build each scene clip: FFmpeg zoompan on image + audio overlay -> scene_NNN.mp4
   (or use video clip directly for i2v/t2v scenes)
2. Generate concat.txt listing all 172 clips in order
3. FFmpeg concat: ffmpeg -f concat -safe 0 -i concat.txt -c copy -movflags +faststart output.mp4
4. Normalize audio: ffmpeg -af "loudnorm=I=-16:TP=-1.5:LRA=11" (requires re-encode audio only)
5. Upload to Drive
6. Delete all temp files
```

**Disk space management:**
- Before starting assembly, check available disk: `df -h /tmp`
- If < 15GB free, refuse to start and alert Supervisor
- After upload, run cleanup immediately (execution/cleanup.sh)

## Data Flow

### Flow 1: User Action -> Pipeline Trigger (Write Path)

```
User clicks "Approve Topic" in React SPA
    |
    v
POST /webhook/topics/approve { topic_id }
    |  (Nginx proxies to n8n)
    v
n8n WF_WEBHOOK receives request
    |
    +-> PATCH topics SET review_status='approved' (Supabase REST)
    |
    +-> POST /webhook/internal/start-production { topic_id } (self-chain)
    |
    v
n8n WF03_script starts
    |
    +-> Read prompt_configs for project (Supabase REST)
    +-> Read topic + avatar data (Supabase REST)
    +-> Call Claude API (3 passes, sync HTTP)
    +-> PATCH topics SET script_json, script_quality_score (Supabase)
    +-> INSERT scenes (172 rows) (Supabase)
    +-> PATCH topics SET status='script_review' (Supabase)
    |
    v
Dashboard receives Realtime UPDATE on topics table
    -> Shows "Script Ready for Review" notification
```

### Flow 2: Production Progress (Real-time Read Path)

```
n8n WF05_voiceover processes scene 47 of 172
    |
    +-> Call Google TTS API (sync)
    +-> FFprobe measures duration (CLI)
    +-> Upload audio to Drive (sync)
    +-> PATCH scenes SET audio_status='uploaded', audio_duration_ms=8432
        WHERE topic_id=X AND scene_number=47
    |
    v
PostgreSQL WAL captures the UPDATE
    |
    v
Supabase Realtime polls WAL, matches filter topic_id=eq.X
    |
    v
WebSocket push to React SPA
    |
    v
useSceneProgress hook updates state
    |
    v
Production Monitor page: dot 47 turns green, progress bar advances to 47/172
```

### Flow 3: Async Media Generation (Kie.ai Polling)

```
n8n WF06_image_generation processes scene 12
    |
    +-> POST Kie.ai /v1/task/create { prompt, model: "seedream-4.5" }
    +-> Receive task_id
    |
    v
Poll loop (n8n Loop node):
    +-> Wait 5s (then 10s, 20s, 40s, 60s max)
    +-> GET Kie.ai /v1/task/result?task_id=XXX
    +-> Check status:
        - "processing" -> continue loop
        - "completed"  -> extract image_url, exit loop
        - "failed"     -> error branch
    |
    v
On completion:
    +-> Download image from URL
    +-> Upload to Drive
    +-> PATCH scenes SET image_status='uploaded', image_url=..., image_drive_id=...
    +-> Continue to next scene
```

### State Management (Dashboard)

```
Supabase PostgreSQL (server state, source of truth)
    |
    +-> REST API reads (initial page load)
    |     -> React component state (useState/useReducer)
    |
    +-> Realtime WebSocket (live updates)
          -> Patch into existing React state
          -> No full refetch needed

n8n webhook calls (mutations)
    -> Fire-and-forget from dashboard
    -> Dashboard does NOT optimistically update
    -> Waits for Realtime push to confirm the change
    -> This guarantees dashboard always reflects actual DB state
```

**Why no optimistic updates:** In a solo-user production pipeline, the 200ms delay between action and confirmation is negligible. Optimistic updates add complexity (rollback on failure) without meaningful UX benefit here.

## Scaling Considerations

| Concern | Current (1 user, 1 VPS) | At 5 niches / 3 concurrent productions | At 20+ niches |
|---------|------------------------|----------------------------------------|---------------|
| **CPU** | FFmpeg assembly is the spike (~3 min at 100% for concat+normalize). One production at a time is fine. | Queue productions -- never run 2 FFmpeg assemblies simultaneously. n8n's concurrency setting handles this. | Move FFmpeg to a dedicated worker or use cloud transcoding. |
| **RAM** | 16GB is comfortable. n8n ~500MB, Supabase ~1GB, Nginx ~50MB, FFmpeg peak ~2GB. | Monitor FFmpeg memory during assembly. 172 clips at 1080p can spike. | Upgrade VPS or offload FFmpeg. |
| **Disk** | 200GB NVMe. Each video assembly needs ~10GB temp. Cleanup after each video. | With 3 concurrent, need 30GB temp. Keep 50GB free minimum. | Add external storage or stream to/from Drive. |
| **Supabase Realtime** | 1 WebSocket connection, maybe 3 channels. Negligible load. | Still fine. Self-hosted has no connection limits beyond what you configure. | Monitor WAL size and replication slot lag. |
| **n8n** | 17 workflows, 1 active at a time. Fine. | n8n handles concurrent workflows well up to ~10-20 simultaneous. | Consider n8n queue mode with multiple workers. |

### Scaling Priorities

1. **First bottleneck: Disk space.** 172 scene clips + final video = ~8-12GB per production. With multiple videos in flight, disk fills fast. Cleanup scripts must run reliably. Monitor with df before each assembly.
2. **Second bottleneck: Kie.ai rate limits.** 100 images + 97 video clips per video, each requiring a poll loop. If Kie.ai throttles at 10 concurrent tasks, a single video's media generation takes 2-3 hours. Parallelizing multiple videos multiplies this.
3. **Third bottleneck: n8n execution memory.** Long-running workflows with many iterations (172 scenes) accumulate execution data in n8n's memory. Use "Execute Once" mode where possible and avoid storing large payloads in workflow variables.

## Anti-Patterns

### Anti-Pattern 1: Dashboard Writes Directly to Supabase for Pipeline Actions

**What people do:** Have the React dashboard PATCH topics SET status='approved' directly, then separately trigger n8n.
**Why it's wrong:** Creates a race condition. If the n8n trigger fails, Supabase shows "approved" but no production starts. Dashboard and pipeline are now out of sync. Also splits business logic between two systems.
**Do this instead:** All mutations through n8n webhooks. n8n writes to Supabase AND triggers follow-up actions atomically (within one workflow execution).

### Anti-Pattern 2: Polling Supabase from the Dashboard

**What people do:** `setInterval(() => fetch('/api/scenes'), 5000)` to check production progress.
**Why it's wrong:** Wastes bandwidth, adds 0-5 second latency, hammers the database with identical queries. Supabase Realtime exists specifically to eliminate this.
**Do this instead:** Subscribe to `postgres_changes` on the `scenes` and `topics` tables. Updates arrive in <500ms with zero wasted queries.

### Anti-Pattern 3: Central Orchestrator Workflow

**What people do:** Build one massive n8n workflow that calls all pipeline stages sequentially with IF nodes for each stage.
**Why it's wrong:** Impossible to test stages independently. A failure in image generation crashes the entire workflow. Execution data grows unbounded in memory. Editing a 50+ node workflow in n8n's UI is painful.
**Do this instead:** Self-chaining workflows. Each stage is its own workflow (WF03, WF04, WF05, etc.). On completion, trigger the next via webhook. The Supervisor Agent monitors for stalls.

### Anti-Pattern 4: Storing Large Blobs in Supabase

**What people do:** Store audio files, images, or video clips as bytea columns or base64 in Supabase.
**Why it's wrong:** PostgreSQL is not a blob store. WAL size explodes. Realtime NOTIFY fails on payloads > 8KB. Backups become enormous.
**Do this instead:** Store all media files on Google Drive. Store only the Drive file ID and URL in Supabase. Scene rows stay small (< 1KB each).

### Anti-Pattern 5: Batch-Writing Scene Updates

**What people do:** Process all 172 scenes, collect results in memory, then write all 172 rows to Supabase at the end.
**Why it's wrong:** If the workflow crashes at scene 150, scenes 1-149 have no record in Supabase. Dashboard shows no progress. On restart, all 172 scenes must be re-processed because there's no checkpoint.
**Do this instead:** Write to Supabase after EVERY scene. This gives: (1) live dashboard progress, (2) automatic checkpointing -- on restart, skip scenes where status != 'pending', (3) cost tracking accuracy.

## Integration Points

### External Services

| Service | Integration Pattern | Error Handling | Notes |
|---------|---------------------|----------------|-------|
| Anthropic Claude | Sync HTTP POST, JSON response | Retry on 429/500 (3x, exponential backoff). 401 -> alert. | ~$0.15-0.45 per script pass. Temperature 0.9 for scripts, 0.3 for evaluation. |
| Google Cloud TTS | Sync HTTP POST, returns audio bytes | Retry on 5xx (3x). Monitor quota. | ~$0.002 per scene. 172 calls per video. |
| Kie.ai | Async: POST create -> poll result | Poll with backoff. NSFW -> skip scene. Timeout at 10min (images) / 30min (video). | Most expensive service. Rate limits unknown -- throttle to 5 concurrent. |
| Google Drive | Sync HTTP, OAuth2 | Retry on 5xx. 403 quota -> wait and retry. | Folder structure: project/topic/subfolder (audio, images, clips). |
| YouTube Data API | Sync HTTP, OAuth2, resumable upload | 403 quota (10K units/day, 1600 per upload) -> queue for next day. | Max 6 uploads per day. Schedule wisely. |
| Supabase REST | Sync HTTP, API key auth | Retry on 5xx (3x). Connection refused -> alert (database down). | PostgREST filter syntax: `?field=eq.value`. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Dashboard <-> n8n | HTTPS (Nginx proxy at /webhook/*) | Dashboard sends JSON, n8n responds with status. Fire-and-forget for pipeline triggers. |
| Dashboard <-> Supabase | HTTPS (direct to Supabase URL) + WSS (Realtime) | Reads only (REST). Live updates (WebSocket). Supabase JS client handles both. |
| n8n <-> Supabase | HTTPS (REST API via HTTP Request nodes) | All CRUD. Uses service_role key for full access (no RLS in v1). |
| n8n <-> FFmpeg | CLI execution (docker exec / Execute Command node) | FFmpeg runs inside the n8n-ffmpeg Docker container. Files passed via Docker volume mount. |
| n8n <-> n8n (self-chain) | HTTPS (webhook POST to own /webhook/internal/*) | Each workflow triggers the next. Supervisor monitors for dropped chains. |

## Build Order Implications

Based on the component dependencies, here is the recommended build sequence:

```
Phase 1: Foundation
  Supabase schema (all tables) ----+
  Dashboard skeleton (router,      |
    Supabase client, auth gate) ---+--> Everything depends on these
  n8n webhook API layer -----------+

Phase 2: Niche Research + Topics
  (Depends on: Supabase schema, webhook API)
  WF00 + WF01 + WF02 (project creation, research, topic gen)
  Topic Review page (Gate 1)
  Supabase Realtime wiring (first use: topic status updates)

Phase 3: Script Generation
  (Depends on: topics table populated, webhook API, Realtime)
  WF03 (3-pass script) + WF04 (scene segmentation)
  Script Review page (Gate 2)
  Production Monitor page skeleton

Phase 4: Production Pipeline
  (Depends on: scenes table populated, FFmpeg in Docker)
  WF05-WF09 (TTS, images, video, captions, assembly)
  Production Monitor page (full Realtime scene tracking)
  This is the longest phase -- most external API integrations

Phase 5: Publish + Analytics
  (Depends on: assembled video, Drive upload)
  Video Review page (Gate 3)
  WF10-WF12 (Drive upload, YouTube upload, analytics)
  Analytics page

Phase 6: Polish
  (No hard dependencies -- all incremental)
  Supervisor Agent, Cost Tracker, Settings page, Mobile responsive
```

**Key dependency insight:** The dashboard skeleton and Supabase schema MUST be built first because every subsequent phase writes to Supabase and expects the dashboard to display results. The n8n webhook API layer must exist before any pipeline workflow, because workflows need endpoints to self-chain to.

**Parallelizable:** Within Phase 4, TTS (WF05), images (WF06), and video generation (WF07a/b) can be built in parallel since they all read from the same scenes table and write to different columns. In practice, TTS must complete first (it establishes the master timeline), but images and video generation are independent of each other.

## Sources

- [Supabase Realtime Architecture](https://supabase.com/docs/guides/realtime/architecture) -- WAL-based replication, Elixir cluster design
- [Supabase Realtime Concepts](https://supabase.com/docs/guides/realtime/concepts) -- Channels, postgres_changes, broadcast, presence
- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits) -- 8KB NOTIFY limit, single-thread postgres_changes processing
- [n8n Error Handling Docs](https://docs.n8n.io/flow-logic/error-handling/) -- Error workflows, retry on fail
- [Advanced n8n Error Handling](https://www.wednesday.is/writing-articles/advanced-n8n-error-handling-and-recovery-strategies) -- Circuit breaker, exponential backoff patterns
- [n8n Auto-Retry Engine Template](https://n8n.io/workflows/3144-auto-retry-engine-error-recovery-workflow/) -- Retry workflow pattern
- [FFmpeg in Docker for Video Processing](https://img.ly/blog/building-a-production-ready-batch-video-processing-server-with-ffmpeg/) -- Producer-consumer model, batch processing
- [Async Request-Reply Pattern](https://dev.to/igornosatov_15/the-asynchronous-request-reply-pattern-your-guide-to-not-waiting-around-like-a-chump-2k8h) -- Polling, idempotency keys
- [Supabase Realtime Scalable Systems](https://medium.com/@ansh91627/building-scalable-real-time-systems-a-deep-dive-into-supabase-realtime-architecture-and-eccb01852f2b) -- Optimistic UI, subscription patterns
- VisionGridAI_Platform_Agent.md -- Internal architecture spec (source of truth)
- Dashboard_Implementation_Plan.md -- Internal dashboard spec and Supabase patterns

---
*Architecture research for: Vision GridAI Platform -- Multi-Niche AI Video Production*
*Researched: 2026-03-08*
