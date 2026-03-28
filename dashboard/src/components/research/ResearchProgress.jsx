import { Loader2, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const SOURCES = [
  { key: 'reddit', label: 'Reddit', color: 'bg-[#FF4500]/10 text-[#FF4500] border-[#FF4500]/20' },
  { key: 'youtube', label: 'YouTube', color: 'bg-danger-bg text-danger border-danger-border' },
  { key: 'tiktok', label: 'TikTok', color: 'bg-foreground/10 text-foreground border-foreground/20' },
  { key: 'trends', label: 'Trends', color: 'bg-info-bg text-info border-info-border' },
  { key: 'quora', label: 'Quora', color: 'bg-warning-bg text-warning border-warning-border' },
];

/**
 * Shows live progress when a research run is in progress.
 * Displays source completion pills, a progress bar, and status text.
 */
export default function ResearchProgress({ run }) {
  if (!run) return null;

  const completedSources = run.sources_completed || [];
  const totalSources = SOURCES.length;
  const completed = completedSources.length;
  const pct = Math.round((completed / totalSources) * 100);

  const isCategorizingPhase = run.status === 'categorizing';
  const isScraping = run.status === 'scraping';
  const isComplete = run.status === 'complete';

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {isComplete ? (
          <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
        ) : (
          <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
        )}
        <div>
          <h3 className="text-sm font-semibold">
            {isComplete
              ? 'Research Complete'
              : isCategorizingPhase
                ? 'Categorizing results with AI...'
                : 'Scraping sources...'}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isComplete
              ? `All ${totalSources} sources processed successfully`
              : `${completed} of ${totalSources} sources collected`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out',
            isCategorizingPhase
              ? 'bg-gradient-to-r from-warning to-accent animate-pulse'
              : 'bg-gradient-to-r from-primary to-accent',
          )}
          style={{ width: isCategorizingPhase ? '100%' : `${pct}%` }}
        />
      </div>

      {/* Source pills */}
      <div className="flex flex-wrap gap-2">
        {SOURCES.map((src) => {
          const done = completedSources.includes(src.key);
          return (
            <span
              key={src.key}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
                done ? src.color : 'bg-muted/50 text-muted-foreground border-border',
              )}
            >
              {done ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : isScraping ? (
                <Clock className="w-3 h-3 opacity-50" />
              ) : (
                <CheckCircle2 className="w-3 h-3 opacity-30" />
              )}
              {src.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
