-- ═══════════════════════════════════════════════════════════════
-- Migration 029: Intelligence Renderer v2 — Full 9-Table Coverage
--
-- Extends migration 028's renderer to close ALL residual intelligence-drop
-- paths. After this migration:
--
--   1. render_project_intelligence() reads from 9 source tables instead of 3.
--   2. _intelligence_coverage_check() scans all 9 tables and fails the
--      migration if any new intelligence-bearing column isn't either rendered
--      or explicitly whitelisted as operational.
--   3. _verify_script_template_vars() introspects system_prompts for
--      {placeholder} tokens and lets the caller verify the workflow
--      variable-fill dictionary covers every placeholder.
--
-- Source tables covered:
--   - projects                      (unchanged — 028)
--   - niche_viability_reports       (unchanged — 028)
--   - channel_analyses              (unchanged — 028)
--   - niche_profiles                (NEW — blue-ocean research, audience pain points, keyword research)
--   - yt_video_analyses             (NEW — per-video Claude analysis incl. ten_x_strategy, content_quality, comment_insights)
--   - research_runs                 (NEW — derived keywords, platforms scanned, time range)
--   - research_categories           (NEW — ranked clusters with suggested titles per cluster)
--   - research_results              (NEW — top engagement items with source attribution)
--   - audience_insights             (NEW — weekly audience synthesis, vocabulary level, recurring questions, objections)
--
-- After this migration:
--   - WF_SCRIPT_GENERATE/Prep & Read Avatar can delete the research_brief
--     hand-assembly (queries niche_profiles + yt_video_analyses +
--     research_categories + audience_insights — all now in the RPC).
--   - WF_TOPICS_GENERATE/Build Prompt can delete researchEnrichment
--     (research_categories/research_results/research_runs) and the
--     niche_profiles fallback inside analysisPayload.
-- ═══════════════════════════════════════════════════════════════

-- ---------- Extended renderer ----------

CREATE OR REPLACE FUNCTION render_project_intelligence(
  p_project_id UUID,
  p_stage TEXT DEFAULT 'all'
) RETURNS TEXT
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  proj                projects%ROWTYPE;
  nvr                 niche_viability_reports%ROWTYPE;
  np                  niche_profiles%ROWTYPE;
  rr                  research_runs%ROWTYPE;
  aud                 audience_insights%ROWTYPE;
  channels            JSONB := '[]'::jsonb;
  rcats               JSONB := '[]'::jsonb;
  rres                JSONB := '[]'::jsonb;
  ytv                 JSONB := '[]'::jsonb;
  ch                  JSONB;
  item                JSONB;
  cat                 JSONB;
  res                 JSONB;
  sub                 JSONB;
  text_item           TEXT;
  r                   TEXT := '';
  stage               TEXT;
  include_topics      BOOLEAN;
  include_script      BOOLEAN;
  include_metadata    BOOLEAN;
  viral_themes_text   TEXT := '';
  competitor_mentions TEXT := '';
BEGIN
  stage := lower(coalesce(p_stage, 'all'));
  include_topics   := stage IN ('topics', 'all');
  include_script   := stage IN ('script', 'all');
  include_metadata := stage IN ('metadata', 'all');

  SELECT * INTO proj FROM projects WHERE id = p_project_id;
  IF NOT FOUND THEN RETURN ''; END IF;

  SELECT * INTO nvr FROM niche_viability_reports
   WHERE analysis_group_id = proj.analysis_group_id
   ORDER BY created_at DESC
   LIMIT 1;

  SELECT coalesce(jsonb_agg(to_jsonb(ca.*) ORDER BY ca.verdict_score DESC NULLS LAST), '[]'::jsonb)
    INTO channels
    FROM channel_analyses ca
   WHERE ca.analysis_group_id = proj.analysis_group_id
     AND ca.status = 'completed';

  -- NEW: niche_profiles (latest)
  SELECT * INTO np FROM niche_profiles
   WHERE project_id = p_project_id
   ORDER BY created_at DESC
   LIMIT 1;

  -- NEW: research_runs (latest complete, fall back to latest any)
  SELECT * INTO rr FROM research_runs
   WHERE project_id = p_project_id
     AND status = 'complete'
   ORDER BY completed_at DESC NULLS LAST
   LIMIT 1;
  IF rr.id IS NULL THEN
    SELECT * INTO rr FROM research_runs
     WHERE project_id = p_project_id
     ORDER BY created_at DESC
     LIMIT 1;
  END IF;

  -- NEW: research_categories for latest run
  IF rr.id IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(to_jsonb(rc.*) ORDER BY rc.rank NULLS LAST), '[]'::jsonb)
      INTO rcats
      FROM research_categories rc
     WHERE rc.run_id = rr.id;

    -- NEW: top 25 research_results by engagement for latest run
    SELECT coalesce(jsonb_agg(to_jsonb(subres.*) ORDER BY (subres.engagement_score)::INT DESC NULLS LAST), '[]'::jsonb)
      INTO rres
      FROM (
        SELECT *
          FROM research_results
         WHERE run_id = rr.id
         ORDER BY engagement_score DESC NULLS LAST
         LIMIT 25
      ) subres;
  END IF;

  -- NEW: yt_video_analyses (top 10 by views, text-matched on niche_category)
  SELECT coalesce(jsonb_agg(to_jsonb(subyv.*) ORDER BY (subyv.views)::BIGINT DESC NULLS LAST), '[]'::jsonb)
    INTO ytv
    FROM (
      SELECT *
        FROM yt_video_analyses
       WHERE niche_category = proj.niche
         AND status = 'complete'
       ORDER BY views DESC NULLS LAST
       LIMIT 10
    ) subyv;

  -- NEW: audience_insights (latest by week_of)
  SELECT * INTO aud FROM audience_insights
   WHERE project_id = p_project_id
   ORDER BY week_of DESC NULLS LAST
   LIMIT 1;

  -- ========== HEADER ==========
  r := r || format(E'# CHANNEL INTELLIGENCE (stage=%s)\n\n', stage);
  r := r || format(E'**Niche:** %s\n', coalesce(proj.niche, 'unspecified'));
  IF proj.niche_description IS NOT NULL AND length(proj.niche_description) > 0 THEN
    r := r || format(E'**Description:** %s\n', proj.niche_description);
  END IF;
  r := r || format(E'**Channel style:** %s\n', coalesce(proj.channel_style, '2hr_documentary'));
  IF proj.niche_expertise_profile IS NOT NULL THEN
    r := r || format(E'**Expertise profile:** %s\n', proj.niche_expertise_profile);
  END IF;
  IF proj.niche_blue_ocean_strategy IS NOT NULL THEN
    r := r || format(E'**Project blue-ocean strategy:** %s\n', proj.niche_blue_ocean_strategy);
  END IF;
  IF proj.niche_pain_point_sources IS NOT NULL THEN
    r := r || format(E'**Audience pain-point sources:** %s\n', proj.niche_pain_point_sources);
  END IF;
  IF proj.niche_red_ocean_topics IS NOT NULL AND array_length(proj.niche_red_ocean_topics, 1) IS NOT NULL THEN
    r := r || E'**Red-ocean topics (avoid, from project setup):**\n';
    r := r || _fmt_array(proj.niche_red_ocean_topics);
  END IF;
  IF proj.niche_competitor_channels IS NOT NULL AND array_length(proj.niche_competitor_channels, 1) IS NOT NULL THEN
    r := r || E'**Known competitor channels (from project setup):**\n';
    r := r || _fmt_array(proj.niche_competitor_channels);
  END IF;
  r := r || E'\n';

  -- ========== VIABILITY ASSESSMENT ==========
  IF nvr.id IS NOT NULL THEN
    r := r || E'## Viability Assessment\n';
    r := r || format(E'Score: **%s/100** (%s)  —  based on %s channels analyzed | %s total subs, %s est monthly views niche-wide\n',
      coalesce(nvr.viability_score::TEXT, '?'),
      coalesce(nvr.viability_verdict, '?'),
      coalesce(nvr.channels_analyzed::TEXT, '?'),
      coalesce(to_char(nvr.total_subscribers, 'FM999,999,999'), '?'),
      coalesce(to_char(nvr.total_monthly_views, 'FM999,999,999'), '?'));
    IF nvr.viability_reasoning IS NOT NULL THEN
      r := r || format(E'Reasoning: %s\n', nvr.viability_reasoning);
    END IF;
    r := r || format(E'Sub-scores: monetization=%s / audience_demand=%s / competition_gap=%s / entry_ease=%s (weighted 30/25/25/20)\n',
      coalesce(nvr.monetization_score::TEXT, '?'),
      coalesce(nvr.audience_demand_score::TEXT, '?'),
      coalesce(nvr.competition_gap_score::TEXT, '?'),
      coalesce(nvr.entry_ease_score::TEXT, '?'));
    IF nvr.monetization_breakdown IS NOT NULL THEN
      r := r || format(E'- Monetization rationale: %s\n', coalesce(nvr.monetization_breakdown->>'reasoning', ''));
    END IF;
    IF nvr.audience_demand_breakdown IS NOT NULL THEN
      r := r || format(E'- Audience-demand rationale: %s\n', coalesce(nvr.audience_demand_breakdown->>'reasoning', ''));
    END IF;
    IF nvr.competition_gap_breakdown IS NOT NULL THEN
      r := r || format(E'- Competition-gap rationale: %s\n', coalesce(nvr.competition_gap_breakdown->>'reasoning', ''));
    END IF;
    IF nvr.entry_ease_breakdown IS NOT NULL THEN
      r := r || format(E'- Entry-ease rationale: %s\n', coalesce(nvr.entry_ease_breakdown->>'reasoning', ''));
    END IF;
    IF nvr.defensibility_assessment IS NOT NULL THEN
      r := r || format(E'Defensibility assessment: %s\n', nvr.defensibility_assessment);
    END IF;
    r := r || E'\n';
  END IF;

  -- ========== MONETIZATION CONTEXT ==========
  IF nvr.id IS NOT NULL AND (include_topics OR include_script OR include_metadata) THEN
    r := r || E'## Monetization Context\n';
    IF nvr.ad_category IS NOT NULL THEN
      r := r || format(E'Ad category: **%s**\n', nvr.ad_category);
    END IF;
    IF nvr.estimated_rpm_low IS NOT NULL OR nvr.estimated_rpm_mid IS NOT NULL OR nvr.estimated_rpm_high IS NOT NULL THEN
      r := r || format(E'Estimated RPM: $%s low / $%s mid / $%s high\n',
        coalesce(nvr.estimated_rpm_low::TEXT, '?'),
        coalesce(nvr.estimated_rpm_mid::TEXT, '?'),
        coalesce(nvr.estimated_rpm_high::TEXT, '?'));
    END IF;
    IF nvr.sponsorship_potential IS NOT NULL THEN
      r := r || format(E'Sponsorship potential: **%s**', nvr.sponsorship_potential);
      IF nvr.monetization_breakdown IS NOT NULL AND nvr.monetization_breakdown->>'sponsorship_reasoning' IS NOT NULL THEN
        r := r || format(E'  —  %s', nvr.monetization_breakdown->>'sponsorship_reasoning');
      END IF;
      r := r || E'\n';
    END IF;
    IF (include_topics OR include_script) AND nvr.revenue_projections IS NOT NULL THEN
      r := r || E'Revenue projections:\n';
      IF nvr.revenue_projections->>'rpm_assumption' IS NOT NULL THEN
        r := r || format(E'  rpm_assumption: $%s (basis: %s)\n',
          nvr.revenue_projections->>'rpm_assumption',
          coalesce(nvr.revenue_projections->>'rpm_assumption_basis', ''));
      END IF;
      IF nvr.revenue_projections->'at_10k_subs' IS NOT NULL THEN
        r := r || format(E'  @ 10k subs: $%s/mo (%s)\n',
          coalesce(nvr.revenue_projections->'at_10k_subs'->>'monthly_usd', '?'),
          coalesce(nvr.revenue_projections->'at_10k_subs'->>'reasoning', ''));
      END IF;
      IF nvr.revenue_projections->'at_50k_subs' IS NOT NULL THEN
        r := r || format(E'  @ 50k subs: $%s/mo (%s)\n',
          coalesce(nvr.revenue_projections->'at_50k_subs'->>'monthly_usd', '?'),
          coalesce(nvr.revenue_projections->'at_50k_subs'->>'reasoning', ''));
      END IF;
      IF nvr.revenue_projections->'at_100k_subs' IS NOT NULL THEN
        r := r || format(E'  @ 100k subs: $%s/mo (%s)\n',
          coalesce(nvr.revenue_projections->'at_100k_subs'->>'monthly_usd', '?'),
          coalesce(nvr.revenue_projections->'at_100k_subs'->>'reasoning', ''));
      END IF;
    END IF;
    r := r || E'\n';
  END IF;

  -- ========== AUDIENCE PROFILE (from nvr) ==========
  IF nvr.id IS NOT NULL AND (include_topics OR include_script OR include_metadata) THEN
    r := r || E'## Audience Profile\n';
    IF nvr.audience_size_estimate IS NOT NULL THEN
      r := r || format(E'Size estimate: **%s**', nvr.audience_size_estimate);
      IF nvr.audience_demand_breakdown IS NOT NULL AND nvr.audience_demand_breakdown->>'audience_size_reasoning' IS NOT NULL THEN
        r := r || format(E'  —  %s', nvr.audience_demand_breakdown->>'audience_size_reasoning');
      END IF;
      r := r || E'\n';
    END IF;
    IF nvr.audience_demographics IS NOT NULL THEN
      r := r || format(E'Demographics: %s\n', nvr.audience_demographics);
    END IF;
    IF include_script AND nvr.engagement_benchmarks IS NOT NULL THEN
      r := r || format(E'Engagement benchmarks (summary): %s\n', nvr.engagement_benchmarks::TEXT);
    END IF;
    IF nvr.posting_frequency_benchmark IS NOT NULL THEN
      r := r || format(E'Niche posting cadence: %s\n', nvr.posting_frequency_benchmark);
    END IF;
    r := r || E'\n';
  END IF;

  -- ========== COMMENT INTEL AGGREGATED (channel_analyses) ==========
  IF jsonb_array_length(channels) > 0 THEN
    r := r || E'## Audience Signal (from comments across analyzed channels)\n';
    FOR ch IN SELECT value FROM jsonb_array_elements(channels)
    LOOP
      IF ch->'comment_insights' IS NULL OR ch->'comment_insights' = 'null'::jsonb THEN
        CONTINUE;
      END IF;

      IF include_topics OR include_script OR include_metadata THEN
        IF jsonb_typeof(ch->'comment_insights'->'content_gaps') = 'array' THEN
          FOR item IN SELECT value FROM jsonb_array_elements(ch->'comment_insights'->'content_gaps')
          LOOP
            r := r || format(E'- [%s] content gap: %s (%s, %s)\n',
              ch->>'channel_name',
              coalesce(item->>'gap', ''),
              coalesce(item->>'signal_strength', ''),
              coalesce(item->>'evidence', ''));
          END LOOP;
        END IF;
      END IF;

      IF include_script THEN
        IF jsonb_typeof(ch->'comment_insights'->'pain_points') = 'array' THEN
          FOR item IN SELECT value FROM jsonb_array_elements(ch->'comment_insights'->'pain_points')
          LOOP
            r := r || format(E'- [%s] pain: %s (%s, %s)\n',
              ch->>'channel_name',
              coalesce(item->>'pain_point', ''),
              coalesce(item->>'frequency', ''),
              coalesce(item->>'severity', ''));
          END LOOP;
        END IF;
      END IF;

      IF include_topics OR include_metadata THEN
        IF jsonb_typeof(ch->'comment_insights'->'requested_topics') = 'array' THEN
          FOR item IN SELECT value FROM jsonb_array_elements(ch->'comment_insights'->'requested_topics')
          LOOP
            r := r || format(E'- [%s] requested topic: %s (%s)\n',
              ch->>'channel_name',
              coalesce(item->>'topic', ''),
              coalesce(item->>'demand_evidence', ''));
          END LOOP;
        END IF;
      END IF;

      IF include_topics OR include_script OR include_metadata THEN
        IF jsonb_typeof(ch->'comment_insights'->'top_questions') = 'array' THEN
          FOR item IN SELECT value FROM jsonb_array_elements(ch->'comment_insights'->'top_questions')
          LOOP
            r := r || format(E'- [%s] question: %s (%s, videos: %s)\n',
              ch->>'channel_name',
              coalesce(item->>'question', ''),
              coalesce(item->>'frequency', ''),
              coalesce(item->>'video_context', ''));
          END LOOP;
        END IF;
      END IF;

      IF include_topics OR include_script THEN
        IF jsonb_typeof(ch->'comment_insights'->'viral_comment_themes') = 'array' THEN
          FOR item IN SELECT value FROM jsonb_array_elements(ch->'comment_insights'->'viral_comment_themes')
          LOOP
            viral_themes_text := viral_themes_text || format(E'- [%s] viral theme: %s (example: "%s", likes: %s)\n',
              ch->>'channel_name',
              coalesce(item->>'theme', ''),
              coalesce(item->>'example_comment', ''),
              coalesce(item->>'like_count', '0'));
          END LOOP;
        END IF;
      END IF;

      IF include_topics OR include_metadata THEN
        IF jsonb_typeof(ch->'comment_insights'->'competitor_mentions') = 'array' THEN
          FOR item IN SELECT value FROM jsonb_array_elements(ch->'comment_insights'->'competitor_mentions')
          LOOP
            competitor_mentions := competitor_mentions || format(E'- [%s] commenter mentioned: %s (%s, %s mentions)\n',
              ch->>'channel_name',
              coalesce(item->>'name', ''),
              coalesce(item->>'context', ''),
              coalesce(item->>'mention_count', '1'));
          END LOOP;
        END IF;
      END IF;

      IF ch->'comment_insights'->>'audience_sentiment' IS NOT NULL THEN
        r := r || format(E'- [%s] audience sentiment: %s  |  sophistication: %s (%s)\n',
          ch->>'channel_name',
          coalesce(ch->'comment_insights'->>'audience_sentiment', ''),
          coalesce(ch->'comment_insights'->>'audience_sophistication', ''),
          coalesce(ch->'comment_insights'->>'audience_sophistication_evidence', ''));
      END IF;
    END LOOP;

    IF length(viral_themes_text) > 0 THEN
      r := r || E'\n### Viral comment themes (what resonates)\n' || viral_themes_text;
    END IF;
    IF length(competitor_mentions) > 0 THEN
      r := r || E'\n### Competitor mentions by viewers (adjacent channels they already watch)\n' || competitor_mentions;
    END IF;
    r := r || E'\n';
  END IF;

  -- ========== STRATEGIC POSITIONING (from nvr) ==========
  IF nvr.id IS NOT NULL AND (include_topics OR include_script OR include_metadata) THEN
    r := r || E'## Strategic Positioning\n';
    IF nvr.recommended_angle IS NOT NULL THEN
      r := r || format(E'Recommended angle: %s\n', nvr.recommended_angle);
    END IF;
    IF include_topics OR include_script THEN
      IF nvr.differentiation_strategy IS NOT NULL THEN
        r := r || format(E'Differentiation strategy: %s\n', nvr.differentiation_strategy);
      END IF;
      IF nvr.recommended_content_pillars IS NOT NULL AND array_length(nvr.recommended_content_pillars, 1) IS NOT NULL THEN
        r := r || E'Content pillars:\n' || _fmt_array(nvr.recommended_content_pillars);
      END IF;
      IF nvr.moat_indicators IS NOT NULL AND jsonb_typeof(nvr.moat_indicators) = 'array' THEN
        r := r || E'Moat indicators (defensible advantages):\n';
        FOR item IN SELECT value FROM jsonb_array_elements(nvr.moat_indicators)
        LOOP
          r := r || format(E'- %s (defensibility: %s) — %s\n',
            coalesce(item->>'indicator', ''),
            coalesce(item->>'defensibility', ''),
            coalesce(item->>'reasoning', ''));
        END LOOP;
      END IF;
    END IF;
    r := r || E'\n';
  END IF;

  -- ========== SCRIPT DEPTH TARGETS ==========
  IF include_script AND nvr.script_depth_targets IS NOT NULL THEN
    r := r || E'## Script Depth Targets\n';
    r := r || format(E'Target word count: %s\n', coalesce(nvr.script_depth_targets->>'target_word_count', '?'));
    r := r || format(E'Vocabulary level: %s\n', coalesce(nvr.script_depth_targets->>'vocabulary_level', '?'));
    r := r || format(E'Explanation depth: %s\n', coalesce(nvr.script_depth_targets->>'explanation_depth', '?'));
    IF nvr.script_depth_targets->>'reasoning' IS NOT NULL THEN
      r := r || format(E'Rationale: %s\n', nvr.script_depth_targets->>'reasoning');
    END IF;
    r := r || E'\n';
  END IF;

  -- ========== TITLE DNA ==========
  IF (include_topics OR include_metadata) AND nvr.title_dna_patterns IS NOT NULL THEN
    r := r || E'## Title DNA (proven formulas from analyzed competitors)\n';
    IF jsonb_typeof(nvr.title_dna_patterns->'common_formulas') = 'array' THEN
      FOR text_item IN SELECT jsonb_array_elements_text(nvr.title_dna_patterns->'common_formulas')
      LOOP
        r := r || format(E'- %s\n', text_item);
      END LOOP;
    END IF;
    IF nvr.title_dna_patterns->>'avg_title_length' IS NOT NULL THEN
      r := r || format(E'Average title length: %s chars\n', nvr.title_dna_patterns->>'avg_title_length');
    END IF;
    IF jsonb_typeof(nvr.title_dna_patterns->'emotional_triggers') = 'array' THEN
      r := r || format(E'Emotional triggers: %s\n',
        (SELECT string_agg(value, ', ') FROM jsonb_array_elements_text(nvr.title_dna_patterns->'emotional_triggers') value));
    END IF;
    r := r || E'\n';
  END IF;

  -- ========== THUMBNAIL DNA ==========
  IF include_metadata AND nvr.thumbnail_dna_patterns IS NOT NULL AND jsonb_typeof(nvr.thumbnail_dna_patterns) = 'array' THEN
    r := r || E'## Thumbnail DNA (inferred styles per competitor)\n';
    FOR item IN SELECT value FROM jsonb_array_elements(nvr.thumbnail_dna_patterns)
    LOOP
      r := r || format(E'- [%s] style: %s | text: %s | face: %s\n',
        coalesce(item->>'channel', '?'),
        coalesce(item->>'style', ''),
        coalesce(item->>'text_usage', ''),
        coalesce(item->>'face_likely', ''));
    END LOOP;
    r := r || E'\n';
  END IF;

  -- ========== TOPICS TO AVOID / SATURATED ==========
  IF include_topics OR include_script THEN
    IF nvr.id IS NOT NULL AND nvr.topics_to_avoid IS NOT NULL AND array_length(nvr.topics_to_avoid, 1) IS NOT NULL THEN
      r := r || E'## Topics to AVOID (saturated by analyzed competitors)\n';
      r := r || _fmt_array(nvr.topics_to_avoid);
      r := r || E'\n';
    END IF;
    IF nvr.saturated_topics IS NOT NULL AND jsonb_array_length(nvr.saturated_topics) > 0 THEN
      r := r || E'### Also saturated (niche-wide view)\n';
      FOR text_item IN SELECT jsonb_array_elements_text(nvr.saturated_topics)
      LOOP
        r := r || format(E'- %s\n', text_item);
      END LOOP;
      r := r || E'\n';
    END IF;
    IF jsonb_array_length(channels) > 0 THEN
      r := r || E'### Per-channel saturation map\n';
      FOR ch IN SELECT value FROM jsonb_array_elements(channels)
      LOOP
        IF jsonb_typeof(ch->'content_saturation_map') = 'array' THEN
          FOR item IN SELECT value FROM jsonb_array_elements(ch->'content_saturation_map')
          LOOP
            IF coalesce(item->>'saturation', '') IN ('oversaturated', 'moderate') THEN
              r := r || format(E'- [%s] %s: %s (%s videos seen) — %s\n',
                ch->>'channel_name',
                coalesce(item->>'topic', ''),
                coalesce(item->>'saturation', ''),
                coalesce(item->>'video_count_seen', '?'),
                coalesce(item->>'evidence', ''));
            END IF;
          END LOOP;
        END IF;
      END LOOP;
      r := r || E'\n';
    END IF;
  END IF;

  -- ========== BLUE OCEAN (from nvr) ==========
  IF (include_topics OR include_script) AND nvr.id IS NOT NULL THEN
    IF jsonb_array_length(nvr.blue_ocean_opportunities) > 0 THEN
      r := r || E'## Blue Ocean Opportunities (niche-level)\n';
      FOR item IN SELECT value FROM jsonb_array_elements(nvr.blue_ocean_opportunities)
      LOOP
        r := r || format(E'- %s  (demand=%s, saturation=%s, moat=%s, longevity=%s, confidence=%s)\n',
          coalesce(item->>'topic', item->>'opportunity', ''),
          coalesce(item->>'demand', ''),
          coalesce(item->>'saturation', ''),
          coalesce(item->>'moat_defensibility', ''),
          coalesce(item->>'longevity', ''),
          coalesce(item->>'confidence', ''));
        IF item->>'reasoning' IS NOT NULL THEN
          r := r || format(E'    reasoning: %s\n', item->>'reasoning');
        END IF;
        IF item->>'suggested_angle' IS NOT NULL THEN
          r := r || format(E'    suggested_angle: %s\n', item->>'suggested_angle');
        END IF;
      END LOOP;
      r := r || E'\n';
    END IF;
    IF jsonb_array_length(channels) > 0 THEN
      r := r || E'### Blue-ocean hints per channel\n';
      FOR ch IN SELECT value FROM jsonb_array_elements(channels)
      LOOP
        IF jsonb_typeof(ch->'blue_ocean_opportunities') = 'array' THEN
          FOR item IN SELECT value FROM jsonb_array_elements(ch->'blue_ocean_opportunities')
          LOOP
            r := r || format(E'- [%s] %s (difficulty=%s, demand=%s, confidence=%s) — %s\n',
              ch->>'channel_name',
              coalesce(item->>'opportunity', item->>'topic', ''),
              coalesce(item->>'difficulty', ''),
              coalesce(item->>'estimated_demand', ''),
              coalesce(item->>'confidence', ''),
              coalesce(item->>'rationale', ''));
            IF item->>'suggested_first_video' IS NOT NULL THEN
              r := r || format(E'    -> first video: %s\n', item->>'suggested_first_video');
            END IF;
          END LOOP;
        END IF;
      END LOOP;
      r := r || E'\n';
    END IF;
  END IF;

  -- ========== RECOMMENDED TOPICS (from nvr) ==========
  IF (include_topics OR include_metadata) AND nvr.id IS NOT NULL AND jsonb_array_length(nvr.recommended_topics) > 0 THEN
    r := r || E'## Recommended Topic Seeds (from nvr)\n';
    FOR item IN SELECT value FROM jsonb_array_elements(nvr.recommended_topics)
    LOOP
      r := r || format(E'- %s  (demand=%s, pillar=%s, keyword=%s)\n',
        coalesce(item->>'topic', ''),
        coalesce(item->>'demand', ''),
        coalesce(item->>'content_pillar', ''),
        coalesce(item->>'target_keyword', ''));
      IF item->>'angle' IS NOT NULL THEN
        r := r || format(E'    angle: %s\n', item->>'angle');
      END IF;
      IF item->>'suggested_title_formula' IS NOT NULL THEN
        r := r || format(E'    title formula: %s\n', item->>'suggested_title_formula');
      END IF;
      IF item->>'demand_evidence' IS NOT NULL THEN
        r := r || format(E'    evidence: %s\n', item->>'demand_evidence');
      END IF;
    END LOOP;
    r := r || E'\n';
  END IF;

  -- ========== PER-CHANNEL BENCHMARKS ==========
  IF jsonb_array_length(channels) > 0 THEN
    r := r || E'## Per-Channel Competitive Benchmarks\n';
    FOR ch IN SELECT value FROM jsonb_array_elements(channels)
    LOOP
      r := r || format(E'### %s (%s subs, %s avg views, growth=%s, verdict=%s %s/100)\n',
        ch->>'channel_name',
        coalesce(to_char((ch->>'subscriber_count')::BIGINT, 'FM999,999,999'), '?'),
        coalesce(to_char((ch->>'avg_views_per_video')::BIGINT, 'FM999,999,999'), '?'),
        coalesce(ch->>'growth_trajectory', '?'),
        coalesce(ch->>'verdict', '?'),
        coalesce(ch->>'verdict_score', '?'));
      IF ch->>'verdict_reasoning' IS NOT NULL THEN
        r := r || format(E'- verdict_reasoning: %s\n', ch->>'verdict_reasoning');
      END IF;
      IF include_topics OR include_script OR include_metadata THEN
        IF ch->>'target_audience_description' IS NOT NULL THEN
          r := r || format(E'- target audience: %s\n', ch->>'target_audience_description');
        END IF;
        IF ch->>'content_style' IS NOT NULL THEN
          r := r || format(E'- content style: %s\n', ch->>'content_style');
        END IF;
      END IF;
      IF include_script THEN
        IF ch->'scripting_depth' IS NOT NULL AND ch->'scripting_depth' <> 'null'::jsonb THEN
          r := r || format(E'- scripting depth: research=%s, structure=%s, quality=%s, avg_length=%s min, est_words=%s\n',
            coalesce(ch->'scripting_depth'->>'estimated_research_level', '?'),
            coalesce(ch->'scripting_depth'->>'narrative_structure', '?'),
            coalesce(ch->'scripting_depth'->>'production_quality', '?'),
            coalesce(ch->'scripting_depth'->>'avg_video_length_minutes', '?'),
            coalesce(ch->'scripting_depth'->>'estimated_words_per_video', '?'));
          IF jsonb_typeof(ch->'scripting_depth'->'engagement_hooks') = 'array' THEN
            r := r || format(E'  engagement hooks: %s\n',
              (SELECT string_agg(value, ', ') FROM jsonb_array_elements_text(ch->'scripting_depth'->'engagement_hooks') value));
          END IF;
        END IF;
        IF jsonb_typeof(ch->'strengths') = 'array' THEN
          r := r || E'- strengths:\n';
          FOR text_item IN SELECT jsonb_array_elements_text(ch->'strengths')
          LOOP
            r := r || format(E'    * %s\n', text_item);
          END LOOP;
        END IF;
        IF jsonb_typeof(ch->'weaknesses') = 'array' THEN
          r := r || E'- weaknesses:\n';
          FOR text_item IN SELECT jsonb_array_elements_text(ch->'weaknesses')
          LOOP
            r := r || format(E'    * %s\n', text_item);
          END LOOP;
        END IF;
      END IF;
      IF include_topics OR include_metadata THEN
        IF ch->'title_patterns' IS NOT NULL AND ch->'title_patterns' <> 'null'::jsonb THEN
          r := r || E'- title patterns:\n';
          IF jsonb_typeof(ch->'title_patterns'->'common_formulas') = 'array' THEN
            FOR text_item IN SELECT jsonb_array_elements_text(ch->'title_patterns'->'common_formulas')
            LOOP
              r := r || format(E'    * formula: %s\n', text_item);
            END LOOP;
          END IF;
          IF ch->'title_patterns'->>'uses_numbers_pct' IS NOT NULL THEN
            r := r || format(E'    * uses_numbers: %s%%, uses_questions: %s%%, avg_length: %s chars\n',
              coalesce(ch->'title_patterns'->>'uses_numbers_pct', '?'),
              coalesce(ch->'title_patterns'->>'uses_questions_pct', '?'),
              coalesce(ch->'title_patterns'->>'avg_title_length', '?'));
          END IF;
          IF jsonb_typeof(ch->'title_patterns'->'power_words_observed') = 'array' THEN
            r := r || format(E'    * power words: %s\n',
              (SELECT string_agg(value, ', ') FROM jsonb_array_elements_text(ch->'title_patterns'->'power_words_observed') value));
          END IF;
          IF jsonb_typeof(ch->'title_patterns'->'emotional_triggers') = 'array' THEN
            r := r || format(E'    * triggers: %s\n',
              (SELECT string_agg(value, ', ') FROM jsonb_array_elements_text(ch->'title_patterns'->'emotional_triggers') value));
          END IF;
          IF jsonb_typeof(ch->'title_patterns'->'common_opening_words') = 'array' THEN
            r := r || format(E'    * opening words: %s\n',
              (SELECT string_agg(value, ', ') FROM jsonb_array_elements_text(ch->'title_patterns'->'common_opening_words') value));
          END IF;
        END IF;
      END IF;
      IF include_metadata THEN
        IF ch->'thumbnail_patterns' IS NOT NULL AND ch->'thumbnail_patterns' <> 'null'::jsonb THEN
          r := r || format(E'- thumbnail style: %s (text=%s, face=%s, consistency=%s)\n',
            coalesce(ch->'thumbnail_patterns'->>'inferred_style', ''),
            coalesce(ch->'thumbnail_patterns'->>'text_usage', ''),
            coalesce(ch->'thumbnail_patterns'->>'face_likely', ''),
            coalesce(ch->'thumbnail_patterns'->>'brand_consistency', ''));
        END IF;
      END IF;
      IF include_topics OR include_metadata THEN
        IF jsonb_typeof(ch->'top_videos') = 'array' THEN
          r := r || E'- top videos (views, outlier×):\n';
          FOR item IN SELECT value FROM jsonb_array_elements(ch->'top_videos') LIMIT 5
          LOOP
            r := r || format(E'    * "%s" — %s views, %s× median (%s min)\n',
              coalesce(item->>'title', ''),
              coalesce(item->>'views', '?'),
              coalesce(item->>'outlier_score', '?'),
              coalesce((((item->>'duration_seconds')::INTEGER / 60))::TEXT, '?'));
          END LOOP;
        END IF;
      END IF;
      IF ch->>'primary_topics' IS NOT NULL AND jsonb_typeof(ch->'primary_topics') = 'array' THEN
        r := r || format(E'- primary topics: %s\n',
          (SELECT string_agg(value, '; ') FROM jsonb_array_elements_text(ch->'primary_topics') value));
      END IF;
      IF ch->>'posting_schedule' IS NOT NULL THEN
        r := r || format(E'- posting schedule: %s\n', ch->>'posting_schedule');
      END IF;
      r := r || E'\n';
    END LOOP;
  END IF;

  -- ========== NICHE PROFILE (NEW — from niche_profiles) ==========
  IF np.id IS NOT NULL AND (include_topics OR include_script) THEN
    r := r || E'## Niche Research Profile (latest niche_profiles scan)\n';

    -- blue_ocean_opportunities (jsonb: positioning_statement, unoccupied_angles[], value_curve_gaps[])
    IF np.blue_ocean_opportunities IS NOT NULL THEN
      IF np.blue_ocean_opportunities->>'positioning_statement' IS NOT NULL THEN
        r := r || format(E'**Positioning statement:** %s\n\n', np.blue_ocean_opportunities->>'positioning_statement');
      END IF;
      IF jsonb_typeof(np.blue_ocean_opportunities->'unoccupied_angles') = 'array' THEN
        r := r || E'### Unoccupied angles (blue ocean, from niche profile)\n';
        FOR item IN SELECT value FROM jsonb_array_elements(np.blue_ocean_opportunities->'unoccupied_angles')
        LOOP
          r := r || format(E'- **%s**: %s  (why blue-ocean: %s)\n',
            coalesce(item->>'angle', ''),
            coalesce(item->>'description', ''),
            coalesce(item->>'why_blue_ocean', ''));
        END LOOP;
      END IF;
      IF jsonb_typeof(np.blue_ocean_opportunities->'value_curve_gaps') = 'array' THEN
        r := r || E'### Value-curve gaps\n';
        FOR item IN SELECT value FROM jsonb_array_elements(np.blue_ocean_opportunities->'value_curve_gaps')
        LOOP
          r := r || format(E'- [%s] %s  —  evidence: %s\n',
            coalesce(item->>'dimension', ''),
            coalesce(item->>'gap', ''),
            coalesce(item->>'evidence', ''));
        END LOOP;
      END IF;
    END IF;

    -- competitor_analysis (jsonb: channels[], top_videos[], gaps[])
    IF np.competitor_analysis IS NOT NULL THEN
      IF jsonb_typeof(np.competitor_analysis->'channels') = 'array' THEN
        r := r || E'### Niche-scan competitors (from niche_profile scan)\n';
        FOR item IN SELECT value FROM jsonb_array_elements(np.competitor_analysis->'channels')
        LOOP
          r := r || format(E'- **%s** — %s subs, %s avg views. Gaps: %s. Red-ocean: %s\n',
            coalesce(item->>'name', ''),
            coalesce(item->>'subscribers_estimate', '?'),
            coalesce(item->>'avg_views', '?'),
            coalesce(
              (SELECT string_agg(value, '; ') FROM jsonb_array_elements_text(item->'content_gaps') value),
              ''),
            coalesce(
              (SELECT string_agg(value, '; ') FROM jsonb_array_elements_text(item->'red_ocean_topics') value),
              ''));
        END LOOP;
      END IF;
      IF jsonb_typeof(np.competitor_analysis->'top_videos') = 'array' AND (include_topics OR include_metadata) THEN
        r := r || E'### Niche-scan top videos\n';
        FOR item IN SELECT value FROM jsonb_array_elements(np.competitor_analysis->'top_videos')
        LOOP
          r := r || format(E'- "%s" by %s — %s views (%s, why won: %s)\n',
            coalesce(item->>'title', ''),
            coalesce(item->>'channel', ''),
            coalesce(item->>'views', '?'),
            coalesce(item->>'runtime', '?'),
            coalesce(item->>'why_it_won', ''));
        END LOOP;
      END IF;
      IF jsonb_typeof(np.competitor_analysis->'gaps') = 'array' THEN
        r := r || E'### Niche-scan identified gaps\n';
        FOR text_item IN SELECT jsonb_array_elements_text(np.competitor_analysis->'gaps')
        LOOP
          r := r || format(E'- %s\n', text_item);
        END LOOP;
      END IF;
    END IF;

    -- audience_pain_points (jsonb: reddit[], quora[], forums[])
    IF np.audience_pain_points IS NOT NULL THEN
      r := r || E'### Raw audience pain-point quotes (from niche scan)\n';
      IF jsonb_typeof(np.audience_pain_points->'reddit') = 'array' THEN
        FOR text_item IN SELECT jsonb_array_elements_text(np.audience_pain_points->'reddit')
        LOOP
          r := r || format(E'- [reddit] %s\n', text_item);
        END LOOP;
      END IF;
      IF jsonb_typeof(np.audience_pain_points->'quora') = 'array' THEN
        FOR text_item IN SELECT jsonb_array_elements_text(np.audience_pain_points->'quora')
        LOOP
          r := r || format(E'- [quora] %s\n', text_item);
        END LOOP;
      END IF;
      IF jsonb_typeof(np.audience_pain_points->'forums') = 'array' THEN
        FOR text_item IN SELECT jsonb_array_elements_text(np.audience_pain_points->'forums')
        LOOP
          r := r || format(E'- [forums] %s\n', text_item);
        END LOOP;
      END IF;
    END IF;

    -- keyword_research (jsonb: high_volume[], low_competition[], trending[])
    IF np.keyword_research IS NOT NULL AND (include_topics OR include_metadata) THEN
      r := r || E'### Keyword research (from niche scan)\n';
      IF jsonb_typeof(np.keyword_research->'high_volume') = 'array' THEN
        r := r || format(E'- High-volume: %s\n',
          coalesce(
            (SELECT string_agg(value, ', ') FROM jsonb_array_elements_text(np.keyword_research->'high_volume') value),
            ''));
      END IF;
      IF jsonb_typeof(np.keyword_research->'low_competition') = 'array' THEN
        r := r || format(E'- Low-competition: %s\n',
          coalesce(
            (SELECT string_agg(value, ', ') FROM jsonb_array_elements_text(np.keyword_research->'low_competition') value),
            ''));
      END IF;
      IF jsonb_typeof(np.keyword_research->'trending') = 'array' THEN
        r := r || format(E'- Trending: %s\n',
          coalesce(
            (SELECT string_agg(value, ', ') FROM jsonb_array_elements_text(np.keyword_research->'trending') value),
            ''));
      END IF;
    END IF;

    -- search_queries_used (audit: what queries drove the scan)
    IF np.search_queries_used IS NOT NULL AND array_length(np.search_queries_used, 1) IS NOT NULL THEN
      r := r || format(E'Search queries used during niche scan: %s\n',
        array_to_string(np.search_queries_used, ', '));
    END IF;
    r := r || E'\n';
  END IF;

  -- ========== RESEARCH RUN + CATEGORIES + RESULTS (NEW — Topic Intelligence scrape) ==========
  IF rr.id IS NOT NULL AND (include_topics OR include_script) THEN
    r := r || E'## Topic Intelligence Scan (latest research_run)\n';
    r := r || format(E'Input niche: %s | Time range: %s | Platforms: %s\n',
      coalesce(rr.niche_input, proj.niche),
      coalesce(rr.time_range, 'unspecified'),
      coalesce(array_to_string(rr.platforms, ', '), ''));
    IF rr.derived_keywords IS NOT NULL AND array_length(rr.derived_keywords, 1) IS NOT NULL THEN
      r := r || format(E'Derived keywords (drove the scan): %s\n',
        array_to_string(rr.derived_keywords, ', '));
    END IF;
    r := r || format(E'Scan produced %s results in %s categories\n\n',
      coalesce(rr.total_results::TEXT, '?'),
      coalesce(rr.total_categories::TEXT, '?'));

    IF jsonb_array_length(rcats) > 0 THEN
      r := r || E'### Ranked content clusters (with AI-suggested video title per cluster)\n';
      FOR cat IN SELECT value FROM jsonb_array_elements(rcats)
      LOOP
        r := r || format(E'%s. **%s** (engagement=%s, results=%s)\n   %s\n   → Suggested title: %s\n',
          coalesce(cat->>'rank', '?'),
          coalesce(cat->>'label', ''),
          coalesce(cat->>'total_engagement', '0'),
          coalesce(cat->>'result_count', '0'),
          coalesce(cat->>'summary', ''),
          coalesce(cat->>'top_video_title', 'N/A'));
      END LOOP;
      r := r || E'\n';
    END IF;

    IF jsonb_array_length(rres) > 0 THEN
      r := r || E'### High-engagement source items (top 25)\n';
      FOR res IN SELECT value FROM jsonb_array_elements(rres)
      LOOP
        r := r || format(E'- [%s, score=%s, upvotes=%s, comments=%s, shares=%s] %s\n',
          upper(coalesce(res->>'source', '?')),
          coalesce(res->>'engagement_score', '0'),
          coalesce(res->>'upvotes', '0'),
          coalesce(res->>'comments', '0'),
          coalesce(res->>'shares', '0'),
          coalesce(substring(res->>'raw_text' from 1 for 400), ''));
        IF res->>'ai_video_title' IS NOT NULL THEN
          r := r || format(E'  → AI-suggested title: %s\n', res->>'ai_video_title');
        END IF;
        IF res->'metadata' IS NOT NULL AND res->'metadata' <> 'null'::jsonb THEN
          IF res->'metadata'->>'subreddit' IS NOT NULL THEN
            r := r || format(E'  [subreddit: %s, author: %s]\n',
              res->'metadata'->>'subreddit',
              coalesce(res->'metadata'->>'author', ''));
          END IF;
        END IF;
      END LOOP;
      r := r || E'\n';
    END IF;
  END IF;

  -- ========== PER-VIDEO COMPETITOR ANALYSES (NEW — yt_video_analyses) ==========
  IF (include_topics OR include_script) AND jsonb_array_length(ytv) > 0 THEN
    r := r || E'## Per-Video Competitor Deep-Analysis (yt_video_analyses, top 10 by views)\n';
    FOR item IN SELECT value FROM jsonb_array_elements(ytv)
    LOOP
      r := r || format(E'### "%s" by %s\n',
        coalesce(item->>'video_title', ''),
        coalesce(item->>'channel_name', ''));
      r := r || format(E'- %s views | %s likes | %s comments\n',
        coalesce(item->>'views', '?'),
        coalesce(item->>'likes', '0'),
        coalesce(item->>'comments', '0'));

      IF item->'analysis' IS NOT NULL AND item->'analysis' <> 'null'::jsonb THEN
        IF item->'analysis'->>'overall_score' IS NOT NULL THEN
          r := r || format(E'- Overall score: %s/10 — %s\n',
            item->'analysis'->>'overall_score',
            coalesce(item->'analysis'->>'one_line_summary', ''));
        END IF;

        IF jsonb_typeof(item->'analysis'->'strengths') = 'array' AND include_script THEN
          r := r || E'- Strengths (what they do well):\n';
          FOR text_item IN SELECT jsonb_array_elements_text(item->'analysis'->'strengths')
          LOOP
            r := r || format(E'    + %s\n', text_item);
          END LOOP;
        END IF;
        IF jsonb_typeof(item->'analysis'->'weaknesses') = 'array' THEN
          r := r || E'- Weaknesses (exploitation targets):\n';
          FOR text_item IN SELECT jsonb_array_elements_text(item->'analysis'->'weaknesses')
          LOOP
            r := r || format(E'    - %s\n', text_item);
          END LOOP;
        END IF;

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
            r := r || E'    Unique insights they brought:\n';
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

        IF item->'analysis'->'ten_x_strategy' IS NOT NULL THEN
          r := r || E'- 10x strategy (how to beat this video):\n';
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
      END IF;
      r := r || E'\n';
    END LOOP;
  END IF;

  -- ========== AUDIENCE INSIGHTS (NEW — script stage only) ==========
  IF include_script AND aud.id IS NOT NULL THEN
    r := r || E'## Audience Insights (weekly synthesis)\n';
    IF aud.audience_context_block IS NOT NULL AND length(aud.audience_context_block) > 0 THEN
      r := r || aud.audience_context_block || E'\n';
    ELSE
      IF aud.audience_persona_summary IS NOT NULL THEN
        r := r || format(E'**Persona summary:** %s\n\n', aud.audience_persona_summary);
      END IF;
      IF aud.dominant_persona_traits IS NOT NULL AND aud.dominant_persona_traits <> 'null'::jsonb THEN
        r := r || format(E'Dominant persona traits: %s\n', aud.dominant_persona_traits::TEXT);
      END IF;
      IF aud.vocabulary_level IS NOT NULL THEN
        r := r || format(E'Vocabulary level: %s\n', aud.vocabulary_level);
      END IF;
      IF aud.assumed_prior_knowledge IS NOT NULL AND aud.assumed_prior_knowledge <> 'null'::jsonb THEN
        r := r || format(E'Assumed prior knowledge: %s\n', aud.assumed_prior_knowledge::TEXT);
      END IF;
      IF jsonb_typeof(aud.recurring_questions) = 'array' THEN
        r := r || E'Recurring questions from audience:\n';
        FOR item IN SELECT value FROM jsonb_array_elements(aud.recurring_questions)
        LOOP
          r := r || format(E'- %s\n',
            CASE WHEN jsonb_typeof(item) = 'string' THEN item#>>'{}' ELSE item::TEXT END);
        END LOOP;
      END IF;
      IF jsonb_typeof(aud.content_complaints) = 'array' THEN
        r := r || E'Recurring content complaints:\n';
        FOR item IN SELECT value FROM jsonb_array_elements(aud.content_complaints)
        LOOP
          r := r || format(E'- %s\n',
            CASE WHEN jsonb_typeof(item) = 'string' THEN item#>>'{}' ELSE item::TEXT END);
        END LOOP;
      END IF;
      IF jsonb_typeof(aud.topic_suggestions) = 'array' THEN
        r := r || E'Audience topic suggestions:\n';
        FOR item IN SELECT value FROM jsonb_array_elements(aud.topic_suggestions)
        LOOP
          r := r || format(E'- %s\n',
            CASE WHEN jsonb_typeof(item) = 'string' THEN item#>>'{}' ELSE item::TEXT END);
        END LOOP;
      END IF;
      IF jsonb_typeof(aud.frequent_objections) = 'array' THEN
        r := r || E'Frequent objections to preempt:\n';
        FOR item IN SELECT value FROM jsonb_array_elements(aud.frequent_objections)
        LOOP
          r := r || format(E'- %s\n',
            CASE WHEN jsonb_typeof(item) = 'string' THEN item#>>'{}' ELSE item::TEXT END);
        END LOOP;
      END IF;
    END IF;
    r := r || format(E'\n_Based on %s comments analyzed (week_of %s): %s questions, %s complaints, %s praise, %s suggestions, %s noise._\n\n',
      coalesce(aud.comments_analyzed::TEXT, '?'),
      coalesce(aud.week_of::TEXT, '?'),
      coalesce(aud.questions_count::TEXT, '?'),
      coalesce(aud.complaints_count::TEXT, '?'),
      coalesce(aud.praise_count::TEXT, '?'),
      coalesce(aud.suggestions_count::TEXT, '?'),
      coalesce(aud.noise_count::TEXT, '?'));
  END IF;

  -- ========== FOOTER ==========
  r := r || format(E'---\n_Rendered by render_project_intelligence(%s, %s) [v2, 9-table coverage]. Source-of-truth tables: projects, niche_viability_reports, channel_analyses, niche_profiles, yt_video_analyses, research_runs, research_categories, research_results, audience_insights._\n', p_project_id, stage);

  RETURN r;
END;
$$;

COMMENT ON FUNCTION render_project_intelligence(UUID, TEXT) IS
  'Canonical prompt-ready rendering of all project intelligence across 9 source tables. '
  'Stages: topics, script, metadata, all. Every downstream workflow MUST call this function '
  'instead of hand-assembling prompt context. Adding a new intelligence column to any source '
  'table REQUIRES adding it here — enforced by _intelligence_coverage_check().';

-- ---------- Coverage enforcement v2 (9 tables) ----------

CREATE OR REPLACE FUNCTION _intelligence_coverage_check()
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  fn_body   TEXT;
  rec       RECORD;
  missing   TEXT := '';
  -- Housekeeping columns we deliberately do NOT expose to Claude prompts.
  -- Add to this whitelist (not to the renderer) when adding a new column
  -- that is purely operational (IDs, timestamps, status, URLs, counters, costs).
  whitelist TEXT[] := ARRAY[
    -- === projects ===
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
    'niche_system_prompt',
    'revenue_potential_score', 'rpm_classified_at', 'script_approach',
    'blue_ocean_angle', 'competitive_analysis',
    'reference_analyses', 'style_dna',
    'channel_analysis_context', 'script_reference_data',
    'niche_viability_score', 'niche_viability_verdict',
    'playlist1_name', 'playlist1_theme', 'playlist2_name', 'playlist2_theme',
    'playlist3_name', 'playlist3_theme', 'playlist4_name', 'playlist4_theme',
    'playlist5_name', 'playlist5_theme',
    'estimated_rpm_low', 'estimated_rpm_mid', 'estimated_rpm_high',
    'analysis_group_id',
    -- === channel_analyses ===
    'project_id', 'channel_url', 'channel_avatar_url', 'channel_banner_url',
    'channel_created_at', 'analyzed_at', 'analysis_duration_seconds',
    'analysis_cost_usd', 'error_message',
    'comments_fetched', 'median_views_per_video', 'total_view_count',
    'upload_frequency_days', 'video_count', 'estimated_monthly_views',
    'avg_video_duration_seconds', 'country', 'custom_url', 'channel_description',
    -- === niche_viability_reports ===
    'channels_analyzed',
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
    -- always-housekeeping everywhere
    'created_at', 'updated_at'
  ];
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO fn_body
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.proname = 'render_project_intelligence'
     AND n.nspname = 'public';

  IF fn_body IS NULL THEN
    RAISE EXCEPTION 'render_project_intelligence function not found';
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
      'Intelligence coverage check FAILED (v2, 9 tables). These columns are neither referenced '
      'in render_project_intelligence nor in the housekeeping whitelist:%', missing;
  END IF;
END $$;

SELECT _intelligence_coverage_check();

-- ---------- Template variable verifier ----------
-- Scans system_prompts.prompt_text for {placeholder} tokens and compares
-- against an expected set. Workflows must fill every placeholder that
-- appears in any template. Missing variables = Claude gets literal {foo}
-- in its input.
--
-- Usage:
--   SELECT * FROM _verify_script_template_vars(ARRAY[
--     'subtopic', 'niche_category', 'target_audience_segment',
--     'audience_avatar', 'psychographics', 'key_emotional_drivers',
--     'viewer_search_intent', 'core_domain_framework',
--     'primary_problem_trigger', 'content_angle_blue_ocean',
--     'video_style_structure', 'practical_takeaways',
--     'PASS_1_OUTPUT', 'PASS_1_SUMMARY', 'PASS_2_SUMMARY',
--     'CHARACTER_NAME', 'PASS_NUMBER', 'WORD_TARGET_FOR_THIS_PASS',
--     'ATTEMPT_NUMBER', 'PASS_OUTPUT', 'COMPOSITE_SCORE',
--     'FAILURES_LIST', 'RETRY_GUIDANCE_FROM_EVALUATOR',
--     'WORD_COUNT_ESTIMATE', 'ORIGINAL_PASS_PROMPT',
--     'LIST_OF_METAPHORS', 'LIST_OF_NOTABLE_PHRASES'
--   ]);

CREATE OR REPLACE FUNCTION _verify_script_template_vars(p_known_vars TEXT[] DEFAULT '{}')
RETURNS TABLE (
  prompt_type TEXT,
  placeholder TEXT,
  is_known    BOOLEAN
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  rec       RECORD;
  match_arr TEXT[];
  found_var TEXT;
BEGIN
  FOR rec IN (
    SELECT sp.prompt_type AS ptype, sp.prompt_text AS ptext
      FROM system_prompts sp
     WHERE sp.is_active = true
       AND sp.prompt_type IN (
         'script_system_prompt',
         'script_pass1', 'script_pass2', 'script_pass3',
         'script_evaluator', 'script_retry_template'
       )
  ) LOOP
    -- Extract all {TOKEN} patterns. Match [A-Za-z_][A-Za-z0-9_]* inside braces.
    FOR match_arr IN
      SELECT regexp_matches(rec.ptext, '\{([A-Za-z_][A-Za-z0-9_\-]*)\}', 'g')
    LOOP
      found_var := match_arr[1];
      prompt_type := rec.ptype;
      placeholder := found_var;
      is_known := found_var = ANY(p_known_vars);
      RETURN NEXT;
    END LOOP;
  END LOOP;
  RETURN;
END $$;

COMMENT ON FUNCTION _verify_script_template_vars(TEXT[]) IS
  'Returns every {placeholder} found in active script templates, with a flag '
  'indicating whether it is in the caller-supplied known-vars set. Run after '
  'editing any system_prompts row to catch new placeholders the workflow has '
  'not been updated to fill. Unknown placeholders = Claude sees literal {foo}.';

-- ---------- Rollback ----------
-- DROP FUNCTION IF EXISTS render_project_intelligence(UUID, TEXT);
-- DROP FUNCTION IF EXISTS _intelligence_coverage_check();
-- DROP FUNCTION IF EXISTS _verify_script_template_vars(TEXT[]);
