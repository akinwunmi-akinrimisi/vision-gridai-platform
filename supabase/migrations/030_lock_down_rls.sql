-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 030 — Lock down RLS on all Vision GridAI public tables
-- Closes findings C-1, C-2, C-3 from docs/SECURITY_AUDIT_2026_04_21.md
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Context: every VG public table previously carried one or more permissive
-- policies of the form `FOR ALL USING (true)` (or anon_read=true / anon_write
-- splits) granted to role `public` or `anon`. Because `VITE_SUPABASE_ANON_KEY`
-- is baked into the dashboard bundle served to anyone on the internet, this
-- policy gave anonymous attackers full SELECT/INSERT/UPDATE/DELETE on every
-- project, topic, script narration, viability report, comment, and social
-- account OAuth token. Audit PoCs are in §6 of the audit doc; multiple live
-- exfil events were confirmed.
--
-- This migration is surgical to the 49 VG tables below. It does NOT touch
-- tables owned by other apps sharing the same Supabase instance:
--   - cb_*              (Cloudboosta)
--   - exercises, foods, mobility_breaks, sessions, session_logs,
--     session_exercises, set_logs, body_metrics, cardio_logs, daily_checkins,
--     mobility_logs, nutrition_entries, pain_notes, phases, plans, profiles,
--     progress_photos, user_saved_meals, user_saved_meal_items, water_logs,
--     weeks, adaptations                                      (Fitness app)
--   - call_logs, leads, pricing, dial_schedules, programmes,
--     objection_responses, pipeline_runs, pipeline_logs       (Sales CRM)
--   - knowledge_base                                          (service_role only)
--
-- Expected dashboard impact: ALL anon-key reads/writes from the React SPA
-- stop working. This is intentional. Batch 2 of the remediation routes the
-- dashboard through authenticated n8n webhooks to restore functionality.
--
-- ──────────────────────────────────────────────────────────────────────────
-- VG tables locked down (49) — audit trail:
-- ──────────────────────────────────────────────────────────────────────────
--  1. analysis_groups              — niche viability grouping (022)
--  2. audience_comments            — YouTube comment memory (017)
--  3. audience_insights            — aggregated audience intel (017)
--  4. avatars                      — topic customer avatars (001)
--  5. channel_analyses             — YouTube channel analyzer output (020)
--  6. channel_comparison_reports   — comparative analyses (020)
--  7. coach_messages               — AI advisor chat messages (015)
--  8. coach_sessions               — AI advisor sessions (015)
--  9. comments                     — unified engagement feed (004)
-- 10. competitor_alerts            — competitor change alerts (011)
-- 11. competitor_channels          — tracked competitor channels (011)
-- 12. competitor_intelligence      — aggregated competitor intel (011)
-- 13. competitor_videos            — competitor video catalog (011)
-- 14. cost_calculator_snapshots    — cost projections per video
-- 15. daily_ideas                  — AI-generated daily topic ideas (015)
-- 16. discovered_channels          — YouTube discovery results (020)
-- 17. keywords                     — niche keyword graph (010)
-- 18. music_library                — Lyria + manual music tracks (004)
-- 19. niche_health_history         — niche health scoring history (016)
-- 20. niche_profiles               — AI-generated niche profiles (001)
-- 21. niche_viability_reports      — viability analyses (021)
-- 22. platform_metadata            — per-platform titles/desc (004)
-- 23. pps_calibration              — prediction model calibration (013)
-- 24. pps_config                   — prediction model config (013)
-- 25. production_log               — production audit trail (001)
-- 26. production_logs              — structured API-call log (004)
-- 27. production_registers         — production pipeline registers (023)
-- 28. projects                     — top-level project records (001)
-- 29. prompt_configs               — AI prompt template versions (001)
-- 30. renders                      — platform-specific renders (004)
-- 31. research_categories          — Topic Intel categories (002)
-- 32. research_results             — Topic Intel raw results (002)
-- 33. research_runs                — Topic Intel orchestrator state (002)
-- 34. revenue_attribution          — ad revenue attribution (016)
-- 35. rpm_benchmarks               — CPM/RPM benchmark reference (010)
-- 36. scenes                       — scene manifest per topic (001)
-- 37. scheduled_posts              — calendar scheduling state (004)
-- 38. shorts                       — short-form clips (001)
-- 39. social_accounts              — OAuth tokens ⚠ CRITICAL (001, C-3)
-- 40. style_profiles               — CTR/style A/B profiles (012)
-- 41. system_prompts               — system prompt registry (007)
-- 42. topic_keywords               — topic↔keyword edges (010)
-- 43. topics                       — 25 topics per project (001)
-- 44. yt_discovery_results         — YouTube discovery output
-- 45. yt_discovery_runs            — YouTube discovery runs
-- 46. yt_video_analyses            — per-video analysis (029)
-- 47. ab_tests                     — A/B experiment definitions (012)
-- 48. ab_test_variants             — A/B variants (012)
-- 49. ab_test_impressions          — A/B impression log (012)
-- ──────────────────────────────────────────────────────────────────────────

BEGIN;

DO $$
DECLARE
  vg_tables text[] := ARRAY[
    'analysis_groups',
    'audience_comments',
    'audience_insights',
    'avatars',
    'channel_analyses',
    'channel_comparison_reports',
    'coach_messages',
    'coach_sessions',
    'comments',
    'competitor_alerts',
    'competitor_channels',
    'competitor_intelligence',
    'competitor_videos',
    'cost_calculator_snapshots',
    'daily_ideas',
    'discovered_channels',
    'keywords',
    'music_library',
    'niche_health_history',
    'niche_profiles',
    'niche_viability_reports',
    'platform_metadata',
    'pps_calibration',
    'pps_config',
    'production_log',
    'production_logs',
    'production_registers',
    'projects',
    'prompt_configs',
    'renders',
    'research_categories',
    'research_results',
    'research_runs',
    'revenue_attribution',
    'rpm_benchmarks',
    'scenes',
    'scheduled_posts',
    'shorts',
    'social_accounts',
    'style_profiles',
    'system_prompts',
    'topic_keywords',
    'topics',
    'yt_discovery_results',
    'yt_discovery_runs',
    'yt_video_analyses',
    'ab_tests',
    'ab_test_variants',
    'ab_test_impressions'
  ];
  t      text;
  pol    record;
  exists_bool boolean;
BEGIN
  FOREACH t IN ARRAY vg_tables
  LOOP
    -- Skip if table does not actually exist in this instance.
    SELECT EXISTS (
      SELECT 1 FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND c.relname=t AND c.relkind='r'
    ) INTO exists_bool;

    IF NOT exists_bool THEN
      RAISE NOTICE 'Skipping %: table does not exist in this instance', t;
      CONTINUE;
    END IF;

    -- 1. Drop every policy that grants access to the `public` or `anon`
    --    pseudo-roles. These are the permissive-on-anon paths that make
    --    the ANON_KEY equivalent to DB admin. Policies scoped to
    --    `authenticated` or `service_role` are preserved.
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = t
        AND (roles::text[] && ARRAY['public','anon'])
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- 2. Ensure RLS is enabled on the table.
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- 3. Restrictive deny for the `anon` role. This is defense-in-depth:
    --    even if a future migration accidentally adds a permissive anon
    --    policy, this restrictive rule ANDs with it and blocks the result.
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false)',
      t || '_anon_deny',
      t
    );

    -- 4. Permissive service_role policy so n8n (the only writer) keeps
     --   full access. Explicit scope `TO service_role` means anon never
    --   matches this policy.
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t || '_service_role',
      t
    );

    -- 5. Revoke write grants from `anon` at the GRANT layer too. Even if
    --    RLS were ever disabled, anon would still be blocked from writes
    --    by missing SQL privileges.
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON TABLE public.%I FROM anon', t);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON TABLE public.%I FROM PUBLIC', t);
  END LOOP;
END $$;

COMMIT;

-- ──────────────────────────────────────────────────────────────────────────
-- Rollback (DO NOT run unless recovering from an incident):
--   Per-table: DROP POLICY IF EXISTS {t}_anon_deny ON public.{t};
--              DROP POLICY IF EXISTS {t}_service_role ON public.{t};
--              CREATE POLICY {t}_all ON public.{t} FOR ALL USING (true) WITH CHECK (true);
-- This reopens the vulnerability and MUST be followed by Batch 2.
-- ──────────────────────────────────────────────────────────────────────────
