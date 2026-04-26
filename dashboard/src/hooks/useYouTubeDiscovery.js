import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { webhookCall } from '../lib/api';
import { toast } from 'sonner';
import { useCountryTab } from './useCountryTab';

const GENERAL_NICHE_GROUPS = [
  {
    key: 'betrayal_revenge',
    label: 'Betrayal & Revenge Stories',
    children: [
      { key: 'betrayals_changed_history', label: 'Betrayals That Changed History' },
      { key: 'family_betrayals_inheritance', label: 'Family Betrayals & Inheritance Wars' },
      { key: 'revenge_stories_gone_wrong', label: 'Revenge Stories Gone Wrong' },
    ],
  },
  {
    key: 'legal_court_drama',
    label: 'Legal & Court Drama',
    children: [
      { key: 'shocking_courtroom_moments', label: 'Shocking Courtroom Moments' },
      { key: 'landmark_cases_changed_law', label: 'Landmark Cases That Changed Law' },
      { key: 'legal_corruption_scandals', label: 'Legal Corruption & Scandals' },
    ],
  },
  {
    key: 'true_crime',
    label: 'True Crime',
    children: [
      { key: 'unsolved_mysteries_cold_cases', label: 'Unsolved Mysteries & Cold Cases' },
      { key: 'serial_killers_criminal_profiling', label: 'Serial Killers & Criminal Profiling' },
      { key: 'heists_frauds_con_artists', label: 'Heists, Frauds & Con Artists' },
    ],
  },
];

// Mirrors the niche_variants table for country_target='AU' (migration 033).
// Per AU Strategy §10.1 / §11.1: v1 launch is Hub + 1 priority spoke
// (super_au). The other 4 spokes are staged for later — they launch after
// the hub clears 30 days of CPM signal. The selector reflects that split
// so the user can run discovery on the v1 spoke today and research the
// future spokes proactively.
const AU_NICHE_GROUPS = [
  {
    key: 'au_v1_launch',
    label: 'v1 Launch Spoke',
    children: [
      { key: 'super_au', label: 'Superannuation', v1Focus: true },
    ],
  },
  {
    key: 'au_future_spokes',
    label: 'Future Spokes (staged)',
    children: [
      { key: 'credit_cards_au',     label: 'Credit Cards & Points' },
      { key: 'property_mortgage_au', label: 'Property & Mortgages' },
      { key: 'tax_au',              label: 'Tax Strategy' },
      { key: 'etf_investing_au',    label: 'ETF & Share Investing' },
    ],
  },
];

// The v1 launch keys — used to seed the default selection on the AU tab so
// the discovery search defaults to "just super_au" instead of all 5.
const AU_V1_LAUNCH_KEYS = AU_NICHE_GROUPS
  .flatMap((g) => g.children)
  .filter((c) => c.v1Focus)
  .map((c) => c.key);

// Flat list helper — workflow compat + filtering.
function flatten(groups) {
  return groups.flatMap((g) =>
    g.children.map((c) => ({ ...c, group: g.key, groupLabel: g.label }))
  );
}

const GENERAL_NICHES = flatten(GENERAL_NICHE_GROUPS);
const AU_NICHES = flatten(AU_NICHE_GROUPS);

// Default exports keep backward compat — code that imports NICHES /
// NICHE_GROUPS without country awareness will see the General set.
const NICHE_GROUPS = GENERAL_NICHE_GROUPS;
const NICHES = GENERAL_NICHES;

export {
  NICHES,
  NICHE_GROUPS,
  GENERAL_NICHES,
  GENERAL_NICHE_GROUPS,
  AU_NICHES,
  AU_NICHE_GROUPS,
  AU_V1_LAUNCH_KEYS,
};

/**
 * Returns the niche taxonomy for the active country tab. AU shows the
 * v1-launch spoke (super_au) split out from the future spokes per Strategy
 * §10.1 staged approach. General shows the Betrayal/Legal/True-Crime
 * grouping.
 *
 * `defaultSelectedKeys` is the set the discovery search box should default
 * to. For General that's every key. For AU we default to just the v1 spoke
 * so the user doesn't accidentally burn API quota on niches that aren't
 * launching this cycle.
 */
export function useNicheTaxonomy() {
  const { country } = useCountryTab();
  if (country === 'AU') {
    return {
      niches: AU_NICHES,
      nicheGroups: AU_NICHE_GROUPS,
      defaultSelectedKeys: AU_V1_LAUNCH_KEYS,
    };
  }
  return {
    niches: GENERAL_NICHES,
    nicheGroups: GENERAL_NICHE_GROUPS,
    defaultSelectedKeys: GENERAL_NICHES.map((n) => n.key),
  };
}

export function useLatestDiscoveryRun() {
  const { country } = useCountryTab();
  useRealtimeSubscription('yt_discovery_runs', null, [['yt-discovery-run', country]]);

  return useQuery({
    queryKey: ['yt-discovery-run', country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('yt_discovery_runs')
        .select('*')
        .eq('country_target', country)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
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
  const { country } = useCountryTab();
  return useQuery({
    queryKey: ['yt-discovery-runs-all', country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('yt_discovery_runs')
        .select('*')
        .eq('country_target', country)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useRunDiscovery() {
  const queryClient = useQueryClient();
  const { country } = useCountryTab();

  return useMutation({
    mutationFn: async ({ timeRange, niches }) => {
      const result = await webhookCall('youtube/discover', { time_range: timeRange, niches: niches || null, country_target: country });
      if (result.success === false) throw new Error(result.error || 'Webhook failed');
      return result;
    },
    onSuccess: () => {
      toast.success('YouTube Discovery started — searching across selected niches...');
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
  const { country } = useCountryTab();

  return useMutation({
    mutationFn: async (video) => {
      // Create the analysis row first. country_target denormalized from
      // the active dashboard tab so /youtube-discovery's analysis history
      // tab-filters correctly (migration 036).
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
          country_target: country,
        })
        .select('id')
        .single();
      if (error) throw error;

      // Trigger the analysis workflow. Look up the human-readable label
      // across BOTH taxonomies (General + AU) so AU video analyses send a
      // proper label instead of falling back to the raw key.
      const allKnownNiches = [...GENERAL_NICHES, ...AU_NICHES];
      const nicheLabel = allKnownNiches.find((n) => n.key === video.niche_category)?.label
        || video.niche_category;
      const result = await webhookCall('youtube/analyze', {
        analysis_id: data.id,
        video_id: video.video_id,
        video_url: video.video_url,
        video_title: video.title,
        channel_name: video.channel_name,
        niche_category: nicheLabel,
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
  const { country } = useCountryTab();
  return useQuery({
    queryKey: ['yt-video-analyses', country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('yt_video_analyses')
        .select('*')
        .eq('country_target', country)
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
