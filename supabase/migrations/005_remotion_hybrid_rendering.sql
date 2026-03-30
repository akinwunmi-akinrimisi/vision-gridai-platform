-- ═══════════════════════════════════════════════════
-- Vision GridAI Platform — Migration 005: Remotion Hybrid Rendering
-- Adds scene classification (fal_ai vs remotion), structured data payloads,
-- and a template registry for Remotion data graphic rendering.
--
-- Run: psql -h localhost -p 54321 -U postgres -f 005_remotion_hybrid_rendering.sql
-- Or via Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════

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
    "transformation_label": { "type": "string", "description": "Text on the arrow between (e.g., ''6 months later'')" }
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
