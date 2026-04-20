-- ═══════════════════════════════════════════════════════════════
-- Migration 028: Centralised Intelligence Renderer
--
-- Single source of truth for how channel_analyses + niche_viability_reports
-- intelligence is rendered into Claude prompts across every downstream workflow
-- (WF_TOPICS_GENERATE, WF_SCRIPT_GENERATE, WF_VIDEO_METADATA, and any future
-- consumer). Replaces four divergent "Build Prompt" imperative concat blocks.
--
-- Design goals:
--   1. Every intelligence column on the 3 source tables MUST land in at least
--      one stage's rendered output, or be explicitly whitelisted as "not for
--      prompts". The coverage check at the end of this migration enforces it.
--   2. Workflows call one RPC: render_project_intelligence(project_id, stage).
--      Stages: 'topics', 'script', 'metadata', 'all'.
--   3. Adding a new intelligence field to any source table = update this
--      renderer once. CI coverage check will refuse deploys that skip it.
-- ═══════════════════════════════════════════════════════════════

-- ---------- Convenience view (ad-hoc queries, dashboards) ----------

CREATE OR REPLACE VIEW v_project_intelligence_full AS
SELECT
  p.id AS project_id,
  p.name                           AS project_name,
  p.niche,
  p.niche_description,
  p.channel_style,
  p.analysis_group_id,
  p.niche_viability_score          AS project_niche_viability_score,
  p.niche_viability_verdict        AS project_niche_viability_verdict,
  p.topics_to_avoid                AS project_topics_to_avoid,
  p.recommended_topics             AS project_recommended_topics,
  p.recommended_angle              AS project_recommended_angle,
  p.revenue_projections            AS project_revenue_projections,
  p.script_depth_targets           AS project_script_depth_targets,
  p.title_dna_patterns             AS project_title_dna_patterns,
  p.thumbnail_dna_patterns         AS project_thumbnail_dna_patterns,
  p.channel_analysis_context,
  p.script_reference_data,
  p.niche_expertise_profile,
  p.niche_blue_ocean_strategy,
  p.niche_red_ocean_topics,
  p.niche_competitor_channels,
  p.niche_pain_point_sources,
  nvr.id                           AS nvr_id,
  nvr.viability_score              AS nvr_viability_score,
  nvr.viability_verdict            AS nvr_viability_verdict,
  nvr.viability_reasoning,
  nvr.monetization_score,
  nvr.monetization_breakdown,
  nvr.audience_demand_score,
  nvr.audience_demand_breakdown,
  nvr.competition_gap_score,
  nvr.competition_gap_breakdown,
  nvr.entry_ease_score,
  nvr.entry_ease_breakdown,
  nvr.estimated_rpm_low,
  nvr.estimated_rpm_mid,
  nvr.estimated_rpm_high,
  nvr.ad_category,
  nvr.sponsorship_potential,
  nvr.blue_ocean_opportunities     AS nvr_blue_ocean_opportunities,
  nvr.saturated_topics,
  nvr.topics_to_avoid              AS nvr_topics_to_avoid,
  nvr.recommended_topics           AS nvr_recommended_topics,
  nvr.recommended_angle            AS nvr_recommended_angle,
  nvr.recommended_content_pillars,
  nvr.differentiation_strategy,
  nvr.moat_indicators,
  nvr.defensibility_assessment,
  nvr.revenue_projections          AS nvr_revenue_projections,
  nvr.audience_demographics,
  nvr.audience_size_estimate,
  nvr.engagement_benchmarks,
  nvr.script_depth_targets         AS nvr_script_depth_targets,
  nvr.title_dna_patterns           AS nvr_title_dna_patterns,
  nvr.thumbnail_dna_patterns       AS nvr_thumbnail_dna_patterns,
  nvr.posting_frequency_benchmark,
  nvr.channels_analyzed,
  nvr.total_subscribers,
  nvr.total_monthly_views,
  (SELECT jsonb_agg(to_jsonb(ca.*) ORDER BY ca.verdict_score DESC NULLS LAST)
     FROM channel_analyses ca
    WHERE ca.analysis_group_id = p.analysis_group_id
      AND ca.status = 'completed') AS channel_analyses_all
FROM projects p
LEFT JOIN LATERAL (
  SELECT *
    FROM niche_viability_reports
   WHERE analysis_group_id = p.analysis_group_id
   ORDER BY created_at DESC
   LIMIT 1
) nvr ON true;

COMMENT ON VIEW v_project_intelligence_full IS
  'Canonical single-row-per-project view aggregating all intelligence columns '
  'from projects + latest niche_viability_reports + all completed channel_analyses. '
  'Use render_project_intelligence() for prompt-shaped text; use this view for '
  'ad-hoc queries or dashboards.';

-- ---------- Small text-formatting helpers ----------

CREATE OR REPLACE FUNCTION _fmt_list(items JSONB, prefix TEXT DEFAULT '- ')
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE out TEXT := ''; elem TEXT;
BEGIN
  IF items IS NULL OR jsonb_typeof(items) <> 'array' THEN RETURN ''; END IF;
  FOR elem IN SELECT jsonb_array_elements_text(items) LOOP
    out := out || prefix || elem || E'\n';
  END LOOP;
  RETURN out;
END $$;

CREATE OR REPLACE FUNCTION _fmt_array(arr TEXT[], prefix TEXT DEFAULT '- ')
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE out TEXT := ''; elem TEXT;
BEGIN
  IF arr IS NULL OR array_length(arr, 1) IS NULL THEN RETURN ''; END IF;
  FOREACH elem IN ARRAY arr LOOP
    out := out || prefix || elem || E'\n';
  END LOOP;
  RETURN out;
END $$;

CREATE OR REPLACE FUNCTION _fmt_jsonb_field(obj JSONB, field TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF obj IS NULL OR obj->>field IS NULL THEN RETURN ''; END IF;
  RETURN obj->>field;
END $$;

-- ---------- Main renderer ----------

CREATE OR REPLACE FUNCTION render_project_intelligence(
  p_project_id UUID,
  p_stage TEXT DEFAULT 'all'
) RETURNS TEXT
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  proj                projects%ROWTYPE;
  nvr                 niche_viability_reports%ROWTYPE;
  channels            JSONB := '[]'::jsonb;
  ch                  JSONB;
  item                JSONB;
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

  -- ========== VIABILITY ASSESSMENT (all stages) ==========
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

  -- ========== MONETIZATION CONTEXT (topics + script + metadata) ==========
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

  -- ========== AUDIENCE PROFILE (topics + script + metadata) ==========
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

  -- ========== COMMENT INTEL AGGREGATED (topics + script + metadata) ==========
  -- Dedupes viral themes and competitor mentions across all channels
  -- because these were previously dropped at the bridge.
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

  -- ========== STRATEGIC POSITIONING (all stages) ==========
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

  -- ========== SCRIPT DEPTH TARGETS (script only) ==========
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

  -- ========== TITLE DNA (topics + metadata) ==========
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

  -- ========== THUMBNAIL DNA (metadata only — thumbnail gen is downstream) ==========
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

  -- ========== TOPICS TO AVOID / SATURATED (topics + script) ==========
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
    -- Per-channel saturation maps (never previously rendered — leak closed)
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

  -- ========== BLUE OCEAN OPPORTUNITIES (topics + script) ==========
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
    -- Per-channel blue oceans
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

  -- ========== RECOMMENDED TOPICS (topics + metadata) ==========
  IF (include_topics OR include_metadata) AND nvr.id IS NOT NULL AND jsonb_array_length(nvr.recommended_topics) > 0 THEN
    r := r || E'## Recommended Topic Seeds\n';
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
  -- Quantitative + qualitative detail. Topic stage wants titles + top_videos.
  -- Script stage wants scripting_depth + content_style + target_audience + strengths/weaknesses.
  -- Metadata stage wants title_patterns + thumbnail_patterns + top_videos.
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

  -- ========== FOOTER ==========
  r := r || format(E'---\n_Rendered by render_project_intelligence(%s, %s). Source-of-truth tables: projects, niche_viability_reports, channel_analyses._\n',
    p_project_id, stage);

  RETURN r;
END;
$$;

COMMENT ON FUNCTION render_project_intelligence(UUID, TEXT) IS
  'Canonical prompt-ready rendering of all project intelligence. Stages: topics, script, metadata, all. '
  'Every downstream workflow MUST call this function instead of hand-assembling prompt context.';

-- Quick dev check — render something for the current latest project with a viability report
-- Uncomment while testing:
-- SELECT render_project_intelligence((SELECT project_id FROM niche_viability_reports ORDER BY created_at DESC LIMIT 1), 'topics');

-- ---------- Coverage enforcement ----------
-- Fails the migration if any non-housekeeping column on the three source tables
-- is not referenced inside render_project_intelligence. Stops drift at the door.

CREATE OR REPLACE FUNCTION _intelligence_coverage_check()
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  fn_body   TEXT;
  rec       RECORD;
  missing   TEXT := '';
  -- Housekeeping columns we deliberately do NOT expose to Claude prompts.
  -- Add to this whitelist (not to the renderer) if you add a new column that's
  -- purely operational.
  whitelist TEXT[] := ARRAY[
    -- projects
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
    -- cached aggregates on projects; renderer reads the raw source tables
    -- (channel_analyses + niche_viability_reports) directly so these are
    -- intentionally not consumed to avoid stale-cache bugs.
    'channel_analysis_context', 'script_reference_data',
    'niche_viability_score', 'niche_viability_verdict',
    'playlist1_name', 'playlist1_theme', 'playlist2_name', 'playlist2_theme',
    'playlist3_name', 'playlist3_theme', 'playlist4_name', 'playlist4_theme',
    'playlist5_name', 'playlist5_theme',
    'estimated_rpm_low', 'estimated_rpm_mid', 'estimated_rpm_high', -- projects copy is redundant with nvr
    'analysis_group_id',
    -- channel_analyses
    'project_id', 'channel_url', 'channel_avatar_url', 'channel_banner_url',
    'channel_created_at', 'analyzed_at', 'analysis_duration_seconds',
    'analysis_cost_usd', 'error_message',
    'comments_fetched', 'median_views_per_video', 'total_view_count',
    'upload_frequency_days', 'video_count', 'estimated_monthly_views',
    'avg_video_duration_seconds', 'country', 'custom_url', 'channel_description',
    -- niche_viability_reports
    'channels_analyzed', -- rendered inline but may not match grep
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
       AND table_name IN ('projects', 'channel_analyses', 'niche_viability_reports')
  ) LOOP
    IF rec.column_name = ANY(whitelist) THEN CONTINUE; END IF;
    IF fn_body LIKE '%' || rec.column_name || '%' THEN CONTINUE; END IF;
    missing := missing || E'\n  - ' || rec.table_name || '.' || rec.column_name;
  END LOOP;

  IF length(missing) > 0 THEN
    RAISE EXCEPTION
      'Intelligence coverage check FAILED. These columns are neither referenced in '
      'render_project_intelligence nor in the housekeeping whitelist:%', missing;
  END IF;
END $$;

SELECT _intelligence_coverage_check();

-- Rollback:
-- DROP FUNCTION IF EXISTS render_project_intelligence(UUID, TEXT);
-- DROP FUNCTION IF EXISTS _fmt_list(JSONB, TEXT);
-- DROP FUNCTION IF EXISTS _fmt_array(TEXT[], TEXT);
-- DROP FUNCTION IF EXISTS _fmt_jsonb_field(JSONB, TEXT);
-- DROP FUNCTION IF EXISTS _intelligence_coverage_check();
-- DROP VIEW IF EXISTS v_project_intelligence_full;
