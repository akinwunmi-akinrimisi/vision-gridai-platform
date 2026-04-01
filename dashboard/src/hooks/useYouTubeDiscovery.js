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

export function useAnalyzeVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (video) => {
      // Create the analysis row first
      const { data, error } = await supabase
        .from('yt_video_analyses')
        .insert({
          run_id: video.run_id,
          video_id: video.video_id,
          video_title: video.title,
          channel_name: video.channel_name,
          video_url: video.video_url,
          thumbnail_url: video.thumbnail_url,
          niche_category: video.niche_category,
          views: video.views,
          likes: video.likes,
          comments: video.comments,
          duration_seconds: video.duration_seconds,
          status: 'pending',
        })
        .select('id')
        .single();
      if (error) throw error;

      // Trigger the analysis workflow
      const result = await webhookCall('youtube/analyze', {
        analysis_id: data.id,
        video_id: video.video_id,
        video_url: video.video_url,
        video_title: video.title,
        channel_name: video.channel_name,
        niche_category: NICHES.find((n) => n.key === video.niche_category)?.label || video.niche_category,
      });

      return { analysisId: data.id, ...result };
    },
    onSuccess: (data) => {
      toast.success('Analysis started — fetching transcript and analyzing...');
      queryClient.invalidateQueries({ queryKey: ['yt-video-analyses'] });
    },
    onError: (err) => {
      toast.error(`Analysis failed: ${err.message}`);
    },
  });
}

export function useVideoAnalysis(analysisId) {
  useRealtimeSubscription(
    'yt_video_analyses',
    analysisId ? `id=eq.${analysisId}` : null,
    [['yt-video-analysis', analysisId]],
  );

  return useQuery({
    queryKey: ['yt-video-analysis', analysisId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('yt_video_analyses')
        .select('*')
        .eq('id', analysisId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!analysisId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'pending' || status === 'fetching_transcript' || status === 'analyzing'
        ? 3000
        : false;
    },
  });
}

export function useAllAnalyses() {
  return useQuery({
    queryKey: ['yt-video-analyses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('yt_video_analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
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
