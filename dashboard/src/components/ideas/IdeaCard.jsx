import { useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  X,
  RotateCcw,
  Flame,
  TrendingUp,
  Target,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Score helpers                                                      */
/* ------------------------------------------------------------------ */

function scoreStyle(score) {
  if (score == null) return 'bg-muted text-muted-foreground border-border';
  if (score >= 80) return 'bg-success-bg text-success border-success-border';
  if (score >= 60) return 'bg-warning-bg text-warning border-warning-border';
  return 'bg-muted text-muted-foreground border-border';
}

function scoreBarColor(score) {
  if (score == null) return 'bg-muted-foreground/40';
  if (score >= 80) return 'bg-success';
  if (score >= 60) return 'bg-warning';
  return 'bg-muted-foreground/60';
}

function statusPillStyle(status) {
  switch (status) {
    case 'saved':
      return 'bg-info-bg text-info border-info-border';
    case 'dismissed':
      return 'bg-muted text-muted-foreground border-border';
    case 'used':
      return 'bg-success-bg text-success border-success-border';
    default:
      return 'bg-warning-bg text-warning border-warning-border';
  }
}

/* ------------------------------------------------------------------ */
/*  Mini score bar                                                     */
/* ------------------------------------------------------------------ */

function ScoreBar({ label, score, Icon }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-10 flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            scoreBarColor(score)
          )}
          style={{ width: `${Math.max(0, Math.min(100, score ?? 0))}%` }}
        />
      </div>
      <span className="text-[11px] font-mono tabular-nums text-muted-foreground w-6 text-right">
        {score ?? '\u2014'}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  IdeaCard                                                           */
/* ------------------------------------------------------------------ */

export default function IdeaCard({
  idea,
  index = 0,
  isBusy = false,
  onSave,
  onDismiss,
  onUse,
  onMarkPending,
}) {
  const [expanded, setExpanded] = useState(false);

  const combined = idea.combined_score;
  const isPending = idea.status === 'pending' || !idea.status;

  const sourceSignals = idea.source_signals && typeof idea.source_signals === 'object'
    ? idea.source_signals
    : {};
  const competitorTitles = Array.isArray(sourceSignals.competitor_titles)
    ? sourceSignals.competitor_titles.slice(0, 2)
    : [];
  const trendingKeywords = Array.isArray(sourceSignals.trending_keywords)
    ? sourceSignals.trending_keywords.slice(0, 3)
    : [];
  const relatedKeywords = Array.isArray(idea.related_keywords)
    ? idea.related_keywords.slice(0, 3)
    : [];

  const rationaleLong = (idea.rationale || '').length > 160;
  const rationaleShown = expanded || !rationaleLong
    ? idea.rationale
    : `${(idea.rationale || '').slice(0, 160).trimEnd()}\u2026`;

  return (
    <div
      className={cn(
        'group relative bg-card border border-border rounded-xl p-4 flex flex-col gap-3',
        'hover:border-border-hover transition-all duration-200',
        `stagger-${Math.min((index % 8) + 1, 8)} animate-slide-up`,
      )}
    >
      {/* Header row: position + combined score + status */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-md text-[11px] font-bold bg-muted border border-border text-muted-foreground tabular-nums">
          #{idea.position_in_batch ?? '\u2014'}
        </span>
        <span
          title={`Viral ${idea.viral_potential_score ?? '\u2014'} \u00B7 SEO ${idea.seo_opportunity_score ?? '\u2014'} \u00B7 RPM ${idea.rpm_fit_score ?? '\u2014'}`}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm font-bold border tabular-nums',
            scoreStyle(combined)
          )}
        >
          {combined >= 80 && <Flame className="w-3.5 h-3.5" />}
          {combined ?? '\u2014'}
        </span>
        <div className="flex-1" />
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium border capitalize',
            statusPillStyle(idea.status)
          )}
        >
          {idea.status || 'pending'}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-semibold leading-snug text-foreground line-clamp-3">
        {idea.idea_title}
      </h3>

      {/* Angle */}
      {idea.idea_angle && (
        <p className="text-sm text-muted-foreground italic leading-relaxed line-clamp-3">
          {idea.idea_angle}
        </p>
      )}

      {/* Score breakdown */}
      <div className="flex flex-col gap-1.5 pt-1">
        <ScoreBar label="Viral" Icon={Flame} score={idea.viral_potential_score} />
        <ScoreBar label="SEO" Icon={TrendingUp} score={idea.seo_opportunity_score} />
        <ScoreBar label="RPM" Icon={DollarSign} score={idea.rpm_fit_score} />
      </div>

      {/* Rationale */}
      {idea.rationale && (
        <div className="pt-1">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {rationaleShown}
          </p>
          {rationaleLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent/80 cursor-pointer"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  More
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Source signals */}
      {(competitorTitles.length > 0 || trendingKeywords.length > 0) && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {competitorTitles.map((t, i) => (
            <span
              key={`c-${i}`}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-info-bg text-info border border-info-border truncate max-w-[180px]"
              title={t}
            >
              <Target className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{t}</span>
            </span>
          ))}
          {trendingKeywords.map((k, i) => (
            <span
              key={`k-${i}`}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-warning-bg text-warning border border-warning-border"
              title={k}
            >
              <TrendingUp className="w-2.5 h-2.5 flex-shrink-0" />
              {k}
            </span>
          ))}
        </div>
      )}

      {/* Related keywords */}
      {relatedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {relatedKeywords.map((k, i) => (
            <span
              key={`rk-${i}`}
              className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] bg-muted text-muted-foreground border border-border"
            >
              {k}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto pt-2 flex items-center gap-2 border-t border-border">
        {isPending ? (
          <>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onUse?.(idea)}
              disabled={isBusy}
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Use as Topic
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSave?.(idea)}
              disabled={isBusy}
              title="Save for later"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss?.(idea)}
              disabled={isBusy}
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <>
            {idea.status === 'used' && idea.used_as_topic_id ? (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onUse?.(idea, { reopen: true })}
              >
                Open Topic
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="flex-1"
                onClick={() => onMarkPending?.(idea)}
                disabled={isBusy}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Mark as Pending
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
