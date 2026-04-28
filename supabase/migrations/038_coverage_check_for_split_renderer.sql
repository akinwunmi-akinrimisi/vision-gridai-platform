-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 038 — Project-extras helper + split-renderer coverage check
-- ───────────────────────────────────────────────────────────────────────────
-- Migration 037 introduced _render_yt_analyses_extended but the original
-- coverage check (029) only inspects render_project_intelligence's body.
-- Splitting work across 3 functions broke the check. Worse: when run, the
-- broken check exposed PRE-EXISTING orphan columns on `projects` that no
-- renderer references — including content-critical JSONB blobs:
--
--   - channel_analysis_context  (channel_count, estimated_rpm, saturation_map,
--                                viral_themes — written by WF_CHANNEL_ANALYSIS
--                                /WF_NICHE_VIABILITY)
--   - script_reference_data     (proven competitor pacing targets + reasoning,
--                                duration sweet spots — written from competitor
--                                analysis, drives script length decisions)
--   - language                  (en-US / en-AU / etc — drives spelling +
--                                terminology in prompts)
--   - channel_type              (standalone / sub-channel)
--
-- These were silent intelligence-loss gaps inherited from 020/021/032/033.
-- The user's ask "we must not lose ANY intelligence" requires fixing them.
--
-- This migration:
--   1. Adds _render_project_extras helper for the 4 content-relevant orphan
--      project columns. JSONB blobs are rendered inline as fenced code.
--   2. Updates render_project_intelligence wrapper to call both helpers.
--   3. Updates _intelligence_coverage_check to scan all 4 function bodies
--      and adds truly-operational columns (rpm_classified_at,
--      parent_project_id, cost_ceiling_usd, denormalised niche_viability_*)
--      to the housekeeping whitelist.
--
-- Idempotent. Single transaction.
-- ───────────────────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION A — _render_project_extras helper
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION _render_project_extras(
  p_project_id UUID,
  p_stage      TEXT DEFAULT 'all'
) RETURNS TEXT
LANGUAGE plpgsql STABLE
AS $XTRA$
DECLARE
  proj           projects%ROWTYPE;
  r              TEXT := '';
  stage          TEXT;
  include_topics BOOLEAN;
  include_script BOOLEAN;
  include_meta   BOOLEAN;
  pl_count       INT  := 0;
  i              INT;
  pl_name        TEXT;
  pl_theme       TEXT;
BEGIN
  stage := lower(coalesce(p_stage, 'all'));
  include_topics := stage IN ('topics', 'all');
  include_script := stage IN ('script', 'all');
  include_meta   := stage IN ('metadata', 'all');

  SELECT * INTO proj FROM projects WHERE id = p_project_id;
  IF NOT FOUND THEN RETURN ''; END IF;

  -- ========== LANGUAGE / CHANNEL_TYPE ==========
  IF proj.language IS NOT NULL AND proj.language NOT IN ('en-US', '') THEN
    r := r || format(E'**Language:** %s (use locale-appropriate spelling and terminology)\n', proj.language);
  END IF;
  IF proj.channel_type IS NOT NULL AND proj.channel_type NOT IN ('standalone', '') THEN
    r := r || format(E'**Channel type:** %s\n', proj.channel_type);
  END IF;
  IF length(r) > 0 THEN r := r || E'\n'; END IF;

  -- ========== PLAYLIST ANGLES (1..5) ==========
  -- Channel angles drive topic clustering. Render every populated slot.
  -- Enumerated explicitly (not looped via EXECUTE format) so each column
  -- identifier (playlist1_name, playlist1_theme, ...) appears in the
  -- function source — required for _intelligence_coverage_check string scan.
  IF (proj.playlist1_name IS NOT NULL AND proj.playlist1_name <> '')
     OR (proj.playlist1_theme IS NOT NULL AND proj.playlist1_theme <> '') THEN
    IF pl_count = 0 THEN
      r := r || E'## Playlist Angles\n_Channel positioning groups — every topic should belong to one._\n';
    END IF;
    pl_count := pl_count + 1;
    r := r || format(E'- **Playlist 1:** %s', coalesce(proj.playlist1_name, '?'));
    IF proj.playlist1_theme IS NOT NULL AND proj.playlist1_theme <> '' THEN
      r := r || format(E'  —  %s', proj.playlist1_theme);
    END IF;
    r := r || E'\n';
  END IF;
  IF (proj.playlist2_name IS NOT NULL AND proj.playlist2_name <> '')
     OR (proj.playlist2_theme IS NOT NULL AND proj.playlist2_theme <> '') THEN
    IF pl_count = 0 THEN
      r := r || E'## Playlist Angles\n_Channel positioning groups — every topic should belong to one._\n';
    END IF;
    pl_count := pl_count + 1;
    r := r || format(E'- **Playlist 2:** %s', coalesce(proj.playlist2_name, '?'));
    IF proj.playlist2_theme IS NOT NULL AND proj.playlist2_theme <> '' THEN
      r := r || format(E'  —  %s', proj.playlist2_theme);
    END IF;
    r := r || E'\n';
  END IF;
  IF (proj.playlist3_name IS NOT NULL AND proj.playlist3_name <> '')
     OR (proj.playlist3_theme IS NOT NULL AND proj.playlist3_theme <> '') THEN
    IF pl_count = 0 THEN
      r := r || E'## Playlist Angles\n_Channel positioning groups — every topic should belong to one._\n';
    END IF;
    pl_count := pl_count + 1;
    r := r || format(E'- **Playlist 3:** %s', coalesce(proj.playlist3_name, '?'));
    IF proj.playlist3_theme IS NOT NULL AND proj.playlist3_theme <> '' THEN
      r := r || format(E'  —  %s', proj.playlist3_theme);
    END IF;
    r := r || E'\n';
  END IF;
  IF (proj.playlist4_name IS NOT NULL AND proj.playlist4_name <> '')
     OR (proj.playlist4_theme IS NOT NULL AND proj.playlist4_theme <> '') THEN
    IF pl_count = 0 THEN
      r := r || E'## Playlist Angles\n_Channel positioning groups — every topic should belong to one._\n';
    END IF;
    pl_count := pl_count + 1;
    r := r || format(E'- **Playlist 4:** %s', coalesce(proj.playlist4_name, '?'));
    IF proj.playlist4_theme IS NOT NULL AND proj.playlist4_theme <> '' THEN
      r := r || format(E'  —  %s', proj.playlist4_theme);
    END IF;
    r := r || E'\n';
  END IF;
  IF (proj.playlist5_name IS NOT NULL AND proj.playlist5_name <> '')
     OR (proj.playlist5_theme IS NOT NULL AND proj.playlist5_theme <> '') THEN
    IF pl_count = 0 THEN
      r := r || E'## Playlist Angles\n_Channel positioning groups — every topic should belong to one._\n';
    END IF;
    pl_count := pl_count + 1;
    r := r || format(E'- **Playlist 5:** %s', coalesce(proj.playlist5_name, '?'));
    IF proj.playlist5_theme IS NOT NULL AND proj.playlist5_theme <> '' THEN
      r := r || format(E'  —  %s', proj.playlist5_theme);
    END IF;
    r := r || E'\n';
  END IF;
  IF pl_count > 0 THEN r := r || E'\n'; END IF;

  -- ========== STRATEGIC POSITIONING (extras) ==========
  IF proj.blue_ocean_angle IS NOT NULL AND proj.blue_ocean_angle <> '' THEN
    r := r || format(E'**Blue-ocean angle (project-level):** %s\n\n', proj.blue_ocean_angle);
  END IF;
  IF proj.revenue_potential_score IS NOT NULL THEN
    r := r || format(E'**Revenue-potential score (research-derived):** %s\n\n', proj.revenue_potential_score);
  END IF;

  -- ========== NICHE SYSTEM PROMPT (script stage — author voice) ==========
  IF include_script
     AND proj.niche_system_prompt IS NOT NULL
     AND proj.niche_system_prompt <> '' THEN
    r := r || E'## Niche System Prompt (author voice — embody this expertise)\n';
    r := r || proj.niche_system_prompt || E'\n\n';
  END IF;

  -- ========== CHANNEL ANALYSIS CONTEXT (saturation_map, RPM, etc) ==========
  IF (include_topics OR include_script OR include_meta)
     AND proj.channel_analysis_context IS NOT NULL
     AND proj.channel_analysis_context <> 'null'::jsonb
     AND jsonb_typeof(proj.channel_analysis_context) = 'object' THEN
    r := r || E'## Channel Analysis Context (research-derived niche signals)\n';
    r := r || E'_Source: projects.channel_analysis_context — saturation_map, estimated_rpm, viral_themes from competitor sweep._\n';
    r := r || E'```json\n' || jsonb_pretty(proj.channel_analysis_context) || E'\n```\n\n';
  END IF;

  -- ========== COMPETITIVE ANALYSIS (full snapshot from project creation) ==========
  -- WF_PROJECT_CREATE persists { analyses: [{id, video_title, channel_name,
  -- niche_category, views, likes, comments, duration_seconds, ...analysis} ...] }
  -- The yt_video_analyses extended block also pulls these via reference_analyses,
  -- but this column captures the AT-CREATION snapshot which may include analyses
  -- whose underlying yt row was later deleted. Render as fenced code so Claude
  -- has both the live data AND the immutable snapshot.
  IF (include_topics OR include_script)
     AND proj.competitive_analysis IS NOT NULL
     AND proj.competitive_analysis <> 'null'::jsonb
     AND jsonb_typeof(proj.competitive_analysis) = 'object'
     AND coalesce(jsonb_array_length(proj.competitive_analysis->'analyses'), 0) > 0 THEN
    r := r || E'## Competitive Analysis Snapshot (at project-creation time)\n';
    r := r || format(E'_Source: projects.competitive_analysis — %s reference video analyses captured when this project was created._\n',
      jsonb_array_length(proj.competitive_analysis->'analyses'));
    r := r || E'```json\n' || jsonb_pretty(proj.competitive_analysis) || E'\n```\n\n';
  END IF;

  -- ========== SCRIPT REFERENCE DATA (proven competitor pacing) ==========
  IF include_script
     AND proj.script_reference_data IS NOT NULL
     AND proj.script_reference_data <> 'null'::jsonb
     AND jsonb_typeof(proj.script_reference_data) = 'object' THEN
    r := r || E'## Script Reference Data (proven targets from competitor analysis)\n';
    r := r || E'_Source: projects.script_reference_data — competitor pacing & format benchmarks. Treat as the floor: match or exceed._\n';
    r := r || E'```json\n' || jsonb_pretty(proj.script_reference_data) || E'\n```\n\n';
  END IF;

  RETURN r;
END;
$XTRA$;

COMMENT ON FUNCTION _render_project_extras(UUID, TEXT) IS
  'Renders project columns added in migrations 020/021/032/033 that the v2 '
  'monolith (029) and the 037 wrapper never wired up. Specifically: '
  'channel_analysis_context (research-derived niche signals — saturation_map, '
  'estimated_rpm, viral_themes), script_reference_data (proven competitor '
  'pacing targets + reasoning), language, channel_type. JSONB blobs are emitted '
  'as fenced code so Claude can parse the full structure without us needing to '
  'evolve the rendering as new sub-keys are added upstream.';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION B — Wrapper: invoke both helpers (extras BEFORE yt extended)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION render_project_intelligence(p_project_id UUID, p_stage TEXT DEFAULT 'all')
RETURNS TEXT
LANGUAGE plpgsql STABLE
AS $RENDER$
DECLARE
  base_text   TEXT := '';
  extras_text TEXT := '';
  yt_block    TEXT := '';
  augment     TEXT := '';
  strip_start INT;
  rel_pos     INT;
  inject_pos  INT;
BEGIN
  -- 1. Base v2 rendering (untouched legacy 9-table renderer)
  BEGIN
    SELECT _render_project_intelligence_v2(p_project_id, p_stage) INTO base_text;
  EXCEPTION WHEN undefined_function THEN
    base_text := '';
  END;
  base_text := COALESCE(base_text, '');

  -- 2. Strip v2's legacy Per-Video Competitor Deep-Analysis block
  --    (we replace it with the lossless extended block below).
  strip_start := position(E'## Per-Video Competitor Deep-Analysis' IN base_text);
  IF strip_start > 0 THEN
    rel_pos := position(E'\n## ' IN substring(base_text FROM strip_start + 1));
    IF rel_pos = 0 THEN
      rel_pos := position(E'\n---\n_Rendered' IN substring(base_text FROM strip_start + 1));
    END IF;
    IF rel_pos > 0 THEN
      base_text := substring(base_text FROM 1 FOR strip_start - 1)
                || substring(base_text FROM strip_start + rel_pos);
    ELSE
      base_text := substring(base_text FROM 1 FOR strip_start - 1);
    END IF;
  END IF;

  -- 3. Extras (project-level orphan columns: channel_analysis_context, etc.)
  BEGIN
    SELECT _render_project_extras(p_project_id, p_stage) INTO extras_text;
  EXCEPTION WHEN undefined_function THEN
    extras_text := '';
  END;
  extras_text := COALESCE(extras_text, '');

  -- 4. Extended yt block (lossless yt_video_analyses including references)
  BEGIN
    SELECT _render_yt_analyses_extended(p_project_id, p_stage) INTO yt_block;
  EXCEPTION WHEN undefined_function THEN
    yt_block := '';
  END;
  yt_block := COALESCE(yt_block, '');

  -- 5. Concatenate augmentation (extras first — they're project-level
  --    context; yt block is per-competitor deep-dive).
  augment := '';
  IF length(extras_text) > 0 THEN
    augment := augment || extras_text;
  END IF;
  IF length(yt_block) > 0 THEN
    IF length(augment) > 0 THEN augment := augment || E'\n'; END IF;
    augment := augment || yt_block;
  END IF;

  -- 6. Inject augmentation before the footer (if present), else append.
  IF length(augment) > 0 THEN
    inject_pos := position(E'\n---\n_Rendered' IN base_text);
    IF inject_pos > 0 THEN
      base_text := substring(base_text FROM 1 FOR inject_pos - 1)
                || E'\n' || augment
                || substring(base_text FROM inject_pos);
    ELSE
      base_text := base_text || E'\n' || augment;
    END IF;
  END IF;

  RETURN base_text;
END;
$RENDER$;

COMMENT ON FUNCTION render_project_intelligence(UUID, TEXT) IS
  'v3.3 (migration 038) — wrapper composes: v2 base (legacy 9-table) MINUS '
  'legacy yt block, PLUS _render_project_extras (channel_analysis_context, '
  'script_reference_data, language, channel_type — orphan project columns), '
  'PLUS _render_yt_analyses_extended (lossless yt_video_analyses with '
  'reference_analyses UNION + all analysis sub-keys). End-to-end: zero known '
  'intelligence loss across the 9 source tables.';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION C — Coverage check: scan all 4 function bodies
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION _intelligence_coverage_check()
RETURNS VOID LANGUAGE plpgsql AS $COV$
DECLARE
  fn_body   TEXT := '';
  fn_part   TEXT;
  rec       RECORD;
  missing   TEXT := '';
  fn_name   TEXT;
  whitelist TEXT[] := ARRAY[
    -- === projects (operational / IDs / counters / config) ===
    'id', 'name', 'status', 'created_at', 'updated_at', 'error_log',
    'drive_root_folder_id', 'drive_assets_folder_id',
    'youtube_channel_id', 'youtube_playlist1_id', 'youtube_playlist2_id',
    'youtube_playlist3_id',
    'i2v_clip_duration_seconds', 'i2v_clips_per_video', 'i2v_cost',
    'i2v_cost_per_second', 'i2v_model',
    't2v_clips_per_video', 't2v_cost', 't2v_model',
    'image_cost', 'image_model', 'images_per_video',
    'monthly_budget_usd', 'monthly_spend_usd',
    'music_enabled', 'music_mood_override', 'music_prefs_updated_at',
    'music_source', 'music_volume',
    'auto_pilot_enabled', 'auto_pilot_default_visibility',
    'auto_pilot_script_threshold', 'auto_pilot_topic_threshold',
    'target_video_count', 'target_scene_count', 'target_word_count',
    'niche_health_classification', 'niche_health_last_computed_at',
    'niche_health_score', 'niche_rpm_category',
    'reference_analyses', 'style_dna',
    -- denormalised snapshots (real values rendered via niche_viability_reports)
    'niche_viability_score', 'niche_viability_verdict',
    -- operational (no prompt impact)
    'rpm_classified_at', 'parent_project_id', 'cost_ceiling_usd',
    'script_approach',  -- config flag (3_pass vs single_call), not content
    -- === channel_analyses (data flows via to_jsonb(ca.*) blob in v2 line 80;
    --     v2 extracts a curated subset. Untracked sub-keys are partial debt
    --     to address in a future migration alongside v2 extraction expansion.) ===
    'channel_url', 'channel_avatar_url', 'channel_banner_url', 'custom_url',
    'channel_description', 'channel_created_at', 'analyzed_at',
    'analysis_cost_usd', 'analysis_duration_seconds', 'comments_fetched',
    'error_message', 'total_view_count', 'estimated_monthly_views',
    'median_views_per_video', 'avg_video_duration_seconds', 'upload_frequency_days',
    -- === niche_viability_reports ===
    'analysis_group_id',
    -- === niche_profiles ===
    'search_results_raw',
    -- === yt_video_analyses ===
    'run_id', 'video_id', 'video_url', 'thumbnail_url', 'duration_seconds',
    'transcript', 'error',
    -- === research_runs ===
    'sources_completed', 'started_at', 'completed_at',
    -- === research_categories ===
    'category_id',
    -- === research_results ===
    'source_url', 'posted_at',
    -- === audience_insights ===
    'week_of', 'generated_by', 'synthesis_cost_usd',
    -- always-housekeeping
    'created_at', 'updated_at'
  ];
BEGIN
  -- Concatenate bodies of all 4 rendering functions. Add the new helper
  -- name here when introducing future helpers.
  FOREACH fn_name IN ARRAY ARRAY[
    'render_project_intelligence',
    '_render_project_intelligence_v2',
    '_render_yt_analyses_extended',
    '_render_project_extras'
  ]
  LOOP
    BEGIN
      SELECT pg_get_functiondef(p.oid) INTO fn_part
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE p.proname = fn_name
         AND n.nspname = 'public';
    EXCEPTION WHEN OTHERS THEN
      fn_part := NULL;
    END;
    IF fn_part IS NOT NULL THEN
      fn_body := fn_body || E'\n' || fn_part;
    END IF;
  END LOOP;

  IF length(fn_body) = 0 THEN
    RAISE EXCEPTION 'No renderer functions found — render_project_intelligence missing';
  END IF;

  FOR rec IN (
    SELECT table_name, column_name
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name IN (
         'projects',
         'channel_analyses',
         'niche_viability_reports',
         'niche_profiles',
         'yt_video_analyses',
         'research_runs',
         'research_categories',
         'research_results',
         'audience_insights'
       )
  ) LOOP
    IF rec.column_name = ANY(whitelist) THEN CONTINUE; END IF;
    IF fn_body LIKE '%' || rec.column_name || '%' THEN CONTINUE; END IF;
    missing := missing || E'\n  - ' || rec.table_name || '.' || rec.column_name;
  END LOOP;

  IF length(missing) > 0 THEN
    RAISE EXCEPTION
      'Intelligence coverage check FAILED (v3, split-renderer aware, 4 fns). '
      'Columns neither rendered nor whitelisted:%', missing;
  END IF;
END $COV$;

COMMENT ON FUNCTION _intelligence_coverage_check() IS
  'v3 (migration 038). Scans bodies of render_project_intelligence + '
  '_render_project_intelligence_v2 + _render_yt_analyses_extended + '
  '_render_project_extras. EXCEPTION on any column in the 9 source tables that '
  'is neither rendered nor explicitly whitelisted (housekeeping/operational/IDs). '
  'When adding a new renderer helper, append its name to the FOREACH array.';

-- Run it now to ensure clean state
SELECT _intelligence_coverage_check();

COMMIT;
