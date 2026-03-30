# Complete Build: Remotion Hybrid + Missing Workflows + Dashboard

**Date:** 2026-03-29
**Status:** Design approved
**Goal:** Build everything missing so the platform is 100% code-complete before E2E testing.

---

## 1. Scope

5 workstreams covering all unbuilt code:

| # | Workstream | Deliverables | Dependencies |
|---|-----------|-------------|-------------|
| 1 | Missing n8n Workflows | 5 new workflow JSONs | Credential IDs (known) |
| 2 | Remotion Templates | 12 templates + 5 shared + render service | None |
| 3 | Dashboard Components | SceneClassificationReview + hook + ProductionMonitor mod | None |
| 4 | Workflow Modifications | WF_IMAGE_GENERATION split (Fal.ai + Remotion tracks) | WS1 + WS2 |
| 5 | DB + Config | Deploy migration 005, set style_dna | None |

## 2. Credential Reference (from live n8n)

**Stored Credentials:**

| Name | Type | ID |
|---|---|---|
| Supabase Service Role | httpHeaderAuth | `QsqqFXtnLakNfVKR` |
| Anthropic API Key | httpHeaderAuth | `vlfOXwvIUlRYnr41` |
| GoogleDriveAccount | googleDriveOAuth2Api | `z0gigNHVnhcGz2pD` |

**Environment Variables ($env):**
- `SUPABASE_URL` — Supabase REST base URL
- `SUPABASE_ANON_KEY` — Supabase anonymous key (for apikey header)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (for Authorization header)
- `DASHBOARD_API_TOKEN` — Bearer token for webhook auth validation
- `N8N_WEBHOOK_BASE` — Base URL for n8n webhooks
- `FAL_API_KEY` — Fal.ai API key (used as `Key $env.FAL_API_KEY` in Authorization header)

**HTTP Request patterns (from existing workflows):**

Supabase READ:
```
GET $env.SUPABASE_URL/rest/v1/{table}?{filters}
Headers:
  apikey: $env.SUPABASE_ANON_KEY
  Authorization: Bearer $env.SUPABASE_SERVICE_ROLE_KEY
Credentials: httpHeaderAuth (id: QsqqFXtnLakNfVKR)
```

Supabase WRITE:
```
PATCH $env.SUPABASE_URL/rest/v1/{table}?id=eq.{id}
Headers:
  apikey: $env.SUPABASE_ANON_KEY
  Authorization: Bearer $env.SUPABASE_SERVICE_ROLE_KEY
  Content-Type: application/json
  Prefer: return=representation
Credentials: httpHeaderAuth (id: QsqqFXtnLakNfVKR)
```

Anthropic API:
```
POST https://api.anthropic.com/v1/messages
Headers:
  x-api-key: (via credential)
  anthropic-version: 2023-06-01
  Content-Type: application/json
Credentials: httpHeaderAuth (id: vlfOXwvIUlRYnr41)
```

Google Drive Upload:
```
Credentials: googleDriveOAuth2Api (id: z0gigNHVnhcGz2pD)
```

Webhook validation:
```javascript
// Code node pattern
const authHeader = $input.first().json.headers?.authorization;
const expected = 'Bearer ' + $env.DASHBOARD_API_TOKEN;
if (authHeader !== expected) throw new Error('Unauthorized');
```

---

## 3. Workstream 1: Missing n8n Workflows

### 3.1 WF_SCENE_CLASSIFY

**Trigger:** Webhook POST `/webhook/classify-scenes` with `{ topic_id }`
**Purpose:** AI-classifies all scenes as fal_ai or remotion after Gate 2.

**Nodes (14):**
1. Webhook Trigger — path: `classify-scenes`, method: POST
2. Validate Request — Code node, check auth + topic_id
3. Respond to Webhook — 202 Accepted
4. Read Topic — HTTP GET topics?id=eq.{topic_id}
5. Read Project — HTTP GET projects?id=eq.{project_id} (for niche, style_dna)
6. Verify Gate 2 — Code node, check topic status = script_approved or script_review_status = approved
7. PATCH Topic Classifying — HTTP PATCH topics SET classification_status = 'classifying'
8. Read Scenes — HTTP GET scenes?topic_id=eq.{topic_id}&order=scene_number.asc
9. Batch & Classify — Code node: batch scenes into groups of 30, build classification prompt per batch, call Anthropic Haiku, parse JSON responses
10. Claude: Classify Batch — HTTP POST to Anthropic API (model: claude-haiku-4-5-20251001, temp: 0.2)
11. Update Scenes — Code node: loop through results, PATCH each scene with render_method, remotion_template, data_payload, classification_reasoning, classification_status
12. Enrich Remotion Data — Code node: for scenes with incomplete data_payload, call Anthropic with Data Payload Generation prompt
13. PATCH Topic Classified — HTTP PATCH topics SET classification_status = 'classified'
14. Log Complete — HTTP POST production_logs

**Error handling:** If JSON parse fails, retry with stricter prompt. If all retries fail, default batch to fal_ai.

### 3.2 WF_REMOTION_RENDER

**Trigger:** Called as sub-workflow by WF_IMAGE_GENERATION for Remotion scenes.
**Purpose:** Renders one scene via Remotion render service, uploads PNG to Drive.

**Nodes (8):**
1. Start — receives scene data (template_key, data_payload, color_mood, format, output_filename, topic_drive_folder_id)
2. Call Render Service — HTTP POST `http://localhost:3100/render` with template + data + mood + format
3. Check Render Error — IF node on response.success
4. Download Rendered PNG — HTTP GET `http://localhost:3100/files/{output_path}` (binary response)
5. Upload to Drive — Google Drive node, upload PNG to topic's images subfolder
6. PATCH Scene — HTTP PATCH scenes SET image_url, image_drive_id, image_status = 'uploaded'
7. Log Success — HTTP POST production_logs
8. Handle Error — Code node, PATCH scene image_status = 'failed'

### 3.3 WF_SOCIAL_POSTER

**Trigger:** Webhook POST `/webhook/social/post` with `{ short_id, platform, caption, hashtags }`
**Purpose:** Posts a short-form clip to TikTok, Instagram, or YouTube Shorts.

**Nodes (12):**
1. Webhook Trigger
2. Validate Request
3. Respond to Webhook
4. Read Short — HTTP GET shorts?id=eq.{short_id}
5. Read Render — Code node, get the platform-specific render URL from renders table
6. Switch Platform — Switch node on platform (tiktok/instagram/youtube_shorts)
7. Post to TikTok — HTTP POST TikTok Content API (video upload)
8. Post to Instagram — HTTP POST Instagram Graph API (Reels upload)
9. Post to YouTube Shorts — Reuse WF_YOUTUBE_UPLOAD pattern but with shorts metadata
10. Update Short Status — HTTP PATCH shorts SET {platform}_status = 'published', {platform}_post_id, {platform}_published_at
11. Log Posted — HTTP POST production_logs
12. Handle Error — PATCH status = 'failed'

**Note:** TikTok and Instagram API credentials don't exist yet. The workflow JSON will reference placeholder credential IDs that need to be created when those APIs are configured.

### 3.4 WF_SOCIAL_ANALYTICS

**Trigger:** Schedule (daily 7AM UTC) + manual webhook
**Purpose:** Pulls engagement metrics from all 3 social platforms daily.

**Nodes (15):**
1. Schedule Trigger — daily 7AM UTC
2. Manual Webhook — path: `social/analytics/refresh`
3. Get Published Shorts — HTTP GET shorts WHERE tiktok_status=eq.published OR instagram_status=eq.published OR youtube_shorts_status=eq.published
4. Split Batches — SplitInBatches, batch size 10
5. Get TikTok Stats — HTTP GET TikTok API for each tiktok_post_id
6. Get Instagram Stats — HTTP GET Instagram Graph API for each instagram_post_id
7. Get YouTube Shorts Stats — HTTP GET YouTube Data API for each youtube_shorts_video_id
8. Merge Stats — Code node, combine all platform stats
9. PATCH Shorts — HTTP PATCH shorts SET tiktok_views/likes/comments/shares, instagram_views/likes/comments, youtube_shorts_views/likes
10. Log Refresh — HTTP POST production_logs

### 3.5 WF_MASTER

**Trigger:** Webhook POST `/webhook/master/start` with `{ topic_id, start_from }`
**Purpose:** Orchestrates the full pipeline by triggering each workflow in sequence.

**Nodes (16):**
1. Webhook Trigger — path: `master/start`
2. Validate Request
3. Respond to Webhook — 202 Accepted
4. Read Topic Status — HTTP GET topics
5. Determine Start Stage — Code node, uses `start_from` param or auto-detects from topic status
6. Trigger Script Generate — HTTP POST to WF_SCRIPT_GENERATE webhook (if stage <= script)
7. Wait for Script — Wait node (webhook resume pattern) or poll topics.status
8. Trigger Classification — HTTP POST to WF_SCENE_CLASSIFY webhook
9. Wait for Classification Review — Poll topics.classification_status = 'reviewed'
10. Trigger Image Generation — HTTP POST to WF_IMAGE_GENERATION webhook (handles both tracks)
11. Trigger TTS — HTTP POST to WF_TTS_AUDIO webhook
12. Trigger Assembly — HTTP POST to WF_CAPTIONS_ASSEMBLY webhook
13. Wait for Assembly — Poll topics.assembly_status
14. Trigger Thumbnail + Metadata — HTTP POST to WF_THUMBNAIL and WF_PLATFORM_METADATA
15. Log Pipeline Complete — HTTP POST production_logs
16. Handle Error — PATCH topic status = 'failed', log error

**Note:** WF_MASTER is a convenience orchestrator. Each sub-workflow already self-chains. WF_MASTER adds the ability to restart from any stage and provides a single entry point.

---

## 4. Workstream 2: Remotion System

### 4.1 Shared Components (`dashboard/src/remotion/templates/shared/`)

**MoodTheme.js:**
- MOOD_THEMES constant: 7 color moods → `{ bg, text, accent, muted, gradient }`
- `getMoodTheme(colorMood)` function

**Typography.js:**
- Font presets for long-form (1920x1080) and short-form (1080x1920)
- Montserrat ExtraBold for values/numbers, Inter for labels
- Export: `VALUE_STYLE`, `LABEL_STYLE`, `SUBLABEL_STYLE`, `TITLE_STYLE`

**AnimatedNumber.js:**
- Renders a styled number. Static for still rendering.
- Props: `{ value, style, colorMood }`

**TrendArrow.js:**
- SVG arrow: up (green), down (red), neutral (gray)
- Props: `{ direction, size, color }`

**GlassCard.js:**
- Dark frosted glass card with mood-tinted background
- Props: `{ children, colorMood, padding, borderRadius }`

### 4.2 Template Components (12)

Each template:
- Accepts `{ data, colorMood, format, styleDna }` props
- Uses `getMoodTheme(colorMood)` for colors
- Renders at 1920x1080 (format='long') or 1080x1920 (format='short')
- Uses AbsoluteFill from remotion
- Is a pure React component (no hooks, no side effects)

Templates match the props_schema in migration 005 / remotion_templates table.

### 4.3 Render Service (`dashboard/src/remotion/render-service.js`)

Express server on port 3100:
- `POST /render` — renders scene PNG, saves to output_path
- `POST /preview` — renders to /tmp/previews/, returns URL
- `GET /health` — returns `{ status: 'ok', templates_loaded: 12 }`
- `GET /files/:path` — serves rendered PNGs (for n8n to download)

Uses `@remotion/renderer` `renderStill()` API for rendering.

---

## 5. Workstream 3: Dashboard Components

### 5.1 SceneClassificationReview.jsx

Location: `dashboard/src/components/production/SceneClassificationReview.jsx`

Sections:
1. Summary bar — total/fal_ai/remotion counts, cost estimate, savings
2. Filter tabs — All | Fal.ai | Remotion
3. Scene list — render_method badge, narration, reasoning, override dropdown
4. Preview modal — for Remotion scenes, shows rendered PNG
5. Data editor — form generated from props_schema
6. Action buttons — Re-classify All, Accept & Proceed

### 5.2 useSceneClassification.js

Hook providing:
- `scenes` — filtered scene list with classification data
- `stats` — { total, falAiCount, remotionCount }
- `classifyScenes(topicId)` — triggers WF_SCENE_CLASSIFY
- `overrideScene(sceneId, renderMethod, template?, dataPayload?)` — PATCH scene
- `acceptClassification(topicId)` — sets classification_status = 'reviewed'
- Realtime subscription on scenes table for live progress

### 5.3 ProductionMonitor Modification

Add classification step between "Script Approved" and "Generating Images":
- Label: "Scene Classification"
- Colors: green (reviewed), yellow (classified), blue-spinning (classifying), gray (pending)
- Shows Fal.ai/Remotion split inline

---

## 6. Workstream 4: WF_IMAGE_GENERATION Modification

Current: All scenes → Fal.ai
New: Split by render_method:
- Track A: `WHERE render_method = 'fal_ai'` → existing Fal.ai flow
- Track B: `WHERE render_method = 'remotion'` → call WF_REMOTION_RENDER sub-workflow

Pre-check: Refuse if `topics.classification_status != 'reviewed'`

---

## 7. Workstream 5: DB + Config

- Deploy migration 005 to VPS Supabase
- Set style_dna on US Credit Cards project (fetch from existing prompt_configs or generate)

---

## 8. Execution Strategy

Parallel agents:
- **Agent A:** WS1 — 5 workflow JSONs
- **Agent B:** WS2 — 17 Remotion components + render service
- **Agent C:** WS3 — 3 dashboard files

Sequential after parallel:
- **WS4:** Modify WF_IMAGE_GENERATION (needs WS1+WS2 complete)
- **WS5:** Deploy migration + config

---

## 9. Non-Goals (explicitly excluded)

- Deploying workflows to n8n (JSON files only — deploy is separate step)
- Installing Remotion on VPS (infra setup is separate)
- Setting up TikTok/Instagram API credentials (requires developer account registration)
- Running E2E tests (separate session after build)
- Modifying existing working workflows
