import { Trophy, Eye, Clock, DollarSign, MousePointerClick } from 'lucide-react';

/**
 * Highlight card for the top performing video by views.
 * Shows gradient top border, thumbnail, title, and key metrics.
 *
 * @param {{ topic: object|null }} props
 */
export default function TopPerformerCard({ topic }) {
  if (!topic) return null;

  const stats = [
    {
      label: 'Views',
      value: (topic.yt_views || 0).toLocaleString(),
      icon: Eye,
    },
    {
      label: 'Watch Hours',
      value: `${parseFloat(topic.yt_watch_hours || 0).toFixed(1)}h`,
      icon: Clock,
    },
    {
      label: 'Revenue',
      value: `$${parseFloat(topic.yt_estimated_revenue || 0).toFixed(2)}`,
      icon: DollarSign,
    },
    {
      label: 'CTR',
      value: `${parseFloat(topic.yt_ctr || 0).toFixed(1)}%`,
      icon: MousePointerClick,
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl gradient-border-visible">
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Top Performer
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          {/* Thumbnail */}
          {topic.thumbnail_url && (
            <img
              src={topic.thumbnail_url}
              alt=""
              className="w-full sm:w-20 h-32 sm:h-12 rounded-lg object-cover flex-shrink-0"
            />
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate mb-3">
              {topic.seo_title || topic.original_title || `Topic #${topic.topic_number}`}
            </p>

            {/* Metric chips */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="badge badge-blue"
                >
                  <s.icon className="w-3 h-3 text-text-muted dark:text-text-muted-dark" />
                  <span className="text-text-muted dark:text-text-muted-dark hidden sm:inline">{s.label}:</span>
                  <span className="tabular-nums">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
