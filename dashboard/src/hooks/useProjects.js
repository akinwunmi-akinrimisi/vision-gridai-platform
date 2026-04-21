import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { dashboardRead, webhookCall } from '../lib/api';

/**
 * Fetch all projects with topic summaries via the authenticated dashboard-read
 * webhook (migration 030 locked down Supabase anon). Polls every 20s for
 * near-real-time updates since Realtime is disabled in locked-down mode.
 */
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => dashboardRead('projects_list'),
    refetchInterval: 20_000,
  });
}

/**
 * Create a new project via n8n webhook.
 * Optimistic insert with 'researching' status, rollback on error.
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ niche, description, target_video_count, reference_analyses }) =>
      webhookCall('project/create', { niche, description, target_video_count, reference_analyses: reference_analyses || [] }),

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
        topics_summary: [],
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

/**
 * Statuses that are safe to delete — early-stage or failed projects only.
 */
export const DELETABLE_STATUSES = new Set([
  'created',
  'researching',
  'researching_competitors',
  'researching_pain_points',
  'researching_keywords',
  'researching_blue_ocean',
  'researching_prompts',
  'research_failed',
  'failed',
]);

/**
 * Delete a project and all related data via direct Supabase calls.
 * Cascade order: production_log → scenes → avatars → topics → prompt_configs → niche_profiles → project.
 * Only works on early-stage or failed projects (no topics with production data).
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId) => {
      // Delete in cascade order (children first)
      const tables = [
        'production_log',
        'scenes',
        'avatars',
        'topics',
        'prompt_configs',
        'niche_profiles',
      ];

      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('project_id', projectId);
        if (error) throw new Error(`Failed to delete ${table}: ${error.message}`);
      }

      // Finally delete the project itself
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      if (error) throw new Error(`Failed to delete project: ${error.message}`);

      return projectId;
    },

    onMutate: async (projectId) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previousProjects = queryClient.getQueryData(['projects']);

      // Optimistically remove the project from the list
      queryClient.setQueryData(['projects'], (old) =>
        (old || []).filter((p) => p.id !== projectId)
      );

      return { previousProjects };
    },

    onError: (err, _projectId, context) => {
      // Rollback on failure
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects'], context.previousProjects);
      }
      toast.error(err?.message || 'Failed to delete project');
    },

    onSuccess: () => {
      toast.success('Project deleted');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
