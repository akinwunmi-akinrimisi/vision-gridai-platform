-- ═══════════════════════════════════════════════════════════════
-- Migration 018: Enable RLS on core tables from migration 001
-- These 7 tables were created before the RLS-by-default convention.
-- Adds open policies matching the 002+ pattern (anon key, single-user).
-- ═══════════════════════════════════════════════════════════════

-- projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'projects_all') THEN
    CREATE POLICY projects_all ON projects FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- niche_profiles
ALTER TABLE niche_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'niche_profiles' AND policyname = 'niche_profiles_all') THEN
    CREATE POLICY niche_profiles_all ON niche_profiles FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- prompt_configs
ALTER TABLE prompt_configs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prompt_configs' AND policyname = 'prompt_configs_all') THEN
    CREATE POLICY prompt_configs_all ON prompt_configs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- topics
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'topics' AND policyname = 'topics_all') THEN
    CREATE POLICY topics_all ON topics FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- avatars
ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'avatars' AND policyname = 'avatars_all') THEN
    CREATE POLICY avatars_all ON avatars FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- scenes
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scenes' AND policyname = 'scenes_all') THEN
    CREATE POLICY scenes_all ON scenes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- production_log
ALTER TABLE production_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'production_log' AND policyname = 'production_log_all') THEN
    CREATE POLICY production_log_all ON production_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Rollback:
-- DROP POLICY IF EXISTS projects_all ON projects; ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS niche_profiles_all ON niche_profiles; ALTER TABLE niche_profiles DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS prompt_configs_all ON prompt_configs; ALTER TABLE prompt_configs DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS topics_all ON topics; ALTER TABLE topics DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS avatars_all ON avatars; ALTER TABLE avatars DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS scenes_all ON scenes; ALTER TABLE scenes DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS production_log_all ON production_log; ALTER TABLE production_log DISABLE ROW LEVEL SECURITY;
