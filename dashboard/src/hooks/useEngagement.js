import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';

/**
 * Compute aggregated engagement statistics from the comments table.
 * Provides totals, sentiment breakdown, high-intent count, and per-platform counts.
 *
 * @param {string} projectId - Project UUID
 */
export function useEngagementStats(projectId) {
  // Live-update when new comments arrive
  useRealtimeSubscription(
    projectId ? 'comments' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['engagement-stats', projectId]]
  );

  return useQuery({
    queryKey: ['engagement-stats', projectId],
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from('comments')
        .select('sentiment, intent_score, platform, replied')
        .eq('project_id', projectId);

      if (error) throw error;

      if (!comments || comments.length === 0) {
        return {
          total: 0,
          positive: 0,
          negative: 0,
          neutral: 0,
          unanalyzed: 0,
          highIntent: 0,
          unreplied: 0,
          replied: 0,
          positivePercent: 0,
          byPlatform: { youtube: 0, tiktok: 0, instagram: 0 },
        };
      }

      const total = comments.length;
      const positive = comments.filter((c) => c.sentiment === 'positive').length;
      const negative = comments.filter((c) => c.sentiment === 'negative').length;
      const neutral = comments.filter((c) => c.sentiment === 'neutral').length;
      const unanalyzed = comments.filter((c) => !c.sentiment).length;
      const highIntent = comments.filter((c) => c.intent_score >= 0.7).length;
      const unreplied = comments.filter((c) => !c.replied && c.intent_score >= 0.7).length;
      const replied = comments.filter((c) => c.replied).length;
      const positivePercent = total > 0 ? Math.round((positive / total) * 100) : 0;

      return {
        total,
        positive,
        negative,
        neutral,
        unanalyzed,
        highIntent,
        unreplied,
        replied,
        positivePercent,
        byPlatform: {
          youtube: comments.filter((c) => c.platform === 'youtube').length,
          tiktok: comments.filter((c) => c.platform === 'tiktok').length,
          instagram: comments.filter((c) => c.platform === 'instagram').length,
        },
      };
    },
    enabled: !!projectId,
  });
}
