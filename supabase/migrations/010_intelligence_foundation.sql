-- Migration 010: Intelligence Foundation (Sprint S1 — CF01 + CF02 + CF03)
-- Depends on: 009_remove_remotion_kinetic.sql
--
-- Adds growth-intelligence scoring to topics and projects:
--   - CF01 Outlier Intelligence: outlier_score + algorithm_momentum per topic
--   - CF02 Topic SEO Scoring: seo_score + primary_keyword + keyword_variants per topic
--   - CF03 RPM Niche Intelligence: rpm_benchmarks lookup + per-project classification
--
-- Idempotent: safe to re-run (ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS,
-- ON CONFLICT DO NOTHING for seed data).
--
-- Rollback: see bottom of file (commented block).

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. ALTER topics — CF01 outlier + CF02 SEO scoring columns
-- ────────────────────────────────────────────────────────────────────────────

-- CF01: Outlier Intelligence
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS outlier_score INTEGER DEFAULT 50;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS algorithm_momentum VARCHAR(20) DEFAULT 'stable';
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS competing_videos_count INTEGER;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS outlier_ratio FLOAT;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS avg_views_top10 BIGINT;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS outlier_reasoning TEXT;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS outlier_data_available BOOLEAN DEFAULT true;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS outlier_scored_at TIMESTAMPTZ;

-- CF02: Topic SEO Scoring
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS seo_score INTEGER DEFAULT 50;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS seo_classification VARCHAR(20);
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS primary_keyword VARCHAR(200);
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS keyword_variants JSONB;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS search_volume_proxy INTEGER;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS competition_level VARCHAR(10);
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS seo_opportunity_summary TEXT;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS seo_scored_at TIMESTAMPTZ;

-- Constraint: algorithm_momentum must be one of three values (enforces prompt contract)
DO $$ BEGIN
  ALTER TABLE public.topics
    ADD CONSTRAINT topics_algorithm_momentum_chk
    CHECK (algorithm_momentum IN ('accelerating', 'stable', 'decelerating'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.topics
    ADD CONSTRAINT topics_seo_classification_chk
    CHECK (seo_classification IS NULL OR seo_classification IN
      ('blue-ocean', 'competitive', 'red-ocean', 'dead-sea'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index: Gate 1 sorts by combined outlier*0.6 + seo*0.4
CREATE INDEX IF NOT EXISTS idx_topics_intelligence_scores
  ON public.topics (project_id, outlier_score DESC, seo_score DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. ALTER projects — CF03 RPM classification columns
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS niche_rpm_category VARCHAR(50);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS estimated_rpm_low FLOAT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS estimated_rpm_mid FLOAT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS estimated_rpm_high FLOAT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS revenue_potential_score INTEGER;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS rpm_classified_at TIMESTAMPTZ;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. CREATE rpm_benchmarks — static RPM lookup table (12 niche seed)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rpm_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  rpm_low FLOAT NOT NULL,
  rpm_mid FLOAT NOT NULL,
  rpm_high FLOAT NOT NULL,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.rpm_benchmarks (category, display_name, rpm_low, rpm_mid, rpm_high, notes) VALUES
  ('finance',         'Finance',              12,   22,   35,   'General personal finance, investing, markets'),
  ('credit_cards',    'Credit Cards',         18,   28,   45,   'Highest premium advertiser category; rewards/travel subniches peak'),
  ('insurance',       'Insurance',            15,   25,   40,   'Life / auto / health subniches all high-value'),
  ('health_wellness', 'Health & Wellness',     8,   14,   22,   'Nutrition, fitness, supplements; medical subniches higher'),
  ('software_saas',   'Software / SaaS',      10,   18,   30,   'B2B tools, dev tools, productivity'),
  ('education',       'Education',             5,    9,   14,   'K-12, higher ed, online courses'),
  ('business',        'Business',              8,   15,   25,   'Entrepreneurship, small business, career'),
  ('gaming',          'Gaming',                1,    2.5,  5,   'Low CPM despite high engagement; ad-blocker heavy audience'),
  ('entertainment',   'Entertainment',         1,    2,    4,   'Pop culture, reaction, comedy; lowest premium ad fit'),
  ('travel',          'Travel',                3,    6,   10,   'Seasonal RPM swings; luxury travel peaks higher'),
  ('cooking',         'Cooking',               2,    4,    8,   'Kitchen gear affiliate upside offsets modest ad RPM'),
  ('tech_reviews',    'Tech Reviews',          5,   10,   18,   'Consumer electronics, gadgets, phone reviews')
ON CONFLICT (category) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. CREATE keywords — CF02 broader keyword research table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  keyword VARCHAR(300) NOT NULL,
  normalized_keyword VARCHAR(300) NOT NULL,  -- lowercase, trimmed
  search_volume_proxy INTEGER,
  autocomplete_hits INTEGER,
  competing_videos_count INTEGER,
  competition_level VARCHAR(10),
  opportunity_score INTEGER,
  seo_classification VARCHAR(20),
  related_keywords JSONB,                    -- array of {keyword, autocomplete_hits}
  trend_signal VARCHAR(20),                  -- rising | stable | declining | null
  source VARCHAR(30) DEFAULT 'keyword_scan', -- keyword_scan | topic_seo | niche_research
  times_used_in_topics INTEGER DEFAULT 0,
  last_scanned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, normalized_keyword)
);

CREATE INDEX IF NOT EXISTS idx_keywords_project
  ON public.keywords (project_id, opportunity_score DESC);

CREATE INDEX IF NOT EXISTS idx_keywords_last_scanned
  ON public.keywords (project_id, last_scanned_at DESC);

DO $$ BEGIN
  ALTER TABLE public.keywords
    ADD CONSTRAINT keywords_competition_level_chk
    CHECK (competition_level IS NULL OR competition_level IN ('low', 'medium', 'high'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.keywords
    ADD CONSTRAINT keywords_seo_classification_chk
    CHECK (seo_classification IS NULL OR seo_classification IN
      ('blue-ocean', 'competitive', 'red-ocean', 'dead-sea'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. CREATE topic_keywords — junction table linking topics to researched keywords
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.topic_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  keyword_id UUID NOT NULL REFERENCES public.keywords(id) ON DELETE CASCADE,
  relevance_score INTEGER,                   -- 0-100; how central the keyword is to this topic
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(topic_id, keyword_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_keywords_topic
  ON public.topic_keywords (topic_id);

CREATE INDEX IF NOT EXISTS idx_topic_keywords_keyword
  ON public.topic_keywords (keyword_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 6. RLS — anon open (dashboard uses anon key without auth, per MEMORY pattern)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.rpm_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_keywords ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY rpm_benchmarks_all ON public.rpm_benchmarks FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY keywords_all ON public.keywords FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY topic_keywords_all ON public.topic_keywords FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Realtime — enable for keyword + topic_keyword changes (topics/projects already on publication from migration 001)
-- ────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.keywords;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.topic_keywords;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.keywords       REPLICA IDENTITY FULL;
ALTER TABLE public.topic_keywords REPLICA IDENTITY FULL;

COMMIT;

-- ────────────────────────────────────────────────────────────────────────────
-- Rollback (run manually if needed):
--
-- BEGIN;
-- DROP TABLE IF EXISTS public.topic_keywords CASCADE;
-- DROP TABLE IF EXISTS public.keywords       CASCADE;
-- DROP TABLE IF EXISTS public.rpm_benchmarks CASCADE;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS rpm_classified_at;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS revenue_potential_score;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS estimated_rpm_high;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS estimated_rpm_mid;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS estimated_rpm_low;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS niche_rpm_category;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS seo_scored_at;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS seo_opportunity_summary;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS competition_level;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS search_volume_proxy;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS keyword_variants;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS primary_keyword;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS seo_classification;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS seo_score;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS outlier_scored_at;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS outlier_data_available;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS outlier_reasoning;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS avg_views_top10;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS outlier_ratio;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS competing_videos_count;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS algorithm_momentum;
-- ALTER TABLE public.topics   DROP COLUMN IF EXISTS outlier_score;
-- COMMIT;
