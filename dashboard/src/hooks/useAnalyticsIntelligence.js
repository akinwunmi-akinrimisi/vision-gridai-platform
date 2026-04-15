import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { webhookCall } from '../lib/api';

/* ==============================================================
 *  Sprint S7 — Analytics intelligence hooks
 *
 *  Queries:
 *    - usePPSCalibration        — pps_calibration rows with actual_views_30d
 *    - useTrafficSourceAggregation — topics.yt_traffic_source_breakdown aggregate
 *    - useRevenueAttribution    — revenue_attribution latest monthly + topic titles
 *    - useNicheHealthHistory    — niche_health_history last N weeks
 *    - useNicheHealthHistoryBatch — same but for many projects (ProjectsHome)
 *    - usePPSConfig             — pps_config + Realtime
 *
 *  Mutations:
 *    - useUpdatePPSConfig       — PATCH weights
 *    - useRecalibratePPS        — POST /webhook/pps/calibrate
 *    - useRunNicheHealth        — POST /webhook/niche-health/compute
 * ============================================================== */

/* ----- PPS calibration (scatter chart source) ----- */

export function usePPSCalibration(projectId) {
  return useQuery({
    queryKey: ['pps-calibration', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pps_calibration')
        .select(
          'id, topic_id, project_id, predicted_pps, pps_breakdown, published_at, actual_views_7d, actual_views_30d, actual_impressions_30d, actual_ctr, actual_revenue_usd, implied_actual_score, variance_pct, calibration_run_at, topics(seo_title, original_title, topic_number)',
        )
        .eq('project_id', projectId)
        .not('actual_views_30d', 'is', null)
        .order('calibration_run_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/* ----- Traffic source aggregation ----- */

export function useTrafficSourceAggregation(projectId) {
  return useQuery({
    queryKey: ['traffic-source-agg', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, yt_traffic_source_breakdown, yt_views')
        .eq('project_id', projectId)
        .not('yt_traffic_source_breakdown', 'is', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/* ----- Revenue attribution (waterfall chart source) ----- */

export function useRevenueAttribution(projectId, { limit = 20 } = {}) {
  useRealtimeSubscription(
    projectId ? 'revenue_attribution' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['revenue-attribution', projectId]],
  );

  return useQuery({
    queryKey: ['revenue-attribution', projectId, limit],
    queryFn: async () => {
      // Pull latest snapshot_month rows joined with topic metadata.
      const { data, error } = await supabase
        .from('revenue_attribution')
        .select(
          'id, topic_id, project_id, snapshot_month, youtube_video_id, production_cost_usd, cost_breakdown, views_30d, estimated_revenue_usd, actual_rpm_usd, rpm_vs_niche_benchmark_pct, roi_pct, break_even_achieved, created_at, topics(seo_title, original_title, topic_number, break_even_views)',
        )
        .eq('project_id', projectId)
        .order('snapshot_month', { ascending: false })
        .order('estimated_revenue_usd', { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/* ----- Project row (niche health columns) ----- */

/**
 * Lightweight query for just the project columns NicheHealthCard + ProjectsHome
 * need. Kept separate from useProjectRow (S2 hook) so we don't widen that
 * shared select.
 */
export function useProjectNicheHealth(projectId) {
  useRealtimeSubscription(
    projectId ? 'projects' : null,
    projectId ? `id=eq.${projectId}` : null,
    [['project-niche-health', projectId]],
  );

  return useQuery({
    queryKey: ['project-niche-health', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(
          'id, name, niche, niche_health_score, niche_health_classification, niche_health_last_computed_at, niche_rpm_category, estimated_rpm_low, estimated_rpm_mid, estimated_rpm_high',
        )
        .eq('id', projectId)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    enabled: !!projectId,
  });
}

/* ----- Niche health history (sparkline + trend) ----- */

export function useNicheHealthHistory(projectId, { weeks = 8 } = {}) {
  useRealtimeSubscription(
    projectId ? 'niche_health_history' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['niche-health-history', projectId]],
  );

  return useQuery({
    queryKey: ['niche-health-history', projectId, weeks],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('niche_health_history')
        .select(
          'id, project_id, week_of, health_score, classification, momentum_trend, saturation_signal, competitor_velocity_score, new_channel_entry_score, topic_freshness_score, rpm_stability_score, score_breakdown, week_over_week_delta, insight_summary, calculated_at',
        )
        .eq('project_id', projectId)
        .order('week_of', { ascending: false })
        .limit(weeks);
      if (error) throw error;
      // Return oldest-first for chart rendering.
      return (data || []).slice().reverse();
    },
    enabled: !!projectId,
  });
}

/**
 * Batch fetch last N weeks of niche health history across many projects
 * (for ProjectsHome sparklines). Avoids N+1 queries.
 */
export function useNicheHealthHistoryBatch(projectIds, { weeks = 8 } = {}) {
  const stableKey = (projectIds || []).slice().sort().join(',');
  return useQuery({
    queryKey: ['niche-health-history-batch', stableKey, weeks],
    queryFn: async () => {
      if (!projectIds || projectIds.length === 0) return {};
      const { data, error } = await supabase
        .from('niche_health_history')
        .select(
          'project_id, week_of, health_score, classification, week_over_week_delta, insight_summary',
        )
        .in('project_id', projectIds)
        .order('week_of', { ascending: false });
      if (error) throw error;

      const byProject = {};
      for (const row of data || []) {
        if (!byProject[row.project_id]) byProject[row.project_id] = [];
        byProject[row.project_id].push(row);
      }
      // Keep only the last `weeks` per project, oldest-first
      for (const pid of Object.keys(byProject)) {
        byProject[pid] = byProject[pid].slice(0, weeks).reverse();
      }
      return byProject;
    },
    enabled: !!projectIds && projectIds.length > 0,
  });
}

/* ----- PPS config (weights editor) ----- */

export function usePPSConfig(projectId) {
  useRealtimeSubscription(
    projectId ? 'pps_config' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['pps-config', projectId]],
  );

  return useQuery({
    queryKey: ['pps-config', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pps_config')
        .select(
          'id, project_id, outlier_weight, seo_weight, script_quality_weight, niche_health_weight, thumbnail_ctr_weight, title_ctr_weight, calibration_sample_count, last_calibrated_at, calibration_notes, created_at, updated_at',
        )
        .eq('project_id', projectId)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    enabled: !!projectId,
  });
}

export function useUpdatePPSConfig(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (weights) => {
      const payload = {
        outlier_weight: weights.outlier_weight,
        seo_weight: weights.seo_weight,
        script_quality_weight: weights.script_quality_weight,
        niche_health_weight: weights.niche_health_weight,
        thumbnail_ctr_weight: weights.thumbnail_ctr_weight,
        title_ctr_weight: weights.title_ctr_weight,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('pps_config')
        .update(payload)
        .eq('project_id', projectId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pps-config', projectId] });
    },
  });
}

/* ----- Webhook triggers ----- */

export function useRecalibratePPS(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      webhookCall(
        'pps/calibrate',
        { project_id: projectId, force: true },
        { timeoutMs: 180_000 },
      ),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pps-config', projectId] });
      queryClient.invalidateQueries({ queryKey: ['pps-calibration', projectId] });
    },
  });
}

export function useRunNicheHealth(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      webhookCall(
        'niche-health/compute',
        { project_id: projectId, force: true },
        { timeoutMs: 180_000 },
      ),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['niche-health-history', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['niche-health-history-batch'] });
    },
  });
}
