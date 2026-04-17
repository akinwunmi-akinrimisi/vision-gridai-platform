import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { webhookCall } from '../lib/api';
import { toast } from 'sonner';

/* ============================================================== */
/*  QUERIES — analysis groups (derived from channel_analyses)      */
/* ============================================================== */

/**
 * Fetch all distinct analysis groups with the count of analyses per group
 * and the latest analyzed_at timestamp. Sorted most-recent first.
 */
export function useAnalysisGroups() {
  useRealtimeSubscription('channel_analyses', null, [['channel-analysis-groups']]);

  return useQuery({
    queryKey: ['channel-analysis-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channel_analyses')
        .select('id, analysis_group_id, channel_name, channel_avatar_url, status, analyzed_at, verdict, verdict_score')
        .order('analyzed_at', { ascending: false });
      if (error) throw error;

      // Group by analysis_group_id
      const groups = {};
      for (const row of data || []) {
        const gid = row.analysis_group_id;
        if (!gid) continue;
        if (!groups[gid]) {
          groups[gid] = {
            analysis_group_id: gid,
            count: 0,
            channels: [],
            latest_at: row.analyzed_at,
            has_pending: false,
          };
        }
        groups[gid].count += 1;
        groups[gid].channels.push({
          name: row.channel_name,
          avatar: row.channel_avatar_url,
          status: row.status,
          verdict: row.verdict,
        });
        if (row.status === 'pending' || row.status === 'analyzing') {
          groups[gid].has_pending = true;
        }
      }

      return Object.values(groups).sort(
        (a, b) => new Date(b.latest_at) - new Date(a.latest_at)
      );
    },
  });
}

/* ============================================================== */
/*  QUERIES — channel analyses for a specific group                */
/* ============================================================== */

/**
 * Fetch all channel_analyses for a given analysis_group_id.
 * Realtime subscribed so status changes surface immediately.
 */
export function useChannelAnalyses(groupId) {
  useRealtimeSubscription(
    groupId ? 'channel_analyses' : null,
    groupId ? `analysis_group_id=eq.${groupId}` : null,
    [['channel-analyses', groupId]],
  );

  return useQuery({
    queryKey: ['channel-analyses', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channel_analyses')
        .select('*')
        .eq('analysis_group_id', groupId)
        .order('analyzed_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId,
    refetchInterval: (query) => {
      const analyses = query.state.data;
      if (!analyses) return false;
      const hasPending = analyses.some(
        (a) => a.status === 'pending' || a.status === 'analyzing'
      );
      return hasPending ? 4000 : false;
    },
  });
}

/* ============================================================== */
/*  QUERIES — comparison report for a group                        */
/* ============================================================== */

/**
 * Fetch the channel_comparison_reports row for a group (if it exists).
 */
export function useComparisonReport(groupId) {
  return useQuery({
    queryKey: ['channel-comparison-report', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channel_comparison_reports')
        .select('*')
        .eq('analysis_group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    enabled: !!groupId,
  });
}

/* ============================================================== */
/*  MUTATIONS — start a channel analysis                           */
/* ============================================================== */

/**
 * POST to /webhook/channel-analyze with { channel_url, analysis_group_id }.
 */
export function useStartAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channel_url, analysis_group_id }) => {
      const result = await webhookCall('channel-analyze', {
        channel_url,
        analysis_group_id,
      });
      if (result.success === false) throw new Error(result.error || 'Webhook failed');
      return result;
    },
    onSuccess: () => {
      toast.success('Channel analysis started — this may take 30-60 seconds...');
      queryClient.invalidateQueries({ queryKey: ['channel-analysis-groups'] });
      // Poll for updates
      const poll = (attempt) => {
        if (attempt > 20) return;
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['channel-analysis-groups'] });
          queryClient.invalidateQueries({ queryKey: ['channel-analyses'] });
          queryClient.invalidateQueries({ queryKey: ['channel-comparison-report'] });
          poll(attempt + 1);
        }, 3000);
      };
      poll(0);
    },
    onError: (err) => {
      toast.error(`Analysis failed: ${err.message}`);
    },
  });
}

/* ============================================================== */
/*  MUTATIONS — create project from analysis                       */
/* ============================================================== */

/**
 * POST to /webhook/project/create-from-analysis with
 * { analysis_group_id, niche_name, niche_description }.
 */
export function useCreateProjectFromAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ analysis_group_id, niche_name, niche_description }) => {
      const result = await webhookCall(
        'project/create-from-analysis',
        { analysis_group_id, niche_name, niche_description },
        { timeoutMs: 60_000 }
      );
      if (result.success === false) throw new Error(result.error || 'Webhook failed');
      return result;
    },
    onSuccess: () => {
      toast.success('Project created from channel analysis!');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => {
      toast.error(`Project creation failed: ${err.message}`);
    },
  });
}

/* ============================================================== */
/*  MUTATIONS — remove an analysis                                 */
/* ============================================================== */

/**
 * DELETE a channel_analyses row by id.
 */
export function useRemoveAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from('channel_analyses')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      toast.success('Analysis removed');
      queryClient.invalidateQueries({ queryKey: ['channel-analysis-groups'] });
      queryClient.invalidateQueries({ queryKey: ['channel-analyses'] });
      queryClient.invalidateQueries({ queryKey: ['channel-comparison-report'] });
    },
    onError: (err) => {
      toast.error(`Remove failed: ${err.message}`);
    },
  });
}
