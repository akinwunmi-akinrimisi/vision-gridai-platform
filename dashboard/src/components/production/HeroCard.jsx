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
  Timer,
} from 'lucide-react';

function formatElapsed(ms) {
  if (!ms || ms < 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatEta(ms) {
  if (!ms || ms <= 0) return '--';
  const totalMin = Math.ceil(ms / 60000);
  if (totalMin < 60) return `~${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `~${h}h ${m}m`;
}

const STAGES = [
  { key: 'audio', label: 'Audio', icon: Mic },
  { key: 'images', label: 'Images', icon: Image },
  { key: 'i2v', label: 'I2V', icon: Film },
  { key: 't2v', label: 'T2V', icon: Film },
  { key: 'assembly', label: 'Assembly', icon: Clapperboard },
];

function getStageState(key, stageProgress) {
  if (!stageProgress || !stageProgress[key]) return 'pending';
  const stage = stageProgress[key];
  if (stage.total === 0) return 'pending';
  if (stage.completed >= stage.total) return 'completed';
  if (stage.completed > 0) return 'active';

  const stageOrder = ['audio', 'images', 'i2v', 't2v', 'assembly'];
  const idx = stageOrder.indexOf(key);
  if (idx > 0) {
    const allPriorComplete = stageOrder.slice(0, idx).every((k) => {
      const p = stageProgress[k];
      return !p || p.total === 0 || p.completed >= p.total;
    });
    if (allPriorComplete) return 'active';
  }
  return 'pending';
}

function StageChip({ stage, stageProgress }) {
  const state = getStageState(stage.key, stageProgress);
  const Icon = stage.icon;
  const progress = stageProgress?.[stage.key];
  const pct = progress && progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div
      data-testid={`stage-chip-${stage.key}`}
      className={`
        relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
        transition-all duration-300 overflow-hidden
        ${state === 'completed'
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20'
          : state === 'active'
            ? 'bg-primary-50 text-primary-700 dark:bg-primary/10 dark:text-blue-400 ring-1 ring-inset ring-primary/20'
            : 'bg-slate-50 text-slate-400 dark:bg-white/[0.03] dark:text-slate-500 ring-1 ring-inset ring-slate-200/60 dark:ring-white/[0.06]'
        }
      `}
    >
      {/* Progress fill background for active stages */}
      {state === 'active' && (
        <div
          className="absolute inset-0 bg-primary/[0.06] dark:bg-primary/[0.08] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      )}
      <span className="relative flex items-center gap-1.5">
        {state === 'completed' ? (
          <CheckCircle2 data-testid="stage-check" className="w-3.5 h-3.5" />
        ) : (
          <Icon className={`w-3.5 h-3.5 ${state === 'active' ? 'animate-pulse-slow' : ''}`} />
        )}
        {stage.label}
        {progress && progress.total > 0 && (
          <span className="tabular-nums opacity-70">
            {progress.completed}/{progress.total}
          </span>
        )}
      </span>
    </div>
  );
}

export default function HeroCard({ topic, stageProgress, elapsed, eta, cost, onStop }) {
  const displayCost = cost ?? topic?.total_cost ?? 0;
  const breakdown = topic?.cost_breakdown;

  return (
    <div data-testid="hero-card" className="group glass-card gradient-border-visible p-6 mb-6 shadow-[0_0_30px_rgba(37,99,235,0.06),0_0_60px_rgba(124,58,237,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-600 flex items-center justify-center shadow-md shadow-primary/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg group-hover:shadow-primary/30">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {topic?.seo_title || 'Untitled Topic'}
              </h2>
              <span className="flex-shrink-0 badge badge-blue text-2xs">#{topic?.topic_number}</span>
            </div>
            <p className="text-xs text-text-muted dark:text-text-muted-dark flex items-center gap-1">
              <span className="status-dot bg-emerald-500" />
              Active production
            </p>
          </div>
        </div>

        {onStop && (
          <button
            data-testid="stop-production-btn"
            onClick={onStop}
            className="btn-sm btn text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/[0.08] border border-red-200/50 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/[0.12]"
          >
            <StopCircle className="w-3.5 h-3.5" />
            Stop
          </button>
        )}
      </div>

      {/* Stage chips */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {STAGES.map((stage) => (
          <StageChip key={stage.key} stage={stage} stageProgress={stageProgress} />
        ))}
      </div>

      {/* Timing & Cost */}
      <div className="flex items-center gap-5 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-1.5 text-xs" data-testid="elapsed-time">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-200">
            {formatElapsed(elapsed)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500" data-testid="eta">
          <Timer className="w-3.5 h-3.5" />
          <span>{formatEta(eta)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs" data-testid="cost-counter">
          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
            ${typeof displayCost === 'number' ? displayCost.toFixed(2) : '0.00'}
          </span>
          {breakdown && (
            <span
              className="text-2xs text-slate-400 dark:text-slate-500 cursor-help"
              title={`Script: $${breakdown.script || 0}, TTS: $${breakdown.tts || 0}, Images: $${breakdown.images || 0}, I2V: $${breakdown.i2v || 0}, T2V: $${breakdown.t2v || 0}`}
            >
              details
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
