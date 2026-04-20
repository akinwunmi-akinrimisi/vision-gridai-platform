import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { webhookCall } from '../lib/api';
import { toast } from 'sonner';

/* ============================================================== */
/*  QUERIES — analysis groups (from analysis_groups table)         */
/* ============================================================== */

/**
 * Fetch all active analysis groups from the analysis_groups table.
 * Sorted most-recent first.
 */
export function useAnalysisGroups() {
  useRealtimeSubscription('analysis_groups', null, [['analysis-groups']]);

  return useQuery({
    queryKey: ['analysis-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analysis_groups')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
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
 * If no groupId is provided, creates a new analysis_groups row first.
 * If an existing groupId is provided, increments its channels_count.
 */
export function useStartAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channel_url, analysis_group_id, group_name }) => {
      let groupId = analysis_group_id;

      if (!groupId) {
        // Create a new analysis_groups row. channels_count/completed_count
        // are maintained by DB triggers (migration 026), so we leave them at 0 —
        // the trigger will bump them when WF_CHANNEL_ANALYZE inserts the row.
        const name = group_name || (channel_url.replace(/https?:\/\/(www\.)?youtube\.com\/@?/i, '').split('/')[0] + ' Research');
        const { data: newGroup, error: insertErr } = await supabase
          .from('analysis_groups')
          .insert({ name, status: 'active' })
          .select('id')
          .single();
        if (insertErr) throw insertErr;
        groupId = newGroup.id;
      }
      // For existing groups: no-op. DB trigger handles channels_count on the
      // channel_analyses INSERT fired by WF_CHANNEL_ANALYZE.

      const result = await webhookCall('channel-analyze', {
        channel_url,
        analysis_group_id: groupId,
      });
      if (result.success === false) throw new Error(result.error || 'Webhook failed');
      return { ...result, analysis_group_id: groupId };
    },
    onSuccess: () => {
      toast.success('Channel analysis started — this may take 30-60 seconds...');
      queryClient.invalidateQueries({ queryKey: ['analysis-groups'] });
      // Poll for updates
      const poll = (attempt) => {
        if (attempt > 20) return;
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['analysis-groups'] });
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
/*  MUTATIONS — rename an analysis group                           */
/* ============================================================== */

/**
 * PATCH analysis_groups SET name.
 */
export function useRenameGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }) => {
      const { error } = await supabase
        .from('analysis_groups')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { id, name };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis-groups'] });
    },
    onError: (err) => {
      toast.error(`Rename failed: ${err.message}`);
    },
  });
}

/* ============================================================== */
/*  MUTATIONS — archive an analysis group                          */
/* ============================================================== */

/**
 * PATCH analysis_groups SET status='archived'.
 */
export function useArchiveGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from('analysis_groups')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { id };
    },
    onSuccess: (_, { id }) => {
      toast.success('Group archived');
      queryClient.invalidateQueries({ queryKey: ['analysis-groups'] });
      queryClient.invalidateQueries({ queryKey: ['channel-analyses'] });
    },
    onError: (err) => {
      toast.error(`Archive failed: ${err.message}`);
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
      queryClient.invalidateQueries({ queryKey: ['analysis-groups'] });
      queryClient.invalidateQueries({ queryKey: ['channel-analyses'] });
      queryClient.invalidateQueries({ queryKey: ['channel-comparison-report'] });
    },
    onError: (err) => {
      toast.error(`Remove failed: ${err.message}`);
    },
  });
}

/* ============================================================== */
/*  QUERIES — discovered channels for a group                      */
/* ============================================================== */

/**
 * Fetch all discovered_channels for a given analysis_group_id.
 * Realtime subscribed so analysis_status changes surface immediately.
 */
export function useDiscoveredChannels(groupId) {
  useRealtimeSubscription(
    groupId ? 'discovered_channels' : null,
    groupId ? `analysis_group_id=eq.${groupId}` : null,
    [['discovered-channels', groupId]],
  );

  return useQuery({
    queryKey: ['discovered-channels', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discovered_channels')
        .select('*')
        .eq('analysis_group_id', groupId)
        .order('discovery_rank', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId,
    refetchInterval: (query) => {
      const channels = query.state.data;
      if (!channels) return false;
      const hasAnalyzing = channels.some(
        (c) => c.analysis_status === 'analyzing'
      );
      return hasAnalyzing ? 5000 : false;
    },
  });
}

/* ============================================================== */
/*  QUERIES — niche viability report for a group                   */
/* ============================================================== */

/**
 * Fetch the niche_viability_reports row for a group (if it exists).
 * Realtime subscribed for live updates as the report is generated.
 */
export function useNicheViability(groupId) {
  useRealtimeSubscription(
    groupId ? 'niche_viability_reports' : null,
    groupId ? `analysis_group_id=eq.${groupId}` : null,
    [['niche-viability', groupId]],
  );

  return useQuery({
    queryKey: ['niche-viability', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('niche_viability_reports')
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
/*  MUTATIONS — confirm deep analysis on discovered channels       */
/* ============================================================== */

/**
 * For each selected discovered channel, POST to /webhook/channel-analyze
 * with the channel URL, then PATCH the discovered_channels row to mark
 * it as analyzing with the chosen depth.
 */
export function useConfirmDeepAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channels, analysisGroupId }) => {
      // channels: Array<{ id, channel_url, analysis_depth }>
      const results = [];
      for (const ch of channels) {
        // Trigger the n8n analysis workflow
        const result = await webhookCall('channel-analyze', {
          channel_url: ch.channel_url,
          analysis_group_id: analysisGroupId,
        });

        // Update the discovered_channels row
        await supabase
          .from('discovered_channels')
          .update({
            analysis_depth: ch.analysis_depth,
            analysis_status: 'analyzing',
          })
          .eq('id', ch.id);

        results.push(result);
      }
      return results;
    },
    onSuccess: (_, { channels }) => {
      toast.success(`Deep analysis started for ${channels.length} channel${channels.length !== 1 ? 's' : ''}...`);
      queryClient.invalidateQueries({ queryKey: ['discovered-channels'] });
      queryClient.invalidateQueries({ queryKey: ['analysis-groups'] });
      queryClient.invalidateQueries({ queryKey: ['channel-analyses'] });
      // Poll for completion
      const poll = (attempt) => {
        if (attempt > 30) return;
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['discovered-channels'] });
          queryClient.invalidateQueries({ queryKey: ['channel-analyses'] });
          queryClient.invalidateQueries({ queryKey: ['channel-comparison-report'] });
          queryClient.invalidateQueries({ queryKey: ['niche-viability'] });
          poll(attempt + 1);
        }, 4000);
      };
      poll(0);
    },
    onError: (err) => {
      toast.error(`Deep analysis failed: ${err.message}`);
    },
  });
}

/* ============================================================== */
/*  MUTATIONS — run niche viability assessment                     */
/* ============================================================== */

/**
 * POST to /webhook/niche-viability with { analysis_group_id }.
 *
 * Polling strategy: Rather than blindly polling 20x, we watch
 * analysis_groups.viability_phase and stop the moment it reaches
 * 'done' or 'failed'. On failed we surface the viability_error via toast.
 * Upper bound is ~5 minutes (60 x 5s) as a safety net — Claude Opus
 * viability normally returns in ~3 minutes.
 */
export function useRunViabilityAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ analysis_group_id }) => {
      const result = await webhookCall('niche-viability', {
        analysis_group_id,
      }, { timeoutMs: 120_000 });
      if (result.success === false) throw new Error(result.error || 'Viability assessment failed');
      return { ...result, analysis_group_id };
    },
    onSuccess: (data) => {
      const groupId = data?.analysis_group_id;
      toast.success('Niche viability assessment started — this takes ~3 minutes...');
      queryClient.invalidateQueries({ queryKey: ['analysis-groups'] });
      queryClient.invalidateQueries({ queryKey: ['niche-viability'] });

      // Phase-aware poll: stop as soon as viability_phase is done or failed.
      let cancelled = false;
      const poll = async (attempt) => {
        if (cancelled || attempt > 60) return; // ~5min safety cap
        try {
          if (groupId) {
            const { data: row } = await supabase
              .from('analysis_groups')
              .select('viability_phase, viability_error')
              .eq('id', groupId)
              .maybeSingle();

            // Keep caches hot so the UI re-renders
            queryClient.invalidateQueries({ queryKey: ['analysis-groups'] });
            queryClient.invalidateQueries({ queryKey: ['niche-viability'] });

            if (row?.viability_phase === 'done') {
              toast.success('Niche viability assessment complete');
              return;
            }
            if (row?.viability_phase === 'failed') {
              toast.error(`Viability assessment failed: ${row.viability_error || 'unknown error'}`);
              return;
            }
          } else {
            queryClient.invalidateQueries({ queryKey: ['niche-viability'] });
          }
        } catch (e) {
          // Swallow per-poll errors — Realtime will still bring us updates.
        }
        setTimeout(() => poll(attempt + 1), 5000);
      };
      poll(0);

      // No explicit cancel hook wired — if the user navigates away,
      // the setTimeout chain dies naturally when `cancelled` stays false
      // (it's a short loop and invalidations are cheap).
    },
    onError: (err) => {
      toast.error(`Viability assessment failed: ${err.message}`);
    },
  });
}

/* ============================================================== */
/*  MUTATIONS — create project from viability data                 */
/* ============================================================== */

/**
 * POST to /webhook/project/create-from-analysis with viability data.
 * Enhanced version that includes topics_to_avoid, recommended_topics, etc.
 */
export function useCreateProjectFromViability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      analysis_group_id,
      niche_name,
      niche_description,
      include_viability = true,
      inject_topics_to_avoid = true,
      viability_data = {},
    }) => {
      const result = await webhookCall(
        'project/create-from-analysis',
        {
          analysis_group_id,
          niche_name,
          niche_description,
          include_viability,
          inject_topics_to_avoid,
          ...viability_data,
        },
        { timeoutMs: 60_000 }
      );
      if (result.success === false) throw new Error(result.error || 'Webhook failed');
      return result;
    },
    onSuccess: () => {
      toast.success('Project created with viability intelligence!');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => {
      toast.error(`Project creation failed: ${err.message}`);
    },
  });
}
