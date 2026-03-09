import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';

/**
 * Fetch the most recent production log entries for a topic.
 * Subscribes to Supabase Realtime for live updates.
 *
 * @param {string|null} topicId - Topic UUID
 * @returns {{ logs: Array, isLoading: boolean, error: any }}
 */
export function useProductionLog(topicId) {
  useRealtimeSubscription(
    topicId ? 'production_log' : null,
    topicId ? `topic_id=eq.${topicId}` : null,
    [['production-log', topicId]]
  );

  const query = useQuery({
    queryKey: ['production-log', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_log')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!topicId,
  });

  return {
    logs: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
