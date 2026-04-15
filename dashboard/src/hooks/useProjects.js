import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { webhookCall } from '../lib/api';

/**
 * Fetch all projects ordered by created_at desc.
 * Also fetches a summary of topics per project for accurate status display.
 * Subscribes to Supabase Realtime for live updates.
 */
export function useProjects() {
  useRealtimeSubscription('projects', null, [['projects']]);
  useRealtimeSubscription('topics', null, [['projects']]);

  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      // Fetch projects (Sprint S7: niche_health_* + RPM columns are on the row;
      // `select('*')` already returns them, but we invalidate the cache on
      // niche_health_history inserts below via useNicheHealthHistoryBatch.)
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      if (!projects || projects.length === 0) return [];

      // Fetch all topics with minimal fields for status computation
      const projectIds = projects.map((p) => p.id);
      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('id, project_id, topic_number, status, review_status, script_review_status, video_review_status, seo_title, audio_progress, images_progress, i2v_progress, t2v_progress, assembly_status, total_cost, yt_estimated_revenue, updated_at')
        .in('project_id', projectIds);

      if (topicsError) {
        // Fall back to projects-only if topics fail
        return projects.map((p) => ({ ...p, topics_summary: [] }));
      }

      // Group topics by project
      const topicsByProject = {};
      for (const t of (topics || [])) {
        if (!topicsByProject[t.project_id]) topicsByProject[t.project_id] = [];
        topicsByProject[t.project_id].push(t);
      }

      // Enrich projects with topics summary
      return projects.map((p) => ({
        ...p,
        topics_summary: topicsByProject[p.id] || [],
      }));
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
