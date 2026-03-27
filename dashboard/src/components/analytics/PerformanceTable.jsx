import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { ChevronUp, ChevronDown, BarChart3 } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import EmptyState from '../shared/EmptyState';
import useMediaQuery from '../../hooks/useMediaQuery';

function parseDurationToSeconds(dur) {
  if (!dur) return 0;
  if (typeof dur === 'number') return dur;
  if (typeof dur === 'string' && dur.includes(':')) {
    const parts = dur.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return parseFloat(dur) || 0;
}

function formatDuration(secs) {
  if (!secs) return '--';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const COLUMNS = [
  { key: 'topic_number', label: '#', align: 'left' },
  { key: 'seo_title', label: 'Title', align: 'left' },
  { key: 'yt_views', label: 'Views', align: 'right' },
  { key: 'yt_watch_hours', label: 'Watch Hrs', align: 'right' },
  { key: 'yt_ctr', label: 'CTR', align: 'right' },
  { key: 'yt_avg_view_duration', label: 'Avg Dur', align: 'right' },
  { key: 'yt_estimated_revenue', label: 'Revenue', align: 'right' },
  { key: 'total_cost', label: 'Cost', align: 'right' },
  { key: 'pl', label: 'P/L', align: 'right' },
  { key: 'yt_actual_cpm', label: 'CPM', align: 'right' },
  { key: 'published_at', label: 'Published', align: 'right' },
];

/**
 * Sortable per-video performance table using shadcn Table primitives.
 * @param {{ topics: Array, projectId: string }} props
 */
export default function PerformanceTable({ topics, projectId }) {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [sortColumn, setSortColumn] = useState('published_at');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (key) => {
    if (sortColumn === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(key);
      setSortDirection('desc');
    }
  };

  const sorted = useMemo(() => {
    if (!topics || topics.length === 0) return [];
    return [...topics].sort((a, b) => {
      let aVal, bVal;

      if (sortColumn === 'pl') {
        aVal = (parseFloat(a.yt_estimated_revenue) || 0) - (parseFloat(a.total_cost) || 0);
        bVal = (parseFloat(b.yt_estimated_revenue) || 0) - (parseFloat(b.total_cost) || 0);
      } else if (sortColumn === 'yt_avg_view_duration') {
        aVal = parseDurationToSeconds(a.yt_avg_view_duration);
        bVal = parseDurationToSeconds(b.yt_avg_view_duration);
      } else if (sortColumn === 'published_at') {
        aVal = a.published_at ? new Date(a.published_at).getTime() : 0;
        bVal = b.published_at ? new Date(b.published_at).getTime() : 0;
      } else if (sortColumn === 'seo_title') {
        aVal = (a.seo_title || '').toLowerCase();
        bVal = (b.seo_title || '').toLowerCase();
      } else {
        aVal = parseFloat(a[sortColumn]) || 0;
        bVal = parseFloat(b[sortColumn]) || 0;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [topics, sortColumn, sortDirection]);

  if (!topics || topics.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl" data-testid="performance-table">
        <EmptyState
          icon={BarChart3}
          title="No published videos yet"
          description="Analytics will appear once videos are published to YouTube"
        />
      </div>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <div className="space-y-2" data-testid="performance-table">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Video Performance
        </h3>
        {sorted.map((topic) => {
          const revenue = parseFloat(topic.yt_estimated_revenue) || 0;
          const cost = parseFloat(topic.total_cost) || 0;
          const pl = revenue - cost;
          return (
            <div
              key={topic.id}
              onClick={() => navigate(`/project/${projectId}/topics/${topic.id}/review`)}
              className="bg-card border border-border rounded-xl p-4 cursor-pointer active:scale-[0.99] transition-transform hover:border-border-hover"
            >
              <p className="text-sm font-medium text-foreground mb-2 line-clamp-2">
                {topic.seo_title || topic.original_title || `Topic #${topic.topic_number}`}
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Views</p>
                  <p className="font-bold font-mono tabular-nums">{(topic.yt_views || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Revenue</p>
                  <p className="font-bold font-mono tabular-nums text-success">${revenue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">P/L</p>
                  <p className={`font-bold font-mono tabular-nums ${pl >= 0 ? 'text-success' : 'text-danger'}`}>
                    {pl >= 0 ? '+' : ''}${pl.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">CTR</p>
                  <p className="font-bold font-mono tabular-nums">{parseFloat(topic.yt_ctr || 0).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Watch Hrs</p>
                  <p className="font-bold font-mono tabular-nums">{parseFloat(topic.yt_watch_hours || 0).toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CPM</p>
                  <p className="font-bold font-mono tabular-nums">${parseFloat(topic.yt_actual_cpm || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="performance-table">
      <div className="px-5 py-3.5 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Video Performance
        </h3>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            {COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`cursor-pointer select-none hover:text-foreground transition-colors text-[11px] uppercase tracking-wider ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                } ${col.key === 'seo_title' ? 'max-w-[200px]' : ''}`}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sortColumn === col.key && (
                    sortDirection === 'asc'
                      ? <ChevronUp className="w-3 h-3" />
                      : <ChevronDown className="w-3 h-3" />
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((topic) => {
            const revenue = parseFloat(topic.yt_estimated_revenue) || 0;
            const cost = parseFloat(topic.total_cost) || 0;
            const pl = revenue - cost;
            const durationSecs = parseDurationToSeconds(topic.yt_avg_view_duration);

            return (
              <TableRow
                key={topic.id}
                onClick={() => navigate(`/project/${projectId}/topics/${topic.id}/review`)}
                className="cursor-pointer border-border hover:bg-card-hover"
              >
                <TableCell className="text-muted-foreground tabular-nums text-xs">
                  {topic.topic_number}
                </TableCell>
                <TableCell className="truncate max-w-[200px] font-medium text-foreground text-xs">
                  {topic.seo_title || topic.original_title || `Topic #${topic.topic_number}`}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  {(topic.yt_views || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  {parseFloat(topic.yt_watch_hours || 0).toFixed(1)}h
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  {parseFloat(topic.yt_ctr || 0).toFixed(1)}%
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  {formatDuration(durationSecs)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs text-success">
                  ${revenue.toFixed(2)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs text-warning">
                  ${cost.toFixed(2)}
                </TableCell>
                <TableCell className={`text-right tabular-nums text-xs font-semibold ${
                  pl >= 0 ? 'text-success' : 'text-danger'
                }`}>
                  {pl >= 0 ? '+' : ''}${pl.toFixed(2)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  ${parseFloat(topic.yt_actual_cpm || 0).toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground whitespace-nowrap text-xs">
                  {formatDate(topic.published_at)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
