import { useState, useMemo, useCallback, useEffect } from 'react';
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

      {/* Niche comparison */}
      <NicheComparisonTable />
    </div>
  );
}
