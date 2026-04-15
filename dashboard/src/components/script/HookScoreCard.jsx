import { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import HookDimensionBars from './HookDimensionBars';

function scorePillClass(score) {
  if (score == null) return 'bg-muted text-muted-foreground border-border';
  if (score >= 80) return 'bg-success-bg text-success border-success-border';
  if (score >= 60) return 'bg-warning-bg text-warning border-warning-border';
  return 'bg-danger-bg text-danger border-danger-border';
}

/**
 * HookScoreCard — one card per chapter.
 *
 * chapter shape:
 *   {
 *     chapter_name, chapter_index, opening_text,
 *     breakdown: { curiosity_gap, emotional_trigger, specificity,
 *                  pattern_interrupt, open_loop },
 *     total_score, weak_flag, rewrite_suggestion
 *   }
 *
 * If `isWeakest` is true, the card gets a danger ring.
 */
export default function HookScoreCard({ chapter, isWeakest, staggerIndex = 0 }) {
  const [breakdownOpen, setBreakdownOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!chapter || typeof chapter !== 'object') return null;

  const {
    chapter_name,
    chapter_index,
    opening_text,
    breakdown,
    total_score,
    weak_flag,
    rewrite_suggestion,
  } = chapter;

  const copyRewrite = async () => {
    if (!rewrite_suggestion) return;
    try {
      await navigator.clipboard.writeText(rewrite_suggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable -- noop */
    }
  };

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-xl overflow-hidden',
        isWeakest && 'ring-2 ring-danger/40',
        `stagger-${Math.min(staggerIndex + 1, 8)} animate-fade-in`,
      )}
      data-testid={`hook-score-card-${chapter_index ?? staggerIndex}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {chapter_index != null && (
            <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0">
              {chapter_index + 1}
            </span>
          )}
          <h3 className="text-sm font-semibold truncate">
            {chapter_name || `Chapter ${(chapter_index ?? 0) + 1}`}
          </h3>
          {isWeakest && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border bg-danger-bg text-danger border-danger-border flex-shrink-0">
              <AlertTriangle className="w-2.5 h-2.5" />
              Weakest
            </span>
          )}
        </div>
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-bold border tabular-nums flex-shrink-0',
            scorePillClass(total_score),
          )}
        >
          {total_score ?? '\u2014'}/100
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Opening excerpt */}
        {opening_text && (
          <blockquote className="px-3 py-2.5 rounded-lg bg-muted border-l-4 border-border">
            <p className="text-sm italic text-foreground/90 leading-relaxed">
              {'\u201c'}
              {opening_text}
              {'\u201d'}
            </p>
          </blockquote>
        )}

        {/* 5-dimension breakdown */}
        {breakdown && (
          <div>
            <button
              type="button"
              onClick={() => setBreakdownOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary-hover font-medium cursor-pointer mb-2"
            >
              <ChevronDown
                className={cn(
                  'w-3 h-3 transition-transform',
                  breakdownOpen ? 'rotate-180' : '',
                )}
              />
              {breakdownOpen ? 'Hide' : 'Show'} 5-dimension breakdown
            </button>
            {breakdownOpen && (
              <div className="animate-fade-in">
                <HookDimensionBars breakdown={breakdown} />
              </div>
            )}
          </div>
        )}

        {/* Weak flag + rewrite suggestion */}
        {weak_flag && rewrite_suggestion && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-warning">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Weak hook</span>
            </div>

            <div className="bg-warning-bg/20 border-l-4 border-warning rounded-md px-3 py-2.5">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-[10px] uppercase tracking-wider text-warning font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Rewrite suggestion
                </span>
                <button
                  type="button"
                  onClick={copyRewrite}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary-hover font-medium cursor-pointer flex-shrink-0"
                  data-testid="copy-rewrite-btn"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {rewrite_suggestion}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
