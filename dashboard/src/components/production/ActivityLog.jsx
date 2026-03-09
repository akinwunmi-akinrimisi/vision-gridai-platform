import { useState } from 'react';
import { ChevronDown, ChevronRight, ScrollText } from 'lucide-react';

/**
 * Format a date string as relative time (e.g. "2m ago", "1h ago").
 */
function relativeTime(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

/**
 * Stage badge color mapping.
 */
const stageBadge = {
  audio: 'badge-primary',
  images: 'badge-purple',
  i2v: 'badge-amber',
  t2v: 'badge-emerald',
  assembly: 'badge-red',
  captions: 'badge-cyan',
};

/**
 * Collapsible activity log showing production_log entries.
 * Collapsed by default. Shows last 10 entries with "Show more" for overflow.
 */
export default function ActivityLog({ logs = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const visibleLogs = showAll ? logs : logs.slice(0, 10);
  const hasMore = logs.length > 10 && !showAll;

  return (
    <div data-testid="activity-log" className="glass-card p-6 mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="
          flex items-center gap-2 w-full text-left cursor-pointer
          hover:opacity-80 transition-opacity duration-200
        "
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-text-muted dark:text-text-muted-dark" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted dark:text-text-muted-dark" />
        )}
        <ScrollText className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Activity Log
        </h3>
        <span className="text-xs text-text-muted dark:text-text-muted-dark">
          ({logs.length})
        </span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-2">
          {visibleLogs.length === 0 ? (
            <p className="text-xs text-text-muted dark:text-text-muted-dark">No activity yet</p>
          ) : (
            visibleLogs.map((log) => (
              <div
                key={log.id}
                className="
                  flex items-start gap-3 px-3 py-2 rounded-lg
                  bg-slate-50 dark:bg-white/[0.03]
                  text-xs
                "
              >
                <span className="text-text-muted dark:text-text-muted-dark tabular-nums shrink-0 w-14">
                  {relativeTime(log.created_at)}
                </span>
                <span className={`badge ${stageBadge[log.stage] || 'badge-primary'} text-[9px] px-1.5 py-0.5 shrink-0`}>
                  {log.stage}
                </span>
                <span className="text-slate-700 dark:text-slate-300 flex-1">
                  {log.action}
                </span>
              </div>
            ))
          )}
          {hasMore && (
            <button
              onClick={() => setShowAll(true)}
              className="text-xs text-primary hover:underline cursor-pointer"
            >
              Show more ({logs.length - 10} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
