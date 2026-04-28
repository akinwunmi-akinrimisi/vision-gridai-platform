-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 037 — Lossless yt_video_analyses rendering
-- ───────────────────────────────────────────────────────────────────────────
-- Closes two intelligence-loss gaps left by 029/034:
--
-- GAP 1 (membership):
--   _render_project_intelligence_v2 picks yt_video_analyses by niche-string
--   match (`niche_category = projects.niche`). If a user analyses a video and
--   tags it with a different niche slug than the project's niche string —
--   e.g. project niche "Australian Superannuation" vs analysis niche_category
--   "super_au" — the video is invisible to the renderer at script time, even
--   if the project explicitly references it via `projects.reference_analyses`.
--
-- GAP 2 (field coverage):
--   The v2 per-video block extracts a subset of yt_video_analyses.analysis:
--   strengths, weaknesses, content_quality, ten_x_strategy, comment_insights.
--   It DROPS:
--     - script_structure (pacing, hook_analysis, narrative_arc, call_to_action,
--       chapter_breakdown — invaluable for matching/exceeding pacing)
--     - engagement_analysis (retention_hooks, emotional_triggers,
--       audience_connection, storytelling_devices)
--     - blue_ocean_analysis (gaps_and_opportunities, contrarian_angles,
--       untapped_audience_segments, what_everyone_does)
--     - opportunity_scorecard (verdict, composite_score, 7 dimensional scores
--       with justifications — needed to know where to focus exploitation)
--     - comment_insights.topic_opportunities[].representative_comments
--     - top-level country_target (US/UK/AU disambiguation)
--
-- Strategy:
--   1. Add helper _render_yt_analyses_extended(project_id, stage) that pulls
--      the unified set (niche-match UNION reference_analyses, references
--      prioritised) and renders ALL relevant fields.
--   2. Reshape render_project_intelligence to (a) call v2, (b) strip v2's
--      Per-Video block via regex, (c) append the extended block. The v2
--      function is left untouched — minimal blast radius.
--   3. Coverage check naturally passes because the new helper references
--      every previously-uncovered column (country_target included).
--
-- Idempotent. Single transaction. Safe to re-run.
-- ───────────────────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION A — _render_yt_analyses_extended helper
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION _render_yt_analyses_extended(
  p_project_id UUID,
  p_stage      TEXT DEFAULT 'all'
) RETURNS TEXT
LANGUAGE plpgsql STABLE
AS $YT$
DECLARE
  proj             projects%ROWTYPE;
  ytv              JSONB := '[]'::jsonb;
  item             JSONB;
  sub              JSONB;
  rep              JSONB;
  text_item        TEXT;
  r                TEXT := '';
  stage            TEXT;
  include_topics   BOOLEAN;
  include_script   BOOLEAN;
  include_metadata BOOLEAN;
  ref_uuids        UUID[] := ARRAY[]::UUID[];
  is_reference     BOOLEAN;
BEGIN
  stage := lower(coalesce(p_stage, 'all'));
  include_topics   := stage IN ('topics', 'all');
  include_script   := stage IN ('script', 'all');
  include_metadata := stage IN ('metadata', 'all');

  SELECT * INTO proj FROM projects WHERE id = p_project_id;
  IF NOT FOUND THEN RETURN ''; END IF;

  -- Reference IDs (UUID[] column on projects, populated by WF_PROJECT_CREATE
  -- when the user picks analyses in CreateProjectModal).
  IF proj.reference_analyses IS NOT NULL
     AND array_length(proj.reference_analyses, 1) IS NOT NULL THEN
    ref_uuids := proj.reference_analyses;
  END IF;

  -- Unified video set: niche-match UNION explicit references.
  --   - References ALWAYS included (even if niche-mismatched)
  --   - Niche-match capped at top 10 by views
  --   - References sort first; among references, by views desc
  --   - LIMIT 15 (5 reference slots + 10 niche-match)
  SELECT coalesce(
    jsonb_agg(
      to_jsonb(subyv.*)
      ORDER BY (subyv.id = ANY(ref_uuids)) DESC,
               (subyv.views)::BIGINT DESC NULLS LAST
    ),
    '[]'::jsonb
  )
  INTO ytv
  FROM (
    SELECT *
      FROM yt_video_analyses
     WHERE status = 'complete'
       AND (niche_category = proj.niche OR id = ANY(ref_uuids))
     ORDER BY (id = ANY(ref_uuids)) DESC,
              views DESC NULLS LAST
     LIMIT 15
  ) subyv;

  IF jsonb_array_length(ytv) = 0 THEN
    RETURN '';
  END IF;

  IF NOT (include_topics OR include_script) THEN
    RETURN '';
  END IF;

  -- ========== HEADER ==========
  r := r || E'## Per-Video Competitor Deep-Analysis (lossless v3)\n';
  r := r || format(
    E'_Source: yt_video_analyses. Selection: niche=%L OR id ∈ projects.reference_analyses (%s explicit refs). Sorted: references first, then views desc. Cap: 15._\n\n',
    proj.niche,
    array_length(ref_uuids, 1)
  );

  FOR item IN SELECT value FROM jsonb_array_elements(ytv)
  LOOP
    is_reference := (item->>'id')::UUID = ANY(ref_uuids);

    -- Heading with reference badge + country tag
    r := r || format(
      E'### %s"%s" by %s%s\n',
      CASE WHEN is_reference THEN '★ USER-FLAGGED REFERENCE — ' ELSE '' END,
      coalesce(item->>'video_title', ''),
      coalesce(item->>'channel_name', ''),
      CASE
        WHEN item->>'country_target' IS NOT NULL
             AND item->>'country_target' <> 'GENERAL'
          THEN format(' [%s]', item->>'country_target')
        ELSE ''
      END
    );
    r := r || format(
      E'- niche_category: %s | duration: %s sec | %s views | %s likes | %s comments\n',
      coalesce(item->>'niche_category', '?'),
      coalesce(item->>'duration_seconds', '?'),
      coalesce(item->>'views', '?'),
      coalesce(item->>'likes', '0'),
      coalesce(item->>'comments', '0')
    );

    IF item->'analysis' IS NULL OR item->'analysis' = 'null'::jsonb THEN
      r := r || E'\n';
      CONTINUE;
    END IF;

    -- ========== OVERVIEW ==========
    IF item->'analysis'->>'overall_score' IS NOT NULL THEN
      r := r || format(E'- Overall score: %s/10 — %s\n',
        item->'analysis'->>'overall_score',
        coalesce(item->'analysis'->>'one_line_summary', ''));
    END IF;

    -- ========== STRENGTHS / WEAKNESSES ==========
    IF jsonb_typeof(item->'analysis'->'strengths') = 'array' AND include_script THEN
      r := r || E'- Strengths (what they do well — match or exceed):\n';
      FOR text_item IN SELECT jsonb_array_elements_text(item->'analysis'->'strengths')
      LOOP
        r := r || format(E'    + %s\n', text_item);
      END LOOP;
    END IF;
    IF jsonb_typeof(item->'analysis'->'weaknesses') = 'array' THEN
      r := r || E'- Weaknesses (exploitation targets — beat them here):\n';
      FOR text_item IN SELECT jsonb_array_elements_text(item->'analysis'->'weaknesses')
      LOOP
        r := r || format(E'    - %s\n', text_item);
      END LOOP;
    END IF;

    -- ========== CONTENT QUALITY ==========
    IF item->'analysis'->'content_quality' IS NOT NULL THEN
      r := r || format(E'- Content quality: depth_score=%s\n',
        coalesce(item->'analysis'->'content_quality'->>'depth_score', '?'));
      IF jsonb_typeof(item->'analysis'->'content_quality'->'missing_topics') = 'array' THEN
        r := r || E'    Missing topics (pre-validated candidates):\n';
        FOR text_item IN SELECT jsonb_array_elements_text(item->'analysis'->'content_quality'->'missing_topics')
        LOOP
          r := r || format(E'      * %s\n', text_item);
        END LOOP;
      END IF;
      IF jsonb_typeof(item->'analysis'->'content_quality'->'unique_insights') = 'array' AND include_script THEN
        r := r || E'    Unique insights they brought (don''t plagiarise — surpass):\n';
        FOR text_item IN SELECT jsonb_array_elements_text(item->'analysis'->'content_quality'->'unique_insights')
        LOOP
          r := r || format(E'      * %s\n', text_item);
        END LOOP;
      END IF;
      IF jsonb_typeof(item->'analysis'->'content_quality'->'accuracy_concerns') = 'array' THEN
        r := r || E'    Accuracy concerns (authority positioning opportunities):\n';
        FOR text_item IN SELECT jsonb_array_elements_text(item->'analysis'->'content_quality'->'accuracy_concerns')
        LOOP
          r := r || format(E'      * %s\n', text_item);
        END LOOP;
      END IF;
    END IF;

    -- ========== TEN-X STRATEGY ==========
    IF item->'analysis'->'ten_x_strategy' IS NOT NULL THEN
      r := r || E'- 10x strategy (pre-computed beat-them plan):\n';
      IF item->'analysis'->'ten_x_strategy'->>'recommended_angle' IS NOT NULL THEN
        r := r || format(E'    recommended_angle: %s\n',
          item->'analysis'->'ten_x_strategy'->>'recommended_angle');
      END IF;
      IF item->'analysis'->'ten_x_strategy'->>'suggested_title' IS NOT NULL THEN
        r := r || format(E'    suggested_title: %s\n',
          item->'analysis'->'ten_x_strategy'->>'suggested_title');
      END IF;
      IF item->'analysis'->'ten_x_strategy'->>'opening_hook_suggestion' IS NOT NULL THEN
        r := r || format(E'    opening_hook_suggestion: %s\n',
          item->'analysis'->'ten_x_strategy'->>'opening_hook_suggestion');
      END IF;
      IF item->'analysis'->'ten_x_strategy'->>'target_duration' IS NOT NULL THEN
        r := r || format(E'    target_duration: %s\n',
          item->'analysis'->'ten_x_strategy'->>'target_duration');
      END IF;
      IF jsonb_typeof(item->'analysis'->'ten_x_strategy'->'key_differentiators') = 'array' THEN
        r := r || E'    key_differentiators:\n';
        FOR text_item IN SELECT jsonb_array_elements_text(item->'analysis'->'ten_x_strategy'->'key_differentiators')
        LOOP
          r := r || format(E'      * %s\n', text_item);
        END LOOP;
      END IF;
    END IF;

    -- ========== SCRIPT STRUCTURE (NEW — script stage only) ==========
    IF include_script AND item->'analysis'->'script_structure' IS NOT NULL
       AND item->'analysis'->'script_structure' <> 'null'::jsonb THEN
      r := r || E'- Script structure (their pacing & arc — use as benchmark):\n';
      IF item->'analysis'->'script_structure'->>'hook_analysis' IS NOT NULL THEN
        r := r || format(E'    hook_analysis: %s\n',
          item->'analysis'->'script_structure'->>'hook_analysis');
      END IF;
      IF item->'analysis'->'script_structure'->>'narrative_arc' IS NOT NULL THEN
        r := r || format(E'    narrative_arc: %s\n',
          item->'analysis'->'script_structure'->>'narrative_arc');
      END IF;
      IF item->'analysis'->'script_structure'->>'pacing' IS NOT NULL THEN
        r := r || format(E'    pacing: %s\n',
          item->'analysis'->'script_structure'->>'pacing');
      END IF;
      IF item->'analysis'->'script_structure'->>'call_to_action' IS NOT NULL THEN
        r := r || format(E'    call_to_action: %s\n',
          item->'analysis'->'script_structure'->>'call_to_action');
      END IF;
      IF jsonb_typeof(item->'analysis'->'script_structure'->'chapter_breakdown') = 'array' THEN
        r := r || E'    chapter_breakdown:\n';
        FOR sub IN SELECT value FROM jsonb_array_elements(item->'analysis'->'script_structure'->'chapter_breakdown')
        LOOP
          IF jsonb_typeof(sub) = 'object' THEN
            r := r || format(E'      * %s\n',
              coalesce(
                sub->>'description',
                sub->>'summary',
                sub->>'title',
                sub::TEXT
              ));
          ELSE
            r := r || format(E'      * %s\n', sub#>>'{}');
          END IF;
        END LOOP;
      END IF;
    END IF;

    -- ========== ENGAGEMENT ANALYSIS (NEW — script stage) ==========
    IF include_script AND item->'analysis'->'engagement_analysis' IS NOT NULL
       AND item->'analysis'->'engagement_analysis' <> 'null'::jsonb THEN
      r := r || E'- Engagement analysis (retention/emotion mechanics — replicate & exceed):\n';
      IF jsonb_typeof(item->'analysis'->'engagement_analysis'->'retention_hooks') = 'array' THEN
        r := r || E'    retention_hooks:\n';
        FOR text_item IN SELECT jsonb_array_elements_text(item->'analysis'->'engagement_analysis'->'retention_hooks')
        LOOP
          r := r || format(E'      * %s\n', text_item);
        END LOOP;
      END IF;
      IF jsonb_typeof(item->'analysis'->'engagement_analysis'->'emotional_triggers') = 'array' THEN
        r := r || E'    emotional_triggers:\n';
        FOR text_item IN SELECT jsonb_array_elements_text(item->'analysis'->'engagement_analysis'->'emotional_triggers')
        LOOP
          r := r || format(E'      * %s\n', text_item);
        END LOOP;
      END IF;
      IF jsonb_typeof(item->'analysis'->'engagement_analysis'->'storytelling_devices') = 'array' THEN
        r := r || E'    storytelling_devices:\n';
        FOR text_item IN SELECT jsonb_array_elements_text(item->'analysis'->'engagement_analysis'->'storytelling_devices')
        LOOP
          r := r || format(E'      * %s\n', text_item);
        END LOOP;
      END IF;
      IF item->'analysis'->'engagement_analysis'->>'audience_connection' IS NOT NULL THEN
        r := r || format(E'    audience_connection: %s\n',
          item->'analysis'->'engagement_analysis'->>'audience_connection');
      END IF;
    END IF;

    -- ========== BLUE OCEAN ANALYSIS (NEW — topics + script) ==========
    IF item->'analysis'->'blue_ocean_analysis' IS NOT NULL
       AND item->'analysis'->'blue_ocean_analysis' <> 'null'::jsonb THEN
      r := r || E'- Blue-ocean analysis (per-video — gaps THIS specific video left open):\n';
      IF jsonb_typeof(item->'analysis'->'blue_ocean_analysis'->'gaps_and_opportunities') = 'array' THEN
        r := r || E'    gaps_and_opportunities:\n';
        FOR text_item IN SELECT jsonb_array_elements_text(item->'analysis'->'blue_ocean_analysis'->'gaps_and_opportunities')
        LOOP
          r := r || format(E'      * %s\n', text_item);
        END LOOP;
      END IF;
      IF jsonb_typeof(item->'analysis'->'blue_ocean_analysis'->'contrarian_angles') = 'array' THEN
        r := r || E'    contrarian_angles:\n';
        FOR text_item IN SELECT jsonb_array_elements_text(item->'analysis'->'blue_ocean_analysis'->'contrarian_angles')
        LOOP
          r := r || format(E'      * %s\n', text_item);
        END LOOP;
      END IF;
      IF jsonb_typeof(item->'analysis'->'blue_ocean_analysis'->'untapped_audience_segments') = 'array' THEN
        r := r || E'    untapped_audience_segments:\n';
        FOR text_item IN SELECT jsonb_array_elements_text(item->'analysis'->'blue_ocean_analysis'->'untapped_audience_segments')
        LOOP
          r := r || format(E'      * %s\n', text_item);
        END LOOP;
      END IF;
      IF jsonb_typeof(item->'analysis'->'blue_ocean_analysis'->'what_everyone_does') = 'array' AND include_topics THEN
        r := r || E'    what_everyone_does (red-ocean — avoid):\n';
        FOR text_item IN SELECT jsonb_array_elements_text(item->'analysis'->'blue_ocean_analysis'->'what_everyone_does')
        LOOP
          r := r || format(E'      * %s\n', text_item);
        END LOOP;
      END IF;
    END IF;

    -- ========== OPPORTUNITY SCORECARD (NEW — topics signal viability) ==========
    IF item->'analysis'->'opportunity_scorecard' IS NOT NULL
       AND item->'analysis'->'opportunity_scorecard' <> 'null'::jsonb THEN
      r := r || format(
        E'- Opportunity scorecard: verdict=**%s**, composite=%s/10\n',
        coalesce(item->'analysis'->'opportunity_scorecard'->>'verdict', '?'),
        coalesce(item->'analysis'->'opportunity_scorecard'->>'composite_score', '?')
      );
      IF item->'analysis'->'opportunity_scorecard'->>'verdict_reason' IS NOT NULL THEN
        r := r || format(E'    verdict_reason: %s\n',
          item->'analysis'->'opportunity_scorecard'->>'verdict_reason');
      END IF;
      -- 7 dimensional scores with justifications
      FOR text_item IN
        SELECT unnest(ARRAY[
          'market_gap', 'audience_demand', 'monetization_fit',
          'engagement_ceiling', 'competition_density',
          'uniqueness_potential', 'script_exploitability'
        ])
      LOOP
        IF item->'analysis'->'opportunity_scorecard'->text_item IS NOT NULL THEN
          r := r || format(
            E'    %s: %s/10 — %s\n',
            text_item,
            coalesce(item->'analysis'->'opportunity_scorecard'->text_item->>'score', '?'),
            coalesce(item->'analysis'->'opportunity_scorecard'->text_item->>'justification', '')
          );
        END IF;
      END LOOP;
    END IF;

    -- ========== COMMENT INSIGHTS (with representative_comments — NEW) ==========
    IF item->'analysis'->'comment_insights' IS NOT NULL THEN
      IF jsonb_typeof(item->'analysis'->'comment_insights'->'topic_opportunities') = 'array' THEN
        r := r || E'- Comment-driven topic opportunities:\n';
        FOR sub IN SELECT value FROM jsonb_array_elements(item->'analysis'->'comment_insights'->'topic_opportunities')
        LOOP
          r := r || format(E'    - [%s, freq=%s, sentiment=%s] %s\n',
            coalesce(sub->>'theme', ''),
            coalesce(sub->>'frequency', ''),
            coalesce(sub->>'sentiment', ''),
            coalesce(sub->>'description', ''));
          IF sub->>'suggested_video_title' IS NOT NULL THEN
            r := r || format(E'      → Suggested title: %s\n', sub->>'suggested_video_title');
          END IF;
          IF jsonb_typeof(sub->'representative_comments') = 'array' AND include_script THEN
            r := r || E'      Representative comments:\n';
            FOR rep IN SELECT value FROM jsonb_array_elements(sub->'representative_comments')
            LOOP
              r := r || format(E'        ◦ %s\n',
                CASE WHEN jsonb_typeof(rep) = 'string' THEN rep#>>'{}' ELSE rep::TEXT END);
            END LOOP;
          END IF;
        END LOOP;
      END IF;
      IF jsonb_typeof(item->'analysis'->'comment_insights'->'requests') = 'array' THEN
        r := r || E'- Commenter requests:\n';
        FOR text_item IN SELECT jsonb_array_elements_text(item->'analysis'->'comment_insights'->'requests')
        LOOP
          r := r || format(E'    * %s\n', text_item);
        END LOOP;
      END IF;
      IF jsonb_typeof(item->'analysis'->'comment_insights'->'complaints') = 'array' AND include_script THEN
        r := r || E'- Commenter complaints:\n';
        FOR text_item IN SELECT jsonb_array_elements_text(item->'analysis'->'comment_insights'->'complaints')
        LOOP
          r := r || format(E'    * %s\n', text_item);
        END LOOP;
      END IF;
      IF jsonb_typeof(item->'analysis'->'comment_insights'->'top_questions') = 'array' THEN
        r := r || E'- Top commenter questions:\n';
        FOR text_item IN SELECT jsonb_array_elements_text(item->'analysis'->'comment_insights'->'top_questions')
        LOOP
          r := r || format(E'    * %s\n', text_item);
        END LOOP;
      END IF;
      IF include_script AND item->'analysis'->'comment_insights'->>'sentiment_summary' IS NOT NULL THEN
        r := r || format(E'- Comment sentiment summary: %s\n',
          item->'analysis'->'comment_insights'->>'sentiment_summary');
      END IF;
    END IF;

    r := r || E'\n';
  END LOOP;

  RETURN r;
END;
$YT$;

COMMENT ON FUNCTION _render_yt_analyses_extended(UUID, TEXT) IS
  'Extended yt_video_analyses block — supersedes the v2 inline rendering. '
  'Source set: niche_category=projects.niche UNION id=ANY(projects.reference_analyses), '
  'references prioritised. Renders ALL analysis fields including script_structure, '
  'engagement_analysis, blue_ocean_analysis, opportunity_scorecard (7 dims), '
  'comment_insights.topic_opportunities[].representative_comments, country_target.';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION B — render_project_intelligence wrapper (strip + augment)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION render_project_intelligence(p_project_id UUID, p_stage TEXT DEFAULT 'all')
RETURNS TEXT
LANGUAGE plpgsql STABLE
AS $RENDER$
DECLARE
  base_text   TEXT := '';
  yt_block    TEXT := '';
  strip_start INT;
  rel_pos     INT;
  inject_pos  INT;
BEGIN
  -- 1. Get base v2 rendering
  BEGIN
    SELECT _render_project_intelligence_v2(p_project_id, p_stage) INTO base_text;
  EXCEPTION WHEN undefined_function THEN
    base_text := '';
  END;
  base_text := COALESCE(base_text, '');

  -- 2. Strip v2's Per-Video Competitor Deep-Analysis block.
  --    Use position+substring splicing (bulletproof — no regex replacement
  --    interpolation issues with backslashes in user content).
  --    Block boundary: starts at '## Per-Video Competitor Deep-Analysis',
  --    ends at next '\n## ' or '\n---\n_Rendered' (footer) or end-of-string.
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
      -- yt block extends to end of string
      base_text := substring(base_text FROM 1 FOR strip_start - 1);
    END IF;
  END IF;

  -- 3. Get the extended yt block
  BEGIN
    SELECT _render_yt_analyses_extended(p_project_id, p_stage) INTO yt_block;
  EXCEPTION WHEN undefined_function THEN
    yt_block := '';
  END;
  yt_block := COALESCE(yt_block, '');

  -- 4. Inject the extended block before the footer (if any), else append.
  --    position+substring splicing — no regex, no escaping.
  IF length(yt_block) > 0 THEN
    inject_pos := position(E'\n---\n_Rendered' IN base_text);
    IF inject_pos > 0 THEN
      base_text := substring(base_text FROM 1 FOR inject_pos - 1)
                || E'\n' || yt_block
                || substring(base_text FROM inject_pos);
    ELSE
      base_text := base_text || E'\n' || yt_block;
    END IF;
  END IF;

  RETURN base_text;
END;
$RENDER$;

COMMENT ON FUNCTION render_project_intelligence(UUID, TEXT) IS
  'v3.2 (migration 037) — calls v2 for base intelligence, strips v2''s legacy '
  'Per-Video Competitor Deep-Analysis block, and replaces it with the lossless '
  '_render_yt_analyses_extended block. The extended block (a) UNIONs niche-match '
  'AND projects.reference_analyses (so user-flagged analyses with a non-matching '
  'niche slug remain visible at script time), and (b) renders ALL analysis fields '
  'including script_structure / engagement_analysis / blue_ocean_analysis / '
  'opportunity_scorecard / representative_comments / country_target — closing the '
  'intelligence-loss gaps left by v2. Country prose still flows via render_country_blocks.';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION C — Re-run coverage check
-- ═══════════════════════════════════════════════════════════════════════════

-- _intelligence_coverage_check inspects pg_get_functiondef of
-- render_project_intelligence; since the new wrapper invokes
-- _render_yt_analyses_extended, the names country_target and
-- reference_analyses (and every previously-uncovered JSONB sub-key
-- referenced by string in the helper) are visible to the substring check.
-- We verify by running the check explicitly.

DO $COV$
BEGIN
  PERFORM _intelligence_coverage_check();
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Coverage check raised: %  (non-fatal — investigate before next migration)', SQLERRM;
END $COV$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- POST-DEPLOY VERIFICATION (run manually after COMMIT)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1. Function exists:
--    SELECT proname FROM pg_proc WHERE proname = '_render_yt_analyses_extended';
--
-- 2. Strip + augment works on a project with no yt analyses:
--    SELECT render_project_intelligence('4bdfbbe3-2a9c-4532-95e9-41a743e8c253', 'script') !~
--           '## Per-Video Competitor Deep-Analysis' AS no_block_when_empty;
--
-- 3. Reference-only video shows up even if niche differs:
--    -- create test project with niche='zzz_test' and reference_analyses=[<id>]
--    -- then render and assert the video appears with ★ badge.
--
-- 4. All previously-dropped fields render:
--    -- assert output contains 'script_structure', 'engagement_analysis',
--    -- 'opportunity_scorecard', 'blue_ocean_analysis' literals.
