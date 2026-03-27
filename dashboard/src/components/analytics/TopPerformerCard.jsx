import { Trophy, Eye, Clock, DollarSign, MousePointerClick } from 'lucide-react';
import HeroCard from '../shared/HeroCard';

/**
 * Highlight card for the top performing video by views.
 * Uses shared HeroCard with amber accent gradient.
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
    <HeroCard>
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-primary" />
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Top Performer
        </h3>
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
        {topic.thumbnail_url && (
          <img
            src={topic.thumbnail_url}
            alt=""
            className="w-full sm:w-20 h-32 sm:h-12 rounded-lg object-cover flex-shrink-0"
          />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate mb-3">
            {topic.seo_title || topic.original_title || `Topic #${topic.topic_number}`}
          </p>

          <div className="flex flex-wrap gap-2">
            {stats.map((s) => (
              <div
                key={s.label}
                className="inline-flex items-center gap-1.5 bg-muted rounded-md px-2 py-1 text-xs"
              >
                <s.icon className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground hidden sm:inline">{s.label}:</span>
                <span className="font-semibold tabular-nums text-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </HeroCard>
  );
}
