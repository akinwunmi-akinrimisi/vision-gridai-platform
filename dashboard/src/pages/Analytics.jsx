import { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router';
import {
  BarChart3,
  Eye,
  Clock,
  MousePointerClick,
  ThumbsUp,
  MessageSquare,
  Users,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { refreshAnalytics } from '../lib/analyticsApi';
import { SkeletonMetric } from '../components/ui/SkeletonLoader';
import TopPerformerCard from '../components/analytics/TopPerformerCard';
import ViewsChart from '../components/analytics/ViewsChart';
import RevenueChart from '../components/analytics/RevenueChart';
import PerformanceChart from '../components/analytics/PerformanceChart';
import CostDonut from '../components/analytics/CostDonut';
import CostRevenueChart from '../components/analytics/CostRevenueChart';
import PerformanceTable from '../components/analytics/PerformanceTable';
import TimeRangeFilter from '../components/analytics/TimeRangeFilter';

/**
 * Parse duration string "M:SS" to seconds.
 */
function parseDurationToSeconds(dur) {
  if (!dur) return 0;
  if (typeof dur === 'number') return dur;
  if (typeof dur === 'string' && dur.includes(':')) {
    const parts = dur.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return parseFloat(dur) || 0;
}

/**
 * Truncate a string to maxLen characters.
 */
function truncate(str, maxLen = 20) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

export default function Analytics() {
  const { id } = useParams();
  const [timeRange, setTimeRange] = useState('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const analytics = useAnalytics(id, timeRange);
  const { data: topics, isLoading } = analytics;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshAnalytics(id);
    } finally {
      setIsRefreshing(false);
    }
  }, [id]);

  // Transform topics to chart data
  const viewsData = useMemo(() => {
    if (!topics?.length) return [];
    const byDate = {};
    topics.forEach((t) => {
      if (!t.published_at) return;
      const date = new Date(t.published_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      byDate[date] = (byDate[date] || 0) + (t.yt_views || 0);
    });
    return Object.entries(byDate)
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [topics]);

  const revenueData = useMemo(() => {
    if (!topics?.length) return [];
    const byDate = {};
    topics.forEach((t) => {
      if (!t.published_at) return;
      const date = new Date(t.published_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      byDate[date] = (byDate[date] || 0) + (parseFloat(t.yt_estimated_revenue) || 0);
    });
    return Object.entries(byDate)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [topics]);

  const performanceData = useMemo(() => {
    if (!topics?.length) return [];
    return topics.map((t) => ({
      title: truncate(t.seo_title || t.original_title || `#${t.topic_number}`),
      ctr: parseFloat(t.yt_ctr) || 0,
      avgDuration: parseDurationToSeconds(t.yt_avg_view_duration),
    }));
  }, [topics]);

  const costBreakdown = useMemo(() => {
    if (!topics?.length) return null;
    const agg = { script: 0, tts: 0, images: 0, i2v: 0, t2v: 0 };
    let hasData = false;
    topics.forEach((t) => {
      if (t.cost_breakdown) {
        hasData = true;
        const cb = typeof t.cost_breakdown === 'string' ? JSON.parse(t.cost_breakdown) : t.cost_breakdown;
        agg.script += cb.script || 0;
        agg.tts += cb.tts || 0;
        agg.images += cb.images || 0;
        agg.i2v += cb.i2v || 0;
        agg.t2v += cb.t2v || 0;
      }
    });
    return hasData ? agg : null;
  }, [topics]);

  const costRevenueData = useMemo(() => {
    if (!topics?.length) return [];
    return topics.map((t) => ({
      title: truncate(t.seo_title || t.original_title || `#${t.topic_number}`),
      cost: parseFloat(t.total_cost) || 0,
      revenue: parseFloat(t.yt_estimated_revenue) || 0,
    }));
  }, [topics]);

  // Format last updated from most recent yt_last_updated
  const lastUpdated = useMemo(() => {
    if (!topics?.length) return null;
    const dates = topics
      .filter((t) => t.yt_last_updated)
      .map((t) => new Date(t.yt_last_updated));
    if (dates.length === 0) return null;
    const latest = new Date(Math.max(...dates));
    return latest.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [topics]);

  const primaryCards = [
    {
      label: 'Total Views',
      value: analytics.totalViews.toLocaleString(),
      icon: Eye,
      bgColor: 'from-blue-500 to-indigo-600',
    },
    {
      label: 'Watch Hours',
      value: `${analytics.totalWatchHours.toLocaleString()}h`,
      icon: Clock,
      bgColor: 'from-purple-500 to-violet-600',
    },
    {
      label: 'Avg CTR',
      value: `${analytics.avgCtr}%`,
      icon: MousePointerClick,
      bgColor: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Revenue',
      value: `$${analytics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      bgColor: 'from-amber-500 to-orange-600',
    },
  ];

  const secondaryCards = [
    { label: 'Likes', value: analytics.totalLikes.toLocaleString(), icon: ThumbsUp },
    { label: 'Comments', value: analytics.totalComments.toLocaleString(), icon: MessageSquare },
    { label: 'Subscribers Gained', value: analytics.totalSubscribers.toLocaleString(), icon: Users },
    { label: 'Avg View Duration', value: analytics.avgDuration, icon: Clock },
  ];

  if (isLoading) {
    return (
      <div className="animate-in">
        <div className="page-header">
          <h1 className="page-title">Analytics</h1>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonMetric key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">
            {lastUpdated
              ? `Last updated: ${lastUpdated}`
              : 'YouTube performance tracking across all videos'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
              bg-white/60 dark:bg-white/[0.04] border border-border/50 dark:border-white/[0.06]
              text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/[0.06]
              hover:border-slate-300 dark:hover:border-white/[0.1] transition-all cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Now
          </button>
          <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {/* Primary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        {primaryCards.map((m) => (
          <div key={m.label} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider">
                {m.label}
              </span>
              <div
                className={`w-8 h-8 rounded-xl bg-gradient-to-br ${m.bgColor} flex items-center justify-center shadow-sm`}
              >
                <m.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="metric-value text-slate-900 dark:text-white">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
        {secondaryCards.map((m) => (
          <div key={m.label} className="card-elevated p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <m.icon className="w-3.5 h-3.5 text-text-muted dark:text-text-muted-dark" />
              <span className="text-xs text-text-muted dark:text-text-muted-dark font-medium">
                {m.label}
              </span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Top performer */}
      {analytics.topPerformer && (
        <div className="mb-8" data-testid="top-performer-card">
          <TopPerformerCard topic={analytics.topPerformer} />
        </div>
      )}

      {/* Empty state */}
      {topics.length === 0 && (
        <div className="glass-card p-12 mb-8 text-center">
          <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-base font-medium text-slate-600 dark:text-slate-400 mb-1">
            No published videos yet
          </p>
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            Analytics data will appear once videos are published to YouTube
          </p>
        </div>
      )}

      {/* Charts grid */}
      {topics.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <div data-testid="views-chart">
              <ViewsChart data={viewsData} />
            </div>
            <RevenueChart data={revenueData} />
            <PerformanceChart data={performanceData} />
            <CostDonut costBreakdown={costBreakdown} />
            <div className="lg:col-span-2">
              <CostRevenueChart data={costRevenueData} />
            </div>
          </div>

          {/* Performance table */}
          <div className="mb-8">
            <PerformanceTable topics={topics} projectId={id} />
          </div>
        </>
      )}
    </div>
  );
}
