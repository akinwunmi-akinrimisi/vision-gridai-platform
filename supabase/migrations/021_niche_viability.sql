-- ═══════════════════════════════════════════════════════════════
-- Migration 021: Niche Viability + Competitor Discovery
--
-- After analyzing one channel, auto-discover top 10 competitors,
-- run niche viability scoring (0-100), blue-ocean/moat analysis,
-- revenue projections, and saturated topics to avoid.
-- ═══════════════════════════════════════════════════════════════

-- 1. Discovered channels (staging before user confirms deep analysis)
CREATE TABLE IF NOT EXISTS discovered_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_group_id UUID NOT NULL,
  source_channel_analysis_id UUID REFERENCES channel_analyses(id) ON DELETE CASCADE,

  youtube_channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_url TEXT,
  channel_handle TEXT,
  subscriber_count INTEGER,
  total_view_count BIGINT,
  video_count INTEGER,
  avg_views_per_video INTEGER,
  discovery_method TEXT CHECK (discovery_method IN ('keyword_search', 'related_channels', 'tag_match', 'manual')),
  discovery_rank INTEGER,
  relevance_score INTEGER CHECK (relevance_score BETWEEN 0 AND 100),

  analysis_depth TEXT NOT NULL DEFAULT 'quick'
    CHECK (analysis_depth IN ('quick', 'medium', 'deep')),
  analysis_status TEXT NOT NULL DEFAULT 'discovered'
    CHECK (analysis_status IN ('discovered', 'analyzing', 'completed', 'skipped', 'failed')),
  channel_analysis_id UUID REFERENCES channel_analyses(id) ON DELETE SET NULL,

  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(analysis_group_id, youtube_channel_id)
);

CREATE INDEX IF NOT EXISTS idx_discovered_channels_group ON discovered_channels(analysis_group_id);
CREATE INDEX IF NOT EXISTS idx_discovered_channels_status ON discovered_channels(analysis_status);

ALTER TABLE discovered_channels ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'discovered_channels' AND policyname = 'discovered_channels_all') THEN
    CREATE POLICY discovered_channels_all ON discovered_channels FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE discovered_channels REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE discovered_channels;

-- 2. Niche viability reports (one per analysis group after all channels analyzed)
CREATE TABLE IF NOT EXISTS niche_viability_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_group_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  channels_analyzed INTEGER NOT NULL,
  total_subscribers BIGINT,
  total_monthly_views BIGINT,

  -- Niche Viability Score (0-100, weighted)
  viability_score INTEGER NOT NULL CHECK (viability_score BETWEEN 0 AND 100),
  viability_verdict TEXT NOT NULL CHECK (viability_verdict IN ('strong_opportunity', 'moderate_opportunity', 'weak_opportunity', 'avoid')),
  viability_reasoning TEXT,

  -- 4 weighted factors (each 0-100)
  monetization_score INTEGER CHECK (monetization_score BETWEEN 0 AND 100),
  monetization_breakdown JSONB,
  audience_demand_score INTEGER CHECK (audience_demand_score BETWEEN 0 AND 100),
  audience_demand_breakdown JSONB,
  competition_gap_score INTEGER CHECK (competition_gap_score BETWEEN 0 AND 100),
  competition_gap_breakdown JSONB,
  entry_difficulty_score INTEGER CHECK (entry_difficulty_score BETWEEN 0 AND 100),
  entry_difficulty_breakdown JSONB,

  -- Monetization estimates
  estimated_rpm_low NUMERIC(6,2),
  estimated_rpm_mid NUMERIC(6,2),
  estimated_rpm_high NUMERIC(6,2),
  ad_category TEXT,
  sponsorship_potential TEXT CHECK (sponsorship_potential IN ('high', 'medium', 'low', 'none')),

  -- Blue-ocean strategy
  blue_ocean_opportunities JSONB NOT NULL DEFAULT '[]'::jsonb,
  saturated_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_angle TEXT,
  recommended_content_pillars TEXT[],
  differentiation_strategy TEXT,

  -- Moat analysis
  moat_indicators JSONB,
  defensibility_assessment TEXT,

  -- Revenue projections
  revenue_projections JSONB,

  -- Audience insights
  audience_size_estimate TEXT,
  engagement_benchmarks JSONB,
  audience_demographics TEXT,

  -- Script/content targets derived from competitor analysis
  script_depth_targets JSONB,
  title_dna_patterns JSONB,
  thumbnail_dna_patterns JSONB,
  posting_frequency_benchmark TEXT,

  -- Topics to avoid + recommended topics
  topics_to_avoid TEXT[] NOT NULL DEFAULT '{}',
  recommended_topics JSONB NOT NULL DEFAULT '[]'::jsonb,

  analysis_cost_usd NUMERIC(8,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_niche_viability_group ON niche_viability_reports(analysis_group_id);
CREATE INDEX IF NOT EXISTS idx_niche_viability_project ON niche_viability_reports(project_id);

ALTER TABLE niche_viability_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'niche_viability_reports' AND policyname = 'niche_viability_reports_all') THEN
    CREATE POLICY niche_viability_reports_all ON niche_viability_reports FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE niche_viability_reports REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE niche_viability_reports;

-- 3. Projects columns for viability data downstream
ALTER TABLE projects ADD COLUMN IF NOT EXISTS niche_viability_score INTEGER CHECK (niche_viability_score BETWEEN 0 AND 100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS niche_viability_verdict TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS topics_to_avoid TEXT[];
ALTER TABLE projects ADD COLUMN IF NOT EXISTS recommended_topics JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS recommended_angle TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS revenue_projections JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS script_depth_targets JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS title_dna_patterns JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS thumbnail_dna_patterns JSONB;

-- Rollback:
-- DROP TABLE IF EXISTS niche_viability_reports;
-- DROP TABLE IF EXISTS discovered_channels;
-- ALTER TABLE projects DROP COLUMN IF EXISTS niche_viability_score, DROP COLUMN IF EXISTS niche_viability_verdict, DROP COLUMN IF EXISTS topics_to_avoid, DROP COLUMN IF EXISTS recommended_topics, DROP COLUMN IF EXISTS recommended_angle, DROP COLUMN IF EXISTS revenue_projections, DROP COLUMN IF EXISTS script_depth_targets, DROP COLUMN IF EXISTS title_dna_patterns, DROP COLUMN IF EXISTS thumbnail_dna_patterns;
