import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';

const COLORS = {
  green: '#10B981',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs shadow-lg">
      <p className="text-text-muted dark:text-text-muted-dark mb-1">{label}</p>
      <p className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
        ${payload[0].value.toFixed(2)}
      </p>
    </div>
  );
}

/**
 * Line chart showing revenue over time.
 * @param {{ data: Array<{ date: string, revenue: number }> }} props
 */
export default function RevenueChart({ data }) {
  const { isDark } = useTheme();
  const grid = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const text = isDark ? '#94A3B8' : '#64748B';

  return (
    <div className="glass-card p-4 sm:p-6">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight mb-4">
        Revenue Over Time
      </h3>
      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: text }} />
            <YAxis
              tick={{ fontSize: 12, fill: text }}
              tickFormatter={(val) => `$${val}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={COLORS.green}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
