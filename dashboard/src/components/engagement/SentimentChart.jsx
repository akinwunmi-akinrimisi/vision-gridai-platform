import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';

// Neon Pipeline palette — matches design system
const SENTIMENT_COLORS = {
  Positive: '#34D399',   // success
  Negative: '#EF4444',   // danger
  Neutral: '#6B7280',    // muted-foreground
  Unanalyzed: '#374151', // muted
};

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground tabular-nums">
        {payload[0].name}: {payload[0].value}
      </p>
    </div>
  );
}

/**
 * Donut chart showing comment sentiment distribution.
 *
 * @param {{ positive: number, negative: number, neutral: number, unanalyzed: number, total: number }} props
 */
export default function SentimentChart({ positive = 0, negative = 0, neutral = 0, unanalyzed = 0, total = 0 }) {
  if (total === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Sentiment Breakdown
        </h3>
        <div className="h-48 sm:h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-2">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">No comment data yet</p>
          </div>
        </div>
      </div>
    );
  }

  const data = [
    { name: 'Positive', value: positive },
    { name: 'Negative', value: negative },
    { name: 'Neutral', value: neutral },
    { name: 'Unanalyzed', value: unanalyzed },
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Sentiment Breakdown
      </h3>
      <div className="h-48 sm:h-64 relative">
        {/* Center total */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-lg font-bold text-foreground tabular-nums">{total}</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={85}
              dataKey="value"
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: SENTIMENT_COLORS[entry.name] }}
            />
            <span className="text-xs text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
