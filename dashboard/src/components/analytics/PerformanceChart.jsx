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
  info: '#A78BFA',
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
          <span style={{ color: p.color }}>{p.name}:</span>{' '}
          {p.dataKey === 'ctr' ? `${p.value.toFixed(1)}%` : `${p.value}s`}
        </p>
      ))}
    </div>
  );
}

/**
 * Bar chart showing CTR and Avg Duration per video.
 * @param {{ data: Array<{ title: string, ctr: number, avgDuration: number }> }} props
 */
export default function PerformanceChart({ data }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6" data-testid="performance-chart">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        CTR & Avg Duration per Video
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
            <YAxis tick={{ fontSize: 11, fill: CHART.axis }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              verticalAlign="top"
              wrapperStyle={{ fontSize: 11, color: CHART.axis }}
            />
            <Bar dataKey="ctr" name="CTR (%)" fill={CHART.amber} radius={[4, 4, 0, 0]} />
            <Bar dataKey="avgDuration" name="Avg Duration (s)" fill={CHART.info} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
