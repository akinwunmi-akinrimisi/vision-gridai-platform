# Architecture: n8n AI Agent Workflow Integration

**Domain:** n8n AI agent workflows for Vision GridAI Platform
**Researched:** 2026-03-09
**Confidence:** HIGH (based on existing codebase analysis + Anthropic API docs)

---

## Recommended Architecture

### Current State (What Already Exists)

The platform already has a working pattern established across 18 workflow JSON files. The critical finding is that **three of the four new "AI agent" workflows already exist as complete implementations**:

| Workflow File | Status | What It Does |
|---|---|---|
| `WF_PROJECT_CREATE.json` | **EXISTS -- Full implementation** | Webhook trigger, INSERT project, Claude niche research (web_search tool), parse response, INSERT niche_profile, UPDATE project, Claude prompt generation, TOPC-02 validation, INSERT prompt_configs |
| `WF_TOPICS_GENERATE.json` | **EXISTS -- Full implementation** | Webhook trigger, READ project + prompt_config, build prompt with variable injection, Claude API call, parse JSON array, INSERT topics, INSERT avatars, status transitions |
| `WF_TOPICS_ACTION.json` | **EXISTS -- Full implementation** | 4-way switch (approve/reject/refine/edit), refine includes READ all 24 topics for overlap avoidance, Claude refinement call, refinement_history tracking |
| `WF_WEBHOOK_PROJECT_CREATE.json` | **EXISTS -- Stub only** | Auth check + "stub: true" response. Superseded by WF_PROJECT_CREATE.json |
| `WF_WEBHOOK_TOPICS_GENERATE.json` | **EXISTS -- Stub only** | Auth check + "stub: true" response. Superseded by WF_TOPICS_GENERATE.json |
| `WF_WEBHOOK_TOPICS_ACTION.json` | Does not exist | Was never created as a separate stub |

**Key discovery:** The v1.0 stub webhooks (`WF_WEBHOOK_PROJECT_CREATE`, `WF_WEBHOOK_TOPICS_GENERATE`) and the v1.1 full implementations (`WF_PROJECT_CREATE`, `WF_TOPICS_GENERATE`) both register on the SAME webhook paths (`project/create`, `topics/generate`). Only one can be active in n8n at a time. The stubs must be deactivated or deleted before importing the full implementations.

### Architecture Pattern (Established)

Every workflow in the codebase follows this exact pattern:

```
Webhook Trigger (POST /webhook/{path})
  -> Validate Input (Code node: parse body, check required fields)
  -> Auth Check (IF node: header.authorization == Bearer $env.DASHBOARD_API_TOKEN)
      TRUE  -> Respond to Webhook (immediate 200/201, before long work)
              -> Status Update (PATCH Supabase: status = 'processing')
              -> Core Logic (HTTP Request to external API)
              -> Parse Response (Code node: extract JSON)
              -> Write Results (POST/PATCH Supabase)
              -> Final Status (PATCH Supabase: status = 'done')
      FALSE -> Respond 401
```

**Critical pattern: Respond-then-continue.** The webhook responds to the dashboard immediately (within seconds), then continues processing asynchronously. The dashboard relies on Supabase Realtime to see status changes, not on the webhook response. This is the correct architecture for long-running AI calls (30-120 seconds for Claude with web search).

### Component Boundaries

| Component | Responsibility | Communicates With |
|---|---|---|
| Dashboard (React SPA) | User triggers actions via webhook calls, displays state from Supabase | n8n webhooks (write), Supabase (read + Realtime) |
| n8n Webhook Workflows | Receive dashboard requests, validate, respond immediately, dispatch work | Dashboard (request/response), Supabase (read/write), Claude API |
| n8n Worker Workflows | Execute long-running AI tasks (research, generation, refinement) | Supabase (read/write), Claude API, Google Drive API |
| Supabase | Source of truth for all state. Emits Realtime events on writes. | n8n (REST reads/writes), Dashboard (JS client reads + Realtime) |
| Claude API (Anthropic) | Niche research (with web_search tool), topic generation, topic refinement, prompt generation | n8n (HTTP Request nodes) |

### Data Flow Per Workflow

#### WF_PROJECT_CREATE (Niche Research + Dynamic Prompts)

```
Dashboard POST /webhook/project/create { niche, description }
  |
  v
n8n: Validate -> INSERT projects -> Extract ID -> Respond 201 { id }
  |                                                    |
  |  (async, after response)                           v  (dashboard gets ID)
  v
PATCH projects.status = 'researching_competitors'
  |
  v
POST api.anthropic.com/v1/messages
  model: claude-sonnet-4-6
  tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }]
  max_tokens: 16384
  timeout: 120s
  |
  v (parse JSON from text blocks)
INSERT niche_profiles { competitor_analysis, audience_pain_points, keyword_research, blue_ocean_opportunities }
PATCH projects { playlist_angles, niche_system_prompt, niche_expertise_profile, red_ocean_topics, status: 'researching_prompts' }
  |
  v
POST api.anthropic.com/v1/messages (second Claude call, no web search needed)
  Generates 7 prompt templates: topic_generator, script_pass1-3, evaluator, visual_director, scene_segmenter
  |
  v (parse JSON array, validate TOPC-02: topic_generator must contain quality benchmarks)
INSERT prompt_configs (7 rows, all with project_id, version: 1, is_active: true)
PATCH projects.status = 'ready_for_topics'
```

**Error path:** Any failure -> PATCH projects { status: 'research_failed', error_log: message }

**Supabase tables touched:** projects (INSERT + 3 PATCHes), niche_profiles (INSERT), prompt_configs (INSERT 7 rows)

**Status transitions:** created -> researching_competitors -> researching_prompts -> ready_for_topics (or research_failed)

#### WF_TOPICS_GENERATE (25 Topics + 25 Avatars)

```
Dashboard POST /webhook/topics/generate { project_id }
  |
  v
n8n: Validate -> [Read Project, Read Prompt Config] (parallel) -> Build Prompt -> Respond 200
  |
  |  (async)
  v
PATCH projects.status = 'generating_topics'
  |
  v
POST api.anthropic.com/v1/messages
  model: claude-sonnet-4-6
  max_tokens: 16384
  timeout: 120s
  System: first 500 chars of built prompt (NOTE: suboptimal, see pitfalls)
  User: full built prompt with {{variable}} injections resolved
  |
  v (parse JSON array of 25 topic objects)
INSERT topics (25 rows) -> returns IDs
  |
  v
Map avatar data with topic IDs
INSERT avatars (25 rows)
  |
  v
PATCH projects.status = 'topics_pending_review'
```

**Supabase tables touched:** projects (READ + 2 PATCHes), prompt_configs (READ), topics (INSERT 25), avatars (INSERT 25)

**Status transitions:** ready_for_topics -> generating_topics -> topics_pending_review

#### WF_TOPICS_ACTION (Approve/Reject/Refine/Edit)

```
Dashboard POST /webhook/topics/action { action, topic_ids, project_id, feedback, instructions, fields }
  |
  v
n8n: Parse Request -> Switch on action (4 outputs)
  |
  +--> approve: PATCH topics.review_status = 'approved' (bulk, using ?id=in.(id1,id2,...))
  |
  +--> reject: PATCH topics { review_status: 'rejected', review_feedback }
  |
  +--> refine: PATCH topics.review_status = 'refining'
  |      -> GET all 24 other topics (full select with avatars join)
  |      -> Build prompt (target topic + 24 others as overlap context)
  |      -> POST Claude API (max_tokens: 4096, 60s timeout)
  |      -> Parse refined fields
  |      -> PATCH topic { ...refined, review_status: 'pending', refinement_history: [...prev, new] }
  |
  +--> edit: PATCH topics with raw field values (direct inline edit, no AI)
```

**Supabase tables touched:** topics (READ all for refine, PATCH target)

### Self-Chaining Architecture

The existing production workflows chain via internal webhook calls. The AI agent workflows do NOT chain to each other automatically. Instead:

1. `WF_PROJECT_CREATE` runs to completion -> sets `projects.status = 'ready_for_topics'`
2. Dashboard shows "Generate Topics" button when status = 'ready_for_topics'
3. User clicks -> Dashboard calls `WF_TOPICS_GENERATE`
4. WF_TOPICS_GENERATE runs to completion -> sets `projects.status = 'topics_pending_review'`
5. Dashboard shows topic review UI when status = 'topics_pending_review'

This is deliberate: the approval gates require human action between phases. Self-chaining only happens in the deterministic production pipeline (TTS -> Images -> I2V -> T2V -> Captions -> Assembly).

---

## Patterns to Follow

### Pattern 1: Respond-Then-Continue
**What:** Respond to the webhook immediately with a 200/201, then continue processing asynchronously.
**When:** Always, for any workflow that calls Claude API (30-120s latency).
**Why:** Dashboard gets instant confirmation. Supabase Realtime handles progress updates.

```
Extract Project ID -> [Respond to Webhook, Status -> Researching] (parallel outputs)
```

The n8n connection graph fans out from the "Extract" node to both the "Respond" node AND the "Status Update" node simultaneously. The respond node ends its branch. The status update continues the processing branch.

### Pattern 2: Supabase HTTP Request with Service Role Auth
**What:** All Supabase operations use HTTP Request nodes with credential reference, not inline keys.
**When:** Every read/write to Supabase.

```json
{
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      { "name": "apikey", "value": "={{$env.SUPABASE_ANON_KEY}}" },
      { "name": "Prefer", "value": "return=representation" }
    ]
  },
  "credentials": {
    "httpHeaderAuth": { "id": "supabase-service-role", "name": "Supabase Service Role" }
  }
}
```

**Note:** The `apikey` header uses `$env.SUPABASE_ANON_KEY` while the `Authorization: Bearer` header is injected by the credential reference (`supabase-service-role`). This is the established pattern across all workflows.

### Pattern 3: Claude API via HTTP Request Node
**What:** Direct HTTP POST to `https://api.anthropic.com/v1/messages` with httpHeaderAuth credential.
**When:** All AI operations.

```json
{
  "method": "POST",
  "url": "https://api.anthropic.com/v1/messages",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      { "name": "anthropic-version", "value": "2023-06-01" },
      { "name": "content-type", "value": "application/json" }
    ]
  },
  "credentials": {
    "httpHeaderAuth": { "id": "anthropic-api-key", "name": "Anthropic API Key" }
  },
  "onError": "continueRegularOutput"
}
```

For web search, add to the JSON body:
```json
"tools": [{ "type": "web_search_20250305", "name": "web_search", "max_uses": 10 }]
```

### Pattern 4: JSON Response Parsing
**What:** Code node that extracts text from Claude response, strips markdown fences, finds JSON boundaries.
**When:** After every Claude API call.

```javascript
const response = $input.first().json;
if (response.error) throw new Error(`API error: ${response.error.message}`);
const text = (response.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
let jsonText = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
// For arrays: indexOf('[') / lastIndexOf(']')
// For objects: indexOf('{') / lastIndexOf('}')
```

### Pattern 5: Status Breadcrumb Trail
**What:** PATCH project/topic status at each major step so dashboard can show progress.
**When:** Before and after every long-running operation.

Established status transitions:
- Projects: `created -> researching_competitors -> researching_prompts -> ready_for_topics -> generating_topics -> topics_pending_review -> active`
- Topics: `pending -> scripting -> audio -> images -> video -> assembly -> review -> uploading -> published -> failed`
- Topic review: `pending -> approved / rejected / refining -> pending (after refine)`

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Webhook Path Collision
**What:** Two active workflows registering the same webhook path.
**Why bad:** n8n will only route to one (unpredictable which). The other silently never fires.
**Evidence:** `WF_WEBHOOK_PROJECT_CREATE` (stub) and `WF_PROJECT_CREATE` (full) both use `project/create`.
**Instead:** When deploying full implementations, deactivate or delete the stub workflows first. Never have two workflows with the same webhook path active simultaneously.

### Anti-Pattern 2: System Prompt in Substring
**What:** In WF_TOPICS_GENERATE, the system prompt is `$json.prompt.substring(0, 500)` -- the first 500 chars of the user prompt used as system.
**Why bad:** Arbitrary truncation could cut mid-sentence. The system prompt should be the niche-specific system prompt from `projects.niche_system_prompt`, not a substring of the user prompt.
**Instead:** Read `projects.niche_system_prompt` and use it as the system parameter. Use the full topic_generator prompt as the user message.

### Anti-Pattern 3: Missing Error Handlers on Async Branches
**What:** After respond-then-continue, if the async branch fails, the dashboard never learns unless there is an explicit error handler that writes failure status to Supabase.
**Why bad:** Dashboard shows "researching..." forever. User has no way to know it failed.
**Evidence:** WF_PROJECT_CREATE has an error handler node but it is not connected to all failure points (e.g., Parse Prompts failure does not route to it).
**Instead:** Every Code node and HTTP Request node on the async branch should have error output routing to a "write failure status" node.

### Anti-Pattern 4: No Credential Reference Validation
**What:** Workflows reference credentials by `{ "id": "supabase-service-role", "name": "Supabase Service Role" }` -- these IDs must match exactly what exists in the n8n instance.
**Why bad:** If credential names don't match, the workflow imports but fails silently on first execution.
**Instead:** Document required credential names. Create credentials in n8n BEFORE importing workflows. Verify with a test execution after import.

---

## Integration Points: New vs Modified Components

### Components That Need NO Changes

| Component | Why No Changes |
|---|---|
| Dashboard `api.js` | Already calls `/webhook/project/create`, `/webhook/topics/generate`, `/webhook/topics/action` |
| Dashboard pages (ProjectsHome, TopicReview) | Already wired to these endpoints and Supabase Realtime |
| Supabase schema | All required tables exist (projects, niche_profiles, prompt_configs, topics, avatars) |
| Production workflows (TTS, Images, I2V, T2V, etc.) | Completely independent of the AI agent workflows |

### Components That Are ALREADY BUILT (Need Deployment + Fixes)

| Component | Status | What Needs Fixing |
|---|---|---|
| `WF_PROJECT_CREATE.json` | Complete | Fix error handler connections; connect all failure-capable nodes to error handler |
| `WF_TOPICS_GENERATE.json` | Complete | Fix system prompt substring anti-pattern; add error handler for failures |
| `WF_TOPICS_ACTION.json` | Complete | Add error handler for Claude refine failures |

### Components That Need Removal/Deactivation

| Component | Action | Reason |
|---|---|---|
| `WF_WEBHOOK_PROJECT_CREATE.json` | Deactivate in n8n | Webhook path collision with WF_PROJECT_CREATE |
| `WF_WEBHOOK_TOPICS_GENERATE.json` | Deactivate in n8n | Webhook path collision with WF_TOPICS_GENERATE |
| `WF_WEBHOOK_TOPICS_ACTION.json` | Deactivate in n8n (if exists) | Replaced by WF_TOPICS_ACTION |

---

## Deployment Process: Importing Workflow JSONs to n8n

### Step 1: Create Required Credentials

Before importing any workflow, these credentials must exist in n8n (Settings -> Credentials):

| Credential Name (exact) | Type | Contains |
|---|---|---|
| `Supabase Service Role` | HTTP Header Auth | `Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}` |
| `Anthropic API Key` | HTTP Header Auth | `x-api-key: {ANTHROPIC_API_KEY}` |

Also required as n8n environment variables ($env):
- `SUPABASE_URL` = `https://supabase.operscale.cloud`
- `SUPABASE_ANON_KEY` = the anon key
- `DASHBOARD_API_TOKEN` = shared secret between dashboard and n8n

### Step 2: Import Workflows via n8n API

```bash
# Import a workflow JSON via n8n REST API
curl -X POST "https://n8n.srv1297445.hstgr.cloud/api/v1/workflows" \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: {N8N_API_KEY}" \
  -d @workflows/WF_PROJECT_CREATE.json

# Alternative: n8n UI -> Settings -> Import Workflow -> paste/upload JSON
```

### Step 3: Handle Webhook Path Conflicts

```bash
# List all workflows
curl "https://n8n.srv1297445.hstgr.cloud/api/v1/workflows" \
  -H "X-N8N-API-KEY: {N8N_API_KEY}" | jq '.data[] | {id, name, active}'

# Deactivate stub workflows (get IDs from list above)
curl -X PATCH "https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/{STUB_WORKFLOW_ID}" \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: {N8N_API_KEY}" \
  -d '{"active": false}'

# Activate full implementation workflows
curl -X PATCH "https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/{FULL_WORKFLOW_ID}" \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: {N8N_API_KEY}" \
  -d '{"active": true}'
```

### Step 4: Validate with Test Execution

```bash
# Test project creation (end-to-end)
curl -X POST "https://n8n.srv1297445.hstgr.cloud/webhook/project/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {DASHBOARD_API_TOKEN}" \
  -d '{"niche": "US Credit Cards", "description": "High-CPM credit card content"}'

# Should return: { "success": true, "data": { "id": "uuid..." } }
# Then check Supabase: projects.status should transition through:
#   created -> researching_competitors -> researching_prompts -> ready_for_topics
```

---

## Scalability Considerations

| Concern | At 1 project | At 10 projects | At 50 projects |
|---|---|---|---|
| Claude API concurrent calls | 1 at a time | Queue via n8n execution order | Rate limit concern (~50 RPM on Sonnet) |
| n8n execution memory | ~50MB per workflow run | ~500MB concurrent | Need execution limits |
| Supabase connections | <10 concurrent | <50 concurrent | Fine (PG handles 100+) |
| Webhook response time | <500ms (respond-then-continue) | Same | Same |
| Topic generation (25 per call) | 1 Claude call (~30s) | 10 calls sequentially | Rate limit management needed |

### Memory Consideration

The niche research workflow (WF_PROJECT_CREATE) makes two Claude API calls in sequence, each returning up to 16K tokens. The parsed JSON is held in n8n execution memory. For the current single-project-at-a-time usage, this is well within the 16GB VPS RAM. At scale (10+ concurrent), set n8n `EXECUTIONS_TIMEOUT` and `EXECUTIONS_DATA_MAX_AGE` to prevent memory buildup.

---

## Build Order (Dependencies Considered)

Since the workflows are already built, the build order is a **deployment and validation** order:

### Wave 1: Credentials and Environment (No dependencies)
1. Create `Supabase Service Role` credential in n8n
2. Create `Anthropic API Key` credential in n8n
3. Set n8n environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, DASHBOARD_API_TOKEN)
4. Verify Supabase schema has all required tables

### Wave 2: Deactivate Stubs (Depends on Wave 1)
5. Deactivate `WF_WEBHOOK_PROJECT_CREATE` (stub)
6. Deactivate `WF_WEBHOOK_TOPICS_GENERATE` (stub)
7. Deactivate `WF_WEBHOOK_TOPICS_ACTION` (if exists as stub)

### Wave 3: Fix and Deploy AI Workflows (Depends on Wave 2)
8. Fix WF_PROJECT_CREATE: connect error handler to all failure-capable nodes
9. Fix WF_TOPICS_GENERATE: replace system prompt substring with `projects.niche_system_prompt`
10. Fix WF_TOPICS_ACTION: add error handling for Claude refine failures
11. Import all three to n8n and activate

### Wave 4: End-to-End Validation (Depends on Wave 3)
12. Test WF_PROJECT_CREATE with "US Credit Cards" niche
13. Verify niche_profiles and prompt_configs populated correctly
14. Test WF_TOPICS_GENERATE: 25 topics + 25 avatars inserted
15. Test WF_TOPICS_ACTION: approve, reject, refine, edit all work
16. Verify dashboard reflects all state changes via Supabase Realtime

---

## Sources

- Existing workflow JSONs analyzed: `WF_PROJECT_CREATE.json`, `WF_TOPICS_GENERATE.json`, `WF_TOPICS_ACTION.json`, `WF_WEBHOOK_PROJECT_CREATE.json`, `WF_WEBHOOK_TOPICS_GENERATE.json`, `WF_WEBHOOK_PRODUCTION.json`, `WF_TTS_AUDIO.json`
- [Anthropic Tool Use Documentation](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [n8n Anthropic Integration](https://n8n.io/integrations/anthropic/)
- [n8n Claude Web Search Workflow Template](https://n8n.io/workflows/4399-anthropic-ai-agent-claude-sonnet-4-and-opus-4-with-think-and-web-search-tool/)
- [n8n Community: Claude Web Search](https://community.n8n.io/t/new-to-n8n-how-do-i-enable-web-search-in-claude-sonnet-4/168264)
- Agent.md (platform architecture, version 3.0)
- Dashboard_Implementation_Plan.md (data flow spec)
- PROJECT.md (current milestone context v1.1)
