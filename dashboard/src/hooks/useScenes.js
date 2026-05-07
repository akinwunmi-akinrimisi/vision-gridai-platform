import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Fetch all scenes for a topic, ordered by scene_number ascending.
 * 2026-05-07: Switched from dashboardRead webhook to direct Supabase query
 * to avoid n8n queue starvation during peak image-gen bursts.
 * Polls every 3s.
 * @param {string} topicId - Topic UUID
 */
export function useScenes(topicId) {
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
    refetchInterval: 3_000,
  });
}
