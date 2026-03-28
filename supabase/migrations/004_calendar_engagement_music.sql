-- ═══════════════════════════════════════════════════
-- Vision GridAI Platform — Calendar, Engagement, Music, Renders, Production Logs
-- Content Calendar + Engagement Hub + Platform Metadata + Music Library + Renders + Logs
-- ═══════════════════════════════════════════════════

-- Scheduled posts for content calendar
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,  -- youtube | tiktok | instagram
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled',  -- scheduled | publishing | published | failed | cancelled
  published_at TIMESTAMPTZ,
  visibility TEXT DEFAULT 'unlisted',  -- public | unlisted | private
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Platform-specific metadata
CREATE TABLE IF NOT EXISTS platform_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,  -- youtube | tiktok | instagram
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  hashtags TEXT[],
  thumbnail_url TEXT,
  thumbnail_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(topic_id, platform)
);

-- Comment engagement tracking
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_comment_id TEXT,
  author TEXT,
  author_avatar_url TEXT,
  text TEXT NOT NULL,
  sentiment TEXT,  -- positive | negative | neutral
  intent_score NUMERIC(3,2) DEFAULT 0,  -- 0.00-1.00, higher = purchase/interest intent
  intent_signals TEXT[],  -- ['link_request', 'price_inquiry', 'purchase_intent']
  like_count INTEGER DEFAULT 0,
  replied BOOLEAN DEFAULT false,
  reply_text TEXT,
  replied_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Music library
CREATE TABLE IF NOT EXISTS music_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  mood_tags TEXT[],  -- ['tense', 'hopeful', 'triumphant', 'reflective']
  bpm INTEGER,
  duration_seconds INTEGER,
  file_url TEXT NOT NULL,
  file_drive_id TEXT,
  instrument_palette TEXT,  -- 'low cello drone, sparse piano'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Render outputs per platform
CREATE TABLE IF NOT EXISTS renders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  file_url TEXT,
  file_drive_id TEXT,
  file_size_bytes BIGINT,
  render_time_seconds INTEGER,
  crf INTEGER,
  preset TEXT,
  max_bitrate TEXT,
  audio_bitrate TEXT,
  resolution TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Production logs (per-video structured log)
CREATE TABLE IF NOT EXISTS production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,  -- tts | image_gen | ken_burns | color_grade | captions | assembly | render
  scene_number INTEGER,
  action TEXT NOT NULL,
  status TEXT NOT NULL,  -- started | completed | failed | retried
  duration_ms INTEGER,
  cost_usd NUMERIC(8,4),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-pilot configuration per project
ALTER TABLE projects ADD COLUMN IF NOT EXISTS auto_pilot_enabled BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS auto_pilot_topic_threshold NUMERIC(3,1) DEFAULT 8.0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS auto_pilot_script_threshold NUMERIC(3,1) DEFAULT 7.5;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS auto_pilot_default_visibility TEXT DEFAULT 'unlisted';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS monthly_budget_usd NUMERIC(8,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS monthly_spend_usd NUMERIC(8,2) DEFAULT 0;

-- Style DNA on projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS style_dna TEXT;

-- RLS for all new tables
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE renders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read scheduled_posts" ON scheduled_posts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service write scheduled_posts" ON scheduled_posts FOR ALL WITH CHECK (true);
CREATE POLICY "Authenticated read platform_metadata" ON platform_metadata FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service write platform_metadata" ON platform_metadata FOR ALL WITH CHECK (true);
CREATE POLICY "Authenticated read comments" ON comments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service write comments" ON comments FOR ALL WITH CHECK (true);
CREATE POLICY "Authenticated read music_library" ON music_library FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service write music_library" ON music_library FOR ALL WITH CHECK (true);
CREATE POLICY "Authenticated read renders" ON renders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service write renders" ON renders FOR ALL WITH CHECK (true);
CREATE POLICY "Authenticated read production_logs" ON production_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service write production_logs" ON production_logs FOR ALL WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_project ON scheduled_posts(project_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_platform_metadata_topic ON platform_metadata(topic_id);
CREATE INDEX IF NOT EXISTS idx_comments_topic ON comments(topic_id);
CREATE INDEX IF NOT EXISTS idx_comments_sentiment ON comments(sentiment);
CREATE INDEX IF NOT EXISTS idx_renders_topic ON renders(topic_id);
CREATE INDEX IF NOT EXISTS idx_production_logs_topic ON production_logs(topic_id);

-- Enable Realtime for dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE scheduled_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE production_logs;

-- REPLICA IDENTITY for UPDATE events
ALTER TABLE scheduled_posts REPLICA IDENTITY FULL;
ALTER TABLE comments REPLICA IDENTITY FULL;
ALTER TABLE production_logs REPLICA IDENTITY FULL;
