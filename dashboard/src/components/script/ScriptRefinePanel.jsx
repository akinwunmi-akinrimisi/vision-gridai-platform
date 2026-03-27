import { useState } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import SidePanel from '../ui/SidePanel';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import StatusBadge from '../shared/StatusBadge';

/**
 * SidePanel for whole-script refinement with instructions + history.
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
          <div className="p-4 rounded-lg bg-muted border border-border">
            <p className="text-sm font-semibold mb-1">
              {topic.seo_title || topic.original_title}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <StatusBadge status="pending" label={topic.script_review_status || 'pending'} />
              <span>Score: {topic.script_quality_score ?? '--'}/10</span>
              <span>Attempt {topic.script_attempts || 0}/3</span>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Refinement Instructions
            </label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={isLoading}
              rows={5}
              placeholder="e.g., Strengthen the hook, add more data points in chapter 3, make the resolution more actionable..."
              className="bg-muted border-border resize-none"
            />
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Claude will regenerate the weakest pass incorporating your feedback.
            </p>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!instructions.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Refining...
              </>
            ) : (
              'Submit Refinement'
            )}
          </Button>

          {/* Refinement history */}
          {history.length > 0 && (
            <div>
              <button
                onClick={() => setShowHistory((prev) => !prev)}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                Refinement History ({history.length})
              </button>

              {showHistory && (
                <div className="mt-3 space-y-3">
                  {history.map((entry, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted border border-border text-xs">
                      <p className="text-muted-foreground mb-1">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : `Refinement ${i + 1}`}
                      </p>
                      <p className="font-medium mb-1">
                        {entry.instruction}
                      </p>
                      {entry.result && (
                        <p className="text-muted-foreground truncate">
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
