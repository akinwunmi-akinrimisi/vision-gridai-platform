import { useState } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import SidePanel from '../ui/SidePanel';

/**
 * SidePanel for whole-script refinement with instructions + history.
 * Pattern follows RefinePanel.jsx for topics.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Whether panel is visible
 * @param {Function} props.onClose - Close handler
 * @param {object} props.topic - Topic data
 * @param {Function} props.onSubmit - Submit refinement instructions
 * @param {boolean} props.isLoading - Loading state
 */
export default function ScriptRefinePanel({ isOpen, onClose, topic, onSubmit, isLoading }) {
  const [instructions, setInstructions] = useState('');
  const [showHistory, setShowHistory] = useState(false);

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
    <SidePanel isOpen={isOpen} onClose={handleClose} title="Refine Script">
      {topic && (
        <div className="space-y-5">
          {/* Topic summary */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-border/30 dark:border-white/[0.04]">
            <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              {topic.seo_title || topic.original_title}
            </p>
            <div className="flex items-center gap-2 text-xs text-text-muted dark:text-text-muted-dark">
              <span className="badge badge-amber">
                {topic.script_review_status || 'pending'}
              </span>
              <span>Score: {topic.script_quality_score ?? '--'}/10</span>
              <span>Attempt {topic.script_attempts || 0}/3</span>
            </div>
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
              placeholder="e.g., Strengthen the hook, add more data points in chapter 3, make the resolution more actionable..."
              className="w-full px-4 py-2.5 rounded-xl text-sm resize-none
                bg-white dark:bg-slate-800 border border-border dark:border-slate-700
                text-slate-900 dark:text-white placeholder:text-slate-400
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                disabled:opacity-50 transition-all duration-200"
            />
            <p className="mt-1.5 text-[10px] text-text-muted dark:text-text-muted-dark">
              Claude will regenerate the weakest pass incorporating your feedback.
            </p>
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

          {/* Refinement history */}
          {history.length > 0 && (
            <div>
              <button
                onClick={() => setShowHistory((prev) => !prev)}
                className="flex items-center gap-2 text-xs font-medium text-text-muted dark:text-text-muted-dark hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                Refinement History ({history.length})
              </button>

              {showHistory && (
                <div className="mt-3 space-y-3">
                  {history.map((entry, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-border/20 dark:border-white/[0.03] text-xs">
                      <p className="text-text-muted dark:text-text-muted-dark mb-1">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : `Refinement ${i + 1}`}
                      </p>
                      <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {entry.instruction}
                      </p>
                      {entry.result && (
                        <p className="text-slate-500 dark:text-slate-400 truncate">
                          Result: {typeof entry.result === 'string' ? entry.result : JSON.stringify(entry.result)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </SidePanel>
  );
}
