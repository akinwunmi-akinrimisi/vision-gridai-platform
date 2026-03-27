import { useState } from 'react';
import { Users, Eye, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';

/**
 * Competitor audit channel cards.
 * Each competitor: channel name, sub count, gaps as small badges.
 * @param {Object} competitors - { channels: Array, top_videos?: Array, gaps?: Array }
 */
export default function CompetitorCards({ competitors }) {
  const [expanded, setExpanded] = useState(false);

  const channels = competitors?.channels || [];

  if (channels.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <TrendingUp className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Competitor Audit</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">No competitor data yet</p>
      </div>
    );
  }

  const displayChannels = expanded ? channels : channels.slice(0, 4);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-info" />
          <h3 className="text-sm font-semibold">Competitor Audit</h3>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-2xs font-medium bg-info-bg text-info border border-info-border">
            {channels.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
        {displayChannels.map((channel, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-3 hover:border-border-hover transition-colors"
          >
            <p className="text-sm font-semibold mb-1.5 truncate">
              {channel.name || channel.channel_name || `Channel ${i + 1}`}
            </p>

            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              {channel.subscribers && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {formatCount(channel.subscribers || channel.subscriber_count)}
                </span>
              )}
              {(channel.avg_views || channel.average_views) && (
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {formatCount(channel.avg_views || channel.average_views)} avg
                </span>
              )}
            </div>

            {/* Coverage tags (what they cover) */}
            {(channel.coverage || channel.topics_covered) && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {(channel.coverage || channel.topics_covered || []).slice(0, 3).map((tag, j) => (
                  <span key={j} className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-2xs font-medium bg-info-bg text-info border border-info-border">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Gap tags (what they miss) */}
            {(channel.gaps || channel.missing_topics) && (
              <div className="flex flex-wrap gap-1">
                {(channel.gaps || channel.missing_topics || []).slice(0, 3).map((tag, j) => (
                  <span key={j} className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-2xs font-medium bg-success-bg text-success border border-success-border">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {channels.length > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Show top 4 only
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Show all {channels.length} competitors
            </>
          )}
        </button>
      )}
    </div>
  );
}

function formatCount(num) {
  if (!num) return '';
  const n = typeof num === 'string' ? parseInt(num.replace(/[^0-9]/g, ''), 10) : num;
  if (isNaN(n)) return num;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
