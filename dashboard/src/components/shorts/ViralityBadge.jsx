import { Flame, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Virality score indicator badge.
 * Score 8-10: danger bg with fire icon
 * Score 6-7: warning bg with zap icon
 * Score 1-5: muted bg, plain text
 *
 * @param {{ score: number, className?: string }} props
 */
export default function ViralityBadge({ score, className }) {
  const s = score || 0;

  if (s >= 8) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold tabular-nums',
        'bg-danger-bg text-danger',
        className
      )}>
        <Flame className="w-3 h-3" />
        {s}/10
      </span>
    );
  }

  if (s >= 6) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold tabular-nums',
        'bg-warning-bg text-warning',
        className
      )}>
        <Zap className="w-3 h-3" />
        {s}/10
      </span>
    );
  }

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold tabular-nums',
      'bg-muted text-muted-foreground',
      className
    )}>
      {s}/10
    </span>
  );
}
