import {
  Mic,
  Image,
  Subtitles,
  Clapperboard,
  CheckCircle2,
} from 'lucide-react';

const STAGES = [
  { key: 'audio', label: 'Audio', icon: Mic },
  { key: 'images', label: 'Images', icon: Image },
  { key: 'captions', label: 'Captions', icon: Subtitles },
  { key: 'assembly', label: 'Assembly', icon: Clapperboard },
];

function getStageState(key, stageProgress) {
  if (!stageProgress || !stageProgress[key]) return 'pending';
  const stage = stageProgress[key];
  if (stage.total === 0) return 'pending';
  if (stage.completed >= stage.total) return 'completed';
  if (stage.completed > 0) return 'active';

  const stageOrder = ['audio', 'images', 'captions', 'assembly'];
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

/**
 * StageProgress: 7-stage horizontal progress bar showing Classify, Audio, Images, I2V, T2V, Captions, Assembly.
 * Each stage has a thin progress bar, icon, label, and count.
 * Classification stage shows Fal.ai/Remotion split counts when complete.
 */
export default function StageProgress({ stageProgress }) {
  return (
    <div className="flex items-stretch gap-1" data-testid="stage-progress">
      {STAGES.map((stage) => {
        const state = getStageState(stage.key, stageProgress);
        const progress = stageProgress?.[stage.key];
        const pct = progress && progress.total > 0
          ? Math.round((progress.completed / progress.total) * 100)
          : 0;
        const Icon = stage.icon;

        return (
          <div key={stage.key} className="flex-1 text-center" data-testid={`stage-${stage.key}`}>
            {/* Progress bar */}
            <div className="h-1 bg-muted rounded-full overflow-hidden mb-1.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  state === 'completed'
                    ? 'bg-success'
                    : state === 'active'
                    ? 'bg-primary'
                    : 'bg-transparent'
                }`}
                style={{ width: state === 'completed' ? '100%' : `${pct}%` }}
              />
            </div>
            {/* Label */}
            <div className="flex items-center justify-center gap-1">
              {state === 'completed' ? (
                <CheckCircle2 className="w-3 h-3 text-success" />
              ) : (
                <Icon className={`w-3 h-3 ${
                  state === 'active' ? 'text-primary' : 'text-muted-foreground'
                }`} />
              )}
            </div>
            <div className={`text-[9px] mt-0.5 ${
              state === 'completed'
                ? 'text-success'
                : state === 'active'
                ? 'text-primary'
                : 'text-muted-foreground'
            }`}>
              {state === 'completed' ? (
                stage.label
              ) : progress && progress.total > 0 ? (
                <span className="tabular-nums">{progress.completed}/{progress.total}</span>
              ) : (
                stage.label
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
