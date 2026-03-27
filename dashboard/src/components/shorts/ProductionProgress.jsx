import { useState, useMemo } from 'react';
import {
  ChevronDown,
  CheckCircle2,
  Loader2,
  Clock,
  XCircle,
  Play,
  RefreshCw,
  StopCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Production pipeline steps with weights for percentage calculation
// ---------------------------------------------------------------------------

const PRODUCTION_STEPS = [
  { key: 'audio', label: 'Download Audio', weight: 5 },
  { key: 'segments', label: 'Segment Narration', weight: 5 },
  { key: 'images', label: 'Generate Images', weight: 50 },
  { key: 'assembly', label: 'FFmpeg Assembly', weight: 5 },
  { key: 'captions', label: 'Kinetic Captions', weight: 10 },
  { key: 'music', label: 'Background Music', weight: 10 },
  { key: 'upload', label: 'Upload to Drive', weight: 10 },
];

function formatDuration(ms) {
  if (!ms) return '--';
  const seconds = Math.round(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Parse production_progress string into structured step data
// ---------------------------------------------------------------------------

function parseProgress(progressStr, productionStatus) {
  const result = {
    steps: PRODUCTION_STEPS.map((s) => ({
      ...s,
      status: 'pending',
      detail: null,
    })),
    percent: 0,
    activeStep: null,
    detail: null,
  };

  if (productionStatus === 'complete' || productionStatus === 'uploaded') {
    result.steps = result.steps.map((s) => ({ ...s, status: 'complete' }));
    result.percent = 100;
    return result;
  }

  if (productionStatus === 'failed') {
    if (!progressStr) {
      result.steps[0].status = 'failed';
      return result;
    }
  }

  if (!progressStr || productionStatus === 'pending') {
    return result;
  }

  const [stepKey, countPart] = progressStr.split(':');
  const stepIndex = PRODUCTION_STEPS.findIndex((s) => s.key === stepKey);

  if (stepKey === 'complete') {
    result.steps = result.steps.map((s) => ({ ...s, status: 'complete' }));
    result.percent = 100;
    return result;
  }

  if (stepIndex === -1) {
    result.detail = progressStr;
    return result;
  }

  for (let i = 0; i < stepIndex; i++) {
    result.steps[i].status = 'complete';
  }

  if (productionStatus === 'failed') {
    result.steps[stepIndex].status = 'failed';
  } else {
    result.steps[stepIndex].status = 'active';
  }
  result.activeStep = stepKey;

  let completedWeight = 0;
  for (let i = 0; i < stepIndex; i++) {
    completedWeight += PRODUCTION_STEPS[i].weight;
  }

  if (stepKey === 'images' && countPart) {
    const [done, total] = countPart.split('/').map(Number);
    if (total > 0) {
      const fraction = done / total;
      completedWeight += PRODUCTION_STEPS[stepIndex].weight * fraction;
      result.steps[stepIndex].detail = `${done}/${total} images`;
    }
  } else {
    completedWeight += PRODUCTION_STEPS[stepIndex].weight * 0.5;
  }

  const totalWeight = PRODUCTION_STEPS.reduce((sum, s) => sum + s.weight, 0);
  result.percent = Math.round((completedWeight / totalWeight) * 100);

  if (countPart) {
    result.detail = countPart;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const PRODUCTION_BADGE = {
  pending: { label: 'Not started', cls: 'bg-muted text-muted-foreground' },
  producing: { label: 'In progress', cls: 'bg-info-bg text-info' },
  complete: { label: 'Complete', cls: 'bg-success-bg text-success' },
  uploaded: { label: 'Uploaded', cls: 'bg-success-bg text-success' },
  failed: { label: 'Failed', cls: 'bg-danger-bg text-danger' },
  cancelled: { label: 'Cancelled', cls: 'bg-warning-bg text-warning' },
};

// ---------------------------------------------------------------------------
// ProductionRow: expandable table row for the production status table
// ---------------------------------------------------------------------------

export function ProductionRow({ clip, onProduce, isProducing, onCancel, onReproduce, onPreview }) {
  const [expanded, setExpanded] = useState(false);
  const pBadge = PRODUCTION_BADGE[clip.production_status] || PRODUCTION_BADGE.pending;
  const progress = useMemo(
    () => parseProgress(clip.production_progress, clip.production_status),
    [clip.production_progress, clip.production_status]
  );

  const isExpandable = ['producing', 'complete', 'uploaded', 'failed', 'cancelled'].includes(clip.production_status);

  const statusDisplay = clip.production_status === 'producing'
    ? `${progress.percent}%`
    : pBadge.label;

  return (
    <>
      <tr
        className={`border-b border-border transition-colors ${isExpandable ? 'cursor-pointer hover:bg-card-hover' : ''}`}
        onClick={() => isExpandable && setExpanded((prev) => !prev)}
      >
        <td className="p-3">
          <div className="flex items-center gap-1.5">
            {isExpandable && (
              <ChevronDown
                className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${
                  expanded ? 'rotate-0' : '-rotate-90'
                }`}
              />
            )}
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-2xs font-medium bg-info-bg text-info">
              #{clip.clip_number}
            </span>
          </div>
        </td>
        <td className="p-3 text-xs font-medium text-foreground truncate max-w-[200px]">
          {clip.clip_title || 'Untitled'}
        </td>
        <td className="p-3 text-xs text-muted-foreground tabular-nums hidden sm:table-cell">
          {formatDuration(clip.actual_duration_ms || clip.estimated_duration_ms)}
        </td>
        <td className="p-3">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-2xs font-medium ${pBadge.cls}`}>
            {statusDisplay}
          </span>
        </td>
        <td className="p-3 hidden md:table-cell">
          {['producing', 'complete', 'uploaded'].includes(clip.production_status) ? (
            <div className="flex items-center gap-2 min-w-[120px]">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    progress.percent === 100
                      ? 'bg-success'
                      : 'bg-primary'
                  }`}
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <span className="text-2xs tabular-nums font-medium text-muted-foreground w-8 text-right">
                {progress.percent}%
              </span>
            </div>
          ) : clip.production_status === 'failed' ? (
            <span className="text-2xs text-danger">Failed</span>
          ) : (
            <span className="text-2xs text-muted-foreground">--</span>
          )}
        </td>
        <td className="p-3">
          {clip.portrait_drive_url ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-2xs gap-1"
              onClick={(e) => { e.stopPropagation(); onPreview?.(clip); }}
            >
              <Play className="w-3 h-3" />
              Preview
            </Button>
          ) : (
            <span className="text-2xs text-muted-foreground">--</span>
          )}
        </td>
        <td className="p-3">
          {clip.production_status === 'pending' && (
            <Button
              size="sm"
              className="h-6 px-2 text-2xs gap-1"
              onClick={(e) => { e.stopPropagation(); onProduce(clip.id); }}
              disabled={isProducing}
            >
              {isProducing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Produce
            </Button>
          )}
          {clip.production_status === 'producing' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-2xs gap-1 text-danger hover:text-danger"
              onClick={(e) => { e.stopPropagation(); onCancel?.(clip.id); }}
              title="Stop production"
            >
              <StopCircle className="w-3.5 h-3.5" />
              Stop
            </Button>
          )}
          {['complete', 'uploaded'].includes(clip.production_status) && (
            <div className="flex items-center gap-1">
              {clip.portrait_drive_url ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-2xs gap-1"
                  onClick={(e) => { e.stopPropagation(); onPreview?.(clip); }}
                >
                  <Play className="w-3 h-3" />
                  Preview
                </Button>
              ) : (
                <span className="flex items-center gap-1 text-2xs text-success">
                  <CheckCircle2 className="w-3 h-3" />
                  Done
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-2xs gap-1"
                onClick={(e) => { e.stopPropagation(); onReproduce?.(clip.id); }}
                title="Re-produce clip"
              >
                <RefreshCw className="w-3 h-3" />
                Re-produce
              </Button>
            </div>
          )}
          {clip.production_status === 'cancelled' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-2xs gap-1"
              onClick={(e) => { e.stopPropagation(); onReproduce?.(clip.id); }}
              title="Re-produce clip"
            >
              <RefreshCw className="w-3 h-3" />
              Re-produce
            </Button>
          )}
          {clip.production_status === 'failed' && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                className="h-6 px-2 text-2xs gap-1"
                onClick={(e) => { e.stopPropagation(); onProduce(clip.id); }}
                disabled={isProducing}
              >
                {isProducing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Retry
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-2xs gap-1"
                onClick={(e) => { e.stopPropagation(); onReproduce?.(clip.id); }}
                title="Re-produce clip (full reset)"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          )}
        </td>
      </tr>

      {/* Expanded step breakdown */}
      {expanded && isExpandable && (
        <tr className="bg-muted/30">
          <td colSpan={7} className="px-4 py-3">
            <div className="ml-6 space-y-3">
              {/* Full-width progress bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      progress.percent === 100 ? 'bg-success' : 'bg-primary'
                    }`}
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums font-semibold text-foreground w-10 text-right">
                  {progress.percent}%
                </span>
              </div>

              {/* Step list */}
              <div className="grid gap-1">
                {progress.steps.map((step) => (
                  <div
                    key={step.key}
                    className={`flex items-center gap-2.5 py-1 px-2 rounded-md text-xs ${
                      step.status === 'active' ? 'bg-info-bg' : ''
                    }`}
                  >
                    {step.status === 'complete' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                    )}
                    {step.status === 'active' && (
                      <Loader2 className="w-3.5 h-3.5 text-info animate-spin flex-shrink-0" />
                    )}
                    {step.status === 'pending' && (
                      <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                    {step.status === 'failed' && (
                      <XCircle className="w-3.5 h-3.5 text-danger flex-shrink-0" />
                    )}

                    <span
                      className={`font-medium ${
                        step.status === 'complete' ? 'text-success'
                          : step.status === 'active' ? 'text-info'
                          : step.status === 'failed' ? 'text-danger'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>

                    {step.detail && (
                      <span className="text-2xs text-info tabular-nums">
                        {step.detail}
                      </span>
                    )}

                    {step.status === 'complete' && (
                      <span className="text-2xs text-success/70 ml-auto">completed</span>
                    )}
                    {step.status === 'pending' && (
                      <span className="text-2xs text-muted-foreground ml-auto">pending</span>
                    )}
                    {step.status === 'failed' && (
                      <span className="text-2xs text-danger/70 ml-auto">failed</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
