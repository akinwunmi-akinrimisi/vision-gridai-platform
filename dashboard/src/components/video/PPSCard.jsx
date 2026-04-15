import { useState } from 'react';
import {
  Gauge,
  Loader2,
  RefreshCw,
  Info,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PPSFactorBreakdown from './PPSFactorBreakdown';

/* ------------------------------------------------------------------ */
/*  Light + classification                                              */
/* ------------------------------------------------------------------ */

// Unicode escapes for emoji to survive JSX encoding
const LIGHT_EMOJI = {
  green: '\ud83d\udfe2',
  yellow: '\ud83d\udfe1',
  red: '\ud83d\udd34',
};

const LIGHT_LABEL = {
  green: 'GREEN LIGHT',
  yellow: 'YELLOW LIGHT',
  red: 'RED LIGHT',
};

const LIGHT_CLASSIFICATION = {
  green: 'Strong publish candidate',
  yellow: 'Publishable with optimizations',
  red: 'High risk \u2014 rework recommended',
};

const LIGHT_STYLES = {
  green: {
    container: 'bg-success-bg/40 border-success/50',
    text: 'text-success',
    score: 'text-success',
  },
  yellow: {
    container: 'bg-warning-bg/40 border-warning/50',
    text: 'text-warning',
    score: 'text-warning',
  },
  red: {
    container: 'bg-danger-bg/40 border-danger/50',
    text: 'text-danger',
    score: 'text-danger',
  },
};

/**
 * Derive the traffic-light bucket from the numeric score when pps_light is
 * missing. Thresholds: 75+ green, 55-74 yellow, <55 red.
 */
function deriveLight(score) {
  if (typeof score !== 'number') return null;
  if (score >= 75) return 'green';
  if (score >= 55) return 'yellow';
  return 'red';
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
 * Missing-inputs banner — soft info about factors that defaulted.
 */
function MissingInputsBanner({ missing }) {
  if (!Array.isArray(missing) || missing.length === 0) return null;
  const pretty = missing.map((m) =>
    String(m)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  );
  return (
    <div className="px-3 py-2.5 rounded-lg bg-info-bg/40 border border-info-border/60 flex items-start gap-2">
      <Info className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
      <p className="text-xs text-info leading-relaxed">
        <span className="font-semibold">
          Score computed with {missing.length} default value
          {missing.length === 1 ? '' : 's'}:
        </span>{' '}
        {pretty.join(', ')}
        <span className="text-muted-foreground">
          {' \u2014 results will improve as those scores are populated.'}
        </span>
      </p>
    </div>
  );
}

/**
 * Empty state — no PPS calculated yet.
 */
function PPSEmpty({ onCalculate, isCalculating }) {
  return (
    <div
      className="bg-card border border-border rounded-xl p-6 text-center"
      data-testid="pps-card-empty"
    >
      <Gauge className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-60" />
      <h3 className="text-sm font-semibold mb-1">Predicted Performance Score</h3>
      <p className="text-xs text-muted-foreground mb-3 max-w-md mx-auto">
        Claude weighs 6 factors (outlier, SEO, script quality, niche health,
        thumbnail CTR, title CTR) into a 0-100 publish prediction with a
        green/yellow/red light and recommendation.
      </p>
      <Button
        size="sm"
        onClick={onCalculate}
        disabled={isCalculating}
        data-testid="calculate-pps-btn"
      >
        {isCalculating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Gauge className="w-3.5 h-3.5" />
        )}
        Calculate PPS
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function PPSCard({ topic, onCalculate, isCalculating }) {
  const [breakdownOpen, setBreakdownOpen] = useState(true);

  const score = topic?.predicted_performance_score;
  const hasScore = typeof score === 'number';

  if (!hasScore) {
    return <PPSEmpty onCalculate={onCalculate} isCalculating={isCalculating} />;
  }

  const light = topic?.pps_light || deriveLight(score) || 'yellow';
  const styles = LIGHT_STYLES[light] || LIGHT_STYLES.yellow;
  const breakdown =
    topic?.pps_breakdown && typeof topic.pps_breakdown === 'object'
      ? topic.pps_breakdown
      : null;
  const draggedBy = Array.isArray(breakdown?.dragged_by)
    ? breakdown.dragged_by
    : [];
  const missing = Array.isArray(topic?.pps_missing_inputs)
    ? topic.pps_missing_inputs
    : [];

  const prettyDrag = (key) =>
    String(key)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden"
      data-testid="pps-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-wrap">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Gauge className="w-4 h-4 text-accent" />
            Predicted Performance Score
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {topic?.pps_calculated_at
              ? `Calculated ${formatRelative(topic.pps_calculated_at)}`
              : 'Pre-publish performance estimate'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onCalculate}
          disabled={isCalculating}
          className="text-[11px] h-7 px-2"
          data-testid="recalculate-pps-btn"
        >
          {isCalculating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          Recalculate
        </Button>
      </div>

      {/* Hero row: light + score */}
      <div
        className={cn(
          'px-4 py-5 border-b border-border flex items-center gap-4 flex-wrap',
          styles.container,
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="text-4xl flex-shrink-0"
            aria-hidden="true"
            role="img"
          >
            {LIGHT_EMOJI[light] || LIGHT_EMOJI.yellow}
          </span>
          <div className="min-w-0">
            <div
              className={cn(
                'text-[11px] font-bold uppercase tracking-wider',
                styles.text,
              )}
            >
              {LIGHT_LABEL[light]}
            </div>
            <div className="text-sm font-semibold text-foreground mt-0.5">
              {LIGHT_CLASSIFICATION[light]}
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-baseline gap-1 tabular-nums">
          <span className={cn('text-5xl font-bold leading-none', styles.score)}>
            {score}
          </span>
          <span className="text-sm text-muted-foreground">/100</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Recommendation */}
        {topic?.pps_recommendation && (
          <blockquote className="px-3 py-2.5 rounded-lg bg-accent/10 border-l-4 border-accent">
            <p className="text-sm italic text-foreground/90 leading-relaxed">
              {topic.pps_recommendation}
            </p>
          </blockquote>
        )}

        {/* Missing inputs */}
        <MissingInputsBanner missing={missing} />

        {/* Dragged-by summary */}
        {draggedBy.length > 0 && (
          <div className="flex items-start gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <AlertTriangle className="w-3.5 h-3.5 text-warning" />
              <span className="font-semibold">Top drag factors:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {draggedBy.map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium border bg-warning-bg text-warning border-warning-border"
                >
                  {prettyDrag(key)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 6-factor breakdown */}
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
              {breakdownOpen ? 'Hide' : 'Show'} 6-factor breakdown
            </button>

            {breakdownOpen && (
              <div className="animate-fade-in">
                <PPSFactorBreakdown breakdown={breakdown} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
