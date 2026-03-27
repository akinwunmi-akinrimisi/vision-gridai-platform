import { useState, useMemo } from 'react';
import { Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publish All Approved Videos</DialogTitle>
          <DialogDescription>
            Select videos to batch publish to YouTube.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4" data-testid="batch-publish-dialog">
          {/* Quota status */}
          <div className="flex items-center gap-2 text-sm">
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground/80">
              <span className="font-semibold tabular-nums">{quotaRemaining}</span> of 6 daily uploads remaining
            </span>
          </div>

          {/* Quota warning */}
          {exceedsQuota && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning-bg border border-warning-border">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
              <p className="text-xs text-warning">
                Only {quotaRemaining} video{quotaRemaining !== 1 ? 's' : ''} can upload publicly today.
                Remaining will upload as private and transition to public tomorrow.
              </p>
            </div>
          )}

          {/* Select all / none toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={toggleAll}
              className="text-xs font-medium text-primary hover:text-primary-hover transition-colors cursor-pointer"
            >
              {selectedCount === topics.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs text-muted-foreground">
              {selectedCount} selected
            </span>
          </div>

          {/* Video list with checkboxes */}
          <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-thin">
            {(topics || []).map((topic) => (
              <label
                key={topic.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-card-hover transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(topic.id)}
                  onChange={() => toggleTopic(topic.id)}
                  className="w-4 h-4 rounded accent-primary cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">
                      #{topic.topic_number}
                    </span>
                    <span className="text-sm font-medium truncate">
                      {truncate(topic.seo_title || topic.original_title)}
                    </span>
                  </div>
                </div>
                {topic.total_cost > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                    ${topic.total_cost.toFixed(2)}
                  </span>
                )}
              </label>
            ))}
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Combined cost: <span className="font-semibold text-foreground tabular-nums">${totalCost.toFixed(2)}</span>
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || selectedCount === 0}
            className="gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Publish {selectedCount} Video{selectedCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
