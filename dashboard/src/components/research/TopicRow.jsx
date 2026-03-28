import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const SOURCE_BADGES = {
  reddit: 'bg-[#FF4500]/10 text-[#FF4500] border-[#FF4500]/20',
  youtube: 'bg-danger-bg text-danger border-danger-border',
  tiktok: 'bg-foreground/10 text-foreground border-foreground/20',
  trends: 'bg-info-bg text-info border-info-border',
  quora: 'bg-warning-bg text-warning border-warning-border',
};

/**
 * Single result row in the source results table.
 * Shows rank, text (expandable), source badge, engagement score, category, and date.
 */
export default function TopicRow({ result, rank }) {
  const [expanded, setExpanded] = useState(false);

  const rawText = result.raw_text || '';
  const isLong = rawText.length > 150;
  const displayText = expanded ? rawText : rawText.slice(0, 150);

  const score = result.engagement_score || 0;
  const sourceStyle = SOURCE_BADGES[result.source] || 'bg-muted text-muted-foreground border-border';
  const categoryLabel = result.research_categories?.label || result.category_label || '--';

  // Relative date display
  const postedDate = result.posted_at ? formatRelativeDate(result.posted_at) : '--';

  return (
    <TableRow className="border-border hover:bg-card-hover group">
      {/* Rank */}
      <TableCell className="text-xs tabular-nums font-mono text-muted-foreground align-top">
        {rank}
      </TableCell>

      {/* Content text (expandable) */}
      <TableCell className="align-top">
        <div className="max-w-md">
          <p className="text-xs text-foreground leading-relaxed">
            {displayText}
            {isLong && !expanded && '...'}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:text-primary-hover mt-1 transition-colors"
            >
              {expanded ? (
                <>
                  Show less <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  Show more <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          )}
        </div>
      </TableCell>

      {/* Source badge */}
      <TableCell className="align-top">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
            sourceStyle,
          )}
        >
          {result.source}
          {result.source_url && (
            <a
              href={result.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </span>
      </TableCell>

      {/* Engagement score */}
      <TableCell className="text-right align-top">
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums border',
            score >= 80
              ? 'bg-success-bg text-success border-success-border'
              : score >= 50
                ? 'bg-warning-bg text-warning border-warning-border'
                : 'bg-muted text-muted-foreground border-border',
          )}
        >
          {score}
        </span>
      </TableCell>

      {/* Category */}
      <TableCell className="align-top">
        <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
          {categoryLabel}
        </Badge>
      </TableCell>

      {/* Posted date */}
      <TableCell className="text-right text-xs text-muted-foreground tabular-nums align-top">
        {postedDate}
      </TableCell>
    </TableRow>
  );
}

/**
 * Format a date into a relative string (e.g., "2d ago", "3mo ago").
 */
function formatRelativeDate(dateStr) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  } catch {
    return '--';
  }
}
