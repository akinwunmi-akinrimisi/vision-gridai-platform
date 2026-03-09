import { useState, useMemo } from 'react';
import { Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Modal from '../ui/Modal';

/**
 * BatchPublishDialog -- Dialog for batch publishing multiple approved videos.
 * Shows list of approved videos with checkboxes, quota warning, and confirm button.
 *
 * @param {boolean} open - Whether dialog is visible
 * @param {Function} onClose - Close handler
 * @param {Array} topics - Array of topics with video_review_status='approved'
 * @param {number} quotaRemaining - Number of uploads remaining today (out of 6)
 * @param {Function} onConfirm - Called with array of selected topic IDs
 * @param {boolean} loading - Whether batch publish is in progress
 */
export default function BatchPublishDialog({ open, onClose, topics = [], quotaRemaining = 6, onConfirm, loading = false }) {
  const [selected, setSelected] = useState(() => new Set((topics || []).map((t) => t.id)));

  // Reset selection when topics change
  useMemo(() => {
    setSelected(new Set((topics || []).map((t) => t.id)));
  }, [topics]);

  const selectedCount = selected.size;
  const exceedsQuota = selectedCount > quotaRemaining;

  const totalCost = useMemo(() => {
    return (topics || [])
      .filter((t) => selected.has(t.id))
      .reduce((sum, t) => sum + (t.total_cost || 0), 0);
  }, [topics, selected]);

  function toggleTopic(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selectedCount === topics.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(topics.map((t) => t.id)));
    }
  }

  function handleConfirm() {
    const ids = Array.from(selected);
    if (ids.length > 0 && onConfirm) {
      onConfirm(ids);
    }
  }

  function truncate(str, max = 50) {
    if (!str) return 'Untitled';
    return str.length > max ? str.slice(0, max) + '...' : str;
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Publish All Approved Videos" maxWidth="max-w-lg">
      <div className="space-y-4" data-testid="batch-publish-dialog">
        {/* Quota status */}
        <div className="flex items-center gap-2 text-sm">
          <Upload className="w-4 h-4 text-text-muted dark:text-text-muted-dark" />
          <span className="text-slate-600 dark:text-slate-300">
            <span className="font-semibold tabular-nums">{quotaRemaining}</span> of 6 daily uploads remaining
          </span>
        </div>

        {/* Quota warning */}
        {exceedsQuota && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Only {quotaRemaining} video{quotaRemaining !== 1 ? 's' : ''} can upload publicly today.
              Remaining will upload as private and transition to public tomorrow.
            </p>
          </div>
        )}

        {/* Select all / none toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={toggleAll}
            className="text-xs font-medium text-primary dark:text-blue-400 hover:underline cursor-pointer"
          >
            {selectedCount === topics.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-xs text-text-muted dark:text-text-muted-dark">
            {selectedCount} selected
          </span>
        </div>

        {/* Video list with checkboxes */}
        <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-thin">
          {(topics || []).map((topic) => (
            <label
              key={topic.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(topic.id)}
                onChange={() => toggleTopic(topic.id)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary/30 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                    #{topic.topic_number}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {truncate(topic.seo_title || topic.original_title)}
                  </span>
                </div>
              </div>
              {topic.total_cost > 0 && (
                <span className="text-xs text-text-muted dark:text-text-muted-dark tabular-nums flex-shrink-0">
                  ${topic.total_cost.toFixed(2)}
                </span>
              )}
            </label>
          ))}
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50 dark:border-white/[0.06]">
          <span className="text-xs text-text-muted dark:text-text-muted-dark">
            Combined cost: <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">${totalCost.toFixed(2)}</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="
              px-4 py-2.5 rounded-xl text-sm font-medium
              text-slate-600 dark:text-slate-300
              bg-slate-100 dark:bg-white/[0.06]
              hover:bg-slate-200 dark:hover:bg-white/[0.1]
              border border-border/50 dark:border-white/[0.06]
              transition-all duration-200 cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || selectedCount === 0}
            className="
              px-4 py-2.5 rounded-xl text-sm font-semibold
              bg-gradient-to-r from-emerald-500 to-emerald-600 text-white
              shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30
              transition-all duration-200 cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Publishing...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Publish {selectedCount} Video{selectedCount !== 1 ? 's' : ''}
              </span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
