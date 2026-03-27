import { useState } from 'react';
import { useQuotaStatus } from '../../hooks/useQuotaStatus';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publish Video</DialogTitle>
          <DialogDescription>
            Choose how to publish this video to YouTube.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Topic summary */}
          <div className="rounded-lg bg-muted p-3 space-y-1">
            <p className="text-sm font-medium truncate">
              {topic?.seo_title || topic?.original_title}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{topic?.scene_count || '-'} scenes</span>
              <span>${Number(topic?.total_cost || 0).toFixed(2)} cost</span>
            </div>
          </div>

          {/* Quota status */}
          <div className="text-xs">
            {quotaLoading ? (
              <span className="text-muted-foreground">Checking quota...</span>
            ) : remaining > 0 ? (
              <span className="text-muted-foreground" data-testid="quota-remaining">
                {remaining} uploads remaining today
              </span>
            ) : (
              <div className="px-3 py-2 rounded-lg bg-warning-bg border border-warning-border">
                <span className="text-warning font-medium">
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
                    ? 'border-primary bg-primary/[0.06]'
                    : 'border-border hover:border-border-hover hover:bg-card-hover'
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

          {/* Schedule time picker */}
          {selectedAction === 'schedule' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Publish Date & Time
              </label>
              <Input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                data-testid="schedule-time-input"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || (selectedAction === 'schedule' && !scheduleTime)}
            className="gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {CONFIRM_TEXT[selectedAction]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
