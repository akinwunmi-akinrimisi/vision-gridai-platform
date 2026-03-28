import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';

/**
 * Fetch all comments for a project with optional filters.
 * Subscribes to Supabase Realtime for live updates.
 *
 * @param {string} projectId - Project UUID
 * @param {object} filters - Optional filters: { platform, sentiment, minIntent }
 */
export function useComments(projectId, filters = {}) {
  useRealtimeSubscription(
    projectId ? 'comments' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['comments', projectId]]
  );

  return useQuery({
    queryKey: ['comments', projectId, filters],
    queryFn: async () => {
      let query = supabase
        .from('comments')
        .select('*, topics(seo_title)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters.platform) query = query.eq('platform', filters.platform);
      if (filters.sentiment) query = query.eq('sentiment', filters.sentiment);
      if (filters.minIntent) query = query.gte('intent_score', filters.minIntent);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch high-intent comments (intent_score >= 0.7) that haven't been replied to.
 * These are conversion signals — comments indicating purchase intent, questions, etc.
 *
 * @param {string} projectId - Project UUID
 */
export function useHighIntentComments(projectId) {
  return useQuery({
    queryKey: ['high-intent-comments', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*, topics(seo_title)')
        .eq('project_id', projectId)
        .gte('intent_score', 0.7)
        .eq('replied', false)
        .order('intent_score', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/**
 * Mark a comment as replied and store the reply text.
 *
 * @param {string} projectId - Project UUID for cache invalidation
 */
export function useReplyToComment(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, replyText }) => {
      const { error } = await supabase
        .from('comments')
        .update({
          replied: true,
          reply_text: replyText,
          replied_at: new Date().toISOString(),
        })
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
      queryClient.invalidateQueries({ queryKey: ['high-intent-comments', projectId] });
      queryClient.invalidateQueries({ queryKey: ['engagement-stats', projectId] });
    },
  });
}
