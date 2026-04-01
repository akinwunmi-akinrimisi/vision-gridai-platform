import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { webhookCall } from '../lib/api';
import { toast } from 'sonner';

const NICHES = [
  { key: 'narrative_storytelling', label: 'Narrative Storytelling' },
  { key: 'real_estate', label: 'Real Estate & Property' },
  { key: 'personal_finance', label: 'Personal Finance & Investing' },
  { key: 'business_marketing', label: 'Business & Digital Marketing' },
  { key: 'legal_tax', label: 'Legal & Tax Education' },
];

export { NICHES };

export function useLatestDiscoveryRun() {
  useRealtimeSubscription('yt_discovery_runs', null, [['yt-discovery-run']]);

  return useQuery({
    queryKey: ['yt-discovery-run'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('yt_discovery_runs')
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

export function useDiscoveryResults(runId, nicheKey) {
  return useQuery({
    queryKey: ['yt-discovery-results', runId, nicheKey],
    queryFn: async () => {
      let query = supabase
        .from('yt_discovery_results')
        .select('*')
        .eq('run_id', runId)
        .order('views', { ascending: false });

      if (nicheKey && nicheKey !== 'all') {
        query = query.eq('niche_category', nicheKey);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!runId,
  });
}

export function useAllDiscoveryRuns() {
  return useQuery({
    queryKey: ['yt-discovery-runs-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('yt_discovery_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useRunDiscovery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ timeRange }) => {
      const result = await webhookCall('youtube/discover', { time_range: timeRange });
      if (result.success === false) throw new Error(result.error || 'Webhook failed');
      return result;
    },
    onSuccess: () => {
      toast.success('YouTube Discovery started — searching across 5 niches...');
      const poll = (attempt) => {
        if (attempt > 30) return;
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['yt-discovery-run'] });
          queryClient.invalidateQueries({ queryKey: ['yt-discovery-runs-all'] });
          poll(attempt + 1);
        }, 3000);
      };
      poll(0);
    },
    onError: (err) => {
      toast.error(`Discovery failed: ${err.message}`);
    },
  });
}

export function useCancelDiscovery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (runId) => {
      const { error } = await supabase
        .from('yt_discovery_runs')
        .update({ status: 'failed', error_log: [{ error: 'Cancelled by user' }] })
        .eq('id', runId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Discovery cancelled');
      queryClient.invalidateQueries({ queryKey: ['yt-discovery-run'] });
      queryClient.invalidateQueries({ queryKey: ['yt-discovery-runs-all'] });
    },
  });
}
