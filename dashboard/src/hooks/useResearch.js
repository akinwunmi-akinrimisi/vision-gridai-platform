import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { webhookCall } from '../lib/api';

/**
 * Fetch the latest research run for a project.
 * Subscribes to Realtime for live progress updates.
 */
export function useLatestRun(projectId) {
  useRealtimeSubscription(
    'research_runs',
    projectId ? `project_id=eq.${projectId}` : null,
    [['research-run', projectId]],
  );

  return useQuery({
    queryKey: ['research-run', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_runs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code === 'PGRST116') return null; // no rows
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch categories for a completed research run, ranked by score.
 */
export function useCategories(runId) {
  return useQuery({
    queryKey: ['research-categories', runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_categories')
        .select('*')
        .eq('run_id', runId)
        .order('rank', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!runId,
  });
}

/**
 * Fetch results for a research run, optionally filtered by source.
 * Joins category label for display.
 */
export function useResults(runId, source) {
  return useQuery({
    queryKey: ['research-results', runId, source],
    queryFn: async () => {
      let query = supabase
        .from('research_results')
        .select('*, research_categories(label)')
        .eq('run_id', runId)
        .order('engagement_score', { ascending: false });

      if (source && source !== 'all') {
        query = query.eq('source', source);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!runId,
  });
}

/**
 * Trigger a new research run via n8n webhook.
 * Invalidates the latest-run cache on success so the UI picks up the new run.
 */
export function useRunResearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, platforms, timeRange }) => {
      return webhookCall('research/run', {
        project_id: projectId,
        platforms,
        time_range: timeRange,
      });
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['research-run', projectId] });
      queryClient.invalidateQueries({ queryKey: ['research-runs-all'] });
    },
  });
}

/**
 * Fetch all research runs across all projects (overview / history).
 * Limited to most recent 20 runs.
 */
export function useAllRuns() {
  return useQuery({
    queryKey: ['research-runs-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_runs')
        .select('*, projects(name, niche)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });
}

/**
 * Fetch a specific research run by ID (for viewing historical results).
 */
export function useRunById(runId) {
  return useQuery({
    queryKey: ['research-run-by-id', runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_runs')
        .select('*, projects(name, niche)')
        .eq('id', runId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!runId,
  });
}
