import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const ROLLBACK_OPTIONS = [
  {
    value: 'assembly',
    label: 'Assembly only',
    description: 'Re-run FFmpeg with existing assets (free)',
  },
  {
    value: 'visuals',
    label: 'Visuals + assembly',
    description: 'Keep audio, redo images/video/assembly (~$15)',
  },
  {
    value: 'full',
    label: 'Full re-production',
    description: 'Start from TTS (~$17)',
  },
];

/**
 * Gate 3 reject dialog with feedback textarea and rollback stage selection.
 */
export default function RejectDialog({ isOpen, onClose, onConfirm, loading }) {
  const [feedback, setFeedback] = useState('');
  const [rollbackStage, setRollbackStage] = useState('assembly');

  const handleConfirm = () => {
    onConfirm({ feedback, rollbackStage });
    setFeedback('');
    setRollbackStage('assembly');
  };

  const handleClose = () => {
    setFeedback('');
    setRollbackStage('assembly');
    onClose();
  };

  const isValid = feedback.trim().length >= 10;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reject Video</DialogTitle>
          <DialogDescription>
            Provide feedback and choose how far back to roll production.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Feedback */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              What needs to change? <span className="text-danger">(required, min 10 chars)</span>
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              placeholder="Describe what needs to be fixed..."
              className="resize-none"
              data-testid="reject-feedback"
            />
            {feedback.length > 0 && feedback.trim().length < 10 && (
              <p className="text-[10px] text-danger mt-1">
                {10 - feedback.trim().length} more characters needed
              </p>
            )}
          </div>

          {/* Rollback stage */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Rollback to
            </label>
            <div className="space-y-2">
              {ROLLBACK_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    rollbackStage === option.value
                      ? 'border-danger bg-danger-bg'
                      : 'border-border hover:border-border-hover hover:bg-card-hover'
                  }`}
                >
                  <input
                    type="radio"
                    name="rollback-stage"
                    value={option.value}
                    checked={rollbackStage === option.value}
                    onChange={() => setRollbackStage(option.value)}
                    className="mt-0.5 accent-destructive cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-medium">
                      {option.label}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !isValid}
            className="gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Reject & Rollback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
