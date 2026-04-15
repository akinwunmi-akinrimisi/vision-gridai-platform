import { cn } from '@/lib/utils';

/**
 * 6-factor PPS breakdown — one row per weighted factor.
 *
 * Data shape: breakdown = {
 *   outlier: { raw, normalized, weight, contribution, is_fallback? },
 *   seo: {...},
 *   script_quality: {...},
 *   niche_health: {...},
 *   thumbnail_ctr: {...},
 *   title_ctr: {...},
 *   dragged_by?: [string, string],
 * }
 *
 * - raw is the original factor score (0-100 for most, 0-10 for script_quality).
 * - normalized is 0-100.
 * - weight is 0..1.
 * - contribution is weight * normalized and sums (roughly) to the final PPS.
 * - is_fallback indicates the factor defaulted because the input was missing.
 */

const FACTOR_ORDER = [
  'outlier',
  'seo',
  'script_quality',
  'niche_health',
  'thumbnail_ctr',
  'title_ctr',
];

const FACTOR_LABELS = {
  outlier: 'Outlier',
  seo: 'SEO',
  script_quality: 'Script Quality',
  niche_health: 'Niche Health',
  thumbnail_ctr: 'Thumbnail CTR',
  title_ctr: 'Title CTR',
};

function formatRaw(key, raw) {
  if (raw == null || Number.isNaN(Number(raw))) return '\u2014';
  const n = Number(raw);
  if (key === 'script_quality') {
    return `${n.toFixed(1)}/10`;
  }
  return `${Math.round(n)}/100`;
}

function barColor(normalized) {
  if (normalized == null) return 'bg-muted-foreground/60';
  if (normalized >= 75) return 'bg-success';
  if (normalized >= 50) return 'bg-warning';
  return 'bg-danger';
}

export default function PPSFactorBreakdown({ breakdown, className }) {
  if (!breakdown || typeof breakdown !== 'object') return null;

  const draggedBy = Array.isArray(breakdown.dragged_by)
    ? breakdown.dragged_by
    : [];

  return (
    <div className={cn('space-y-2.5', className)}>
      {FACTOR_ORDER.map((key) => {
        const entry = breakdown[key];
        if (!entry || typeof entry !== 'object') return null;

        const raw = entry.raw;
        const normalized =
          typeof entry.normalized === 'number' ? entry.normalized : null;
        const weight = typeof entry.weight === 'number' ? entry.weight : null;
        const contribution =
          typeof entry.contribution === 'number' ? entry.contribution : null;
        const isFallback = entry.is_fallback === true;
        const isDrag = draggedBy.includes(key);

        const pct = normalized == null ? 0 : Math.max(0, Math.min(100, normalized));
        const barClass = barColor(normalized);

        return (
          <div key={key}>
            <div className="flex items-baseline justify-between gap-2 mb-1 flex-wrap">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] text-muted-foreground">
                  {FACTOR_LABELS[key]}
                </span>
                {isFallback && (
                  <span
                    title="This factor defaulted; input was missing"
                    className="inline-flex items-center px-1 py-[1px] rounded-sm text-[9px] font-medium border bg-muted text-muted-foreground border-border"
                  >
                    default
                  </span>
                )}
                {isDrag && (
                  <span
                    title="One of the weakest 2 factors dragging down the PPS"
                    className="inline-flex items-center px-1 py-[1px] rounded-sm text-[9px] font-medium border bg-danger-bg text-danger border-danger-border"
                  >
                    drag
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {weight != null && (
                  <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                    {'\u00d7'}{weight.toFixed(2)}
                  </span>
                )}
                <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                  {formatRaw(key, raw)}
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  barClass,
                  isFallback && 'opacity-50',
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            {contribution != null && (
              <div className="mt-1 text-right">
                <span className="text-[9px] font-mono tabular-nums text-muted-foreground/70">
                  contributes {contribution.toFixed(1)} pts
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
