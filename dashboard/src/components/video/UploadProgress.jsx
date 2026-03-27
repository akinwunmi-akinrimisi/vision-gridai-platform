import { Check, Circle, Loader2, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = [
  { key: 'uploading_video', label: 'Uploading video' },
  { key: 'setting_metadata', label: 'Setting metadata' },
  { key: 'uploading_captions', label: 'Uploading captions' },
  { key: 'setting_thumbnail', label: 'Setting thumbnail' },
  { key: 'assigning_playlist', label: 'Assigning playlist' },
];

/**
 * Multi-step upload progress tracker.
 * Shows checkmarks for complete, spinner for active, circles for pending.
 */
export default function UploadProgress({ publishProgress, onRetry }) {
  if (!publishProgress) return null;

  const isFailed = publishProgress === 'failed';
  const isComplete = publishProgress === 'complete';
  const activeIndex = STEPS.findIndex((s) => s.key === publishProgress);

  return (
    <div className="bg-card border border-border rounded-xl p-4" data-testid="upload-progress">
      <h3 className="text-sm font-semibold mb-3">
        {isComplete ? 'Published to YouTube' : isFailed ? 'Upload Failed' : 'Publishing to YouTube...'}
      </h3>

      <div className="space-y-2.5">
        {STEPS.map((step, i) => {
          let status = 'pending';
          if (isComplete) {
            status = 'complete';
          } else if (isFailed) {
            if (i < activeIndex || activeIndex === -1) status = 'complete';
            else if (i === activeIndex || (activeIndex === -1 && i === 0)) status = 'failed';
            else status = 'pending';
          } else if (activeIndex >= 0) {
            if (i < activeIndex) status = 'complete';
            else if (i === activeIndex) status = 'active';
          }

          return (
            <div key={step.key} className="flex items-center gap-3">
              <StepIcon status={status} />
              <span
                className={`text-sm ${
                  status === 'complete'
                    ? 'text-success'
                    : status === 'active'
                    ? 'text-foreground font-medium'
                    : status === 'failed'
                    ? 'text-danger'
                    : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {isFailed && onRetry && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-danger mb-2">
            Upload failed. Please try again.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="gap-2 text-warning border-warning-border hover:bg-warning-bg"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Upload
          </Button>
        </div>
      )}
    </div>
  );
}

function StepIcon({ status }) {
  switch (status) {
    case 'complete':
      return (
        <div className="w-5 h-5 rounded-full bg-success-bg flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3 text-success" />
        </div>
      );
    case 'active':
      return (
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        </div>
      );
    case 'failed':
      return (
        <div className="w-5 h-5 rounded-full bg-danger-bg flex items-center justify-center flex-shrink-0">
          <XCircle className="w-3 h-3 text-danger" />
        </div>
      );
    default:
      return (
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <Circle className="w-3 h-3 text-muted-foreground/40" />
        </div>
      );
  }
}
