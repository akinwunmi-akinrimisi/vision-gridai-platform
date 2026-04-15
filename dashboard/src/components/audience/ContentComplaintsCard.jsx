import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES = {
  high: 'bg-danger-bg/30 border-danger-border',
  medium: 'bg-warning-bg/30 border-warning-border',
  low: 'bg-muted border-border',
};

const SEVERITY_BADGE = {
  high: 'bg-danger-bg text-danger border-danger-border',
  medium: 'bg-warning-bg text-warning border-warning-border',
  low: 'bg-muted text-muted-foreground border-border',
};

function ComplaintRow({ item, index }) {
  const [expanded, setExpanded] = useState(false);

  const complaint = item?.complaint || item?.text || 'Complaint';
  const occurrence = Number(item?.occurrence_count) || 0;
  const severity = (item?.severity_hint || 'low').toLowerCase();
  const examples = Array.isArray(item?.example_comments) ? item.example_comments.slice(0, 2) : [];

  const containerStyle = SEVERITY_STYLES[severity] || SEVERITY_STYLES.low;
  const badgeStyle = SEVERITY_BADGE[severity] || SEVERITY_BADGE.low;

  return (
    <div
      className={cn(
        'border rounded-lg p-3 transition-colors',
        containerStyle,
        `stagger-${Math.min(index + 1, 8)} animate-fade-in`,
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-medium text-foreground leading-snug">
          {complaint}
        </p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-semibold border uppercase tracking-wider',
              badgeStyle,
            )}
          >
            {severity}
          </span>
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-semibold border bg-card text-foreground border-border tabular-nums"
            title={`${occurrence} mention${occurrence === 1 ? '' : 's'}`}
          >
            {occurrence}x
          </span>
        </div>
      </div>

      {examples.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary-hover cursor-pointer"
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          {expanded ? 'Hide' : 'Show'} {examples.length} example{examples.length === 1 ? '' : 's'}
        </button>
      )}

      {expanded && examples.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {examples.map((ex, i) => {
            const text = typeof ex === 'string' ? ex : ex?.comment_text || ex?.text || JSON.stringify(ex);
            return (
              <li
                key={i}
                className="flex items-start gap-2 p-2 rounded-md bg-card border border-border text-[11px] text-muted-foreground leading-relaxed"
              >
                <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5 text-danger" />
                <span className="line-clamp-3">"{text}"</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ContentComplaintsCard({ complaints }) {
  const list = Array.isArray(complaints) ? complaints.slice(0, 3) : [];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <AlertTriangle className="w-4 h-4 text-danger" />
        <h3 className="text-sm font-semibold">Content Complaints</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
          Top {list.length}
        </span>
      </div>

      {list.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-xs text-muted-foreground text-center">
            No content complaints detected. Your audience is happy.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {list.map((c, i) => (
            <ComplaintRow key={i} item={c} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
