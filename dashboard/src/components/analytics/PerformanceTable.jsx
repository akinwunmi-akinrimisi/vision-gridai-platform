import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { ChevronUp, ChevronDown, BarChart3 } from 'lucide-react';

/**
 * Parse a duration string like "45:30" to total seconds.
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
 * Format seconds as M:SS.
 */
function formatDuration(secs) {
  if (!secs) return '--';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Format a date string as "MMM DD, YYYY".
 */
function formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const COLUMNS = [
  { key: 'topic_number', label: '#', width: 'w-10' },
  { key: 'seo_title', label: 'Title', width: 'max-w-[200px]' },
  { key: 'yt_views', label: 'Views', width: 'w-20', align: 'right' },
  { key: 'yt_watch_hours', label: 'Watch Hrs', width: 'w-20', align: 'right' },
  { key: 'yt_ctr', label: 'CTR', width: 'w-16', align: 'right' },
  { key: 'yt_avg_view_duration', label: 'Avg Dur', width: 'w-18', align: 'right' },
  { key: 'yt_estimated_revenue', label: 'Revenue', width: 'w-20', align: 'right' },
  { key: 'total_cost', label: 'Cost', width: 'w-18', align: 'right' },
  { key: 'pl', label: 'P/L', width: 'w-20', align: 'right' },
  { key: 'yt_actual_cpm', label: 'CPM', width: 'w-16', align: 'right' },
  { key: 'published_at', label: 'Published', width: 'w-28', align: 'right' },
];

/**
 * Sortable per-video performance table.
 * @param {{ topics: Array, projectId: string }} props
 */
export default function PerformanceTable({ topics, projectId }) {
  const navigate = useNavigate();
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
      <div className="glass-card p-8" data-testid="performance-table">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            No published videos yet
          </p>
          <p className="text-xs text-text-muted dark:text-text-muted-dark mt-1">
            Analytics will appear once videos are published to YouTube
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden" data-testid="performance-table">
      <div className="px-6 py-4 border-b border-white/10 dark:border-slate-700/50">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
          Video Performance
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 dark:border-slate-700/50">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-3 py-3 text-xs font-semibold uppercase tracking-wider
                    text-text-muted dark:text-text-muted-dark cursor-pointer select-none
                    hover:text-slate-900 dark:hover:text-white transition-colors
                    ${col.align === 'right' ? 'text-right' : 'text-left'}
                    ${col.width || ''}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortColumn === col.key && (
                      sortDirection === 'asc'
                        ? <ChevronUp className="w-3 h-3" />
                        : <ChevronDown className="w-3 h-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((topic) => {
              const revenue = parseFloat(topic.yt_estimated_revenue) || 0;
              const cost = parseFloat(topic.total_cost) || 0;
              const pl = revenue - cost;
              const durationSecs = parseDurationToSeconds(topic.yt_avg_view_duration);

              return (
                <tr
                  key={topic.id}
                  onClick={() => navigate(`/project/${projectId}/topics/${topic.id}/review`)}
                  className="border-b border-white/5 dark:border-slate-700/30
                    hover:bg-white/5 dark:hover:bg-white/[0.03] cursor-pointer transition-colors"
                >
                  <td className="px-3 py-3 text-text-muted dark:text-text-muted-dark tabular-nums">
                    {topic.topic_number}
                  </td>
                  <td className="px-3 py-3 truncate max-w-[200px] font-medium text-slate-900 dark:text-white">
                    {topic.seo_title || topic.original_title || `Topic #${topic.topic_number}`}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {(topic.yt_views || 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {parseFloat(topic.yt_watch_hours || 0).toFixed(1)}h
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {parseFloat(topic.yt_ctr || 0).toFixed(1)}%
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatDuration(durationSecs)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    ${revenue.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-amber-600 dark:text-amber-400">
                    ${cost.toFixed(2)}
                  </td>
                  <td className={`px-3 py-3 text-right tabular-nums font-semibold ${
                    pl >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}>
                    {pl >= 0 ? '+' : ''}${pl.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    ${parseFloat(topic.yt_actual_cpm || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right text-text-muted dark:text-text-muted-dark whitespace-nowrap">
                    {formatDate(topic.published_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
