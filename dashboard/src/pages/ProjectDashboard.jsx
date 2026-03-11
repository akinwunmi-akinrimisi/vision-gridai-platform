import { useState, useMemo } from 'react';
import { useParams } from 'react-router';
import {
  Video,
  CheckCircle2,
  Clock,
  Play,
  DollarSign,
  TrendingUp,
  BarChart3,
  AlertCircle,
  Upload,
  Wallet,
} from 'lucide-react';
import { useTopics } from '../hooks/useTopics';
import { useProjectMetrics } from '../hooks/useProjectMetrics';
import { useQuotaStatus } from '../hooks/useQuotaStatus';
import { useBatchPublish } from '../hooks/usePublishMutations';
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

export default function ProjectDashboard() {
  const { id: projectId } = useParams();
  const { data: topics, isLoading: topicsLoading } = useTopics(projectId);
  const { metrics, isLoading: metricsLoading } = useProjectMetrics(projectId);
  const { remaining: quotaRemaining } = useQuotaStatus(projectId);
  const batchPublishMutation = useBatchPublish(projectId);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);

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

  const statusMetrics = [
    { label: 'Total Topics', value: metrics.totalTopics, icon: Video, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
    { label: 'Approved', value: metrics.approved, icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
    { label: 'In Progress', value: metrics.inProgress, icon: Clock, gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20' },
    { label: 'Published', value: metrics.published, icon: Play, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20' },
  ];

  const netProfitFormatted = metrics.netProfit > 0
    ? `+${formatCurrency(metrics.netProfit)}`
    : metrics.netProfit < 0
      ? `-${formatCurrency(Math.abs(metrics.netProfit))}`
      : formatCurrency(0);

  const financialMetrics = [
    { label: 'Total Spend', value: formatCurrency(metrics.totalSpend), icon: DollarSign, gradient: 'from-slate-500 to-slate-600' },
    { label: 'Revenue', value: formatCurrency(metrics.totalRevenue), icon: TrendingUp, gradient: 'from-emerald-500 to-teal-600' },
    { label: 'ROI', value: computeROI(metrics.totalRevenue, metrics.totalSpend), icon: BarChart3, gradient: 'from-violet-500 to-purple-600' },
    { label: 'Avg CPM', value: metrics.avgCpm > 0 ? `$${metrics.avgCpm.toFixed(2)}` : '--', icon: AlertCircle, gradient: 'from-amber-500 to-orange-500' },
    {
      label: 'Net Profit',
      value: netProfitFormatted,
      icon: Wallet,
      gradient: metrics.netProfit >= 0 ? 'from-emerald-500 to-green-600' : 'from-red-500 to-rose-600',
      valueColor: metrics.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
    },
  ];

  return (
    <div className="animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">Project Dashboard</h1>
        <p className="page-subtitle">Command center for your video production pipeline</p>
      </div>

      {/* Status metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonMetric key={i} />)
          : statusMetrics.map((m, i) => (
              <div
                key={m.label}
                className={`glass-card p-5 animate-slide-up stagger-${i + 1}`}
                style={{ opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {m.label}
                  </span>
                  <div className={`metric-card-icon bg-gradient-to-br ${m.gradient} ${m.shadow} shadow-md`}>
                    <m.icon className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                </div>
                <p className="metric-value text-slate-900 dark:text-white">{m.value}</p>
              </div>
            ))
        }
      </div>

      {/* Financial metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-8">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonMetric key={i} />)
          : financialMetrics.map((f, i) => (
              <div
                key={f.label}
                className={`glass-card p-4 animate-slide-up stagger-${i + 1}`}
                style={{ opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {f.label}
                  </span>
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-sm`}>
                    <f.icon className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                  </div>
                </div>
                <p className={`text-xl font-bold tabular-nums ${f.valueColor || 'text-slate-900 dark:text-white'}`}>
                  {f.value}
                </p>
              </div>
            ))
        }
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
        {approvedForPublish.length > 0 && (
          <button onClick={() => setBatchDialogOpen(true)} className="btn-success btn-sm flex-shrink-0">
            <Upload className="w-3.5 h-3.5" />
            Publish All ({approvedForPublish.length})
          </button>
        )}
      </div>
      <PipelineTable topics={topics || []} projectId={projectId} />

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
