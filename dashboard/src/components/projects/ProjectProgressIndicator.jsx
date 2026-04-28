import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useProjectActivity } from '../../hooks/useProjectActivity';

/* ──────────────────────────────────────────────────────────────────
 *  ProjectProgressIndicator
 *
 *  Replaces the old broken stepper that watched for fine-grained
 *  research_competitors / pain_points / blue_ocean / prompts statuses
 *  the backend never emits. The pipeline only flips between four
 *  meaningful values: created → researching → ready_for_topics
 *  (or research_failed), and ready_for_topics → generating_topics
 *  → topics_pending_review.
 *
 *  This component renders a status-aware UI:
 *    - active research/topic-gen: elapsed time + simulated stepper
 *    - completed states: a calm confirmation header
 *    - failed: returns null (the parent ProjectCard already shows a
 *      retry button)
 * ────────────────────────────────────────────────────────────────── */

/** Visible-only-while-active states. Anything else returns null.
 *
 *  ACTIVE_RESEARCH covers the full set of statuses WF_PROJECT_CREATE may
 *  emit during niche research. The orchestrator currently flips status to
 *  'researching_competitors' immediately after the project row inserts
 *  (one status update for the entire ~1-3 min Claude+web_search call) and
 *  the remaining four `researching_*` slugs are reserved for finer-grained
 *  emissions added later. Listing them all keeps this component forward-
 *  compatible: if a future migration adds intermediate PATCHes, the
 *  stepper will animate without a code change.
 */
const ACTIVE_RESEARCH = new Set([
  'created',
  'researching',
  'researching_competitors',
  'researching_pain_points',
  'researching_keywords',
  'researching_blue_ocean',
  'researching_prompts',
]);
const ACTIVE_TOPICS = new Set(['generating_topics']);
const READY_FOR_TOPICS = new Set(['ready_for_topics']);
const TOPICS_READY = new Set(['topics_pending_review']);
const FAILED = new Set(['research_failed', 'failed']);

const RESEARCH_STAGES = [
  { id: 1, label: 'Connecting to web search',                start: 0,   end: 15 },
  { id: 2, label: 'Auditing top 10 competitor channels',     start: 15,  end: 45 },
  { id: 3, label: 'Mining audience pain points (Reddit/Quora)', start: 45,  end: 90 },
  { id: 4, label: 'Identifying blue-ocean opportunities',    start: 90,  end: 150 },
  { id: 5, label: 'Generating niche profile + prompts',      start: 150, end: Infinity },
];

const TOPIC_STAGES = [
  { id: 1, label: 'Loading niche profile + research data',   start: 0,   end: 20 },
  { id: 2, label: 'Drafting topic candidates per playlist',  start: 20,  end: 50 },
  { id: 3, label: 'Generating customer avatars (10-field)',  start: 50,  end: 80 },
  { id: 4, label: 'Validating SEO + writing to database',    start: 80,  end: Infinity },
];

/** Decide a stage's visual state from elapsed seconds. */
function deriveStageState(stage, elapsedSec) {
  if (elapsedSec >= stage.end) return 'done';
  if (elapsedSec >= stage.start) return 'active';
  return 'pending';
}

/** Render one row of the stepper. Visual style matches the previous component. */
function StepRow({ label, state }) {
  return (
    <div className="flex items-center gap-2.5 text-xs">
      {state === 'done' && (
        <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
      )}
      {state === 'active' && (
        <Loader2 className="w-3.5 h-3.5 text-accent flex-shrink-0 animate-spin" />
      )}
      {state === 'pending' && (
        <Circle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
      )}
      <span className={
        state === 'done' ? 'text-success' :
        state === 'active' ? 'text-accent font-medium' :
        'text-muted-foreground/60'
      }>
        {label}
      </span>
    </div>
  );
}

/** Format elapsed milliseconds as M:SS. */
function formatElapsed(ms) {
  if (ms == null || ms < 0 || !Number.isFinite(ms)) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Pretty-print a production_log row for the inline activity feed. */
function describeEvent(ev) {
  const stage = ev.stage || '';
  const action = ev.action || '';
  if (stage === 'niche_research' && action === 'started') return 'Research started';
  if (stage === 'niche_research' && action === 'completed') return 'Research complete';
  if (stage === 'niche_research' && action === 'failed') return 'Research failed';
  if (stage === 'topic_generation' && action === 'started') return 'Generating topics';
  if (stage === 'topic_generation' && action === 'completed') return 'Topics ready';
  if (stage === 'topic_generation' && action === 'failed') return 'Topic generation failed';
  // Generic fallback: humanise the stage name.
  const pretty = stage.replace(/_/g, ' ');
  return `${pretty}${action ? ` — ${action}` : ''}`;
}

/* ── Subcomponents per status ───────────────────────────────────── */

function ActiveStepper({ project, stages, headerLabel, totalLabel, status, baseTimestamp }) {
  // Live tick: re-render once per second to update elapsed counter and
  // advance the simulated stepper.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedMs = baseTimestamp ? Date.now() - baseTimestamp : 0;
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));

  // Activity feed — last 5 production_log rows for this project, polled @5s.
  // Hidden silently if the read fails (auth gap, etc.) — the elapsed timer
  // and stepper are already useful enough to stand alone.
  const { events, error: activityError } = useProjectActivity(project.id, {
    active: true,
    limit: 5,
  });

  return (
    <div className="space-y-3 mb-4" data-testid="project-progress-active">
      {/* Header: label + spinner + elapsed */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-accent">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {headerLabel}
        </div>
        <span className="text-2xs text-muted-foreground tabular-nums">
          {formatElapsed(elapsedMs)}
        </span>
      </div>

      {/* Disclaimer */}
      <p className="text-2xs text-muted-foreground/80 leading-snug">
        Typical breakdown — this is a guide, not live tracking.
      </p>

      {/* Simulated stepper */}
      <div className="space-y-1.5">
        {stages.map((stage) => (
          <StepRow
            key={stage.id}
            label={stage.label}
            state={deriveStageState(stage, elapsedSec)}
          />
        ))}
      </div>

      {/* Footer hint */}
      <p className="text-2xs text-muted-foreground">{totalLabel}</p>

      {/* Recent activity from production_log (best-effort) */}
      {!activityError && events.length > 0 && (
        <div className="pt-2 border-t border-border/60 space-y-1" data-testid="project-activity-feed">
          {events.slice(0, 3).map((ev) => (
            <div
              key={ev.id}
              className="flex items-center gap-1.5 text-2xs text-muted-foreground"
            >
              <span className="w-1 h-1 rounded-full bg-accent/60 flex-shrink-0" />
              <span className="truncate">{describeEvent(ev)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResearchComplete() {
  return (
    <div className="flex items-start gap-2.5 mb-4 p-2.5 rounded-lg bg-success-bg/40 border border-success-border/40" data-testid="project-progress-research-complete">
      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-success">Research complete</p>
        <p className="text-2xs text-muted-foreground mt-0.5 leading-snug">
          Niche profile, expertise, playlist angles, and prompt templates have been generated.
        </p>
      </div>
    </div>
  );
}

function TopicsReady() {
  return (
    <div className="flex items-start gap-2.5 mb-4 p-2.5 rounded-lg bg-info-bg/40 border border-info-border/40" data-testid="project-progress-topics-ready">
      <Sparkles className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-info">Topics ready for review</p>
        <p className="text-2xs text-muted-foreground mt-0.5 leading-snug">
          25 topic candidates with full audience avatars are ready. Click the card to review.
        </p>
      </div>
    </div>
  );
}

/* ── Default export ─────────────────────────────────────────────── */

export default function ProjectProgressIndicator({ project }) {
  if (!project || !project.status) return null;
  const { status } = project;

  // Failed: the parent ProjectCard already shows the retry button — no need
  // to render the indicator at all.
  if (FAILED.has(status)) return null;

  // Pick a sensible "started at" timestamp for elapsed-time. We prefer
  // updated_at because the orchestrator bumps it on every status flip;
  // fall back to created_at, then now() as a last resort.
  const baseTimestamp = (() => {
    const t = project.updated_at || project.created_at;
    if (!t) return Date.now();
    const ms = new Date(t).getTime();
    return Number.isFinite(ms) ? ms : Date.now();
  })();

  if (ACTIVE_RESEARCH.has(status)) {
    return (
      <ActiveStepper
        project={project}
        status={status}
        stages={RESEARCH_STAGES}
        headerLabel="Researching niche..."
        totalLabel="Usually takes 1-3 minutes"
        baseTimestamp={baseTimestamp}
      />
    );
  }

  if (ACTIVE_TOPICS.has(status)) {
    return (
      <ActiveStepper
        project={project}
        status={status}
        stages={TOPIC_STAGES}
        headerLabel="Generating 25 topic candidates..."
        totalLabel="Usually takes 1-2 minutes"
        baseTimestamp={baseTimestamp}
      />
    );
  }

  if (READY_FOR_TOPICS.has(status)) {
    return <ResearchComplete />;
  }

  if (TOPICS_READY.has(status)) {
    return <TopicsReady />;
  }

  // Any other status (active, in_production, paused, etc.) — let the rest of
  // ProjectCard render its normal metrics row.
  return null;
}

/** Returns true when ProjectProgressIndicator will actually render content,
 *  so ProjectCard can decide whether to hide its metrics row. Mirrors the
 *  status checks at the top of the component above. */
export function shouldShowProjectProgress(status) {
  if (!status) return false;
  if (FAILED.has(status)) return false;
  return (
    ACTIVE_RESEARCH.has(status) ||
    ACTIVE_TOPICS.has(status) ||
    READY_FOR_TOPICS.has(status) ||
    TOPICS_READY.has(status)
  );
}
