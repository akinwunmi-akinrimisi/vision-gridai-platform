import { useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog';

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
    <ConfirmDialog
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title="Reject Video"
      confirmText="Reject & Rollback"
      confirmVariant="danger"
      loading={loading}
    >
      <div className="space-y-4 mt-1">
        {/* Feedback */}
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
            What needs to change? <span className="text-red-400">(required, min 10 chars)</span>
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            placeholder="Describe what needs to be fixed..."
            className="w-full px-3 py-2 rounded-lg text-sm resize-none bg-slate-50 dark:bg-slate-800 border border-border dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            data-testid="reject-feedback"
          />
          {feedback.length > 0 && feedback.trim().length < 10 && (
            <p className="text-[10px] text-red-400 mt-1">
              {10 - feedback.trim().length} more characters needed
            </p>
          )}
        </div>

        {/* Rollback stage */}
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 block">
            Rollback to
          </label>
          <div className="space-y-2">
            {ROLLBACK_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  rollbackStage === option.value
                    ? 'border-red-300 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/[0.05]'
                    : 'border-border/50 dark:border-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                }`}
              >
                <input
                  type="radio"
                  name="rollback-stage"
                  value={option.value}
                  checked={rollbackStage === option.value}
                  onChange={() => setRollbackStage(option.value)}
                  className="mt-0.5 accent-red-500 cursor-pointer"
                />
                <div>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {option.label}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {option.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </ConfirmDialog>
  );
}
