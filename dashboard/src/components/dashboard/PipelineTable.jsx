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
  RotateCcw,
  AlertTriangle,
  Scan,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';
import { webhookCall } from '../../lib/api';
import { toast } from 'sonner';
import useMediaQuery from '../../hooks/useMediaQuery';
import StatusBadge from '../shared/StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import SegmentedProgressBar, { computeWeightedProgress } from './SegmentedProgressBar';

/* ------------------------------------------------------------------ */
/*  Status → StatusBadge variant mapping                               */
/* ------------------------------------------------------------------ */
const STATUS_MAP = {
  pending:         { label: 'Pending',      variant: 'pending',    group: 'pending' },
  approved:        { label: 'Approved',     variant: 'approved',   group: 'pending' },
  scripting:       { label: 'Scripting',    variant: 'scripting',  group: 'active' },
  script_approved: { label: 'Script OK',    variant: 'approved',   group: 'pending' },
  classifying:     { label: 'Classifying',  variant: 'scripting',  group: 'active' },
  queued:          { label: 'Queued',       variant: 'assembly',   group: 'active' },
  producing:       { label: 'Producing',    variant: 'active',     group: 'active' },
  audio:           { label: 'Audio',        variant: 'active',     group: 'active' },
  images:          { label: 'Images',       variant: 'active',     group: 'active' },
  assembling:      { label: 'Assembling',   variant: 'assembly',   group: 'active' },
  assembled:       { label: 'Assembled',    variant: 'assembled',  group: 'active' },
  ready_review:    { label: 'Review',       variant: 'review',     group: 'active' },
  video_approved:  { label: 'Approved',     variant: 'approved',   group: 'active' },
  publishing:      { label: 'Publishing',   variant: 'uploading',  group: 'active' },
  scheduled:       { label: 'Scheduled',    variant: 'review',     group: 'published' },
  published:       { label: 'Published',    variant: 'published',  group: 'published' },
  upload_failed:   { label: 'Failed',       variant: 'failed',     group: 'failed' },
  failed:          { label: 'Failed',       variant: 'failed',     group: 'failed' },
  stopped:         { label: 'Stopped',      variant: 'pending',    group: 'failed' },
  rejected:        { label: 'Rejected',     variant: 'rejected',   group: 'failed' },
};

const FILTER_TABS = [
  { value: null,        label: 'All' },
  { value: 'active',    label: 'Active' },
  { value: 'published', label: 'Published' },
  { value: 'failed',    label: 'Failed' },
];

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */
function formatNumber(num) {
  if (num == null || num === 0) return '--';
  return num.toLocaleString();
}

function formatRevenue(num) {
  if (num == null || num === 0) return '--';
  return `$${num.toLocaleString()}`;
}

function truncate(str, max = 48) {
  if (!str) return '--';
  return str.length > max ? str.slice(0, max) + '\u2026' : str;
}

/* ------------------------------------------------------------------ */
/*  Mobile card for responsive layout                                  */
/* ------------------------------------------------------------------ */
function MobileTopicCard({ topic, projectId }) {
  const navigate = useNavigate();
  const progress = computeWeightedProgress(topic);
  const statusInfo = STATUS_MAP[topic.status] || STATUS_MAP.pending;

  return (
    <div
      onClick={() => navigate(`/project/${projectId}/topics/${topic.id}`)}
      className="bg-card border border-border rounded-xl p-4 cursor-pointer active:scale-[0.99] transition-all hover:border-border-hover"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-foreground line-clamp-2 flex-1">
          {topic.seo_title || topic.original_title || `Topic #${topic.topic_number}`}
        </p>
        <StatusBadge status={statusInfo.variant} label={statusInfo.label} />
      </div>
      {progress != null && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1">
            <SegmentedProgressBar topic={topic} />
          </div>
          <span className="text-2xs font-medium text-muted-foreground tabular-nums font-mono">{progress}%</span>
        </div>
      )}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {topic.script_quality_score != null && (
          <span className="font-mono tabular-nums">Score: {topic.script_quality_score}</span>
        )}
        {topic.yt_views > 0 && (
          <span className="font-mono tabular-nums">Views: {topic.yt_views.toLocaleString()}</span>
        )}
        {topic.yt_estimated_revenue > 0 && (
          <span className="font-mono tabular-nums text-success">${topic.yt_estimated_revenue}</span>
        )}
      </div>
      {topic.drive_video_url && (
        <a
          href={topic.drive_video_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          View Video
        </a>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PipelineTable                                                      */
/* ------------------------------------------------------------------ */
export default function PipelineTable({ topics, projectId, statusFilter: externalStatusFilter }) {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [searchQuery, setSearchQuery] = useState('');
  const [internalStatusFilter, setInternalStatusFilter] = useState(null);
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
        const cfg = STATUS_MAP[t.status] || {};
        return cfg.group === activeStatusFilter || t.status === activeStatusFilter;
      });
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
  }, [topics, searchQuery, activeStatusFilter, sortColumn, sortDirection]);

  const handleRetryTopic = useCallback(async (e, topicId) => {
    e.stopPropagation();
    const result = await webhookCall('production/trigger', { topic_id: topicId });
    if (result?.success !== false) {
      toast.success('Retrying production...');
    } else {
      toast.error(result?.error || 'Failed to retry');
    }
  }, []);

  /* ---- Sortable header cell ---- */
  function SortableHead({ column, children, className = '' }) {
    const isActive = sortColumn === column;
    return (
      <TableHead
        className={cn(
          'cursor-pointer select-none hover:text-foreground transition-colors',
          className
        )}
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
      </TableHead>
    );
  }

  /* ---- Empty state ---- */
  if (!topics || topics.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Pipeline</h3>
        </div>
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Pipeline table will populate when topics are generated
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header bar with title, filter tabs, and search */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold">Pipeline</h3>
            {/* Filter tabs */}
            <div className="flex items-center gap-1">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => setInternalStatusFilter(tab.value)}
                  className={cn(
                    'px-3 py-1 text-xs rounded-md transition-colors',
                    activeStatusFilter === tab.value
                      ? 'bg-warning-bg text-warning'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search titles..."
                className="h-8 pl-8 pr-3 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-[180px]"
              />
            </div>
            {/* Count */}
            <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
              {filteredTopics.length} of {topics.length}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile card list */}
      {isMobile ? (
        <div className="p-3 space-y-2">
          {filteredTopics.map((topic) => (
            <MobileTopicCard
              key={topic.id}
              topic={topic}
              projectId={projectId}
            />
          ))}
          {filteredTopics.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">No matching topics</p>
          )}
        </div>
      ) : (
        /* Desktop table using shadcn Table */
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <SortableHead column="number" className="w-[40px]">#</SortableHead>
              <SortableHead column="title">Title</SortableHead>
              <TableHead className="w-[100px]">Angle</TableHead>
              <SortableHead column="status" className="w-[100px]">Status</SortableHead>
              <TableHead className="w-[140px]">Progress</TableHead>
              <SortableHead column="score" className="text-right w-[60px]">Score</SortableHead>
              <SortableHead column="views" className="text-right w-[80px]">Views</SortableHead>
              <SortableHead column="revenue" className="text-right w-[80px]">Revenue</SortableHead>
              <TableHead className="text-right w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTopics.map((topic) => {
              const statusInfo = STATUS_MAP[topic.status] || STATUS_MAP.pending;
              const isFailed = statusInfo.group === 'failed';
              const hasReviewAction = (topic.status === 'assembled' || topic.status === 'ready_review' || topic.video_review_status === 'approved') && topic.status !== 'published' && topic.status !== 'publishing';
              const isPublished = topic.status === 'published' && topic.youtube_url;
              const hasDriveVideo = !!topic.drive_video_url;
              const hasErrorLog = isFailed && topic.error_log;
              const isExpanded = expandedErrors[topic.id];

              return (
                <TableRow
                  key={topic.id}
                  data-testid={`topic-row-${topic.id}`}
                  className={cn(
                    'cursor-pointer hover:bg-card-hover transition-colors',
                    isFailed && 'border-l-2 border-l-danger'
                  )}
                  onClick={() => navigate(`/project/${projectId}/topics/${topic.id}`)}
                >
                  {/* # */}
                  <TableCell className="text-muted-foreground tabular-nums text-xs font-bold">
                    {topic.topic_number}
                  </TableCell>

                  {/* Title + Angle stacked */}
                  <TableCell>
                    <span className="font-medium text-foreground">
                      {truncate(topic.seo_title || topic.original_title)}
                    </span>
                  </TableCell>

                  {/* Angle */}
                  <TableCell className="text-xs text-muted-foreground">
                    {topic.playlist_angle || '--'}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <span data-testid={`status-badge-${topic.id}`}>
                      <StatusBadge status={statusInfo.variant} label={statusInfo.label} />
                    </span>
                    {/* Classification split indicator */}
                    {(topic.classification_status === 'classified' || topic.classification_status === 'reviewed') && topic.scenes_fal_count != null && (
                      <div className="flex items-center gap-1 mt-1">
                        <Scan className="w-2.5 h-2.5 text-warning" />
                        <span className="text-[9px] text-muted-foreground tabular-nums">
                          {topic.scenes_fal_count ?? 0}F / {topic.scenes_remotion_count ?? 0}R
                        </span>
                      </div>
                    )}
                    {topic.classification_status === 'classifying' && (
                      <div className="flex items-center gap-1 mt-1">
                        <Scan className="w-2.5 h-2.5 text-info animate-pulse" />
                        <span className="text-[9px] text-info">Classifying...</span>
                      </div>
                    )}
                  </TableCell>

                  {/* Progress */}
                  <TableCell data-testid={`progress-${topic.id}`}>
                    {computeWeightedProgress(topic) != null ? (
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 max-w-[120px]">
                          <SegmentedProgressBar topic={topic} />
                        </div>
                        <span className="text-2xs font-medium text-muted-foreground tabular-nums w-8 text-right">
                          {computeWeightedProgress(topic)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-2xs text-muted-foreground">--</span>
                    )}
                  </TableCell>

                  {/* Score */}
                  <TableCell className="text-right">
                    {topic.script_quality_score != null ? (
                      <span className={cn(
                        'text-xs font-semibold tabular-nums',
                        topic.script_quality_score >= 7
                          ? 'text-accent'
                          : topic.script_quality_score >= 5
                            ? 'text-warning'
                            : 'text-danger'
                      )}>
                        {topic.script_quality_score}
                      </span>
                    ) : (
                      <span className="text-2xs text-muted-foreground">--</span>
                    )}
                  </TableCell>

                  {/* Views */}
                  <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                    {formatNumber(topic.yt_views)}
                  </TableCell>

                  {/* Revenue */}
                  <TableCell className="text-right tabular-nums text-xs">
                    <span className={topic.yt_estimated_revenue > 0 ? 'text-success font-medium' : 'text-muted-foreground'}>
                      {formatRevenue(topic.yt_estimated_revenue)}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {isFailed && (
                        <button
                          onClick={(e) => handleRetryTopic(e, topic.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:text-danger/80 transition-colors"
                          title="Retry production"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                      {hasDriveVideo && (
                        <a
                          href={topic.drive_video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          View Video
                        </a>
                      )}
                      {hasReviewAction && (
                        <Link
                          to={`/project/${projectId}/topics/${topic.id}/review`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs font-medium text-info hover:text-info/80 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                        </Link>
                      )}
                      {isPublished && (
                        <a
                          href={topic.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs font-medium text-success hover:text-success/80 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-1" />
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
                        <button className="text-2xs text-danger hover:text-danger/80 flex items-center gap-0.5 cursor-pointer">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {isExpanded ? 'Hide' : 'Error'}
                        </button>
                        {isExpanded && (
                          <pre className="text-2xs text-danger font-mono whitespace-pre-wrap break-all mt-1 p-2 rounded-md bg-danger-bg max-w-[250px] text-left">
                            {topic.error_log}
                          </pre>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredTopics.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">
                  No matching topics
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
