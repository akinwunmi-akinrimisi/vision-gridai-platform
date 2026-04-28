import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Fetch the most recent production_log entries for a given project.
 *
 * Uses the `supabase` proxy (lib/supabase.js), which routes the read through
 * the authenticated WF_DASHBOARD_READ webhook (`sb_query`) — no backend
 * change required, the production_log table is already allowlisted (see
 * useProductionLog.js for the per-topic equivalent).
 *
 * Polls every 5s while the project is in an active research/topic-gen
 * state, otherwise stays idle. Returns the last 5 events sorted newest-first
 * for an inline timeline under the live progress indicator.
 *
 * @param {string|null} projectId - Project UUID. null disables the query.
 * @param {{ active?: boolean, limit?: number }} [opts]
 *   active: when true, polls every 5s. Default false (single fetch on mount).
 *   limit: how many rows to return. Default 5.
 */
export function useProjectActivity(projectId, opts = {}) {
  const { active = false, limit = 5 } = opts;

  // Skip optimistic temp ids (`temp-…`) created by useCreateProject — those
  // rows do not exist server-side yet and would just produce empty fetches.
  const enabled = !!projectId && !String(projectId).startsWith('temp-');

  const query = useQuery({
    queryKey: ['project-activity', projectId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_log')
        .select('id, stage, action, details, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled,
    refetchInterval: active ? 5_000 : false,
    // Treat empty-array responses as fine — don't keep retrying on 404-shaped errors
    retry: 1,
  });

  return {
    events: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
