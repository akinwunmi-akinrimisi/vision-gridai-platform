import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';

/**
 * Fetch all scenes for a topic, ordered by scene_number ascending.
 * Subscribes to Supabase Realtime for live updates.
 * @param {string} topicId - Topic UUID
 */
export function useScenes(topicId) {
  useRealtimeSubscription(
    topicId ? 'scenes' : null,
    topicId ? `topic_id=eq.${topicId}` : null,
    [['scenes', topicId]]
  );

  return useQuery({
    queryKey: ['scenes', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .eq('topic_id', topicId)
        .order('scene_number', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!topicId,
  });
}
