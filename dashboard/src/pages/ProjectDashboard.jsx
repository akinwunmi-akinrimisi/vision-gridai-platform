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
} from 'lucide-react';
import { useTopics } from '../hooks/useTopics';
import { useProjectMetrics } from '../hooks/useProjectMetrics';
import { SkeletonMetric } from '../components/ui/SkeletonLoader';
import PipelineTable from '../components/dashboard/PipelineTable';

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

  const isLoading = topicsLoading || metricsLoading;

  const statusMetrics = [
    { label: 'Total Topics', value: metrics.totalTopics, icon: Video, color: 'from-blue-500 to-indigo-600', textColor: 'text-blue-500' },
    { label: 'Approved', value: metrics.approved, icon: CheckCircle2, color: 'from-emerald-500 to-teal-600', textColor: 'text-emerald-500' },
    { label: 'In Progress', value: metrics.inProgress, icon: Clock, color: 'from-amber-500 to-orange-600', textColor: 'text-amber-500' },
    { label: 'Published', value: metrics.published, icon: Play, color: 'from-purple-500 to-violet-600', textColor: 'text-purple-500' },
  ];

  const financialMetrics = [
    { label: 'Total Spend', value: formatCurrency(metrics.totalSpend), icon: DollarSign },
    { label: 'Revenue', value: formatCurrency(metrics.totalRevenue), icon: TrendingUp },
    { label: 'ROI', value: computeROI(metrics.totalRevenue, metrics.totalSpend), icon: BarChart3 },
    { label: 'Avg CPM', value: metrics.avgCpm > 0 ? `$${metrics.avgCpm.toFixed(2)}` : '--', icon: AlertCircle },
  ];

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">Project Dashboard</h1>
        <p className="page-subtitle">Command center for your video production pipeline</p>
      </div>

      {/* Status metrics grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonMetric key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          {statusMetrics.map((m) => (
            <div key={m.label} className="glass-card p-5 group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider">
                  {m.label}
                </span>
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center shadow-sm`}>
                  <m.icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="metric-value text-slate-900 dark:text-white">
                {m.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Financial metrics grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonMetric key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
          {financialMetrics.map((f) => (
            <div key={f.label} className="card-elevated p-5">
              <div className="flex items-center gap-2 mb-2">
                <f.icon className="w-4 h-4 text-text-muted dark:text-text-muted-dark" />
                <span className="text-xs font-medium text-text-muted dark:text-text-muted-dark">
                  {f.label}
                </span>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {f.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline status table */}
      <PipelineTable topics={topics || []} projectId={projectId} />
    </div>
  );
}
