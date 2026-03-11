import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { DollarSign } from 'lucide-react';

const STAGE_COLORS = {
  Script: '#3B82F6',
  TTS: '#8B5CF6',
  Images: '#10B981',
  I2V: '#F59E0B',
  T2V: '#EF4444',
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-900 dark:text-white tabular-nums">
        {payload[0].name}: ${payload[0].value.toFixed(2)}
      </p>
    </div>
  );
}

/**
 * Donut chart showing cost distribution by production stage.
 * @param {{ costBreakdown: { script: number, tts: number, images: number, i2v: number, t2v: number } }} props
 */
export default function CostDonut({ costBreakdown }) {
  const { isDark } = useTheme();

  if (!costBreakdown) {
    return (
      <div className="glass-card p-4 sm:p-6" data-testid="cost-donut">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight mb-4">
          Cost Distribution
        </h3>
        <div className="h-48 sm:h-64 flex items-center justify-center">
          <div className="text-center">
            <DollarSign className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-text-muted dark:text-text-muted-dark">
              No cost data yet
            </p>
          </div>
        </div>
      </div>
    );
  }

  const data = [
    { name: 'Script', value: costBreakdown.script || 0 },
    { name: 'TTS', value: costBreakdown.tts || 0 },
    { name: 'Images', value: costBreakdown.images || 0 },
    { name: 'I2V', value: costBreakdown.i2v || 0 },
    { name: 'T2V', value: costBreakdown.t2v || 0 },
  ].filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="glass-card p-4 sm:p-6" data-testid="cost-donut">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight mb-4">
          Cost Distribution
        </h3>
        <div className="h-48 sm:h-64 flex items-center justify-center">
          <p className="text-sm text-text-muted dark:text-text-muted-dark">No cost data yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6" data-testid="cost-donut">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight mb-4">
        Cost Distribution
      </h3>
      <div className="h-48 sm:h-64 relative">
        {/* Center total */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center">
            <p className="text-xs text-text-muted dark:text-text-muted-dark">Total</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
              ${total.toFixed(2)}
            </p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={90}
              dataKey="value"
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={STAGE_COLORS[entry.name]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              formatter={(value) => (
                <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
