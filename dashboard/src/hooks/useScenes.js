import { useQuery } from '@tanstack/react-query';
import { dashboardRead } from '../lib/api';

/**
 * Fetch all scenes for a topic, ordered by scene_number ascending.
 * Polls every 15s (Supabase Realtime disabled post-migration 030).
 * @param {string} topicId - Topic UUID
 */
export function useScenes(topicId) {
  return useQuery({
    queryKey: ['scenes', topicId],
    queryFn: () => dashboardRead('scene_progress', { topic_id: topicId }),
    enabled: !!topicId,
    refetchInterval: 15_000,
  });
}
