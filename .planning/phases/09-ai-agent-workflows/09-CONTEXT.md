# Phase 9: AI Agent Workflows — Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire up and harden the three existing n8n AI workflows (WF_PROJECT_CREATE, WF_TOPICS_GENERATE, WF_TOPICS_ACTION) and add inline editing to TopicCard. Most workflow logic exists from v1.0 — this phase fills the gaps: idempotency guards, production_log entries, error handlers on all failure branches, system prompt loading fix, timeout increase, and DASH-01 inline editing UI.

Does NOT include: script generation, TTS, images, video, or any production pipeline beyond Gate 1 (topic review).

</domain>

<decisions>
## Implementation Decisions

### Idempotency — Topic Generation Re-trigger (AGNT-06)

- **Topics already exist → block by default**: WF_TOPICS_GENERATE checks `SELECT count(*) FROM topics WHERE project_id = ?` before calling Claude. If count > 0 and `force != true`, return a `{ topics_exist: true, count: N }` response (HTTP 200 with flag, not 409 — dashboard needs to read the body to show a confirm dialog).
- **Dashboard confirm flow**: On receiving `topics_exist: true`, dashboard shows a confirm dialog ("X topics already exist. Generate 25 more?"). If confirmed, resend the webhook with `force=true`.
- **Additive batches**: Each confirmed generation adds exactly 25 new topics. Old topics are NEVER deleted. Projects can accumulate 25, 50, 75+ topics.
- **topic_number continues sequentially**: New batch starts from `MAX(topic_number) + 1` (e.g., 26, 27… 50 for second batch).
- **Dedup via existing topic context**: Before calling Claude, read ALL existing topics for the project (titles + hooks, regardless of review_status). Pass them to Claude as "existing topics — avoid overlap." Same pattern as WF_TOPICS_ACTION refine.
- **Partial failure detection**: WF_TOPICS_GENERATE sets `projects.status = 'generating_topics'` at start. On `force=true` retry, if `projects.status = 'generating_topics'` (crash flag), auto-detect partial batch and COMPLETE it (do not restart):
  - Count existing topics: `existing_count`
  - Determine batch start: `MAX(topic_number)` from DB
  - Topics needed: 25 − (existing_count % 25) if partial, else 25
  - Generate only the missing topics, continuing from correct topic_number
- **Partial completion is automatic on force=true**: No separate "clean up" action in Settings needed.

### Idempotency — Research Re-trigger (WF_PROJECT_CREATE)

- **niche_profile exists → skip web search**: If `SELECT count(*) FROM niche_profiles WHERE project_id = ?` > 0, skip the Claude web search call entirely.
- **Re-generate prompts only**: Use existing niche_profiles data (already in projects table: niche_system_prompt, expertise_profile, playlist_angles, etc.) to re-run the prompt generation call. Insert new prompt_configs rows with `version = MAX(version) + 1`, set `is_active = true`, set old rows `is_active = false`.
- **Full fresh research**: Only if niche_profiles does NOT exist (first run).

### Inline Editing — DASH-01

- **Trigger**: Pencil icon button → entire expanded section of TopicCard enters edit mode. All fields editable at once. Save + Cancel buttons appear at bottom.
- **Editable fields** (topic table): `seo_title`, `narrative_hook`, `key_segments`
- **Editable fields** (avatars table): all 10 avatar fields (`avatar_name_age`, `occupation_income`, `life_stage`, `pain_point`, `spending_profile`, `knowledge_level`, `emotional_driver`, `online_hangouts`, `objection`, `dream_outcome`)
- **Save mechanism**: Two separate webhook calls to WF_TOPICS_ACTION with `action='edit'`:
  1. Topic fields → `{ action: 'edit', topic_id, fields: { seo_title, narrative_hook, key_segments } }`
  2. Avatar fields → `{ action: 'edit_avatar', topic_id, fields: { avatar_name_age, ... } }` (WF_TOPICS_ACTION needs an `edit_avatar` route added)
- **Save route**: n8n webhook (`/webhook/topics/action`), NOT direct Supabase. Consistent with approve/reject/refine pattern.
- **State during save**: Card shows loading indicator, inputs disabled. On success, card exits edit mode and re-renders with saved data (TanStack Query invalidation).
- **Cancel**: Resets inputs to original values, exits edit mode without saving.

### Production Log (AGNT-07)

- **Granularity**: Workflow-level — 2 entries per workflow run: `action='started'` at beginning, `action='completed'` or `action='failed'` at end.
- **Topic actions also logged**: Each approve/reject/refine/edit in WF_TOPICS_ACTION writes 1 production_log entry with the topic context. E.g., `{ stage: 'topic_review', action: 'approved', details: { topic_id, topic_title } }`.
- **details format for research completion**: Summary stats only — `{ competitor_count, pain_points_found, blue_ocean_angles, search_queries_used, prompts_generated }`. No large JSON objects.
- **Dashboard display**: Production Monitor already subscribes to production_log via Supabase Realtime. Entries auto-appear with no dashboard code changes needed in Phase 9.
- **All three workflows**: WF_PROJECT_CREATE, WF_TOPICS_GENERATE, WF_TOPICS_ACTION all need production_log INSERT nodes added.

### Research Timeout & Failure UX (AGNT-01)

- **HTTP Request timeout**: 600s (600000ms) for the Claude niche research call. Requirement specifies 300s; 600s chosen for safety margin given 10 web searches × 30s potential each.
- **Failure handling**: On any failure (API error, timeout, JSON parse error):
  - Write `projects.status = 'research_failed'` and `projects.error_log = error_message`
  - Write `production_log` entry: `{ stage: 'niche_research', action: 'failed', details: { error } }`
  - WF_PROJECT_CREATE already has an error handler node — ensure it is connected on ALL failure branches
- **Retry button**: Appears on ProjectsHome project card when status = `research_failed`. Calls the same `/webhook/project/create` endpoint with the existing `project_id` (not creating a new project).
- **Live research indicator**: ProjectsHome card shows animated spinner/pulse while `project.status` starts with `researching_` (e.g., `researching_competitors`, `researching_prompts`). Supabase Realtime pushes status changes — no polling needed.

### Error Handlers (AGNT-08)

- **All failure branches must be connected**: WF_TOPICS_GENERATE and WF_TOPICS_ACTION currently have no error handlers. Each needs:
  - Error path from Claude call failure → PATCH projects/topics status to `*_failed` + write error_log + production_log entry
  - Error path from Supabase INSERT failure → same pattern
- **Pattern**: Use `onError: 'continueRegularOutput'` on HTTP Request nodes + explicit IF node to check for error response. Same pattern as WF_PROJECT_CREATE.

### System Prompt Loading (AGNT-09)

- **WF_TOPICS_GENERATE fix**: Currently uses `system: $('Build Prompt').first().json.prompt.substring(0, 500)` — this is the "substring hack" AGNT-09 targets.
  - Fix: Load `project.niche_system_prompt` from the projects table.
  - Use as Claude API `system` parameter: `system: project.niche_system_prompt`
  - The `topic_generator` prompt from `prompt_configs` becomes the `user` message content.
- **WF_PROJECT_CREATE**: The two Claude calls (niche research and prompt generation) are single-turn with full instructions in user message — no system parameter needed for these calls (research is ad-hoc, not niche-persona-driven).

### Claude's Discretion

- Exact error message strings and HTTP status codes for webhook error responses
- Node layout/positioning in updated workflow JSONs
- Whether to use n8n Split In Batches node or a Code node loop for bulk insertions
- Exact production_log `stage` values (string naming convention)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- **WF_PROJECT_CREATE.json**: Complete research + prompt generation workflow. Needs: timeout increase (120s→600s), idempotency skip-if-exists, production_log nodes, error handler connections on all branches.
- **WF_TOPICS_GENERATE.json**: Complete topic + avatar generation. Needs: force flag idempotency check, existing-topics dedup context passed to Claude, partial batch completion logic, system prompt fix (AGNT-09), production_log nodes, error handlers.
- **WF_TOPICS_ACTION.json**: Complete approve/reject/refine/edit routing. Needs: `edit_avatar` route added (new Switch output), production_log entries for each action, error handler on refine failure branch. Refine already reads all 24 topics (AGNT-05 ✓).
- **TopicCard.jsx** (`dashboard/src/components/topics/TopicCard.jsx`): Has `onEdit(topic)` callback wired to Pencil button (lines 219-227). Expanded section shows avatar grid (line 273-286) and topic fields (lines 249-270). Avatar fields array already defined (`AVATAR_FIELDS`, lines 24-35). Needs: edit mode state, controlled inputs for all fields, Save/Cancel buttons, save handler that calls webhook twice (topic fields + avatar fields).
- **useTopics.js** (`dashboard/src/hooks/useTopics.js`): Existing hook for topic data fetching. May need `editTopic` and `editAvatar` mutation functions added.
- **Production Monitor** (`dashboard/src/pages/ProductionMonitor.jsx`): Already subscribes to `production_log` via Realtime. No changes needed for Phase 9 entries to appear.

### Established Patterns

- **n8n Supabase write pattern**: HTTP Request → PATCH/POST with `apikey`, `Authorization: Bearer`, `Prefer: return=minimal` headers. Used consistently across all workflows.
- **Claude API call pattern**: POST to `https://api.anthropic.com/v1/messages` with httpHeaderAuth credential `Anthropic API Key`. `onError: 'continueRegularOutput'` + downstream IF check.
- **n8n error handler pattern**: `onError: 'continueRegularOutput'` on HTTP Request node + Code node or IF that checks `response.error` → branches to error PATCH node.
- **Dashboard webhook action pattern**: POST to `/webhook/topics/action` with `{ action, topic_id(s), ... }`. All topic actions use this single endpoint.

### Integration Points

- `WF_TOPICS_ACTION` needs a new Switch output (index 4) for `action='edit_avatar'` → separate PATCH to `avatars` table
- `TopicCard` `onEdit` callback → currently opens a modal in `TopicReview.jsx` → needs to be replaced with in-card edit mode state
- `ProjectsHome.jsx` project cards → need status-aware rendering: `researching_*` → pulse spinner, `research_failed` → error badge + Retry button
- Supabase `projects` table already has `status` column and Realtime enabled — ProjectsHome just needs to handle the new status values

</code_context>

<specifics>
## Specific Ideas

- **Additive topic model**: Projects can accumulate 25, 50, 75+ topics across multiple generation runs. This is a design choice (not just a bug fix) — each "Generate More" run adds a fresh batch exploring new blue-ocean angles the AI hasn't covered yet.
- **Partial batch completion over restart**: When retrying a crashed generation, complete what was started rather than deleting and restarting. The `projects.status = 'generating_topics'` flag is the clean crash detector.
- **600s timeout**: User explicitly chose 600s over the 300s AGNT-01 spec for safety margin.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-ai-agent-workflows*
*Context gathered: 2026-03-09*
