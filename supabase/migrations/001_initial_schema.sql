-- ═══════════════════════════════════════════════════
-- Vision GridAI Platform — Initial Schema
-- Run: psql -h localhost -p 54321 -U postgres -f 001_initial_schema.sql
-- Or via Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════

-- See Agent.md Section 3 for full schema documentation.
-- This file is generated from Agent.md and should be kept in sync.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  niche TEXT NOT NULL,
  niche_description TEXT,
  channel_style TEXT DEFAULT '2hr_documentary',
  target_video_count INTEGER DEFAULT 25,
  niche_system_prompt TEXT,
  niche_expertise_profile TEXT,
  niche_red_ocean_topics TEXT[],
  niche_competitor_channels TEXT[],
  niche_pain_point_sources TEXT,
  niche_blue_ocean_strategy TEXT,
  playlist1_name TEXT,
  playlist1_theme TEXT,
  playlist2_name TEXT,
  playlist2_theme TEXT,
  playlist3_name TEXT,
  playlist3_theme TEXT,
  youtube_channel_id TEXT,
  youtube_playlist1_id TEXT,
  youtube_playlist2_id TEXT,
  youtube_playlist3_id TEXT,
  drive_root_folder_id TEXT,
  drive_assets_folder_id TEXT,
  script_approach TEXT DEFAULT '3_pass',
  images_per_video INTEGER DEFAULT 100,
  i2v_clips_per_video INTEGER DEFAULT 25,
  t2v_clips_per_video INTEGER DEFAULT 72,
  target_word_count INTEGER DEFAULT 19000,
  target_scene_count INTEGER DEFAULT 172,
  image_model TEXT DEFAULT 'seedream/seedream-4.5-text-to-image',
  image_cost DECIMAL(6,4) DEFAULT 0.032,
  i2v_model TEXT DEFAULT 'kling/v2-1-standard-image-to-video',
  i2v_cost DECIMAL(6,4) DEFAULT 0.125,
  t2v_model TEXT DEFAULT 'kling/v2-1-standard-text-to-video',
  t2v_cost DECIMAL(6,4) DEFAULT 0.125,
  status TEXT DEFAULT 'created',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Niche Profiles
CREATE TABLE IF NOT EXISTS niche_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  competitor_analysis JSONB,
  audience_pain_points JSONB,
  keyword_research JSONB,
  blue_ocean_opportunities JSONB,
  search_queries_used TEXT[],
  search_results_raw JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prompt Configs
CREATE TABLE IF NOT EXISTS prompt_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  prompt_type TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Topics
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  topic_number INTEGER NOT NULL,
  playlist_group INTEGER,
  playlist_angle TEXT,
  original_title TEXT,
  seo_title TEXT,
  narrative_hook TEXT,
  key_segments TEXT,
  estimated_cpm TEXT,
  viral_potential TEXT,
  review_status TEXT DEFAULT 'pending',
  review_feedback TEXT,
  refinement_history JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  last_status_change TIMESTAMPTZ DEFAULT now(),
  error_log TEXT,
  script_json JSONB,
  script_metadata JSONB,
  word_count INTEGER,
  scene_count INTEGER,
  script_attempts INTEGER DEFAULT 0,
  script_force_passed BOOLEAN DEFAULT false,
  script_quality_score DECIMAL(3,1),
  script_evaluation JSONB,
  script_pass_scores JSONB,
  script_review_status TEXT DEFAULT 'pending',
  script_review_feedback TEXT,
  audio_progress TEXT DEFAULT 'pending',
  images_progress TEXT DEFAULT 'pending',
  i2v_progress TEXT DEFAULT 'pending',
  t2v_progress TEXT DEFAULT 'pending',
  assembly_status TEXT DEFAULT 'pending',
  drive_folder_id TEXT,
  drive_subfolder_ids JSONB,
  drive_video_url TEXT,
  youtube_url TEXT,
  youtube_video_id TEXT,
  youtube_caption_id TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  video_review_status TEXT DEFAULT 'pending',
  video_review_feedback TEXT,
  total_cost DECIMAL(8,2),
  cost_breakdown JSONB,
  yt_views INTEGER DEFAULT 0,
  yt_watch_hours DECIMAL(8,2) DEFAULT 0,
  yt_avg_view_duration TEXT,
  yt_avg_view_pct DECIMAL(5,2),
  yt_ctr DECIMAL(5,2),
  yt_impressions INTEGER DEFAULT 0,
  yt_likes INTEGER DEFAULT 0,
  yt_comments INTEGER DEFAULT 0,
  yt_subscribers_gained INTEGER DEFAULT 0,
  yt_estimated_revenue DECIMAL(8,2) DEFAULT 0,
  yt_actual_cpm DECIMAL(6,2),
  yt_last_updated TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  supervisor_alerted BOOLEAN DEFAULT false,
  force_regenerate BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Avatars
CREATE TABLE IF NOT EXISTS avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  video_title_short TEXT,
  avatar_name_age TEXT,
  occupation_income TEXT,
  life_stage TEXT,
  pain_point TEXT,
  spending_profile TEXT,
  knowledge_level TEXT,
  emotional_driver TEXT,
  online_hangouts TEXT,
  objection TEXT,
  dream_outcome TEXT,
  review_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scenes
CREATE TABLE IF NOT EXISTS scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,
  scene_id TEXT NOT NULL,
  narration_text TEXT,
  image_prompt TEXT,
  visual_type TEXT,
  emotional_beat TEXT,
  chapter TEXT,
  audio_duration_ms INTEGER,
  audio_file_drive_id TEXT,
  audio_file_url TEXT,
  start_time_ms BIGINT,
  end_time_ms BIGINT,
  image_url TEXT,
  image_drive_id TEXT,
  video_url TEXT,
  video_drive_id TEXT,
  audio_status TEXT DEFAULT 'pending',
  image_status TEXT DEFAULT 'pending',
  video_status TEXT DEFAULT 'pending',
  clip_status TEXT DEFAULT 'pending',
  skipped BOOLEAN DEFAULT false,
  skip_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scenes_topic ON scenes(topic_id);
CREATE INDEX IF NOT EXISTS idx_scenes_status ON scenes(topic_id, audio_status);
CREATE INDEX IF NOT EXISTS idx_scenes_visual ON scenes(topic_id, visual_type);

-- Production Log
CREATE TABLE IF NOT EXISTS production_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  topic_id UUID REFERENCES topics(id),
  stage TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_log_topic ON production_log(topic_id);
CREATE INDEX IF NOT EXISTS idx_log_created ON production_log(created_at);

-- Enable Realtime for dashboard subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE scenes;
ALTER PUBLICATION supabase_realtime ADD TABLE topics;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE production_log;

-- Set REPLICA IDENTITY FULL for UPDATE events in Realtime
ALTER TABLE scenes REPLICA IDENTITY FULL;
ALTER TABLE topics REPLICA IDENTITY FULL;
ALTER TABLE projects REPLICA IDENTITY FULL;

