import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const CHART = {
  amber: '#FBBF24',
  success: '#34D399',
  grid: 'rgba(255,255,255,0.04)',
  axis: '#71717A',
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-semibold text-foreground tabular-nums">
          <span style={{ color: p.color }}>{p.name}:</span> ${p.value.toFixed(2)}
        </p>
      ))}
    </div>
  );
}

/**
 * Grouped bar chart showing cost vs revenue per video.
 * @param {{ data: Array<{ title: string, cost: number, revenue: number }> }} props
 */
export default function CostRevenueChart({ data }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6" data-testid="cost-revenue-chart">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Cost vs Revenue per Video
      </h3>
      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="title"
              tick={{ fontSize: 10, fill: CHART.axis }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 11, fill: CHART.axis }}
              tickFormatter={(val) => `$${val}`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              verticalAlign="top"
              wrapperStyle={{ fontSize: 11, color: CHART.axis }}
            />
            <Bar dataKey="cost" name="Cost" fill={CHART.amber} radius={[4, 4, 0, 0]} />
            <Bar dataKey="revenue" name="Revenue" fill={CHART.success} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
