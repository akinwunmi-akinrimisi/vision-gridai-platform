import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { dashboardRead, webhookCall } from '../lib/api';
import { useCountryTab } from './useCountryTab';

/**
 * Fetch all projects with topic summaries via the authenticated dashboard-read
 * webhook (migration 030 locked down Supabase anon). Polls every 10s for
 * near-real-time updates since Realtime is disabled in locked-down mode.
 *
 * The result `data` is filtered to the active country tab (General or AU).
 * Projects without country_target (legacy rows) are read as 'GENERAL'. Use
 * `allData` for the unfiltered list (e.g. cross-tab summaries).
 */
export function useProjects() {
  const { country } = useCountryTab();
  const query = useQuery({
    queryKey: ['projects'],
    queryFn: () => dashboardRead('projects_list'),
    refetchInterval: 10_000,
  });

  const filtered = useMemo(() => {
    if (!query.data) return query.data;
    return query.data.filter(
      (p) => (p.country_target || 'GENERAL') === country
    );
  }, [query.data, country]);

  return { ...query, data: filtered, allData: query.data };
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
 * Delete a project and all related data via the authenticated
 * WF_DASHBOARD_READ `delete_project` query. The server-side handler cascades
 * production_log -> scenes -> avatars -> topics -> prompt_configs ->
 * niche_profiles -> projects using service_role and enforces the same
 * DELETABLE_STATUSES allowlist. Direct supabase.from().delete() was removed
 * in the 2026-04-21 security remediation (anon role no longer has write
 * privileges after migration 030).
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId) => {
      const data = await dashboardRead('delete_project', { project_id: projectId });
      if (!data || data.deleted !== projectId) {
        throw new Error('Delete did not confirm the project id was removed');
      }

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
