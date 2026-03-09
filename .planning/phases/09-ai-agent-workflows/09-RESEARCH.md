# Phase 9: AI Agent Workflows — Research

**Researched:** 2026-03-09
**Domain:** n8n workflow gap-filling, React inline editing, idempotency logic
**Confidence:** HIGH

## Summary

Phase 9 is a gap-filling sprint, not a greenfield build. All three n8n workflows (WF_PROJECT_CREATE, WF_TOPICS_GENERATE, WF_TOPICS_ACTION) exist, are imported, and are active on the n8n server. The work is surgical: add idempotency guards, production_log INSERT nodes, connect error handlers on currently-unconnected branches, fix the system prompt substring hack, and increase the research timeout to 600s.

On the dashboard side, the EditPanel already exists as a SidePanel component but CONTEXT.md requires replacing it with inline edit mode inside TopicCard's expanded section. The existing EditPanel (used in TopicReview.jsx) handles both topic fields and avatar fields, and already calls `useEditTopic` from `useTopics.js`. The new requirement is to move this behavior inline into the card itself — no SidePanel — while keeping the same webhook calls. WF_TOPICS_ACTION needs a new Switch output (index 4) for `action='edit_avatar'` to route avatar saves to the `avatars` table instead of the `topics` table.

The architecture is stable. Every pattern needed (n8n HTTP Request error handling, Supabase PATCH, Realtime subscriptions, TanStack Query invalidation) exists in the codebase already. No new libraries are required.

**Primary recommendation:** Modify workflow JSONs locally, then PUT to n8n REST API (`PUT /api/v1/workflows/{id}`) with the full updated JSON. This is the safest update path — no live node editing in the n8n UI, no risk of partial saves.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Idempotency — Topic Generation Re-trigger (AGNT-06)**
- Topics already exist → block by default: check `SELECT count(*) FROM topics WHERE project_id = ?`. If count > 0 and `force != true`, return `{ topics_exist: true, count: N }` (HTTP 200 with flag, not 409).
- Dashboard confirm flow: on receiving `topics_exist: true`, show confirm dialog ("X topics already exist. Generate 25 more?"). If confirmed, resend with `force=true`.
- Additive batches: each confirmed generation adds exactly 25 new topics. Old topics are NEVER deleted.
- `topic_number` continues sequentially from `MAX(topic_number) + 1`.
- Dedup via existing topic context: read ALL existing topics (titles + hooks), pass to Claude as "existing topics — avoid overlap."
- Partial failure detection: `projects.status = 'generating_topics'` is the crash flag. On `force=true` retry, if status is `'generating_topics'`, auto-detect partial batch and COMPLETE it (not restart). Topics needed = `25 − (existing_count % 25)` if partial, else 25.

**Idempotency — Research Re-trigger (WF_PROJECT_CREATE)**
- niche_profile exists → skip web search: `SELECT count(*) FROM niche_profiles WHERE project_id = ?` > 0 → skip Claude research call entirely.
- Re-generate prompts only: use existing niche_profiles data from projects table, insert new prompt_configs rows with `version = MAX(version) + 1`, set `is_active = true`, set old rows `is_active = false`.
- Full fresh research: only if niche_profiles does NOT exist (first run).

**Inline Editing — DASH-01**
- Trigger: Pencil icon button → entire expanded section of TopicCard enters edit mode. ALL fields editable at once. Save + Cancel buttons appear at bottom.
- Editable topic fields: `seo_title`, `narrative_hook`, `key_segments`
- Editable avatar fields: all 10 (`avatar_name_age`, `occupation_income`, `life_stage`, `pain_point`, `spending_profile`, `knowledge_level`, `emotional_driver`, `online_hangouts`, `objection`, `dream_outcome`)
- Save mechanism: TWO separate webhook calls to WF_TOPICS_ACTION:
  1. Topic fields → `{ action: 'edit', topic_id, fields: { seo_title, narrative_hook, key_segments } }`
  2. Avatar fields → `{ action: 'edit_avatar', topic_id, fields: { avatar_name_age, ... } }` (new route needed in WF_TOPICS_ACTION)
- Save route: n8n webhook (`/webhook/topics/action`), NOT direct Supabase.
- State during save: card shows loading indicator, inputs disabled. On success, exit edit mode, TanStack Query invalidation.
- Cancel: resets inputs to original values, exits edit mode without saving.

**Production Log (AGNT-07)**
- Granularity: workflow-level — 2 entries per workflow run: `action='started'` at beginning, `action='completed'` or `action='failed'` at end.
- Topic actions also logged: each approve/reject/refine/edit in WF_TOPICS_ACTION writes 1 production_log entry.
- `details` for research completion: summary stats only — `{ competitor_count, pain_points_found, blue_ocean_angles, search_queries_used, prompts_generated }`. No large JSON objects.
- Dashboard ProductionMonitor already subscribes to production_log via Realtime — no dashboard code changes needed.

**Research Timeout & Failure UX (AGNT-01)**
- HTTP Request timeout: 600s (600000ms) for Claude niche research call. (REQUIREMENTS.md says 300s; user chose 600s for safety margin.)
- Failure handling: write `projects.status = 'research_failed'`, `projects.error_log = error_message`, and production_log entry.
- Retry button: appears on ProjectsHome project card when status = `research_failed`. Calls `/webhook/project/create` with existing `project_id`.
- Live research indicator: ProjectsHome card shows animated spinner/pulse while `project.status` starts with `researching_`. Already handled by ProjectCard.jsx — `isResearching(status)` checks `status.startsWith('researching')`.

**Error Handlers (AGNT-08)**
- All failure branches must be connected.
- WF_TOPICS_GENERATE and WF_TOPICS_ACTION currently have NO error handlers at all — each needs error path from Claude call failure → PATCH projects/topics status to `*_failed` + write error_log + production_log entry.
- Pattern: `onError: 'continueRegularOutput'` on HTTP Request nodes + explicit IF node to check for error response. Same pattern already used in WF_PROJECT_CREATE.

**System Prompt Loading (AGNT-09)**
- WF_TOPICS_GENERATE fix: currently uses `system: $('Build Prompt').first().json.prompt.substring(0, 500)` — replace with `system: project.niche_system_prompt` (loaded from projects table via "Read Project" node, already present).
- The `topic_generator` prompt from `prompt_configs` becomes the `user` message content (stays as-is).
- WF_PROJECT_CREATE: no system parameter change needed — research calls are ad-hoc.

### Claude's Discretion
- Exact error message strings and HTTP status codes for webhook error responses
- Node layout/positioning in updated workflow JSONs
- Whether to use n8n Split In Batches node or a Code node loop for bulk insertions
- Exact production_log `stage` values (string naming convention)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AGNT-01 | Niche research calls Claude API with web_search_20250305 tool (timeout 300s → 600s per user decision, max_uses 10) | Timeout change: `"timeout": 600000` in node `wf-pc-anthropic-research` options. Tool already present in jsonBody. |
| AGNT-02 | Niche research writes structured results to niche_profiles table | INSERT already exists (node `wf-pc-insert-niche-profile`). Idempotency guard needs to precede it. |
| AGNT-03 | Dynamic prompt generation creates 7 prompt types with version tracking | INSERT exists (node `wf-pc-insert-prompts`). Re-trigger path needs version increment + deactivate old. |
| AGNT-04 | Topic generation produces 25 topics + 25 avatars using niche-specific prompts | Core logic exists. Needs: idempotency check, force flag, existing-topics dedup, partial batch detection, system prompt fix. |
| AGNT-05 | Topic action handles approve/reject/refine with all-24-topics context for refinement | Already reads all topics (`wf-ta-read-all-topics`). CONFIRMED DONE — no changes needed. |
| AGNT-06 | Idempotency guards prevent duplicate topic/avatar creation on re-trigger | New Code node needed in WF_TOPICS_GENERATE after Validate. New confirm flow in dashboard NicheResearch page. |
| AGNT-07 | All AI workflows write production_log entries | New POST nodes needed in all 3 workflows (2 per workflow + 1 per topic action). |
| AGNT-08 | Error handlers connected on all failure branches | WF_PROJECT_CREATE: error handler node exists but connection to prompt failure branch missing. WF_TOPICS_GENERATE + WF_TOPICS_ACTION: no error handler nodes at all — must add. |
| AGNT-09 | System prompt loaded from projects.niche_system_prompt (not substring hack) | Fix one line in `wf-tg-anthropic` jsonBody: `system: $('Read Project').first().json[0].niche_system_prompt` |
| DASH-01 | Inline editing of topic fields (title, hook, avatar data) on Topic Review page | TopicCard.jsx edit mode state; useEditTopic + new useEditAvatar mutation; WF_TOPICS_ACTION Switch output index 4 for edit_avatar route. |
</phase_requirements>

---

## Standard Stack

### Core (no new dependencies needed)
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| n8n REST API | v1 | Workflow updates via PUT /api/v1/workflows/{id} | Already in use; the standard update path |
| Vitest | ^2.1.0 | Test runner | Already installed in dashboard/package.json |
| @tanstack/react-query | in use | Mutations + cache invalidation | Already in useTopics.js, useProjects.js |
| Supabase JS client | in use | Realtime + queries | Already wired in useRealtimeSubscription.js |

### No New Libraries Required
All patterns needed already exist in the codebase. Phase 9 is purely additive edits to existing files.

---

## Architecture Patterns

### Pattern 1: n8n Workflow Update via REST API

**What:** PUT the full workflow JSON (with new nodes and connections merged in) to the n8n REST API.

**When to use:** Updating live imported workflows without touching the n8n UI.

**Approach:**
```bash
# Fetch current workflow (to get live node IDs / positions if they changed post-import):
GET https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/J5NTvfweZRiKJ9fG
Authorization: Bearer {N8N_API_KEY}

# Then PUT updated JSON:
PUT https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/J5NTvfweZRiKJ9fG
Content-Type: application/json
Authorization: Bearer {N8N_API_KEY}

{ ...full workflow JSON with updated nodes/connections... }
```

**Key constraint:** The PUT body must include the FULL workflow JSON — not just changed nodes. n8n replaces the entire workflow definition. Partial PATCH is not supported in n8n v1 API.

**Workflow IDs (from STATE.md):**
- WF_PROJECT_CREATE: `8KW1hiRklamduMzO`
- WF_TOPICS_GENERATE: `J5NTvfweZRiKJ9fG`
- WF_TOPICS_ACTION: `BE1mpwuBigLsq26v`

**Confidence:** HIGH — confirmed from Phase 8 import process.

### Pattern 2: n8n Error Handler Connection

**What:** `onError: 'continueRegularOutput'` on HTTP Request nodes + downstream Code/IF node that checks `response.error`.

**Already used in:** WF_PROJECT_CREATE nodes `wf-pc-anthropic-research` and `wf-pc-anthropic-prompts`.

**Pattern:**
```json
{
  "onError": "continueRegularOutput"
}
```

Then downstream Code node:
```javascript
const response = $input.first().json;
if (response.error) {
  throw new Error(`Anthropic error: ${response.error.message}`);
}
```

The `throw` in a Code node causes n8n to route to the workflow's error handler if one is set, OR stops execution. For this project the desired pattern is: catch the error, PATCH status to `_failed` in Supabase, write production_log, then stop gracefully.

**Correct implementation (no throw — graceful stop):**
```javascript
// In error-check Code node after Claude call:
const response = $input.first().json;
if (response.error) {
  return [{ json: {
    isError: true,
    error_message: response.error.message || JSON.stringify(response.error),
    project_id: $('Validate').first().json.project_id
  }}];
}
// Pass through normal response
return [{ json: response }];
```

Then an IF node: `{{ $json.isError }}` === true → error branch (PATCH + production_log INSERT) / false → continue.

**Confidence:** HIGH — pattern verified from existing WF_PROJECT_CREATE code.

### Pattern 3: Idempotency Guard Code Node (WF_TOPICS_GENERATE)

**Position:** After "Build Prompt" node, before "Respond" + "Status → Generating" fan-out.

**Logic:**
```javascript
const body = $('Validate').first().json;
const project_id = body.project_id;
const force = body.force === true || body.force === 'true';

// Read from Supabase via prior HTTP Request node result
const topicsResult = $('Check Existing Topics').first().json;
const existingTopics = Array.isArray(topicsResult) ? topicsResult : [];
const existingCount = existingTopics.length;

// Check for crash flag
const project = $('Read Project').first().json[0] || {};
const isCrashResume = force && project.status === 'generating_topics';

if (existingCount > 0 && !force) {
  // Return early — dashboard will show confirm dialog
  return [{ json: {
    topics_exist: true,
    count: existingCount,
    project_id,
    __early_return: true
  }}];
}

// Calculate batch parameters
let startTopicNumber, topicsNeeded;
if (isCrashResume && existingCount % 25 !== 0) {
  // Partial batch — complete it
  startTopicNumber = existingCount + 1;
  topicsNeeded = 25 - (existingCount % 25);
} else {
  // New full batch
  startTopicNumber = existingCount + 1;
  topicsNeeded = 25;
}

// Build existing topic titles for dedup context
const existingTitles = existingTopics.map(t => ({
  topic_number: t.topic_number,
  seo_title: t.seo_title,
  narrative_hook: t.narrative_hook
}));

return [{ json: {
  project_id,
  force,
  isCrashResume,
  existingCount,
  startTopicNumber,
  topicsNeeded,
  existingTitles,
  __early_return: false
}}];
```

**Early return wiring:** After the idempotency Code node, add an IF node. If `__early_return === true`, route to a "Respond (Topics Exist)" node that sends `{ topics_exist: true, count: N }`. If false, continue to normal flow.

**Confidence:** HIGH — logic derived directly from CONTEXT.md decisions.

### Pattern 4: production_log INSERT Node

**Reusable node template for all 3 workflows:**
```json
{
  "parameters": {
    "method": "POST",
    "url": "={{$env.SUPABASE_URL}}/rest/v1/production_log",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "apikey", "value": "={{$env.SUPABASE_ANON_KEY}}" },
        { "name": "Prefer", "value": "return=minimal" }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({ project_id: $json.project_id, topic_id: $json.topic_id || null, stage: 'niche_research', action: 'started', details: {} }) }}",
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "credentials": {
    "httpHeaderAuth": { "id": "supabase-service-role", "name": "Supabase Service Role" }
  },
  "onError": "continueRegularOutput"
}
```

**Stage values (Claude's discretion — recommended convention):**
- WF_PROJECT_CREATE: `'niche_research'`
- WF_TOPICS_GENERATE: `'topic_generation'`
- WF_TOPICS_ACTION (approve): `'topic_review'`
- WF_TOPICS_ACTION (reject): `'topic_review'`
- WF_TOPICS_ACTION (refine): `'topic_refinement'`
- WF_TOPICS_ACTION (edit/edit_avatar): `'topic_edit'`

**Confidence:** HIGH — ProductionMonitor.jsx already subscribes to `production_log` table, no schema changes needed.

### Pattern 5: WF_TOPICS_ACTION edit_avatar Route

**What needs changing:**
1. Add output index 4 to the Switch node (`action='edit_avatar'`)
2. Add a new PATCH node targeting the `avatars` table
3. Add a "Success (Edit Avatar)" Code node

**Switch rule to add (outputIndex 4):**
```json
{
  "outputIndex": 4,
  "conditions": {
    "conditions": [{
      "leftValue": "={{ $json.action }}",
      "rightValue": "edit_avatar",
      "operator": { "type": "string", "operation": "equals" }
    }]
  }
}
```

**New PATCH node — Edit Avatar:**
```json
{
  "parameters": {
    "method": "PATCH",
    "url": "={{$env.SUPABASE_URL}}/rest/v1/avatars?topic_id=eq.{{ $('Parse Request').first().json.topic_id }}",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify($('Parse Request').first().json.fields) }}"
  },
  "id": "wf-ta-edit-avatar",
  "name": "Edit Avatar"
}
```

**Dashboard call pattern:**
```javascript
// Two sequential calls from TopicCard save handler:
await webhookCall('topics/action', {
  action: 'edit',
  topic_id: topic.id,
  fields: { seo_title, narrative_hook, key_segments }
});
await webhookCall('topics/action', {
  action: 'edit_avatar',
  topic_id: topic.id,
  project_id: topic.project_id,
  fields: { avatar_name_age, occupation_income, ... }
});
```

**Confidence:** HIGH — derived from CONTEXT.md, confirmed by reading WF_TOPICS_ACTION.json Switch node structure.

### Pattern 6: TopicCard Inline Edit Mode

**Current state:** Pencil button at line 219-226 in TopicCard.jsx calls `onEdit(topic)`. This opens EditPanel (a SidePanel). `handleEdit` in TopicReview.jsx sets `panelType='edit'` and `panelTopic=topic`.

**Required change:** Replace SidePanel modal with in-card state. The edit mode must live inside TopicCard.

**State to add to TopicCard:**
```javascript
const [isEditing, setIsEditing] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [editTopicFields, setEditTopicFields] = useState({});
const [editAvatarFields, setEditAvatarFields] = useState({});
```

**Initialization (on entering edit mode):**
```javascript
const enterEditMode = (e) => {
  e.stopPropagation();
  setEditTopicFields({
    seo_title: topic.seo_title || '',
    narrative_hook: topic.narrative_hook || '',
    key_segments: topic.key_segments || '',
  });
  const av = topic.avatars?.[0] || {};
  const af = {};
  AVATAR_FIELDS.forEach(f => { af[f.key] = av[f.key] || ''; });
  setEditAvatarFields(af);
  setIsEditing(true);
  if (!expanded) setExpanded(true); // auto-expand
};
```

**Save handler (two sequential webhookCalls):**
```javascript
const handleSave = async () => {
  setIsSaving(true);
  try {
    await onEdit(topic.id, editTopicFields, editAvatarFields);
    setIsEditing(false);
  } catch (err) {
    // toast.error handled by parent/mutation
  } finally {
    setIsSaving(false);
  }
};
```

**TopicCard prop change:** The `onEdit` callback signature changes from `onEdit(topic)` → `onEdit(topicId, topicFields, avatarFields)`.

**TopicReview.jsx change:** The `handleEdit` function changes from opening a panel to calling the mutations directly and handling the result. EditPanel is no longer needed for DASH-01 (though it can remain for other potential uses).

**useTopics.js:** `useEditTopic` already exists (lines 152-184). A new `useEditAvatar` mutation is needed:
```javascript
export function useEditAvatar(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ topic_id, fields }) =>
      webhookCall('topics/action', { action: 'edit_avatar', topic_id, fields }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
    },
  });
}
```

**Confidence:** HIGH — derived from reading TopicCard.jsx (lines 1-290), useTopics.js (lines 1-184), TopicReview.jsx (lines 103-175), and EditPanel.jsx.

### Pattern 7: ProjectsHome Retry Button for research_failed

**What needs adding to ProjectCard.jsx:**

The card is currently a `<NavLink>` that wraps everything. `research_failed` status routes to `/project/${projectId}/research` via `getSmartRoute`. Per CONTEXT.md, the retry should call `/webhook/project/create` with the existing `project_id` — NOT navigate to the research page.

**Options:**
1. Add a retry button inside the NavLink that stops propagation
2. Change ProjectCard from a NavLink to a div with a separate Link

Option 1 is simpler. Add inside the card when `status === 'research_failed'`:
```jsx
<button
  onClick={(e) => {
    e.preventDefault(); // prevent NavLink navigation
    e.stopPropagation();
    onRetryResearch(id); // prop from ProjectsHome
  }}
  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
    text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30
    hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
>
  <RefreshCw className="w-3.5 h-3.5" /> Retry Research
</button>
```

**useProjects.js:** Add `useRetryResearch` mutation:
```javascript
export function useRetryResearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ project_id }) =>
      webhookCall('project/create', { project_id }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
```

**Supabase Realtime for project status:** `useProjects` already calls `useRealtimeSubscription('projects', null, [['projects']])` — all status changes push to the ProjectsHome list automatically. No code change needed for live updates.

**Confidence:** HIGH — confirmed from reading ProjectCard.jsx, useProjects.js, ProjectsHome.jsx.

### Pattern 8: WF_PROJECT_CREATE Idempotency Guard

**What needs adding:** A check node after "Extract Project ID" that, when `project_id` is provided in the incoming body (retry), skips the INSERT Project step and routes to research.

**Revised Validate Input node logic:**
```javascript
const body = $input.first().json.body || $input.first().json;
const niche = body.niche?.trim();
const project_id = body.project_id; // exists on retry

if (project_id) {
  // Retry path — project already exists
  return [{ json: { project_id, isRetry: true } }];
}

if (!niche || niche.length < 2) {
  throw new Error('Niche name is required (min 2 characters)');
}
return [{ json: { niche, description: body.description?.trim() || '',
  target_video_count: parseInt(body.target_video_count, 10) || 25,
  channel_style: '2hr_documentary', isRetry: false } }];
```

**After project exists:** Check niche_profiles:
```javascript
// GET niche_profiles?project_id=eq.{id}&select=id
const profiles = $input.first().json;
const hasProfile = Array.isArray(profiles) ? profiles.length > 0 : false;
if (hasProfile) {
  // Skip web search, go straight to prompt regeneration
  return [{ json: { ...prev, skipResearch: true } }];
}
return [{ json: { ...prev, skipResearch: false } }];
```

**Prompt re-generation on re-trigger:**
```javascript
// Before INSERT Prompt Configs, deactivate old rows:
// PATCH /rest/v1/prompt_configs?project_id=eq.{id}&is_active=eq.true
// Body: { is_active: false }
// Then determine version = MAX(version) + 1 from existing rows
// Insert new rows with version = maxVersion + 1, is_active = true
```

**Confidence:** HIGH — directly from CONTEXT.md locked decisions.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Workflow updates | Custom n8n node editor | PUT /api/v1/workflows/{id} with full JSON | n8n API is the safe path; UI editing risks partial saves on complex workflows |
| Error routing in n8n | Complex try/catch Code nodes | `onError: continueRegularOutput` + IF node | Already the established pattern in WF_PROJECT_CREATE |
| Avatar PATCH | Direct Supabase call from dashboard | Route via WF_TOPICS_ACTION webhook | CONTEXT.md locked decision: all topic actions via webhook |
| Topic count check | Counting from dashboard | Supabase count query inside n8n Code node | Source of truth is the database; dashboard state can be stale |
| Realtime for ProjectsHome | Polling with setInterval | useRealtimeSubscription already in useProjects | Already wired — no code change needed |

---

## Common Pitfalls

### Pitfall 1: n8n workflow PUT — forgetting `active: true`
**What goes wrong:** If the PUT body omits `"active": true`, n8n deactivates the workflow.
**Why it happens:** n8n's PUT endpoint replaces the entire workflow definition including the active state.
**How to avoid:** Always include `"active": true` (or preserve the fetched value) in the PUT body.
**Detection:** Webhook calls return 404 after update.

### Pitfall 2: Switch node output index gap
**What goes wrong:** The Switch node currently has outputs 0-3. Adding a new output at index 4 requires the connections array to have all 5 outputs listed, even if outputs 0-3 are unchanged.
**Why it happens:** n8n connections are index-based arrays; gaps cause routing failures.
**How to avoid:** When adding output index 4, include all existing connections at indices 0-3 plus new connection at index 4.

### Pitfall 3: AGNT-09 substring hack produces wrong system param
**What goes wrong:** `$('Build Prompt').first().json.prompt.substring(0, 500)` sends the first 500 chars of the topic_generator prompt as the system message. This is a generic placeholder string that becomes the AI persona.
**Root cause:** The `niche_system_prompt` is stored in `projects.niche_system_prompt` (written by WF_PROJECT_CREATE). The "Read Project" node (`wf-tg-read-project`) already reads `select=*` so the field is available.
**Fix:** In `wf-tg-anthropic` jsonBody, change:
```
system: $('Build Prompt').first().json.prompt.substring(0, 500)
```
to:
```
system: $('Read Project').first().json[0].niche_system_prompt || ''
```
**Warning:** n8n expression references across nodes: `$('Read Project')` works when "Read Project" ran before "Claude: Generate Topics" in the execution graph, which it does (Validate → Read Project + Read Prompt Config → Build Prompt → Status → Generating → Claude).

### Pitfall 4: Idempotency check race condition on force=true
**What goes wrong:** Two concurrent force=true requests could both pass the check and both generate 25 topics, producing 50 duplicates.
**Why it happens:** The count check and status update are not atomic.
**How to avoid:** The "Status → Generating" PATCH (which already runs) acts as a soft mutex. A second force=true request will see `status='generating_topics'` and enter the crash-resume path, which will calculate `topicsNeeded = 0` if the first run just completed. This is acceptable for solo use.
**Warning signs:** topic_count > 50 for a 2-batch project.

### Pitfall 5: useEditTopic webhook path mismatch
**What goes wrong:** `useEditTopic` in useTopics.js calls `webhookCall('topics/edit', ...)`. But WF_TOPICS_ACTION is on path `topics/action`. WF_WEBHOOK_TOPICS_ACTION (`cc0n4oQnEU8Fy5AY`) routes to WF_TOPICS_ACTION — check whether `topics/edit` is a valid path on that webhook or if it should be `topics/action`.
**Root cause:** Looking at useTopics.js line 157: `webhookCall('topics/edit', { topic_id, fields })`. Looking at WF_TOPICS_ACTION webhook at line 5: `"path": "topics/action"`. The `topics/edit` endpoint does not exist — this is a bug in the existing code.
**Fix:** Change `useEditTopic` mutationFn to call `topics/action` with `{ action: 'edit', topic_id, fields }`. Same for the new inline edit calls.
**Confidence:** HIGH — confirmed by reading both files.

### Pitfall 6: TopicCard expanded auto-open on edit
**What goes wrong:** User clicks Pencil on a collapsed card. Edit mode activates but expanded section is not visible.
**How to avoid:** `enterEditMode` must set `setExpanded(true)` if `!expanded`. The edit inputs render inside the expanded section, so it must be open.

### Pitfall 7: WF_PROJECT_CREATE error handler not connected to prompt generation failure
**What goes wrong:** If "Parse Prompts + TOPC-02 Check" throws (which it does when the prompt fails the quality benchmark check), the error flows to the workflow-level error handler — not to `wf-pc-error-handler`. The `wf-pc-error-handler` node exists but there is no connection from "Parse Prompts + TOPC-02 Check" to it.
**Root cause:** Looking at WF_PROJECT_CREATE.json connections (lines 407-418): `"Parse Prompts + TOPC-02 Check"` only connects to `"INSERT Prompt Configs"`. The error handler node (`wf-pc-error-handler`) has no incoming connection from any node.
**Fix:** Add connection from `"Claude: Generate Prompts"` output (which uses `onError: continueRegularOutput`) through a check Code node → IF error → error handler node.
**Confidence:** HIGH — confirmed by reading connections in WF_PROJECT_CREATE.json.

---

## Code Examples

### Verified: Claude API call with web_search tool (existing in WF_PROJECT_CREATE)
```javascript
// Source: workflows/WF_PROJECT_CREATE.json, node wf-pc-anthropic-research
// Current timeout: 120000 — MUST change to 600000
{
  model: 'claude-sonnet-4-6',
  max_tokens: 16384,
  tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }],
  messages: [{ role: 'user', content: `...` }]
}
// options: { timeout: 600000 }  ← change from 120000
```

### Verified: Supabase filter syntax for topics count
```
GET /rest/v1/topics?project_id=eq.{id}&select=id,topic_number,seo_title,narrative_hook
```
No `count(*)` in PostgREST — fetch all rows with minimal field selection, count client-side in Code node.
For count only:
```
GET /rest/v1/topics?project_id=eq.{id}&select=id
Headers: Prefer: count=exact
```
PostgREST returns count in `Content-Range` header. In n8n HTTP Request, reading headers is only available with `fullResponse: true`. Simpler: return minimal fields and check `Array.isArray(result) ? result.length : 0` in Code node.

### Verified: Existing topic dedup context passed to Claude
```javascript
// Add to Claude call user message content in WF_TOPICS_GENERATE:
const existingContext = existingTitles.length > 0
  ? `\n\nEXISTING TOPICS (do NOT overlap with these):\n${
      existingTitles.map(t => `- #${t.topic_number}: ${t.seo_title}`).join('\n')
    }\n`
  : '';

// Inject into prompt before sending:
const fullPrompt = prompt + existingContext + `\n\nGenerate ${topicsNeeded} NEW topics starting at topic_number ${startTopicNumber}.`;
```

### Verified: n8n API workflow update (Phase 8 pattern)
```bash
# Confirmed pattern from Phase 8 workflow import (STATE.md line 238-241)
curl -X PUT \
  https://n8n.srv1297445.hstgr.cloud/api/v1/workflows/J5NTvfweZRiKJ9fG \
  -H "Authorization: Bearer {N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @WF_TOPICS_GENERATE_updated.json
```

### Verified: useTopics.js mutation pattern for new useEditAvatar
```javascript
// Source: dashboard/src/hooks/useTopics.js lines 152-184 (useEditTopic — same pattern)
export function useEditAvatar(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ topic_id, fields }) =>
      webhookCall('topics/action', { action: 'edit_avatar', topic_id, fields }),
    onMutate: async ({ topic_id, fields }) => {
      await queryClient.cancelQueries({ queryKey: ['topics', projectId] });
      const prev = queryClient.getQueryData(['topics', projectId]);
      queryClient.setQueryData(['topics', projectId], (old) =>
        (old || []).map((t) => {
          if (t.id !== topic_id) return t;
          return { ...t, avatars: [{ ...(t.avatars?.[0] || {}), ...fields }] };
        })
      );
      return { previousTopics: prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousTopics) queryClient.setQueryData(['topics', projectId], ctx.previousTopics);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
    },
  });
}
```

---

## Gap Analysis: Exact Changes Per File

### WF_PROJECT_CREATE.json (ID: 8KW1hiRklamduMzO)

| Node | Change | Type |
|------|--------|------|
| `wf-pc-validate` | Accept `project_id` in body → if present, skip INSERT Project | Code change |
| NEW: `Check Niche Profile` | GET niche_profiles?project_id=eq.{id} | New HTTP Request node |
| NEW: `Skip or Research` | IF skipResearch → prompt regeneration path | New IF node |
| `wf-pc-anthropic-research` | `timeout: 120000 → 600000` | Options change |
| NEW: `Check Research Error` | Code node after Claude research call | New Code node |
| NEW: `IF Research Error` | Route error → error handler | New IF node |
| NEW: `Deactivate Old Prompts` | PATCH prompt_configs set is_active=false | New HTTP Request node (re-trigger path only) |
| NEW: `LOG Started` | POST production_log action='started' | New HTTP Request node |
| NEW: `LOG Completed` | POST production_log action='completed' | New HTTP Request node |
| `wf-pc-error-handler` | Connect from both Claude call error branches | Connection change |
| NEW: `LOG Failed` | POST production_log action='failed' (in error handler path) | New HTTP Request node |

### WF_TOPICS_GENERATE.json (ID: J5NTvfweZRiKJ9fG)

| Node | Change | Type |
|------|--------|------|
| `wf-tg-validate` | Parse `force` flag from body | Code change |
| NEW: `Fetch Existing Topics` | GET topics?project_id=eq.{id}&select=id,topic_number,seo_title,narrative_hook | New HTTP Request node |
| NEW: `Idempotency Check` | Count check, crash detect, batch params | New Code node |
| NEW: `IF Topics Exist` | Route early-return vs continue | New IF node |
| NEW: `Respond (Topics Exist)` | Return `{ topics_exist: true, count: N }` | New Respond node |
| `wf-tg-build-prompt` | Inject `existingTitles` context + `topicsNeeded` + `startTopicNumber` into prompt | Code change |
| `wf-tg-anthropic` | Fix `system:` param (AGNT-09) | jsonBody change |
| `wf-tg-anthropic` | `timeout: 120000 → 120000` (keep as-is — only research call needs 600s) | No change |
| `wf-tg-parse` | Use `startTopicNumber` offset for `topic_number` | Code change |
| NEW: `Check Topics Error` | Error check after Claude call | New Code node |
| NEW: `IF Topics Error` | Route error → error PATCH + production_log | New IF node |
| NEW: `Error → Topics Failed` | PATCH projects status='topics_failed', error_log | New HTTP Request node |
| NEW: `LOG Started` | POST production_log action='started' | New HTTP Request node |
| NEW: `LOG Completed` | POST production_log action='completed' | New HTTP Request node |
| NEW: `LOG Failed` | POST production_log action='failed' | New HTTP Request node |

### WF_TOPICS_ACTION.json (ID: BE1mpwuBigLsq26v)

| Node | Change | Type |
|------|--------|------|
| `wf-ta-switch` | Add output index 4 for `edit_avatar` | Switch rule addition |
| NEW: `Edit Avatar` | PATCH avatars?topic_id=eq.{id} | New HTTP Request node |
| NEW: `Success (Edit Avatar)` | Return `{ success: true, action: 'edit_avatar' }` | New Code node |
| `wf-ta-anthropic-refine` | Already has `onError: continueRegularOutput` — verify connected | Verify existing |
| NEW: `Check Refine Error` | Error check after Claude refine call | New Code node |
| NEW: `IF Refine Error` | Route error → error PATCH | New IF node |
| NEW: `Error → Refine Failed` | PATCH topics status / review_status + error_log | New HTTP Request node |
| NEW: `LOG (approve)` | POST production_log after Approve Topics | New HTTP Request node |
| NEW: `LOG (reject)` | POST production_log after Reject Topics | New HTTP Request node |
| NEW: `LOG (refine)` | POST production_log after UPDATE Refined Topic | New HTTP Request node |
| NEW: `LOG (edit)` | POST production_log after Edit Topic | New HTTP Request node |
| NEW: `LOG (edit_avatar)` | POST production_log after Edit Avatar | New HTTP Request node |

### dashboard/src/hooks/useTopics.js

| Change | Lines | Type |
|--------|-------|------|
| Fix `useEditTopic` mutationFn: change endpoint from `topics/edit` to `topics/action` with `{ action: 'edit', ... }` | 157 | Bug fix |
| Add `useEditAvatar(projectId)` export | after line 184 | New function |

### dashboard/src/components/topics/TopicCard.jsx

| Change | Lines | Type |
|--------|-------|------|
| Add state: `isEditing`, `isSaving`, `editTopicFields`, `editAvatarFields` | after line 96 | State addition |
| Add `enterEditMode` handler | new function | New function |
| Pencil button `onClick`: change from `onEdit(topic)` to `enterEditMode` | 220 | Handler change |
| Expanded section: conditional render — if `isEditing`, show inputs; else show static text | 248-286 | JSX change |
| Add Save/Cancel buttons at bottom of expanded section when `isEditing` | after line 285 | JSX addition |

### dashboard/src/pages/TopicReview.jsx

| Change | Lines | Type |
|--------|-------|------|
| Import `useEditAvatar` | line 5 | Import addition |
| Add `editAvatarMutation = useEditAvatar(projectId)` | line 37 | Hook usage |
| Change `handleEdit`: now calls `editTopicMutation` + `editAvatarMutation` instead of opening panel | 103-106 | Handler change |
| `onEdit` prop to TopicCard: change signature to `(topicId, topicFields, avatarFields)` | 293 | Prop change |
| EditPanel: can remain (for non-inline fallback) or remove (clean up) | 326-331 | Optional removal |

### dashboard/src/components/projects/ProjectCard.jsx

| Change | Lines | Type |
|--------|-------|------|
| Accept `onRetryResearch` prop | line 75 | Prop addition |
| Add retry button when `status === 'research_failed'` | after line 133 | JSX addition |
| Import `RefreshCw` from lucide-react | line 1 | Import addition |

### dashboard/src/hooks/useProjects.js

| Change | Lines | Type |
|--------|-------|------|
| Add `useRetryResearch()` export | after line 71 | New function |

### dashboard/src/pages/ProjectsHome.jsx

| Change | Lines | Type |
|--------|-------|------|
| Import `useRetryResearch` | line 3 | Import addition |
| Add `retryMutation = useRetryResearch()` | after line 10 | Hook usage |
| Pass `onRetryResearch` to ProjectCard | line 113 | Prop passing |
| Show "X topics already exist" confirm dialog for AGNT-06 (needed if GenerateTopics button is on this page) | varies | New state |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^2.1.0 |
| Config file | `dashboard/vite.config.js` (inlined test config) |
| Quick run command | `cd dashboard && npm test -- --reporter=verbose --run` |
| Full suite command | `cd dashboard && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGNT-01 | Claude research call uses 600s timeout | manual | SSH to VPS, trigger workflow, check execution timeout | N/A (n8n workflow) |
| AGNT-02 | niche_profiles row created after research | manual | Check Supabase after E2E run | N/A (n8n workflow) |
| AGNT-03 | prompt_configs rows versioned on re-trigger | manual | Check Supabase: is_active + version fields | N/A (n8n workflow) |
| AGNT-04 | 25 topics + 25 avatars inserted | manual | Check Supabase topics/avatars count | N/A (n8n workflow) |
| AGNT-05 | Refine reads all 24 other topics | manual | Already confirmed DONE, no test needed | N/A |
| AGNT-06 | Idempotency: returns topics_exist=true, dashboard shows confirm | unit | `cd dashboard && npm test -- --run TopicActions` | ❌ Wave 0 |
| AGNT-07 | production_log entries appear in monitor | manual | ProductionMonitor.jsx Realtime — check in browser | N/A |
| AGNT-08 | Error handlers write research_failed status | manual | Trigger with bad API key, check projects.status | N/A (n8n workflow) |
| AGNT-09 | system param = niche_system_prompt value | manual | Check n8n execution input JSON for Claude call | N/A (n8n workflow) |
| DASH-01 | Inline edit mode in TopicCard | unit | `cd dashboard && npm test -- --run TopicActions` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd dashboard && npm test -- --reporter=verbose --run 2>&1 | tail -20`
- **Per wave merge:** `cd dashboard && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `dashboard/src/__tests__/TopicActions.test.jsx` — covers DASH-01 inline edit mode (file exists but all tests are RED stubs `expect(true).toBe(false)`)
- [ ] `dashboard/src/__tests__/ProjectsHome.test.jsx` — add test for `research_failed` retry button visibility (file exists, needs new test case)
- [ ] `dashboard/src/__tests__/TopicReview.test.jsx` — covers AGNT-06 dashboard confirm dialog for `topics_exist: true` (file exists, all tests are RED stubs)

Note: n8n workflow tests (AGNT-01 through AGNT-09) are manual-only — there is no unit test infrastructure for n8n workflow JSON logic in this project.

---

## State of the Art

| Old State | New State | Change | Impact |
|-----------|-----------|--------|--------|
| `timeout: 120000` (2 min) on research call | `timeout: 600000` (10 min) | Per user decision | Prevents timeout on 10-search niche research runs |
| system prompt = `prompt.substring(0, 500)` | system prompt = `project.niche_system_prompt` | AGNT-09 fix | AI persona correctly matches niche (e.g., "Senior Credit Card Analyst") |
| No idempotency guard | count check + force flag + crash resume | AGNT-06 | Prevents duplicate topics on re-trigger |
| No error handlers in WF_TOPICS_GENERATE | Error paths → DB status write | AGNT-08 | Research/topic failures visible on dashboard instead of silent hang |
| Edit opens SidePanel | Edit inline in expanded card | DASH-01 | Faster UX, no modal context switch |
| `useEditTopic` calls `topics/edit` endpoint | Calls `topics/action` with `action:'edit'` | Bug fix | Actually works — `topics/edit` path does not exist |

---

## Open Questions

1. **n8n API key for workflow PUT**
   - What we know: Phase 8 imported workflows via n8n UI or import API. STATE.md does not record an N8N_API_KEY credential.
   - What's unclear: Is there an active N8N_API_KEY configured? What endpoint does n8n use for API auth on this instance?
   - Recommendation: Check n8n Settings → API in the n8n UI at n8n.srv1297445.hstgr.cloud. Generate API key if not present. The update task must include this step.

2. **`generate_topics` button location**
   - What we know: AGNT-06 requires a dashboard confirm dialog when `topics_exist: true`. The research trigger button appears to be in NicheResearch.jsx (which was not read in this session).
   - What's unclear: Where exactly the "Generate Topics" button is and what it currently does on second click.
   - Recommendation: Read `dashboard/src/pages/NicheResearch.jsx` at plan time to find the exact component and add the confirm dialog state there.

3. **Prompt re-generation version tracking**
   - What we know: CONTEXT.md says `version = MAX(version) + 1`. The prompt_configs table has a `version` column.
   - What's unclear: Does the Supabase PostgREST API support `MAX()` aggregation? (Answer: Yes, via `?select=version&order=version.desc&limit=1`.)
   - Recommendation: Read the max version by fetching `?project_id=eq.{id}&select=version&order=version.desc&limit=1`, then increment in Code node.

---

## Sources

### Primary (HIGH confidence)
- `workflows/WF_PROJECT_CREATE.json` — Full node/connection map read directly; all gaps identified
- `workflows/WF_TOPICS_GENERATE.json` — Substring hack confirmed at line 36 (`system: $('Build Prompt').first().json.prompt.substring(0, 500)`)
- `workflows/WF_TOPICS_ACTION.json` — Switch outputs 0-3 confirmed; no error handlers confirmed; `topics/action` path confirmed
- `dashboard/src/hooks/useTopics.js` — Bug confirmed: `useEditTopic` calls `topics/edit` (line 157) not `topics/action`
- `dashboard/src/components/topics/TopicCard.jsx` — onEdit signature, AVATAR_FIELDS array, expanded section structure
- `dashboard/src/pages/TopicReview.jsx` — handleEdit opens SidePanel at line 103-106; EditPanel wired at line 326-331
- `dashboard/src/components/topics/EditPanel.jsx` — Complete field structure; handleSubmit passes `fields.avatar` nested key (incompatible with new webhook pattern)
- `dashboard/src/components/projects/ProjectCard.jsx` — `research_failed` status in STATUS_BADGE/STATUS_LABEL; no retry button exists
- `dashboard/src/hooks/useProjects.js` — No `useRetryResearch` exists yet
- `.planning/phases/09-ai-agent-workflows/09-CONTEXT.md` — All locked decisions
- `.planning/STATE.md` — Workflow IDs, credential UUIDs, Phase 8 completion state

### Secondary (MEDIUM confidence)
- n8n REST API PUT /api/v1/workflows/{id} — Standard n8n API endpoint; consistent with Phase 8 import patterns recorded in STATE.md
- PostgREST count via `Prefer: count=exact` header — Standard PostgREST feature; simpler to fetch minimal fields and count in Code node

### Tertiary (LOW confidence — needs verification at execution time)
- n8n API key availability — Not confirmed in STATE.md; must check at plan/execution time

---

## Metadata

**Confidence breakdown:**
- Workflow gap analysis: HIGH — all 3 workflow JSONs read directly; every node and connection verified
- Dashboard changes: HIGH — all affected files read; exact line numbers identified
- idempotency logic: HIGH — directly from CONTEXT.md locked decisions
- n8n API update mechanism: HIGH — confirmed pattern from Phase 8
- Test coverage: HIGH — test files exist; all are stubs needing implementation

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable — no fast-moving libraries involved)
