import { useState } from 'react';
import { MessageCircle, HelpCircle, Users, ChevronDown, ChevronUp } from 'lucide-react';

const SOURCE_CONFIG = {
  reddit: { icon: MessageCircle, label: 'Reddit', color: 'text-orange-500' },
  quora: { icon: HelpCircle, label: 'Quora', color: 'text-red-500' },
  forums: { icon: Users, label: 'Forums', color: 'text-blue-500' },
};

/**
 * Audience pain points grouped by source (Reddit, Quora, Forums).
 * Each pain point displayed as quoted block with left border accent.
 * @param {Object} painPoints - { reddit: [...], quora: [...], forums: [...] }
 */
export default function PainPoints({ painPoints }) {
  const [expanded, setExpanded] = useState({});

  const sources = painPoints
    ? Object.entries(painPoints).filter(([, items]) => Array.isArray(items) && items.length > 0)
    : [];

  if (sources.length === 0) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <MessageCircle className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Audience Pain Points</h3>
        </div>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">No pain point data yet</p>
      </div>
    );
  }

  const toggleSource = (source) => {
    setExpanded((prev) => ({ ...prev, [source]: !prev[source] }));
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Audience Pain Points
        </h3>
      </div>

      <div className="space-y-4">
        {sources.map(([source, items]) => {
          const config = SOURCE_CONFIG[source] || {
            icon: MessageCircle,
            label: source,
            color: 'text-slate-500',
          };
          const Icon = config.icon;
          const isExpanded = expanded[source];
          const displayItems = isExpanded ? items : items.slice(0, 3);

          return (
            <div key={source}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {config.label}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  ({items.length})
                </span>
              </div>

              <div className="space-y-2 pl-1">
                {displayItems.map((point, i) => {
                  const text = typeof point === 'string' ? point : point.text || point.question || point.complaint || JSON.stringify(point);
                  return (
                    <div
                      key={i}
                      className="border-l-2 border-blue-500/40 pl-3 py-1"
                    >
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                        "{text}"
                      </p>
                    </div>
                  );
                })}
              </div>

              {items.length > 3 && (
                <button
                  onClick={() => toggleSource(source)}
                  className="mt-2 ml-1 flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      +{items.length - 3} more
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
