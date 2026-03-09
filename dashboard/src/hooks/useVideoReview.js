import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';

/**
 * Fetch a single topic and its scenes for the Video Review page.
 * Subscribes to Realtime for live publish progress updates.
 *
 * @param {string} topicId - Topic UUID
 * @returns {{ topic: object|null, scenes: Array, isLoading: boolean, error: Error|null }}
 */
export function useVideoReview(topicId) {
  // Live updates on topic row (publish progress, status changes)
  useRealtimeSubscription(
    topicId ? 'topics' : null,
    topicId ? `id=eq.${topicId}` : null,
    [['video-review', topicId]]
  );

  const topicQuery = useQuery({
    queryKey: ['video-review', topicId],
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

  const scenesQuery = useQuery({
    queryKey: ['video-review-scenes', topicId],
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

  return {
    topic: topicQuery.data || null,
    scenes: scenesQuery.data || [],
    isLoading: topicQuery.isLoading || scenesQuery.isLoading,
    error: topicQuery.error || scenesQuery.error,
  };
}
