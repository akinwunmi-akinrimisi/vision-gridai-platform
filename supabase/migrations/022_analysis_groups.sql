-- ═══════════════════════════════════════════════════════════════
-- Migration 022: Analysis Groups — named folders for channel analyses
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS analysis_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  channels_count INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  has_viability_report BOOLEAN NOT NULL DEFAULT false,
  viability_score INTEGER CHECK (viability_score BETWEEN 0 AND 100),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analysis_groups_status ON analysis_groups(status);

ALTER TABLE analysis_groups ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analysis_groups' AND policyname = 'analysis_groups_all') THEN
    CREATE POLICY analysis_groups_all ON analysis_groups FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE analysis_groups REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE analysis_groups;

-- Add FK from channel_analyses to analysis_groups
ALTER TABLE channel_analyses
  ADD CONSTRAINT fk_channel_analyses_group
  FOREIGN KEY (analysis_group_id) REFERENCES analysis_groups(id) ON DELETE CASCADE;

-- Backfill: create group for existing analyses
INSERT INTO analysis_groups (id, name, channels_count, completed_count)
SELECT
  analysis_group_id,
  COALESCE(
    (SELECT channel_name FROM channel_analyses ca2
     WHERE ca2.analysis_group_id = ca.analysis_group_id AND ca2.status = 'completed'
     ORDER BY ca2.analyzed_at ASC LIMIT 1),
    'Unnamed Research'
  ) || ' Research',
  COUNT(*),
  COUNT(*) FILTER (WHERE status = 'completed')
FROM channel_analyses ca
WHERE analysis_group_id IS NOT NULL
GROUP BY analysis_group_id
ON CONFLICT (id) DO NOTHING;

-- Rollback:
-- ALTER TABLE channel_analyses DROP CONSTRAINT IF EXISTS fk_channel_analyses_group;
-- DROP TABLE IF EXISTS analysis_groups;
