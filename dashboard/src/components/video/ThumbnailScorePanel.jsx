import { useState } from 'react';
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import CTRFactorBreakdown from './CTRFactorBreakdown';

const THUMBNAIL_FACTOR_MAXES = {
  face_emotion: 20,
  text_readability: 20,
  color_contrast: 15,
  visual_complexity: 15,
  curiosity_hook: 10,
  niche_relevance: 15,
  brand_consistency: 5,
};

const THUMBNAIL_FACTOR_LABELS = {
  face_emotion: 'Face Emotion',
  text_readability: 'Text Readability',
  color_contrast: 'Color Contrast',
  visual_complexity: 'Visual Complexity',
  curiosity_hook: 'Curiosity Hook',
  niche_relevance: 'Niche Relevance',
  brand_consistency: 'Brand Consistency',
};

const MAX_REGEN_ATTEMPTS = 3;

function scoreBadgeClass(score) {
  if (score == null) return 'bg-muted text-muted-foreground border-border';
  if (score >= 75) return 'bg-success-bg text-success border-success-border';
  if (score >= 60) return 'bg-warning-bg text-warning border-warning-border';
  return 'bg-danger-bg text-danger border-danger-border';
}

function decisionBadge(decision) {
  if (!decision) return null;
  const styles = {
    accept: 'bg-success-bg text-success border-success-border',
    review: 'bg-warning-bg text-warning border-warning-border',
    regenerate: 'bg-danger-bg text-danger border-danger-border',
  };
  const icons = {
    accept: CheckCircle2,
    review: AlertTriangle,
    regenerate: RefreshCw,
  };
  const Icon = icons[decision];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border capitalize',
        styles[decision] || 'bg-muted text-muted-foreground border-border',
      )}
    >
      {Icon ? <Icon className="w-2.5 h-2.5" /> : null}
      {decision}
    </span>
  );
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

export default function ThumbnailScorePanel({
  topic,
  onScore,
  onRegenerate,
  isScoring,
}) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const score = topic?.thumbnail_ctr_score;
  const breakdown =
    topic?.thumbnail_score_breakdown && typeof topic.thumbnail_score_breakdown === 'object'
      ? topic.thumbnail_score_breakdown
      : null;
  const suggestions = Array.isArray(topic?.thumbnail_improvement_suggestions)
    ? topic.thumbnail_improvement_suggestions
    : [];
  const history = Array.isArray(topic?.thumbnail_regen_history)
    ? topic.thumbnail_regen_history
    : [];
  const attempts = topic?.thumbnail_regen_attempts ?? 0;
  const regenDisabled = isScoring || attempts >= MAX_REGEN_ATTEMPTS;

  const hasScore = score != null;

  /* -- Empty state -- */
  if (!hasScore) {
    return (
      <div
        className="bg-card border border-border rounded-xl p-5 text-center"
        data-testid="thumbnail-score-empty"
      >
        <Sparkles className="w-7 h-7 text-muted-foreground mx-auto mb-2 opacity-60" />
        <h3 className="text-sm font-semibold mb-1">Thumbnail CTR Analysis</h3>
        <p className="text-xs text-muted-foreground mb-3 max-w-md mx-auto">
          Claude Vision scores the current thumbnail across 7 factors (face
          emotion, readability, contrast, etc.) and returns a 0-100 predicted
          CTR with improvement suggestions.
        </p>
        <Button
          size="sm"
          onClick={() =>
            onScore({ thumbnail_url: topic?.thumbnail_url || undefined })
          }
          disabled={isScoring || !topic?.thumbnail_url}
          data-testid="score-thumbnail-btn"
        >
          {isScoring ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          Score thumbnail
        </Button>
        {!topic?.thumbnail_url && (
          <p className="text-[11px] text-muted-foreground mt-2 italic">
            Generate a thumbnail first.
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden"
      data-testid="thumbnail-score-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            Thumbnail CTR Analysis
          </h3>
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-bold border tabular-nums',
              scoreBadgeClass(score),
            )}
          >
            {score}/100
          </span>
          {decisionBadge(topic?.thumbnail_decision)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {topic?.thumbnail_scored_at
              ? `Scored ${formatRelative(topic.thumbnail_scored_at)}`
              : ''}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Primary weakness */}
        {topic?.thumbnail_primary_weakness && (
          <div className="px-3 py-2.5 rounded-lg bg-danger-bg/40 border border-danger-border/60">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-sm italic text-danger leading-relaxed">
                {topic.thumbnail_primary_weakness}
              </p>
            </div>
          </div>
        )}

        {/* 7-factor breakdown */}
        {breakdown && (
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
              Score Breakdown
            </h4>
            <CTRFactorBreakdown
              breakdown={breakdown}
              maxes={THUMBNAIL_FACTOR_MAXES}
              labels={THUMBNAIL_FACTOR_LABELS}
            />
          </div>
        )}

        {/* Improvement suggestions */}
        {suggestions.length > 0 && (
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
              Improvement Suggestions
            </h4>
            <ul className="space-y-1.5">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  className="text-xs text-foreground/80 flex items-start gap-2"
                >
                  <span className="text-accent flex-shrink-0 mt-0.5">
                    {'\u2022'}
                  </span>
                  <span className="leading-relaxed">
                    {typeof s === 'string' ? s : s.suggestion || JSON.stringify(s)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            Attempt {attempts} of {MAX_REGEN_ATTEMPTS}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRegenerate({ thumbnail_url: topic?.thumbnail_url })}
            disabled={regenDisabled}
            data-testid="regen-thumbnail-btn"
            title={
              attempts >= MAX_REGEN_ATTEMPTS
                ? 'Regeneration limit reached (3)'
                : 'Regenerate thumbnail with current suggestions'
            }
          >
            {isScoring ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Regenerate thumbnail
          </Button>
        </div>

        {/* History toggle */}
        {history.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary-hover font-medium cursor-pointer"
            >
              <ChevronDown
                className={cn(
                  'w-3 h-3 transition-transform',
                  historyOpen ? 'rotate-180' : '',
                )}
              />
              {historyOpen ? 'Hide' : 'View'} regen history ({history.length})
            </button>

            {historyOpen && (
              <div className="mt-2 space-y-1.5 animate-fade-in">
                {history.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-muted border border-border text-[11px]"
                  >
                    <span className="font-semibold tabular-nums text-foreground">
                      #{h.attempt ?? i + 1}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      Score {h.score ?? '\u2014'}
                    </span>
                    {h.decision && decisionBadge(h.decision)}
                    <span className="text-muted-foreground ml-auto">
                      {formatRelative(h.scored_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
