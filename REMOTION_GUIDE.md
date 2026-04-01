# Remotion Hybrid Rendering — Build Guide
## Phase 7 of Vision GridAI Build Sequence
## Superpowers + gstack + frontend-design + Agency Agents

---

## Overview

This phase adds AI-powered scene classification and Remotion data graphic rendering to the production pipeline. It slots AFTER the 31-feature merge (Phases 1-6) and BEFORE production testing.

**New pipeline step:** After script approval → AI classifies all scenes → dashboard shows results → operator reviews → image generation splits into Fal.ai + Remotion tracks.

**Build order:** 5 sub-phases, 9 Claude Code prompts.

---

## Sub-Phase 7.1: Schema + Remotion Service

**Objective:** Database migration, Remotion template table seeded, render service deployed.
**Agents:** `@devops-engineer`, `@backend-architect`

### Prompt 7.1.1: Supabase Migration

```
Use @devops-engineer. Apply migration 005_remotion_hybrid_rendering.sql.

Read REMOTION_AGENT_MERGE.md — the full SQL is in the "Migration: 005" section.

This migration:
1. ALTERs scenes: adds render_method, data_payload, remotion_template, classification_reasoning, classification_status
2. ALTERs topics: adds classification_status
3. Creates remotion_templates table with props_schema JSONB
4. Seeds 12 core templates (stat_callout, comparison_layout, bar_chart, timeline_graphic, quote_card, list_breakdown, chapter_title, data_table, before_after, percentage_ring, map_visual, metric_highlight) with their full JSON schemas
5. RLS policies

Apply to live Supabase. Verify all 12 template rows exist after seeding.
Use /careful for the JSON schemas — they drive template rendering validation.
```

### Prompt 7.1.2: Remotion Render Service

```
Use @backend-architect. Build the Remotion render service.

Create dashboard/src/remotion/render-service.js — a lightweight Express/Fastify server:

Endpoints:
  POST /render — renders a single scene
    Body: { template_key, data_payload, color_mood, format ('long'|'short'), style_dna, output_path }
    Internally calls: npx remotion still with the correct composition and props
    Returns: { success, file_path, render_time_ms }

  POST /preview — same as /render but saves to /tmp/previews/ (no Drive upload)
    Returns: { success, preview_url } (served as static file)

  GET /health — returns { status: 'ok', templates_loaded: 12 }

The service:
- Loads template registry from dashboard/src/remotion/templates/index.js
- Validates data_payload against props_schema from remotion_templates table (fetch on startup)
- Returns 400 with specific validation errors if payload doesn't match schema
- Runs on port 3100
- Add to infra/docker-compose.override.yml or run as systemd service

Also create the template index file at dashboard/src/remotion/templates/index.js
that exports a map: { stat_callout: StatCallout, comparison_layout: ComparisonLayout, ... }

Use /qa after deployment. Test with: curl -X POST localhost:3100/render -H 'Content-Type: application/json' -d '{"template_key":"stat_callout","data_payload":{"primary_value":"$4,700","label":"Annual Rewards"},"color_mood":"warm_gold","format":"long"}'
```

---

## Sub-Phase 7.2: Remotion Templates

**Objective:** Build all 12 Remotion template components.
**Agents:** `@frontend-developer`

### Prompt 7.2.1: Shared Components + MoodTheme

```
Use @frontend-developer. Use the frontend-design skill — read SKILL.md first.
Read design-system/MASTER.md for the Neon Pipeline design system.

Build the shared Remotion components at dashboard/src/remotion/templates/shared/:

1. MoodTheme.js — export MOOD_THEMES constant mapping all 7 color_mood values to { bg, text, accent, muted, gradient } colors. These colors are derived from the FFmpeg color grade values but adapted for on-screen graphics:
   - cold_desat: dark navy bg (#0A0F1A), cool blue accent, muted text
   - cool_neutral: deep slate bg (#0F172A), bright blue accent, light gray text
   - dark_mono: near-black bg (#0A0A0A), ice blue accent, subdued text
   - warm_sepia: dark brown bg (#1A130D), amber accent, cream text
   - warm_gold: dark olive bg (#1A1508), golden accent (#F5A623), warm white text
   - full_natural: dark charcoal bg (#0F1419), green accent, clean white text
   - muted_selective: dark blue-gray bg (#0D1117), purple accent, cool gray text
   Export a useMoodTheme(colorMood) hook.

2. Typography.js — Montserrat ExtraBold for values/numbers, Inter for labels/body.
   Export font-size presets for long-form (1920x1080) and short-form (1080x1920).

3. AnimatedNumber.js — A component that displays a number. For still rendering this is just styled text, but structured for future video rendering with count-up animation.

4. TrendArrow.js — Up (green), down (red), neutral (gray) arrow icon.

5. GlassCard.js — Frosted glass card with subtle border, backdrop blur effect on PNG.
   Accepts mood theme colors for background tint.

All components must look cinematic, NOT like a PowerPoint slide. Think: Netflix data cards, Bloomberg terminal aesthetics, Apple keynote graphics. Dark backgrounds, precise typography, subtle gradients, generous whitespace.
```

### Prompt 7.2.2: Core Templates (6 most common)

```
Use @frontend-developer. Build the 6 most frequently used Remotion templates.

Each template:
- Is a React component accepting { data, colorMood, format, styleDna } props
- Uses useMoodTheme(colorMood) for all colors
- Renders at 1920x1080 (format='long') or 1080x1920 (format='short')
- Has dark cinematic background matching the mood theme
- Uses Montserrat ExtraBold for primary values, Inter for labels
- Is visually indistinguishable from a Fal.ai image when placed in the video timeline

Build these 6:

1. StatCallout.jsx — Large number center-screen (AnimatedNumber), label below, sublabel smaller, optional trend arrow. The number should be MASSIVE (200px+ for long-form). Subtle gradient glow behind the number matching the accent color.

2. ComparisonLayout.jsx — Two GlassCard panels side-by-side (long) or stacked (short). Each has title, subtitle, feature list. Winning side gets accent color border. Features aligned in rows for easy scanning. Subtle "VS" divider between panels.

3. BarChart.jsx — Horizontal or vertical bars. Each bar has label + value. Highlighted bars use accent color, others use muted. Clean grid lines, minimal axis labels. The bar with the highest value should visually dominate.

4. ListBreakdown.jsx — Numbered list with icon support. Each item: number/icon on left, text + subtext on right. Highlighted items get accent treatment. Clean vertical rhythm. Works as numbered (1, 2, 3) or with custom icons.

5. ChapterTitle.jsx — Full-bleed design. Large chapter number (semi-transparent, background), chapter title in Montserrat ExtraBold, optional subtitle, thin accent line separator. Should feel like a Netflix chapter card.

6. QuoteCard.jsx — Large quotation marks in accent color (decorative). Quote text in Inter italic. Author name + role below with small divider. Optional circular avatar placeholder. Elegant, editorial feel.

For each template, test with sample data from the remotion_templates.props_schema.
Use /qa after building all 6.
```

### Prompt 7.2.3: Remaining Templates (6 specialized)

```
Use @frontend-developer. Build the remaining 6 templates.

7. TimelineGraphic.jsx — Horizontal timeline (long-form) or vertical (short-form). Events as dots on a line with date above and label below. Highlighted event is larger with accent glow. Connecting line uses gradient from muted to accent.

8. DataTable.jsx — Clean grid with alternating row shading. Header row in accent color. Highlighted column or row has accent border. Cell text aligned. Max 5 rows × 4 columns for readability. Feels like a premium financial report table.

9. BeforeAfter.jsx — Split screen with arrow in center. "Before" side uses muted/negative colors (red tint). "After" side uses accent/positive colors (green tint). Transformation label on the arrow. Values are large and prominent on each side.

10. PercentageRing.jsx — Large circular progress ring (SVG). Percentage number in center (Montserrat ExtraBold, 160px+). Ring fill uses accent color, track uses muted. Label below ring. Optional sublabel. Radial gradient glow behind ring.

11. MapVisual.jsx — Simplified SVG map (US states or world regions). Highlighted regions use accent fill. Non-highlighted use muted fill. Region labels with values. Title at top. This is a simplified artistic map, not a geographic data viz.

12. MetricHighlight.jsx — Row or 2x2 grid of KPI cards. Each card: value (large), label (small), optional trend arrow. Cards are GlassCard components. Grid layout auto-adjusts for 2-4 metrics. Most important metric gets accent treatment.

Test each template with all 7 color moods to verify visual consistency.
Use /qa after all 12 templates are complete.
Use /review for the full template library.
```

---

## Sub-Phase 7.3: Classification Workflow

**Objective:** Build WF_SCENE_CLASSIFY and integrate into pipeline.
**Agents:** `@prompt-engineer`, `@api-developer`

### Prompt 7.3.1: Classification Workflow

```
Use @prompt-engineer and @api-developer. Build WF_SCENE_CLASSIFY.

Read REMOTION_AGENT_MERGE.md — the full AI Classification Prompt and Data Payload Generation Prompt are there. Use them EXACTLY as written.

Build an n8n workflow:
1. Trigger: webhook POST /webhook/classify-scenes with body { topic_id }
2. Verify topic exists and topics.status = script_approved (Gate 2 passed)
3. Update topics SET classification_status = 'classifying'
4. Fetch all scenes for this topic, ordered by scene_number
5. Batch into groups of 30 scenes
6. For each batch, call Claude Haiku via OpenRouter with the AI Classification Prompt
   - Model: anthropic/claude-3.5-haiku
   - Temperature: 0.2 (low for consistent classification)
   - Include: niche, topic title, style_dna from project
   - Use WF_RETRY_WRAPPER for the API call
7. Parse JSON response. For each scene:
   - UPDATE scenes SET render_method, remotion_template, data_payload, classification_reasoning, classification_status = 'classified'
8. For Remotion scenes where data_payload is incomplete (missing required fields per props_schema):
   - Fetch the template's props_schema from remotion_templates table
   - Call Claude Haiku with the Data Payload Generation Prompt
   - Update data_payload with enriched data
9. Update topics SET classification_status = 'classified'
10. Log to production_logs: { stage: 'classification', scenes_classified: N, fal_ai_count: X, remotion_count: Y, cost: Z }

Handle malformed JSON: strip markdown fences, retry with "RESPOND ONLY WITH VALID JSON ARRAY" appended.
If all retries fail: default all scenes in the batch to render_method = 'fal_ai'.

Store as workflows/WF_SCENE_CLASSIFY.json.
Use /careful for the prompt — classification accuracy determines visual quality.
```

### Prompt 7.3.2: Modify Image Generation Workflow

```
Use @api-developer. Modify WF_IMAGE_GENERATION to split into Fal.ai + Remotion tracks.

Current flow: fetch all pending scenes → generate all via Fal.ai
New flow: fetch all pending scenes → split by render_method → parallel tracks

Track A (Fal.ai):
  SELECT * FROM scenes WHERE topic_id = X AND image_status = 'pending' AND render_method = 'fal_ai'
  For each: composition_prefix + image_prompt + style_dna → Fal.ai Seedream → upload → update image_url

Track B (Remotion):
  SELECT * FROM scenes WHERE topic_id = X AND image_status = 'pending' AND render_method = 'remotion'
  For each:
    1. POST to localhost:3100/render with { template_key: remotion_template, data_payload, color_mood, format, style_dna }
    2. Upload rendered PNG to Google Drive
    3. Update image_url, image_status = 'uploaded'

Both tracks run in parallel (n8n SplitInBatches or separate Execute Workflow nodes).
Both write to the same scenes table.
Downstream (Ken Burns, color grade, assembly) is UNCHANGED — it processes all scenes with image_status = 'uploaded' regardless of how the image was created.

Also add a pre-check: if topics.classification_status != 'reviewed', refuse to start.
This ensures the operator has reviewed and accepted the classification before images are generated.

Use /careful for the parallel execution logic.
```

---

## Sub-Phase 7.4: Dashboard Components

**Objective:** Build the SceneClassificationReview component and integrate into production flow.
**Agents:** `@frontend-developer`

### Prompt 7.4.1: SceneClassificationReview Component

```
Use @frontend-developer. Use the frontend-design skill — read SKILL.md first.
Read design-system/MASTER.md.

Build dashboard/src/components/production/SceneClassificationReview.jsx

This component is shown AFTER script approval and BEFORE image generation. It displays the AI classification results and lets the operator review/override.

Layout (read the wireframe in REMOTION_AGENT_MERGE.md "Classification Review on Dashboard" section):

1. SUMMARY BAR:
   - Total scenes count
   - Fal.ai count with blue badge
   - Remotion count with purple badge
   - Pie chart (small, Recharts) showing the split
   - Estimated image cost (Fal.ai count × $0.03)
   - Estimated savings vs all-Fal.ai

2. FILTER BAR:
   - Tabs: All | Fal.ai Only | Remotion Only
   - Search box (filter by narration text)

3. SCENE LIST:
   - Each row: scene number, render_method badge (blue "FAL.AI" or purple "REMOTION"), narration text (truncated, expandable), classification_reasoning (gray subtext)
   - For Remotion scenes additionally: template name badge, [Preview] button, [Edit Data] button
   - Each row has an override dropdown: [Override → Remotion ▾] or [Override → Fal.ai ▾]
   - Override to Remotion: opens inline template selector + data payload form
   - Override to Fal.ai: clears remotion_template and data_payload, sets classification_status = 'overridden'

4. REMOTION PREVIEW:
   - Clicking [Preview] calls POST /preview on render service
   - Shows a modal with the rendered PNG at actual dimensions
   - Below the preview: template name, data_payload as formatted JSON, color_mood badge

5. DATA EDITOR:
   - Clicking [Edit Data] opens a form-based editor (generated from props_schema)
   - Each field from props_schema becomes a form input (text, number, select, array)
   - Save updates data_payload in Supabase
   - Preview auto-refreshes after save

6. ACTION BUTTONS:
   - [Re-classify All] — triggers WF_SCENE_CLASSIFY again
   - [Accept & Proceed to Image Generation →] — updates topics.classification_status = 'reviewed', triggers WF_IMAGE_GENERATION

Use Supabase Realtime to show classification progress (scenes updating from 'pending' to 'classified' in real-time as the workflow runs).

Also build dashboard/src/hooks/useSceneClassification.js:
- Queries scenes for a topic with classification fields
- Provides mutation functions: overrideRenderMethod(sceneId, newMethod, template?, dataPayload?)
- Provides acceptClassification(topicId) — sets status to 'reviewed'
- Subscribes to Realtime on scenes table for live progress
```

### Prompt 7.4.2: Integrate into Production Flow

```
Use @frontend-developer. Wire SceneClassificationReview into the existing production flow.

1. Modify dashboard/src/pages/ProductionMonitor.jsx:
   - Add a new pipeline step between "Script Approved" and "Generating Images"
   - Step label: "Scene Classification"
   - Status colors: green (reviewed), yellow (classified, awaiting review), blue-spinning (classifying), gray (pending)
   - Clicking the step navigates to the classification review

2. Modify the production flow logic:
   - After Gate 2 (script approved), automatically trigger WF_SCENE_CLASSIFY via webhook
   - Dashboard shows SceneClassificationReview component
   - Image generation button is DISABLED until classification_status = 'reviewed'
   - The "Accept & Proceed" button on SceneClassificationReview is the trigger for image gen

3. For AUTO-PILOT mode:
   - If projects.auto_pilot_enabled = true AND classification completes without errors:
     Auto-accept classification (set reviewed) and trigger image gen
   - Auto-pilot trusts the AI classifier
   - Still logged: operator can review later

4. Modify dashboard/src/components/production/PipelineTable.jsx (or equivalent):
   - Add classification_status to the pipeline step visualization
   - Show Fal.ai/Remotion split counts inline

5. For SHORT-FORM production:
   - When shorts scenes are displayed in ShortsCreator.jsx, show render_method badge per scene
   - If shorts pipeline regenerates visuals, classification review appears for short-form scenes too

Use /qa then /review.
```

---

## Sub-Phase 7.5: Testing

**Objective:** Verify full hybrid pipeline end-to-end.
**Agents:** `@qa-engineer`

### Prompt 7.5.1: E2E Testing

```
Use @qa-engineer. Test the Remotion hybrid rendering pipeline.

TEST 1 — Classification Accuracy (Finance Niche):
- Create a test topic in the credit cards niche with 20 scenes
- Include: 5 scenes with specific dollar amounts/percentages, 3 comparison scenes,
  2 chart/data scenes, 2 quote scenes, 8 photorealistic scenes
- Run WF_SCENE_CLASSIFY
- Verify: the 12 data-heavy scenes are classified as 'remotion', the 8 photorealistic as 'fal_ai'
- Check classification_reasoning is coherent for each scene

TEST 2 — Classification Accuracy (Historical Niche):
- Create a test topic about World War 2 with 20 scenes
- Expect: mostly fal_ai (historical imagery), maybe 2-3 remotion (timeline, stat callout)
- Verify niche sensitivity: AI adapts classification to content type

TEST 3 — Dashboard Review:
- Load SceneClassificationReview for test topic
- Verify summary counts match
- Override 2 scenes (fal_ai → remotion, remotion → fal_ai)
- Verify overrides persist in Supabase
- Click "Accept & Proceed"
- Verify topics.classification_status changes to 'reviewed'

TEST 4 — Remotion Rendering:
- For the Remotion-classified scenes, verify render service produces valid PNGs
- Check each PNG: correct resolution (1920x1080 or 1080x1920), non-blank, text readable
- Compare visual style: Remotion renders should have matching color_mood treatment to Fal.ai images

TEST 5 — Full Pipeline Integration:
- Run full pipeline for 10 scenes (5 fal_ai + 5 remotion)
- Verify: classification → image gen (parallel tracks) → Ken Burns → color grade → assembly
- The final assembled video should look seamless — no visual discontinuity between Fal.ai and Remotion scenes

TEST 6 — Edge Cases:
- Empty data_payload for Remotion scene → should trigger Data Payload Generation prompt
- Remotion render service down → should fail gracefully, suggest override to fal_ai
- All scenes classified as fal_ai → should work (Remotion track has 0 scenes, no error)
- All scenes classified as remotion → should work (Fal.ai track has 0 scenes)
- Auto-pilot mode → classification should auto-accept

TEST 7 — Preview Function:
- Click Preview on 3 different Remotion templates
- Verify preview modal shows correct render
- Edit data_payload, save, preview again — verify update

Report: pass/fail per test, screenshots, any visual quality issues.
Use /qa per test. Use /review for final report.
```

---

## Quick Reference

| Sub-Phase | Prompts | Agents | gstack |
|-----------|---------|--------|--------|
| 7.1 Schema + Service | 7.1.1, 7.1.2 | `@devops-engineer` `@backend-architect` | `/careful` → `/qa` |
| 7.2 Templates | 7.2.1, 7.2.2, 7.2.3 | `@frontend-developer` | frontend-design → `/qa` → `/review` |
| 7.3 Classification | 7.3.1, 7.3.2 | `@prompt-engineer` `@api-developer` | `/careful` → `/qa` |
| 7.4 Dashboard | 7.4.1, 7.4.2 | `@frontend-developer` | frontend-design → `/qa` → `/review` |
| 7.5 Testing | 7.5.1 | `@qa-engineer` | `/qa` → `/review` → `/freeze` |

**Estimated time:** 6-8 hours across sessions.
**Dependencies:** Phases 1-6 (31-feature merge) must be complete first.
