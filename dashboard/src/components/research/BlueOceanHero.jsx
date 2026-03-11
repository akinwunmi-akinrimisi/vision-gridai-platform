import { useState } from 'react';
import { Compass, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

/**
 * Blue-ocean strategy hero section -- most visually prominent element on the research page.
 * Gradient border (blue-500 to purple-500) with accent background.
 * @param {string} strategy - Channel positioning statement
 * @param {string} expertiseProfile - AI expertise profile tagline
 * @param {Array} valueGaps - Value curve gaps from blue_ocean_opportunities
 */
export default function BlueOceanHero({ strategy, expertiseProfile, valueGaps = [] }) {
  const [expanded, setExpanded] = useState(false);

  const hasData = strategy || expertiseProfile || valueGaps.length > 0;

  if (!hasData) {
    return (
      <div className="glass-card p-6 border-2 border-dashed border-blue-300/30 dark:border-blue-500/20">
        <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
          <Compass className="w-5 h-5" />
          <span className="text-sm">Blue-ocean analysis not yet available</span>
        </div>
      </div>
    );
  }

  const displayGaps = expanded ? valueGaps : valueGaps.slice(0, 3);

  return (
    <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-lg shadow-blue-500/10 dark:shadow-blue-500/20">
      <div className="rounded-[14px] bg-blue-50/80 dark:bg-blue-950/40 backdrop-blur-xl p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex-shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
              Blue-Ocean Strategy
            </h3>
            {expertiseProfile && (
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {expertiseProfile}
              </p>
            )}
          </div>
        </div>

        {/* Channel Positioning Statement */}
        {strategy && (
          <p className="text-lg font-semibold text-slate-900 dark:text-white leading-relaxed mb-5">
            {strategy}
          </p>
        )}

        {/* Value Curve Gaps */}
        {valueGaps.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-600/70 dark:text-blue-400/70 mb-3">
              Value Curve Gaps
            </h4>
            <ul className="space-y-2">
              {displayGaps.map((gap, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <span>{typeof gap === 'string' ? gap : gap.description || gap.gap || JSON.stringify(gap)}</span>
                </li>
              ))}
            </ul>

            {valueGaps.length > 3 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="btn-ghost btn-sm mt-3"
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
      </div>
    </div>
  );
}
