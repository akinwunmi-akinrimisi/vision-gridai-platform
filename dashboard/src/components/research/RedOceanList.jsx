import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Red ocean topics list -- collapsible via button toggle.
 * Topics as red badges: bg-danger-bg text-danger.
 * @param {Array} topics - Array of topic strings from project.niche_red_ocean_topics
 */
export default function RedOceanList({ topics = [] }) {
  const [open, setOpen] = useState(false);

  if (!topics || topics.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertTriangle className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Topics to Avoid</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">No red-ocean data yet</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full cursor-pointer group"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-danger" />
          <h3 className="text-sm font-semibold">Topics to Avoid</h3>
          <span className="text-2xs text-muted-foreground">({topics.length} oversaturated)</span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
      </button>

      {open && (
        <div className="flex flex-wrap gap-1.5 mt-3 animate-fade-in">
          {topics.map((topic, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium bg-danger-bg text-danger border border-danger-border"
            >
              {typeof topic === 'string' ? topic : topic.title || topic.name || JSON.stringify(topic)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
