import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

const CHART = {
  grid: 'rgba(255,255,255,0.04)',
  axis: '#71717A',
  quadrantText: 'rgba(255,255,255,0.35)',
};

// Deterministic color for each playlist angle.
const PALETTE = ['#FBBF24', '#A78BFA', '#34D399', '#F87171', '#60A5FA', '#F472B6'];

function getAngleColor(angle, angleList) {
  const idx = angleList.indexOf(angle || 'Unknown');
  return PALETTE[idx >= 0 ? idx % PALETTE.length : 0];
}

function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 text-xs shadow-lg max-w-[260px]">
      <p className="font-semibold text-foreground mb-1 line-clamp-2">
        #{p.topic_number} {p.seo_title || p.original_title}
      </p>
      <p className="text-muted-foreground">Angle: <span className="text-foreground">{p.playlist_angle || '\u2014'}</span></p>
      <p className="text-muted-foreground">
        Outlier: <span className="text-foreground font-mono tabular-nums">{p.outlier_score ?? '\u2014'}</span>
      </p>
      <p className="text-muted-foreground">
        SEO: <span className="text-foreground font-mono tabular-nums">{p.seo_score ?? '\u2014'}</span>
      </p>
      {p.seo_classification && (
        <p className="text-muted-foreground">
          Class: <span className="text-foreground">{p.seo_classification}</span>
        </p>
      )}
    </div>
  );
}

/**
 * Scatter chart plotting outlier_score (X) vs seo_score (Y).
 * Clicking a dot scrolls to the card with id topic-card-{topic_number}.
 *
 * @param {{ topics: Array }} props
 */
export default function TopicScatterChart({ topics }) {
  const data = useMemo(() => {
    return topics
      .filter((t) => t.outlier_score != null || t.seo_score != null)
      .map((t) => ({
        id: t.id,
        topic_number: t.topic_number,
        seo_title: t.seo_title,
        original_title: t.original_title,
        playlist_angle: t.playlist_angle,
        outlier_score: t.outlier_score ?? 50,
        seo_score: t.seo_score ?? 50,
        seo_classification: t.seo_classification,
      }));
  }, [topics]);

  const angles = useMemo(() => {
    const set = new Set(data.map((d) => d.playlist_angle || 'Unknown'));
    return Array.from(set);
  }, [data]);

  // Group data by playlist_angle so each angle is its own Scatter series (color)
  const byAngle = useMemo(() => {
    const map = new Map();
    for (const d of data) {
      const key = d.playlist_angle || 'Unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(d);
    }
    return Array.from(map.entries());
  }, [data]);

  const handleDotClick = (point) => {
    if (!point?.topic_number) return;
    const el = document.querySelector(`[data-testid="topic-card-${point.topic_number}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-primary');
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 1600);
    }
  };

  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No topics scored yet. Scatter plot will appear once outlier + SEO scoring completes.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Intelligence Map
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
          {angles.map((a) => (
            <span key={a} className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getAngleColor(a, angles) }}
              />
              {a}
            </span>
          ))}
        </div>
      </div>
      <div className="h-72 sm:h-80 relative">
        {/* Quadrant labels (absolute overlay) */}
        <div
          className="pointer-events-none absolute inset-0 z-10 text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: CHART.quadrantText }}
        >
          <span className="absolute top-3 right-4">Double threat</span>
          <span className="absolute top-3 left-4">SEO plays</span>
          <span className="absolute bottom-3 right-4">Momentum</span>
          <span className="absolute bottom-3 left-4">Avoid</span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 10 }}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="outlier_score"
              name="Outlier"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: CHART.axis }}
              label={{ value: 'Outlier Score', position: 'bottom', offset: 0, fontSize: 10, fill: CHART.axis }}
            />
            <YAxis
              type="number"
              dataKey="seo_score"
              name="SEO"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: CHART.axis }}
              label={{ value: 'SEO Score', angle: -90, position: 'insideLeft', fontSize: 10, fill: CHART.axis }}
            />
            <ZAxis range={[60, 60]} />
            <ReferenceLine x={50} stroke="rgba(255,255,255,0.08)" strokeDasharray="2 2" />
            <ReferenceLine y={50} stroke="rgba(255,255,255,0.08)" strokeDasharray="2 2" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ScatterTooltip />} />
            {byAngle.map(([angle, series]) => (
              <Scatter
                key={angle}
                name={angle}
                data={series}
                fill={getAngleColor(angle, angles)}
                onClick={handleDotClick}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
