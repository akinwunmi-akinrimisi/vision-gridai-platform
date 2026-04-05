import { useState, useEffect, useRef } from 'react';
import { Check, Clock, Zap, AlertTriangle } from 'lucide-react';

const PASSES = [
  { key: 'pass1', label: 'Pass 1: Foundation', wordRange: '5-7K words', avgMinutes: 2.5 },
  { key: 'pass2', label: 'Pass 2: Depth', wordRange: '8-10K words', avgMinutes: 4 },
  { key: 'pass3', label: 'Pass 3: Resolution', wordRange: '5-7K words', avgMinutes: 2.5 },
  { key: 'combined', label: 'Combined Eval', wordRange: '7-dim scoring', avgMinutes: 1 },
  { key: 'visual', label: 'Scene Segmentation', wordRange: '~172 scenes', avgMinutes: 2 },
];

const TOTAL_EST_MINUTES = PASSES.reduce((sum, p) => sum + p.avgMinutes, 0);

function scoreColor(score) {
  if (score >= 8) return 'text-success';
  if (score >= 7) return 'text-warning';
  return 'text-danger';
}

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec}s`;
}

/**
 * PassTracker -- Script generation progress display with progress bar + time tracking.
 * Shows 3 pass steps + combined evaluation + scene segmentation with animated indicators.
 */
export default function PassTracker({ passScores, status, attempts, startedAt, forcePass }) {
  const isGenerating = status === 'scripting';
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // Parse passScores
  const scores = typeof passScores === 'string' ? (() => { try { return JSON.parse(passScores); } catch { return {}; } })() : (passScores || {});

  // Timer: tick every second while generating
  useEffect(() => {
    if (!isGenerating) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const start = startedAt ? new Date(startedAt).getTime() : Date.now();
    const tick = () => setElapsed(Date.now() - start);
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [isGenerating, startedAt]);

  // Determine completion status
  const completedSteps = PASSES.filter((p) => {
    if (p.key === 'visual') return status === 'script_review' || !!scores?.scene_count;
    return !!scores?.[p.key];
  }).length;
  const totalSteps = PASSES.length;
  const progressPct = isGenerating
    ? Math.min(95, (completedSteps / totalSteps) * 100)
    : status === 'script_review' ? 100 : (completedSteps / totalSteps) * 100;

  // Active pass index
  const activePassIndex = PASSES.findIndex((p) => {
    if (p.key === 'visual') return !scores?.scene_count && status !== 'script_review';
    return !scores?.[p.key];
  });

  // ETA calculation
  const estTotalMs = TOTAL_EST_MINUTES * 60 * 1000;
  const estRemaining = Math.max(0, estTotalMs - elapsed);

  return (
    <div className="bg-card border border-border rounded-lg p-5" data-testid="pass-tracker">
      {/* Header with timer */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Generation Progress
        </h3>
        <div className="flex items-center gap-3">
          {attempts > 1 && (
            <span className="text-xs font-medium text-warning" data-testid="attempt-counter">
              Attempt {attempts}/3
            </span>
          )}
          {isGenerating && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="tabular-nums font-mono">{formatDuration(elapsed)}</span>
              <span className="text-border">|</span>
              <span className="tabular-nums font-mono">~{formatDuration(estRemaining)} left</span>
            </div>
          )}
          {!isGenerating && status === 'script_review' && (
            <div className="flex items-center gap-1.5 text-xs text-success">
              <Zap className="w-3 h-3" />
              <span>Complete</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            progressPct >= 100
              ? 'bg-success'
              : 'bg-gradient-to-r from-primary to-amber-400'
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* FORCE_PASS warning */}
      {forcePass && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-md bg-warning/10 border border-warning/30" data-testid="force-pass-warning">
          <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
          <span className="text-xs text-warning font-medium">Force-passed: script did not meet threshold after max retries</span>
        </div>
      )}

      {/* Step details */}
      <div className="space-y-3">
        {PASSES.map((pass, i) => {
          const score = scores?.[pass.key];
          const isVisual = pass.key === 'visual';
          const isCombined = pass.key === 'combined';
          const isComplete = isVisual
            ? (status === 'script_review')
            : !!score;
          const isActive = !isComplete && isGenerating && i === activePassIndex;
          const isPending = !isComplete && !isActive;

          // Per-pass attempt count (for pass1/pass2/pass3)
          const passAttempts = score?.attempts ?? null;
          // Per-pass verdict (PASS / FORCE_PASS / FAIL)
          const passVerdict = score?.verdict ?? null;
          const isForcePass = passVerdict === 'FORCE_PASS';

          return (
            <div key={pass.key} className="flex items-center gap-3" data-testid={`pass-step-${pass.key}`}>
              {/* Circle indicator */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold transition-all duration-300 ${
                  isComplete && isForcePass
                    ? 'bg-warning text-background'
                    : isComplete
                    ? 'bg-success text-background'
                    : isActive
                    ? 'bg-primary/20 text-primary animate-pulse'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isComplete && isForcePass ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : isComplete ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  i + 1
                )}
              </div>

              {/* Label + status */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium flex items-center gap-2 ${
                  isComplete ? 'text-foreground' :
                  isActive ? 'text-primary' :
                  'text-muted-foreground'
                }`}>
                  {pass.label}
                  {/* Per-pass attempt badge */}
                  {isComplete && !isVisual && !isCombined && passAttempts > 1 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-warning/15 text-warning border border-warning/30" data-testid={`attempt-badge-${pass.key}`}>
                      Attempt {passAttempts}/3
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isComplete && !isVisual && score && (
                    <span>
                      Score: <span className={`font-semibold ${scoreColor(score.score)}`}>{score.score}/10</span>
                      {score.word_count && (
                        <span className="ml-2">{score.word_count.toLocaleString()} words</span>
                      )}
                      {isForcePass && (
                        <span className="ml-2 text-warning font-medium">FORCE PASS</span>
                      )}
                    </span>
                  )}
                  {isComplete && isVisual && (
                    <span className="text-success">Scenes created</span>
                  )}
                  {isActive && (
                    <span className="text-primary">
                      {isVisual ? 'Segmenting scenes...' : `Generating (~${pass.avgMinutes}min)...`}
                    </span>
                  )}
                  {isPending && (
                    <span>{pass.wordRange}</span>
                  )}
                </p>
              </div>

              {/* Time for completed passes */}
              {isComplete && !isVisual && score?.timestamp && (
                <span className="text-[10px] text-muted-foreground tabular-nums font-mono flex-shrink-0">
                  {new Date(score.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
