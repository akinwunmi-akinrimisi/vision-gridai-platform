import { useState } from 'react';
import { MessageCircle, HelpCircle, Users, ChevronDown, ChevronUp } from 'lucide-react';

const SOURCE_CONFIG = {
  reddit: { icon: MessageCircle, label: 'Reddit', color: 'text-warning' },
  quora: { icon: HelpCircle, label: 'Quora', color: 'text-danger' },
  forums: { icon: Users, label: 'Forums', color: 'text-info' },
};

/**
 * Audience pain points grouped by source (Reddit, Quora, Forums).
 * Tags use warning color: bg-warning-bg text-warning.
 * @param {Object} painPoints - { reddit: [...], quora: [...], forums: [...] }
 */
export default function PainPoints({ painPoints }) {
  const [expanded, setExpanded] = useState({});

  const sources = painPoints
    ? Object.entries(painPoints).filter(([, items]) => Array.isArray(items) && items.length > 0)
    : [];

  if (sources.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MessageCircle className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Audience Pain Points</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">No pain point data yet</p>
      </div>
    );
  }

  const toggleSource = (source) => {
    setExpanded((prev) => ({ ...prev, [source]: !prev[source] }));
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-warning" />
        <h3 className="text-sm font-semibold">Audience Pain Points</h3>
      </div>

      <div className="space-y-4">
        {sources.map(([source, items]) => {
          const config = SOURCE_CONFIG[source] || {
            icon: MessageCircle,
            label: source,
            color: 'text-muted-foreground',
          };
          const Icon = config.icon;
          const isExpanded = expanded[source];
          const displayItems = isExpanded ? items : items.slice(0, 3);

          return (
            <div key={source}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {config.label}
                </span>
                <span className="text-2xs text-muted-foreground">
                  ({items.length})
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 pl-1">
                {displayItems.map((point, i) => {
                  const text = typeof point === 'string' ? point : point.text || point.question || point.complaint || JSON.stringify(point);
                  return (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-warning-bg text-warning"
                    >
                      {text}
                    </span>
                  );
                })}
              </div>

              {items.length > 3 && (
                <button
                  onClick={() => toggleSource(source)}
                  className="mt-2 ml-1 flex items-center gap-1 text-2xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
