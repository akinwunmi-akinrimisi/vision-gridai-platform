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
import { useTheme } from '../../hooks/useTheme';

const COLORS = {
  amber: '#F59E0B',
  green: '#10B981',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs shadow-lg">
      <p className="text-text-muted dark:text-text-muted-dark mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-semibold text-slate-900 dark:text-white tabular-nums">
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
  const { isDark } = useTheme();
  const grid = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const text = isDark ? '#94A3B8' : '#64748B';

  return (
    <div className="glass-card p-4 sm:p-6" data-testid="cost-revenue-chart">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight mb-4">
        Cost vs Revenue per Video
      </h3>
      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis
              dataKey="title"
              tick={{ fontSize: 11, fill: text }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12, fill: text }}
              tickFormatter={(val) => `$${val}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" />
            <Bar dataKey="cost" name="Cost" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
            <Bar dataKey="revenue" name="Revenue" fill={COLORS.green} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
