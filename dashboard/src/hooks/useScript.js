import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';

/**
 * Fetch a single topic with avatars for script review.
 * Subscribes to Supabase Realtime for live updates on this topic.
 * @param {string} topicId - Topic UUID
 */
export function useScript(topicId) {
  useRealtimeSubscription(
    topicId ? 'topics' : null,
    topicId ? `id=eq.${topicId}` : null,
    [['script', topicId]]
  );

  return useQuery({
    queryKey: ['script', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('*, avatars(*)')
        .eq('id', topicId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!topicId,
  });
}
