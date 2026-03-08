import { Check } from 'lucide-react';

const PASSES = [
  { key: 'pass1', label: 'Pass 1: Foundation', wordRange: '5-7K words' },
  { key: 'pass2', label: 'Pass 2: Depth', wordRange: '8-10K words' },
  { key: 'pass3', label: 'Pass 3: Resolution', wordRange: '5-7K words' },
];

function scoreColor(score) {
  if (score >= 8) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 7) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * PassTracker -- Step-by-step generation progress display.
 * Shows 3 pass steps + combined evaluation with animated indicators.
 *
 * @param {object} props
 * @param {object} props.passScores - Per-pass and combined scores from topic.script_pass_scores
 * @param {string} props.status - Topic status (e.g., 'scripting', 'pending')
 * @param {number} props.attempts - Number of script generation attempts
 */
export default function PassTracker({ passScores, status, attempts }) {
  const isGenerating = status === 'scripting';

  // Determine which pass is currently active (first pass without score)
  const activePassIndex = PASSES.findIndex((pass) => !passScores?.[pass.key]);

  return (
    <div className="glass-card p-5" data-testid="pass-tracker">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          Generation Progress
        </h3>
        {attempts > 1 && (
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400" data-testid="attempt-counter">
            Attempt {attempts}/3
          </span>
        )}
      </div>

      <div className="space-y-3">
        {PASSES.map((pass, i) => {
          const score = passScores?.[pass.key];
          const isComplete = !!score;
          const isActive = !isComplete && isGenerating && i === activePassIndex;
          const isPending = !isComplete && !isActive;

          return (
            <div key={pass.key} className="flex items-center gap-3" data-testid={`pass-step-${pass.key}`}>
              {/* Circle indicator */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold transition-all duration-300 ${
                  isComplete
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-primary/20 text-primary animate-pulse'
                    : 'bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-slate-500'
                }`}
              >
                {isComplete ? <Check className="w-4 h-4" /> : i + 1}
              </div>

              {/* Label + status */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  isComplete ? 'text-slate-900 dark:text-white' :
                  isActive ? 'text-primary dark:text-blue-400' :
                  'text-slate-400 dark:text-slate-500'
                }`}>
                  {pass.label}
                </p>
                <p className="text-xs text-text-muted dark:text-text-muted-dark">
                  {isComplete && (
                    <span>
                      Score: <span className={`font-semibold ${scoreColor(score.score)}`}>{score.score}/10</span>
                      {score.score < 6.0 && (
                        <span className="text-red-500 ml-1">-- regenerated</span>
                      )}
                    </span>
                  )}
                  {isActive && (
                    <span className="text-primary dark:text-blue-400">Generating...</span>
                  )}
                  {isPending && (
                    <span>{pass.wordRange}</span>
                  )}
                </p>
              </div>
            </div>
          );
        })}

        {/* Combined Evaluation Step */}
        {(() => {
          const combined = passScores?.combined;
          const allPassesDone = PASSES.every((p) => !!passScores?.[p.key]);
          const isCombinedActive = allPassesDone && !combined && isGenerating;
          const isCombinedComplete = !!combined;

          return (
            <div className="flex items-center gap-3 pt-2 border-t border-border/30 dark:border-white/[0.04]" data-testid="pass-step-combined">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold transition-all duration-300 ${
                  isCombinedComplete
                    ? 'bg-emerald-500 text-white'
                    : isCombinedActive
                    ? 'bg-primary/20 text-primary animate-pulse'
                    : 'bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-slate-500'
                }`}
              >
                {isCombinedComplete ? <Check className="w-4 h-4" /> : <BarChart3Icon />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  isCombinedComplete ? 'text-slate-900 dark:text-white' :
                  isCombinedActive ? 'text-primary dark:text-blue-400' :
                  'text-slate-400 dark:text-slate-500'
                }`}>
                  Combined Evaluation
                </p>
                <p className="text-xs text-text-muted dark:text-text-muted-dark">
                  {isCombinedComplete && (
                    <span>
                      Score: <span className={`font-semibold ${scoreColor(combined.score)}`}>{combined.score}/10</span>
                      {combined.score < 7.0 && (
                        <span className="text-amber-500 ml-1">-- below threshold</span>
                      )}
                    </span>
                  )}
                  {isCombinedActive && (
                    <span className="text-primary dark:text-blue-400">Scoring...</span>
                  )}
                  {!isCombinedComplete && !isCombinedActive && (
                    <span>7-dimension scoring</span>
                  )}
                </p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

/** Small bar chart icon for combined step. */
function BarChart3Icon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
    </svg>
  );
}
