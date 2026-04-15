import { Flame, TrendingUp, TrendingDown, Minus, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Classification color mapping                                       */
/* ------------------------------------------------------------------ */

const CLASS_STYLES = {
  'blue-ocean': 'bg-info-bg text-info border-info-border',
  'competitive': 'bg-warning-bg text-warning border-warning-border',
  'red-ocean': 'bg-danger-bg text-danger border-danger-border',
  'dead-sea': 'bg-muted text-muted-foreground border-border',
};

const MOMENTUM_ICONS = {
  accelerating: TrendingUp,
  stable: Minus,
  decelerating: TrendingDown,
};

const MOMENTUM_STYLES = {
  accelerating: 'text-success',
  stable: 'text-muted-foreground',
  decelerating: 'text-danger',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function outlierPillStyle(score) {
  if (score == null) return 'bg-muted text-muted-foreground border-border';
  if (score >= 70) return 'bg-warning-bg text-warning border-warning-border';
  if (score >= 50) return 'bg-info-bg text-info border-info-border';
  return 'bg-muted text-muted-foreground border-border';
}

function combinedBorderStyle(score) {
  if (score == null) return 'bg-secondary text-secondary-foreground border-border';
  if (score >= 75) return 'bg-success-bg text-success border-success-border';
  if (score >= 60) return 'bg-info-bg text-info border-info-border';
  if (score >= 40) return 'bg-warning-bg text-warning border-warning-border';
  return 'bg-muted text-muted-foreground border-border';
}

export function computeCombinedScore(topic) {
  const outlier = typeof topic?.outlier_score === 'number' ? topic.outlier_score : null;
  const seo = typeof topic?.seo_score === 'number' ? topic.seo_score : null;
  if (outlier == null && seo == null) return null;
  const o = outlier ?? 50;
  const s = seo ?? 50;
  return Math.round(o * 0.6 + s * 0.4);
}

/* ------------------------------------------------------------------ */
/*  OutlierBadge                                                       */
/* ------------------------------------------------------------------ */

export function OutlierBadge({ topic, size = 'sm' }) {
  const score = topic?.outlier_score;
  const dataAvailable = topic?.outlier_data_available;
  const scored = topic?.outlier_scored_at != null;

  // Loading state: default score of 50 + no scored_at + dataAvailable not false
  if (!scored && (score == null || score === 50) && dataAvailable !== false) {
    return (
      <span
        title="Outlier score is being computed"
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border',
          'bg-muted text-muted-foreground border-border animate-pulse'
        )}
      >
        <Sparkles className="w-2.5 h-2.5" />
        Scoring...
      </span>
    );
  }

  // No data available
  if (dataAvailable === false) {
    return (
      <span
        title="No outlier data available for this topic"
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border bg-muted text-muted-foreground border-border"
      >
        No data
      </span>
    );
  }

  const MomentumIcon = MOMENTUM_ICONS[topic?.algorithm_momentum] || null;
  const tooltipBits = [];
  if (topic?.algorithm_momentum) tooltipBits.push(`Momentum: ${topic.algorithm_momentum}`);
  if (topic?.outlier_reasoning) tooltipBits.push(topic.outlier_reasoning);
  if (topic?.outlier_ratio != null) tooltipBits.push(`Ratio: ${topic.outlier_ratio.toFixed(2)}x`);
  const tooltip = tooltipBits.join(' \u2022 ') || 'Outlier score';

  return (
    <span
      title={tooltip}
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border tabular-nums cursor-help',
        outlierPillStyle(score)
      )}
    >
      {score >= 70 ? (
        <Flame className="w-2.5 h-2.5" />
      ) : (
        MomentumIcon && <MomentumIcon className={cn('w-2.5 h-2.5', MOMENTUM_STYLES[topic?.algorithm_momentum])} />
      )}
      <span>Outlier {score ?? '\u2014'}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  SEOBadge                                                           */
/* ------------------------------------------------------------------ */

export function SEOBadge({ topic }) {
  const score = topic?.seo_score;
  const classification = topic?.seo_classification;
  const scored = topic?.seo_scored_at != null;

  if (!scored && (score == null || score === 50) && !classification) {
    return (
      <span
        title="SEO score is being computed"
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border',
          'bg-muted text-muted-foreground border-border animate-pulse'
        )}
      >
        <Sparkles className="w-2.5 h-2.5" />
        Scoring...
      </span>
    );
  }

  const tooltipBits = [];
  if (topic?.primary_keyword) tooltipBits.push(`Keyword: "${topic.primary_keyword}"`);
  if (topic?.seo_opportunity_summary) tooltipBits.push(topic.seo_opportunity_summary);
  if (topic?.competition_level) tooltipBits.push(`Competition: ${topic.competition_level}`);
  const tooltip = tooltipBits.join(' \u2022 ') || 'SEO score';

  return (
    <span
      title={tooltip}
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium border tabular-nums cursor-help',
        classification
          ? CLASS_STYLES[classification] || 'bg-muted text-muted-foreground border-border'
          : 'bg-muted text-muted-foreground border-border'
      )}
    >
      SEO {score ?? '\u2014'}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  CombinedScoreBadge                                                 */
/* ------------------------------------------------------------------ */

export function CombinedScoreBadge({ topic }) {
  const score = computeCombinedScore(topic);
  if (score == null) return null;

  return (
    <span
      title={`Combined intelligence score (60% outlier + 40% SEO)`}
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-bold border tabular-nums cursor-help',
        combinedBorderStyle(score)
      )}
    >
      {score}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  RecommendedBadge                                                   */
/* ------------------------------------------------------------------ */

export function RecommendedBadge({ className }) {
  return (
    <span
      title="Top 5 by combined intelligence score"
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-bold',
        'bg-gradient-to-r from-primary/20 to-accent/20 text-accent border border-accent/40',
        'shadow-[0_0_10px_rgba(251,191,36,0.15)]',
        className
      )}
    >
      <Star className="w-2.5 h-2.5 fill-current" />
      Recommended
    </span>
  );
}
