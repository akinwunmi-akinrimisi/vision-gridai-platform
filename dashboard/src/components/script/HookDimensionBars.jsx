import { cn } from '@/lib/utils';

/**
 * 5-dimension hook breakdown bars — mirrors CTRFactorBreakdown pattern.
 * Each dimension maxes at 20, total at 100.
 */

const DIMENSION_ORDER = [
  'curiosity_gap',
  'emotional_trigger',
  'specificity',
  'pattern_interrupt',
  'open_loop',
];

const DIMENSION_LABELS = {
  curiosity_gap: 'Curiosity Gap',
  emotional_trigger: 'Emotional Trigger',
  specificity: 'Specificity',
  pattern_interrupt: 'Pattern Interrupt',
  open_loop: 'Open Loop',
};

const DIMENSION_MAX = 20;

function barColor(ratio) {
  if (ratio >= 0.75) return 'bg-success';
  if (ratio >= 0.5) return 'bg-warning';
  return 'bg-danger';
}

export default function HookDimensionBars({ breakdown, className }) {
  if (!breakdown || typeof breakdown !== 'object') return null;

  return (
    <div className={cn('space-y-2', className)}>
      {DIMENSION_ORDER.map((key) => {
        if (!(key in breakdown)) return null;
        const raw = breakdown[key];
        const score = typeof raw === 'number' ? raw : Number(raw) || 0;
        const pct = Math.max(0, Math.min(100, (score / DIMENSION_MAX) * 100));
        const ratio = score / DIMENSION_MAX;
        const barClass = barColor(ratio);

        return (
          <div key={key}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-[11px] text-muted-foreground">
                {DIMENSION_LABELS[key]}
              </span>
              <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                {score}/{DIMENSION_MAX}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  barClass,
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
