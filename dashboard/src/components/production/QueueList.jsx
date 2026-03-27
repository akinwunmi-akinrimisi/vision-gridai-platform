import { X, ListOrdered, Play } from 'lucide-react';

/**
 * Compact queue list of upcoming topics, styled like a playlist.
 */
export default function QueueList({ queuedTopics = [], onRemove }) {
  return (
    <div data-testid="queue-list" className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <ListOrdered className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">
          Queue
        </h3>
        <span className="text-xs text-muted-foreground">
          ({queuedTopics.length} topic{queuedTopics.length !== 1 ? 's' : ''})
        </span>
      </div>

      {queuedTopics.length === 0 ? (
        <p className="text-xs text-muted-foreground">Queue empty</p>
      ) : (
        <div className="space-y-1.5">
          {queuedTopics.map((topic, idx) => (
            <div
              key={topic.id}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 group
                ${idx === 0 ? 'bg-warning-bg border border-warning-border' : 'bg-muted/50 hover:bg-muted'}
              `}
            >
              {idx === 0 ? (
                <Play className="w-3 h-3 text-warning flex-shrink-0" />
              ) : (
                <span className="text-[10px] font-bold text-muted-foreground tabular-nums w-5">
                  {idx + 1}
                </span>
              )}
              <span className="text-2xs font-bold text-muted-foreground tabular-nums">
                #{topic.topic_number}
              </span>
              <span className={`text-xs font-medium flex-1 truncate ${
                idx === 0 ? 'text-foreground' : 'text-foreground/70'
              }`}>
                {(topic.seo_title || 'Untitled').slice(0, 40)}
                {(topic.seo_title || '').length > 40 ? '...' : ''}
              </span>
              {onRemove && (
                <button
                  onClick={() => onRemove(topic.id)}
                  className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-danger-bg transition-all duration-200 cursor-pointer"
                  title="Remove from queue"
                >
                  <X className="w-3.5 h-3.5 text-danger" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
