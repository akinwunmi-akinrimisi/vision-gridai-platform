import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { webhookCall } from '../lib/api';

/**
 * Fetch all keywords for a project, ordered by opportunity_score desc.
 * Subscribes to Supabase Realtime for live updates.
 *
 * @param {string} projectId - Project UUID
 */
export function useKeywords(projectId) {
  useRealtimeSubscription(
    projectId ? 'keywords' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['keywords', projectId]]
  );

  return useQuery({
    queryKey: ['keywords', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('keywords')
        .select(
          'id, project_id, keyword, normalized_keyword, search_volume_proxy, autocomplete_hits, competing_videos_count, competition_level, opportunity_score, seo_classification, related_keywords, trend_signal, source, times_used_in_topics, last_scanned_at, created_at'
        )
        .eq('project_id', projectId)
        .order('opportunity_score', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/**
 * Trigger a keyword scan via n8n webhook.
 * POSTs to /webhook/keywords/scan with { project_id, seed_keywords? }.
 *
 * @param {string} projectId - Project UUID for cache invalidation
 */
export function useScanKeywords(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seedKeywords }) => {
      const payload = { project_id: projectId };
      if (Array.isArray(seedKeywords) && seedKeywords.length > 0) {
        payload.seed_keywords = seedKeywords;
      }
      return webhookCall('keywords/scan', payload);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords', projectId] });
    },
  });
}
