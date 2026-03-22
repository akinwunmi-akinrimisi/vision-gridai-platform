import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import SidePanel from '../ui/SidePanel';

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
  const [showHistory, setShowHistory] = useState(false);

  const isOpen = !!topic;
  const history = topic?.refinement_history || [];

  const handleSubmit = () => {
    if (!instructions.trim()) return;
    onSubmit(instructions.trim());
    setInstructions('');
  };

  const handleClose = () => {
    setInstructions('');
    setShowHistory(false);
    onClose();
  };

  return (
    <SidePanel isOpen={isOpen} onClose={handleClose} title="Refine Topic">
      {topic && (
        <div className="space-y-5">
          {/* Topic summary */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-border/30 dark:border-white/[0.04]">
            <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              {topic.seo_title || topic.original_title}
            </p>
            <div className="flex items-center gap-2 text-xs text-text-muted dark:text-text-muted-dark">
              <span className={`badge ${topic.review_status === 'approved' ? 'badge-green' : topic.review_status === 'rejected' ? 'badge-red' : 'badge-amber'}`}>
                {topic.review_status}
              </span>
              <span>{topic.playlist_angle}</span>
            </div>
          </div>

          {/* Previous Refinements */}
          <div>
            <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Previous Refinements
            </h4>
            {history.length === 0 ? (
              <p className="text-xs text-text-muted dark:text-text-muted-dark italic">
                No previous refinements
              </p>
            ) : (
              <div className="space-y-2 mb-3">
                {history.map((entry, i) => {
                  const ts = entry.timestamp
                    ? formatRelTime(entry.timestamp)
                    : `Refinement ${i + 1}`;
                  const instruction = entry.instruction || '';
                  const truncated = instruction.length > 120 ? instruction.slice(0, 120) + '...' : instruction;
                  const resultTitle = entry.result_title || (entry.result && typeof entry.result === 'string' ? entry.result.slice(0, 60) : null);
                  return (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-border/20 dark:border-white/[0.03] text-xs">
                      <p className="text-text-muted dark:text-text-muted-dark mb-1">{ts}</p>
                      <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">{truncated}</p>
                      {resultTitle && (
                        <p className="text-slate-500 dark:text-slate-400 truncate">
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Refinement Instructions
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={isLoading}
              rows={5}
              placeholder="e.g., Make this more focused on millennials, change the angle from investigative to data-driven..."
              className="w-full px-4 py-2.5 rounded-xl text-sm resize-none
                bg-white dark:bg-slate-800 border border-border dark:border-slate-700
                text-slate-900 dark:text-white placeholder:text-slate-400
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                disabled:opacity-50 transition-all duration-200"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!instructions.trim() || isLoading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              text-white bg-gradient-to-r from-primary to-indigo-600
              shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
              transition-all duration-200 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Refining...
              </>
            ) : (
              'Submit Refinement'
            )}
          </button>
        </div>
      )}
    </SidePanel>
  );
}
