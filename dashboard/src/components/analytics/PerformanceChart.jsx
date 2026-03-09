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
  primary: '#2563EB',
  purple: '#8B5CF6',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs shadow-lg">
      <p className="text-text-muted dark:text-text-muted-dark mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-semibold text-slate-900 dark:text-white tabular-nums">
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
  const { isDark } = useTheme();
  const grid = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const text = isDark ? '#94A3B8' : '#64748B';

  return (
    <div className="glass-card p-6" data-testid="performance-chart">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight mb-4">
        CTR & Avg Duration per Video
      </h3>
      <div className="h-64">
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
            <YAxis tick={{ fontSize: 12, fill: text }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" />
            <Bar dataKey="ctr" name="CTR (%)" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
            <Bar dataKey="avgDuration" name="Avg Duration (s)" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
