import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const CHART = {
  primary: '#FBBF24',
  grid: 'rgba(255,255,255,0.04)',
  axis: '#71717A',
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold text-foreground tabular-nums">
        {payload[0].value.toLocaleString()} views
      </p>
    </div>
  );
}

/**
 * Area chart showing views over time with amber theming.
 * @param {{ data: Array<{ date: string, views: number }> }} props
 */
export default function ViewsChart({ data }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Views Over Time
      </h3>
      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="viewsGradientNeon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.1} />
                <stop offset="100%" stopColor={CHART.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART.axis }} />
            <YAxis tick={{ fontSize: 11, fill: CHART.axis }} />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="views"
              stroke={CHART.primary}
              fill="url(#viewsGradientNeon)"
              fillOpacity={1}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
