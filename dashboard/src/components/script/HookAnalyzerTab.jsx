import {
  Zap,
  Loader2,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import HookScoreCard from './HookScoreCard';

function avgScoreClass(score) {
  if (score == null) return 'bg-muted text-muted-foreground border-border';
  if (score >= 80) return 'bg-success-bg text-success border-success-border';
  if (score >= 60) return 'bg-warning-bg text-warning border-warning-border';
  return 'bg-danger-bg text-danger border-danger-border';
}

function formatRelative(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Empty state — no hook analysis yet.
 */
function HookEmpty({ onAnalyze, isAnalyzing }) {
  return (
    <div
      className="bg-card border border-border rounded-xl p-6 text-center"
      data-testid="hook-analyzer-empty"
    >
      <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-60" />
      <h3 className="text-sm font-semibold mb-1">Hook Analyzer</h3>
      <p className="text-xs text-muted-foreground mb-3 max-w-md mx-auto">
        Claude scores every chapter opening on 5 dimensions (curiosity gap,
        emotional trigger, specificity, pattern interrupt, open loop) and
        flags weak hooks with rewrite suggestions.
      </p>
      <Button
        size="sm"
        onClick={onAnalyze}
        disabled={isAnalyzing}
        data-testid="analyze-hooks-btn"
      >
        {isAnalyzing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Zap className="w-3.5 h-3.5" />
        )}
        Analyze Hooks
      </Button>
    </div>
  );
}

/**
 * HookAnalyzerTab — tab body for Script Review.
 *
 * Reads topic.hook_scores (JSONB). Shape:
 *   {
 *     chapters: [
 *       { chapter_name, chapter_index, opening_text, breakdown: {...},
 *         total_score, weak_flag, rewrite_suggestion }
 *     ],
 *     avg_score, weakest_chapter_index, overall_summary
 *   }
 *
 * For resilience, avg_score also reads from topic.avg_hook_score column,
 * weak_hook_count reads from topic.weak_hook_count column.
 */
export default function HookAnalyzerTab({ topic, onAnalyze, isAnalyzing }) {
  const hookScores = topic?.hook_scores;

  // Empty state when no hook analysis data at all
  const hasData =
    hookScores &&
    typeof hookScores === 'object' &&
    Array.isArray(hookScores.chapters) &&
    hookScores.chapters.length > 0;

  if (!hasData) {
    return <HookEmpty onAnalyze={onAnalyze} isAnalyzing={isAnalyzing} />;
  }

  const chapters = hookScores.chapters;
  const avgScore =
    typeof hookScores.avg_score === 'number'
      ? hookScores.avg_score
      : typeof topic?.avg_hook_score === 'number'
        ? topic.avg_hook_score
        : null;
  const weakCount =
    typeof topic?.weak_hook_count === 'number'
      ? topic.weak_hook_count
      : chapters.filter((c) => c?.weak_flag === true).length;
  const weakestIdx =
    typeof hookScores.weakest_chapter_index === 'number'
      ? hookScores.weakest_chapter_index
      : null;

  return (
    <div className="space-y-4" data-testid="hook-analyzer-tab">
      {/* Summary header */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-4 h-4 text-accent flex-shrink-0" />
            <h3 className="text-sm font-semibold">Chapter Hooks</h3>
            {avgScore != null && (
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-bold border tabular-nums',
                  avgScoreClass(avgScore),
                )}
              >
                Avg {avgScore}/100
              </span>
            )}
            {weakCount === 0 ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border bg-success-bg text-success border-success-border">
                <CheckCircle2 className="w-2.5 h-2.5" />
                All hooks strong
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border bg-warning-bg text-warning border-warning-border">
                <AlertTriangle className="w-2.5 h-2.5" />
                {weakCount} weak hook{weakCount === 1 ? '' : 's'} detected
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {topic?.hook_analyzed_at && (
              <span className="text-[11px] text-muted-foreground">
                Analyzed {formatRelative(topic.hook_analyzed_at)}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="text-[11px] h-7 px-2"
              data-testid="re-analyze-hooks-btn"
            >
              {isAnalyzing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Re-analyze
            </Button>
          </div>
        </div>

        {/* Overall summary */}
        {hookScores.overall_summary && (
          <div className="mt-3 px-3 py-2.5 rounded-lg bg-info-bg/40 border border-info-border/60 flex items-start gap-2">
            <Info className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
            <p className="text-xs text-info leading-relaxed">
              {hookScores.overall_summary}
            </p>
          </div>
        )}
      </div>

      {/* Per-chapter cards */}
      <div className="space-y-3">
        {chapters.map((chapter, i) => {
          const idx =
            typeof chapter?.chapter_index === 'number' ? chapter.chapter_index : i;
          return (
            <HookScoreCard
              key={`${idx}-${chapter?.chapter_name || 'chapter'}`}
              chapter={chapter}
              isWeakest={weakestIdx != null && idx === weakestIdx}
              staggerIndex={i}
            />
          );
        })}
      </div>
    </div>
  );
}
