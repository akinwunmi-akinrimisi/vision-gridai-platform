import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';

const COLORS = {
  primary: '#2563EB',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs shadow-lg">
      <p className="text-text-muted dark:text-text-muted-dark mb-1">{label}</p>
      <p className="font-semibold text-slate-900 dark:text-white tabular-nums">
        {payload[0].value.toLocaleString()} views
      </p>
    </div>
  );
}

/**
 * Area chart showing views over time.
 * @param {{ data: Array<{ date: string, views: number }> }} props
 */
export default function ViewsChart({ data }) {
  const { isDark } = useTheme();
  const grid = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const text = isDark ? '#94A3B8' : '#64748B';

  return (
    <div className="glass-card p-4 sm:p-6">
      <h3 className="section-title mb-4">
        Views Over Time
      </h3>
      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.2} />
                <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: text }} />
            <YAxis tick={{ fontSize: 12, fill: text }} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="views"
              stroke={COLORS.primary}
              fill="url(#viewsGradient)"
              fillOpacity={1}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
