import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Compass, Loader2 } from 'lucide-react';
import { useTrafficSourceAggregation } from '../../hooks/useAnalyticsIntelligence';

const SOURCES = [
  { key: 'homepage', label: 'Homepage', color: '#FBBF24' },
  { key: 'search', label: 'Search', color: '#34D399' },
  { key: 'suggested', label: 'Suggested', color: '#A78BFA' },
  { key: 'external', label: 'External', color: '#F59E0B' },
  { key: 'other', label: 'Other', color: '#71717A' },
];

function TTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">
        {p.name}:{' '}
        <span className="tabular-nums">{p.value.toFixed(1)}%</span>
      </p>
    </div>
  );
}

function buildInsight(shares, totalWeight) {
  if (!shares || totalWeight === 0) return null;
  const homepage = shares.homepage;
  const search = shares.search;
  // Thresholds operate on 0-1 share values.
  if (homepage >= 0.6) {
    return {
      tone: 'success',
      text: 'Algorithm healthy \u2014 home feed is carrying you.',
    };
  }
  if (search >= 0.6) {
    return {
      tone: 'accent',
      text: 'SEO-dependent \u2014 good long-term, algorithm-fragile.',
    };
  }
  if (homepage < 0.05) {
    return {
      tone: 'danger',
      text: "Packaging issue \u2014 thumbnails/titles aren't earning algorithmic push.",
    };
  }
  return null;
}

/**
 * Aggregates yt_traffic_source_breakdown across a project's topics,
 * weighted by yt_views so larger videos dominate the mix.
 */
export default function TrafficSourceDonut({ projectId }) {
  const { data: rows = [], isLoading } = useTrafficSourceAggregation(projectId);

  const { data, hasData, insight } = useMemo(() => {
    const accum = { homepage: 0, search: 0, suggested: 0, external: 0, other: 0 };
    let totalWeight = 0;
    for (const r of rows || []) {
      if (!r.yt_traffic_source_breakdown) continue;
      const breakdown =
        typeof r.yt_traffic_source_breakdown === 'string'
          ? JSON.parse(r.yt_traffic_source_breakdown)
          : r.yt_traffic_source_breakdown;
      if (!breakdown || typeof breakdown !== 'object') continue;
      const w = r.yt_views && r.yt_views > 0 ? r.yt_views : 1;
      for (const k of Object.keys(accum)) {
        accum[k] += (breakdown[k] || 0) * w;
      }
      totalWeight += w;
    }
    if (totalWeight === 0) {
      return { data: [], hasData: false, insight: null };
    }
    const shares = {};
    for (const k of Object.keys(accum)) shares[k] = accum[k] / totalWeight;

    const chart = SOURCES.map((s) => ({
      name: s.label,
      key: s.key,
      value: Math.max(0, shares[s.key] * 100),
      color: s.color,
    })).filter((s) => s.value > 0);

    return { data: chart, hasData: true, insight: buildInsight(shares, totalWeight) };
  }, [rows]);

  return (
    <div
      className="bg-card border border-border rounded-xl p-4 sm:p-6"
      data-testid="traffic-source-donut"
    >
      <div className="flex items-center gap-2 mb-4">
        <Compass className="w-4 h-4 text-accent" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Traffic Sources
        </h3>
      </div>

      {isLoading && (
        <div className="h-48 sm:h-64 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && !hasData && (
        <div className="h-48 sm:h-64 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">
            No traffic source data yet
          </p>
        </div>
      )}

      {!isLoading && hasData && (
        <>
          <div className="h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={78}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<TTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {insight && (
            <div
              className={`mt-3 px-3 py-2 rounded-md text-xs border ${
                insight.tone === 'success'
                  ? 'bg-success-bg border-success-border text-success'
                  : insight.tone === 'danger'
                    ? 'bg-danger-bg border-danger-border text-danger'
                    : 'bg-accent/10 border-border-accent text-accent'
              }`}
            >
              {insight.text}
            </div>
          )}
        </>
      )}
    </div>
  );
}
