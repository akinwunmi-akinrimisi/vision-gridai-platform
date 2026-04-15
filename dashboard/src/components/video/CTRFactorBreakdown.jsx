import { cn } from '@/lib/utils';

/**
 * Small reusable horizontal-bar breakdown for CTR scoring factors.
 *
 * Renders a row per factor key present in `breakdown` (object of number scores),
 * using `maxes` to compute the bar fill percentage.
 *
 * Factor label rendering:
 *   - Uses the key with underscores -> title-case
 *   - Caller may pass `labels` to override display names per key
 *
 * Color of the bar is graded by the ratio score / max:
 *   >= 0.75 -> success, >= 0.5 -> warning, else muted.
 */
export default function CTRFactorBreakdown({
  breakdown,
  maxes,
  labels,
  className,
}) {
  if (!breakdown || typeof breakdown !== 'object') return null;

  const keys = Object.keys(maxes || {}).filter((k) => k in breakdown);
  if (keys.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {keys.map((key) => {
        const raw = breakdown[key];
        const max = Number(maxes[key]) || 1;
        const score = typeof raw === 'number' ? raw : Number(raw) || 0;
        const pct = Math.max(0, Math.min(100, (score / max) * 100));
        const ratio = score / max;
        const barClass =
          ratio >= 0.75
            ? 'bg-success'
            : ratio >= 0.5
              ? 'bg-warning'
              : 'bg-muted-foreground/60';
        const label =
          labels?.[key] ||
          key
            .split('_')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');

        return (
          <div key={key}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-[11px] text-muted-foreground">{label}</span>
              <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                {score}/{max}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', barClass)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
