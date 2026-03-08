# Phase 4: Production Pipeline - Research

**Researched:** 2026-03-08
**Domain:** n8n workflow orchestration, media generation APIs (Google Cloud TTS, Kie.ai), FFmpeg assembly, React real-time dashboard
**Confidence:** MEDIUM

## Summary

Phase 4 is the largest and most complex phase in the project. It spans three distinct domains: (1) n8n workflows that orchestrate a deterministic production pipeline across 4 external APIs (Google Cloud TTS, Kie.ai Seedream 4.5, Kie.ai Kling 2.1 I2V, Kie.ai Kling 2.1 T2V), (2) FFmpeg video assembly with SRT caption generation, and (3) a dashboard Production Monitor page with real-time scene-level progress via Supabase Realtime. The pipeline also includes a supervisor agent (cron-based n8n workflow) and updates to the existing Project Dashboard and Topic Review pages.

The core technical challenge is the async-poll pattern for Kie.ai (POST to create task, poll `/api/v1/jobs/recordInfo` for completion) combined with sliding-window batching (5 concurrent tasks). Google Cloud TTS is synchronous (POST returns base64 audio) but must process 172 scenes sequentially to build a cumulative master timeline. FFmpeg assembly uses a two-step approach: build individual scene clips, then concat with `-c copy`. All writes go to Supabase immediately, and the dashboard subscribes to Realtime events for instant scene-by-scene progress updates.

**Primary recommendation:** Structure this phase into 6-7 plans: (1) Wave 0 test scaffolding, (2) production webhook + trigger/queue system, (3) TTS workflow + master timeline, (4) visual generation workflows (images + I2V + T2V), (5) captions + FFmpeg assembly workflow, (6) Production Monitor dashboard page rewrite, (7) supervisor agent + Project Dashboard pipeline table. Each workflow should be a complete n8n JSON deployed via Synta MCP.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Production Monitor: Hero card with active topic, stage chips, dot grid grouped by chapter, queue list, recently completed section, collapsible activity log, Stop Production button
- Empty state: "No active production" with approved topic count and "Start Production" CTA
- Auto-advance to next queued topic after success animation (3-5 seconds)
- Manual trigger per topic via "Start Production" button in Topic Review and Production Monitor
- One topic at a time, queue ordered by topic_number, queue tracked via topics.status ('queued'/'producing')
- ConfirmDialog with cost estimate on every production start
- Stop sets status='stopped', workflows check before each scene, completed scenes kept
- Resume re-fires webhook, workflow skips completed assets
- Restart from Scratch: double confirmation (type 'RESTART'), deletes assets, resets statuses
- 3 automatic retries per scene with exponential backoff (30s, 60s, 120s), then mark 'failed'
- Failed Scenes section: retry, edit & retry (image prompt textarea), skip per-scene; batch retry all / skip all
- Assembly blocked until all 172 scenes complete or skipped; auto-start if 0 skips
- Skipped scenes: black frame + white text "[Scene skipped]" for audio duration
- Supervisor: 30-min cron, checks >2hr stuck, auto-retries failed scenes once, then alerts
- Dashboard alert: toast + amber banner on Production Monitor + sidebar amber dot badge
- Pipeline table on Project Dashboard: live-updating via Realtime
- Full n8n workflow JSONs deployed via Synta MCP
- TTS sequential, Kie.ai sliding window (5 concurrent)
- Parallel visual completion sync: last visual workflow to finish fires captions + assembly
- Single /production/trigger webhook entry point
- Supabase state-driven stop/resume
- Queue auto-advance on completion
- Immediate Drive upload per asset
- Per-topic subfolder structure on Drive
- Pre-build scene clips then concat (not single-pass filter)
- Static images: no zoompan, static display
- Video scenes: loop if audio > 5s, trim if audio < 5s
- Concat with -c copy, audio normalization on final only
- Captions: SRT file + optional burn-in
- Costs tracked incrementally in topics.cost_breakdown and topics.total_cost
- Production logging: key milestones only (not individual scene completions)
- Topic status flow: queued -> audio -> images -> assembling -> assembled

### Claude's Discretion
- Exact dot grid dimensions and responsive breakpoints
- Activity log entry format and timestamp styling
- Toast notification styling for supervisor alerts
- Kie.ai API polling interval and batch size tuning
- FFmpeg encoding parameters for scene clips (resolution, bitrate, codec)
- Caption burn-in styling (font, size, position, background)
- Error message categorization logic
- Exact ETA rolling average window size
- Success animation design

### Deferred Ideas (OUT OF SCOPE)
- Auto-start production after Gate 2 (keep manual for v1)
- Concurrent multi-topic production
- Drag-and-drop queue reordering
- Per-scene zoompan/Ken Burns effects
- Speed-adjusted video clips
- Production priority ordering beyond topic_number
- In-browser video preview during assembly
- Cost budget limits / auto-stop at cost threshold
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROD-01 | TTS audio generation for all scenes using Google Cloud TTS Chirp 3 HD | Google Cloud TTS REST API pattern documented; sequential processing with Supabase writes |
| PROD-02 | Audio duration measured with FFprobe (master clock) | FFprobe command pattern documented; critical for cumulative timeline |
| PROD-03 | Master timeline computed from cumulative audio durations | Sequential TTS processing enables cumulative start_time_ms/end_time_ms computation |
| PROD-04 | Image generation for static_image scenes using Kie.ai Seedream 4.5 | Kie.ai async task API documented; sliding window batching pattern |
| PROD-05 | I2V clip generation using Kie.ai Kling 2.1 Standard | Kie.ai I2V API documented; same async pattern as images |
| PROD-06 | T2V clip generation using Kie.ai Kling 2.1 Standard | Kie.ai T2V API documented; same async pattern |
| PROD-07 | Caption/subtitle file generated from scene narration + timestamps | SRT format documented; generated from scenes table data post-TTS |
| PROD-08 | FFmpeg assembly with concat -c copy, captions, audio normalization | FFmpeg patterns documented; two-step build clips then concat |
| PROD-09 | Each asset uploaded to Google Drive immediately | n8n Google Drive node or HTTP Request for upload |
| PROD-10 | Each scene row updated in Supabase immediately (not batched) | Existing Supabase REST PATCH pattern reused |
| PROD-11 | Self-chaining: each workflow fires next on completion | Webhook-based chaining (HTTP POST to next workflow) |
| PROD-12 | Error handling: failures written to Supabase with status + error_log | Existing error handling patterns extended with retry logic |
| PROD-13 | Production Monitor page with real-time scene-by-scene progress | useRealtimeSubscription hook + useScenes hook extended |
| PROD-14 | Project Dashboard pipeline status table | useTopics hook already provides Realtime; add table component |
| OPS-01 | Supervisor agent runs every 30 minutes | n8n Schedule Trigger workflow, queries topics with stale last_status_change |
| OPS-02 | Supervisor can retry, skip, or alert based on error type | Decision logic in n8n IF nodes + HTTP calls to retry/skip webhooks |
</phase_requirements>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | ^18.2.0 | Dashboard UI | Already installed, TanStack Query integration |
| @tanstack/react-query | (installed) | Data fetching + cache | Already used for topics, scenes, scripts |
| @supabase/supabase-js | ^2.39.0 | Realtime + direct DB reads | Already wired with useRealtimeSubscription |
| Vite | ^5.0.0 | Build tool + dev server | Already configured with proxy to n8n |
| Tailwind CSS | ^3.4.0 | Styling | Already configured, glass-card pattern established |
| lucide-react | ^0.263.1 | Icons | Already used throughout dashboard |
| Vitest | (installed) | Testing | Already configured in vite.config.js with jsdom |

### External APIs (n8n Workflows)
| Service | Endpoint | Purpose | Auth |
|---------|----------|---------|------|
| Google Cloud TTS | `POST https://texttospeech.googleapis.com/v1/text:synthesize` | Chirp 3 HD voiceover | Service Account / OAuth2 |
| Kie.ai Create Task | `POST https://api.kie.ai/api/v1/jobs/createTask` | Image + video generation | Bearer token |
| Kie.ai Poll Result | `GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=X` | Check task completion | Bearer token |
| Google Drive | n8n Google Drive node | File upload per asset | OAuth2 |
| Supabase REST | `PATCH https://supabase.operscale.cloud/rest/v1/scenes?id=eq.X` | Scene status updates | API key + service role |

### No New Dashboard Dependencies
Phase 4 dashboard work uses only existing libraries. No new npm packages needed.

## Architecture Patterns

### Recommended Project Structure (New Files)
```
dashboard/src/
├── pages/
│   ├── ProductionMonitor.jsx       # Full rewrite (currently skeleton)
│   └── ProjectDashboard.jsx        # Add pipeline table (currently skeleton)
├── components/
│   ├── production/
│   │   ├── HeroCard.jsx            # Active topic hero with stage chips
│   │   ├── DotGrid.jsx             # 172-dot scene progress grid
│   │   ├── QueueList.jsx           # Topic queue with remove
│   │   ├── FailedScenes.jsx        # Failed scene actions
│   │   ├── ActivityLog.jsx         # Collapsible production log
│   │   └── CostEstimateDialog.jsx  # Production start confirmation
│   ├── topics/
│   │   └── TopicCard.jsx           # Extend with production badge + mini progress
│   └── dashboard/
│       └── PipelineTable.jsx       # Live pipeline status table
├── hooks/
│   ├── useProductionProgress.js    # Scenes query + Realtime for active topic
│   ├── useProductionMutations.js   # trigger, stop, retry, skip webhooks
│   ├── useProductionLog.js         # Recent production_log entries
│   └── useProjectMetrics.js        # Aggregated metrics from topics
├── lib/
│   └── api.js                      # Add production webhook helpers
workflows/
├── WF_PRODUCTION_TRIGGER.json      # Entry point: validate, create Drive folders, fire TTS
├── WF_TTS_AUDIO.json               # Sequential TTS for 172 scenes
├── WF_IMAGE_GENERATION.json        # Sliding window Seedream 4.5
├── WF_I2V_GENERATION.json          # Sliding window Kling 2.1 I2V
├── WF_T2V_GENERATION.json          # Sliding window Kling 2.1 T2V
├── WF_CAPTIONS_ASSEMBLY.json       # SRT generation + FFmpeg assembly
├── WF_SUPERVISOR.json              # 30-min cron supervisor
├── WF_WEBHOOK_PRODUCTION.json      # Dashboard webhook endpoints
```

### Pattern 1: n8n Sliding Window Batch Processing
**What:** For Kie.ai API calls, submit 5 tasks concurrently, poll for completion, replace completed slots with next pending scene.
**When to use:** All Kie.ai visual generation (images, I2V, T2V)
**Why:** Kie.ai rate limit is 20 requests/10 seconds. 5 concurrent with ~10-30s generation time stays well under limit while maximizing throughput.

```
n8n Flow:
1. Load all pending scenes for this visual type from Supabase
2. Take first 5 → POST createTask for each
3. Loop: poll recordInfo for all active tasks (2-5 second interval)
4. On task success: update Supabase scene row, upload to Drive, add next pending to active set
5. On task fail: increment retry, if retries < 3 re-submit with backoff, else mark failed
6. When all scenes processed: check if ALL visual types complete for this topic
7. If last visual type to finish → fire captions + assembly webhook
```

### Pattern 2: Sequential TTS with Cumulative Timeline
**What:** Process scenes one at a time, measure audio with FFprobe, compute cumulative timestamps.
**When to use:** TTS audio generation (PROD-01, PROD-02, PROD-03)

```
n8n Flow:
1. Load all scenes for topic ordered by scene_number
2. For each scene sequentially:
   a. POST to Google Cloud TTS with narration_text
   b. Save audio file to /tmp/production/{topic_id}/audio/
   c. FFprobe to measure exact duration in ms
   d. Upload to Google Drive audio subfolder
   e. PATCH scene row: audio_status='uploaded', audio_duration_ms, audio_file_drive_id,
      start_time_ms = previous scene end_time_ms (or 0), end_time_ms = start + duration
   f. Update cost_breakdown incrementally
3. On complete: update topic.status='images', fire parallel visual webhooks
```

### Pattern 3: Parallel Visual Completion Sync
**What:** After TTS, fire images + I2V + T2V in parallel. Last workflow to finish detects all visuals complete and triggers assembly.
**When to use:** Coordinating parallel visual generation workflows.

```
Each visual workflow on completion:
1. Count scenes WHERE topic_id = X AND visual_type IN ('static_image','i2v','t2v')
   AND (image_status = 'uploaded' OR video_status = 'uploaded' OR skipped = true)
2. Count total scenes WHERE topic_id = X
3. If completed + skipped = total → fire captions/assembly webhook
4. If not → exit (another workflow will be the last to finish)
```

### Pattern 4: Supabase State-Driven Stop/Resume
**What:** Workflows check `topics.status` before processing each scene. If 'stopped', exit cleanly.
**When to use:** Every production workflow loop iteration.

```
Before each scene:
1. GET topics?id=eq.{topic_id}&select=status
2. IF status = 'stopped' → exit loop, log to production_log
3. IF status NOT IN ('audio','images','assembling') → exit (unexpected state)
4. ELSE → continue processing
```

### Pattern 5: Production Monitor Real-time Updates
**What:** Dashboard subscribes to Supabase Realtime on scenes table for active topic + topics table for status changes.
**When to use:** Production Monitor page.

```javascript
// Subscribe to scene updates for active topic
useRealtimeSubscription('scenes', `topic_id=eq.${activeTopicId}`, [
  ['scenes', activeTopicId],
  ['production-progress', activeTopicId]
]);

// Subscribe to topic status changes for queue management
useRealtimeSubscription('topics', `project_id=eq.${projectId}`, [
  ['topics', projectId]
]);
```

### Anti-Patterns to Avoid
- **Polling for scene progress in dashboard:** Use Supabase Realtime, never setInterval polling
- **Batch writes to Supabase:** Write EACH scene immediately after asset generation, never batch
- **Single-pass FFmpeg assembly:** Build individual scene clips first, then concat. Single-pass complex filter graphs crash on 172 scenes
- **Re-encoding on concat:** Use `-c copy` for concat. Re-encoding a 2hr video will OOM on 16GB VPS
- **Hardcoded scene counts:** Always query actual scene count from Supabase, never assume 172
- **Synchronous Kie.ai calls:** Always async POST + poll. Kie.ai has no synchronous generation endpoint
- **Processing scenes out of order for TTS:** Master timeline requires strict sequential order for cumulative timestamps

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SRT caption format | Custom timestamp formatter | Standard SRT format with scene data | SRT is a simple format but timing must match FFprobe-measured durations exactly |
| Audio normalization | Custom FFmpeg filter chain | `loudnorm=I=-16:TP=-1.5:LRA=11` single pass | Industry standard loudness target, well-tested |
| Exponential backoff | Manual setTimeout logic | n8n Wait node with expression `{{ 30 * Math.pow(2, $json.retry_count) }}` | n8n has native Wait node, cleaner than code loops |
| Cost calculation | Client-side math | Server-side (n8n workflow) writes to topics.cost_breakdown | Avoid drift between workflows and dashboard |
| Queue management | Custom queue table | topics.status field ('queued'/'producing') | Existing schema supports it, no new tables needed |
| File cleanup | Manual rm commands | n8n Execute Command node with cleanup script | Cleanup after successful final upload to Drive |

## Common Pitfalls

### Pitfall 1: TTS Audio Duration Mismatch
**What goes wrong:** Using estimated duration (word count / words_per_minute) instead of FFprobe-measured duration
**Why it happens:** Temptation to skip FFprobe step for speed
**How to avoid:** ALWAYS FFprobe after TTS generation. The master timeline and all visual durations depend on exact audio measurements
**Warning signs:** Video clips are longer/shorter than their audio, captions drift out of sync

### Pitfall 2: Kie.ai Task State "generating" Treated as Error
**What goes wrong:** Polling returns state="generating" and workflow treats it as failure
**Why it happens:** Only "success" and "fail" are terminal states. "waiting", "queuing", "generating" are intermediate
**How to avoid:** Only act on "success" or "fail". Continue polling for all other states. Set a maximum poll timeout (e.g., 10 minutes for images, 5 minutes for video clips)
**Warning signs:** Perfectly good tasks being marked as failed

### Pitfall 3: Concurrent Visual Workflows Double-Triggering Assembly
**What goes wrong:** Two visual workflows finish near-simultaneously and both detect "all visuals complete", firing assembly twice
**Why it happens:** Race condition in the completion check
**How to avoid:** Use a Supabase atomic update: `UPDATE topics SET assembly_status = 'starting' WHERE id = X AND assembly_status = 'pending' RETURNING id`. Only the workflow that gets a row back proceeds. Others see 0 rows and exit.
**Warning signs:** Two assembly processes running simultaneously, corrupted output

### Pitfall 4: FFmpeg Concat Codec Mismatch
**What goes wrong:** Scene clips have different codecs/resolutions and `-c copy` concat fails
**Why it happens:** Static image clips (built from PNG + audio) and video clips (from Kie.ai) may have different stream parameters
**How to avoid:** Encode ALL scene clips to the same format: H.264, 1920x1080, 30fps, AAC audio. The concat step uses `-c copy` (no re-encoding), but the individual clip build step must ensure uniform encoding
**Warning signs:** FFmpeg "incompatible stream" errors, video glitches at scene boundaries

### Pitfall 5: Google Drive Rate Limiting on 172 Uploads
**What goes wrong:** Uploading 172+ files in rapid succession hits Drive API rate limits
**Why it happens:** Google Drive API has per-user rate limits (default ~750 requests/minute)
**How to avoid:** TTS is sequential (~2s/scene, well under rate limits). Visual generation is slower (~10-30s/asset), also fine. Only concern is if all 172 are uploaded in a burst. The sliding window pattern naturally throttles this.
**Warning signs:** 403 "Rate Limit Exceeded" from Google Drive API

### Pitfall 6: VPS Disk Space Exhaustion
**What goes wrong:** Temp files from 172 audio files + 100 images + 97 video clips + 172 scene clips fill /tmp
**Why it happens:** Each video clip is ~5-10MB, total can be 2-3GB per topic
**How to avoid:** Clean up temp files after Drive upload. Use `/tmp/production/{topic_id}/` isolation. Run cleanup after successful final video upload.
**Warning signs:** "No space left on device" errors mid-production

### Pitfall 7: Supabase Realtime Channel Limits
**What goes wrong:** Subscribing to 172 individual scene channels or creating too many channels
**Why it happens:** Over-granular subscriptions
**How to avoid:** Subscribe to the ENTIRE scenes table filtered by topic_id (single channel). The useRealtimeSubscription hook already supports this pattern. Invalidate the TanStack Query cache on any scene change, let React re-render the affected dots.
**Warning signs:** WebSocket connection dropping, missed updates

## Code Examples

### Google Cloud TTS REST Call (n8n HTTP Request)
```json
{
  "method": "POST",
  "url": "https://texttospeech.googleapis.com/v1/text:synthesize",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "googleApi",
  "body": {
    "input": { "text": "={{ $json.narration_text }}" },
    "voice": {
      "languageCode": "en-US",
      "name": "en-US-Chirp3-HD-Charon"
    },
    "audioConfig": {
      "audioEncoding": "MP3",
      "sampleRateHertz": 24000
    }
  }
}
```
Response: `{ "audioContent": "<base64-encoded-mp3>" }` -- decode and save to file.

### Kie.ai Create Task (n8n HTTP Request)
```json
{
  "method": "POST",
  "url": "https://api.kie.ai/api/v1/jobs/createTask",
  "headers": {
    "Authorization": "Bearer {{ $credentials.kieApiKey }}",
    "Content-Type": "application/json"
  },
  "body": {
    "model": "seedream/seedream-4.5-text-to-image",
    "input": {
      "prompt": "={{ $json.image_prompt }}",
      "aspect_ratio": "16:9",
      "quality": "basic"
    }
  }
}
```
Response: `{ "code": 200, "data": { "taskId": "task_xxx" } }`

### Kie.ai Poll Result (n8n HTTP Request)
```json
{
  "method": "GET",
  "url": "https://api.kie.ai/api/v1/jobs/recordInfo",
  "headers": {
    "Authorization": "Bearer {{ $credentials.kieApiKey }}"
  },
  "qs": {
    "taskId": "={{ $json.taskId }}"
  }
}
```
Response states: `waiting`, `queuing`, `generating`, `success`, `fail`
On success: `data.resultJson` contains `{"resultUrls":["https://..."]}`

### Kie.ai Kling 2.1 I2V Task
```json
{
  "model": "kling/v2-1-standard-image-to-video",
  "input": {
    "prompt": "={{ $json.image_prompt }}",
    "image_url": "={{ $json.image_url }}",
    "duration": "5"
  }
}
```

### Kie.ai Kling 2.1 T2V Task
```json
{
  "model": "kling/v2-1-standard-text-to-video",
  "input": {
    "prompt": "={{ $json.image_prompt }}",
    "duration": "5",
    "aspect_ratio": "16:9"
  }
}
```

### FFprobe Duration Measurement (n8n Execute Command)
```bash
ffprobe -v quiet -show_entries format=duration -of csv=p=0 /tmp/production/{{ $json.topic_id }}/audio/scene_{{ $json.scene_number.toString().padStart(3,'0') }}.mp3
```
Returns duration in seconds (e.g., `8.432`). Multiply by 1000 for ms.

### FFmpeg Build Static Image Scene Clip
```bash
ffmpeg -loop 1 -i /tmp/production/{{ topic_id }}/images/scene_{{ scene_num }}.png \
  -i /tmp/production/{{ topic_id }}/audio/scene_{{ scene_num }}.mp3 \
  -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 128k \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -r 30 -t {{ duration_seconds }} \
  -movflags +faststart \
  /tmp/production/{{ topic_id }}/clips/scene_{{ scene_num }}.mp4
```

### FFmpeg Build Video Scene Clip (Loop/Trim)
```bash
# If audio > 5s (loop the 5s video clip):
ffmpeg -stream_loop -1 -i /tmp/production/{{ topic_id }}/video_clips/scene_{{ scene_num }}.mp4 \
  -i /tmp/production/{{ topic_id }}/audio/scene_{{ scene_num }}.mp3 \
  -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 128k \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -r 30 -t {{ duration_seconds }} \
  -movflags +faststart \
  /tmp/production/{{ topic_id }}/clips/scene_{{ scene_num }}.mp4

# If audio < 5s (trim the video):
ffmpeg -i /tmp/production/{{ topic_id }}/video_clips/scene_{{ scene_num }}.mp4 \
  -i /tmp/production/{{ topic_id }}/audio/scene_{{ scene_num }}.mp3 \
  -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 128k \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -r 30 -t {{ duration_seconds }} \
  -movflags +faststart \
  /tmp/production/{{ topic_id }}/clips/scene_{{ scene_num }}.mp4
```

### FFmpeg Skipped Scene (Black Frame + Text)
```bash
ffmpeg -f lavfi -i color=c=black:s=1920x1080:r=30:d={{ duration_seconds }} \
  -i /tmp/production/{{ topic_id }}/audio/scene_{{ scene_num }}.mp3 \
  -vf "drawtext=text='[Scene skipped]':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2" \
  -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 128k \
  -r 30 -t {{ duration_seconds }} \
  -movflags +faststart \
  /tmp/production/{{ topic_id }}/clips/scene_{{ scene_num }}.mp4
```

### FFmpeg Concat (No Re-encoding)
```bash
# Generate concat list
for i in $(seq 1 {{ scene_count }}); do
  printf "file '/tmp/production/{{ topic_id }}/clips/scene_%03d.mp4'\n" $i
done > /tmp/production/{{ topic_id }}/concat.txt

# Concat
ffmpeg -f concat -safe 0 -i /tmp/production/{{ topic_id }}/concat.txt \
  -c copy -movflags +faststart \
  /tmp/production/{{ topic_id }}/raw_final.mp4
```

### FFmpeg Audio Normalization (Final Step)
```bash
ffmpeg -i /tmp/production/{{ topic_id }}/raw_final.mp4 \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -c:v copy \
  -movflags +faststart \
  /tmp/production/{{ topic_id }}/final/{{ topic_title }}.mp4
```

### SRT Caption Generation (JavaScript in n8n Code Node)
```javascript
// Generate SRT from scenes data
const scenes = $input.all();
let srt = '';

scenes.forEach((item, index) => {
  const scene = item.json;
  const startMs = scene.start_time_ms;
  const endMs = scene.end_time_ms;

  const formatTime = (ms) => {
    const h = Math.floor(ms / 3600000).toString().padStart(2, '0');
    const m = Math.floor((ms % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
    const mil = (ms % 1000).toString().padStart(3, '0');
    return `${h}:${m}:${s},${mil}`;
  };

  srt += `${index + 1}\n`;
  srt += `${formatTime(startMs)} --> ${formatTime(endMs)}\n`;
  srt += `${scene.narration_text}\n\n`;
});

return [{ json: { srt_content: srt } }];
```

### Production Webhook API Helpers (dashboard api.js)
```javascript
// Add to lib/api.js
export const triggerProduction = (topicId) =>
  webhookCall('production/trigger', { topic_id: topicId });

export const triggerProductionBatch = (topicIds) =>
  webhookCall('production/trigger-batch', { topic_ids: topicIds });

export const stopProduction = (topicId) =>
  webhookCall('production/stop', { topic_id: topicId });

export const resumeProduction = (topicId) =>
  webhookCall('production/resume', { topic_id: topicId });

export const restartProduction = (topicId) =>
  webhookCall('production/restart', { topic_id: topicId });

export const retryScene = (sceneId) =>
  webhookCall('production/retry-scene', { scene_id: sceneId });

export const retryAllFailed = (topicId) =>
  webhookCall('production/retry-all-failed', { topic_id: topicId });

export const skipScene = (sceneId, reason) =>
  webhookCall('production/skip-scene', { scene_id: sceneId, reason });

export const skipAllFailed = (topicId) =>
  webhookCall('production/skip-all-failed', { topic_id: topicId });

export const editAndRetryScene = (sceneId, imagePrompt) =>
  webhookCall('production/edit-retry-scene', { scene_id: sceneId, image_prompt: imagePrompt });
```

### Dot Grid Component Pattern
```jsx
// DotGrid.jsx - Scene progress visualization
function DotGrid({ scenes }) {
  // Group scenes by chapter
  const chapters = scenes.reduce((acc, scene) => {
    const ch = scene.chapter || 'Unknown';
    if (!acc[ch]) acc[ch] = [];
    acc[ch].push(scene);
    return acc;
  }, {});

  const getDotColor = (scene) => {
    if (scene.skipped) return 'bg-slate-400';
    if (scene.clip_status === 'complete' || scene.clip_status === 'uploaded') return 'bg-emerald-500';
    if (scene.video_status === 'uploaded' || scene.image_status === 'uploaded') return 'bg-purple-500';
    if (scene.audio_status === 'uploaded') return 'bg-blue-500';
    if (['failed'].includes(scene.audio_status) || ['failed'].includes(scene.image_status) || ['failed'].includes(scene.video_status)) return 'bg-red-500';
    return 'bg-slate-200 dark:bg-white/[0.06]'; // pending
  };

  return (
    <div className="space-y-4">
      {Object.entries(chapters).map(([chapter, chapterScenes]) => (
        <div key={chapter}>
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1 block">
            {chapter}
          </span>
          <div className="flex flex-wrap gap-1">
            {chapterScenes.map((scene) => (
              <div
                key={scene.id}
                className={`w-2.5 h-2.5 rounded-sm ${getDotColor(scene)} transition-colors duration-300`}
                title={`Scene ${scene.scene_number}: audio=${scene.audio_status}, image=${scene.image_status}, video=${scene.video_status}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Google Cloud TTS Chirp 2 | Chirp 3 HD (GA) | Late 2025 | Better voice quality, SSML support, streaming |
| Kie.ai old docs API | Kie.ai v1 API (`api.kie.ai/api/v1/`) | 2025 | Unified create/poll pattern, rate limit of 20/10s |
| Kling 2.0 | Kling 2.1 Standard | 2025 | Same price, better quality |
| Single-pass FFmpeg | Two-step (build clips + concat) | Best practice | Avoids OOM on long videos |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via vite.config.js) |
| Config file | `dashboard/vite.config.js` (test block) |
| Quick run command | `cd dashboard && npx vitest run --reporter=verbose` |
| Full suite command | `cd dashboard && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROD-13 | Production Monitor renders with active topic, dot grid, queue | unit | `cd dashboard && npx vitest run src/__tests__/ProductionMonitor.test.jsx -x` | Wave 0 |
| PROD-13 | DotGrid groups scenes by chapter, colors by status | unit | `cd dashboard && npx vitest run src/__tests__/DotGrid.test.jsx -x` | Wave 0 |
| PROD-13 | HeroCard shows stage chips, ETA, cost | unit | `cd dashboard && npx vitest run src/__tests__/HeroCard.test.jsx -x` | Wave 0 |
| PROD-13 | FailedScenes section shows retry/skip actions | unit | `cd dashboard && npx vitest run src/__tests__/FailedScenes.test.jsx -x` | Wave 0 |
| PROD-14 | PipelineTable renders topic rows with status badges | unit | `cd dashboard && npx vitest run src/__tests__/PipelineTable.test.jsx -x` | Wave 0 |
| PROD-01-12 | Production webhook helpers call correct endpoints | unit | `cd dashboard && npx vitest run src/__tests__/productionApi.test.js -x` | Wave 0 |
| PROD-13 | useProductionProgress hook fetches scenes + subscribes to Realtime | unit | `cd dashboard && npx vitest run src/__tests__/useProductionProgress.test.js -x` | Wave 0 |
| OPS-01 | Supervisor alert banner shown when supervisor_alerted=true | unit | `cd dashboard && npx vitest run src/__tests__/SupervisorAlert.test.jsx -x` | Wave 0 |
| PROD-01-12 | n8n workflow JSONs are valid (Synta validation) | integration | Manual via Synta MCP | N/A |

### Sampling Rate
- **Per task commit:** `cd dashboard && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd dashboard && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/ProductionMonitor.test.jsx` -- covers PROD-13 (page-level rendering)
- [ ] `src/__tests__/DotGrid.test.jsx` -- covers PROD-13 (scene progress visualization)
- [ ] `src/__tests__/HeroCard.test.jsx` -- covers PROD-13 (active topic card)
- [ ] `src/__tests__/FailedScenes.test.jsx` -- covers PROD-13 (error recovery UI)
- [ ] `src/__tests__/PipelineTable.test.jsx` -- covers PROD-14 (dashboard table)
- [ ] `src/__tests__/productionApi.test.js` -- covers PROD-01-12 (webhook API helpers)
- [ ] `src/__tests__/useProductionProgress.test.js` -- covers PROD-13 (hook + Realtime)
- [ ] `src/__tests__/SupervisorAlert.test.jsx` -- covers OPS-01 (supervisor notification)
- [ ] Stub files for all new components/hooks so imports resolve

## Open Questions

1. **Google Cloud TTS authentication in n8n**
   - What we know: n8n has a Google Cloud credential type (Service Account or OAuth2). TTS API requires `cloud-platform` scope.
   - What's unclear: Whether the existing Google Cloud account credential in n8n already has TTS API enabled. May need to enable the Text-to-Speech API in Google Cloud Console.
   - Recommendation: Verify during implementation. If credential doesn't work, enable TTS API in GCP console.

2. **Kie.ai Seedream aspect ratio for 16:9 documentary**
   - What we know: Seedream supports 16:9 aspect ratio. Project targets 1920x1080 output.
   - What's unclear: Whether "basic" quality (2K) produces exactly 1920x1080 or a different 16:9 resolution that needs scaling.
   - Recommendation: Use "basic" quality with 16:9. FFmpeg scale filter in clip build step handles any resolution mismatch.

3. **Kie.ai video clip duration vs audio duration**
   - What we know: Kling 2.1 generates 5s or 10s clips. Average scene audio is ~5-8 seconds based on 172 scenes / ~2hr video.
   - What's unclear: Optimal strategy for scenes where audio is 3s (waste 2s of 5s clip) vs 12s (need to loop).
   - Recommendation: Always generate 5s clips (cheapest). Use FFmpeg loop/trim as specified in CONTEXT.md decisions. The visual quality of looped clips is acceptable for documentary style.

4. **n8n Docker container FFmpeg availability**
   - What we know: The n8n container is named `n8n-ffmpeg` and has FFmpeg/FFprobe available (verified in skills.sh).
   - What's unclear: Whether the container has enough /tmp space for production files (2-3GB per topic).
   - Recommendation: Use `/tmp/production/{topic_id}/` paths. Add cleanup step after successful Drive upload. Monitor disk usage during first production run.

5. **Synta MCP workflow deployment**
   - What we know: CONTEXT.md specifies workflows deployed via Synta MCP with `n8n_create_workflow`, `n8n_validate_workflow`, `n8n_test_workflow` tools.
   - What's unclear: Whether Synta MCP is already configured and accessible in the n8n environment.
   - Recommendation: Verify during implementation. Fallback: manual import via n8n API or UI.

## Sources

### Primary (HIGH confidence)
- Google Cloud TTS REST API: `POST https://texttospeech.googleapis.com/v1/text:synthesize` -- [Official docs](https://docs.cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize)
- Google Cloud TTS Chirp 3 HD voices: en-US-Chirp3-HD-Charon, en-US-Chirp3-HD-Leda -- [Chirp 3 HD docs](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd)
- Kie.ai task creation: `POST https://api.kie.ai/api/v1/jobs/createTask` -- [Kie.ai docs](https://docs.kie.ai/)
- Kie.ai task polling: `GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=X` -- [Task details docs](https://docs.kie.ai/market/common/get-task-detail)
- Kie.ai rate limits: 20 requests/10 seconds, 100+ concurrent tasks -- [Kie.ai getting started](https://docs.kie.ai/)
- Kie.ai Seedream 4.5: model `seedream/seedream-4.5-text-to-image`, $0.032/image -- [Seedream page](https://kie.ai/seedream-4-5)
- Kie.ai Kling 2.1 Standard I2V: model `kling/v2-1-standard-image-to-video`, $0.125/5s -- [Kling page](https://kie.ai/kling/v2-1)
- Kie.ai Kling 2.1 Standard T2V: model `kling/v2-1-standard-text-to-video`, $0.125/5s -- [Kling page](https://kie.ai/kling/v2-1)
- Existing codebase: useRealtimeSubscription, useScenes, useTopics, api.js, ConfirmDialog -- verified via direct file reads

### Secondary (MEDIUM confidence)
- Kie.ai task states: waiting, queuing, generating, success, fail -- from docs.kie.ai task detail page
- Google Cloud TTS audio encoding options: MP3, OGG_OPUS, LINEAR16, ALAW, MULAW -- from Chirp 3 HD docs
- Kie.ai model names for Kling variants -- from kie.ai product pages (marketing, not API docs)

### Tertiary (LOW confidence)
- Exact Google Drive API rate limits (750 req/min) -- general knowledge, needs verification for service account vs OAuth2
- n8n Docker container /tmp space availability -- needs runtime verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project, APIs documented
- Architecture: MEDIUM - sliding window batch pattern is logical but untested in this n8n environment
- Pitfalls: HIGH - based on documented API constraints and real FFmpeg behavior
- API patterns: MEDIUM - Kie.ai docs are sparse on exact request body format; model names verified from product pages

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (APIs are stable, 30-day validity)
