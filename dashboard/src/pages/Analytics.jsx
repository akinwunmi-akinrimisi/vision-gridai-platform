import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router';
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
  Youtube,
  Share2,
  Settings,
} from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { refreshAnalytics } from '../lib/analyticsApi';
import { supabase } from '../lib/supabase';

import PageHeader from '../components/shared/PageHeader';
import KPICard from '../components/shared/KPICard';
import EmptyState from '../components/shared/EmptyState';
import TopPerformerCard from '../components/analytics/TopPerformerCard';
import ViewsChart from '../components/analytics/ViewsChart';
import RevenueChart from '../components/analytics/RevenueChart';
import PerformanceChart from '../components/analytics/PerformanceChart';
import CostDonut from '../components/analytics/CostDonut';
import CostRevenueChart from '../components/analytics/CostRevenueChart';
import PerformanceTable from '../components/analytics/PerformanceTable';
import TimeRangeFilter from '../components/analytics/TimeRangeFilter';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDurationToSeconds(dur) {
  if (!dur) return 0;
  if (typeof dur === 'number') return dur;
  if (typeof dur === 'string' && dur.includes(':')) {
    const parts = dur.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return parseFloat(dur) || 0;
}

function truncate(str, maxLen = 20) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

function formatDelta(value, suffix = '%') {
  if (value == null || isNaN(value)) return null;
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}${suffix}`;
}

function deltaType(value) {
  if (value == null || isNaN(value) || value === 0) return undefined;
  return value > 0 ? 'positive' : 'negative';
}

// ---------------------------------------------------------------------------
// PlatformBreakdown — YouTube / TikTok / Instagram stats
// ---------------------------------------------------------------------------

function PlatformBreakdown({ projectId, topics }) {
  const [shortsStats, setShortsStats] = useState(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from('shorts')
        .select('tiktok_views, tiktok_likes, tiktok_shares, tiktok_comments, instagram_views, instagram_likes, instagram_comments, tiktok_status, instagram_status')
        .eq('project_id', projectId);

      if (cancelled) return;
      if (!data || data.length === 0) {
        setShortsStats(null);
        return;
      }

      const stats = {
        tiktok: { views: 0, likes: 0, shares: 0, connected: false },
        instagram: { views: 0, likes: 0, comments: 0, connected: false },
      };
      for (const s of data) {
        stats.tiktok.views += s.tiktok_views || 0;
        stats.tiktok.likes += s.tiktok_likes || 0;
        stats.tiktok.shares += s.tiktok_shares || 0;
        if (s.tiktok_status && s.tiktok_status !== 'pending') stats.tiktok.connected = true;

        stats.instagram.views += s.instagram_views || 0;
        stats.instagram.likes += s.instagram_likes || 0;
        stats.instagram.comments += s.instagram_comments || 0;
        if (s.instagram_status && s.instagram_status !== 'pending') stats.instagram.connected = true;
      }
      setShortsStats(stats);
    }
    load();
    return () => { cancelled = true; };
  }, [projectId]);

  // YouTube totals from topics
  const ytStats = useMemo(() => {
    if (!topics?.length) return { views: 0, watchHours: 0, revenue: 0 };
    return {
      views: topics.reduce((s, t) => s + (t.yt_views || 0), 0),
      watchHours: topics.reduce((s, t) => s + (parseFloat(t.yt_watch_hours) || 0), 0),
      revenue: topics.reduce((s, t) => s + (parseFloat(t.yt_estimated_revenue) || 0), 0),
    };
  }, [topics]);

  return (
    <div className="mt-8 mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Platform Breakdown
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* YouTube */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Youtube className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-sm font-semibold">YouTube</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Views</span>
              <span className="font-mono tabular-nums font-medium">{ytStats.views.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Watch Hours</span>
              <span className="font-mono tabular-nums font-medium">{ytStats.watchHours.toFixed(1)}h</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Revenue</span>
              <span className="font-mono tabular-nums font-medium text-success">
                ${ytStats.revenue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* TikTok */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-pink-500" />
            </div>
            <span className="text-sm font-semibold">TikTok</span>
          </div>
          {shortsStats?.tiktok?.connected || (shortsStats?.tiktok?.views > 0) ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Views</span>
                <span className="font-mono tabular-nums font-medium">{shortsStats.tiktok.views.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Likes</span>
                <span className="font-mono tabular-nums font-medium">{shortsStats.tiktok.likes.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Shares</span>
                <span className="font-mono tabular-nums font-medium">{shortsStats.tiktok.shares.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic">
              <p>No TikTok data available.</p>
              <Link
                to={`/project/${projectId}/settings`}
                className="inline-flex items-center gap-1 mt-2 text-primary hover:text-primary-hover transition-colors"
              >
                <Settings className="w-3 h-3" />
                Connect account in Settings
              </Link>
            </div>
          )}
        </div>

        {/* Instagram */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <span className="text-sm font-semibold">Instagram</span>
          </div>
          {shortsStats?.instagram?.connected || (shortsStats?.instagram?.views > 0) ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Views</span>
                <span className="font-mono tabular-nums font-medium">{shortsStats.instagram.views.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Likes</span>
                <span className="font-mono tabular-nums font-medium">{shortsStats.instagram.likes.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Comments</span>
                <span className="font-mono tabular-nums font-medium">{shortsStats.instagram.comments.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic">
              <p>No Instagram data available.</p>
              <Link
                to={`/project/${projectId}/settings`}
                className="inline-flex items-center gap-1 mt-2 text-primary hover:text-primary-hover transition-colors"
              >
                <Settings className="w-3 h-3" />
                Connect account in Settings
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NicheComparisonTable
// ---------------------------------------------------------------------------

function NicheComparisonTable() {
  const [nicheData, setNicheData] = useState([]);

  useEffect(() => {
    async function load() {
      const { data: projects } = await supabase.from('projects').select('id, name, niche');
      if (!projects || projects.length < 2) return;

      const { data: topics } = await supabase
        .from('topics')
        .select('project_id, yt_views, yt_estimated_revenue, yt_ctr, total_cost')
        .eq('status', 'published');

      if (!topics) return;

      const byProject = {};
      for (const t of topics) {
        if (!byProject[t.project_id]) byProject[t.project_id] = [];
        byProject[t.project_id].push(t);
      }

      const rows = projects
        .map((p) => {
          const pts = byProject[p.id] || [];
          if (pts.length === 0) return null;
          const totalViews = pts.reduce((s, t) => s + (t.yt_views || 0), 0);
          const totalRevenue = pts.reduce((s, t) => s + (parseFloat(t.yt_estimated_revenue) || 0), 0);
          const totalCost = pts.reduce((s, t) => s + (parseFloat(t.total_cost) || 0), 0);
          const avgCpm = totalViews > 0 ? (totalRevenue / totalViews) * 1000 : 0;
          return { name: p.name || p.niche, videos: pts.length, totalViews, totalRevenue, totalCost, avgCpm };
        })
        .filter(Boolean);

      setNicheData(rows);
    }
    load();
  }, []);

  if (nicheData.length < 2) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mt-8">
      <div className="px-5 py-3.5 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Niche Comparison
        </h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-left text-[11px] uppercase tracking-wider">Niche</TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-wider">Videos</TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-wider">Views</TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-wider">Revenue</TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-wider">Avg CPM</TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-wider">ROI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {nicheData.map((row) => {
            const roi = row.totalCost > 0 ? row.totalRevenue / row.totalCost : 0;
            return (
              <TableRow key={row.name} className="border-border hover:bg-card-hover">
                <TableCell className="font-medium text-foreground text-xs">{row.name}</TableCell>
                <TableCell className="text-right tabular-nums font-mono text-xs">{row.videos}</TableCell>
                <TableCell className="text-right tabular-nums font-mono text-xs">{row.totalViews.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums font-mono text-xs text-success">${row.totalRevenue.toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums font-mono text-xs">${row.avgCpm.toFixed(2)}</TableCell>
                <TableCell className={`text-right tabular-nums font-mono text-xs font-semibold ${roi >= 1 ? 'text-success' : 'text-danger'}`}>
                  {roi > 0 ? `${roi.toFixed(1)}x` : '--'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Analytics page
// ---------------------------------------------------------------------------

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

  // -- Chart data transforms (unchanged logic) --

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

  const trends = analytics.trends || {};

  // -- KPI card config --

  const kpiCards = [
    {
      label: 'Total Views',
      value: analytics.totalViews.toLocaleString(),
      icon: Eye,
      delta: formatDelta(trends.views),
      deltaType: deltaType(trends.views),
    },
    {
      label: 'Watch Hours',
      value: `${analytics.totalWatchHours.toLocaleString()}h`,
      icon: Clock,
      delta: formatDelta(trends.watchHours),
      deltaType: deltaType(trends.watchHours),
    },
    {
      label: 'Avg CTR',
      value: `${analytics.avgCtr}%`,
      icon: MousePointerClick,
      delta: formatDelta(trends.ctr),
      deltaType: deltaType(trends.ctr),
    },
    {
      label: 'Revenue',
      value: `$${analytics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      delta: formatDelta(trends.revenue),
      deltaType: deltaType(trends.revenue),
    },
  ];

  const secondaryCards = [
    { label: 'Likes', value: analytics.totalLikes.toLocaleString(), icon: ThumbsUp },
    { label: 'Comments', value: analytics.totalComments.toLocaleString(), icon: MessageSquare },
    { label: 'Subscribers', value: analytics.totalSubscribers.toLocaleString(), icon: Users },
    { label: 'Avg Duration', value: analytics.avgDuration, icon: Clock },
  ];

  // -- Loading skeleton --

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Analytics" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 h-[88px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header with TimeRangeFilter + Refresh */}
      <PageHeader
        title="Analytics"
        subtitle={
          lastUpdated
            ? `Last updated: ${lastUpdated}`
            : 'YouTube performance tracking across all videos'
        }
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
        <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
      </PageHeader>

      {/* Primary KPIs with delta indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4">
        {kpiCards.map((card, i) => (
          <div
            key={card.label}
            className={`animate-slide-up stagger-${i + 1}`}
            style={{ opacity: 0 }}
          >
            <KPICard
              label={card.label}
              value={card.value}
              icon={card.icon}
              delta={card.delta}
              deltaType={card.deltaType}
            />
          </div>
        ))}
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
        {secondaryCards.map((m, i) => (
          <div
            key={m.label}
            className={`bg-card border border-border rounded-lg p-4 animate-slide-up stagger-${i + 5}`}
            style={{ opacity: 0 }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {m.label}
              </span>
            </div>
            <p className="text-lg font-bold text-foreground tabular-nums">
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
        <div className="bg-card border border-border rounded-xl mb-8">
          <EmptyState
            icon={BarChart3}
            title="No published videos yet"
            description="Analytics data will appear once videos are published to YouTube"
          />
        </div>
      )}

      {/* Charts grid */}
      {topics.length > 0 && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Charts & Insights
          </h2>
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

      {/* Platform breakdown */}
      <PlatformBreakdown projectId={id} topics={topics} />

      {/* Niche comparison */}
      <NicheComparisonTable />
    </div>
  );
}
