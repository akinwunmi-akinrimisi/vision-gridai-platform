import { useState, useMemo } from 'react';
import { Crown, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import CTRFactorBreakdown from './CTRFactorBreakdown';

const TITLE_FACTOR_MAXES = {
  length: 20,
  number: 15,
  power_word: 10,
  curiosity_gap: 15,
  emotional_trigger: 10,
  keyword_position: 10,
  deliverability: 20,
};

const TITLE_FACTOR_LABELS = {
  length: 'Length',
  number: 'Number',
  power_word: 'Power Word',
  curiosity_gap: 'Curiosity Gap',
  emotional_trigger: 'Emotional Trigger',
  keyword_position: 'Keyword Position',
  deliverability: 'Deliverability',
};

const FORMULA_LETTERS = ['A', 'B', 'C', 'D', 'E'];

function pillClass(score) {
  if (score == null) return 'bg-muted text-muted-foreground border-border';
  if (score >= 80) return 'bg-success-bg text-success border-success-border';
  if (score >= 60) return 'bg-warning-bg text-warning border-warning-border';
  return 'bg-muted text-muted-foreground border-border';
}

export default function TitlePicker({
  topic,
  onSelect,
  onGenerate,
  isSelecting,
  isGenerating,
}) {
  const options = Array.isArray(topic?.title_options) ? topic.title_options : [];
  const [expanded, setExpanded] = useState({});

  const recommendedIndex = useMemo(() => {
    const idx = topic?.title_recommended_index;
    return typeof idx === 'number' && idx >= 0 && idx < options.length ? idx : -1;
  }, [topic, options.length]);

  const selectedTitle = topic?.selected_title || null;

  const getSelectedFlag = (entry, idx) => {
    if (selectedTitle) return entry.title === selectedTitle;
    return idx === recommendedIndex;
  };

  const toggleExpanded = (i) => {
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  /* -- Empty state: generate first -- */
  if (options.length === 0) {
    return (
      <div
        className="bg-card border border-border rounded-xl p-5 text-center"
        data-testid="title-picker-empty"
      >
        <Sparkles className="w-7 h-7 text-muted-foreground mx-auto mb-2 opacity-60" />
        <h3 className="text-sm font-semibold mb-1">Title CTR Variants</h3>
        <p className="text-xs text-muted-foreground mb-3 max-w-md mx-auto">
          Generate 5 high-CTR title variants scored by Claude Opus. Each gets a
          predicted CTR and a 7-factor scoring breakdown.
        </p>
        <Button
          size="sm"
          onClick={() => onGenerate()}
          disabled={isGenerating}
          data-testid="generate-title-variants-btn"
        >
          {isGenerating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          Generate title variants
        </Button>
      </div>
    );
  }

  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden"
      data-testid="title-picker"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-wrap">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            Title CTR Variants
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Pick the title to publish. Scored predictions are pre-publish estimates.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onGenerate({ force: true })}
          disabled={isGenerating}
          className="text-[11px] h-7 px-2"
        >
          {isGenerating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          Regenerate
        </Button>
      </div>

      {/* Recommended reasoning banner */}
      {topic?.title_ctr_reasoning && (
        <div className="px-4 py-2.5 bg-accent/10 border-b border-border">
          <p className="text-xs text-foreground/80 leading-relaxed">
            <span className="font-semibold text-accent">Why this recommendation:</span>{' '}
            {topic.title_ctr_reasoning}
          </p>
        </div>
      )}

      <div
        className="divide-y divide-border"
        role="radiogroup"
        aria-label="Title variants"
      >
        {options.map((entry, i) => {
          const isRecommended = i === recommendedIndex;
          const isSelected = getSelectedFlag(entry, i);
          const formulaLetter = FORMULA_LETTERS[i] || String(i + 1);
          const isOpen = !!expanded[i];
          const breakdown =
            entry && typeof entry.scoring_breakdown === 'object'
              ? entry.scoring_breakdown
              : null;

          return (
            <div
              key={i}
              className={cn(
                'px-4 py-3 transition-colors cursor-pointer',
                isSelected ? 'bg-accent/5' : 'hover:bg-card-hover',
                `stagger-${Math.min(i + 1, 8)} animate-fade-in`,
              )}
              onClick={() =>
                !isSelecting &&
                onSelect({ title: entry.title, ctr_score: entry.ctr_score })
              }
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              data-testid={`title-variant-${i}`}
            >
              <div className="flex items-start gap-3">
                {/* Radio */}
                <span
                  className={cn(
                    'flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                    isSelected ? 'border-accent' : 'border-border',
                  )}
                >
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  )}
                </span>

                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <div className="flex items-start gap-2 flex-wrap mb-2">
                    <span className="text-sm font-semibold text-foreground leading-snug">
                      {entry.title || `Variant ${formulaLetter}`}
                    </span>
                  </div>

                  {/* Pills row */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium border bg-muted text-muted-foreground border-border">
                      Formula {formulaLetter}
                      {entry.formula_pattern ? ` \u00b7 ${entry.formula_pattern}` : ''}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium border tabular-nums',
                        pillClass(entry.ctr_score),
                      )}
                    >
                      CTR {entry.ctr_score ?? '\u2014'}
                    </span>
                    {entry.char_count != null && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium border bg-muted text-muted-foreground border-border tabular-nums">
                        {entry.char_count} chars
                      </span>
                    )}
                    {isRecommended && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-gradient-to-r from-primary/20 to-accent/20 text-accent border border-accent/40"
                        title="Recommended by Intelligence"
                      >
                        <Crown className="w-2.5 h-2.5" />
                        Recommended
                      </span>
                    )}
                  </div>

                  {/* Reasoning */}
                  {entry.reasoning && (
                    <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                      {entry.reasoning}
                    </p>
                  )}

                  {/* Expand breakdown toggle */}
                  {breakdown && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(i);
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary-hover font-medium cursor-pointer"
                    >
                      <ChevronDown
                        className={cn(
                          'w-3 h-3 transition-transform',
                          isOpen ? 'rotate-180' : '',
                        )}
                      />
                      {isOpen ? 'Hide' : 'Score'} breakdown
                    </button>
                  )}

                  {isOpen && breakdown && (
                    <div className="mt-2 pt-2 border-t border-border animate-fade-in">
                      <CTRFactorBreakdown
                        breakdown={breakdown}
                        maxes={TITLE_FACTOR_MAXES}
                        labels={TITLE_FACTOR_LABELS}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
