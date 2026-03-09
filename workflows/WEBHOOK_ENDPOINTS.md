# Webhook Endpoints Reference

## Import Instructions

### Via n8n UI
1. Open n8n at `https://n8n.srv1297445.hstgr.cloud`
2. Go to **Workflows** (left sidebar)
3. Click the **...** menu (top right) or **Import from File**
4. Select each `WF_WEBHOOK_*.json` file from the `workflows/` directory
5. After import, **activate** each workflow (toggle in top right)

### Via n8n API
```bash
# Import a workflow via API
curl -X POST https://n8n.srv1297445.hstgr.cloud/api/v1/workflows \
  -H "X-N8N-API-KEY: YOUR_N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @workflows/WF_WEBHOOK_STATUS.json
```

## Environment Variable Setup

All webhook workflows require the `DASHBOARD_API_TOKEN` environment variable in n8n.

### Docker Compose
Add to your n8n `docker-compose.yml` environment section:
```yaml
environment:
  - DASHBOARD_API_TOKEN=your-secure-random-token-here
```

### n8n .env file
Or add to the n8n container's `.env` file:
```
DASHBOARD_API_TOKEN=your-secure-random-token-here
```

After setting the variable, restart n8n for it to take effect.

## Authentication

All endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <DASHBOARD_API_TOKEN>
```

Requests with missing or invalid tokens receive a `401 Unauthorized` response.

## Response Envelope

All endpoints return the standard JSON envelope:
```json
{
  "success": true|false,
  "data": { ... } | null,
  "error": null | "error message"
}
```

## Endpoint Reference

| Endpoint | Path | Method | Status | Phase | Workflow File |
|----------|------|--------|--------|-------|---------------|
| Health Check | /webhook/status | POST | Implemented | 1 | WF_WEBHOOK_STATUS.json |
| Create Project | /webhook/project/create | POST | Stub | 2 | WF_WEBHOOK_PROJECT_CREATE.json |
| Generate Topics | /webhook/topics/generate | POST | Stub | 2 | WF_WEBHOOK_TOPICS_GENERATE.json |
| Topic Action | /webhook/topics/action | POST | Stub | 2 | WF_WEBHOOK_TOPICS_ACTION.json |
| Production Trigger | /webhook/production/trigger | POST | Implemented | 4 | WF_WEBHOOK_PRODUCTION.json |
| Production Batch Trigger | /webhook/production/trigger-batch | POST | Implemented | 4 | WF_WEBHOOK_PRODUCTION.json |
| Production Stop | /webhook/production/stop | POST | Implemented | 4 | WF_WEBHOOK_PRODUCTION.json |
| Production Resume | /webhook/production/resume | POST | Implemented | 4 | WF_WEBHOOK_PRODUCTION.json |
| Production Restart | /webhook/production/restart | POST | Implemented | 4 | WF_WEBHOOK_PRODUCTION.json |
| Retry Scene | /webhook/production/retry-scene | POST | Implemented | 4 | WF_WEBHOOK_PRODUCTION.json |
| Retry All Failed | /webhook/production/retry-all-failed | POST | Implemented | 4 | WF_WEBHOOK_PRODUCTION.json |
| Skip Scene | /webhook/production/skip-scene | POST | Implemented | 4 | WF_WEBHOOK_PRODUCTION.json |
| Skip All Failed | /webhook/production/skip-all-failed | POST | Implemented | 4 | WF_WEBHOOK_PRODUCTION.json |
| Edit & Retry Scene | /webhook/production/edit-retry-scene | POST | Implemented | 4 | WF_WEBHOOK_PRODUCTION.json |
| Manual Assemble | /webhook/production/assemble | POST | Implemented | 4 | WF_WEBHOOK_PRODUCTION.json |
| TTS Audio | /webhook/production/tts | POST | Implemented | 4 | WF_TTS_AUDIO.json |
| Image Generation | /webhook/production/images | POST | Implemented (internal) | 4 | WF_IMAGE_GENERATION.json |
| I2V Generation | /webhook/production/i2v | POST | Implemented (internal) | 4 | WF_I2V_GENERATION.json |
| T2V Generation | /webhook/production/t2v | POST | Implemented (internal) | 4 | WF_T2V_GENERATION.json |
| Assembly | /webhook/production/assembly | POST | Implemented (internal) | 4 | WF_CAPTIONS_ASSEMBLY.json |
| Supervisor (cron) | — (Schedule Trigger) | — | Implemented | 4 | WF_SUPERVISOR.json |
| Script Approve | /webhook/script/approve | POST | Not created | 3 | - |
| Script Reject | /webhook/script/reject | POST | Not created | 3 | - |
| Video Approve | /webhook/video/approve | POST | Not created | 5 | - |
| Video Reject | /webhook/video/reject | POST | Not created | 5 | - |
| Assets | /webhook/assets/{topic_id} | POST | Not created | 4 | - |
| Analytics | /webhook/analytics | POST | Not created | 5 | - |

## Endpoint Details

### /webhook/status (Health Check)

Returns platform health status. Primary endpoint for verifying the webhook layer works.

**Request:**
```bash
curl -X POST https://n8n.srv1297445.hstgr.cloud/webhook/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{}'
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "services": {
      "n8n": "running",
      "supabase": "configured"
    }
  },
  "error": null
}
```

**Unauthorized Response (401):**
```json
{
  "success": false,
  "data": null,
  "error": "Unauthorized"
}
```

### /webhook/project/create (Stub)

Stub for project creation. Will trigger niche research in Phase 2.

**Request Body:**
```json
{
  "name": "Credit Card Rewards Channel",
  "niche": "US Credit Cards",
  "niche_description": "Optional longer description",
  "target_video_count": 25
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Project creation queued",
    "stub": true
  },
  "error": null
}
```

### /webhook/topics/generate (Stub)

Stub for topic generation. Will trigger the 25-topic generation workflow in Phase 2.

**Request Body:**
```json
{
  "project_id": "uuid-here"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Topic generation queued",
    "stub": true
  },
  "error": null
}
```

### /webhook/topics/action (Stub)

Stub for topic approve/reject/refine actions. Will handle Gate 1 actions in Phase 2.

**Request Body:**
```json
{
  "action": "approve|reject|refine",
  "topic_id": "uuid-here",
  "feedback": "Optional refinement instructions"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Topic action received",
    "action": "approve",
    "stub": true
  },
  "error": null
}
```

## Testing

### Test with valid token
```bash
curl -X POST https://n8n.srv1297445.hstgr.cloud/webhook/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DASHBOARD_API_TOKEN" \
  -d '{}'
```

Expected: `200` with `{ "success": true, ... }`

### Test with invalid token
```bash
curl -X POST https://n8n.srv1297445.hstgr.cloud/webhook/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer wrong-token" \
  -d '{}'
```

Expected: `401` with `{ "success": false, "data": null, "error": "Unauthorized" }`

### Test with missing token
```bash
curl -X POST https://n8n.srv1297445.hstgr.cloud/webhook/status \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: `401` with `{ "success": false, "data": null, "error": "Unauthorized" }`

### Test via Vite dev proxy (during development)
```bash
curl -X POST http://localhost:5173/webhook/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DASHBOARD_API_TOKEN" \
  -d '{}'
```

The Vite dev server proxies `/webhook/*` to n8n automatically.

## Phase 4 Production Endpoints — Detailed Reference

### /webhook/production/trigger (POST)

Start production for a single approved topic. Triggers TTS audio generation as the first pipeline step.

**Request Body:**
```json
{ "topic_id": "uuid-here" }
```

**Response:** `{ "success": true, "data": { "message": "Production started", "topic_id": "..." } }`

### /webhook/production/trigger-batch (POST)

Start production for multiple topics at once. First topic begins immediately, others are queued.

**Request Body:**
```json
{ "topic_ids": ["uuid-1", "uuid-2", "uuid-3"] }
```

**Response:** `{ "success": true, "data": { "message": "Batch production started", "count": 3 } }`

### /webhook/production/stop (POST)

Stop active production for a topic. Completed scenes are preserved.

**Request Body:**
```json
{ "topic_id": "uuid-here" }
```

**Response:** `{ "success": true, "data": { "message": "Production stopped" } }`

### /webhook/production/resume (POST)

Resume a stopped production from where it left off.

**Request Body:**
```json
{ "topic_id": "uuid-here" }
```

**Response:** `{ "success": true, "data": { "message": "Production resumed" } }`

### /webhook/production/restart (POST)

Restart production from scratch. Resets all scene statuses to pending.

**Request Body:**
```json
{ "topic_id": "uuid-here" }
```

**Response:** `{ "success": true, "data": { "message": "Production restarted" } }`

### /webhook/production/retry-scene (POST)

Retry a single failed scene.

**Request Body:**
```json
{ "scene_id": "uuid-here", "topic_id": "uuid-here" }
```

**Response:** `{ "success": true, "data": { "message": "Scene retry queued" } }`

### /webhook/production/retry-all-failed (POST)

Retry all failed scenes for a topic.

**Request Body:**
```json
{ "topic_id": "uuid-here" }
```

**Response:** `{ "success": true, "data": { "message": "All failed scenes retry queued", "count": 5 } }`

### /webhook/production/skip-scene (POST)

Skip a scene and mark it as skipped with a reason.

**Request Body:**
```json
{ "scene_id": "uuid-here", "reason": "User skipped" }
```

**Response:** `{ "success": true, "data": { "message": "Scene skipped" } }`

### /webhook/production/skip-all-failed (POST)

Skip all failed scenes for a topic.

**Request Body:**
```json
{ "topic_id": "uuid-here" }
```

**Response:** `{ "success": true, "data": { "message": "All failed scenes skipped", "count": 3 } }`

### /webhook/production/edit-retry-scene (POST)

Edit a scene's image prompt and retry generation.

**Request Body:**
```json
{ "scene_id": "uuid-here", "image_prompt": "New prompt text", "topic_id": "uuid-here" }
```

**Response:** `{ "success": true, "data": { "message": "Scene updated and retry queued" } }`

### /webhook/production/assemble (POST)

Manually trigger FFmpeg assembly for a topic.

**Request Body:**
```json
{ "topic_id": "uuid-here" }
```

**Response:** `{ "success": true, "data": { "message": "Assembly started" } }`

### /webhook/production/tts (POST, internal)

Internal endpoint called by trigger workflow. Generates TTS audio for all scenes in a topic.

**Request Body:**
```json
{ "topic_id": "uuid-here" }
```

**Note:** Called internally by production trigger, not directly by dashboard.

### /webhook/production/images (POST, internal)

Internal endpoint for image generation. Called after TTS completes.

**Request Body:**
```json
{ "topic_id": "uuid-here" }
```

### /webhook/production/i2v (POST, internal)

Internal endpoint for image-to-video generation. Called after TTS completes (parallel with images/t2v).

**Request Body:**
```json
{ "topic_id": "uuid-here" }
```

### /webhook/production/t2v (POST, internal)

Internal endpoint for text-to-video generation. Called after TTS completes (parallel with images/i2v).

**Request Body:**
```json
{ "topic_id": "uuid-here" }
```

### WF_SUPERVISOR (Schedule Trigger, no webhook)

Runs on a 30-minute cron schedule. Not accessible via webhook.

**Behavior:**
1. Queries topics stuck in production stages (audio/images/assembling/producing) for >2 hours
2. If stuck topic has failed scenes: auto-retries, waits 5 min, escalates if still stuck
3. If stuck with no failures (stalled workflow): sets alert and re-fires stage webhook
4. Auto-resolves alerts when topics reach assembled/published/stopped status
5. Logs all actions to production_log table
