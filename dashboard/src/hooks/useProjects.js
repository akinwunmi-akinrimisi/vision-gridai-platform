import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { webhookCall } from '../lib/api';

/**
 * Fetch all projects ordered by created_at desc.
 * Subscribes to Supabase Realtime for live updates.
 */
export function useProjects() {
  useRealtimeSubscription('projects', null, [['projects']]);

  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

/**
 * Create a new project via n8n webhook.
 * Optimistic insert with 'researching' status, rollback on error.
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ niche, description, target_video_count }) =>
      webhookCall('project/create', { niche, description, target_video_count }),

    onMutate: async ({ niche, description, target_video_count }) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });

      const previousProjects = queryClient.getQueryData(['projects']);

      const optimisticProject = {
        id: `temp-${Date.now()}`,
        name: niche,
        niche,
        niche_description: description || null,
        target_video_count: target_video_count || 25,
        status: 'researching',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData(['projects'], (old) =>
        [optimisticProject, ...(old || [])]
      );

      return { previousProjects };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects'], context.previousProjects);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/**
 * Retry research for a project that has status=research_failed.
 * Calls the same webhook as project creation but with an existing project_id.
 */
export function useRetryResearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ project_id }) =>
      webhookCall('project/create', { project_id }),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
