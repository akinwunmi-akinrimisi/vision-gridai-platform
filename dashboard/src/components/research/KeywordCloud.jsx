import { Tag } from 'lucide-react';

const CATEGORY_COLORS = {
  high_volume: { badge: 'bg-warning-bg text-warning border border-warning-border', size: 'text-sm' },
  low_competition: { badge: 'bg-success-bg text-success border border-success-border', size: 'text-xs' },
  trending: { badge: 'bg-info-bg text-info border border-info-border', size: 'text-[11px]' },
};

const CATEGORY_LABELS = {
  high_volume: 'High Volume',
  low_competition: 'Low Competition',
  trending: 'Trending',
};

/**
 * Keyword research as visual cloud with differently-sized text.
 * high_volume = amber/warning (larger), low_competition = success, trending = info.
 * @param {Object} keywords - { high_volume: [...], low_competition: [...], trending: [...] }
 */
export default function KeywordCloud({ keywords }) {
  const categories = keywords
    ? Object.entries(keywords).filter(([, items]) => Array.isArray(items) && items.length > 0)
    : [];

  if (categories.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Tag className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Keyword Research</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">No keyword data yet</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-4 h-4 text-success" />
        <h3 className="text-sm font-semibold">Keyword Research</h3>
      </div>

      <div className="space-y-3">
        {categories.map(([category, items]) => {
          const config = CATEGORY_COLORS[category] || CATEGORY_COLORS.trending;
          const label = CATEGORY_LABELS[category] || category;

          return (
            <div key={category}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                {label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((keyword, i) => {
                  const text = typeof keyword === 'string' ? keyword : keyword.keyword || keyword.term || JSON.stringify(keyword);
                  return (
                    <span
                      key={i}
                      className={`inline-flex items-center px-2 py-0.5 rounded-sm font-medium ${config.badge} ${config.size}`}
                    >
                      {text}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
