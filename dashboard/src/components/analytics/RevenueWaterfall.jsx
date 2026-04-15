import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Legend,
} from 'recharts';
import { Banknote, Loader2 } from 'lucide-react';
import { useRevenueAttribution } from '../../hooks/useAnalyticsIntelligence';

const CHART = {
  grid: 'rgba(255,255,255,0.04)',
  axis: '#71717A',
};

function roiColor(roiPct) {
  if (roiPct == null) return '#71717A';
  if (roiPct >= 100) return '#34D399';
  if (roiPct >= 0) return '#FBBF24';
  return '#F87171';
}

function truncate(s, n = 22) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '\u2026' : s;
}

function WTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 text-xs shadow-lg max-w-[280px]">
      <p className="font-semibold text-foreground mb-1">{row.fullTitle}</p>
      <div className="space-y-0.5 tabular-nums">
        <p className="text-muted-foreground">
          Revenue:{' '}
          <span className="text-success">${row.revenue.toFixed(2)}</span>
        </p>
        <p className="text-muted-foreground">
          Cost:{' '}
          <span className="text-danger">${row.cost.toFixed(2)}</span>
        </p>
        <p className="text-muted-foreground">
          Net:{' '}
          <span className={row.net >= 0 ? 'text-success' : 'text-danger'}>
            {row.net >= 0 ? '+' : ''}${row.net.toFixed(2)}
          </span>
        </p>
        {row.roi != null && (
          <p className="text-muted-foreground">
            ROI:{' '}
            <span style={{ color: roiColor(row.roi) }} className="font-semibold">
              {row.roi.toFixed(1)}%
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Per-video revenue/cost waterfall. Top 20 by revenue.
 * Revenue bar stacks positive, cost bar dips negative.
 * Color each row by roi_pct.
 */
export default function RevenueWaterfall({ projectId }) {
  const { data: rows = [], isLoading } = useRevenueAttribution(projectId, {
    limit: 20,
  });

  const { chartData, breakEvenAvg } = useMemo(() => {
    const sorted = (rows || [])
      .map((r) => {
        const title =
          r.topics?.seo_title ||
          r.topics?.original_title ||
          `Topic #${r.topics?.topic_number ?? '\u2014'}`;
        const rev = parseFloat(r.estimated_revenue_usd) || 0;
        const cost = parseFloat(r.production_cost_usd) || 0;
        return {
          fullTitle: title,
          title: truncate(title, 20),
          revenue: rev,
          cost,
          net: rev - cost,
          roi: r.roi_pct != null ? parseFloat(r.roi_pct) : null,
          breakEven: r.topics?.break_even_views,
          // Cost rendered as a negative bar so it appears below the 0 line.
          costNeg: -cost,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const avg =
      sorted.length > 0
        ? sorted.reduce((s, r) => s + r.cost, 0) / sorted.length
        : 0;

    return { chartData: sorted, breakEvenAvg: avg };
  }, [rows]);

  return (
    <div
      className="bg-card border border-border rounded-xl p-4 sm:p-6"
      data-testid="revenue-waterfall"
    >
      <div className="flex items-center gap-2 mb-4">
        <Banknote className="w-4 h-4 text-success" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Revenue ROI (top 20)
        </h3>
      </div>

      {isLoading && (
        <div className="h-48 sm:h-72 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && chartData.length === 0 && (
        <div className="h-48 sm:h-72 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">
            No revenue attribution data yet
          </p>
        </div>
      )}

      {!isLoading && chartData.length > 0 && (
        <div className="h-72 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: 16, bottom: 80, left: 8 }}
            >
              <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="title"
                tick={{ fontSize: 10, fill: CHART.axis }}
                angle={-45}
                textAnchor="end"
                height={70}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: CHART.axis }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip content={<WTooltip />} />
              <Legend
                verticalAlign="top"
                wrapperStyle={{ fontSize: 11, color: CHART.axis }}
              />
              <ReferenceLine y={0} stroke="#71717A" strokeWidth={1} />
              {breakEvenAvg > 0 && (
                <ReferenceLine
                  y={breakEvenAvg}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  label={{
                    value: `Break-even avg $${breakEvenAvg.toFixed(2)}`,
                    fill: '#F59E0B',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
              )}
              <Bar
                dataKey="revenue"
                name="Revenue"
                radius={[3, 3, 0, 0]}
              >
                {chartData.map((row, i) => (
                  <Cell key={`r-${i}`} fill={roiColor(row.roi)} />
                ))}
              </Bar>
              <Bar
                dataKey="costNeg"
                name="Cost"
                fill="#F87171"
                radius={[0, 0, 3, 3]}
                fillOpacity={0.55}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
