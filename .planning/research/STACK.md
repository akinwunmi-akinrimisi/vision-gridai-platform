# Technology Stack

**Project:** Vision GridAI Platform
**Researched:** 2026-03-08

## Recommended Stack

### Dashboard Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React | 18.2.x | UI framework | Stable, mature, excellent ecosystem for real-time dashboards. React 19 exists but 18 is battle-tested and all project tooling (Supabase JS, Recharts, Lucide) works flawlessly with it. No reason to adopt 19's breaking changes for a solo-user dashboard. | HIGH |
| Vite | 6.x | Build tool / dev server | Vite 7 is latest but 6.x is the current LTS-like stable release. Fast HMR, native ESM. Use `@vitejs/plugin-react` 4.x. **Requires Node.js 20.19+ or 22.12+** (Vite 6 dropped Node 18 support). | HIGH |
| Tailwind CSS | 3.4.x | Utility-first CSS | **Stay on v3, do NOT upgrade to v4.** Rationale: The design system in `design-system/MASTER.md` was generated for Tailwind v3 class syntax. Tailwind v4 has breaking changes (CSS-first config, removed utilities like `text-opacity-*`, changed border defaults to `currentColor`, removed `tailwind.config.js` in favor of `@theme`). Migrating adds zero value for this project and risks breaking the pre-generated design system. v3.4 is stable and fully maintained. | HIGH |
| React Router | 7.x | Client-side routing | v7 is a non-breaking upgrade from v6. In v7, import from `react-router` directly (not `react-router-dom`). Supports React 18. Install `react-router` (the unified package). | HIGH |

### State Management & Data Fetching

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @tanstack/react-query | 5.x | Server state / caching | Use for all Supabase reads (topics list, project data, analytics). Provides caching, background refetch, loading/error states out of the box. Pair with Supabase Realtime: when a Realtime event fires, call `queryClient.invalidateQueries()` to trigger a clean refetch. This is cleaner than manually merging Realtime payloads into local state. | HIGH |
| @supabase/supabase-js | 2.98.x | Supabase client (DB + Realtime) | The official JS client. Handles PostgREST queries, Realtime channel subscriptions, and auth. Current version 2.98.0. No v3 on the horizon. | HIGH |

### UI Components & Visualization

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Recharts | 3.8.x | Charts (analytics page, score visualizations) | Built on React + D3. Declarative API matches React patterns. Handles line charts, bar charts, pie charts, radial bars (for quality scores). v3 is a major rewrite with better performance and tree-shaking. | HIGH |
| Lucide React | 0.577.x | Icon library | Tree-shakeable, consistent style, 1500+ icons. Each icon imports individually so bundle stays small. Drop-in replacement for Heroicons with better coverage. | HIGH |

### Database & Backend

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase (self-hosted) | Latest Docker images | PostgreSQL + Realtime + REST API | Already deployed at `supabase.operscale.cloud`. Self-hosted means no rate limits, no row limits, full control. PostgREST exposes the database as a REST API. Realtime uses PostgreSQL logical replication to push changes over WebSocket. | HIGH |
| PostgreSQL | 15.x (via Supabase Docker) | Primary database | Relational model fits the project/topic/scene hierarchy perfectly. JSONB columns for flexible data (script_json, cost_breakdown, evaluation results). Full-text search available if needed later. | HIGH |

### Orchestration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| n8n (self-hosted Docker) | Latest | Workflow orchestration | Already deployed. Visual workflow editor. 400+ integrations. Native HTTP Request nodes for Supabase REST API calls. Webhook trigger nodes for dashboard-to-pipeline communication. Execute Command node for FFmpeg. Self-chaining via webhook calls between workflows. | HIGH |

### Media Production

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| FFmpeg | 6.x+ (via Alpine apk) | Video/audio assembly | Installed in the `n8n-ffmpeg` Docker container via `apk add --no-cache ffmpeg`. Used for: zoompan on static images, concat demuxer for assembly, loudnorm for audio normalization. **Critical:** Use `-c copy` for concat to avoid re-encoding 2hr videos (prevents OOM on 16GB VPS). | HIGH |
| FFprobe | (bundled with FFmpeg) | Audio duration measurement | Master clock source. Every scene's visual duration is set by FFprobe-measured audio duration. Never estimate from file size. | HIGH |
| Google Cloud TTS (Chirp 3 HD) | v1 API | Voiceover generation | 30 voice styles, pace/pause control, SSML support. Called via n8n HTTP Request node to `texttospeech.googleapis.com/v1/text:synthesize`. Outputs LINEAR16 WAV or MP3. Cost: ~$0.30/video for 172 scenes. | HIGH |
| Kie.ai API | Current | Image + video generation proxy | Single API gateway to Seedream 4.5 (images) and Kling 2.1 Standard (I2V + T2V). Async pattern: POST to create task, poll `/v1/task/result` for completion. Cheaper than Replicate/Fal.ai. Fixed pricing, no subscription. | MEDIUM |
| Seedream 4.5 (via Kie.ai) | Current | AI image generation | ByteDance's model. 4K generation, strong detail control. $0.032/image via Kie.ai. 100 images/video = $3.20. | MEDIUM |
| Kling 2.1 Standard (via Kie.ai) | Current | AI video clip generation | I2V (image-to-video) at $0.125/5s clip. T2V (text-to-video) at $0.125/5s clip. 720p output. 25 I2V + 72 T2V = $12.13/video. Note: Kling 2.6 is available with native audio but costs more ($0.28-$0.55/clip) -- not needed since audio is handled separately via TTS. | MEDIUM |

### YouTube Integration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| YouTube Data API v3 | v3 | Upload, metadata, analytics | 10,000 quota units/day. Upload = 1,600 units = max 6 uploads/day. Use resumable uploads for 2hr videos (large files). OAuth2 via n8n credential manager. Analytics pull via `reports.query` endpoint (daily cron). | HIGH |

### AI / LLM

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Claude Sonnet (Anthropic API) | claude-sonnet-4-20250514 or latest | Script generation, niche research, topic generation, evaluation | Direct Anthropic API (NOT OpenRouter). Called via n8n HTTP Request nodes to `api.anthropic.com/v1/messages`. 3-pass script generation needs large context windows (200K tokens). Web search tool available for niche research phase. | HIGH |

### Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Nginx | Latest stable | Static file server + reverse proxy | Serves React build at `/opt/dashboard/`. Reverse proxies `/webhook/` to n8n. Handles SPA routing with `try_files $uri $uri/ /index.html`. WebSocket upgrade for Supabase Realtime. | HIGH |
| Docker | Latest | Container runtime | Runs n8n and Supabase. The n8n container is custom-built with FFmpeg installed. | HIGH |
| Hostinger KVM 4 VPS | N/A | Server | 4 vCPU, 16GB RAM, 200GB NVMe. Adequate for single-user platform. FFmpeg concat with `-c copy` avoids high memory usage. | HIGH |

### Storage

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Google Drive | API v3 | Asset storage (audio, images, clips, final videos) | Already integrated. Folder hierarchy per project/topic. Used for video preview URLs in dashboard. Free storage with Google Workspace. | HIGH |

## Supporting Libraries (Dashboard)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.x | Date formatting | Display timestamps, "3 min ago", schedule dates. Lighter than moment.js, tree-shakeable. |
| clsx | 2.x | Conditional class names | Cleaner than string template literals for Tailwind conditional classes. |
| react-hot-toast | 2.x | Toast notifications | Gate approval confirmations, error alerts, production status changes. Lightweight, customizable. |
| @tanstack/react-table | 8.x | Data tables | Topic list, production queue, analytics table. Headless (style with Tailwind). Sorting, filtering, pagination built-in. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| CSS Framework | Tailwind CSS 3.4 | Tailwind CSS 4.0 | Breaking changes (CSS-first config, removed utilities, changed defaults). Design system already generated for v3. Zero benefit for this project. |
| Build Tool | Vite 6 | Webpack 5 | Slower, more complex config. Vite is the standard for new React projects. |
| Routing | React Router 7 | TanStack Router | React Router is simpler for SPA routing. TanStack Router is better for file-based routing (Next.js-like), which we don't need. |
| State | TanStack Query | SWR | TanStack Query has better devtools, mutation support, and query invalidation API for Realtime integration. |
| State | TanStack Query + Realtime | Supabase Realtime only (manual state) | Manual state management with Realtime payloads is error-prone (missed events, reconnection handling, stale closures). TanStack Query + invalidation is more robust. |
| Charts | Recharts 3.x | Victory, Nivo | Recharts has the simplest API for React. Victory is heavier. Nivo is SSR-focused. |
| Icons | Lucide React | Heroicons, react-icons | Lucide is tree-shakeable with the best coverage. react-icons bundles too much. Heroicons has fewer icons. |
| Supabase Client | HTTP Request nodes in n8n | n8n native Supabase node | The community Supabase node has maintenance risk and less control over PostgREST query parameters. HTTP Request nodes are explicit and debuggable. |
| Framework | React SPA | Next.js | Over-engineered for a solo-user dashboard served by Nginx. No SSR/SSG needed. Adds complexity (server component model, hydration). |
| Database | Supabase (self-hosted PostgreSQL) | Google Sheets | No rate limits, proper relational model, Realtime subscriptions, JSONB, indexing. Google Sheets caps at 60 req/min and has no real-time push. |
| Video Gen | Kling 2.1 Standard (via Kie.ai) | Kling 2.6 | 2.6 adds native audio which we don't need (TTS handles audio separately). 2.6 costs 2x more per clip. |
| TTS | Google Cloud TTS Chirp 3 HD | ElevenLabs | Chirp 3 HD is cheaper and has pace/pause control via SSML. ElevenLabs sounds slightly more natural but costs 10x more at scale (172 scenes/video). |

## Supabase Realtime: Critical Implementation Patterns

### Pattern 1: TanStack Query + Realtime Invalidation (Recommended)

```typescript
// hooks/useRealtimeInvalidation.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useRealtimeInvalidation(
  table: string,
  filter?: string,
  queryKeys?: string[][]
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        () => {
          // Invalidate relevant queries -- TanStack Query handles refetch
          (queryKeys || [[table]]).forEach((key) =>
            queryClient.invalidateQueries({ queryKey: key })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, queryClient]);
}
```

### Pattern 2: React 18 Strict Mode Guard

```typescript
// Prevent double subscription in development strict mode
useEffect(() => {
  const channel = supabase.channel('my-channel');
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scenes' }, handler)
    .subscribe();

  return () => {
    supabase.removeChannel(channel); // Cleanup on unmount (handles strict mode re-mount)
  };
}, []);
```

### Pattern 3: Filtered Subscriptions (Performance Critical)

```typescript
// ALWAYS filter Realtime subscriptions to the active project/topic
// Unfiltered subscriptions receive ALL changes and cause unnecessary load
.on('postgres_changes', {
  event: 'UPDATE',
  schema: 'public',
  table: 'scenes',
  filter: `topic_id=eq.${topicId}`,  // <-- ALWAYS filter
}, handler)
```

### Key Realtime Constraints (Self-Hosted)

- **Single-threaded change processing:** Database changes are processed on a single thread to maintain order. Compute upgrades don't help Realtime throughput.
- **No RLS needed:** Solo-user platform with no RLS policies means no authorization overhead per change event. This is a performance advantage.
- **REPLICA IDENTITY FULL required:** Already set in the migration SQL. Without it, UPDATE events don't include the full row payload.
- **Reconnection handling:** Subscribe to channel status events and reload data on reconnect to avoid missing changes during brief disconnections.

## n8n Workflow Patterns for Media Pipelines

### Pattern 1: Self-Chaining via Webhook

```
WF_A (end) --> HTTP Request node --> POST /webhook/start-phase-b
```

Each workflow is independently testable. Failure in WF_A doesn't leave WF_B in a broken state.

### Pattern 2: Checkpoint/Resume

Every scene write to Supabase acts as a checkpoint. If a workflow crashes at scene 98/172, restart queries `scenes WHERE topic_id = X AND audio_status = 'pending'` and resumes from scene 99.

### Pattern 3: Large File Handling in Docker

- Use `/tmp` inside the container for intermediate files (auto-cleaned on restart).
- Stream files to Google Drive immediately after creation (don't accumulate in container).
- For FFmpeg concat: write a `concat.txt` file listing all clips, use `-c copy` to avoid re-encoding.
- Container memory: 16GB VPS is sufficient with `-c copy` (no re-encoding), but re-encoding a 2hr video would OOM.

### Pattern 4: Async API Polling (Kie.ai)

```
HTTP Request (POST create task) --> Wait node (10s) --> Loop:
  HTTP Request (GET /v1/task/result) --> IF status == "completed" --> continue
                                     --> IF status == "processing" --> Wait (10s) --> Loop back
                                     --> IF status == "failed" --> Error handling
```

### Pattern 5: Modular Workflows (5-10 Nodes Each)

Keep workflows small and focused. One workflow per pipeline stage. Don't build monolithic 50-node workflows. Current plan of 17 workflows (WF00-WF12 + agents) is the right granularity.

## FFmpeg Commands Reference

```bash
# TTS scene clip (zoompan on static image, timed to audio)
ffmpeg -loop 1 -i scene_001.png -i scene_001.mp3 \
  -vf "zoompan=z='min(zoom+0.0005,1.3)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30" \
  -t $(ffprobe -v quiet -show_entries format=duration -of csv=p=0 scene_001.mp3) \
  -c:v libx264 -pix_fmt yuv420p -c:a aac scene_001.mp4

# Concat all scenes (NO re-encoding -- critical for 2hr videos)
ffmpeg -f concat -safe 0 -i concat.txt -c copy -movflags +faststart final_raw.mp4

# Audio normalization (re-encodes audio only, copies video)
ffmpeg -i final_raw.mp4 -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:v copy final.mp4
```

## Installation

```bash
# Dashboard dependencies
cd dashboard

# Core
npm install react@^18.2.0 react-dom@^18.2.0 react-router@^7.13.0 \
  @supabase/supabase-js@^2.98.0 @tanstack/react-query@^5.67.0 \
  recharts@^3.8.0 lucide-react@^0.577.0 \
  date-fns@^4.1.0 clsx@^2.1.0 react-hot-toast@^2.5.0

# Optional (add when needed)
npm install @tanstack/react-table@^8.20.0

# Dev dependencies
npm install -D vite@^6.2.0 @vitejs/plugin-react@^4.4.0 \
  tailwindcss@^3.4.17 autoprefixer@^10.4.20 postcss@^8.4.49
```

**Node.js requirement:** 20.19+ or 22.12+ (Vite 6 dropped Node 18)

## Sources

- [Supabase Realtime Postgres Changes docs](https://supabase.com/docs/guides/realtime/postgres-changes) -- HIGH confidence
- [Supabase Realtime Benchmarks](https://supabase.com/docs/guides/realtime/benchmarks) -- HIGH confidence
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) -- v2.98.0, HIGH confidence
- [React Router v7 changelog](https://reactrouter.com/changelog) -- v7.13.1, HIGH confidence
- [React Router v7 upgrade guide](https://reactrouter.com/upgrading/v6) -- HIGH confidence
- [Vite releases](https://vite.dev/releases) -- v6.x stable, HIGH confidence
- [Tailwind CSS v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide) -- breaking changes documented, HIGH confidence
- [Recharts npm](https://www.npmjs.com/package/recharts) -- v3.8.0, HIGH confidence
- [Lucide React npm](https://www.npmjs.com/package/lucide-react) -- v0.577.0, HIGH confidence
- [TanStack Query + Supabase pattern](https://makerkit.dev/blog/saas/supabase-react-query) -- MEDIUM confidence
- [n8n FFmpeg Docker setup](https://github.com/yigitkonur/n8n-docker-ffmpeg) -- HIGH confidence
- [n8n workflow best practices 2026](https://michaelitoback.com/n8n-workflow-best-practices/) -- MEDIUM confidence
- [YouTube Data API v3 quotas](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits) -- HIGH confidence
- [Google Cloud TTS Chirp 3 HD docs](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd) -- HIGH confidence
- [Kie.ai API docs](https://docs.kie.ai/) -- MEDIUM confidence
- [Kie.ai Seedream 4.5](https://kie.ai/seedream-4-5) -- MEDIUM confidence
- [Kie.ai Kling 2.1](https://kie.ai/kling/v2-1) -- MEDIUM confidence
- [Supabase Realtime best practices (Leanware)](https://www.leanware.co/insights/supabase-best-practices) -- MEDIUM confidence
- [Supabase Realtime architecture deep dive](https://medium.com/@ansh91627/building-scalable-real-time-systems-a-deep-dive-into-supabase-realtime-architecture-and-eccb01852f2b) -- MEDIUM confidence
