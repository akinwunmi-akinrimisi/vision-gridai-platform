import { AlertTriangle } from 'lucide-react';

/**
 * Red ocean topics list with warning styling.
 * Shows oversaturated topics to avoid.
 * @param {Array} topics - Array of topic strings from project.niche_red_ocean_topics
 */
export default function RedOceanList({ topics = [] }) {
  if (!topics || topics.length === 0) {
    return (
      <div className="glass-card p-5 border border-red-500/10 dark:border-red-500/10">
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <AlertTriangle className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Topics to Avoid</h3>
        </div>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">No red-ocean data yet</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 border border-red-500/20 dark:border-red-500/15">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Topics to Avoid
        </h3>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">(Oversaturated)</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {topics.map((topic, i) => (
          <span
            key={i}
            className="badge badge-red text-[10px]"
          >
            {typeof topic === 'string' ? topic : topic.title || topic.name || JSON.stringify(topic)}
          </span>
        ))}
      </div>
    </div>
  );
}
