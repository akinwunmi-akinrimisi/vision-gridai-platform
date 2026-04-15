# Complete Build: Remotion + Missing Workflows + Dashboard — Implementation Plan

> **⚠️ HISTORICAL / SUPERSEDED (2026-04-15).** This plan was executed and then reversed by the Remotion + Kinetic Typography removal refactor on branch `remove-remotion-kinetic`. The Remotion hybrid rendering pipeline (WF_SCENE_CLASSIFY, WF_REMOTION_RENDER, 17 Remotion components, render service on :3100) has been permanently removed from the platform. The `render_method`, `classification_status`, `data_payload`, and `remotion_template` columns have been dropped from Supabase. The current pipeline is **AI Cinematic only** — every scene uses Fal.ai Seedream 4.0 + FFmpeg Ken Burns. See `memory/feedback_ai_cinematic_only.md` and `memory/project_remotion_kinetic_removal.md` for rationale. The WF_SOCIAL_POSTER, WF_SOCIAL_ANALYTICS, WF_MASTER router, and non-Remotion dashboard tasks in this plan may still be relevant. Keep this file as historical record; do not use it as an active build guide.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal (historical):** Build all unbuilt code (5 workflows, 17 Remotion components, render service, 3 dashboard files) so the platform is 100% code-complete.

**Architecture:** Parallel workstreams — n8n workflows, Remotion templates, and dashboard components are independent. Workflow modification (WF_IMAGE_GENERATION split) depends on the Remotion render service existing. All workflows use `$env` variables for secrets and stored credential IDs for auth.

**Tech Stack:** n8n workflow JSON, React (Remotion still rendering), Express.js (render service), Supabase REST, Anthropic API, Fal.ai, Google Drive OAuth2

**Credential IDs (all workflows MUST use these):**
- Supabase: `httpHeaderAuth` id `QsqqFXtnLakNfVKR` name `Supabase Service Role`
- Anthropic: `httpHeaderAuth` id `vlfOXwvIUlRYnr41` name `Anthropic API Key`
- Google Drive: `googleDriveOAuth2Api` id `z0gigNHVnhcGz2pD` name `GoogleDriveAccount`

**Env vars:** `$env.SUPABASE_URL`, `$env.SUPABASE_ANON_KEY`, `$env.SUPABASE_SERVICE_ROLE_KEY`, `$env.DASHBOARD_API_TOKEN`, `$env.N8N_WEBHOOK_BASE`, `$env.FAL_API_KEY`

**n8n Node Patterns (copy exactly from existing workflows):**

Supabase READ node:
```json
{
  "method": "GET",
  "url": "={{$env.SUPABASE_URL}}/rest/v1/{table}?{filters}",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendHeaders": true,
  "headerParameters": { "parameters": [{ "name": "apikey", "value": "={{$env.SUPABASE_ANON_KEY}}" }] },
  "options": {},
  "credentials": { "httpHeaderAuth": { "id": "QsqqFXtnLakNfVKR", "name": "Supabase Service Role" } }
}
```

Supabase PATCH node:
```json
{
  "method": "PATCH",
  "url": "={{$env.SUPABASE_URL}}/rest/v1/{table}?id=eq.{id}",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendHeaders": true,
  "headerParameters": { "parameters": [
    { "name": "apikey", "value": "={{$env.SUPABASE_ANON_KEY}}" },
    { "name": "Content-Type", "value": "application/json" },
    { "name": "Prefer", "value": "return=representation" }
  ]},
  "sendBody": true, "specifyBody": "json",
  "jsonBody": "={{ JSON.stringify({ field: value }) }}",
  "credentials": { "httpHeaderAuth": { "id": "QsqqFXtnLakNfVKR", "name": "Supabase Service Role" } }
}
```

Anthropic API call node:
```json
{
  "method": "POST",
  "url": "https://api.anthropic.com/v1/messages",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendHeaders": true,
  "headerParameters": { "parameters": [
    { "name": "anthropic-version", "value": "2023-06-01" },
    { "name": "content-type", "value": "application/json" }
  ]},
  "sendBody": true, "specifyBody": "json",
  "jsonBody": "={{ JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 4096, messages: [{role:'user', content: $json.prompt}] }) }}",
  "options": { "timeout": 120000 },
  "credentials": { "httpHeaderAuth": { "id": "vlfOXwvIUlRYnr41", "name": "Anthropic API Key" } },
  "onError": "continueRegularOutput"
}
```

Webhook auth check (IF node):
```json
{
  "conditions": {
    "conditions": [{
      "leftValue": "={{ $json.headers.authorization }}",
      "rightValue": "=Bearer {{ $env.DASHBOARD_API_TOKEN }}",
      "operator": { "type": "string", "operation": "equals" }
    }],
    "combinator": "and"
  }
}
```

---

## Task 1: WF_SCENE_CLASSIFY Workflow JSON

**Files:**
- Create: `workflows/WF_SCENE_CLASSIFY.json`

**Context:** Read `workflows/WF_SCRIPT_GENERATE.json` for the exact node structure pattern (webhook → validate → respond → read → process → patch → log). Read `VisionGridAI_Platform_Agent.md` Stage C+ section for the full AI Classification Prompt and Data Payload Generation Prompt — copy them exactly.

- [ ] **Step 1: Create the workflow JSON**

Create `workflows/WF_SCENE_CLASSIFY.json` with these nodes:

1. **Webhook Trigger** — path: `classify-scenes`, method: POST, responseMode: responseNode
2. **Check Auth** — IF node comparing `$json.headers.authorization` to `Bearer $env.DASHBOARD_API_TOKEN`
3. **Auth Failed** — respondToWebhook with 401
4. **Validate Request** — Code node extracting `topic_id` from body
5. **Respond 202** — respondToWebhook with `{ success: true, message: 'Classification started' }`
6. **Read Topic** — HTTP GET `$env.SUPABASE_URL/rest/v1/topics?id=eq.{topic_id}&select=*` with Supabase creds
7. **Read Project** — HTTP GET `$env.SUPABASE_URL/rest/v1/projects?id=eq.{project_id}&select=niche,niche_description,style_dna` with Supabase creds
8. **Read Scenes** — HTTP GET `$env.SUPABASE_URL/rest/v1/scenes?topic_id=eq.{topic_id}&order=scene_number.asc&select=scene_number,narration_text,image_prompt,composition_prefix,b_roll_insert` with Supabase creds
9. **PATCH Topic Classifying** — HTTP PATCH topics SET `classification_status = 'classifying'`
10. **Build Classification Batches** — Code node: split scenes into batches of 30, build the AI Classification Prompt from Agent.md (inject niche, topic title, style_dna, scenes array), return array of batch prompts
11. **Loop Batches** — SplitInBatches node, batch size 1 (each item is one batch prompt)
12. **Claude: Classify** — HTTP POST to Anthropic API with model `claude-haiku-4-5-20251001`, temperature 0.2, the classification prompt as user message. Use Anthropic credential. Timeout 120s. onError: continueRegularOutput
13. **Parse & Update Scenes** — Code node: parse JSON from Claude response (strip markdown fences if present). For each scene in the response, build a Supabase PATCH call to update render_method, remotion_template, data_payload, classification_reasoning, classification_status='classified'. Execute patches via fetch() to `$env.SUPABASE_URL`. If JSON parse fails, default all scenes in batch to fal_ai.
14. **Back to Loop** — connects back to SplitInBatches done output
15. **PATCH Topic Classified** — HTTP PATCH topics SET `classification_status = 'classified'`
16. **Log Complete** — HTTP POST production_logs with `{ stage: 'classification', action: 'completed' }`

Connection flow: 1→2→(true)4→5+6, 2→(false)3, 6→7→8→9→10→11→12→13→14→(done)15→16

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('workflows/WF_SCENE_CLASSIFY.json','utf8')); console.log('Valid JSON')"`

- [ ] **Step 3: Commit**

```bash
git add workflows/WF_SCENE_CLASSIFY.json
git commit -m "feat: WF_SCENE_CLASSIFY — AI scene classification workflow"
```

---

## Task 2: WF_REMOTION_RENDER Workflow JSON

**Files:**
- Create: `workflows/WF_REMOTION_RENDER.json`

**Context:** This is a sub-workflow called by WF_IMAGE_GENERATION for each Remotion scene. It calls the local render service, then uploads the PNG to Google Drive.

- [ ] **Step 1: Create the workflow JSON**

Create `workflows/WF_REMOTION_RENDER.json` with these nodes:

1. **Execute Workflow Trigger** — type: `n8n-nodes-base.executeWorkflowTrigger` (receives data from parent workflow)
2. **Prepare Render Request** — Code node: extract template_key, data_payload, color_mood, format, scene_id, topic_id, drive_folder_id from input
3. **Call Render Service** — HTTP POST to `http://localhost:3100/render` with `{ template_key, data_payload, color_mood, format, style_dna, output_path: '/tmp/renders/scene_{scene_number}.png' }`. No auth needed (local service). Timeout 30s.
4. **Check Render Success** — IF node on `$json.success === true`
5. **Download PNG** — HTTP GET `http://localhost:3100/files/scene_{scene_number}.png` with response format: file (binary)
6. **Upload to Drive** — Google Drive node: upload file to `{drive_folder_id}/images/` subfolder. Credential: GoogleDriveAccount (id: z0gigNHVnhcGz2pD)
7. **PATCH Scene Uploaded** — HTTP PATCH scenes SET image_url, image_drive_id, image_status='uploaded'
8. **Return Success** — Code node returning `{ success: true, scene_id, image_drive_id }`
9. **Handle Error** — Code node: PATCH scene image_status='failed', return error info

Connection flow: 1→2→3→4→(true)5→6→7→8, 4→(false)9

- [ ] **Step 2: Verify JSON valid, commit**

```bash
node -e "JSON.parse(require('fs').readFileSync('workflows/WF_REMOTION_RENDER.json','utf8')); console.log('Valid')"
git add workflows/WF_REMOTION_RENDER.json
git commit -m "feat: WF_REMOTION_RENDER — Remotion scene render sub-workflow"
```

---

## Task 3: WF_SOCIAL_POSTER Workflow JSON

**Files:**
- Create: `workflows/WF_SOCIAL_POSTER.json`

- [ ] **Step 1: Create the workflow JSON**

Nodes:
1. **Webhook Trigger** — path: `social/post`, method: POST, responseMode: responseNode
2. **Check Auth** — IF node, same auth pattern
3. **Auth Failed** — 401 response
4. **Validate Request** — Code: extract short_id, platform, caption, hashtags
5. **Respond 202**
6. **Read Short** — HTTP GET shorts?id=eq.{short_id}&select=*
7. **Read Render** — HTTP GET renders?topic_id=eq.{topic_id}&platform=eq.{platform}&select=file_url,drive_id
8. **Switch Platform** — Switch node on platform field: tiktok, instagram, youtube_shorts
9. **Post TikTok** — HTTP POST to TikTok Content API (placeholder URL: `https://open.tiktokapis.com/v2/post/publish/video/init/`). Body: caption, hashtags, video URL. Uses `$env.TIKTOK_ACCESS_TOKEN` header. Note: credential needs to be created when TikTok dev account is set up.
10. **Post Instagram** — HTTP POST to Instagram Graph API (`https://graph.instagram.com/v21.0/{ig_user_id}/media`). Body: video_url, caption. Uses `$env.INSTAGRAM_ACCESS_TOKEN`.
11. **Post YouTube Shorts** — HTTP POST to `$env.N8N_WEBHOOK_BASE/youtube/upload` triggering WF_YOUTUBE_UPLOAD with shorts metadata (title, description, tags, privacy=unlisted, is_short=true)
12. **Merge Results** — Merge node combining all 3 platform outputs
13. **Update Short Status** — Code node: PATCH shorts with {platform}_status='published', {platform}_post_id, {platform}_published_at=now()
14. **Log Posted** — HTTP POST production_logs
15. **Handle Error** — PATCH {platform}_status='failed', log error

- [ ] **Step 2: Verify and commit**

```bash
node -e "JSON.parse(require('fs').readFileSync('workflows/WF_SOCIAL_POSTER.json','utf8')); console.log('Valid')"
git add workflows/WF_SOCIAL_POSTER.json
git commit -m "feat: WF_SOCIAL_POSTER — multi-platform social posting workflow"
```

---

## Task 4: WF_SOCIAL_ANALYTICS Workflow JSON

**Files:**
- Create: `workflows/WF_SOCIAL_ANALYTICS.json`

- [ ] **Step 1: Create the workflow JSON**

Nodes:
1. **Schedule Trigger** — daily at 7:00 UTC
2. **Manual Webhook** — path: `social/analytics/refresh`, method: POST
3. **Merge Triggers** — Merge node
4. **Get Published Shorts** — HTTP GET `$env.SUPABASE_URL/rest/v1/shorts?or=(tiktok_status.eq.published,instagram_status.eq.published,youtube_shorts_status.eq.published)&select=id,tiktok_post_id,instagram_post_id,youtube_shorts_video_id,topic_id`
5. **Check Any Results** — IF node: `$json.length > 0`
6. **SplitInBatches** — batch size 5
7. **Fetch TikTok Stats** — Code node: for shorts with tiktok_post_id, call TikTok API to get views/likes/comments/shares. Uses `$env.TIKTOK_ACCESS_TOKEN`. If token not set, skip gracefully.
8. **Fetch Instagram Stats** — Code node: for shorts with instagram_post_id, call Instagram Insights API. Uses `$env.INSTAGRAM_ACCESS_TOKEN`. Skip if not set.
9. **Fetch YouTube Shorts Stats** — HTTP GET YouTube Data API `/youtube/v3/videos?part=statistics&id={video_id}`. Uses `$env.YOUTUBE_API_KEY`.
10. **Merge Stats** — Code node: combine all platform stats per short
11. **PATCH Shorts** — Code node: batch PATCH shorts table with updated view/like/comment/share counts per platform
12. **Back to Batch** — loops
13. **Log Refresh** — HTTP POST production_logs

- [ ] **Step 2: Verify and commit**

```bash
node -e "JSON.parse(require('fs').readFileSync('workflows/WF_SOCIAL_ANALYTICS.json','utf8')); console.log('Valid')"
git add workflows/WF_SOCIAL_ANALYTICS.json
git commit -m "feat: WF_SOCIAL_ANALYTICS — daily social media metrics pull"
```

---

## Task 5: WF_MASTER Orchestrator Workflow JSON

**Files:**
- Create: `workflows/WF_MASTER.json`

- [ ] **Step 1: Create the workflow JSON**

Nodes:
1. **Webhook Trigger** — path: `master/start`, method: POST, responseMode: responseNode
2. **Check Auth** — IF node
3. **Auth Failed** — 401
4. **Validate** — Code: extract topic_id, start_from (default: 'auto')
5. **Respond 202** — `{ success: true, message: 'Pipeline started' }`
6. **Read Topic** — HTTP GET topics with full select
7. **Determine Start Stage** — Code node: checks topic's current status fields (script_review_status, classification_status, audio_progress, images_progress, assembly_status) and start_from param. Returns `{ next_stage }` — one of: script, classify, images, tts, assembly, thumbnail, publish
8. **Switch Stage** — Switch node on next_stage
9. **Trigger Script** — HTTP POST `$env.N8N_WEBHOOK_BASE/script/generate` with `{ topic_id }` + auth header
10. **Trigger Classify** — HTTP POST `$env.N8N_WEBHOOK_BASE/classify-scenes` with `{ topic_id }` + auth header
11. **Trigger Images** — HTTP POST `$env.N8N_WEBHOOK_BASE/production/trigger` with `{ topic_id, action: 'generate_images' }` + auth header
12. **Trigger TTS** — HTTP POST `$env.N8N_WEBHOOK_BASE/production/trigger` with `{ topic_id, action: 'generate_audio' }` + auth header
13. **Trigger Assembly** — HTTP POST `$env.N8N_WEBHOOK_BASE/production/trigger` with `{ topic_id, action: 'assemble' }` + auth header
14. **Trigger Thumbnail** — HTTP POST `$env.N8N_WEBHOOK_BASE/thumbnail/generate` with `{ topic_id }` + auth header
15. **Log Pipeline Started** — HTTP POST production_logs
16. **Handle Error** — PATCH topic status='failed'

Note: WF_MASTER is a fire-and-forget launcher. Each sub-workflow self-chains to the next. WF_MASTER just starts at the right stage.

- [ ] **Step 2: Verify and commit**

```bash
node -e "JSON.parse(require('fs').readFileSync('workflows/WF_MASTER.json','utf8')); console.log('Valid')"
git add workflows/WF_MASTER.json
git commit -m "feat: WF_MASTER — pipeline orchestrator (start from any stage)"
```

---

## Task 6: Remotion Shared Components

**Files:**
- Create: `dashboard/src/remotion/templates/shared/MoodTheme.js`
- Create: `dashboard/src/remotion/templates/shared/Typography.js`
- Create: `dashboard/src/remotion/templates/shared/AnimatedNumber.js`
- Create: `dashboard/src/remotion/templates/shared/TrendArrow.js`
- Create: `dashboard/src/remotion/templates/shared/GlassCard.js`

**Context:** Read `VisionGridAI_Platform_Agent.md` Stage C+ "Remotion Template Architecture" for the MOOD_THEMES constant and color values. These shared components are used by all 12 templates.

- [ ] **Step 1: Create MoodTheme.js**

Export MOOD_THEMES object mapping 7 color_mood values to `{ bg, text, accent, muted, gradient }`. Export `getMoodTheme(colorMood)` function that returns the theme (defaults to cool_neutral if null). Use exact hex values from Agent.md:
- cold_desat: bg #0A0F1A, text #C8D6E5, accent #5B9BD5, muted #4A5568
- cool_neutral: bg #0F172A, text #E2E8F0, accent #60A5FA, muted #64748B
- dark_mono: bg #0A0A0A, text #A0AEC0, accent #90CDF4, muted #4A5568
- warm_sepia: bg #1A130D, text #F5E6D3, accent #D4A574, muted #8B7355
- warm_gold: bg #1A1508, text #FFF8E7, accent #F5A623, muted #B8860B
- full_natural: bg #0F1419, text #F7FAFC, accent #48BB78, muted #718096
- muted_selective: bg #0D1117, text #CBD5E0, accent #9F7AEA, muted #4C566A

- [ ] **Step 2: Create Typography.js**

Export font style constants:
- `VALUE_STYLE(format)` — Montserrat ExtraBold, 200px long / 140px short
- `LABEL_STYLE(format)` — Inter SemiBold, 36px long / 28px short
- `SUBLABEL_STYLE(format)` — Inter Regular, 24px long / 20px short
- `TITLE_STYLE(format)` — Montserrat Bold, 64px long / 48px short
Format param is 'long' (1920x1080) or 'short' (1080x1920).

- [ ] **Step 3: Create AnimatedNumber.js**

React component: `<AnimatedNumber value="$4,700" style={VALUE_STYLE('long')} color={theme.text} />`
For still rendering, just displays the styled text. No animation logic needed for PNG output.

- [ ] **Step 4: Create TrendArrow.js**

SVG component: `<TrendArrow direction="up|down|neutral" size={32} />`
Up = green (#48BB78), Down = red (#FC8181), Neutral = gray (#A0AEC0). Simple triangle/dash SVG.

- [ ] **Step 5: Create GlassCard.js**

Component: `<GlassCard colorMood="warm_gold" padding={40}>{children}</GlassCard>`
Dark card with 8% opacity tinted background from mood accent color, 1px border at 15% opacity, rounded corners (16px).

- [ ] **Step 6: Commit**

```bash
git add dashboard/src/remotion/templates/shared/
git commit -m "feat: Remotion shared components — MoodTheme, Typography, AnimatedNumber, TrendArrow, GlassCard"
```

---

## Task 7: Remotion Core Templates (6)

**Files:**
- Create: `dashboard/src/remotion/templates/StatCallout.jsx`
- Create: `dashboard/src/remotion/templates/ComparisonLayout.jsx`
- Create: `dashboard/src/remotion/templates/BarChart.jsx`
- Create: `dashboard/src/remotion/templates/ListBreakdown.jsx`
- Create: `dashboard/src/remotion/templates/ChapterTitle.jsx`
- Create: `dashboard/src/remotion/templates/QuoteCard.jsx`

**Context:** Each template: accepts `{ data, colorMood, format, styleDna }`, uses `getMoodTheme(colorMood)`, renders at 1920x1080 or 1080x1920. Uses `AbsoluteFill` from remotion. Matches props_schema from migration 005. Cinematic dark aesthetic — NOT PowerPoint.

- [ ] **Step 1: Build StatCallout.jsx** — Large number center-screen via AnimatedNumber, label below, sublabel, optional TrendArrow. Massive number (200px+). Subtle radial gradient glow behind number in accent color.

- [ ] **Step 2: Build ComparisonLayout.jsx** — Two GlassCard panels side-by-side (long) or stacked (short). Title, subtitle, features list per side. Winner gets accent border. "VS" divider.

- [ ] **Step 3: Build BarChart.jsx** — Horizontal bars (default). Label + value per bar. Highlighted bars = accent, others = muted. Grid lines at 25/50/75/100%. Responsive to bar count (5-8 bars).

- [ ] **Step 4: Build ListBreakdown.jsx** — Numbered/bulleted/icon list. Item: number/icon left, text+subtext right. Highlighted items get accent circle behind number.

- [ ] **Step 5: Build ChapterTitle.jsx** — Full-bleed. Large chapter number as oversized watermark (20% opacity). Title in Montserrat ExtraBold. Thin accent line separator. Subtitle below.

- [ ] **Step 6: Build QuoteCard.jsx** — Oversized quotation marks in accent (decorative, top-left). Quote text Inter italic. Divider line. Author name + role below.

- [ ] **Step 7: Commit**

```bash
git add dashboard/src/remotion/templates/{StatCallout,ComparisonLayout,BarChart,ListBreakdown,ChapterTitle,QuoteCard}.jsx
git commit -m "feat: 6 core Remotion templates — StatCallout, ComparisonLayout, BarChart, ListBreakdown, ChapterTitle, QuoteCard"
```

---

## Task 8: Remotion Specialized Templates (6)

**Files:**
- Create: `dashboard/src/remotion/templates/TimelineGraphic.jsx`
- Create: `dashboard/src/remotion/templates/DataTable.jsx`
- Create: `dashboard/src/remotion/templates/BeforeAfter.jsx`
- Create: `dashboard/src/remotion/templates/PercentageRing.jsx`
- Create: `dashboard/src/remotion/templates/MapVisual.jsx`
- Create: `dashboard/src/remotion/templates/MetricHighlight.jsx`

- [ ] **Step 1: Build TimelineGraphic.jsx** — Horizontal line (long) or vertical (short). Events as circles on line. Date above, label below. Highlighted = larger with accent glow. Connecting line gradient.

- [ ] **Step 2: Build DataTable.jsx** — Grid with alternating row shading. Header row in accent. Highlighted column/row gets accent border. Max 5 rows x 4 cols.

- [ ] **Step 3: Build BeforeAfter.jsx** — Split screen. Before = muted/red tint. After = accent/green tint. Arrow in center with transformation_label. Values are large.

- [ ] **Step 4: Build PercentageRing.jsx** — SVG circular progress ring. Percentage number center (160px+). Ring fill = accent, track = muted. Label below. Radial glow.

- [ ] **Step 5: Build MapVisual.jsx** — Simplified artistic SVG map. Highlighted regions = accent fill. Others = muted. Region labels with values. This is stylized, not geographic data viz.

- [ ] **Step 6: Build MetricHighlight.jsx** — Row or 2x2 grid of GlassCard KPI cards. Each: value large, label small, optional TrendArrow. Most important gets accent treatment.

- [ ] **Step 7: Commit**

```bash
git add dashboard/src/remotion/templates/{TimelineGraphic,DataTable,BeforeAfter,PercentageRing,MapVisual,MetricHighlight}.jsx
git commit -m "feat: 6 specialized Remotion templates — Timeline, DataTable, BeforeAfter, PercentageRing, Map, MetricHighlight"
```

---

## Task 9: Template Registry + Render Service

**Files:**
- Modify: `dashboard/src/remotion/templates/index.js` (replace placeholder)
- Modify: `dashboard/src/remotion/render-service.js` (replace placeholder)

- [ ] **Step 1: Update index.js with real imports**

Import all 12 template components and export TEMPLATE_REGISTRY map:
```js
import StatCallout from './StatCallout';
// ... all 12
export const TEMPLATE_REGISTRY = {
  stat_callout: StatCallout,
  comparison_layout: ComparisonLayout,
  // ... all 12
};
```

- [ ] **Step 2: Build render-service.js**

Express server on port 3100 with:
- `POST /render` — validates data_payload against template, calls `renderStill()` from `@remotion/renderer`, saves PNG to output_path, returns `{ success, file_path, render_time_ms }`
- `POST /preview` — same but saves to `/tmp/previews/`, returns `{ success, preview_url }`
- `GET /health` — returns `{ status: 'ok', templates_loaded: N }`
- `GET /files/:filename` — serves static files from render output directory
- Error handling: 400 for invalid template/schema, 500 for render failure

Uses `@remotion/renderer` `renderStill()` API:
```js
const { renderStill } = require('@remotion/renderer');
await renderStill({
  composition: templateKey,
  output: outputPath,
  inputProps: { data: dataPayload, colorMood, format, styleDna },
  width: format === 'long' ? 1920 : 1080,
  height: format === 'long' ? 1080 : 1920,
});
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/remotion/templates/index.js dashboard/src/remotion/render-service.js
git commit -m "feat: Remotion template registry + render service (port 3100)"
```

---

## Task 10: SceneClassificationReview Dashboard Component

**Files:**
- Create: `dashboard/src/components/production/SceneClassificationReview.jsx`
- Create: `dashboard/src/hooks/useSceneClassification.js`

**Context:** Read `design-system/vision-gridai/MASTER.md` for styling. Read `VisionGridAI_Platform_Agent.md` Stage C+ "Classification Review on Dashboard" for the wireframe. Follow existing component patterns in `dashboard/src/components/`.

- [ ] **Step 1: Create useSceneClassification.js**

Hook that:
- Takes `topicId` param
- Queries scenes with classification fields: `render_method, remotion_template, data_payload, classification_reasoning, classification_status`
- Provides `scenes`, `stats` (total/falAi/remotion counts), `isLoading`
- Provides mutations: `classifyScenes(topicId)` → POST to `/webhook/classify-scenes`, `overrideScene(sceneId, renderMethod, template, dataPayload)` → PATCH scene, `acceptClassification(topicId)` → PATCH topic classification_status='reviewed' then POST to image generation webhook
- Subscribes to Supabase Realtime on scenes table for live classification progress
- Uses existing `useRealtimeSubscription` hook pattern from `dashboard/src/hooks/`
- Uses React Query for data fetching (same pattern as other hooks)

- [ ] **Step 2: Create SceneClassificationReview.jsx**

Component accepting `{ topicId, projectId }` props. Sections:
1. Summary bar — KPICard components showing total/fal_ai/remotion counts + cost estimate + savings
2. Filter tabs — All | Fal.ai Only | Remotion Only (using tabs from ui/)
3. Scene list — table rows with: scene #, badge (blue FAL.AI / purple REMOTION), narration text (truncated), reasoning (gray), override dropdown
4. For Remotion scenes: template badge, Preview button, Edit Data button
5. Action buttons: "Re-classify All" (btn-secondary), "Accept & Proceed →" (btn-primary)
6. Preview modal (using Modal from ui/) — shows rendered PNG when Preview clicked

Follow design system: glass-card containers, gradient-border-visible on summary cards, animate-in on mount, btn-primary/btn-secondary/btn-ghost patterns.

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/hooks/useSceneClassification.js dashboard/src/components/production/SceneClassificationReview.jsx
git commit -m "feat: SceneClassificationReview — classification review UI + hook"
```

---

## Task 11: ProductionMonitor Classification Step

**Files:**
- Modify: `dashboard/src/pages/ProductionMonitor.jsx`
- Modify: `dashboard/src/components/dashboard/PipelineTable.jsx`

**Context:** Read current ProductionMonitor.jsx and PipelineTable.jsx to understand the existing pipeline step visualization.

- [ ] **Step 1: Add classification step to ProductionMonitor**

Add a new pipeline step between "Script Approved" and "Generating Images":
- Step label: "Scene Classification"
- Status logic: read `topics.classification_status` — pending (gray), classifying (blue pulse), classified (yellow), reviewed (green)
- Show inline: "108 Fal.ai / 64 Remotion" when classified
- Clicking navigates to SceneClassificationReview (render inline or as modal)

- [ ] **Step 2: Add classification to PipelineTable**

Add `classification_status` column or integrate into the existing status indicator:
- Show classification step in the pipeline progress visualization
- Display Fal.ai/Remotion split counts when available

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/pages/ProductionMonitor.jsx dashboard/src/components/dashboard/PipelineTable.jsx
git commit -m "feat: ProductionMonitor — classification step in pipeline visualization"
```

---

## Task 12: Modify WF_IMAGE_GENERATION for Dual-Track

**Files:**
- Modify: `workflows/WF_IMAGE_GENERATION.json`

**Context:** Read current WF_IMAGE_GENERATION.json. Add a pre-check for classification_status and split the scene processing by render_method.

- [ ] **Step 1: Add classification pre-check**

After reading the topic, add a Code node that checks `topics.classification_status === 'reviewed'`. If not, return error. This ensures the operator has reviewed classification before images are generated.

- [ ] **Step 2: Split scene query by render_method**

Change the scene query from:
`scenes?topic_id=eq.{topic_id}&image_status=eq.pending`
to two queries:
- Fal.ai track: `scenes?topic_id=eq.{topic_id}&image_status=eq.pending&render_method=eq.fal_ai`
- Remotion track: `scenes?topic_id=eq.{topic_id}&image_status=eq.pending&render_method=eq.remotion`

- [ ] **Step 3: Add Remotion track processing**

For Remotion scenes, add a loop that calls WF_REMOTION_RENDER as a sub-workflow (Execute Workflow node) for each scene, passing template_key, data_payload, color_mood, format, drive_folder_id.

The Fal.ai track remains unchanged — existing scene processing logic.

Both tracks write to the same scenes table. Downstream (Ken Burns) is unchanged.

- [ ] **Step 4: Verify and commit**

```bash
node -e "JSON.parse(require('fs').readFileSync('workflows/WF_IMAGE_GENERATION.json','utf8')); console.log('Valid')"
git add workflows/WF_IMAGE_GENERATION.json
git commit -m "feat: WF_IMAGE_GENERATION — dual-track Fal.ai + Remotion rendering"
```

---

## Task 13: Final Verification

- [ ] **Step 1: Verify all new workflow JSONs parse**

```bash
for f in workflows/WF_SCENE_CLASSIFY.json workflows/WF_REMOTION_RENDER.json workflows/WF_SOCIAL_POSTER.json workflows/WF_SOCIAL_ANALYTICS.json workflows/WF_MASTER.json; do
  node -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('OK: $f')"
done
```

- [ ] **Step 2: Verify Remotion template count**

```bash
ls dashboard/src/remotion/templates/*.jsx | wc -l
# Expected: 12
ls dashboard/src/remotion/templates/shared/*.js | wc -l
# Expected: 5
```

- [ ] **Step 3: Verify dashboard new files exist**

```bash
ls dashboard/src/components/production/SceneClassificationReview.jsx
ls dashboard/src/hooks/useSceneClassification.js
```

- [ ] **Step 4: Verify grep checks**

```bash
grep -c "render_method" workflows/WF_SCENE_CLASSIFY.json  # > 3
grep -c "remotion" workflows/WF_IMAGE_GENERATION.json     # > 0
grep -c "classification" dashboard/src/hooks/useSceneClassification.js  # > 5
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git status
git commit -m "feat: complete build — 5 workflows + 17 Remotion components + dashboard classification UI"
```
