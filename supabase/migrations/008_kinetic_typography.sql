-- ================================================================
-- Migration 008: Kinetic Typography Engine
-- Adds dual production style support + kinetic-specific tables
-- ================================================================

-- 1. Production style per project (dual-style support)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS production_style TEXT DEFAULT 'ai_cinematic'
  CHECK (production_style IN ('ai_cinematic', 'kinetic_typography'));

-- 2. Kinetic-specific scene schema (separate from AI Cinematic scenes table)
CREATE TABLE IF NOT EXISTS kinetic_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,
  scene_type TEXT NOT NULL,  -- hook | comparison | list | statement | stats | quote | transition | cta | chapter_title
  duration_seconds NUMERIC(5,1) NOT NULL,
  chapter_number INTEGER,
  chapter_title TEXT,
  elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Each element: { text, style, animation, delay_ms, duration_ms, color_override, font_size_override }
  -- style: label | headline | accent | body | stat_value | stat_label | card_index | card_title | card_body | quote_text | quote_author | divider
  -- animation: fade_in | slide_up | typewriter | word_by_word | pop | slide_in_left | counter | line_draw
  render_status TEXT DEFAULT 'pending',  -- pending | rendering | rendered | failed
  frames_total INTEGER,
  frames_rendered INTEGER DEFAULT 0,
  audio_status TEXT DEFAULT 'pending',
  audio_file_url TEXT,
  audio_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(topic_id, scene_number)
);

CREATE INDEX IF NOT EXISTS idx_kinetic_scenes_topic ON kinetic_scenes(topic_id);
CREATE INDEX IF NOT EXISTS idx_kinetic_scenes_status ON kinetic_scenes(topic_id, render_status);

-- 3. Kinetic render job tracking
CREATE TABLE IF NOT EXISTS kinetic_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'queued',  -- queued | generating_script | rendering_frames | generating_tts | mixing_audio | assembling | uploading | complete | failed
  current_scene INTEGER,
  total_scenes INTEGER,
  total_frames INTEGER,
  frames_rendered INTEGER DEFAULT 0,
  render_start TIMESTAMPTZ,
  render_end TIMESTAMPTZ,
  output_file_url TEXT,
  output_drive_id TEXT,
  error_message TEXT,
  performance_log JSONB DEFAULT '{}'::jsonb,  -- { avg_frame_ms, total_render_s, file_size_mb }
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS policies (open for dashboard anon key)
ALTER TABLE kinetic_scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kinetic_scenes_open" ON kinetic_scenes FOR ALL USING (true);

ALTER TABLE kinetic_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kinetic_jobs_open" ON kinetic_jobs FOR ALL USING (true);

-- 5. Realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE kinetic_scenes;
ALTER PUBLICATION supabase_realtime ADD TABLE kinetic_jobs;

ALTER TABLE kinetic_scenes REPLICA IDENTITY FULL;
ALTER TABLE kinetic_jobs REPLICA IDENTITY FULL;
