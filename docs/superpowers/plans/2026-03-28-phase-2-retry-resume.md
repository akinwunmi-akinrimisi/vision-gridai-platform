# Phase 2: Retry Wrapper + Resume System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build reusable resilience infrastructure (exponential backoff retry + resume/checkpoint + structured production logging) that all subsequent production workflows depend on.

**Architecture:** WF_RETRY_WRAPPER is an n8n sub-workflow called by other workflows to wrap any external API call with retry logic. The resume pattern is a SQL query template used in every production workflow. Production logging is a reusable n8n Function node that inserts into the `production_logs` table.

**Tech Stack:** n8n workflows (JSON), Supabase REST API, JavaScript (n8n Function nodes)

**n8n URL:** `https://n8n.srv1297445.hstgr.cloud`
**n8n API Key:** stored in `.env` as `N8N_API_KEY`
**Supabase URL:** `https://supabase.operscale.cloud`

---

### Task 1: Build WF_RETRY_WRAPPER n8n Sub-Workflow

**Files:**
- Create: `workflows/WF_RETRY_WRAPPER.json`

This is an n8n workflow designed to be called as a sub-workflow by other workflows. It wraps any HTTP request with exponential backoff retry.

- [ ] **Step 1: Create the workflow in n8n**

Create a new workflow in n8n named `WF_RETRY_WRAPPER` with these nodes:

**Node 1: "Execute Workflow Trigger"** (type: executeWorkflowTrigger)
- Receives input data: `{ url, method, headers, body, maxRetries, description }`

**Node 2: "Retry Logic"** (type: code / Function)
```javascript
// Exponential backoff retry wrapper
const input = $input.first().json;
const url = input.url;
const method = input.method || 'GET';
const headers = input.headers || {};
const body = input.body || null;
const maxRetries = input.maxRetries || 4;
const description = input.description || 'API call';
const baseDelay = 1000;

let lastError = null;

for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    const options = {
      method,
      url,
      headers,
      returnFullResponse: true,
    };
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    const response = await this.helpers.httpRequest(options);

    return [{
      json: {
        success: true,
        data: response.body || response,
        statusCode: response.statusCode || 200,
        attempts: attempt,
        description,
      }
    }];
  } catch (error) {
    lastError = error;

    if (attempt < maxRetries) {
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// All retries exhausted
return [{
  json: {
    success: false,
    error: lastError?.message || 'Unknown error',
    statusCode: lastError?.statusCode || 0,
    attempts: maxRetries,
    description,
  }
}];
```

**Node 3: "Return Result"** (type: noOp or set)
- Passes through the result from Retry Logic

Connect: Trigger → Retry Logic → Return Result

- [ ] **Step 2: Test with a mock endpoint**

Test the workflow by calling it with a known URL:
```json
{
  "url": "https://supabase.operscale.cloud/rest/v1/projects?select=id&limit=1",
  "method": "GET",
  "headers": {
    "apikey": "{{$env.SUPABASE_ANON_KEY}}",
    "Authorization": "Bearer {{$env.SUPABASE_SERVICE_ROLE_KEY}}"
  },
  "maxRetries": 3,
  "description": "Test: fetch projects"
}
```

Expected: `{ success: true, attempts: 1, ... }`

- [ ] **Step 3: Test with a failing URL**

Call with a URL that will 404:
```json
{
  "url": "https://supabase.operscale.cloud/rest/v1/nonexistent_table",
  "method": "GET",
  "headers": {
    "apikey": "{{$env.SUPABASE_ANON_KEY}}",
    "Authorization": "Bearer {{$env.SUPABASE_SERVICE_ROLE_KEY}}"
  },
  "maxRetries": 2,
  "description": "Test: should fail after 2 retries"
}
```

Expected: `{ success: false, attempts: 2, error: "..." }`

- [ ] **Step 4: Export workflow JSON**

Export the workflow from n8n and save to `workflows/WF_RETRY_WRAPPER.json`.

Use the n8n API:
```bash
source .env
curl -s "https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/WORKFLOW_ID" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" > workflows/WF_RETRY_WRAPPER.json
```

- [ ] **Step 5: Activate the workflow**

```bash
source .env
curl -s -X POST "https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/WORKFLOW_ID/activate" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

- [ ] **Step 6: Commit**

```bash
git add workflows/WF_RETRY_WRAPPER.json
git commit -m "feat: WF_RETRY_WRAPPER — exponential backoff retry sub-workflow"
```

---

### Task 2: Build Production Logger Helper

**Files:**
- Create: `workflows/helpers/production_log_helper.js`

This is a reusable JavaScript snippet that any n8n Function node can use to log to the `production_logs` table.

- [ ] **Step 1: Create the helper script**

```javascript
// production_log_helper.js
// Copy this into any n8n Function node that needs to log production events.
// Call: await logProduction({ topic_id, stage, scene_number, action, status, duration_ms, cost_usd, error_message })

async function logProduction(params) {
  const {
    topic_id,
    stage,        // tts | image_gen | ken_burns | color_grade | captions | assembly | render
    scene_number, // optional
    action,       // e.g., "generate_image", "apply_ken_burns", "retry"
    status,       // started | completed | failed | retried
    duration_ms,  // optional
    cost_usd,     // optional
    error_message, // optional
    metadata,     // optional JSONB
  } = params;

  const body = {
    topic_id,
    stage,
    action,
    status,
  };

  if (scene_number !== undefined) body.scene_number = scene_number;
  if (duration_ms !== undefined) body.duration_ms = duration_ms;
  if (cost_usd !== undefined) body.cost_usd = cost_usd;
  if (error_message) body.error_message = error_message;
  if (metadata) body.metadata = metadata;

  try {
    await $http.request({
      method: 'POST',
      url: `${$env.SUPABASE_URL}/rest/v1/production_logs`,
      headers: {
        'apikey': $env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${$env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body,
    });
  } catch (err) {
    // Don't let logging failures break production
    console.error('Production log insert failed:', err.message);
  }
}
```

- [ ] **Step 2: Test the helper by inserting a test log**

Create a temporary n8n workflow with a Function node that uses this helper to insert a test row:

```javascript
// Test: insert a log entry
await $http.request({
  method: 'POST',
  url: `${$env.SUPABASE_URL}/rest/v1/production_logs`,
  headers: {
    'apikey': $env.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${$env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  },
  body: {
    topic_id: '224cdff6-e652-4c00-a30c-96bbeab3e4c6',
    stage: 'test',
    action: 'phase2_verification',
    status: 'completed',
    duration_ms: 100,
    metadata: { test: true, phase: 2 }
  },
});

return [{ json: { logged: true } }];
```

Verify the row appears:
```bash
source .env
curl -s "https://supabase.operscale.cloud/rest/v1/production_logs?stage=eq.test&limit=1" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

- [ ] **Step 3: Clean up test row**

```bash
source .env
curl -s -X DELETE "https://supabase.operscale.cloud/rest/v1/production_logs?stage=eq.test" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

- [ ] **Step 4: Commit**

```bash
mkdir -p workflows/helpers
git add workflows/helpers/production_log_helper.js
git commit -m "feat: production_logs helper — reusable logging for all production workflows"
```

---

### Task 3: Document Resume/Checkpoint Pattern

**Files:**
- Create: `workflows/helpers/RESUME_PATTERN.md`

This documents the SQL query pattern every production workflow must use to resume from where it left off.

- [ ] **Step 1: Write the pattern doc**

```markdown
# Resume/Checkpoint Pattern

Every production workflow MUST check scene status before processing.
If a workflow crashes at scene N, it resumes from N+1 on restart.

## SQL Templates

### TTS Audio (only process scenes without audio)
```sql
SELECT id, scene_number, narration_text
FROM scenes
WHERE topic_id = '{TOPIC_ID}' AND audio_status = 'pending'
ORDER BY scene_number;
```

### Image Generation (only process scenes without images)
```sql
SELECT id, scene_number, image_prompt, composition_prefix, selective_color_element
FROM scenes
WHERE topic_id = '{TOPIC_ID}' AND image_status = 'pending'
ORDER BY scene_number;
```

### Ken Burns (only process scenes without clips)
```sql
SELECT id, scene_number, zoom_direction, color_mood, selective_color_element
FROM scenes
WHERE topic_id = '{TOPIC_ID}' AND clip_status = 'pending' AND image_url IS NOT NULL
ORDER BY scene_number;
```

### Captions (only process scenes without captions)
```sql
SELECT id, scene_number, narration_text, caption_highlight_word
FROM scenes
WHERE topic_id = '{TOPIC_ID}' AND audio_status = 'generated' AND clip_status != 'pending'
ORDER BY scene_number;
```

## Pipeline Stage Tracking

After each stage completes for ALL scenes, update the topic:
```sql
UPDATE topics SET pipeline_stage = '{STAGE}' WHERE id = '{TOPIC_ID}';
```

Stages: pending → scripting → tts → images → ken_burns → color_grade → captions → assembly → render → complete → failed

## n8n Implementation

In n8n, use an HTTP Request node to query Supabase:
- Method: GET
- URL: `{{$env.SUPABASE_URL}}/rest/v1/scenes?topic_id=eq.{{$json.topic_id}}&audio_status=eq.pending&order=scene_number.asc`
- Headers: apikey + Authorization

The query returns ONLY pending scenes. Process them in a loop. If the array is empty, the stage is already complete — skip to next.
```

- [ ] **Step 2: Commit**

```bash
git add workflows/helpers/RESUME_PATTERN.md
git commit -m "docs: resume/checkpoint pattern for all production workflows"
```

---

### Task 4: Phase 2 Verification

- [ ] **Step 1: Verify WF_RETRY_WRAPPER is active on n8n**

```bash
source .env
# List workflows, find RETRY_WRAPPER
curl -s "https://n8n.srv1297445.hstgr.cloud/api/v1/workflows?limit=50" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      const wfs=JSON.parse(d).data;
      const rw=wfs.find(w=>w.name.includes('RETRY'));
      console.log(rw ? 'WF_RETRY_WRAPPER: id='+rw.id+' active='+rw.active : 'NOT FOUND');
    })"
```

- [ ] **Step 2: Verify production_logs table accepts inserts**

(Already verified in Task 2)

- [ ] **Step 3: Verify all helper files exist**

```bash
ls -la workflows/WF_RETRY_WRAPPER.json workflows/helpers/production_log_helper.js workflows/helpers/RESUME_PATTERN.md
```

- [ ] **Step 4: Commit final**

```bash
git commit --allow-empty -m "ops: Phase 2 complete — retry wrapper, production logger, resume pattern"
```
