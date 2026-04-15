import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  useNicheHealthHistory,
  useProjectNicheHealth,
  useRunNicheHealth,
} from '../../hooks/useAnalyticsIntelligence';

const CLASSIFICATION_STYLES = {
  thriving: {
    pill: 'bg-success-bg text-success border-success-border',
    text: 'text-success',
    dot: 'bg-success',
  },
  stable: {
    pill: 'bg-accent/20 text-accent border-accent/40',
    text: 'text-accent',
    dot: 'bg-accent',
  },
  warning: {
    pill: 'bg-warning-bg text-warning border-warning-border',
    text: 'text-warning',
    dot: 'bg-warning',
  },
  critical: {
    pill: 'bg-danger-bg text-danger border-danger-border',
    text: 'text-danger',
    dot: 'bg-danger',
  },
};

function lineColorFor(classification) {
  switch (classification) {
    case 'thriving':
      return '#34D399';
    case 'stable':
      return '#FBBF24';
    case 'warning':
      return '#F59E0B';
    case 'critical':
      return '#F87171';
    default:
      return '#71717A';
  }
}

function SparkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold text-foreground tabular-nums">
        {p.value}/100
      </p>
      {p.classification && (
        <p className="text-[11px] capitalize text-muted-foreground mt-0.5">
          {p.classification}
        </p>
      )}
    </div>
  );
}

/**
 * Primary intelligence surface for the project. Shows the latest weekly
 * niche health score + 8-week sparkline + WoW delta + insight summary.
 */
export default function NicheHealthCard({ projectId: projectIdProp, project: projectProp }) {
  // Accept either { projectId } (Analytics page) or { project } (legacy caller).
  const projectId = projectIdProp || projectProp?.id;
  const { data: fetchedProject } = useProjectNicheHealth(
    projectIdProp ? projectId : null,
  );
  const project = projectProp || fetchedProject || null;
  const { data: history = [], isLoading } = useNicheHealthHistory(projectId, {
    weeks: 8,
  });
  const runMut = useRunNicheHealth(projectId);

  const handleRun = async () => {
    try {
      const res = await runMut.mutateAsync();
      if (res?.success === false) {
        toast.error(res.error || 'Failed to run niche health');
      } else {
        toast.success('Niche health refresh queued');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to run niche health');
    }
  };

  const chartData = useMemo(() => {
    return (history || []).map((h) => ({
      // Use MM/DD for compact axis labels
      date: h.week_of
        ? new Date(h.week_of).toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
          })
        : '\u2014',
      value: h.health_score,
      classification: h.classification,
    }));
  }, [history]);

  const latestHistory = history.length > 0 ? history[history.length - 1] : null;
  // Prefer projects row values (canonical), fall back to latest history row.
  const score = project?.niche_health_score ?? latestHistory?.health_score ?? null;
  const classification =
    project?.niche_health_classification ||
    latestHistory?.classification ||
    null;
  const delta = latestHistory?.week_over_week_delta ?? null;
  const insight = latestHistory?.insight_summary || null;
  const lastComputed =
    project?.niche_health_last_computed_at ||
    latestHistory?.calculated_at ||
    null;

  const style = classification ? CLASSIFICATION_STYLES[classification] : null;

  return (
    <div
      className="bg-card border border-border rounded-xl p-5 mb-6"
      data-testid="niche-health-card"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Left: score + classification */}
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Heart className="w-5 h-5 text-accent" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Niche Health
              </h3>
              {lastComputed && (
                <span className="text-2xs text-muted-foreground/70">
                  &middot;{' '}
                  {new Date(lastComputed).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tabular-nums tracking-tight text-foreground">
                  {score ?? '\u2014'}
                </span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
              {classification && style && (
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${style.pill}`}
                >
                  {classification}
                </span>
              )}
              {delta != null && (
                <span
                  className={`flex items-center gap-1 text-xs font-semibold tabular-nums ${
                    delta > 0
                      ? 'text-success'
                      : delta < 0
                        ? 'text-danger'
                        : 'text-muted-foreground'
                  }`}
                >
                  {delta > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : delta < 0 ? (
                    <TrendingDown className="w-3.5 h-3.5" />
                  ) : (
                    <Minus className="w-3.5 h-3.5" />
                  )}
                  {delta > 0 ? '+' : ''}
                  {delta} WoW
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: refresh */}
        <div className="flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRun}
            disabled={runMut.isPending}
            className="gap-1.5"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${runMut.isPending ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Sparkline */}
      <div className="mt-4 h-20">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-muted-foreground italic">
              No weekly history yet
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#71717A' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip content={<SparkTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColorFor(classification)}
                strokeWidth={2}
                dot={{ r: 2, strokeWidth: 0, fill: lineColorFor(classification) }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Insight summary */}
      {insight && (
        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
          {insight}
        </p>
      )}
    </div>
  );
}
