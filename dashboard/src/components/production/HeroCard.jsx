import {
  Activity,
  Mic,
  Image,
  Film,
  Clapperboard,
  CheckCircle2,
  StopCircle,
  Clock,
  DollarSign,
} from 'lucide-react';

/**
 * Format milliseconds into HH:MM:SS display.
 */
function formatElapsed(ms) {
  if (!ms || ms < 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format milliseconds into human ETA string.
 */
function formatEta(ms) {
  if (!ms || ms <= 0) return '--';
  const totalMin = Math.ceil(ms / 60000);
  if (totalMin < 60) return `~${totalMin} min remaining`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `~${h}h ${m}m remaining`;
}

const STAGES = [
  { key: 'audio', label: 'Audio', icon: Mic },
  { key: 'images', label: 'Images', icon: Image },
  { key: 'i2v', label: 'I2V', icon: Film },
  { key: 't2v', label: 'T2V', icon: Film },
  { key: 'assembly', label: 'Assembly', icon: Clapperboard },
];

/**
 * Determine stage state: 'completed', 'active', or 'pending'.
 */
function getStageState(key, stageProgress) {
  if (!stageProgress || !stageProgress[key]) return 'pending';
  const stage = stageProgress[key];
  if (stage.total === 0) return 'pending';
  if (stage.completed >= stage.total) return 'completed';
  if (stage.completed > 0) return 'active';

  // Check if any prior stage is still active
  const stageOrder = ['audio', 'images', 'i2v', 't2v', 'assembly'];
  const idx = stageOrder.indexOf(key);
  for (let i = 0; i < idx; i++) {
    const prev = stageProgress[stageOrder[i]];
    if (prev && prev.total > 0 && prev.completed < prev.total) return 'pending';
  }
  // If all prior stages complete, this one is active
  if (idx > 0) {
    const allPriorComplete = stageOrder.slice(0, idx).every((k) => {
      const p = stageProgress[k];
      return !p || p.total === 0 || p.completed >= p.total;
    });
    if (allPriorComplete) return 'active';
  }
  return 'pending';
}

/**
 * Active topic hero card with stage chips, elapsed time, ETA, and cost counter.
 */
export default function HeroCard({ topic, stageProgress, elapsed, eta, cost, onStop }) {
  const displayCost = cost ?? topic?.total_cost ?? 0;
  const breakdown = topic?.cost_breakdown;

  return (
    <div data-testid="hero-card" className="glass-card p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-sm">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {topic?.seo_title || 'Untitled Topic'}
              </h2>
              <span className="badge badge-primary text-[10px]">#{topic?.topic_number}</span>
            </div>
            <p className="text-xs text-text-muted dark:text-text-muted-dark">
              Active production
            </p>
          </div>
        </div>

        {onStop && (
          <button
            data-testid="stop-production-btn"
            onClick={onStop}
            className="
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              badge-red cursor-pointer transition-all duration-200
              hover:shadow-md hover:shadow-red-500/20
            "
          >
            <StopCircle className="w-3.5 h-3.5" />
            Stop
          </button>
        )}
      </div>

      {/* Stage chips */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {STAGES.map((stage) => {
          const state = getStageState(stage.key, stageProgress);
          const Icon = stage.icon;

          let chipClass = '';
          if (state === 'completed') chipClass = 'badge-emerald';
          else if (state === 'active') chipClass = 'badge-primary animate-pulse';
          else chipClass = 'opacity-40';

          return (
            <span
              key={stage.key}
              data-testid={`stage-chip-${stage.key}`}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${chipClass}`}
            >
              {state === 'completed' ? (
                <CheckCircle2 data-testid="stage-check" className="w-3 h-3" />
              ) : (
                <Icon className="w-3 h-3" />
              )}
              {stage.label}
              {stageProgress?.[stage.key] && stageProgress[stage.key].total > 0 && (
                <span className="ml-0.5 tabular-nums">
                  {stageProgress[stage.key].completed}/{stageProgress[stage.key].total}
                </span>
              )}
            </span>
          );
        })}
      </div>

      {/* Timing & Cost row */}
      <div className="flex items-center gap-6 text-xs text-text-muted dark:text-text-muted-dark">
        <div className="flex items-center gap-1.5" data-testid="elapsed-time">
          <Clock className="w-3.5 h-3.5" />
          <span className="tabular-nums font-medium">{formatElapsed(elapsed)}</span>
        </div>
        <div className="flex items-center gap-1.5" data-testid="eta">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatEta(eta)}</span>
        </div>
        <div className="flex items-center gap-1.5" data-testid="cost-counter">
          <DollarSign className="w-3.5 h-3.5" />
          <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
            ${typeof displayCost === 'number' ? displayCost.toFixed(2) : '0.00'}
          </span>
          {breakdown && (
            <span className="text-[10px] ml-1" title={`Script: $${breakdown.script || 0}, TTS: $${breakdown.tts || 0}, Images: $${breakdown.images || 0}, I2V: $${breakdown.i2v || 0}, T2V: $${breakdown.t2v || 0}`}>
              (breakdown)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
