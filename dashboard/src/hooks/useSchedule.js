import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';

/**
 * Fetch all scheduled posts for a project, ordered by scheduled_at ascending.
 * Joins topics to get title and thumbnail info.
 * Subscribes to Supabase Realtime for live updates.
 * @param {string} projectId - Project UUID
 */
export function useScheduledPosts(projectId) {
  useRealtimeSubscription(
    projectId ? 'scheduled_posts' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['scheduled-posts', projectId]]
  );

  return useQuery({
    queryKey: ['scheduled-posts', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*, topics(seo_title, original_title, thumbnail_url)')
        .eq('project_id', projectId)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/**
 * Create a new scheduled post entry.
 * @param {string} projectId - Project UUID for cache invalidation
 */
export function useCreateSchedule(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ topicId, platform, scheduledAt, visibility }) => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .insert({
          topic_id: topicId,
          project_id: projectId,
          platform,
          scheduled_at: scheduledAt,
          visibility: visibility || 'unlisted',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts', projectId] });
    },
  });
}

/**
 * Update an existing scheduled post (reschedule or change status).
 * @param {string} projectId - Project UUID for cache invalidation
 */
export function useUpdateSchedule(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, scheduledAt, status }) => {
      const updates = {};
      if (scheduledAt) updates.scheduled_at = scheduledAt;
      if (status) updates.status = status;

      const { data, error } = await supabase
        .from('scheduled_posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts', projectId] });
    },
  });
}

/**
 * Cancel a scheduled post.
 * @param {string} projectId - Project UUID for cache invalidation
 */
export function useCancelSchedule(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('scheduled_posts')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts', projectId] });
    },
  });
}
