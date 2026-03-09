import { useState } from 'react';
import { useQuotaStatus } from '../../hooks/useQuotaStatus';
import ConfirmDialog from '../ui/ConfirmDialog';

const OPTIONS = [
  {
    value: 'publish_now',
    label: 'Publish Now',
    description: 'Upload as public video immediately',
  },
  {
    value: 'schedule',
    label: 'Schedule',
    description: 'Upload as private, transition to public at scheduled time',
  },
  {
    value: 'approve_only',
    label: 'Approve Only',
    description: 'Mark approved without uploading. Publish later from batch publish.',
  },
];

const CONFIRM_TEXT = {
  publish_now: 'Publish Now',
  schedule: 'Schedule Upload',
  approve_only: 'Approve',
};

/**
 * Gate 3 publish dialog with three action options:
 * Publish Now, Schedule, or Approve Only.
 * Shows quota status and topic summary.
 */
export default function PublishDialog({
  isOpen,
  onClose,
  onConfirm,
  topic,
  projectId,
  loading,
}) {
  const [selectedAction, setSelectedAction] = useState('publish_now');
  const [scheduleTime, setScheduleTime] = useState('');
  const { remaining, isLoading: quotaLoading } = useQuotaStatus(projectId);

  const handleConfirm = () => {
    onConfirm({
      action: selectedAction,
      scheduleTime: selectedAction === 'schedule' ? scheduleTime : undefined,
    });
  };

  const isScheduleValid = selectedAction !== 'schedule' || scheduleTime;

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Publish Video"
      confirmText={CONFIRM_TEXT[selectedAction]}
      confirmVariant="success"
      loading={loading}
    >
      <div className="space-y-4 mt-1">
        {/* Topic summary */}
        <div className="rounded-lg bg-slate-50 dark:bg-white/[0.03] p-3 space-y-1">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {topic?.seo_title || topic?.original_title}
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>{topic?.scene_count || '-'} scenes</span>
            <span>${Number(topic?.total_cost || 0).toFixed(2)} cost</span>
          </div>
        </div>

        {/* Quota status */}
        <div className="text-xs">
          {quotaLoading ? (
            <span className="text-slate-400">Checking quota...</span>
          ) : remaining > 0 ? (
            <span className="text-slate-500 dark:text-slate-400" data-testid="quota-remaining">
              {remaining} uploads remaining today
            </span>
          ) : (
            <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/[0.08] border border-amber-200 dark:border-amber-500/20">
              <span className="text-amber-700 dark:text-amber-400 font-medium">
                Daily quota reached. Video will upload as private and transition to public tomorrow.
              </span>
            </div>
          )}
        </div>

        {/* Action options */}
        <div className="space-y-2">
          {OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                selectedAction === option.value
                  ? 'border-primary bg-primary/[0.04] dark:bg-primary/[0.08]'
                  : 'border-border/50 dark:border-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.03]'
              }`}
            >
              <input
                type="radio"
                name="publish-action"
                value={option.value}
                checked={selectedAction === option.value}
                onChange={() => setSelectedAction(option.value)}
                className="mt-0.5 accent-primary cursor-pointer"
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

        {/* Schedule time picker */}
        {selectedAction === 'schedule' && (
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
              Publish Date & Time
            </label>
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 border border-border dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
              data-testid="schedule-time-input"
            />
          </div>
        )}
      </div>
    </ConfirmDialog>
  );
}
