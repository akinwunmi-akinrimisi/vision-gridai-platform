# Grand Master Prompts Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all per-project topic generation + script generation + evaluation prompts with the universal Grand Master Topic Generator v3.0 and Grand Master Script Generator v1.0, wiring the full research analysis payload through the pipeline end-to-end.

**Architecture:** Two universal prompts stored in a new `system_prompts` Supabase table replace 5 per-project prompts in `prompt_configs`. WF_TOPICS_GENERATE sends the full analysis payload to v3.0 which returns JSON. WF_SCRIPT_GENERATE becomes an orchestrator calling 3 new sub-workflows (one per pass) with retry logic per v1.0 §8. A metadata extraction step between Pass 2 and Pass 3 tracks metaphors/characters per v1.0 §9. Dashboard updated for new topic fields, new score dimensions, and retry state.

**Tech Stack:** Supabase (PostgreSQL), n8n workflows (HTTP Request + Code nodes), React dashboard (Vite + Tailwind), Anthropic Claude API (claude-sonnet-4-20250514)

**Key Reference Files:**
- `Grand_Master_Prompt_Topic_Generator_v3.md` — Topic generation master prompt
- `Grand_Master_Prompt_Script_Generator_v1.md` — Script generation master prompt
- `dashboard/src/components/script/ScorePanel.jsx` — Score dimension display
- `dashboard/src/components/script/PassTracker.jsx` — Pass progress tracker
- `dashboard/src/components/topics/TopicCard.jsx` — Topic card with avatar display
- `dashboard/src/hooks/useTopics.js` — Topic data hooks
- `dashboard/src/pages/ScriptReview.jsx` — Script review page

**Critical Rules:**
- NEVER use MCP `updateNode` with `parameters.jsCode` — it strips `mode` from Code nodes. Use raw n8n REST API via SSH for Code node updates.
- All Claude calls use `claude-sonnet-4-20250514` with `max_tokens: 64000` max.
- All scenes are `visual_type: 'static_image'` — no i2v/t2v.
- n8n Code nodes (typeVersion 2) require `mode: 'runOnceForAllItems'`.

---

## File Map

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/007_grand_master_integration.sql` | DB migration: `system_prompts` table, new topic columns, playlist expansion |
| `workflows/WF_SCRIPT_PASS1.json` | Sub-workflow: Pass 1 generate + evaluate + retry loop |
| `workflows/WF_SCRIPT_PASS2.json` | Sub-workflow: Pass 2 generate + evaluate + retry loop |
| `workflows/WF_SCRIPT_PASS3.json` | Sub-workflow: Pass 3 with metadata extraction + generate + evaluate + retry loop |

### Modified Files
| File | Changes |
|------|---------|
| WF_TOPICS_GENERATE (`J5NTvfweZRiKJ9fG`) | `Read Prompt Config` → reads from `system_prompts`. `Build Prompt` → constructs analysis payload. `Parse Topics` → maps v3.0 output columns. `Map Avatars` → extracts new avatar structure. |
| WF_SCRIPT_GENERATE (`DzugaN9GtVpTznvs`) | Becomes orchestrator: calls 3 sub-workflows sequentially instead of inline pass chain. Removes 30+ nodes, keeps webhook + read + scene segmentation. |
| WF_PROJECT_CREATE (`8KW1hiRklamduMzO`) | `Fetch Analysis Context` → stores full analysis. `Build Prompt Body` → generates only 2 prompts (visual_director + scene_segmenter). |
| `dashboard/src/components/script/ScorePanel.jsx` | New 7 dimensions: word_count_compliance, citation_density, narrative_structure, actionable_specificity, retention_engineering, format_compliance, anti_pattern_compliance |
| `dashboard/src/components/script/PassTracker.jsx` | Add retry attempt display per pass |
| `dashboard/src/components/topics/TopicCard.jsx` | Display new topic fields: core_domain_framework, content_angle_blue_ocean, practical_takeaways, psychographics, key_emotional_drivers |
| `dashboard/src/hooks/useTopics.js` | Fetch new topic columns from Supabase |
| `dashboard/src/pages/ScriptReview.jsx` | Connect to new score dimensions |

### Deleted (after integration confirmed working)
| Item | Why |
|------|-----|
| Per-project `prompt_configs` rows for `topic_generator`, `script_pass1`, `script_pass2`, `script_pass3`, `evaluator` | Replaced by `system_prompts` |
| WF_SCRIPT_GENERATE nodes: `Build Pass 1 Prompt`, `Claude: Pass 1 Foundation`, `Check Pass 1 Error`, `IF Pass 1 Error`, `Build Pass 1 Eval Prompt`, `Claude: Eval Pass 1`, `Merge Pass 1 Scores`, `PATCH Pass 1 Scores`, `Log Pass 1 Complete`, and equivalent for Pass 2, Pass 3, Combined Eval (30+ nodes) | Replaced by 3 sub-workflows |
| Betrayal project's 25 topics + avatars + script data | Regenerated from scratch with new prompts |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/007_grand_master_integration.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- ================================================================
-- Migration 007: Grand Master Prompts Integration
-- ================================================================

-- 1. system_prompts table (universal prompts, not per-project)
CREATE TABLE IF NOT EXISTS system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_type TEXT NOT NULL UNIQUE,
  prompt_text TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: open for dashboard (anon key)
ALTER TABLE system_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_prompts_open" ON system_prompts FOR ALL USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE system_prompts;

-- 2. New topic columns (from v3.0 §5.2 output)
ALTER TABLE topics ADD COLUMN IF NOT EXISTS core_domain_framework TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS primary_problem_trigger TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS target_audience_segment TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS psychographics TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS key_emotional_drivers TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS video_style_structure TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS content_angle_blue_ocean TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS viewer_search_intent TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS practical_takeaways TEXT;

-- 3. Expand playlists from 3 to 5
ALTER TABLE projects ADD COLUMN IF NOT EXISTS playlist4_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS playlist4_theme TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS playlist5_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS playlist5_theme TEXT;

-- 4. Script metadata columns for retry tracking (v1.0 §10)
ALTER TABLE topics ADD COLUMN IF NOT EXISTS script_metadata_extended JSONB;
-- Stores: { metaphors_used, case_study_character, shorts_extractable_moments,
--           total_api_calls, manual_review_flag, pass_attempts: {pass1: n, pass2: n, pass3: n} }

-- 5. Add psychographics + key_emotional_drivers to avatars (richer avatar data from v3.0)
ALTER TABLE avatars ADD COLUMN IF NOT EXISTS psychographics TEXT;
ALTER TABLE avatars ADD COLUMN IF NOT EXISTS key_emotional_drivers TEXT;
ALTER TABLE avatars ADD COLUMN IF NOT EXISTS target_audience_segment TEXT;
ALTER TABLE avatars ADD COLUMN IF NOT EXISTS viewer_search_intent TEXT;
```

- [ ] **Step 2: Apply migration to live Supabase**

Run via SSH:
```bash
ssh -i ~/.ssh/vps_gridai root@srv1297445.hstgr.cloud \
  'cat > /tmp/007.sql << '\''EOSQL'\''
[paste migration SQL above]
EOSQL
docker cp /tmp/007.sql supabase-db-1:/tmp/007.sql
docker exec supabase-db-1 psql -U postgres -f /tmp/007.sql'
```

Expected: All CREATE/ALTER statements succeed. `system_prompts` table exists with RLS.

- [ ] **Step 3: Seed the Grand Master prompts into system_prompts**

The Topic Generator v3.0 prompt needs a JSON output instruction appended (per user decision). The full prompt text comes from `Grand_Master_Prompt_Topic_Generator_v3.md` with this addition at the end of §9:

```
IMPORTANT: Return your output as a valid JSON object with this structure:
{
  "playlists": [
    {
      "playlist_title": "...",
      "playlist_theme": "...",
      "topics": [
        {
          "topic_number": 1,
          "subtopic": "The YouTube title...",
          "core_domain_framework": "...",
          "primary_problem_trigger": "...",
          "target_audience_segment": "...",
          "audience_avatar": "2-3 sentence character sketch...",
          "psychographics": "...",
          "key_emotional_drivers": "emotion1, emotion2, emotion3...",
          "video_style_structure": "...",
          "content_angle_blue_ocean": "...",
          "viewer_search_intent": "...",
          "practical_takeaways": "takeaway1; takeaway2; takeaway3..."
        }
      ]
    }
  ]
}
No markdown. No commentary. Valid JSON only.
```

Insert both prompts:
```sql
INSERT INTO system_prompts (prompt_type, prompt_text, description) VALUES
('topic_generator_master', '[FULL v3.0 text + JSON output instruction]', 'Grand Master Topic Generator v3.0 — niche-agnostic, analysis-driven'),
('script_system_prompt', '[FULL v1.0 §3 system prompt text]', 'Grand Master Script Generator v1.0 — system prompt for all 3 passes'),
('script_pass1', '[FULL v1.0 §4 prompt template]', 'Grand Master Script v1.0 — Pass 1: Foundation'),
('script_pass2', '[FULL v1.0 §5 prompt template]', 'Grand Master Script v1.0 — Pass 2: Depth'),
('script_pass3', '[FULL v1.0 §6 prompt template]', 'Grand Master Script v1.0 — Pass 3: Resolution'),
('script_evaluator', '[FULL v1.0 §7 evaluator prompt template]', 'Grand Master Script v1.0 — Quality Evaluator'),
('script_retry_template', '[FULL v1.0 §8.2 retry injection template]', 'Grand Master Script v1.0 — Retry injection'),
('script_metadata_extractor', '[FULL v1.0 §9.3 summary extraction prompt]', 'Grand Master Script v1.0 — Pass metadata extraction');
```

Note: The actual prompt text values are the FULL content from the Grand Master documents. Each prompt_text is the raw text block from the corresponding section. No truncation. No summarization.

- [ ] **Step 4: Verify seeded data**

```bash
curl -s "https://supabase.operscale.cloud/rest/v1/system_prompts?select=prompt_type,is_active" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Expected: 8 rows, all active.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/007_grand_master_integration.sql
git commit -m "feat: migration 007 — system_prompts table + new topic/avatar columns + playlist expansion"
```

---

## Task 2: Update WF_PROJECT_CREATE — Store Full Analysis + Reduce Prompt Generation

**Workflow:** `8KW1hiRklamduMzO`

**Nodes to modify:**
- `Fetch Analysis Context` — store FULL analysis object (not 10-field subset)
- `Build Prompt Body` — generate only `visual_director` + `scene_segmenter` (2 prompts, not 7)
- `Parse Prompts + TOPC-02 Check` — expect 2 prompts, not 7

- [ ] **Step 1: Update `Fetch Analysis Context` to store full analysis**

The current code cherry-picks 10 fields. Replace with storing the complete `analysis` object from each `yt_video_analyses` row:

```javascript
// Fetch competitive analysis data if reference_analyses provided
const data = $input.first().json;
const analysisIds = data.reference_analyses || $('Extract Project ID').first().json.reference_analyses || [];
let analysisContext = '';
const fullAnalyses = [];

if (analysisIds.length > 0) {
  const SB = $env.SUPABASE_URL;
  const SRK = $env.SUPABASE_SERVICE_ROLE_KEY;

  for (const aid of analysisIds.slice(0, 5)) {
    try {
      const resp = await fetch(SB + '/rest/v1/yt_video_analyses?id=eq.' + aid + '&select=video_title,channel_name,niche_category,views,likes,comments,duration_seconds,analysis', {
        headers: { 'apikey': SRK, 'Authorization': 'Bearer ' + SRK }
      });
      const rows = await resp.json();
      const a = rows?.[0];
      if (!a?.analysis) continue;

      // Store FULL analysis + metadata for the project row
      fullAnalyses.push({
        video_title: a.video_title,
        channel_name: a.channel_name,
        niche_category: a.niche_category,
        views: a.views,
        likes: a.likes,
        comments: a.comments,
        duration_seconds: a.duration_seconds,
        ...a.analysis  // spread ALL analysis fields: strengths, weaknesses, content_quality, script_structure, engagement_analysis, comment_insights, blue_ocean_analysis, ten_x_strategy, opportunity_scorecard, etc.
      });

      // Build text summary for niche research prompt (backwards compat)
      const an = a.analysis;
      const sections = [];
      sections.push('Reference Video: "' + (a.video_title || '') + '" (' + (a.views || 0).toLocaleString() + ' views)');
      if (an.one_line_summary) sections.push('Summary: ' + an.one_line_summary);
      if (an.weaknesses?.length) sections.push('Weaknesses: ' + an.weaknesses.join('; '));
      if (an.ten_x_strategy?.recommended_angle) sections.push('Angle: ' + an.ten_x_strategy.recommended_angle);
      analysisContext += '\n\n--- ANALYSIS ---\n' + sections.join('\n');
    } catch (e) { /* skip */ }
  }

  // Persist FULL analysis to project row
  if (fullAnalyses.length > 0) {
    const projectId = data.project_id || $('Extract Project ID').first().json.project_id;
    try {
      await fetch(SB + '/rest/v1/projects?id=eq.' + projectId, {
        method: 'PATCH',
        headers: {
          'apikey': SRK, 'Authorization': 'Bearer ' + SRK,
          'Content-Type': 'application/json', 'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ competitive_analysis: { analyses: fullAnalyses } })
      });
    } catch (e) { /* non-fatal */ }
  }
}

const enrichedDescription = (data.description || '') + analysisContext;
return [{ json: { ...data, description: enrichedDescription, analysis_context: analysisContext, has_analysis: analysisContext.length > 0 } }];
```

- [ ] **Step 2: Update `Build Prompt Body` to generate only 2 prompts**

Replace the prompt that asks Claude to generate 7 prompt templates. Now it generates only `visual_director` and `scene_segmenter`:

```javascript
const d = $json;
const niche = d.niche || '';
const ep = d.expertise_profile || '';
const sp = d.system_prompt || '';

const prompt = 'You are generating dynamic prompt templates for an AI video production platform. The niche is "' + niche + '".\n\nNiche expertise profile: ' + ep + '\nNiche system prompt (abbreviated): ' + sp.substring(0, 500) + '\n\nGenerate 2 prompt templates as JSON. Each prompt must use {{variable}} placeholders.\n\nThe 2 prompts are:\n\n1. visual_director - Assigns visual composition and image prompts to scenes. ALL scenes are static_image (no i2v/t2v). Focus on composition, lighting, mood, and style. Keep concise.\n\n2. scene_segmenter - Splits script into ~170 scenes with narration, image_prompt, visual_type (always "static_image"), emotional_beat, chapter. Keep concise.\n\nReturn ONLY valid JSON (no markdown) as an array:\n[{ "prompt_type": "visual_director", "prompt_text": "..." }, { "prompt_type": "scene_segmenter", "prompt_text": "..." }]\n\nConcise prompts only. Under 400 words each.';

const body = { model: 'claude-sonnet-4-20250514', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] };

return [{ json: { ...d, anthropicBody: JSON.stringify(body) } }];
```

- [ ] **Step 3: Update `Parse Prompts + TOPC-02 Check` to expect 2 prompts**

Modify the parsing code to handle 2 prompts instead of 7. Remove the check for `topic_generator`, `script_pass1/2/3`, `evaluator`.

- [ ] **Step 4: Fix Code node modes after updates**

After each MCP update to a Code node, immediately send a follow-up `updateNode` with `parameters.mode: 'runOnceForAllItems'` to restore the mode that MCP strips.

- [ ] **Step 5: Verify by creating a test project**

Trigger WF_PROJECT_CREATE with a test niche. Verify:
- `competitive_analysis` on project has full analysis objects (all Layer 2 fields)
- Only 2 prompt_configs rows created (visual_director, scene_segmenter)
- No topic_generator/script_pass1/2/3/evaluator rows in prompt_configs

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: WF_PROJECT_CREATE stores full analysis + generates only 2 prompts"
```

---

## Task 3: Update WF_TOPICS_GENERATE — Use Grand Master v3.0

**Workflow:** `J5NTvfweZRiKJ9fG`

**Nodes to modify:**
- `Read Prompt Config` — read from `system_prompts` instead of `prompt_configs`
- `Build Prompt` — construct full analysis payload per v3.0 §2
- `Build Claude Body` — add system message, increase max_tokens
- `Parse Topics` — map v3.0 JSON output to DB columns
- `Map Avatars` — extract richer avatar data
- `INSERT Topics` — include new columns
- `Status → Topics Pending` — update playlist names on project

- [ ] **Step 1: Update `Read Prompt Config` to read from system_prompts**

Change the HTTP Request URL:
```
FROM: ={{$env.SUPABASE_URL}}/rest/v1/prompt_configs?project_id=eq.{{$json.project_id}}&prompt_type=eq.topic_generator&is_active=eq.true&select=prompt_text
TO:   ={{$env.SUPABASE_URL}}/rest/v1/system_prompts?prompt_type=eq.topic_generator_master&is_active=eq.true&select=prompt_text
```

- [ ] **Step 2: Rewrite `Build Prompt` to construct analysis payload**

The Grand Master v3.0 expects the full Research Analysis Payload as input. This node reads `project.competitive_analysis` (which now has full analysis data from Task 2) and constructs the payload:

```javascript
const project = $('Read Project').first().json[0] || $('Read Project').first().json;
const masterPrompt = $('Read Prompt Config').first().json[0]?.prompt_text || $('Read Prompt Config').first().json?.prompt_text;
const idempotency = $('Idempotency Guard').first().json;
const project_id = idempotency.project_id;
const topicsNeeded = idempotency.topicsNeeded || 25;
const existingTitles = idempotency.existingTitles || [];

// Build the Research Analysis Payload from competitive_analysis
const ca = project.competitive_analysis || {};
const analyses = ca.analyses || [];

let analysisPayload = '';
if (analyses.length > 0) {
  // Use the first (primary) analysis as the main payload
  // Include all analyses as additional context
  analysisPayload = JSON.stringify({
    primary_analysis: analyses[0],
    additional_analyses: analyses.slice(1),
    project_niche: project.niche,
    project_description: project.niche_description
  }, null, 2);
}

// Construct the full prompt: master prompt + analysis payload
let prompt = masterPrompt || '';

// Inject the analysis payload as the input v3.0 expects
prompt += '\n\n=== RESEARCH ANALYSIS PAYLOAD ===\n' + analysisPayload;

// Dedup context
if (existingTitles.length > 0) {
  prompt += '\n\nEXISTING TOPICS — avoid overlap:\n' + JSON.stringify(existingTitles);
}

return [{ json: { project_id, niche: project.niche, prompt } }];
```

- [ ] **Step 3: Update `Build Claude Body` — add system message**

```javascript
const project = $('Read Project').first().json[0] || $('Read Project').first().json;
const buildPrompt = $('Build Prompt').first().json;

// v3.0 §1 role assignment as system prompt
const systemPrompt = 'You are a Senior Content Strategist and Niche Domain Researcher operating as the topic generation engine inside a YouTube content pipeline. Your expertise: blue-ocean market strategy, deep niche authority positioning, YouTube algorithm mechanics, high-converting copywriting, and audience psychographic profiling. Your mandate: consume the research analysis, extract every exploitable signal, and engineer 25 video topics that occupy uncontested market space within the identified niche.';

const body = {
  model: 'claude-sonnet-4-20250514',
  max_tokens: 64000,
  system: systemPrompt,
  messages: [{ role: 'user', content: buildPrompt.prompt }]
};

return [{ json: { anthropicBody: JSON.stringify(body) } }];
```

- [ ] **Step 4: Rewrite `Parse Topics` to map v3.0 JSON output**

```javascript
const response = $input.first().json;
if (response.error) throw new Error('Anthropic error: ' + (response.error.message || JSON.stringify(response.error)));

const text = (response.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
let jsonText = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
const s = jsonText.indexOf('{'), e = jsonText.lastIndexOf('}');
if (s === -1 || e === -1) throw new Error('No JSON object in response');
const parsed = JSON.parse(jsonText.substring(s, e + 1));

const project_id = $('Validate').first().json.project_id;
const startTopicNumber = $('Idempotency Guard').first().json.startTopicNumber || 1;

const playlists = parsed.playlists || [];
const topicRows = [];
const avatarData = [];
const playlistMeta = []; // For updating project playlist columns

let globalTopicNum = startTopicNumber;

for (let pi = 0; pi < playlists.length; pi++) {
  const pl = playlists[pi];
  playlistMeta.push({ name: pl.playlist_title, theme: pl.playlist_theme });

  for (const t of (pl.topics || [])) {
    topicRows.push({
      project_id,
      topic_number: t.topic_number || globalTopicNum,
      playlist_group: pi + 1,
      playlist_angle: pl.playlist_title || '',
      // Map v3.0 columns to DB columns
      original_title: t.subtopic || '',
      seo_title: t.subtopic || '',
      narrative_hook: t.primary_problem_trigger || '',
      key_segments: t.video_style_structure || '',
      estimated_cpm: null,
      viral_potential: null,
      // New v3.0 columns
      core_domain_framework: t.core_domain_framework || '',
      primary_problem_trigger: t.primary_problem_trigger || '',
      target_audience_segment: t.target_audience_segment || '',
      psychographics: t.psychographics || '',
      key_emotional_drivers: t.key_emotional_drivers || '',
      video_style_structure: t.video_style_structure || '',
      content_angle_blue_ocean: t.content_angle_blue_ocean || '',
      viewer_search_intent: t.viewer_search_intent || '',
      practical_takeaways: t.practical_takeaways || '',
      review_status: 'pending',
      status: 'pending'
    });

    avatarData.push({
      audience_avatar: t.audience_avatar || '',
      psychographics: t.psychographics || '',
      key_emotional_drivers: t.key_emotional_drivers || '',
      target_audience_segment: t.target_audience_segment || '',
      viewer_search_intent: t.viewer_search_intent || ''
    });

    globalTopicNum++;
  }
}

return [{ json: { project_id, topicRows, avatarData, playlistMeta } }];
```

- [ ] **Step 5: Rewrite `Map Avatars` to use v3.0 avatar structure**

```javascript
const topics = $input.all().map(item => item.json);
const avatarData = $('Parse Topics').first().json.avatarData;
const project_id = $('Validate').first().json.project_id;

const avatarRows = topics.map((t, i) => {
  const a = avatarData[i] || {};
  // Parse audience_avatar text into name/occupation if possible
  const avatarText = a.audience_avatar || '';

  return {
    topic_id: t.id,
    project_id,
    video_title_short: t.seo_title || t.original_title,
    avatar_name_age: avatarText.split('.')[0]?.trim() || null, // First sentence often has name
    occupation_income: null, // Extracted from audience_avatar text
    life_stage: null,
    pain_point: a.primary_problem_trigger || null,
    spending_profile: null,
    knowledge_level: null,
    emotional_driver: a.key_emotional_drivers || null,
    online_hangouts: null,
    objection: null,
    dream_outcome: null,
    psychographics: a.psychographics || null,
    key_emotional_drivers: a.key_emotional_drivers || null,
    target_audience_segment: a.target_audience_segment || null,
    viewer_search_intent: a.viewer_search_intent || null,
    review_status: 'pending'
  };
});

return [{ json: { project_id, avatarRows, topicsInserted: topics.length } }];
```

- [ ] **Step 6: Add playlist update to `Status → Topics Pending` or add new node**

After topics are inserted, update the project's playlist columns:
```javascript
// Add after INSERT Avatars, before Status → Topics Pending
const playlistMeta = $('Parse Topics').first().json.playlistMeta || [];
const project_id = $('Validate').first().json.project_id;
const SB = $env.SUPABASE_URL;
const SRK = $env.SUPABASE_SERVICE_ROLE_KEY;

const patch = {};
for (let i = 0; i < Math.min(playlistMeta.length, 5); i++) {
  patch[`playlist${i+1}_name`] = playlistMeta[i].name || '';
  patch[`playlist${i+1}_theme`] = playlistMeta[i].theme || '';
}

await fetch(SB + '/rest/v1/projects?id=eq.' + project_id, {
  method: 'PATCH',
  headers: { 'apikey': SRK, 'Authorization': 'Bearer ' + SRK, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
  body: JSON.stringify(patch)
});

return [{ json: { project_id, playlists_updated: playlistMeta.length } }];
```

- [ ] **Step 7: Fix Code node modes after all updates**

- [ ] **Step 8: Test topic generation**

Delete existing Betrayal project topics/avatars. Reset status. Trigger generation. Verify:
- 25 topics with all new columns populated
- 5 playlist groups with names/themes
- Avatar data extracted
- Project playlist columns updated

- [ ] **Step 9: Commit**

```bash
git commit -m "feat: WF_TOPICS_GENERATE uses Grand Master v3.0 with full analysis payload"
```

---

## Task 4: Create Script Pass Sub-Workflows

**Files:**
- Create: 3 new n8n workflows (`WF_SCRIPT_PASS1`, `WF_SCRIPT_PASS2`, `WF_SCRIPT_PASS3`)

Each sub-workflow implements v1.0's retry protocol (§8):
```
Webhook trigger (called by orchestrator)
→ Build Pass Prompt (inject variables from topic row)
→ Claude: Generate Pass (with system prompt from §3)
→ Claude: Evaluate Pass (§7 evaluator)
→ Parse Verdict
→ IF PASS → respond with pass text + scores
→ IF FAIL_RETRY (attempt < 3) → Build Retry Prompt (§8.2) → loop back to Generate
→ IF FORCE_PASS (attempt 3) → respond with pass text + scores + manual_review flag
```

- [ ] **Step 1: Create WF_SCRIPT_PASS1**

This is the most detailed sub-workflow. Pass 2 and Pass 3 follow the same structure with minor differences.

**Nodes:**
1. `Webhook Trigger` — POST, path: `script/pass1`, responseMode: lastNode
2. `Build Pass 1 Prompt` — Code node: reads topic row fields, fills v1.0 §4 template variables
3. `Claude: Generate Pass 1` — HTTP Request to Anthropic API with system prompt (§3) + user prompt (§4)
4. `Check Generate Error` — Code node: validates Claude response
5. `Build Eval Prompt` — Code node: fills v1.0 §7 evaluator template
6. `Claude: Evaluate` — HTTP Request to Anthropic API
7. `Parse Verdict` — Code node: extracts composite_score, verdict, failures, retry_guidance
8. `Route Verdict` — Switch node: PASS / FAIL_RETRY / FORCE_PASS
9. `Respond PASS` — respondToWebhook with pass text + scores
10. `Build Retry Prompt` — Code node: wraps original prompt with §8.2 retry template
11. `Increment Attempt` — Code node: attempt counter
12. `Loop to Generate` — connects back to node 3 (via n8n loop)
13. `Respond FORCE_PASS` — respondToWebhook with pass text + scores + flag

Key implementation details:
- System prompt (v1.0 §3) stored in `system_prompts` table, fetched once at start
- Topic row fields passed via webhook body from orchestrator
- Word target for Pass 1: "5,000-7,000 words"
- Max 3 attempts, attempt 3 always FORCE_PASS
- Response includes: { pass_text, scores, composite_score, verdict, attempt, word_count_estimate }

- [ ] **Step 2: Create WF_SCRIPT_PASS2**

Same structure as Pass 1, with differences:
- Webhook path: `script/pass2`
- Receives `{PASS_1_OUTPUT}` in webhook body (full Pass 1 text)
- Uses v1.0 §5 template
- Word target: "8,000-10,000 words"
- Actionable specificity weight: ×1.5 (per §7 composite scoring note)

- [ ] **Step 3: Create WF_SCRIPT_PASS3**

Same structure as Pass 1, with differences:
- Webhook path: `script/pass3`
- Receives metadata from extraction step: `{PASS_1_SUMMARY}`, `{PASS_2_SUMMARY}`, `{CHARACTER_NAME}`, `{LIST_OF_METAPHORS}`, `{LIST_OF_NOTABLE_PHRASES}`
- Uses v1.0 §6 template
- Word target: "5,000-7,000 words"

- [ ] **Step 4: Create all 3 workflows via n8n API**

Use `mcp__synta-mcp__n8n_create_workflow` for each. Activate all 3.

- [ ] **Step 5: Test each sub-workflow independently**

Test Pass 1 with a sample topic row via direct webhook call. Verify:
- Claude generates script text
- Evaluator scores with 7 new metrics
- Verdict routing works (PASS/FAIL_RETRY)
- Retry loop works if score < 7.0

- [ ] **Step 6: Commit workflow JSONs**

```bash
git add workflows/WF_SCRIPT_PASS1.json workflows/WF_SCRIPT_PASS2.json workflows/WF_SCRIPT_PASS3.json
git commit -m "feat: 3 script pass sub-workflows with retry protocol per v1.0 §8"
```

---

## Task 5: Refactor WF_SCRIPT_GENERATE as Orchestrator

**Workflow:** `DzugaN9GtVpTznvs`

The current 47-node monolith becomes a lean orchestrator that:
1. Receives webhook → validates → reads topic
2. Calls WF_SCRIPT_PASS1 sub-workflow → gets Pass 1 text + scores
3. Calls metadata extraction (v1.0 §9.3) between Pass 2 and Pass 3
4. Calls WF_SCRIPT_PASS2 sub-workflow → gets Pass 2 text + scores
5. Calls metadata extraction for Pass 1+2 combined
6. Calls WF_SCRIPT_PASS3 sub-workflow → gets Pass 3 text + scores
7. Assembles final script (v1.0 §10)
8. Scene segmentation (existing Build Visual Prompt + Claude: Visual Assignment + Build Scenes Array)
9. Inserts scenes, updates topic status

**Nodes to KEEP:** Webhook Trigger, Validate Request, Respond to Webhook, Read Topic, Read Project, PATCH Status Scripting, Log Started, Build Visual Prompt, Claude: Visual Assignment, Build Scenes Array, PATCH Script JSON, Delete Prior Scenes, Bulk Insert Scenes, PATCH Status Review, Log Completed, Collect Error, PATCH Status Failed, Log Failed

**Nodes to REMOVE:** Init & Validate Prompts, Read Prompts, Build Pass 1/2/3 Prompt, Claude: Pass 1/2/3, Check Pass 1/2/3 Error, IF Pass 1/2/3 Error, Build Pass 1 Eval Prompt, Claude: Eval Pass 1, Merge Pass 1/2/3 Scores, PATCH Pass 1/2/3 Scores, Log Pass 1/2/3 Complete, Build Combined Eval, Claude: Combined Eval, Merge Combined Scores, PATCH Combined Score

**New nodes to ADD:**
- `Call Pass 1` — Execute Workflow node calling WF_SCRIPT_PASS1
- `Save Pass 1 Scores` — PATCH topic with pass1 scores
- `Call Pass 2` — Execute Workflow node calling WF_SCRIPT_PASS2
- `Save Pass 2 Scores` — PATCH topic with pass2 scores
- `Extract Metadata` — Code node + Claude call for v1.0 §9.3
- `Call Pass 3` — Execute Workflow node calling WF_SCRIPT_PASS3
- `Save Pass 3 Scores` — PATCH topic with pass3 scores
- `Assemble Script` — Code node implementing v1.0 §10 assembly

- [ ] **Step 1: Remove old pass nodes (30+ nodes)**

Via n8n API: remove all pass-specific nodes listed above. Rewire Validate Request → new orchestration chain.

- [ ] **Step 2: Add orchestration nodes**

Create the new nodes that call sub-workflows and handle the assembly.

- [ ] **Step 3: Add metadata extraction between passes**

Implement v1.0 §9.3: after Pass 2 completes, call Claude with the extraction prompt to get summaries, character name, metaphor list, etc. This data feeds into Pass 3.

- [ ] **Step 4: Implement v1.0 §10 assembly**

```javascript
// Assemble final script
const pass1 = $('Call Pass 1').first().json;
const pass2 = $('Call Pass 2').first().json;
const pass3 = $('Call Pass 3').first().json;
const metadata = $('Extract Metadata').first().json;

const combined_text = pass1.pass_text + '\n\n' + pass2.pass_text + '\n\n' + pass3.pass_text;
const word_count = combined_text.split(/\s+/).length;

const script_metadata = {
  video_title: topic.seo_title,
  niche_category: project.niche,
  total_word_count: word_count,
  estimated_duration_minutes: Math.round(word_count / 200),
  pass_scores: {
    pass_1: { attempts: pass1.attempt, final_score: pass1.composite_score, verdict: pass1.verdict },
    pass_2: { attempts: pass2.attempt, final_score: pass2.composite_score, verdict: pass2.verdict },
    pass_3: { attempts: pass3.attempt, final_score: pass3.composite_score, verdict: pass3.verdict }
  },
  total_api_calls: (pass1.attempt * 2) + (pass2.attempt * 2) + (pass3.attempt * 2) + 1, // +1 for metadata extraction
  manual_review_flag: [pass1, pass2, pass3].some(p => p.verdict === 'FORCE_PASS' && p.composite_score < 5.0),
  metaphors_used: metadata.metaphors_used || [],
  case_study_character: metadata.character_name || '',
  shorts_extractable_moments: 3 // estimate
};

return [{ json: { combined_text, word_count, script_metadata, ... } }];
```

- [ ] **Step 5: Fix all Code node modes**

- [ ] **Step 6: Test full script generation pipeline**

Trigger for the Betrayal project's approved topic. Verify:
- Pass 1 generates + evaluates (with retry if needed)
- Metadata extracted between passes
- Pass 2 generates with Pass 1 context
- Pass 3 generates with metadata (summaries, character, metaphors)
- Final assembly correct
- Scores stored with new 7 dimensions
- Scenes segmented (170+ scenes, all static_image)
- Topic status → script_review

- [ ] **Step 7: Commit**

```bash
git commit -m "feat: WF_SCRIPT_GENERATE refactored as orchestrator calling 3 sub-workflows"
```

---

## Task 6: Dashboard Updates — New Topic Fields

**Files:**
- Modify: `dashboard/src/hooks/useTopics.js`
- Modify: `dashboard/src/components/topics/TopicCard.jsx`

- [ ] **Step 1: Update useTopics.js to fetch new columns**

The Supabase `select` already uses `*` so new columns are automatically included. No change needed to the query itself. But verify the new columns appear in the data.

- [ ] **Step 2: Update TopicCard.jsx to display new v3.0 fields**

Add new fields to the expanded read-only view:

After the existing "Key segments" section, add:
- Core Domain Framework
- Content Angle (Blue Ocean)
- Practical Takeaways
- Psychographics
- Key Emotional Drivers
- Viewer Search Intent

Also update the edit mode to include these fields.

- [ ] **Step 3: Update TopicCard.jsx edit mode fields**

Add the new fields to `handleEnterEdit` and the edit form.

- [ ] **Step 4: Build and deploy dashboard**

```bash
cd dashboard && npm run build && scp -i ~/.ssh/vps_gridai -r dist/. root@srv1297445.hstgr.cloud:/opt/dashboard/
```

- [ ] **Step 5: Commit**

```bash
git add dashboard/src/components/topics/TopicCard.jsx
git commit -m "feat: TopicCard displays v3.0 fields — framework, blue ocean angle, takeaways, psychographics"
```

---

## Task 7: Dashboard Updates — New Score Dimensions

**Files:**
- Modify: `dashboard/src/components/script/ScorePanel.jsx`
- Modify: `dashboard/src/components/script/PassTracker.jsx`

- [ ] **Step 1: Update ScorePanel.jsx SCORE_DIMENSIONS**

Replace the current 7 dimensions with the v1.0 §7 metrics:

```javascript
const SCORE_DIMENSIONS = [
  { key: 'word_count_compliance', label: 'Word Count', weight: 1.5 },
  { key: 'citation_density', label: 'Citation Density', weight: 1.2 },
  { key: 'narrative_structure', label: 'Narrative Structure', weight: 1.3 },
  { key: 'actionable_specificity', label: 'Actionable Specificity', weight: 1.0 },
  { key: 'retention_engineering', label: 'Retention Engineering', weight: 1.2 },
  { key: 'format_compliance', label: 'Format Compliance', weight: 1.0 },
  { key: 'anti_pattern_compliance', label: 'Anti-Pattern Check', weight: 1.0 },
];
```

Also update the dimension value extraction to handle the new evaluator response format:
```javascript
// Old: dimensions[dim.key] (flat number)
// New: dimensions[dim.key]?.score || dimensions[dim.key] (object with score + note)
const score = typeof dimensions[dim.key] === 'object' ? dimensions[dim.key]?.score : dimensions[dim.key];
const note = typeof dimensions[dim.key] === 'object' ? dimensions[dim.key]?.note : null;
```

- [ ] **Step 2: Update ScorePanel.jsx to remove i2v/t2v from visual split**

Remove the `i2vCount` and `t2vCount` variables and display. Replace with just scene count.

- [ ] **Step 3: Update PassTracker.jsx to show retry attempts**

Add attempt counter display per pass. When `passScores.pass1.attempt > 1`, show "Attempt 2/3" badge.

- [ ] **Step 4: Update ScorePanel.jsx Per-Pass Breakdown**

The Per-Pass Breakdown section uses `SCORE_DIMENSIONS` to render bars. Since we changed the dimensions, this section automatically updates. But verify the data path still works with the new evaluator output format.

- [ ] **Step 5: Build and deploy dashboard**

```bash
cd dashboard && npm run build && scp -i ~/.ssh/vps_gridai -r dist/. root@srv1297445.hstgr.cloud:/opt/dashboard/
```

- [ ] **Step 6: Commit**

```bash
git add dashboard/src/components/script/ScorePanel.jsx dashboard/src/components/script/PassTracker.jsx
git commit -m "feat: ScorePanel + PassTracker updated for v1.0 evaluator metrics + retry display"
```

---

## Task 8: Clean Up Old Data + Regenerate

- [ ] **Step 1: Delete Betrayal project topics, avatars, scenes, production logs**

```sql
DELETE FROM production_log WHERE project_id = 'e1caa170-75ca-4a24-943d-3963d5b31ad2';
DELETE FROM scenes WHERE project_id = 'e1caa170-75ca-4a24-943d-3963d5b31ad2';
DELETE FROM avatars WHERE project_id = 'e1caa170-75ca-4a24-943d-3963d5b31ad2';
DELETE FROM topics WHERE project_id = 'e1caa170-75ca-4a24-943d-3963d5b31ad2';
UPDATE projects SET status = 'ready_for_topics' WHERE id = 'e1caa170-75ca-4a24-943d-3963d5b31ad2';
```

- [ ] **Step 2: Delete old per-project prompt_configs**

```sql
DELETE FROM prompt_configs
WHERE project_id = 'e1caa170-75ca-4a24-943d-3963d5b31ad2'
AND prompt_type IN ('topic_generator', 'script_pass1', 'script_pass2', 'script_pass3', 'evaluator');
```

- [ ] **Step 3: Trigger topic generation with new v3.0**

```bash
curl -X POST "https://n8n.srv1297445.hstgr.cloud/webhook/topics/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"project_id": "e1caa170-75ca-4a24-943d-3963d5b31ad2"}'
```

Verify: 25 topics with all new columns, 5 playlists, correlated with video analysis.

- [ ] **Step 4: Approve one topic and trigger script generation**

Verify full pipeline: Pass 1 → Eval → (Retry?) → Pass 2 → Eval → Metadata Extract → Pass 3 → Eval → Assembly → Scene Segmentation → script_review status.

- [ ] **Step 5: Verify dashboard displays everything correctly**

- Topic cards show new fields (framework, blue ocean angle, takeaways)
- Score panel shows new 7 dimensions with scores
- Pass tracker shows retry attempts
- Script content displays correctly

- [ ] **Step 6: Final commit**

```bash
git commit -m "feat: Grand Master Prompts v3.0 + v1.0 fully integrated — end-to-end verified"
```

---

## Verification Checklist

After all tasks complete, verify:

- [ ] `system_prompts` table has 8 rows (topic_generator_master + 7 script templates)
- [ ] New `topics` columns exist and are populated: `core_domain_framework`, `primary_problem_trigger`, `target_audience_segment`, `psychographics`, `key_emotional_drivers`, `video_style_structure`, `content_angle_blue_ocean`, `viewer_search_intent`, `practical_takeaways`
- [ ] Projects have 5 playlist columns
- [ ] `competitive_analysis` stores FULL analysis objects (not 10-field subset)
- [ ] WF_PROJECT_CREATE generates only 2 prompts (visual_director, scene_segmenter)
- [ ] WF_TOPICS_GENERATE reads from `system_prompts`, constructs analysis payload
- [ ] Topics correlate with video analysis (60%+ traceable per v3.0 §3 Rule 2)
- [ ] WF_SCRIPT_GENERATE orchestrates 3 sub-workflows
- [ ] Each sub-workflow has retry logic (up to 3 attempts per pass)
- [ ] Metadata extraction runs between Pass 2 and Pass 3
- [ ] Script evaluator uses new 7 metrics with weighted scoring
- [ ] Dashboard shows new topic fields, new score dimensions, retry state
- [ ] No old `prompt_configs` rows for topic_generator/script_pass1/2/3/evaluator
- [ ] All Code nodes have `mode: 'runOnceForAllItems'`
- [ ] All Claude calls use `claude-sonnet-4-20250514` with max_tokens ≤ 64000
- [ ] All scenes are `visual_type: 'static_image'`
