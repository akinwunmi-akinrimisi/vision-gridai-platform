import { useState } from 'react';
import { Compass, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import HeroCard from '../shared/HeroCard';

/**
 * Blue-ocean strategy hero section.
 * Uses HeroCard wrapper with amber gradient top-line.
 * @param {string} strategy - Channel positioning statement
 * @param {string} expertiseProfile - AI expertise profile tagline
 * @param {Array} valueGaps - Value curve gaps from blue_ocean_opportunities
 */
export default function BlueOceanHero({ strategy, expertiseProfile, valueGaps = [] }) {
  const [expanded, setExpanded] = useState(false);

  const hasData = strategy || expertiseProfile || valueGaps.length > 0;

  if (!hasData) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Compass className="w-5 h-5" />
          <span className="text-sm">Blue-ocean analysis not yet available</span>
        </div>
      </div>
    );
  }

  const displayGaps = expanded ? valueGaps : valueGaps.slice(0, 3);

  return (
    <HeroCard>
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-destructive flex items-center justify-center flex-shrink-0">
          <Compass className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold mb-0.5">Blue-Ocean Strategy</h3>
          {expertiseProfile && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" />
              {expertiseProfile}
            </p>
          )}
        </div>
      </div>

      {/* Channel Positioning Statement */}
      {strategy && (
        <p className="text-[15px] font-semibold leading-relaxed mb-5">
          {strategy}
        </p>
      )}

      {/* Value Curve Gaps as badges */}
      {valueGaps.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
            Value Curve Gaps
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {displayGaps.map((gap, i) => {
              const text = typeof gap === 'string' ? gap : gap.description || gap.gap || JSON.stringify(gap);
              return (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium bg-info-bg text-info border border-info-border"
                >
                  {text}
                </span>
              );
            })}
          </div>

          {valueGaps.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Show all {valueGaps.length} gaps
                </>
              )}
            </button>
          )}
        </div>
      )}
    </HeroCard>
  );
}
