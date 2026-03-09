import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const MAX_DAILY_UPLOADS = 6;

/**
 * Track YouTube API quota usage for the current day.
 * Returns how many uploads have been done today and how many remain.
 *
 * @param {string} projectId - Project UUID
 * @returns {{ uploadsToday: number, remaining: number, isLoading: boolean }}
 */
export function useQuotaStatus(projectId) {
  const query = useQuery({
    queryKey: ['quota', projectId],
    queryFn: async () => {
      // Get start of today in UTC
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('topics')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('status', 'published')
        .gte('published_at', today.toISOString());

      if (error) throw error;
      return count || 0;
    },
    enabled: !!projectId,
    refetchInterval: 60000, // Refresh every 60 seconds
  });

  const uploadsToday = query.data || 0;

  return {
    uploadsToday,
    remaining: Math.max(0, MAX_DAILY_UPLOADS - uploadsToday),
    isLoading: query.isLoading,
  };
}
