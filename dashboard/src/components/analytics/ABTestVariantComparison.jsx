import { Trophy, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Renders a horizontal flex table of variants for one A/B test, with a row
 * per variant showing label, title or thumbnail preview, predicted CTR,
 * actual impressions / views / CTR, hours live, winner flag, and a
 * confidence progress bar (if set).
 */
export default function ABTestVariantComparison({ test }) {
  const variants = Array.isArray(test?.variants) ? test.variants : [];
  if (variants.length === 0) {
    return (
      <div className="px-3 py-3 text-xs text-muted-foreground italic">
        No variants configured for this test yet.
      </div>
    );
  }

  const testType = test?.test_type || 'title';
  const showTitles = testType === 'title' || testType === 'combined';
  const showThumbs = testType === 'thumbnail' || testType === 'combined';
  const confidenceTarget = (test?.confidence_threshold || 0.95) * 100;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-3 px-3 py-2 border-b border-border bg-card-hover/40 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        <span className="w-8">Var</span>
        <span>{showThumbs ? (showTitles ? 'Title + Thumb' : 'Thumbnail') : 'Title'}</span>
        <span className="tabular-nums text-right w-16">Pred.</span>
        <span className="tabular-nums text-right w-16">Impr.</span>
        <span className="tabular-nums text-right w-16">Views</span>
        <span className="tabular-nums text-right w-14">CTR</span>
        <span className="tabular-nums text-right w-14">Hrs</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {variants.map((v) => {
          const isWinner = v.is_winner || v.id === test?.winning_variant_id;
          const isCurrent = v.id === test?.current_variant_id;
          const actualCTR =
            v.total_ctr != null
              ? (v.total_ctr * 100).toFixed(2)
              : v.total_impressions > 0
                ? ((v.total_views / v.total_impressions) * 100).toFixed(2)
                : null;
          const confidencePct =
            typeof v.confidence_score === 'number'
              ? Math.round(v.confidence_score * 100)
              : null;

          return (
            <div
              key={v.id}
              className={cn(
                'grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-3 px-3 py-2 items-center text-xs transition-colors',
                isWinner
                  ? 'bg-success-bg/30'
                  : isCurrent
                    ? 'bg-info-bg/20'
                    : 'hover:bg-card-hover/60',
              )}
            >
              {/* Variant label */}
              <span className="w-8 flex items-center gap-1">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-muted font-bold text-[11px] tabular-nums">
                  {v.variant_label}
                </span>
                {isWinner && (
                  <Trophy
                    className="w-3 h-3 text-success"
                    title="Winner"
                  />
                )}
                {isCurrent && !isWinner && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-info animate-pulse"
                    title="Currently live"
                  />
                )}
              </span>

              {/* Title + thumbnail */}
              <div className="min-w-0 flex items-center gap-2">
                {showThumbs && (
                  <div className="w-12 h-7 rounded bg-muted flex-shrink-0 overflow-hidden border border-border">
                    {v.thumbnail_url ? (
                      <img
                        src={v.thumbnail_url}
                        alt={`Variant ${v.variant_label}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-3 h-3 opacity-40" />
                      </div>
                    )}
                  </div>
                )}
                <div className="min-w-0">
                  {showTitles && (
                    <div className="text-xs font-medium truncate text-foreground">
                      {v.title || <span className="italic text-muted-foreground">No title</span>}
                    </div>
                  )}
                  {confidencePct != null && (
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <div className="h-1 w-20 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            confidencePct >= confidenceTarget
                              ? 'bg-success'
                              : confidencePct >= 50
                                ? 'bg-warning'
                                : 'bg-muted-foreground/60',
                          )}
                          style={{ width: `${Math.min(100, confidencePct)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                        {confidencePct}% / {Math.round(confidenceTarget)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <span className="w-16 text-right font-mono tabular-nums text-muted-foreground">
                {v.predicted_ctr_score ?? '\u2014'}
              </span>
              <span className="w-16 text-right font-mono tabular-nums">
                {(v.total_impressions ?? 0).toLocaleString()}
              </span>
              <span className="w-16 text-right font-mono tabular-nums">
                {(v.total_views ?? 0).toLocaleString()}
              </span>
              <span
                className={cn(
                  'w-14 text-right font-mono tabular-nums',
                  isWinner ? 'text-success font-semibold' : 'text-foreground',
                )}
              >
                {actualCTR != null ? `${actualCTR}%` : '\u2014'}
              </span>
              <span className="w-14 text-right font-mono tabular-nums text-muted-foreground">
                {v.total_hours_live ?? 0}h
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
