import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { webhookCall } from '../lib/api';
import { toast } from 'sonner';

/**
 * Fetch the latest research run (globally, not project-scoped).
 * Subscribes to Realtime for live progress updates.
 */
export function useLatestRun() {
  useRealtimeSubscription(
    'research_runs',
    null,
    [['research-run-latest']],
  );

  return useQuery({
    queryKey: ['research-run-latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code === 'PGRST116') return null;
      if (error) throw error;
      return data;
    },
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
 * Accepts niche text directly (standalone) or project_id (project-scoped).
 */
export function useRunResearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ niche, projectId, platforms, timeRange }) => {
      const result = await webhookCall('research/run', {
        niche,
        project_id: projectId || null,
        platforms,
        time_range: timeRange,
      });
      if (result.success === false) throw new Error(result.error || 'Webhook failed');
      return result;
    },
    onSuccess: () => {
      toast.success('Research started — scraping selected platforms...');
      const poll = (attempt) => {
        if (attempt > 10) return;
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['research-run-latest'] });
          queryClient.invalidateQueries({ queryKey: ['research-runs-all'] });
          poll(attempt + 1);
        }, 2000);
      };
      poll(0);
    },
    onError: (err) => {
      toast.error(`Research failed: ${err.message}`);
    },
  });
}

/**
 * Cancel a research run by setting its status to 'failed'.
 */
export function useCancelResearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (runId) => {
      const { error } = await supabase
        .from('research_runs')
        .update({ status: 'failed', error_log: [{ error: 'Cancelled by user' }] })
        .eq('id', runId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Research run cancelled');
      queryClient.invalidateQueries({ queryKey: ['research-run-latest'] });
      queryClient.invalidateQueries({ queryKey: ['research-runs-all'] });
    },
    onError: (err) => {
      toast.error(`Cancel failed: ${err.message}`);
    },
  });
}

/**
 * Fetch all research runs (overview / history).
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
