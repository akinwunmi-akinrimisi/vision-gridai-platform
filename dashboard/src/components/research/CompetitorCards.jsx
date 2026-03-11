import { useState } from 'react';
import { Users, Eye, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';

/**
 * Competitor audit channel cards.
 * Shows channel name, subscriber count, avg views, coverage tags (blue), gap tags (green).
 * @param {Object} competitors - { channels: Array, top_videos?: Array, gaps?: Array }
 */
export default function CompetitorCards({ competitors }) {
  const [expanded, setExpanded] = useState(false);

  const channels = competitors?.channels || [];

  if (channels.length === 0) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1">
          <TrendingUp className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Competitor Audit</h3>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">No competitor data yet</p>
      </div>
    );
  }

  const displayChannels = expanded ? channels : channels.slice(0, 4);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Competitor Audit
          </h3>
          <span className="badge badge-blue">{channels.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {displayChannels.map((channel, i) => (
          <div
            key={i}
            className="card-elevated p-3"
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5 truncate">
              {channel.name || channel.channel_name || `Channel ${i + 1}`}
            </p>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-2.5">
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
                  <span key={j} className="badge badge-blue text-[10px]">{tag}</span>
                ))}
              </div>
            )}

            {/* Gap tags (what they miss) */}
            {(channel.gaps || channel.missing_topics) && (
              <div className="flex flex-wrap gap-1">
                {(channel.gaps || channel.missing_topics || []).slice(0, 3).map((tag, j) => (
                  <span key={j} className="badge badge-green text-[10px]">{tag}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {channels.length > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="btn-ghost btn-sm mt-3"
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
