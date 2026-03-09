import { X, ListOrdered } from 'lucide-react';

/**
 * Compact queue list of upcoming topics, styled like a playlist.
 */
export default function QueueList({ queuedTopics = [], onRemove }) {
  return (
    <div data-testid="queue-list" className="glass-card p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <ListOrdered className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Queue
        </h3>
        <span className="text-xs text-text-muted dark:text-text-muted-dark">
          ({queuedTopics.length} topic{queuedTopics.length !== 1 ? 's' : ''})
        </span>
      </div>

      {queuedTopics.length === 0 ? (
        <p className="text-xs text-text-muted dark:text-text-muted-dark">Queue empty</p>
      ) : (
        <div className="space-y-1.5">
          {queuedTopics.map((topic, idx) => (
            <div
              key={topic.id}
              className="
                flex items-center gap-3 px-3 py-2 rounded-lg
                bg-slate-50 dark:bg-white/[0.03]
                hover:bg-slate-100 dark:hover:bg-white/[0.05]
                transition-colors duration-150 group
              "
            >
              <span className="text-[10px] font-bold text-text-muted dark:text-text-muted-dark tabular-nums w-5">
                {idx + 1}
              </span>
              <span className="badge badge-primary text-[9px] px-1.5 py-0.5">
                #{topic.topic_number}
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-1 truncate">
                {(topic.seo_title || 'Untitled').slice(0, 40)}
                {(topic.seo_title || '').length > 40 ? '...' : ''}
              </span>
              {onRemove && (
                <button
                  onClick={() => onRemove(topic.id)}
                  className="
                    p-1 rounded-md opacity-0 group-hover:opacity-100
                    hover:bg-red-100 dark:hover:bg-red-900/20
                    transition-all duration-200 cursor-pointer
                  "
                  title="Remove from queue"
                >
                  <X className="w-3.5 h-3.5 text-red-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
