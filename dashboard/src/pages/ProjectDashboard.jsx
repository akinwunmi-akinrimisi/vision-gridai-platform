import { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Video,
  CheckCircle2,
  Clock,
  Play,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Upload,
  XCircle,
  RefreshCw,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTopics } from '../hooks/useTopics';
import { useProjectMetrics } from '../hooks/useProjectMetrics';
import { useQuotaStatus } from '../hooks/useQuotaStatus';
import { useBatchPublish } from '../hooks/usePublishMutations';
import { webhookCall } from '../lib/api';
import { SkeletonMetric } from '../components/ui/SkeletonLoader';
import PipelineTable from '../components/dashboard/PipelineTable';
import BatchPublishDialog from '../components/video/BatchPublishDialog';

function formatCurrency(num) {
  if (num == null || num === 0) return '$0.00';
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function computeROI(revenue, spend) {
  if (!spend || spend === 0) return '--';
  return `${((revenue / spend) * 100).toFixed(1)}%`;
}

function exportTopicsCSV(topics) {
  if (!topics || topics.length === 0) return;
  const headers = ['#', 'Title', 'Status', 'Score', 'Views', 'Revenue', 'Spend'];
  const rows = topics.map((t) => [
    t.topic_number,
    `"${(t.seo_title || t.original_title || '').replace(/"/g, '""')}"`,
    t.status,
    t.script_quality_score ?? '',
    t.yt_views ?? 0,
    t.yt_estimated_revenue ?? 0,
    t.total_cost ?? 0,
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'topics-export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProjectDashboard() {
  const { id: projectId } = useParams();
  const queryClient = useQueryClient();
  const { data: topics, isLoading: topicsLoading } = useTopics(projectId);
  const { metrics, isLoading: metricsLoading } = useProjectMetrics(projectId);
  const { remaining: quotaRemaining } = useQuotaStatus(projectId);
  const batchPublishMutation = useBatchPublish(projectId);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);

  const isLoading = topicsLoading || metricsLoading;

  const approvedForPublish = useMemo(() => {
    if (!topics) return [];
    return topics.filter(
      (t) =>
        t.video_review_status === 'approved' &&
        t.status !== 'published' &&
        t.status !== 'publishing'
    );
  }, [topics]);

  const firstPendingTopic = useMemo(() => {
    if (!topics) return null;
    return topics.find(
      (t) => t.status === 'script_approved' || t.status === 'approved'
    );
  }, [topics]);

  const pendingTopics = useMemo(() => {
    if (!topics) return [];
    return topics.filter(
      (t) => t.status === 'script_approved' || t.status === 'approved'
    );
  }, [topics]);

  const handleStartNext = useCallback(async () => {
    if (!firstPendingTopic) return;
    const result = await webhookCall('production/trigger', { topic_id: firstPendingTopic.id });
    if (result?.success !== false) {
      toast.success('Production triggered');
    } else {
      toast.error(result?.error || 'Failed to trigger production');
    }
  }, [firstPendingTopic]);

  const handleStartAll = useCallback(async () => {
    if (pendingTopics.length === 0) return;
    const result = await webhookCall('production/trigger-all', { project_id: projectId });
    if (result?.success !== false) {
      toast.success(`Triggered ${pendingTopics.length} topics`);
    } else {
      toast.error(result?.error || 'Failed to trigger production');
    }
  }, [pendingTopics, projectId]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-metrics', projectId] });
    toast.success('Refreshing data...');
  }, [queryClient, projectId]);

  const failedCount = metrics.failed ?? 0;

  const metricCards = [
    { label: 'Topics', value: metrics.totalTopics, icon: Video, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
    { label: 'Published', value: metrics.published, icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
    { label: 'In Progress', value: metrics.inProgress, icon: Clock, gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20' },
    {
      label: 'Failed',
      value: failedCount,
      icon: XCircle,
      gradient: 'from-red-500 to-rose-600',
      shadow: 'shadow-red-500/20',
      clickable: failedCount > 0,
      onClick: () => setStatusFilter((prev) => (prev === 'failed' ? null : 'failed')),
      ring: statusFilter === 'failed' ? 'ring-2 ring-red-500/30' : '',
    },
    {
      label: 'Total Spent',
      value: formatCurrency(metrics.totalSpend),
      icon: DollarSign,
      gradient: 'from-slate-500 to-slate-600',
      shadow: '',
      mono: true,
    },
    {
      label: 'Revenue',
      value: formatCurrency(metrics.totalRevenue),
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/20',
      sub: `ROI: ${computeROI(metrics.totalRevenue, metrics.totalSpend)}`,
    },
  ];

  return (
    <div className="animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">Project Dashboard</h1>
        <p className="page-subtitle">Command center for your video production pipeline</p>
      </div>

      {/* 6 Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4 mb-6">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonMetric key={i} />)
          : metricCards.map((m, i) => (
              <div
                key={m.label}
                className={`glass-card p-5 animate-slide-up stagger-${i + 1} ${m.clickable ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''} ${m.ring || ''}`}
                style={{ opacity: 0 }}
                onClick={m.onClick || undefined}
                role={m.clickable ? 'button' : undefined}
                tabIndex={m.clickable ? 0 : undefined}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {m.label}
                  </span>
                  <div className={`metric-card-icon bg-gradient-to-br ${m.gradient} ${m.shadow} shadow-md`}>
                    <m.icon className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                </div>
                <p className={`metric-value ${m.mono ? 'font-mono' : ''} text-slate-900 dark:text-white`}>
                  {m.value}
                </p>
                {m.sub && (
                  <p className="text-2xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    {m.sub}
                  </p>
                )}
              </div>
            ))
        }
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {firstPendingTopic && (
            <button onClick={handleStartNext} className="btn-primary btn-sm">
              <Play className="w-3.5 h-3.5" />
              Start Next Pending
            </button>
          )}
          {pendingTopics.length > 1 && (
            <button onClick={handleStartAll} className="btn-secondary btn-sm">
              <Play className="w-3.5 h-3.5" />
              Start All Pending ({pendingTopics.length})
            </button>
          )}
          <button onClick={() => exportTopicsCSV(topics)} className="btn-ghost btn-sm" disabled={!topics || topics.length === 0}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button onClick={handleRefresh} className="btn-ghost btn-sm">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>

          {approvedForPublish.length > 0 && (
            <>
              <span className="w-px h-5 bg-slate-200 dark:bg-white/[0.08] mx-1" />
              <button onClick={() => setBatchDialogOpen(true)} className="btn-success btn-sm">
                <Upload className="w-3.5 h-3.5" />
                Publish All ({approvedForPublish.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pipeline header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h2 className="section-title">Pipeline Status</h2>
          {metrics.pendingReview > 0 && (
            <span className="badge badge-amber">
              <AlertCircle className="w-3 h-3" />
              {metrics.pendingReview} Pending Review
            </span>
          )}
          {metrics.scheduled > 0 && (
            <span className="badge badge-purple">
              <Clock className="w-3 h-3" />
              {metrics.scheduled} Scheduled
            </span>
          )}
        </div>
      </div>
      <PipelineTable topics={topics || []} projectId={projectId} statusFilter={statusFilter} />

      <BatchPublishDialog
        open={batchDialogOpen}
        onClose={() => setBatchDialogOpen(false)}
        topics={approvedForPublish}
        quotaRemaining={quotaRemaining}
        loading={batchPublishMutation.isPending}
        onConfirm={(topicIds) => {
          batchPublishMutation.mutate({ topicIds }, {
            onSuccess: () => setBatchDialogOpen(false),
          });
        }}
      />
    </div>
  );
}
