import { Flame, Target, Waves } from 'lucide-react';
import KPICard from '../shared/KPICard';

/**
 * Intelligence summary panel for Gate 1 Topic Review.
 * Shows avg outlier, avg SEO, blue-ocean count.
 *
 * @param {{ topics: Array, onToggleScatter?: Function, scatterOpen?: boolean }} props
 */
export default function IntelligenceScorePanel({ topics, onToggleScatter, scatterOpen }) {
  const scoredOutlier = topics.filter((t) => t.outlier_scored_at != null && t.outlier_score != null);
  const scoredSeo = topics.filter((t) => t.seo_scored_at != null && t.seo_score != null);

  const avgOutlier = scoredOutlier.length > 0
    ? Math.round(scoredOutlier.reduce((s, t) => s + t.outlier_score, 0) / scoredOutlier.length)
    : null;
  const avgSeo = scoredSeo.length > 0
    ? Math.round(scoredSeo.reduce((s, t) => s + t.seo_score, 0) / scoredSeo.length)
    : null;
  const blueOcean = topics.filter((t) => t.seo_classification === 'blue-ocean').length;

  // If nothing has been scored yet, don't render to avoid visual clutter.
  const anyScored = scoredOutlier.length > 0 || scoredSeo.length > 0;
  if (!anyScored) return null;

  return (
    <div className="mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
      <div className="stagger-1 animate-slide-up">
        <KPICard
          label="Avg Outlier Score"
          value={avgOutlier != null ? avgOutlier : '\u2014'}
          icon={Flame}
        />
      </div>
      <div className="stagger-2 animate-slide-up">
        <KPICard
          label="Avg SEO Score"
          value={avgSeo != null ? avgSeo : '\u2014'}
          icon={Target}
        />
      </div>
      <div className="stagger-3 animate-slide-up relative">
        <KPICard
          label="Blue-Ocean Topics"
          value={blueOcean}
          icon={Waves}
        />
        {onToggleScatter && (
          <button
            onClick={onToggleScatter}
            className="absolute top-3 right-3 text-[10px] font-medium text-muted-foreground
              hover:text-foreground transition-colors cursor-pointer px-2 py-1 rounded-md border border-border
              hover:border-border-hover bg-transparent"
          >
            {scatterOpen ? 'Hide map' : 'Show map'}
          </button>
        )}
      </div>
    </div>
  );
}
