import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';

/**
 * Fetch published topics with YouTube analytics data for a project.
 * Filters by time range based on published_at date.
 *
 * @param {string} projectId - Project UUID
 * @param {string} timeRange - One of '7d', '30d', '90d', 'all'
 * @returns {{ data: Array, isLoading: boolean, error: Error|null, totalViews: number, totalWatchHours: number, avgCtr: number, totalRevenue: number, totalLikes: number, totalComments: number, totalSubscribers: number, avgDuration: string, topPerformer: object|null }}
 */
export function useAnalytics(projectId, timeRange = '30d') {
  // Live updates when analytics cron writes yt_* fields
  useRealtimeSubscription(
    projectId ? 'topics' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['analytics', projectId, timeRange]]
  );

  const query = useQuery({
    queryKey: ['analytics', projectId, timeRange],
    queryFn: async () => {
      let q = supabase
        .from('topics')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      // Apply time range filter
      if (timeRange !== 'all') {
        const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        q = q.gte('published_at', cutoff.toISOString());
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch previous period data for trend computation
  const prevQuery = useQuery({
    queryKey: ['analytics-prev', projectId, timeRange],
    queryFn: async () => {
      if (timeRange === 'all') return [];
      const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
      const cutoffEnd = new Date();
      cutoffEnd.setDate(cutoffEnd.getDate() - days);
      const cutoffStart = new Date(cutoffEnd);
      cutoffStart.setDate(cutoffStart.getDate() - days);

      const { data, error } = await supabase
        .from('topics')
        .select('yt_views, yt_watch_hours, yt_ctr, yt_estimated_revenue')
        .eq('project_id', projectId)
        .eq('status', 'published')
        .gte('published_at', cutoffStart.toISOString())
        .lt('published_at', cutoffEnd.toISOString());
      if (error) return [];
      return data || [];
    },
    enabled: !!projectId && timeRange !== 'all',
  });

  const computed = useMemo(() => {
    const topics = query.data || [];
    if (topics.length === 0) {
      return {
        totalViews: 0,
        totalWatchHours: 0,
        avgCtr: 0,
        totalRevenue: 0,
        totalLikes: 0,
        totalComments: 0,
        totalSubscribers: 0,
        avgDuration: '--',
        topPerformer: null,
        trends: {},
      };
    }

    const totalViews = topics.reduce((s, t) => s + (t.yt_views || 0), 0);
    const totalWatchHours = topics.reduce(
      (s, t) => s + (parseFloat(t.yt_watch_hours) || 0),
      0
    );
    const totalRevenue = topics.reduce(
      (s, t) => s + (parseFloat(t.yt_estimated_revenue) || 0),
      0
    );
    const totalLikes = topics.reduce((s, t) => s + (t.yt_likes || 0), 0);
    const totalComments = topics.reduce((s, t) => s + (t.yt_comments || 0), 0);
    const totalSubscribers = topics.reduce(
      (s, t) => s + (t.yt_subscribers_gained || 0),
      0
    );

    const topicsWithCtr = topics.filter((t) => t.yt_ctr != null && t.yt_ctr > 0);
    const avgCtr =
      topicsWithCtr.length > 0
        ? topicsWithCtr.reduce((s, t) => s + parseFloat(t.yt_ctr), 0) /
          topicsWithCtr.length
        : 0;

    // Average view duration across topics
    const topicsWithDuration = topics.filter((t) => t.yt_avg_view_duration);
    let avgDuration = '--';
    if (topicsWithDuration.length > 0) {
      const totalSecs = topicsWithDuration.reduce((s, t) => {
        const dur = t.yt_avg_view_duration;
        if (typeof dur === 'string' && dur.includes(':')) {
          const parts = dur.split(':');
          return s + parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        }
        return s + (parseFloat(dur) || 0);
      }, 0);
      const avgSecs = Math.round(totalSecs / topicsWithDuration.length);
      const mins = Math.floor(avgSecs / 60);
      const secs = avgSecs % 60;
      avgDuration = `${mins}:${String(secs).padStart(2, '0')}`;
    }

    // Top performer by views
    const topPerformer = topics.reduce(
      (best, t) => (!best || (t.yt_views || 0) > (best.yt_views || 0) ? t : best),
      null
    );

    // Compute trends from previous period
    const prev = prevQuery.data || [];
    const trends = {};
    if (prev.length > 0) {
      const prevViews = prev.reduce((s, t) => s + (t.yt_views || 0), 0);
      const prevRevenue = prev.reduce((s, t) => s + (parseFloat(t.yt_estimated_revenue) || 0), 0);
      const prevWatchHours = prev.reduce((s, t) => s + (parseFloat(t.yt_watch_hours) || 0), 0);
      const prevCtrTopics = prev.filter((t) => t.yt_ctr != null && t.yt_ctr > 0);
      const prevCtr = prevCtrTopics.length > 0
        ? prevCtrTopics.reduce((s, t) => s + parseFloat(t.yt_ctr), 0) / prevCtrTopics.length
        : 0;

      const pctChange = (curr, prv) => prv > 0 ? ((curr - prv) / prv) * 100 : curr > 0 ? 100 : 0;
      trends.views = pctChange(totalViews, prevViews);
      trends.revenue = pctChange(totalRevenue, prevRevenue);
      trends.watchHours = pctChange(totalWatchHours, prevWatchHours);
      trends.ctr = prevCtr > 0 ? avgCtr - prevCtr : null;
    }

    return {
      totalViews,
      totalWatchHours: Math.round(totalWatchHours * 10) / 10,
      avgCtr: Math.round(avgCtr * 10) / 10,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalLikes,
      totalComments,
      totalSubscribers,
      avgDuration,
      topPerformer,
      trends,
    };
  }, [query.data, prevQuery.data]);

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    ...computed,
  };
}
