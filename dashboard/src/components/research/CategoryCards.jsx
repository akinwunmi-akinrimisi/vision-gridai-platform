import { Trophy, Flame, BarChart3, ArrowRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const RANK_STYLES = {
  1: { bg: 'bg-accent/10 border-accent/30', badge: 'bg-accent text-background', icon: Trophy },
  2: { bg: 'bg-muted border-border-hover', badge: 'bg-muted-foreground text-background', icon: Trophy },
  3: { bg: 'bg-warning-bg border-warning-border', badge: 'bg-warning text-background', icon: Trophy },
};

/**
 * Displays ranked category cards from AI categorization results.
 * Each card shows rank, label, summary, engagement metrics, and a CTA.
 */
export default function CategoryCards({ categories, onUseTopic }) {
  if (!categories || categories.length === 0) return null;

  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Top Categories
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((cat, i) => {
          const rank = cat.rank || i + 1;
          const style = RANK_STYLES[rank] || {
            bg: 'bg-card border-border',
            badge: 'bg-muted text-foreground',
            icon: BarChart3,
          };
          const RankIcon = style.icon;
          const engagement = cat.total_engagement || 0;
          const isHot = engagement > 1000;

          return (
            <div
              key={cat.id || i}
              className={cn(
                'rounded-xl border p-4 transition-all hover:shadow-md',
                style.bg,
              )}
            >
              {/* Rank badge + engagement */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                    style.badge,
                  )}
                >
                  <RankIcon className="w-3 h-3" />
                  #{rank}
                </span>
                <div className="flex items-center gap-2">
                  {isHot && <Flame className="w-3 h-3 text-danger" />}
                  {engagement > 0 && (
                    <span className="text-[10px] text-muted-foreground tabular-nums font-mono">
                      {engagement.toLocaleString()} engagement
                    </span>
                  )}
                </div>
              </div>

              {/* Label */}
              <h3 className="text-sm font-semibold leading-tight mb-1.5 line-clamp-2">
                {cat.label}
              </h3>

              {/* Summary */}
              {cat.summary && (
                <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-3">
                  {cat.summary}
                </p>
              )}

              {/* Suggested video title */}
              {cat.top_video_title && (
                <div className="bg-background/50 rounded-md px-2.5 py-1.5 mb-3 border border-border/50">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Suggested Video</p>
                  <p className="text-xs font-medium leading-snug line-clamp-2">
                    {cat.top_video_title}
                  </p>
                </div>
              )}

              {/* Metrics row */}
              <div className="flex items-center gap-3 mb-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {cat.result_count || 0} results
                </span>
              </div>

              {/* CTA */}
              {onUseTopic && (
                <div className="pt-2 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-primary hover:text-primary-hover w-full justify-between"
                    onClick={() => onUseTopic(cat)}
                  >
                    Use This Topic
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
