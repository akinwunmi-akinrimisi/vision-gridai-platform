import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { dashboardRead } from '../lib/api';

/**
 * Fetch published topics with YouTube analytics for a project via the
 * authenticated `analytics_summary` webhook (service_role server-side).
 * Polls every 60s — analytics cron writes at most hourly, so no value in
 * tighter refresh.
 *
 * @param {string} projectId - Project UUID
 * @param {string} timeRange - One of '7d', '30d', '90d', 'all'
 */
export function useAnalytics(projectId, timeRange = '30d') {
  const summaryQuery = useQuery({
    queryKey: ['analytics-summary', projectId, timeRange],
    queryFn: () => dashboardRead('analytics_summary', { project_id: projectId, time_range: timeRange }),
    enabled: !!projectId,
    refetchInterval: 60_000,
  });

  const current = summaryQuery.data?.current || [];
  const prev = summaryQuery.data?.previous || [];

  const query = { data: current, isLoading: summaryQuery.isLoading, error: summaryQuery.error };
  const prevQuery = { data: prev };

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
