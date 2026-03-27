import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import SidePanel from '../ui/SidePanel';
import StatusBadge from '../shared/StatusBadge';

function formatRelTime(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function RefinePanel({ topic, onClose, onSubmit, isLoading }) {
  const [instructions, setInstructions] = useState('');

  const isOpen = !!topic;
  const history = topic?.refinement_history || [];

  const handleSubmit = () => {
    if (!instructions.trim()) return;
    onSubmit(instructions.trim());
    setInstructions('');
  };

  const handleClose = () => {
    setInstructions('');
    onClose();
  };

  return (
    <SidePanel isOpen={isOpen} onClose={handleClose} title="Refine Topic">
      {topic && (
        <div className="space-y-5">
          {/* Topic summary */}
          <div className="bg-muted border border-border rounded-lg p-3.5">
            <p className="text-sm font-semibold mb-1.5">
              {topic.seo_title || topic.original_title}
            </p>
            <div className="flex items-center gap-2">
              <StatusBadge status={topic.review_status} />
              <span className="text-xs text-muted-foreground">{topic.playlist_angle}</span>
            </div>
          </div>

          {/* Previous refinements */}
          <div>
            <h4 className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-2">
              Previous Refinements
            </h4>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No previous refinements
              </p>
            ) : (
              <div className="space-y-2">
                {history.map((entry, i) => {
                  const ts = entry.timestamp
                    ? formatRelTime(entry.timestamp)
                    : `Refinement ${i + 1}`;
                  const instruction = entry.instruction || '';
                  const truncated = instruction.length > 120 ? instruction.slice(0, 120) + '...' : instruction;
                  const resultTitle = entry.result_title || (entry.result && typeof entry.result === 'string' ? entry.result.slice(0, 60) : null);
                  return (
                    <div key={i} className="bg-muted border border-border rounded-lg p-3 text-xs">
                      <p className="text-muted-foreground mb-1">{ts}</p>
                      <p className="font-medium mb-1">{truncated}</p>
                      {resultTitle && (
                        <p className="text-muted-foreground truncate">
                          Result: {resultTitle}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1.5">
              Refinement Instructions
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={isLoading}
              rows={5}
              placeholder="e.g., Make this more focused on millennials, change the angle from investigative to data-driven..."
              className="w-full px-3 py-2.5 rounded-lg text-sm bg-muted border border-border
                text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40
                disabled:opacity-50 transition-all resize-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!instructions.trim() || isLoading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold
              bg-primary text-primary-foreground hover:bg-primary-hover
              transition-colors cursor-pointer shadow-glow-primary
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Refining...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Refinement
              </>
            )}
          </button>
        </div>
      )}
    </SidePanel>
  );
}
