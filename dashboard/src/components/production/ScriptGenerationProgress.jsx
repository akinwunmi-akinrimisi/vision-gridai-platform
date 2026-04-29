import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useScriptProgress } from '../../hooks/useScriptProgress';

/**
 * ScriptGenerationProgress
 *
 * Real-time stepper for the 3-pass script pipeline. Driven by:
 *   - production_logs entries from WF_SCRIPT_PASS (started / pass / force_pass / fail)
 *   - topic.script_review_status (pending / approved / rejected)
 *   - topic.script_attempts + script_quality_score
 *
 * 7 steps total:
 *   Pass 1 → Pass 1 evaluated → Pass 2 → Pass 2 evaluated → Pass 3 → Pass 3 evaluated → Reviewable
 *
 * Only renders when topic is in the script-gen window
 * (status='scripting' or script attempts > 0 with no script_json yet).
 *
 * Each step is one of: pending (gray) | active (spinner) | done (check) | failed (alert).
 * A live elapsed-time counter ticks every second. Fired logs appear in a
 * compact feed below the stepper.
 */

const STEPS = [
  { key: 'p1_run',  label: 'Pass 1: Foundation (5-7K words)',          pass: 1, phase: 'running' },
  { key: 'p1_eval', label: 'Pass 1: Evaluation',                       pass: 1, phase: 'done' },
  { key: 'p2_run',  label: 'Pass 2: Depth (8-10K words)',              pass: 2, phase: 'running' },
  { key: 'p2_eval', label: 'Pass 2: Evaluation',                       pass: 2, phase: 'done' },
  { key: 'p3_run',  label: 'Pass 3: Resolution (5-7K words)',          pass: 3, phase: 'running' },
  { key: 'p3_eval', label: 'Pass 3: Evaluation + Combined Scoring',    pass: 3, phase: 'done' },
  { key: 'review',  label: 'Ready for review',                         pass: 4, phase: 'review' },
];

function deriveStepStates(currentStage, events, topic) {
  // Default: everything pending.
  const states = STEPS.map(() => 'pending');

  if (!currentStage && (!events || events.length === 0)) {
    return states;
  }

  // Walk through events to mark each pass's phases.
  // Latest event per pass is authoritative.
  const passEvents = { 1: [], 2: [], 3: [] };
  for (const ev of events || []) {
    const m = (ev.stage || '').match(/^script_pass_(\d)$/);
    if (!m) continue;
    const p = Number(m[1]);
    if (passEvents[p]) passEvents[p].push(ev);
  }

  for (let p = 1; p <= 3; p++) {
    const evs = passEvents[p];
    const runIdx = STEPS.findIndex((s) => s.key === `p${p}_run`);
    const evalIdx = STEPS.findIndex((s) => s.key === `p${p}_eval`);
    if (!evs.length) continue;
    const hasStart = evs.some((e) => (e.action || '').toLowerCase() === 'started');
    const last = evs[evs.length - 1];
    const lastAction = (last.action || '').toLowerCase();
    if (lastAction === 'fail') {
      states[runIdx] = 'failed';
      states[evalIdx] = 'failed';
    } else if (lastAction === 'pass' || lastAction === 'force_pass') {
      states[runIdx] = 'done';
      states[evalIdx] = 'done';
    } else if (hasStart) {
      states[runIdx] = 'active';
      states[evalIdx] = 'pending';
    }
  }

  // Reviewable when topic has a script_quality_score (combined eval ran)
  // and review_status is pending/approved/rejected.
  if (topic && topic.script_quality_score != null) {
    const reviewIdx = STEPS.length - 1;
    states[reviewIdx] = 'done';
  }

  return states;
}

function formatElapsed(ms) {
  if (ms == null || ms < 0 || !Number.isFinite(ms)) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function StepRow({ label, state }) {
  return (
    <div className="flex items-center gap-2.5 text-xs" data-testid={`script-step-${state}`}>
      {state === 'done' && (
        <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
      )}
      {state === 'active' && (
        <Loader2 className="w-3.5 h-3.5 text-accent flex-shrink-0 animate-spin" />
      )}
      {state === 'pending' && (
        <Circle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
      )}
      {state === 'failed' && (
        <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
      )}
      <span className={
        state === 'done' ? 'text-success' :
        state === 'active' ? 'text-accent font-medium' :
        state === 'failed' ? 'text-destructive' :
        'text-muted-foreground/60'
      }>
        {label}
      </span>
    </div>
  );
}

/**
 * @param {object} props
 * @param {string} props.topicId
 * @param {object} [props.topic] - the topic row (provides script_quality_score, script_review_status, last_status_change)
 * @param {boolean} [props.active=true] - whether to enable polling
 */
export default function ScriptGenerationProgress({ topicId, topic, active = true }) {
  const { events, currentStage, error } = useScriptProgress(topicId, { active });

  // Live tick to update elapsed time
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  // baseline for elapsed: first script_pass event, or topic.last_status_change as fallback
  const baseTimestamp = (() => {
    if (events && events.length > 0) {
      return new Date(events[0].created_at).getTime();
    }
    if (topic && topic.last_status_change) {
      return new Date(topic.last_status_change).getTime();
    }
    return Date.now();
  })();
  const elapsedMs = Date.now() - baseTimestamp;

  const states = deriveStepStates(currentStage, events, topic);
  const overallProgress = states.filter((s) => s === 'done').length / STEPS.length;
  const allDone = topic?.script_quality_score != null && overallProgress > 0.85;

  return (
    <div className="space-y-3" data-testid="script-generation-progress">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          {allDone ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-success" />
              <span className="text-success">Script ready for review</span>
            </>
          ) : (
            <>
              <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
              <span className="text-accent">Generating script — pass {currentStage?.pass ?? 1}/3</span>
            </>
          )}
        </div>
        <span className="text-2xs text-muted-foreground tabular-nums">
          {formatElapsed(elapsedMs)}
        </span>
      </div>

      {/* Overall progress bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            allDone ? 'bg-success' : 'bg-accent'
          }`}
          style={{ width: `${Math.round(overallProgress * 100)}%` }}
        />
      </div>

      {/* Step-by-step list */}
      <div className="space-y-1.5">
        {STEPS.map((step, idx) => (
          <StepRow key={step.key} label={step.label} state={states[idx]} />
        ))}
      </div>

      {/* Footer hint */}
      <p className="text-2xs text-muted-foreground">
        3-pass generation typically takes 8-15 minutes total. Pass 2 is the largest (8-10K words).
      </p>

      {/* Error banner if read failed */}
      {error && (
        <div className="text-2xs text-muted-foreground/70 italic">
          Live progress unavailable — refresh to retry.
        </div>
      )}
    </div>
  );
}
