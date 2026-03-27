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
  Download,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTopics } from '../hooks/useTopics';
import { useProjectMetrics } from '../hooks/useProjectMetrics';
import { useQuotaStatus } from '../hooks/useQuotaStatus';
import { useBatchPublish } from '../hooks/usePublishMutations';
import { webhookCall } from '../lib/api';
import PageHeader from '../components/shared/PageHeader';
import KPICard from '../components/shared/KPICard';
import PipelineTable from '../components/dashboard/PipelineTable';
import BatchPublishDialog from '../components/video/BatchPublishDialog';
import { Button } from '@/components/ui/button';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatCurrency(num) {
  if (num == null || num === 0) return '$0.00';
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

/* ------------------------------------------------------------------ */
/*  Loading skeleton for KPI row                                       */
/* ------------------------------------------------------------------ */
function KPISkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
      <div className="h-3 w-16 bg-muted rounded mb-3" />
      <div className="h-7 w-20 bg-muted rounded" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ProjectDashboard                                                   */
/* ------------------------------------------------------------------ */
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

  /* ---- KPI card data ---- */
  const kpis = [
    {
      label: 'Topics',
      value: metrics.totalTopics,
      delta: metrics.approved > 0 ? `${metrics.approved} approved` : undefined,
      deltaType: 'positive',
      icon: Video,
    },
    {
      label: 'Published',
      value: metrics.published,
      icon: CheckCircle2,
    },
    {
      label: 'In Progress',
      value: metrics.inProgress,
      icon: Clock,
    },
    {
      label: 'Revenue',
      value: formatCurrency(metrics.totalRevenue),
      icon: TrendingUp,
      className: '[&>div:nth-child(2)]:text-accent',
    },
    {
      label: 'Total Spend',
      value: formatCurrency(metrics.totalSpend),
      icon: DollarSign,
    },
  ];

  return (
    <div className="animate-slide-up">
      {/* Page header with actions */}
      <PageHeader
        title="Project Dashboard"
        subtitle="Command center for your video production pipeline"
      >
        {firstPendingTopic && (
          <Button onClick={handleStartNext} size="sm">
            <Play className="w-3.5 h-3.5" />
            Start Production
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => exportTopicsCSV(topics)}
          disabled={!topics || topics.length === 0}
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
      </PageHeader>

      {/* KPI row -- 5-column responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <KPISkeleton key={i} />)
          : kpis.map((kpi) => (
              <KPICard
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                delta={kpi.delta}
                deltaType={kpi.deltaType}
                icon={kpi.icon}
                className={kpi.className}
              />
            ))
        }
      </div>

      {/* Quick actions bar */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {pendingTopics.length > 1 && (
          <Button variant="secondary" size="sm" onClick={handleStartAll}>
            <Play className="w-3.5 h-3.5" />
            Start All Pending ({pendingTopics.length})
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleRefresh}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
        {approvedForPublish.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setBatchDialogOpen(true)}>
            <Upload className="w-3.5 h-3.5" />
            Publish All ({approvedForPublish.length})
          </Button>
        )}
        {metrics.pendingReview > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-warning-bg text-warning border border-warning-border">
            <AlertCircle className="w-3 h-3" />
            {metrics.pendingReview} Pending Review
          </span>
        )}
        {metrics.scheduled > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-info-bg text-info border border-info-border">
            <Clock className="w-3 h-3" />
            {metrics.scheduled} Scheduled
          </span>
        )}
      </div>

      {/* Pipeline table */}
      <PipelineTable topics={topics || []} projectId={projectId} statusFilter={statusFilter} />

      {/* Batch publish dialog */}
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
