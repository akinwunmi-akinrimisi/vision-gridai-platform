import { Tag } from 'lucide-react';

const CATEGORY_STYLES = {
  high_volume: 'badge-blue',
  low_competition: 'badge-green',
  trending: 'badge-amber',
};

const CATEGORY_LABELS = {
  high_volume: 'High Volume',
  low_competition: 'Low Competition',
  trending: 'Trending',
};

/**
 * Keyword research displayed as colored tag cloud.
 * high_volume=blue, low_competition=green, trending=amber.
 * @param {Object} keywords - { high_volume: [...], low_competition: [...], trending: [...] }
 */
export default function KeywordCloud({ keywords }) {
  const categories = keywords
    ? Object.entries(keywords).filter(([, items]) => Array.isArray(items) && items.length > 0)
    : [];

  if (categories.length === 0) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <Tag className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Keyword Research</h3>
        </div>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">No keyword data yet</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Tag className="w-4 h-4 text-green-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Keyword Research
        </h3>
      </div>

      <div className="space-y-3">
        {categories.map(([category, items]) => {
          const badgeClass = CATEGORY_STYLES[category] || 'badge-blue';
          const label = CATEGORY_LABELS[category] || category;

          return (
            <div key={category}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                {label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((keyword, i) => {
                  const text = typeof keyword === 'string' ? keyword : keyword.keyword || keyword.term || JSON.stringify(keyword);
                  return (
                    <span key={i} className={`badge ${badgeClass} text-[10px]`}>
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
