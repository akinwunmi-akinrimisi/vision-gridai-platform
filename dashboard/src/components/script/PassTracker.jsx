import { Check } from 'lucide-react';

const PASSES = [
  { key: 'pass1', label: 'Pass 1: Foundation', wordRange: '5-7K words' },
  { key: 'pass2', label: 'Pass 2: Depth', wordRange: '8-10K words' },
  { key: 'pass3', label: 'Pass 3: Resolution', wordRange: '5-7K words' },
];

function scoreColor(score) {
  if (score >= 8) return 'text-success';
  if (score >= 7) return 'text-warning';
  return 'text-danger';
}

/**
 * PassTracker -- Tab-style generation progress display.
 * Shows 3 pass steps + combined evaluation with animated indicators.
 */
export default function PassTracker({ passScores, status, attempts }) {
  const isGenerating = status === 'scripting';

  // Determine which pass is currently active (first pass without score)
  const activePassIndex = PASSES.findIndex((pass) => !passScores?.[pass.key]);

  return (
    <div className="bg-card border border-border rounded-lg p-5" data-testid="pass-tracker">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Generation Progress
        </h3>
        {attempts > 1 && (
          <span className="text-xs font-medium text-warning" data-testid="attempt-counter">
            Attempt {attempts}/3
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5 mb-4">
        {PASSES.map((pass, i) => {
          const score = passScores?.[pass.key];
          const isComplete = !!score;
          const isActive = !isComplete && isGenerating && i === activePassIndex;

          return (
            <div
              key={pass.key}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-warning-bg text-warning'
                  : isComplete
                  ? 'bg-success-bg text-success'
                  : 'bg-transparent text-muted-foreground'
              }`}
            >
              P{i + 1}{isComplete && `: ${score.score}`}
              {isActive && '...'}
            </div>
          );
        })}
        {/* Combined tab */}
        {(() => {
          const combined = passScores?.combined;
          const allPassesDone = PASSES.every((p) => !!passScores?.[p.key]);
          const isCombinedActive = allPassesDone && !combined && isGenerating;
          const isCombinedComplete = !!combined;

          return (
            <div
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                isCombinedActive
                  ? 'bg-warning-bg text-warning'
                  : isCombinedComplete
                  ? 'bg-success-bg text-success'
                  : 'bg-transparent text-muted-foreground'
              }`}
            >
              Combined{isCombinedComplete && `: ${combined.score}`}
              {isCombinedActive && '...'}
            </div>
          );
        })()}
      </div>

      {/* Step details */}
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
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold transition-all duration-300 ${
                  isComplete
                    ? 'bg-success text-background'
                    : isActive
                    ? 'bg-primary/20 text-primary animate-pulse'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isComplete ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>

              {/* Label + status */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  isComplete ? 'text-foreground' :
                  isActive ? 'text-primary' :
                  'text-muted-foreground'
                }`}>
                  {pass.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isComplete && (
                    <span>
                      Score: <span className={`font-semibold ${scoreColor(score.score)}`}>{score.score}/10</span>
                      {score.score < 6.0 && (
                        <span className="text-danger ml-1">-- regenerated</span>
                      )}
                    </span>
                  )}
                  {isActive && (
                    <span className="text-primary">Generating...</span>
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
            <div className="flex items-center gap-3 pt-2 border-t border-border" data-testid="pass-step-combined">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold transition-all duration-300 ${
                  isCombinedComplete
                    ? 'bg-success text-background'
                    : isCombinedActive
                    ? 'bg-primary/20 text-primary animate-pulse'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCombinedComplete ? <Check className="w-3.5 h-3.5" /> : <BarChart3Icon />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  isCombinedComplete ? 'text-foreground' :
                  isCombinedActive ? 'text-primary' :
                  'text-muted-foreground'
                }`}>
                  Combined Evaluation
                </p>
                <p className="text-xs text-muted-foreground">
                  {isCombinedComplete && (
                    <span>
                      Score: <span className={`font-semibold ${scoreColor(combined.score)}`}>{combined.score}/10</span>
                      {combined.score < 7.0 && (
                        <span className="text-warning ml-1">-- below threshold</span>
                      )}
                    </span>
                  )}
                  {isCombinedActive && (
                    <span className="text-primary">Scoring...</span>
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
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
    </svg>
  );
}
