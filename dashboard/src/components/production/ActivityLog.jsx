import { useState } from 'react';
import { ChevronDown, ChevronRight, ScrollText } from 'lucide-react';
import StatusBadge from '../shared/StatusBadge';

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
 * Stage to StatusBadge mapping.
 */
const stageMap = {
  audio: { status: 'active', label: 'audio' },
  images: { status: 'review', label: 'images' },
  i2v: { status: 'assembly', label: 'i2v' },
  t2v: { status: 'approved', label: 't2v' },
  assembly: { status: 'failed', label: 'assembly' },
  captions: { status: 'scripting', label: 'captions' },
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
    <div data-testid="activity-log" className="bg-card border border-border rounded-xl p-4 sm:p-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left cursor-pointer hover:opacity-80 transition-opacity duration-200"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <ScrollText className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">
          Activity Log
        </h3>
        <span className="text-xs text-muted-foreground">
          ({logs.length})
        </span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-2">
          {visibleLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No activity yet</p>
          ) : (
            visibleLogs.map((log) => {
              const badge = stageMap[log.stage] || { status: 'pending', label: log.stage };
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 px-3 py-2 rounded-lg bg-muted/50 text-xs"
                >
                  <span className="text-muted-foreground tabular-nums shrink-0 w-14">
                    {relativeTime(log.created_at)}
                  </span>
                  <StatusBadge status={badge.status} label={badge.label} />
                  <span className="text-foreground/80 flex-1">
                    {log.action}
                  </span>
                </div>
              );
            })
          )}
          {hasMore && (
            <button
              onClick={() => setShowAll(true)}
              className="text-xs text-primary hover:text-primary-hover transition-colors cursor-pointer"
            >
              Show more ({logs.length - 10} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
