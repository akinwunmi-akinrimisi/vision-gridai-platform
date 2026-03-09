import { Check, Circle, Loader2, XCircle, RefreshCw } from 'lucide-react';

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
    <div className="glass-card rounded-xl p-4" data-testid="upload-progress">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
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
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : status === 'active'
                    ? 'text-slate-900 dark:text-white font-medium'
                    : status === 'failed'
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {isFailed && onRetry && (
        <div className="mt-4 pt-3 border-t border-border/50 dark:border-white/[0.06]">
          <p className="text-xs text-red-500 dark:text-red-400 mb-2">
            Upload failed. Please try again.
          </p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold
              text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/[0.08]
              hover:bg-amber-100 dark:hover:bg-amber-500/[0.15] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Upload
          </button>
        </div>
      )}
    </div>
  );
}

function StepIcon({ status }) {
  switch (status) {
    case 'complete':
      return (
        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3 text-emerald-500" />
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
        <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <XCircle className="w-3 h-3 text-red-500" />
        </div>
      );
    default:
      return (
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <Circle className="w-3 h-3 text-slate-300 dark:text-slate-600" />
        </div>
      );
  }
}
