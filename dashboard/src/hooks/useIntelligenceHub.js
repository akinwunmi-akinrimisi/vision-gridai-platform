import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { webhookCall } from '../lib/api';

/* ============================================================== */
/*  QUERIES — competitor_channels                                  */
/* ============================================================== */

/**
 * Fetch all tracked competitor channels for a project.
 */
export function useCompetitorChannels(projectId) {
  useRealtimeSubscription(
    projectId ? 'competitor_channels' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['competitor-channels', projectId]],
  );

  return useQuery({
    queryKey: ['competitor-channels', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitor_channels')
        .select(
          'id, project_id, channel_id, channel_name, channel_url, channel_handle, subscriber_count, total_video_count, avg_views_per_video, avg_views_30d, avg_views_90d, added_from, tracked_since, last_checked_at, last_video_fetched_at, consecutive_fetch_failures, is_active',
        )
        .eq('project_id', projectId)
        .order('tracked_since', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/* ============================================================== */
/*  QUERIES — competitor_videos (joined with channel name)         */
/* ============================================================== */

/**
 * Fetch recent competitor videos with a lightweight channel join.
 * Filter modes: 'all' | 'outliers' | 'topic_match'
 */
export function useCompetitorVideos(projectId, { filter = 'all', limit = 20 } = {}) {
  useRealtimeSubscription(
    projectId ? 'competitor_videos' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['competitor-videos', projectId, filter]],
  );

  return useQuery({
    queryKey: ['competitor-videos', projectId, filter],
    queryFn: async () => {
      let query = supabase
        .from('competitor_videos')
        .select(
          'id, competitor_channel_id, project_id, youtube_video_id, title, description_snippet, thumbnail_url, published_at, duration_seconds, is_shorts, views_at_discovery, views_24h, views_7d, views_30d, likes_count, comments_count, is_outlier, outlier_ratio, topic_pattern_match, matched_topic_id, first_seen_at, last_stats_updated_at, competitor_channels(channel_name, channel_url, subscriber_count)',
        )
        .eq('project_id', projectId)
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (filter === 'outliers') {
        query = query.eq('is_outlier', true);
      } else if (filter === 'topic_match') {
        query = query.eq('topic_pattern_match', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/* ============================================================== */
/*  QUERIES — competitor_alerts                                    */
/* ============================================================== */

/**
 * Fetch all competitor alerts for a project, newest first.
 * Consumers filter for unread/dismissed client-side.
 */
export function useCompetitorAlerts(projectId) {
  useRealtimeSubscription(
    projectId ? 'competitor_alerts' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['competitor-alerts', projectId]],
  );

  return useQuery({
    queryKey: ['competitor-alerts', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitor_alerts')
        .select(
          'id, project_id, competitor_channel_id, competitor_video_id, alert_type, severity, title, message, metadata, is_read, read_at, is_dismissed, dismissed_at, created_at',
        )
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/* ============================================================== */
/*  QUERIES — style_profiles                                       */
/* ============================================================== */

/**
 * Fetch all style profiles analyzed for this project (or unscoped profiles).
 */
export function useStyleProfiles(projectId) {
  useRealtimeSubscription(
    projectId ? 'style_profiles' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['style-profiles', projectId]],
  );

  return useQuery({
    queryKey: ['style-profiles', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('style_profiles')
        .select(
          'id, project_id, competitor_channel_id, channel_id, channel_url, channel_name, title_formulas, title_stats, top_performing_formula_idx, title_pattern_summary, thumbnail_dna, thumbnail_consistency_score, thumbnail_visual_summary, content_pillars, upload_cadence, content_strategy_summary, replication_difficulty, replication_notes, style_summary, videos_analyzed, thumbnails_analyzed, applied_to_project, applied_at, analysis_cost_usd, analyzed_at',
        )
        .eq('project_id', projectId)
        .order('analyzed_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/* ============================================================== */
/*  QUERIES — competitor_intelligence (weekly summary)             */
/* ============================================================== */

/**
 * Fetch the most recent weekly competitor intelligence summary.
 */
export function useCompetitorIntelligence(projectId) {
  return useQuery({
    queryKey: ['competitor-intelligence', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitor_intelligence')
        .select(
          'id, project_id, week_of, channels_analyzed, videos_analyzed, outlier_breakouts_count, top_topic_clusters, emerging_patterns, summary_markdown, generated_by, created_at',
        )
        .eq('project_id', projectId)
        .order('week_of', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    enabled: !!projectId,
  });
}

/* ============================================================== */
/*  QUERIES — RPM benchmark (joined from project)                  */
/* ============================================================== */

/**
 * Fetch the full rpm_benchmark row matching the project's niche_rpm_category.
 * Returns null if the project has not been RPM-classified yet.
 */
export function useRPMBenchmark(project) {
  const category = project?.niche_rpm_category || null;

  return useQuery({
    queryKey: ['rpm-benchmark', category],
    queryFn: async () => {
      if (!category) return null;
      const { data, error } = await supabase
        .from('rpm_benchmarks')
        .select('id, category, display_name, rpm_low, rpm_mid, rpm_high, notes')
        .eq('category', category)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    enabled: !!category,
  });
}

/* ============================================================== */
/*  QUERIES — topics (top 10 by combined intelligence score)       */
/* ============================================================== */

/**
 * Lightweight pull of topic intelligence scores for the Hub's
 * "Top Topic Scores" table. Realtime so recomputation surfaces.
 */
export function useTopicIntelligence(projectId) {
  useRealtimeSubscription(
    projectId ? 'topics' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['topic-intelligence', projectId]],
  );

  return useQuery({
    queryKey: ['topic-intelligence', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select(
          'id, project_id, topic_number, seo_title, original_title, playlist_angle, playlist_group, review_status, outlier_score, outlier_ratio, outlier_reasoning, outlier_scored_at, algorithm_momentum, outlier_data_available, seo_score, seo_classification, seo_opportunity_summary, seo_scored_at, primary_keyword, competition_level',
        )
        .eq('project_id', projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/* ============================================================== */
/*  QUERIES — project (single row, for RPM fields)                 */
/* ============================================================== */

/**
 * Fetch the project row itself (including RPM classification fields).
 */
export function useProjectRow(projectId) {
  useRealtimeSubscription(
    projectId ? 'projects' : null,
    projectId ? `id=eq.${projectId}` : null,
    [['project-row', projectId]],
  );

  return useQuery({
    queryKey: ['project-row', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(
          'id, name, niche, niche_description, niche_rpm_category, estimated_rpm_low, estimated_rpm_mid, estimated_rpm_high, revenue_potential_score, rpm_classified_at',
        )
        .eq('id', projectId)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    enabled: !!projectId,
  });
}

/* ============================================================== */
/*  MUTATIONS — add a competitor channel (direct insert)           */
/* ============================================================== */

const CHANNEL_ID_REGEXES = [
  /youtube\.com\/channel\/(UC[\w-]{20,})/i,
  /youtube\.com\/@([\w.-]+)/i,
  /youtube\.com\/c\/([\w.-]+)/i,
  /youtube\.com\/user\/([\w.-]+)/i,
];

export function extractChannelIdentifier(url) {
  if (!url || typeof url !== 'string') return { kind: null, value: null };
  const trimmed = url.trim();

  // Full channel ID (UC...) anywhere in URL — highest confidence
  const ucMatch = trimmed.match(/(UC[\w-]{22})/);
  if (ucMatch) return { kind: 'channel_id', value: ucMatch[1] };

  for (const rx of CHANNEL_ID_REGEXES) {
    const m = trimmed.match(rx);
    if (m) {
      const isChannel = rx.source.includes('channel');
      return {
        kind: isChannel ? 'channel_id' : 'handle',
        value: m[1],
      };
    }
  }
  return { kind: null, value: null };
}

/**
 * Insert a competitor_channels row minimally. WF_COMPETITOR_MONITOR
 * will hydrate subscriber_count / avg_views / name on its next run.
 */
export function useAddCompetitorChannel(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channel_url }) => {
      const { kind, value } = extractChannelIdentifier(channel_url);
      if (!kind || !value) {
        throw new Error(
          'Could not extract channel ID. Paste a full /channel/UC... URL, or a /@handle URL.',
        );
      }

      let channelId = kind === 'channel_id' ? value : `handle:${value}`;
      let channelName = kind === 'handle' ? `@${value}` : 'Pending\u2026';

      // If we only have a handle, try to resolve to a real UC... channel ID
      // via the YouTube Data API so WF_COMPETITOR_MONITOR can call channels.list?id=...
      if (channelId.startsWith('handle:')) {
        const handle = channelId.replace('handle:', '');
        const ytApiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
        if (ytApiKey) {
          try {
            const ytResp = await fetch(
              `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=@${encodeURIComponent(handle)}&key=${ytApiKey}`,
            );
            const ytData = await ytResp.json();
            if (ytData.items?.[0]?.id) {
              channelId = ytData.items[0].id;
              channelName = ytData.items[0].snippet?.title || channelName;
            }
          } catch {
            // Resolution failed — keep handle:<value>, monitor will skip it
          }
        }
        // If resolution fails or no API key, keep handle:<value> as fallback
      }

      const { data, error } = await supabase
        .from('competitor_channels')
        .insert({
          project_id: projectId,
          channel_id: channelId,
          channel_url: channel_url.trim(),
          channel_name: channelName,
          channel_handle: kind === 'handle' ? `@${value}` : null,
          added_from: 'manual',
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-channels', projectId] });
    },
  });
}

/* ============================================================== */
/*  MUTATIONS — dismiss / mark read alert                          */
/* ============================================================== */

export function useDismissAlert(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId }) => {
      const { error } = await supabase
        .from('competitor_alerts')
        .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
      return { alertId };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-alerts', projectId] });
    },
  });
}

export function useMarkAlertRead(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId }) => {
      const { error } = await supabase
        .from('competitor_alerts')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
      return { alertId };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-alerts', projectId] });
    },
  });
}

export function useMarkAllAlertsRead(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('competitor_alerts')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('project_id', projectId)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-alerts', projectId] });
    },
  });
}

/* ============================================================== */
/*  MUTATIONS — webhook triggers                                   */
/* ============================================================== */

/**
 * Kick the competitor monitor cron for this project (force = true runs
 * immediately regardless of last_checked_at).
 */
export function useRunCompetitorMonitor(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => webhookCall('competitor/monitor/run', { project_id: projectId, force: true }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-channels', projectId] });
      queryClient.invalidateQueries({ queryKey: ['competitor-videos', projectId] });
    },
  });
}

/**
 * Analyze a YouTube channel's style DNA.
 * WF_STYLE_DNA expects { channel_url, project_id?, apply_to_project? }.
 */
export function useAnalyzeStyleDNA(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channel_url, apply_to_project = false }) =>
      webhookCall('style-dna/analyze', {
        channel_url,
        project_id: projectId,
        apply_to_project,
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['style-profiles', projectId] });
    },
  });
}

/**
 * Classify (or re-classify) this project's niche RPM category via Claude.
 */
export function useRunRPMClassify(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => webhookCall('rpm/classify', { project_id: projectId }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['project-row', projectId] });
      queryClient.invalidateQueries({ queryKey: ['rpm-benchmark'] });
    },
  });
}
