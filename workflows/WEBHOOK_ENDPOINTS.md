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
| Production Trigger | /webhook/production/trigger | POST | Not created | 3 | - |
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
