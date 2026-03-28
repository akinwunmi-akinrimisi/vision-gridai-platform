-- ═══════════════════════════════════════════════════
-- Vision GridAI Platform — Topic Intelligence Tables
-- Run: psql -h localhost -p 54321 -U postgres -f 002_research_tables.sql
-- Or via Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════

-- Research Runs (one row per research execution)
CREATE TABLE IF NOT EXISTS research_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',  -- pending | scraping | categorizing | complete | failed
  sources_completed INTEGER DEFAULT 0,
  total_results INTEGER DEFAULT 0,
  total_categories INTEGER DEFAULT 0,
  lookback_days INTEGER DEFAULT 7,
  derived_keywords TEXT[],
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_log JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE research_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read research_runs" ON research_runs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service insert research_runs" ON research_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update research_runs" ON research_runs FOR UPDATE USING (true);

-- Research Results (individual scraped items, 10 per source × 5 sources = 50 per run)
CREATE TABLE IF NOT EXISTS research_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES research_runs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL,  -- reddit | youtube | tiktok | google_trends | quora
  raw_text TEXT NOT NULL,
  source_url TEXT NOT NULL,
  engagement_score INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  posted_at TIMESTAMPTZ,
  ai_video_title TEXT,
  category_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE research_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read research_results" ON research_results FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service insert research_results" ON research_results FOR INSERT WITH CHECK (true);

-- Research Categories (AI-generated clusters from categorization pass)
CREATE TABLE IF NOT EXISTS research_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES research_runs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  summary TEXT,
  total_engagement INTEGER DEFAULT 0,
  result_count INTEGER DEFAULT 0,
  rank INTEGER,
  top_video_title TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE research_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read research_categories" ON research_categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service insert research_categories" ON research_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update research_categories" ON research_categories FOR UPDATE USING (true);

-- FK from research_results to research_categories
ALTER TABLE research_results ADD CONSTRAINT fk_research_category
  FOREIGN KEY (category_id) REFERENCES research_categories(id) ON DELETE SET NULL;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_research_runs_project ON research_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_research_results_run ON research_results(run_id);
CREATE INDEX IF NOT EXISTS idx_research_results_source ON research_results(source);
CREATE INDEX IF NOT EXISTS idx_research_categories_run ON research_categories(run_id);
CREATE INDEX IF NOT EXISTS idx_research_categories_rank ON research_categories(run_id, rank);

-- Enable Realtime for dashboard subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE research_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE research_categories;

-- Set REPLICA IDENTITY FULL for UPDATE events
ALTER TABLE research_runs REPLICA IDENTITY FULL;
ALTER TABLE research_categories REPLICA IDENTITY FULL;

-- Engagement Score Normalization Reference:
-- Reddit:        engagement_score = upvotes + (comments * 2)
-- YouTube:       engagement_score = likes + (replies * 3)
-- TikTok:        engagement_score = likes + (comments * 2) + (shares * 3)
-- Google Trends: engagement_score = search_interest_index * 10 (0-1000 scale)
-- Quora:         engagement_score = follows + (answers * 2)
