# Remotion Hybrid Rendering — Agent.md Merge Sections
## Target: VisionGridAI_Platform_Agent.md

---

## >>>> MERGE INTO: IMMUTABLE rules (append) <<<<

- **Hybrid rendering: Fal.ai + Remotion.** Every scene is AI-classified as `fal_ai` (photorealistic) or `remotion` (data/typographic). Classification happens AFTER script approval, BEFORE image generation. Results are visible on the dashboard for operator review before proceeding.
- **Remotion scenes use structured data, not image prompts.** The `data_payload` JSON field drives Remotion rendering. Fal.ai scenes use `image_prompt` + `composition_prefix` + `style_dna`. Both produce a .png that enters the same Ken Burns pipeline.
- **Remotion templates follow the project's Style DNA.** Colors, typography, and background treatment are derived from `color_mood` and `style_dna` so Remotion frames are visually indistinguishable from Fal.ai frames in the final video.
- **Scene classification is a reviewable gate.** The operator sees all 172 scenes tagged with their render method on the dashboard. They can override any classification before triggering image generation. This applies to both long-form and short-form production.

---

## >>>> MERGE INTO: Supabase Schema section <<<<

### Migration: 005_remotion_hybrid_rendering.sql

```sql
-- Render method classification per scene
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS render_method TEXT DEFAULT 'fal_ai'
  CHECK (render_method IN ('fal_ai', 'remotion'));

-- Structured data payload for Remotion scenes
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS data_payload JSONB;
-- Example: { "template": "stat_callout", "primary_value": "$4,700", "label": "Average Annual Rewards", "sublabel": "Chase Sapphire Preferred", "trend": "up" }

-- Remotion template type (maps to React component)
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS remotion_template TEXT;
-- Values: stat_callout | comparison_layout | bar_chart | timeline_graphic | quote_card | list_breakdown | chapter_title | data_table | before_after | percentage_ring | map_visual | metric_highlight

-- Classification metadata (AI reasoning)
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS classification_reasoning TEXT;
-- Stores why AI chose fal_ai or remotion (for operator review)

-- Classification review status
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS classification_status TEXT DEFAULT 'pending'
  CHECK (classification_status IN ('pending', 'classified', 'reviewed', 'overridden'));

-- Track classification run per topic
ALTER TABLE topics ADD COLUMN IF NOT EXISTS classification_status TEXT DEFAULT 'pending'
  CHECK (classification_status IN ('pending', 'classifying', 'classified', 'reviewed'));

-- Remotion template registry
CREATE TABLE IF NOT EXISTS remotion_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,  -- stat_callout, comparison_layout, etc.
  display_name TEXT NOT NULL,
  description TEXT,
  supported_formats TEXT[] DEFAULT ARRAY['long', 'short'],
  props_schema JSONB NOT NULL,  -- JSON Schema defining what data_payload fields this template accepts
  preview_url TEXT,  -- static preview image URL
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE remotion_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read remotion_templates" ON remotion_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Seed the 12 core templates
INSERT INTO remotion_templates (template_key, display_name, description, props_schema) VALUES
('stat_callout', 'Statistic Callout', 'Large number/value with label and supporting context', '{
  "type": "object",
  "required": ["primary_value", "label"],
  "properties": {
    "primary_value": { "type": "string", "description": "The main number/stat (e.g., $4,700 or 99.7%)" },
    "label": { "type": "string", "description": "What the number represents" },
    "sublabel": { "type": "string", "description": "Additional context line" },
    "trend": { "type": "string", "enum": ["up", "down", "neutral"], "description": "Trend direction arrow" },
    "source": { "type": "string", "description": "Data source attribution" }
  }
}'::jsonb),

('comparison_layout', 'Side-by-Side Comparison', 'Two items compared with features and highlights', '{
  "type": "object",
  "required": ["left", "right"],
  "properties": {
    "left": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "subtitle": { "type": "string" },
        "features": { "type": "array", "items": { "type": "object", "properties": { "label": {"type":"string"}, "value": {"type":"string"}, "highlight": {"type":"boolean"} }}}
      }
    },
    "right": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "subtitle": { "type": "string" },
        "features": { "type": "array", "items": { "type": "object", "properties": { "label": {"type":"string"}, "value": {"type":"string"}, "highlight": {"type":"boolean"} }}}
      }
    },
    "winner": { "type": "string", "enum": ["left", "right", "tie"] }
  }
}'::jsonb),

('bar_chart', 'Bar Chart', 'Horizontal or vertical bar chart with labeled data', '{
  "type": "object",
  "required": ["bars", "chart_title"],
  "properties": {
    "chart_title": { "type": "string" },
    "bars": { "type": "array", "items": { "type": "object", "properties": { "label": {"type":"string"}, "value": {"type":"number"}, "display_value": {"type":"string"}, "highlight": {"type":"boolean"} }}},
    "orientation": { "type": "string", "enum": ["horizontal", "vertical"] },
    "unit": { "type": "string", "description": "Unit label (%, $, pts)" }
  }
}'::jsonb),

('timeline_graphic', 'Timeline', 'Chronological progression with events', '{
  "type": "object",
  "required": ["events"],
  "properties": {
    "title": { "type": "string" },
    "events": { "type": "array", "items": { "type": "object", "properties": { "date": {"type":"string"}, "label": {"type":"string"}, "description": {"type":"string"}, "highlight": {"type":"boolean"} }}},
    "direction": { "type": "string", "enum": ["horizontal", "vertical"] }
  }
}'::jsonb),

('quote_card', 'Quote Card', 'Featured quote with attribution', '{
  "type": "object",
  "required": ["quote", "author"],
  "properties": {
    "quote": { "type": "string" },
    "author": { "type": "string" },
    "role": { "type": "string" },
    "avatar_prompt": { "type": "string", "description": "Description for a small avatar image if needed" }
  }
}'::jsonb),

('list_breakdown', 'List Breakdown', 'Numbered or icon list of items', '{
  "type": "object",
  "required": ["items", "title"],
  "properties": {
    "title": { "type": "string" },
    "items": { "type": "array", "items": { "type": "object", "properties": { "text": {"type":"string"}, "subtext": {"type":"string"}, "icon": {"type":"string"}, "highlight": {"type":"boolean"} }}},
    "style": { "type": "string", "enum": ["numbered", "bulleted", "icon"] }
  }
}'::jsonb),

('chapter_title', 'Chapter Title Card', 'Chapter number and title with branding', '{
  "type": "object",
  "required": ["chapter_number", "chapter_title"],
  "properties": {
    "chapter_number": { "type": "integer" },
    "chapter_title": { "type": "string" },
    "subtitle": { "type": "string" },
    "total_chapters": { "type": "integer" }
  }
}'::jsonb),

('data_table', 'Data Table/Grid', 'Structured comparison matrix', '{
  "type": "object",
  "required": ["headers", "rows"],
  "properties": {
    "title": { "type": "string" },
    "headers": { "type": "array", "items": { "type": "string" } },
    "rows": { "type": "array", "items": { "type": "array", "items": { "type": "string" } }},
    "highlight_column": { "type": "integer" },
    "highlight_row": { "type": "integer" }
  }
}'::jsonb),

('before_after', 'Before/After Split', 'Two-state comparison with transformation arrow', '{
  "type": "object",
  "required": ["before", "after"],
  "properties": {
    "before": { "type": "object", "properties": { "value": {"type":"string"}, "label": {"type":"string"}, "mood": {"type":"string","enum":["negative","neutral"]} }},
    "after": { "type": "object", "properties": { "value": {"type":"string"}, "label": {"type":"string"}, "mood": {"type":"string","enum":["positive","neutral"]} }},
    "transformation_label": { "type": "string", "description": "Text on the arrow between (e.g., '6 months later')" }
  }
}'::jsonb),

('percentage_ring', 'Percentage Ring', 'Circular progress with large percentage', '{
  "type": "object",
  "required": ["percentage", "label"],
  "properties": {
    "percentage": { "type": "number" },
    "label": { "type": "string" },
    "sublabel": { "type": "string" },
    "color_override": { "type": "string", "description": "Hex color for the ring fill" }
  }
}'::jsonb),

('map_visual', 'Map Visualization', 'Geographic highlights or regional data', '{
  "type": "object",
  "required": ["regions"],
  "properties": {
    "title": { "type": "string" },
    "map_type": { "type": "string", "enum": ["us_states", "world", "custom"] },
    "regions": { "type": "array", "items": { "type": "object", "properties": { "name": {"type":"string"}, "value": {"type":"string"}, "highlight": {"type":"boolean"} }}}
  }
}'::jsonb),

('metric_highlight', 'Metric Highlight', 'Multiple KPIs in a row or grid', '{
  "type": "object",
  "required": ["metrics"],
  "properties": {
    "title": { "type": "string" },
    "metrics": { "type": "array", "items": { "type": "object", "properties": { "value": {"type":"string"}, "label": {"type":"string"}, "trend": {"type":"string","enum":["up","down","neutral"]}, "highlight": {"type":"boolean"} }}},
    "layout": { "type": "string", "enum": ["row", "grid"] }
  }
}'::jsonb);
```

---

## >>>> MERGE INTO: After Script Generation section, as new Stage <<<<

### Stage 1b: Scene Render Classification

This stage runs AFTER script approval (Gate 2 passed) and BEFORE image generation. It classifies every scene as `fal_ai` or `remotion`, generates structured `data_payload` for Remotion scenes, and presents results on the dashboard for operator review.

**Pipeline position:**
```
Script Generation (3-pass) → GATE 2 (script approved)
  ↓
Scene Render Classification (NEW — this stage)
  ↓ results visible on dashboard
  ↓ operator reviews, optionally overrides
  ↓ operator clicks "Proceed to Image Generation"
  ↓
Image Generation (parallel: Fal.ai track + Remotion track)
  ↓
Ken Burns + Color Grade (treats all images identically)
```

**For short-form (clipped from long-form):** When shorts are extracted from the 2-hour video, the classification carries over from the parent scenes. Each short clip inherits its parent scene's `render_method`. If the shorts pipeline re-generates visuals for 9:16, the same classification logic runs on the short-form scenes.

### AI Classification Prompt (Claude Haiku via OpenRouter)

```
You are a video production visual classifier. For each scene in a documentary video script, determine whether the visual should be:

1. "fal_ai" — A photorealistic AI-generated image. Use when the scene depicts:
   - People, characters, or human subjects
   - Physical environments (rooms, buildings, cities, landscapes)
   - Historical or period-accurate settings
   - Products or physical objects in context
   - Abstract mood imagery (storms, sunsets, metaphorical visuals)
   - Aspirational lifestyle scenes
   - Any scene where photorealism creates emotional impact

2. "remotion" — A programmatically rendered data graphic. Use when the scene depicts:
   - Specific numbers, dollar amounts, percentages, or statistics
   - Comparison between two or more items (vs, side-by-side)
   - Charts, graphs, or data visualizations
   - Timelines or chronological progressions
   - Ranked lists, top-N breakdowns, or feature lists
   - Quotes or testimonials with attribution
   - Chapter title cards or section dividers
   - Tables, grids, or matrices
   - Before/after transformations with specific values
   - Percentage indicators, progress bars, or gauges
   - Geographic data or regional comparisons
   - Any scene where textual/numerical accuracy is critical

IMPORTANT RULES:
- If a scene mentions SPECIFIC numbers, dates, prices, or names that must be displayed accurately → "remotion"
- If the narration is explaining data while showing a mood image → the VISUAL can still be "fal_ai" (the data is spoken, not shown)
- When in doubt between the two, prefer "fal_ai" — photorealistic imagery is the default
- For "remotion" scenes, you MUST also select the best template and generate the data_payload

VIDEO NICHE: {niche}
VIDEO TOPIC: {topic}
STYLE DNA: {style_dna}

SCENES TO CLASSIFY:
{scenes_json_array}

Each scene has: scene_number, narration, image_prompt_subject, composition_prefix, b_roll_insert

OUTPUT FORMAT (JSON array — one object per scene):
[
  {
    "scene_number": 1,
    "render_method": "fal_ai",
    "reasoning": "Scene depicts a person at a desk reviewing documents — requires photorealism",
    "remotion_template": null,
    "data_payload": null
  },
  {
    "scene_number": 2,
    "render_method": "remotion",
    "reasoning": "Scene presents a comparison of two credit cards with specific APR values and annual fees — requires accurate text and numbers",
    "remotion_template": "comparison_layout",
    "data_payload": {
      "left": {
        "title": "Chase Sapphire Preferred",
        "subtitle": "$95/year",
        "features": [
          { "label": "APR", "value": "21.49% - 28.49%", "highlight": false },
          { "label": "Welcome Bonus", "value": "60,000 pts", "highlight": true },
          { "label": "Travel Credit", "value": "$50/year", "highlight": false }
        ]
      },
      "right": {
        "title": "Amex Gold Card",
        "subtitle": "$250/year",
        "features": [
          { "label": "APR", "value": "21.99% - 29.99%", "highlight": false },
          { "label": "Welcome Bonus", "value": "60,000 pts", "highlight": false },
          { "label": "Dining Credit", "value": "$120/year", "highlight": true }
        ]
      },
      "winner": "left"
    }
  }
]

RESPOND ONLY WITH THE JSON ARRAY. No explanation outside the JSON.
```

### Data Payload Generation Prompt (for Remotion scenes that need deeper data)

When the classifier identifies a Remotion scene but the narration doesn't contain enough structured data to populate the template, a second AI call extracts/generates the data:

```
You are a data extraction specialist for video production. Given a scene's narration and context, generate the structured data payload needed to render this scene as a {TEMPLATE_TYPE} graphic.

SCENE NARRATION: {narration}
TEMPLATE: {remotion_template}
TEMPLATE SCHEMA: {props_schema_from_remotion_templates_table}
VIDEO NICHE: {niche}
TOPIC CONTEXT: {topic_title}

RULES:
- Extract EXACT numbers, names, and values from the narration when available
- If the narration references data without stating the exact value, use your knowledge to provide the accurate real-world value. Mark these as "inferred": true in the payload.
- All text must be concise (labels max 4 words, values max 8 characters)
- For comparison_layout: left and right must have the same number of features
- For bar_chart: limit to 5-8 bars maximum
- For list_breakdown: limit to 5-7 items maximum
- For data_table: limit to 5 rows × 4 columns maximum

OUTPUT: A single JSON object matching the template schema. Nothing else.
```

### Classification Workflow: WF_SCENE_CLASSIFY

```
Trigger: After script approval (Gate 2 pass), before image generation
Input: topic_id

Steps:
1. Update topics SET classification_status = 'classifying'
2. Fetch all scenes for this topic, ordered by scene_number
3. Batch scenes into groups of 30 (Haiku context management)
4. For each batch, call Claude Haiku with the Classification Prompt
5. Parse JSON response
6. For each scene in response:
   a. UPDATE scenes SET
      render_method = {classified},
      remotion_template = {template or null},
      data_payload = {payload or null},
      classification_reasoning = {reasoning},
      classification_status = 'classified'
   b. Log to production_logs
7. For Remotion scenes with incomplete data_payload:
   a. Call Data Payload Generation Prompt per scene
   b. Update data_payload with enriched data
8. Update topics SET classification_status = 'classified'
9. Dashboard shows classification results — operator reviews

Estimated cost: ~$0.03 per classification run (172 scenes via Haiku)
```

### Classification Review on Dashboard

After classification completes, the dashboard shows a new view on the existing ScriptReview or a dedicated sub-section within the production flow. The operator sees:

```
┌──────────────────────────────────────────────────────────────────┐
│ Scene Render Classification — [Topic Title]                       │
│                                                                   │
│ Summary: 172 scenes | 108 Fal.ai (63%) | 64 Remotion (37%)      │
│ Est. cost: 108 × $0.03 = $3.24 (saved $1.92 vs all-Fal.ai)     │
│                                                                   │
│ ┌─ Filter: [All ▾] [Fal.ai only] [Remotion only] ──────────────┐│
│ │                                                                ││
│ │  #1  [FAL.AI]  "Young professional at desk reviewing docs"    ││
│ │       → Photorealistic scene with human subject                ││
│ │       [Override → Remotion ▾]                                  ││
│ │                                                                ││
│ │  #2  [REMOTION] "Chase Sapphire vs Amex Gold comparison"      ││
│ │       Template: comparison_layout                              ││
│ │       → Specific APR values and annual fees need accuracy      ││
│ │       [Preview] [Edit Data] [Override → Fal.ai ▾]             ││
│ │                                                                ││
│ │  #3  [REMOTION] "$4,700 average annual rewards"               ││
│ │       Template: stat_callout                                   ││
│ │       → Specific dollar amount must be displayed accurately    ││
│ │       [Preview] [Edit Data] [Override → Fal.ai ▾]             ││
│ │                                                                ││
│ │  #4  [FAL.AI]  "Storm clouds gathering over cityscape"        ││
│ │       → Abstract mood imagery for metaphorical effect          ││
│ │       [Override → Remotion ▾]                                  ││
│ │                                                                ││
│ └────────────────────────────────────────────────────────────────┘│
│                                                                   │
│        [Re-classify All]  [Accept & Proceed to Image Gen →]      │
└──────────────────────────────────────────────────────────────────┘
```

**Override behavior:**
- Operator can flip any scene from Fal.ai → Remotion or Remotion → Fal.ai
- Flipping to Remotion opens a template selector + data payload editor
- Flipping to Fal.ai clears remotion_template and data_payload
- Overridden scenes get `classification_status = 'overridden'`
- "Accept & Proceed" updates `topics.classification_status = 'reviewed'` and triggers image generation

**Preview behavior:**
- For Remotion scenes, clicking "Preview" renders a static preview using the template + data_payload + color_mood
- This gives the operator visual confirmation before committing to the full render
- Preview uses a lightweight endpoint: POST to Remotion render service with template + data + style params → returns PNG

### Remotion Template Architecture

All templates live at `dashboard/src/remotion/templates/` and share a common pattern:

```jsx
// Base structure for every Remotion template
import { AbsoluteFill } from 'remotion';

// Color mood maps (derived from project's color science)
const MOOD_THEMES = {
  cold_desat:       { bg: '#0A0F1A', text: '#C8D6E5', accent: '#5B9BD5', muted: '#4A5568' },
  cool_neutral:     { bg: '#0F172A', text: '#E2E8F0', accent: '#60A5FA', muted: '#64748B' },
  dark_mono:        { bg: '#0A0A0A', text: '#A0AEC0', accent: '#90CDF4', muted: '#4A5568' },
  warm_sepia:       { bg: '#1A130D', text: '#F5E6D3', accent: '#D4A574', muted: '#8B7355' },
  warm_gold:        { bg: '#1A1508', text: '#FFF8E7', accent: '#F5A623', muted: '#B8860B' },
  full_natural:     { bg: '#0F1419', text: '#F7FAFC', accent: '#48BB78', muted: '#718096' },
  muted_selective:  { bg: '#0D1117', text: '#CBD5E0', accent: '#9F7AEA', muted: '#4C566A' },
};

// Every template receives these standard props:
// - data: the data_payload JSON
// - colorMood: string matching MOOD_THEMES key
// - format: 'long' (1920x1080) or 'short' (1080x1920)
// - styleDna: project's style_dna string (used for font/vibe matching)
```

**Template files:**
```
dashboard/src/remotion/templates/
├── index.js                  ← Template registry (maps template_key → component)
├── shared/
│   ├── MoodTheme.js          ← MOOD_THEMES constant + theme hook
│   ├── Typography.js         ← Shared font styles (Montserrat, Inter)
│   ├── AnimatedNumber.js     ← Count-up animation for numbers
│   ├── TrendArrow.js         ← Up/down/neutral arrow component
│   └── GlassCard.js          ← Frosted glass card background
├── StatCallout.jsx
├── ComparisonLayout.jsx
├── BarChart.jsx
├── TimelineGraphic.jsx
├── QuoteCard.jsx
├── ListBreakdown.jsx
├── ChapterTitle.jsx
├── DataTable.jsx
├── BeforeAfter.jsx
├── PercentageRing.jsx
├── MapVisual.jsx
└── MetricHighlight.jsx
```

### Remotion Render Service

A lightweight Node.js service on the VPS that renders individual frames:

```
POST /render
Body: {
  template_key: "stat_callout",
  data_payload: { primary_value: "$4,700", label: "Annual Rewards", ... },
  color_mood: "warm_gold",
  format: "long",   // 1920x1080
  style_dna: "modern financial photography, clean lines...",
  output_path: "/tmp/renders/scene_042.png"
}
Response: { success: true, file_path: "/tmp/renders/scene_042.png", render_time_ms: 1200 }
```

Internally calls: `npx remotion still ./src/remotion/templates/index.js StatCallout --props='...' --output=scene_042.png --width=1920 --height=1080`

n8n calls this service via HTTP Request node for each Remotion scene.

### Image Generation Split (modified WF_IMAGE_GENERATION)

The existing image generation workflow splits into two parallel tracks:

```
WF_IMAGE_GENERATION (modified):
  ↓
  Query: SELECT * FROM scenes WHERE topic_id = X AND image_status = 'pending'
  ↓
  Split by render_method:
  ├── WHERE render_method = 'fal_ai':
  │   For each scene:
  │   1. Assemble prompt: composition_prefix + image_prompt_subject + style_dna
  │   2. Append negative prompt
  │   3. Call Fal.ai Seedream 4.0 via WF_RETRY_WRAPPER
  │   4. Upload to Drive, update image_url, image_status = 'uploaded'
  │
  └── WHERE render_method = 'remotion':
      For each scene:
      1. POST to Remotion render service with template_key + data_payload + color_mood + format
      2. Upload rendered PNG to Drive
      3. Update image_url, image_status = 'uploaded'

Both tracks write to the SAME scenes table.
Downstream (Ken Burns + color grade) treats all images identically.
```

### Short-Form Application

When shorts are clipped from the 2-hour long-form video, each clip's scenes inherit `render_method` from the parent. If the shorts pipeline re-generates 9:16 visuals:

1. The classification runs again on the short-form scene list
2. Remotion templates that support `format: 'short'` render at 1080×1920
3. The same dashboard review shows classification results for short-form scenes
4. Composition adjustments: Remotion templates use vertical layout variants for 9:16

---

## >>>> MERGE INTO: Dashboard section <<<<

### New Component: SceneClassificationReview

**Location:** `components/production/SceneClassificationReview.jsx`

Embedded within the production flow between Script Approval (Gate 2) and Image Generation. Shows:

- Summary bar: total scenes, Fal.ai count, Remotion count, estimated cost, estimated savings
- Scene list: filterable by render_method, each row shows scene number, render method badge (colored: blue for Fal.ai, purple for Remotion), narration snippet, classification reasoning, template name (Remotion only)
- Override controls: dropdown to switch render_method per scene, template selector for Remotion, data_payload editor (JSON or form-based)
- Preview button for Remotion scenes (calls render service for single-frame preview)
- Bulk actions: "Classify all as Fal.ai", "Re-run AI Classification"
- Action buttons: "Re-classify All" and "Accept & Proceed to Image Gen →"

**Hook:** `useSceneClassification.js` — queries scenes filtered by topic, subscribes to Realtime for classification progress, provides mutation functions for overrides.

### Modified: ProductionMonitor

Add a new step in the production pipeline visualization between "Script Approved" and "Generating Images":

```
[Script Approved ✅] → [Classification: 108 Fal.ai / 64 Remotion ✅] → [Generating Images...] → ...
```

The classification step shows green when `topics.classification_status = 'reviewed'`, yellow when `'classified'` (awaiting review), and spinning when `'classifying'`.

---

## >>>> MERGE INTO: New Workflows table <<<<

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| WF_SCENE_CLASSIFY | After Gate 2 (script approved) | AI classifies 172 scenes as fal_ai or remotion, generates data_payload |
| WF_REMOTION_RENDER | Called by WF_IMAGE_GENERATION | Renders individual Remotion scenes via render service |

---

## >>>> MERGE INTO: Pipeline Phases / Cost table <<<<

### Updated Cost (with Remotion Hybrid — Finance Niche ~37% Remotion)

| Item | Before (all Fal.ai) | After (hybrid) |
|------|---------------------|----------------|
| Images (172 scenes) | 172 × $0.03 = $5.16 | 108 × $0.03 + 64 × $0.00 = $3.24 |
| Classification | $0.00 | ~$0.03 |
| **Image gen total** | **$5.16** | **$3.27** |
| **Saving** | | **$1.89/video** |

Note: Remotion percentage varies by niche. Finance/tech = 30-40% Remotion. Historical/lifestyle = 10-15% Remotion. The AI classifier adapts automatically.

### Updated Total Per Video

Previous (all Fal.ai Ken Burns): ~$8.06/video
With Remotion hybrid (finance niche): ~$6.17/video

---

## >>>> MERGE INTO: Error Handling table <<<<

| Failure | Response | Recovery |
|---------|----------|----------|
| Classification AI returns malformed JSON | Retry with stricter prompt | If retry fails, default all scenes to `fal_ai` |
| Remotion render service down | Mark scene as failed, skip | Operator can re-trigger or override to `fal_ai` |
| data_payload incomplete for template | Run Data Payload Generation prompt | If fails, override to `fal_ai` |
| Operator overrides all to Fal.ai | Valid — skip Remotion track entirely | Classification saved for analytics |
