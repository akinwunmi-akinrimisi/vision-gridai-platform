import { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';
import { webhookCall } from '../../lib/api';
import { toast } from 'sonner';
import useMediaQuery from '../../hooks/useMediaQuery';
import SegmentedProgressBar, { computeWeightedProgress } from './SegmentedProgressBar';

const STATUS_CONFIG = {
  pending:         { label: 'Pending',          cls: 'badge bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400', group: 'pending' },
  approved:        { label: 'Approved',         cls: 'badge badge-blue', group: 'pending' },
  scripting:       { label: 'Scripting',        cls: 'badge badge-cyan', group: 'in_progress' },
  script_approved: { label: 'Script OK',        cls: 'badge badge-green', group: 'pending' },
  queued:          { label: 'Queued',           cls: 'badge badge-amber', group: 'in_progress' },
  producing:       { label: 'Producing',        cls: 'badge badge-amber animate-pulse', group: 'in_progress' },
  audio:           { label: 'Audio',            cls: 'badge badge-purple', group: 'in_progress' },
  images:          { label: 'Images',           cls: 'badge badge-purple', group: 'in_progress' },
  assembling:      { label: 'Assembling',       cls: 'badge badge-purple', group: 'in_progress' },
  assembled:       { label: 'Assembled',        cls: 'badge badge-blue', group: 'in_progress' },
  ready_review:    { label: 'Review',           cls: 'badge badge-amber', group: 'in_progress' },
  video_approved:  { label: 'Approved',         cls: 'badge badge-blue', group: 'in_progress' },
  publishing:      { label: 'Publishing',       cls: 'badge badge-amber animate-pulse', group: 'in_progress' },
  scheduled:       { label: 'Scheduled',        cls: 'badge badge-purple', group: 'published' },
  published:       { label: 'Published',        cls: 'badge badge-green', icon: true, group: 'published' },
  upload_failed:   { label: 'Failed',           cls: 'badge badge-red', group: 'failed' },
  failed:          { label: 'Failed',           cls: 'badge badge-red', group: 'failed' },
  stopped:         { label: 'Stopped',          cls: 'badge bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400', group: 'failed' },
  rejected:        { label: 'Rejected',         cls: 'badge badge-red', group: 'failed' },
};

const STATUS_FILTER_OPTIONS = [
  { value: null, label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'published', label: 'Published' },
  { value: 'failed', label: 'Failed' },
];

function formatNumber(num) {
  if (num == null || num === 0) return '--';
  return num.toLocaleString();
}

function formatRevenue(num) {
  if (num == null || num === 0) return '--';
  return `$${num.toLocaleString()}`;
}

function truncate(str, max = 45) {
  if (!str) return '--';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

function MobileTopicCard({ topic, projectId, statusCfg }) {
  const navigate = useNavigate();
  const progress = computeWeightedProgress(topic);

  return (
    <div
      onClick={() => navigate(`/project/${projectId}/topics/${topic.id}`)}
      className="glass-card p-4 cursor-pointer active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2 flex-1">
          {topic.seo_title || topic.original_title || `Topic #${topic.topic_number}`}
        </p>
        <span className={statusCfg.cls}>{statusCfg.label}</span>
      </div>
      {progress != null && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1">
            <SegmentedProgressBar topic={topic} />
          </div>
          <span className="text-2xs font-medium text-slate-500 tabular-nums font-mono">{progress}%</span>
        </div>
      )}
      <div className="flex items-center gap-4 text-xs text-text-muted dark:text-text-muted-dark">
        {topic.script_quality_score != null && (
          <span className="font-mono tabular-nums">Score: {topic.script_quality_score}</span>
        )}
        {topic.yt_views > 0 && (
          <span className="font-mono tabular-nums">Views: {topic.yt_views.toLocaleString()}</span>
        )}
        {topic.yt_estimated_revenue > 0 && (
          <span className="font-mono tabular-nums text-emerald-500">${topic.yt_estimated_revenue}</span>
        )}
      </div>
    </div>
  );
}

export default function PipelineTable({ topics, projectId, statusFilter: externalStatusFilter }) {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [searchQuery, setSearchQuery] = useState('');
  const [internalStatusFilter, setInternalStatusFilter] = useState(null);
  const [angleFilter, setAngleFilter] = useState(null);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [expandedErrors, setExpandedErrors] = useState({});

  useRealtimeSubscription(
    projectId ? 'topics' : null,
    projectId ? `project_id=eq.${projectId}` : null,
    [['topics', projectId]]
  );

  // Use external filter (from ProjectDashboard) if provided, otherwise internal
  const activeStatusFilter = externalStatusFilter || internalStatusFilter;

  // Get unique playlist angles from topics
  const playlistAngles = useMemo(() => {
    if (!topics) return [];
    const angles = [...new Set(topics.map((t) => t.playlist_angle).filter(Boolean))];
    return angles.sort();
  }, [topics]);

  // Handle column sort toggle
  const handleSort = useCallback((column) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);

  // Filter and sort topics
  const filteredTopics = useMemo(() => {
    if (!topics) return [];

    let result = [...topics];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((t) => {
        const title = (t.seo_title || t.original_title || '').toLowerCase();
        return title.includes(q);
      });
    }

    // Status filter
    if (activeStatusFilter) {
      result = result.filter((t) => {
        const cfg = STATUS_CONFIG[t.status] || {};
        return cfg.group === activeStatusFilter || t.status === activeStatusFilter;
      });
    }

    // Playlist angle filter
    if (angleFilter) {
      result = result.filter((t) => t.playlist_angle === angleFilter);
    }

    // Sort
    if (sortColumn) {
      result.sort((a, b) => {
        let valA, valB;
        switch (sortColumn) {
          case 'number':
            valA = a.topic_number ?? 0;
            valB = b.topic_number ?? 0;
            break;
          case 'title':
            valA = (a.seo_title || a.original_title || '').toLowerCase();
            valB = (b.seo_title || b.original_title || '').toLowerCase();
            break;
          case 'status':
            valA = a.status || '';
            valB = b.status || '';
            break;
          case 'score':
            valA = a.script_quality_score ?? -1;
            valB = b.script_quality_score ?? -1;
            break;
          case 'views':
            valA = a.yt_views ?? 0;
            valB = b.yt_views ?? 0;
            break;
          case 'revenue':
            valA = a.yt_estimated_revenue ?? 0;
            valB = b.yt_estimated_revenue ?? 0;
            break;
          default:
            return 0;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [topics, searchQuery, activeStatusFilter, angleFilter, sortColumn, sortDirection]);

  const handleRetryTopic = useCallback(async (e, topicId) => {
    e.stopPropagation();
    const result = await webhookCall('production/trigger', { topic_id: topicId });
    if (result?.success !== false) {
      toast.success('Retrying production...');
    } else {
      toast.error(result?.error || 'Failed to retry');
    }
  }, []);

  function SortHeader({ column, children, className = '' }) {
    const isActive = sortColumn === column;
    return (
      <th
        className={`table-header table-cell cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300 transition-colors ${className}`}
        onClick={() => handleSort(column)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          {isActive && (
            sortDirection === 'asc'
              ? <ChevronUp className="w-3 h-3" />
              : <ChevronDown className="w-3 h-3" />
          )}
        </span>
      </th>
    );
  }

  if (!topics || topics.length === 0) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <h2 className="section-title">Pipeline Status</h2>
          <p className="text-xs text-text-muted dark:text-text-muted-dark mt-0.5">
            All topics and their production progress
          </p>
        </div>
        <div className="p-8 text-center">
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            Pipeline table will populate when topics are generated
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Header with search + filters */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search titles..."
              className="input !pl-9 !py-1.5 text-sm w-full"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={activeStatusFilter || ''}
              onChange={(e) => setInternalStatusFilter(e.target.value || null)}
              className="input !pl-9 !py-1.5 text-sm appearance-none cursor-pointer pr-8 min-w-[140px]"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value || ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Playlist angle filter */}
          {playlistAngles.length > 0 && (
            <select
              value={angleFilter || ''}
              onChange={(e) => setAngleFilter(e.target.value || null)}
              className="input !py-1.5 text-sm appearance-none cursor-pointer pr-8 min-w-[130px]"
            >
              <option value="">All Angles</option>
              {playlistAngles.map((angle) => (
                <option key={angle} value={angle}>{angle}</option>
              ))}
            </select>
          )}

          {/* Count */}
          <span className="text-xs text-text-muted dark:text-text-muted-dark tabular-nums flex-shrink-0">
            {filteredTopics.length} of {topics.length} topics
          </span>
        </div>
      </div>

      {/* Mobile card list */}
      {isMobile ? (
        <div className="p-3 space-y-2">
          {filteredTopics.map((topic) => {
            const statusCfg = STATUS_CONFIG[topic.status] || STATUS_CONFIG.pending;
            return (
              <MobileTopicCard
                key={topic.id}
                topic={topic}
                projectId={projectId}
                statusCfg={statusCfg}
              />
            );
          })}
          {filteredTopics.length === 0 && (
            <p className="text-center text-sm text-text-muted dark:text-text-muted-dark py-4">No matching topics</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.04]">
                <SortHeader column="number" className="w-12">#</SortHeader>
                <SortHeader column="title">Title</SortHeader>
                <SortHeader column="status" className="w-28">Status</SortHeader>
                <th className="table-header table-cell w-36">Progress</th>
                <SortHeader column="score" className="text-right w-16">Score</SortHeader>
                <SortHeader column="views" className="text-right w-20">Views</SortHeader>
                <SortHeader column="revenue" className="text-right w-20">Revenue</SortHeader>
                <th className="table-header table-cell text-right w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTopics.map((topic) => {
                const statusCfg = STATUS_CONFIG[topic.status] || STATUS_CONFIG.pending;
                const isFailed = statusCfg.group === 'failed';
                const hasReviewAction = (topic.status === 'assembled' || topic.status === 'ready_review' || topic.video_review_status === 'approved') && topic.status !== 'published' && topic.status !== 'publishing';
                const isPublished = topic.status === 'published' && topic.youtube_url;
                const hasErrorLog = isFailed && topic.error_log;
                const isExpanded = expandedErrors[topic.id];

                return (
                  <tr
                    key={topic.id}
                    data-testid={`topic-row-${topic.id}`}
                    className={`table-row-interactive ${isFailed ? 'border-l-2 border-l-red-500' : ''}`}
                    onClick={() => navigate(`/project/${projectId}/topics/${topic.id}`)}
                  >
                    <td className="table-cell">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                        {topic.topic_number}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {truncate(topic.seo_title || topic.original_title)}
                      </span>
                      {topic.playlist_angle && (
                        <span className="block text-2xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {topic.playlist_angle}
                        </span>
                      )}
                    </td>
                    <td className="table-cell">
                      <span data-testid={`status-badge-${topic.id}`} className={statusCfg.cls}>
                        {statusCfg.icon && <CheckCircle2 className="w-3 h-3" />}
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="table-cell" data-testid={`progress-${topic.id}`}>
                      {computeWeightedProgress(topic) != null ? (
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 max-w-[120px]">
                            <SegmentedProgressBar topic={topic} />
                          </div>
                          <span className="text-2xs font-medium text-slate-500 dark:text-slate-400 tabular-nums w-8 text-right">
                            {computeWeightedProgress(topic)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-2xs text-slate-300 dark:text-slate-600">--</span>
                      )}
                    </td>
                    <td className="table-cell text-right">
                      {topic.script_quality_score != null ? (
                        <span className={`text-xs font-semibold tabular-nums ${
                          topic.script_quality_score >= 7 ? 'text-emerald-600 dark:text-emerald-400' :
                          topic.script_quality_score >= 5 ? 'text-amber-600 dark:text-amber-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {topic.script_quality_score}
                        </span>
                      ) : (
                        <span className="text-2xs text-slate-300 dark:text-slate-600">--</span>
                      )}
                    </td>
                    <td className="table-cell text-right tabular-nums text-slate-600 dark:text-slate-400 text-xs">
                      {formatNumber(topic.yt_views)}
                    </td>
                    <td className="table-cell text-right tabular-nums text-slate-600 dark:text-slate-400 text-xs">
                      {formatRevenue(topic.yt_estimated_revenue)}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {isFailed && (
                          <button
                            onClick={(e) => handleRetryTopic(e, topic.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                            title="Retry production"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Retry
                          </button>
                        )}
                        {hasReviewAction && (
                          <Link
                            to={`/project/${projectId}/topics/${topic.id}/review`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary dark:text-blue-400 hover:text-primary-600 dark:hover:text-blue-300 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            Review
                          </Link>
                        )}
                        {isPublished && (
                          <a
                            href={topic.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View
                          </a>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 ml-auto" />
                      </div>
                      {/* Expandable error panel for failed topics */}
                      {isFailed && hasErrorLog && (
                        <div
                          className="mt-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedErrors((prev) => ({ ...prev, [topic.id]: !prev[topic.id] }));
                          }}
                        >
                          <button className="text-2xs text-red-500 hover:text-red-600 flex items-center gap-0.5 cursor-pointer">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {isExpanded ? 'Hide Error' : 'Show Error'}
                          </button>
                          {isExpanded && (
                            <pre className="text-2xs text-red-600 dark:text-red-400 font-mono whitespace-pre-wrap break-all mt-1 p-2 rounded bg-red-50 dark:bg-red-500/[0.06] max-w-[250px] text-left">
                              {topic.error_log}
                            </pre>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
