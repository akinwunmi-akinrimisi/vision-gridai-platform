import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Target, Loader2 } from 'lucide-react';
import { usePPSCalibration } from '../../hooks/useAnalyticsIntelligence';

const CHART = {
  grid: 'rgba(255,255,255,0.04)',
  axis: '#71717A',
  trend: '#FBBF24',
};

// Color by |variance_pct|
function pointColor(variancePct) {
  const v = Math.abs(variancePct ?? 0);
  if (v <= 20) return '#34D399'; // success
  if (v <= 50) return '#FBBF24'; // warning
  return '#F87171'; // danger
}

// Linear regression (least-squares) for trendline + R^2
function linearRegression(points) {
  if (!points || points.length < 2) return null;
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const sumYY = points.reduce((s, p) => s + p.y * p.y, 0);

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R^2
  const ssTot = points.reduce((s, p) => s + Math.pow(p.y - sumY / n, 2), 0);
  const ssRes = points.reduce(
    (s, p) => s + Math.pow(p.y - (slope * p.x + intercept), 2),
    0,
  );
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 text-xs shadow-lg max-w-[260px]">
      <p className="font-semibold text-foreground mb-1 truncate">{p.title}</p>
      <div className="space-y-0.5">
        <p className="text-muted-foreground">
          Predicted PPS: <span className="text-foreground tabular-nums">{p.x}</span>
        </p>
        <p className="text-muted-foreground">
          Actual views (30d):{' '}
          <span className="text-foreground tabular-nums">
            {p.y.toLocaleString()}
          </span>
        </p>
        <p className="text-muted-foreground">
          Variance:{' '}
          <span
            className="tabular-nums font-semibold"
            style={{ color: pointColor(p.variance) }}
          >
            {p.variance > 0 ? '+' : ''}
            {p.variance.toFixed(1)}%
          </span>
        </p>
      </div>
    </div>
  );
}

/**
 * PPS prediction accuracy scatter.
 *   X = predicted_pps
 *   Y = actual_views_30d
 *   Color by |variance_pct|
 *   Includes trendline + R^2.
 */
export default function PPSAccuracyScatter({ projectId }) {
  const { data: rows = [], isLoading } = usePPSCalibration(projectId);

  const { points, trend } = useMemo(() => {
    const ps = (rows || [])
      .filter(
        (r) =>
          r.predicted_pps != null &&
          r.actual_views_30d != null &&
          r.variance_pct != null,
      )
      .map((r) => ({
        x: r.predicted_pps,
        y: r.actual_views_30d,
        variance: r.variance_pct,
        title:
          r.topics?.seo_title ||
          r.topics?.original_title ||
          `Topic #${r.topics?.topic_number ?? '\u2014'}`,
      }));
    return { points: ps, trend: linearRegression(ps) };
  }, [rows]);

  // Loading
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            PPS Accuracy
          </h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Empty — the Analytics page also guards, but keep defensive UI.
  if (points.length === 0) return null;

  // Build trendline endpoints across the visible X range
  let trendLine = null;
  if (trend) {
    const xs = points.map((p) => p.x);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    trendLine = [
      { x: xMin, y: trend.slope * xMin + trend.intercept },
      { x: xMax, y: trend.slope * xMax + trend.intercept },
    ];
  }

  return (
    <div
      className="bg-card border border-border rounded-xl p-4 sm:p-6"
      data-testid="pps-accuracy-scatter"
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            PPS Accuracy
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {trend && (
            <span className="tabular-nums">
              R&sup2; ={' '}
              <span className="text-foreground font-semibold">
                {trend.r2.toFixed(2)}
              </span>
            </span>
          )}
          <span className="tabular-nums">
            n = <span className="text-foreground font-semibold">{points.length}</span>
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-success" />
          &le;&plusmn;20%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-warning" />
          &plusmn;20&ndash;50%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-danger" />
          &gt;&plusmn;50%
        </span>
      </div>

      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name="Predicted PPS"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: CHART.axis }}
              label={{
                value: 'Predicted PPS',
                position: 'insideBottom',
                offset: -12,
                fontSize: 11,
                fill: CHART.axis,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Actual Views (30d)"
              tick={{ fontSize: 11, fill: CHART.axis }}
              tickFormatter={(v) => {
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                return String(v);
              }}
            />
            <ZAxis range={[60, 60]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={<ScatterTooltip />}
            />
            <Scatter data={points}>
              {points.map((p, i) => (
                <Cell key={i} fill={pointColor(p.variance)} />
              ))}
            </Scatter>
            {trendLine && (
              <Scatter
                data={trendLine}
                line={{ stroke: CHART.trend, strokeWidth: 2, strokeDasharray: '4 4' }}
                shape={() => null}
                legendType="none"
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
