# Phase 10: End-to-End Validation — Research

**Researched:** 2026-03-09
**Domain:** Live system testing, bug triage, missing workflow implementation
**Confidence:** HIGH — all findings from direct codebase inspection + project state files

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| E2E-01 | Full pipeline test with US Credit Cards niche: create project → research → topics → Gate 1 approve → script generation → Gate 2 approve → TTS → images → video → assembly → Gate 3 → publish | See Critical Gap below: script generation n8n workflows do not exist yet. Phase 10 must build them before E2E run is possible. All other pipeline stages have deployed workflows. |

</phase_requirements>

---

## Summary

Phase 10 is a live-system validation phase, but it has a prerequisite blocker: **the script generation n8n workflows were never built in v1.0 or v1.1**. The v1.0 Phase 3 (Script Generation) built only the dashboard UI and n8n stub JSON files documenting the expected backend contract. No actual `WF_SCRIPT_GENERATE`, `WF_SCRIPT_APPROVE`, `WF_SCRIPT_REJECT`, or `WF_SCRIPT_REFINE` workflow JSONs exist in the `workflows/` directory or on the n8n server.

This means Phase 10 splits into two sequential jobs: (1) build the missing script generation workflows, and (2) run the full E2E pipeline test with the US Credit Cards niche through all three gates.

The rest of the pipeline — niche research (WF_PROJECT_CREATE), topic generation (WF_TOPICS_GENERATE), topic actions (WF_TOPICS_ACTION), TTS (WF_TTS_AUDIO), images (WF_IMAGE_GENERATION), I2V/T2V (WF_I2V_GENERATION, WF_T2V_GENERATION), assembly (WF_CAPTIONS_ASSEMBLY), upload (WF_YOUTUBE_UPLOAD) — are all deployed and active. The 6 Phase 9 human-verification items (live Claude API call, idempotency guards, topics_exist confirm dialog, inline edit save, error handler path, retry button) also need live verification during the E2E run.

**Primary recommendation:** Build the 3 missing script workflows first (WF_SCRIPT_GENERATE, WF_SCRIPT_APPROVE, WF_SCRIPT_REJECT) in Wave 1, then run the full US Credit Cards E2E test in Wave 2. Fix bugs found during the run in Wave 3.

---

## Critical Gap: Script Generation Workflows Do Not Exist

### What Was Built in v1.0 Phase 3

v1.0 Phase 3 built only the **dashboard side** of script generation:
- `ScriptReview.jsx` page (full UI with two-column layout, gate 2 actions)
- `useScript.js`, `useScenes.js`, `useScriptMutations.js` hooks
- `ScorePanel.jsx`, `PassTracker.jsx`, `ScriptContent.jsx`, `SceneRow.jsx` components
- **n8n stub files** only: `dashboard/src/n8n-stubs/script-generate.json` (contract spec), `script-approve.json`, `script-reject.json`, `script-refine.json`, `script-regen-prompts.json`

The WEBHOOK_ENDPOINTS.md explicitly marks these as "Not created":
```
| Script Approve | /webhook/script/approve | POST | Not created | 3 | - |
| Script Reject  | /webhook/script/reject  | POST | Not created | 3 | - |
```
(script/generate is not listed at all)

### What the Dashboard Expects

The dashboard calls these webhook paths (from `dashboard/src/lib/api.js`):
```
POST /webhook/script/generate   { topic_id }
POST /webhook/script/approve    { topic_id }
POST /webhook/script/reject     { topic_id, feedback }
POST /webhook/script/refine     { topic_id, instructions }
POST /webhook/script/regen-prompts  { topic_id, scene_ids[] }
```

The full stub spec is in `dashboard/src/n8n-stubs/script-generate.json` — it documents the exact 7-step workflow logic including Supabase write patterns.

### Minimum Viable Script Workflows for E2E-01

E2E-01 requires at least one topic to complete script generation and pass Gate 2. The minimum set is:
- `WF_SCRIPT_GENERATE` — the 3-pass generation pipeline (largest workflow)
- `WF_SCRIPT_APPROVE` — simple: PATCH topics set script_review_status='approved', status='script_approved'
- `WF_SCRIPT_REJECT` — PATCH topics set script_review_status='rejected', feedback stored

`WF_SCRIPT_REFINE` and `WF_SCRIPT_REGEN_PROMPTS` are lower priority for E2E-01 (refine is used when rejecting with instructions; not required to reach Gate 3).

---

## What IS Built and Deployed

### Phase 9 Human-Verification Items (Pending Live Testing)

From `09-VERIFICATION.md`, these 6 items need live confirmation:

| # | Test | What to Verify |
|---|------|----------------|
| 1 | New Project research flow (live) | Claude API call fires, researching_* status transitions in ProjectCard, niche_profiles row created, 7 prompt_configs created |
| 2 | Research idempotency (live) | Re-trigger skips Claude web search, version increments in prompt_configs |
| 3 | topics_exist confirm dialog (live) | Dashboard shows ConfirmDialog count; force=true sends; new batch appears |
| 4 | Inline edit Save (live) | Both PATCH calls fire; card exits edit mode showing updated values |
| 5 | Error handler path (live) | Bad API key → research_failed badge + production_log entry |
| 6 | Retry Research button (live) | Clicking retry changes status back to researching |

### Deployed and Active Workflows (18 total on n8n)

| Workflow ID | Name | Function |
|-------------|------|----------|
| 8KW1hiRklamduMzO | WF_PROJECT_CREATE | Niche research + prompt generation (30 nodes, 600s timeout) |
| J5NTvfweZRiKJ9fG | WF_TOPICS_GENERATE | 25 topics + 25 avatars (23 nodes, idempotency guard) |
| BE1mpwuBigLsq26v | WF_TOPICS_ACTION | Approve/reject/refine/edit/edit_avatar (29 nodes) |
| SsdE4siQ8EbO76ye | WF_WEBHOOK_PRODUCTION | Production trigger/stop/resume/restart/retry |
| 4L2j3aU2WGnfcvvj | WF_TTS_AUDIO | Google Cloud TTS for all scenes (Chirp 3 HD) |
| ScP3yoaeuK7BwpUo | WF_IMAGE_GENERATION | Seedream 4.5 image generation |
| rHQa9gThXQleyStj | WF_I2V_GENERATION | Kling 2.1 I2V clips |
| KQDyQt5PV8uqCrXM | WF_T2V_GENERATION | Kling 2.1 T2V clips |
| Fhdy66BLRh7rAwTi | WF_CAPTIONS_ASSEMBLY | FFmpeg captions + final video assembly |
| IKu9SGDkS0pzZwoP | WF_YOUTUBE_UPLOAD | YouTube upload with metadata |
| uAlOrkJFjkkXrw6t | WF_SUPERVISOR | 30-min cron monitor |
| 2YuUQSGJPQs2n1Rz | WF_ANALYTICS_CRON | Daily analytics pull |

### Dashboard Deployed Pages

All 7 dashboard pages are built and deployed at `https://dashboard.operscale.cloud`:
- Projects Home (project creation, niche research trigger, retry research)
- Project Dashboard (pipeline status table)
- Niche Research (topic generation trigger, topics_exist dialog)
- Topic Review (approve/reject/refine/inline-edit)
- Script Review (Gate 2 — built but backend missing)
- Production Monitor (live DotGrid, activity log)
- Video Review (Gate 3 — built, backend exists for YouTube upload)
- Analytics, Settings

---

## Architecture Patterns for WF_SCRIPT_GENERATE

### The 7-Step Pipeline (from stub spec)

```
Step 1: Initialize
  - Read topic + avatar from topics table (select=*,avatars(*))
  - Read prompt_configs for project (is_active=true)
  - Validate 5 prompt types exist: script_pass1, script_pass2, script_pass3, evaluator, visual_director
  - PATCH topics: status='scripting', script_attempts=script_attempts+1
  - POST production_log: action='started'

Step 2: Pass 1 Foundation (5-7K words)
  - Inject 15 variables into script_pass1 prompt
  - Claude API call (max_tokens=8192, timeout=120s)
  - Parse response into scenes array
  - Score with evaluator prompt (7 dimensions)
  - PATCH topics: script_pass_scores.pass1 = { score, dimensions, feedback }
  - Retry if score < 6.0 AND attempts < 3

Step 3: Pass 2 Depth (8-10K words)
  - Inject variables + FULL Pass 1 output into script_pass2 prompt
  - Claude API call (max_tokens=12288, timeout=120s)
  - Score and retry same pattern

Step 4: Pass 3 Resolution (5-7K words)
  - Inject variables + summaries of Pass 1+2 into script_pass3 prompt
  - Claude API call (max_tokens=8192, timeout=120s)
  - Score and retry same pattern

Step 5: Combined Evaluation
  - Concatenate all 3 passes
  - Score combined with evaluator (max_tokens=4096)
  - PATCH topics: script_quality_score, script_evaluation
  - If combined < 7.0 AND attempts < 3: regenerate weakest pass
  - If combined < 7.0 AND attempts >= 3: set script_force_passed=true

Step 6: Visual Type Assignment
  - Claude with visual_director prompt + full scene list
  - Assign static_image (~75), i2v (~25), t2v (~72) per scene

Step 7: Store Results
  - Build script_json JSONB (scenes array)
  - Build script_metadata JSONB (video metadata)
  - PATCH topics: script_json, script_metadata, word_count, scene_count
  - DELETE existing scenes (if retry)
  - Bulk INSERT ~172 scene rows
  - PATCH topics: status='review'
  - POST production_log: action='completed'
```

### n8n Implementation Pattern for This Project

Based on Phases 8 and 9 patterns (HIGH confidence):

```javascript
// Claude API call pattern (from WF_PROJECT_CREATE, WF_TOPICS_GENERATE)
// HTTP Request node with:
{
  method: "POST",
  url: "https://api.anthropic.com/v1/messages",
  authentication: "genericCredentialType",
  genericAuthType: "httpHeaderAuth",
  credential: "Anthropic API Key",  // UUID: vlfOXwvIUlRYnr41
  body: {
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    system: "={{ $('Read Project').first().json.niche_system_prompt }}",
    messages: [{ role: "user", content: "={{ injected_prompt }}" }]
  },
  options: { timeout: 120000 },
  onError: "continueRegularOutput"
}

// Error check pattern (from all Phase 9 workflows)
// Code node after Claude call:
if ($input.first().json.error || $input.first().json.type === 'error') {
  return [{ json: { is_error: true, error: $input.first().json.error } }];
}
return [{ json: { is_error: false, ...$input.first().json } }];

// Supabase PATCH pattern
PATCH https://supabase.operscale.cloud/rest/v1/topics?id=eq.{{ topic_id }}
Headers: apikey: {{ $env.SUPABASE_ANON_KEY }}, Authorization: Bearer {{ $env.SUPABASE_ANON_KEY }}
Body: { "script_pass_scores": "={{ jsonb_expression }}" }
```

### Self-Chaining Pattern

After `WF_SCRIPT_APPROVE` completes (Gate 2), production must begin. The trigger mechanism:
```
WF_SCRIPT_APPROVE → PATCH topics status='script_approved'
                  → POST /webhook/production/trigger { topic_id }
```
The `WF_WEBHOOK_PRODUCTION` workflow is already built and deployed. Script approve just needs to call it.

---

## E2E Test Sequence and Expected Behaviors

### Stage 1: Project Creation (WF_PROJECT_CREATE)

**Test actions from dashboard:**
1. Click "New Project"
2. Enter: name="US Credit Cards Channel", niche="US Credit Cards"
3. Click "Start Research"

**Expected Supabase state after completion:**
```sql
SELECT status, niche_system_prompt IS NOT NULL, niche_expertise_profile IS NOT NULL
FROM projects WHERE niche = 'US Credit Cards';
-- Expected: status='ready_for_topics', both NOT NULL = true

SELECT count(*) FROM niche_profiles WHERE project_id = '...';
-- Expected: 1

SELECT count(*), prompt_type FROM prompt_configs
WHERE project_id = '...' AND is_active = true
GROUP BY prompt_type;
-- Expected: 7 rows — system_prompt, topic_generator, script_pass1, script_pass2, script_pass3, evaluator, visual_director
```

**n8n execution trace to check:**
- `Claude: Niche Research` node executed (not skipped)
- `IF Skip Research` took false branch (no existing niche_profile)
- `Log Completed` node executed
- Total execution time < 600s

### Stage 2: Topic Generation (WF_TOPICS_GENERATE)

**Test actions from dashboard:**
1. Navigate to project's Niche Research page
2. Click "Generate Topics"

**Expected Supabase state:**
```sql
SELECT count(*) FROM topics WHERE project_id = '...';
-- Expected: 25

SELECT count(*) FROM avatars WHERE project_id = '...';
-- Expected: 25

SELECT topic_number, seo_title, review_status FROM topics
WHERE project_id = '...' ORDER BY topic_number;
-- Expected: 1-25, all seo_title non-null, review_status='pending'
```

**Gate 1 actions to test (mix of all 3):**
- Approve 20 topics (bulk or individually)
- Reject 3 topics
- Refine 2 topics (submit refinement instruction, verify Claude re-generates, approve result)

### Stage 3: Script Generation (WF_SCRIPT_GENERATE) — NEW WORKFLOW

**Test actions from dashboard:**
1. Navigate to Topic Review
2. Click "View Script" on an approved topic (should show Generate CTA)
3. Click "Generate 3-Pass Script"
4. Monitor PassTracker for live progress via Supabase Realtime

**Expected n8n behavior:**
- Webhook `/webhook/script/generate` responds immediately (async start)
- WF_SCRIPT_GENERATE executes in background
- 3 sequential Claude calls (Pass 1, Pass 2, Pass 3)
- Each pass score written to `topics.script_pass_scores`
- Combined evaluation score written to `topics.script_quality_score`
- ~172 scene rows inserted into `scenes` table
- `topics.status` changes to `'review'` when complete

**PassTracker shows these topic column updates (via Realtime):**
```
topics.script_pass_scores.pass1 → score appears after Step 2
topics.script_pass_scores.pass2 → score appears after Step 3
topics.script_pass_scores.pass3 → score appears after Step 4
topics.script_quality_score     → combined score after Step 5
topics.status = 'review'        → unlocks Gate 2 approval
```

**Expected timing:** 8-15 minutes for 3 passes + scoring (3-4 Claude calls × 2-3 min each)

**Gate 2 actions to test:**
- Review ScorePanel (7 dimension bars, metadata, force-pass banner if applicable)
- Click "Approve Script"
- Verify: `topics.script_review_status = 'approved'`, `topics.status = 'script_approved'`

### Stage 4: Production Pipeline (TTS → Images → Video → Assembly)

**Trigger from dashboard:**
- After script approval, navigate to Production Monitor
- Click "Start Production" (triggers WF_WEBHOOK_PRODUCTION → WF_TTS_AUDIO)

**Expected TTS behavior (WF_TTS_AUDIO):**
- Processes all scenes with `audio_status='pending'` in order
- Google Cloud TTS (Chirp 3 HD) generates one MP3 per scene narration
- Uploads each to Google Drive
- Writes `audio_duration_ms`, `audio_file_drive_id`, `audio_status='uploaded'` per scene
- DotGrid in Production Monitor fills scene dots as each completes
- After all 172 scenes: fires `/webhook/production/images`, `/webhook/production/i2v`, `/webhook/production/t2v` (parallel)

**Production cost estimate for one topic:**
| Stage | Cost | Time |
|-------|------|------|
| Script generation (3-pass) | $0.45-$1.35 | 8-15 min |
| TTS audio (172 scenes) | ~$0.30 | 15-20 min |
| Images (100 Seedream 4.5) | ~$3.20 | 20-30 min |
| I2V clips (25 Kling) | ~$3.13 | 30-45 min |
| T2V clips (72 Kling) | ~$9.00 | 60-90 min |
| Assembly (FFmpeg) | Free | 5-10 min |
| **Total** | **~$16-17** | **~3-4 hours** |

**Gate 3 actions to test:**
- Video player loads (Google Drive URL)
- Thumbnail preview visible
- YouTube metadata (title, description, tags) pre-populated from script_metadata
- Click "Approve & Publish" → WF_YOUTUBE_UPLOAD fires

---

## Common Pitfalls and Known Risks

### Pitfall 1: n8n Execution Timeout on Script Generation
**What goes wrong:** Each Claude pass can take 60-90s. Three passes + two scoring calls + visual assignment = potentially 6 Claude calls × 90s = 540s. n8n EXECUTIONS_TIMEOUT=3600 (1 hour) is sufficient, but individual HTTP Request node timeout=120s may fail on large prompts.
**Prevention:** Set 180-200s timeout on Pass 2 HTTP Request node (it has max_tokens=12288, larger response). Pass 1 and 3 can stay at 120s.
**Verified:** n8n has NODE_OPTIONS=8192 heap, EXECUTIONS_TIMEOUT=3600 — no container-level timeout risk.

### Pitfall 2: script_pass_scores JSONB Patching in n8n
**What goes wrong:** n8n HTTP Request PATCH body for JSONB sub-field updates requires `jsonb_set()` syntax in PostgreSQL, but Supabase REST API does not support server-side functions in PATCH bodies. You cannot do `PATCH /topics?id=... SET script_pass_scores = jsonb_set(script_pass_scores, '{pass1}', '...')` via the REST API — that's SQL syntax, not PostgREST.
**Prevention:** Read the current `script_pass_scores` column first, merge the new pass data in a Code node (JavaScript object merge), then PATCH the full updated object. Pattern:
```javascript
// Code node: merge new pass score into existing
const current = $('Read Topic').first().json.script_pass_scores || {};
current.pass1 = { score: passScore, dimensions: dims, feedback: fb };
return [{ json: { merged_scores: JSON.stringify(current) } }];
// Then PATCH with: { "script_pass_scores": "={{ $json.merged_scores }}" }
```
**Confidence:** HIGH — verified from general Supabase REST API behavior. The jsonb_set issue is a known PostgREST limitation.

### Pitfall 3: Bulk Scene INSERT — 172 Rows
**What goes wrong:** Supabase REST API accepts bulk POST as a JSON array. At 172 scenes, each with 6-8 text fields, the payload is roughly 50-80KB. WF_TTS_AUDIO already reads all scenes, so the pattern works — but n8n's HTTP Request node may truncate large response bodies.
**Prevention:** Use `Prefer: return=minimal` header on the bulk INSERT — this tells Supabase to return only HTTP 201 with no body, avoiding response truncation. Already used in WF_TOPICS_GENERATE for topic inserts.
**Confidence:** HIGH — N8N_PAYLOAD_SIZE_MAX=256 (256MB) is set from Phase 7; no size risk.

### Pitfall 4: Pass 2 Context Size (Token Limit)
**What goes wrong:** Pass 2 receives full Pass 1 text (~6K words = ~8K tokens) as context plus its own prompt (~2K tokens) = ~10K token input. With max_tokens=12288 output, total = ~22K tokens. Claude Sonnet limit is 200K context — no issue. BUT if the injected prompt template itself is very large (lots of boilerplate), the combined input can become unwieldy.
**Prevention:** Pass 1 output to Pass 2 as `{ role: "assistant", content: "..." }` in the messages array (not injected into the user prompt string). This is the correct multi-turn pattern.
**Confidence:** MEDIUM — based on Anthropic API documentation patterns.

### Pitfall 5: Kie.ai Async Poll Loop
**What goes wrong:** WF_IMAGE_GENERATION, WF_I2V_GENERATION, WF_T2V_GENERATION all use async poll loops (POST creates task, poll `/v1/task/result` for completion). Kie.ai tasks can take 2-5 minutes each. n8n's Wait node or a loop with delay may time out if the poll interval is too short or too long.
**Prevention:** This is pre-existing behavior in deployed workflows — don't change it. During E2E test, simply wait. If image generation times out, check n8n execution logs and retry via dashboard.

### Pitfall 6: Supabase ANON_KEY vs SERVICE_ROLE_KEY
**What goes wrong:** `.env` shows `SUPABASE_ANON_KEY=your-anon-key-here` — these are placeholder values. The actual keys are in the n8n container's docker-compose.override.yml (set during Phase 8). The dashboard's `vite.config.js` (or `.env`) also needs the anon key for Supabase JS client.
**Prevention:** Before running E2E, verify:
1. n8n container has real `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` env vars
2. Dashboard's `dashboard/.env` has real keys for Supabase JS client
3. `dashboard/.env` exists (separate from root `.env`) — git status shows it as untracked

### Pitfall 7: Google Drive OAuth Token Expiry
**What goes wrong:** TTS audio uploads to Google Drive, images upload to Google Drive, and video assembly reads from Drive. If the Google Drive OAuth token expired (issued during Phase 8), all Drive operations will fail with 401.
**Prevention:** Before starting production pipeline, test the Drive credential via n8n Settings → Credentials → GoogleDriveAccount. If expired, re-authorize. OAuth tokens for Google expire after 1 hour unless refresh tokens are valid.

### Pitfall 8: Google Cloud TTS — Chirp 3 HD Not Available in All Regions
**What goes wrong:** Chirp 3 HD voices require `us-east5` region or specific authorized regions. The TTS credential uses `GCP_PROJECT=vision-gridai, GCP_REGION=us-east5`. If the service account doesn't have TTS API enabled or Chirp 3 HD access, all TTS scenes will fail.
**Prevention:** Before triggering production, do a manual test TTS call via curl or n8n test execution on WF_TTS_AUDIO with a single scene mock.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (React dashboard tests) |
| Config file | `dashboard/vite.config.js` (vitest section) |
| Quick run command | `cd dashboard && npm test -- --run` |
| Full suite command | `cd dashboard && npm test -- --run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| E2E-01 | Full pipeline create→research→topics→Gate1→script→Gate2→TTS→images→video→assembly→Gate3→publish | Live/manual | N/A — requires VPS, real API calls | N/A |
| E2E-01 (pre-check) | Dashboard pages render correctly for each stage | unit/smoke | `cd dashboard && npm test -- --run` | Yes |

**Note:** E2E-01 is inherently a manual live-system test. No automated test can substitute for running the actual pipeline against the production VPS with real API keys. The automated test suite verifies UI component behavior but not the live n8n → Supabase → external API chain.

### Sampling Rate
- **Before E2E run:** `cd dashboard && npm test -- --run` (verify 193+ tests still pass after any dashboard fixes)
- **After script workflow build:** Run dashboard tests again (no new tests needed for backend-only workflows)
- **Phase gate:** Manual live E2E run demonstrating all 4 success criteria met

### Wave 0 Gaps
None — existing test infrastructure covers all UI components. New n8n workflows (WF_SCRIPT_*) are backend-only and cannot be unit tested from the dashboard test suite.

---

## Recommended Plan Structure

### Wave 1 — Build Missing Script Workflows (prerequisite to E2E)

**Plan 10-01:** Build `WF_SCRIPT_GENERATE` (3-pass + scoring + scenes insert)
- ~30-35 nodes
- Self-chains: reads prompt_configs from Supabase, calls Claude 5 times, writes scenes
- Webhook path: `/webhook/script/generate` (new — no stub workflow to deactivate)
- Must import to n8n, activate
- Estimated complexity: HIGH (largest workflow in the project)

**Plan 10-02:** Build `WF_SCRIPT_APPROVE` and `WF_SCRIPT_REJECT`
- `WF_SCRIPT_APPROVE`: ~8 nodes — auth check, PATCH topics (script_review_status='approved', status='script_approved'), POST to production trigger, production_log entry
- `WF_SCRIPT_REJECT`: ~8 nodes — auth check, PATCH topics (script_review_status='rejected', feedback stored), production_log entry
- Both import to n8n and activate

### Wave 2 — E2E Live Test Run

**Plan 10-03:** Phase 9 human-verification + Stages 1-2 live test (project creation + topics + Gate 1)
- Trigger new "US Credit Cards" project from dashboard
- Verify all Phase 9 items (research flow, idempotency, topics_exist dialog, inline edit, error handler, retry button)
- Execute Gate 1: mix of approve/reject/refine on topics
- Document any bugs found

**Plan 10-04:** Stage 3 live test (script generation + Gate 2)
- Trigger script generation for one approved topic
- Monitor PassTracker progress
- Approve script at Gate 2
- Document any bugs found (timing, JSONB merge, token limits)

**Plan 10-05:** Stages 4-5 live test (production pipeline + Gate 3)
- Trigger production pipeline (TTS → images → video → assembly)
- Monitor Production Monitor DotGrid and activity log
- Verify video at Gate 3, YouTube upload

### Wave 3 — Bug Fixes (as needed)

**Plan 10-06:** Fix bugs found in Wave 2 live testing
- Scope unknown until Wave 2 runs — may be 0 plans (clean run) or several
- Common fix patterns: JSONB merge logic, timeout adjustments, Drive token refresh, visual type counts off

---

## Key n8n Workflow IDs (for reference in plans)

From STATE.md `[08-04]` decisions:
```
WF_WEBHOOK_STATUS=QRfPPKz2hWaRLF0F
WF_WEBHOOK_PROJECT_CREATE=tX99MoY83pEzfGja
WF_WEBHOOK_TOPICS_GENERATE=H5XjurL9qILe3KaG
WF_WEBHOOK_TOPICS_ACTION=cc0n4oQnEU8Fy5AY
WF_WEBHOOK_PRODUCTION=SsdE4siQ8EbO76ye
WF_WEBHOOK_PUBLISH=K2QLOdQUcvsCQDpy
WF_WEBHOOK_SETTINGS=TfcJuN8HkOdlEmTR
WF_TTS_AUDIO=4L2j3aU2WGnfcvvj
WF_IMAGE_GENERATION=ScP3yoaeuK7BwpUo
WF_I2V_GENERATION=rHQa9gThXQleyStj
WF_T2V_GENERATION=KQDyQt5PV8uqCrXM
WF_CAPTIONS_ASSEMBLY=Fhdy66BLRh7rAwTi
WF_YOUTUBE_UPLOAD=IKu9SGDkS0pzZwoP
WF_ANALYTICS_CRON=2YuUQSGJPQs2n1Rz
WF_SUPERVISOR=uAlOrkJFjkkXrw6t
WF_PROJECT_CREATE=8KW1hiRklamduMzO
WF_TOPICS_GENERATE=J5NTvfweZRiKJ9fG
WF_TOPICS_ACTION=BE1mpwuBigLsq26v
```

n8n API key (full JWT): in `/.env` as `N8N_API_KEY`
n8n API header: `X-N8N-API-KEY`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSONB sub-field update | jsonb_set() in PATCH body | Read-merge-write Code node pattern | PostgREST REST API does not support SQL functions in PATCH bodies |
| Streaming script progress | WebSocket or SSE from n8n | Supabase Realtime on topics table | Dashboard already subscribes; PassTracker already wired to script_pass_scores changes |
| n8n workflow import | Manual UI upload | n8n API POST /api/v1/workflows | Already used in Phase 8; repeatable via curl with N8N_API_KEY |
| Scene visual type distribution | Hardcoded per-type counts | Claude visual_director prompt assigns per semantic rules | Distribution varies per script content |
| Error handling pattern | Custom error nodes | `onError=continueRegularOutput` + Code node + IF branch | Established in Phase 9; all workflows use this pattern |

---

## Code Examples

### WF_SCRIPT_APPROVE — Minimal Implementation

```javascript
// Source: Phase 9 WF_TOPICS_ACTION pattern (verified in production)
// Node 1: Webhook Trigger (path: 'script/approve', responseMode: responseNode)
// Node 2: Check Auth (same IF pattern as all webhooks)
// Node 3: Respond Accepted (200)
// Node 4: PATCH topics — set script approved
{
  method: "PATCH",
  url: "={{ $env.SUPABASE_URL }}/rest/v1/topics?id=eq.{{ $json.body.topic_id }}",
  body: {
    "script_review_status": "approved",
    "status": "script_approved",
    "updated_at": "={{ new Date().toISOString() }}"
  }
}
// Node 5: POST to production trigger (self-chain to start TTS)
{
  method: "POST",
  url: "={{ $env.N8N_WEBHOOK_BASE }}/production/trigger",
  headers: { "Authorization": "Bearer {{ $env.DASHBOARD_API_TOKEN }}" },
  body: { "topic_id": "={{ $('Webhook Trigger').item.json.body.topic_id }}" }
}
// Node 6: POST production_log
// Node 7: Error handler (same pattern as WF_TOPICS_ACTION)
```

### JSONB Merge Pattern for script_pass_scores

```javascript
// Source: Required pattern for PostgREST compatibility (MEDIUM confidence)
// Code node: Merge Pass 1 score into existing script_pass_scores

const topic = $('Read Topic').first().json;
const existing = topic.script_pass_scores || {};
const passScore = $('Score Pass 1').first().json;

existing.pass1 = {
  score: passScore.combined_score,
  dimensions: passScore.dimensions,
  feedback: passScore.feedback,
  word_count: passScore.word_count,
  timestamp: new Date().toISOString()
};

return [{ json: { script_pass_scores: JSON.stringify(existing) } }];
// Then PATCH: { "script_pass_scores": "={{ $json.script_pass_scores }}" }
```

### Bulk Scene INSERT Pattern

```javascript
// Source: Phase 4 pattern (WF_TTS_AUDIO reads all scenes — verified deployed)
// POST /rest/v1/scenes with JSON array body
// Header: Prefer: return=minimal (avoid large response body)

const scenes = passedScenesArray.map((scene, index) => ({
  topic_id: topicId,
  project_id: projectId,
  scene_number: index + 1,
  scene_id: `scene_${String(index + 1).padStart(3, '0')}`,
  narration_text: scene.narration_text,
  image_prompt: scene.image_prompt,
  visual_type: scene.visual_type,  // assigned in Step 6
  emotional_beat: scene.emotional_beat,
  chapter: scene.chapter
}));
// POST body: JSON.stringify(scenes)
// Expected: HTTP 201 with empty body (Prefer: return=minimal)
```

---

## State of the Art

| Area | Current Reality | Impact on Phase 10 |
|------|----------------|-------------------|
| Script workflows | Only stubs exist (not deployed) | Must build before E2E run |
| Phase 9 live items | 6 items pending human verification | Test during Stage 1-2 of E2E |
| Production pipeline | All 12 production workflows deployed and active | Stage 4-5 should work as-is |
| Dashboard pages | All 7 pages built and deployed | Only script review page needs live backend to fully test |
| n8n execution timeout | 3600s container limit, 120-600s per-node limits | Script generation needs 180-200s timeout on Pass 2 |
| Supabase Realtime | Fully wired in dashboard for topics and scenes | PassTracker and DotGrid will auto-update during E2E |

---

## Open Questions

1. **Does the dashboard `.env` (dashboard/.env) have real Supabase keys?**
   - What we know: Root `.env` shows `SUPABASE_ANON_KEY=your-anon-key-here` (placeholder). `dashboard/.env` is untracked (git status shows `?? dashboard/.env`) — likely has real keys since dashboard is deployed and working.
   - What's unclear: Exact key values in `dashboard/.env`
   - Recommendation: Verify dashboard connects to Supabase before starting E2E. Open browser devtools on dashboard, check for network errors on Supabase calls.

2. **Are Google Drive and YouTube OAuth tokens still valid?**
   - What we know: Credentials created in Phase 8 (2026-03-09). OAuth access tokens expire in 1 hour; refresh tokens persist longer.
   - What's unclear: Whether n8n's credential store has valid refresh tokens that it will auto-renew.
   - Recommendation: Before triggering TTS (first production step that needs Drive), do a manual test in n8n: Execute WF_TTS_AUDIO with a single dummy topic_id and observe the Google Drive upload step.

3. **What is the actual Kie.ai daily quota for the E2E test?**
   - What we know: 100 images ($3.20) + 25 I2V clips ($3.13) + 72 T2V clips ($9.00) = ~$15.33 for media
   - What's unclear: Whether the Kie.ai account has sufficient balance/quota to complete a full video
   - Recommendation: Check Kie.ai account balance before triggering production. If low, top up or plan to stop after TTS + images only (skip video clips for initial E2E test).

4. **Will the `topics_exist` idempotency dialog show correctly for a project with 0 topics?**
   - What we know: Dialog shows when `result.topics_exist = true`. First run should return `topics_exist: false` and go straight to generation.
   - What's unclear: Whether WF_TOPICS_GENERATE's Idempotency Guard Code node correctly handles 0 existing topics vs. the first-run path.
   - Recommendation: Test topic generation on a fresh project (0 topics) first, then test again on same project to verify the force=true flow.

---

## Sources

### Primary (HIGH confidence)
- `.planning/phases/09-ai-agent-workflows/09-VERIFICATION.md` — Phase 9 human verification items, all 18 workflow IDs, credential UUIDs
- `.planning/STATE.md` — All key decisions from Phases 7-9, known patterns, workflow IDs
- `workflows/WEBHOOK_ENDPOINTS.md` — Script endpoints explicitly marked "Not created"
- `dashboard/src/n8n-stubs/script-generate.json` — Complete 7-step spec for WF_SCRIPT_GENERATE
- `workflows/WF_TOPICS_ACTION.json` (29 nodes) — Established n8n pattern for this project

### Secondary (MEDIUM confidence)
- Supabase PostgREST documentation behavior (JSONB update limitation) — known platform constraint, standard workaround
- Google OAuth token lifecycle — standard OAuth 2.0 behavior (access token 1hr, refresh persistent)

### Tertiary (LOW confidence)
- Kie.ai task timing estimates (2-5 min per clip) — based on similar services, not directly verified for this account
- Claude Pass 2 timing with max_tokens=12288 — estimated from general Claude API behavior

---

## Metadata

**Confidence breakdown:**
- Missing script workflows: HIGH — directly confirmed from `workflows/` directory inspection and WEBHOOK_ENDPOINTS.md
- Phase 9 human-verification items: HIGH — directly from 09-VERIFICATION.md
- WF_SCRIPT_GENERATE implementation pattern: HIGH (n8n patterns), MEDIUM (JSONB merge, multi-turn Claude)
- Production pipeline behavior: HIGH (18 workflows deployed, all active)
- External API pitfalls (Drive token, Kie.ai quota, TTS region): MEDIUM/LOW

**Research date:** 2026-03-09
**Valid until:** Stable — no fast-moving dependencies. Script workflow implementation patterns are based on established project conventions that won't change.
