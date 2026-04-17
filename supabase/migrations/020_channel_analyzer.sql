-- ═══════════════════════════════════════════════════════════════
-- Migration 020: Channel Analyzer
--
-- Standalone channel analysis tool. Analyze any YouTube channel,
-- compare multiple channels, identify blue-ocean gaps, then
-- optionally create a project pre-loaded with competitive intel.
-- ═══════════════════════════════════════════════════════════════

-- 1. Channel analyses (standalone, linked to project when created)
CREATE TABLE IF NOT EXISTS channel_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  youtube_channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_url TEXT NOT NULL,
  channel_description TEXT,
  channel_avatar_url TEXT,
  channel_banner_url TEXT,
  country TEXT,
  custom_url TEXT,

  subscriber_count INTEGER,
  total_view_count BIGINT,
  video_count INTEGER,
  channel_created_at TIMESTAMPTZ,

  avg_views_per_video INTEGER,
  median_views_per_video INTEGER,
  upload_frequency_days NUMERIC(5,1),
  avg_video_duration_seconds INTEGER,
  estimated_monthly_views BIGINT,
  growth_trajectory TEXT CHECK (growth_trajectory IN ('accelerating', 'stable', 'decelerating', 'dormant')),

  primary_topics TEXT[],
  content_style TEXT,
  target_audience_description TEXT,
  title_patterns JSONB,
  thumbnail_patterns JSONB,
  scripting_depth JSONB,
  posting_schedule TEXT,

  top_videos JSONB NOT NULL DEFAULT '[]'::jsonb,

  strengths TEXT[],
  weaknesses TEXT[],
  blue_ocean_opportunities JSONB,
  content_saturation_map JSONB,

  verdict TEXT CHECK (verdict IN ('strong_opportunity', 'moderate_opportunity', 'weak_opportunity', 'avoid')),
  verdict_reasoning TEXT,
  verdict_score INTEGER CHECK (verdict_score BETWEEN 0 AND 100),

  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  analysis_group_id UUID,

  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  analysis_duration_seconds INTEGER,
  analysis_cost_usd NUMERIC(8,4),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_channel_analyses_status ON channel_analyses(status);
CREATE INDEX IF NOT EXISTS idx_channel_analyses_group ON channel_analyses(analysis_group_id);
CREATE INDEX IF NOT EXISTS idx_channel_analyses_project ON channel_analyses(project_id);

ALTER TABLE channel_analyses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'channel_analyses' AND policyname = 'channel_analyses_all') THEN
    CREATE POLICY channel_analyses_all ON channel_analyses FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE channel_analyses REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE channel_analyses;

-- 2. Multi-channel comparison reports
CREATE TABLE IF NOT EXISTS channel_comparison_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_group_id UUID NOT NULL,

  channel_analysis_ids UUID[] NOT NULL,

  combined_topic_landscape JSONB,
  combined_blue_ocean_gaps JSONB,
  combined_saturation_map JSONB,
  differentiation_strategy TEXT,
  recommended_niche_description TEXT,
  recommended_content_pillars TEXT[],

  overall_verdict TEXT CHECK (overall_verdict IN ('strong_opportunity', 'moderate_opportunity', 'weak_opportunity', 'avoid')),
  overall_verdict_reasoning TEXT,
  overall_verdict_score INTEGER CHECK (overall_verdict_score BETWEEN 0 AND 100),

  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_channel_comparison_group ON channel_comparison_reports(analysis_group_id);

ALTER TABLE channel_comparison_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'channel_comparison_reports' AND policyname = 'channel_comparison_reports_all') THEN
    CREATE POLICY channel_comparison_reports_all ON channel_comparison_reports FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. Projects columns for downstream injection
ALTER TABLE projects ADD COLUMN IF NOT EXISTS channel_analysis_context JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS script_reference_data JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS analysis_group_id UUID;

-- Rollback:
-- DROP TABLE IF EXISTS channel_comparison_reports;
-- DROP TABLE IF EXISTS channel_analyses;
-- ALTER TABLE projects DROP COLUMN IF EXISTS channel_analysis_context;
-- ALTER TABLE projects DROP COLUMN IF EXISTS script_reference_data;
-- ALTER TABLE projects DROP COLUMN IF EXISTS analysis_group_id;
