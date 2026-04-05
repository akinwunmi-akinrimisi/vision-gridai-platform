-- ================================================================
-- Migration 007: Grand Master Prompts Integration
-- ================================================================

-- 1. system_prompts table (universal prompts, not per-project)
CREATE TABLE IF NOT EXISTS system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_type TEXT NOT NULL UNIQUE,
  prompt_text TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE system_prompts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_prompts_open" ON system_prompts;
CREATE POLICY "system_prompts_open" ON system_prompts FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE system_prompts;

-- 2. New topic columns (from v3.0 §5.2 output)
ALTER TABLE topics ADD COLUMN IF NOT EXISTS core_domain_framework TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS primary_problem_trigger TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS target_audience_segment TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS psychographics TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS key_emotional_drivers TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS video_style_structure TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS content_angle_blue_ocean TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS viewer_search_intent TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS practical_takeaways TEXT;

-- 3. Expand playlists from 3 to 5
ALTER TABLE projects ADD COLUMN IF NOT EXISTS playlist4_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS playlist4_theme TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS playlist5_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS playlist5_theme TEXT;

-- 4. Script metadata for retry tracking (v1.0 §10)
ALTER TABLE topics ADD COLUMN IF NOT EXISTS script_metadata_extended JSONB;

-- 5. Richer avatar data from v3.0
ALTER TABLE avatars ADD COLUMN IF NOT EXISTS psychographics TEXT;
ALTER TABLE avatars ADD COLUMN IF NOT EXISTS key_emotional_drivers TEXT;
ALTER TABLE avatars ADD COLUMN IF NOT EXISTS target_audience_segment TEXT;
ALTER TABLE avatars ADD COLUMN IF NOT EXISTS viewer_search_intent TEXT;
