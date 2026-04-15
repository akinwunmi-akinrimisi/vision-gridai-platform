import { useState } from 'react';
import { Link } from 'react-router';
import {
  FlaskConical,
  Play,
  Pause,
  Square,
  RefreshCw,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ABTestVariantComparison from './ABTestVariantComparison';

const STATUS_STYLES = {
  running: 'bg-success-bg text-success border-success-border',
  completed: 'bg-accent/20 text-accent border-accent/40',
  paused: 'bg-warning-bg text-warning border-warning-border',
  aborted: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-muted text-muted-foreground border-border',
};

const TYPE_STYLES = {
  title: 'bg-info-bg text-info border-info-border',
  thumbnail: 'bg-accent/20 text-accent border-accent/40',
  combined: 'bg-warning-bg text-warning border-warning-border',
};

function formatRelativeTime(dateStr) {
  if (!dateStr) return '\u2014';
  try {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '\u2014';
  }
}

export default function ABTestCard({
  test,
  projectId,
  index = 0,
  onRotate,
  onPause,
  onResume,
  onStop,
  onApplyWinner,
  isRotating,
  isPausing,
  isResuming,
  isStopping,
  isApplying,
}) {
  const [confirmStop, setConfirmStop] = useState(false);

  const status = test?.status || 'pending';
  const topic = test?.topics || null;
  const title =
    topic?.selected_title || topic?.seo_title || topic?.original_title || 'Untitled topic';
  const variants = Array.isArray(test?.variants) ? test.variants : [];
  const totalRotations = variants.reduce((a, v) => a + (v.rotation_count || 0), 0);
  const winner = variants.find(
    (v) => v.is_winner || v.id === test?.winning_variant_id,
  );
  const canApplyWinner =
    status === 'completed' && winner && !test?.winner_applied;

  const handleStopClick = () => {
    if (!confirmStop) {
      setConfirmStop(true);
      setTimeout(() => setConfirmStop(false), 4000);
      return;
    }
    onStop({ abTestId: test.id });
    setConfirmStop(false);
  };

  const handleApplyWinner = async () => {
    try {
      await onApplyWinner({ abTest: test });
      toast.success(
        'Winner applied; operator to update YouTube thumbnail if applicable',
      );
    } catch (err) {
      toast.error(err?.message || 'Failed to apply winner');
    }
  };

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-xl overflow-hidden',
        `stagger-${Math.min(index + 1, 8)} animate-fade-in`,
      )}
      data-testid={`ab-test-card-${test.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <FlaskConical className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            <span
              className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium border capitalize',
                TYPE_STYLES[test.test_type] || TYPE_STYLES.title,
              )}
            >
              {test.test_type}
            </span>
            <span
              className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium border capitalize',
                STATUS_STYLES[status] || STATUS_STYLES.pending,
              )}
            >
              {status}
            </span>
            {test?.winner_applied && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border bg-success-bg text-success border-success-border">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Winner Applied
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 min-w-0">
            {test.topic_id && projectId && (
              <Link
                to={`/project/${projectId}/topics/${test.topic_id}/review`}
                className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate flex-1 min-w-0"
                title={title}
              >
                {title}
              </Link>
            )}
            {!test.topic_id && (
              <span className="text-sm font-semibold truncate flex-1 min-w-0">
                {title}
              </span>
            )}
            {test?.youtube_video_id && (
              <a
                href={`https://youtube.com/watch?v=${test.youtube_video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                title="Open on YouTube"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">
            Started {formatRelativeTime(test.started_at || test.created_at)}
            {' \u00b7 '}
            Rotations {totalRotations}
            {test.last_rotated_at
              ? ` \u00b7 Last rotated ${formatRelativeTime(test.last_rotated_at)}`
              : ''}
          </div>
        </div>
      </div>

      {/* Variants */}
      <div className="px-4 py-3">
        <ABTestVariantComparison test={test} />
      </div>

      {/* Winner banner (completed) */}
      {status === 'completed' && winner && (
        <div className="px-4 py-2.5 border-t border-border bg-success-bg/20 flex items-center gap-2 flex-wrap">
          <Trophy className="w-4 h-4 text-success flex-shrink-0" />
          <span className="text-xs font-semibold text-success">
            Variant {winner.variant_label} won
          </span>
          {winner.total_ctr != null && (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              ({(winner.total_ctr * 100).toFixed(2)}% actual CTR)
            </span>
          )}
          {canApplyWinner && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={handleApplyWinner}
              disabled={isApplying}
              data-testid={`apply-winner-${test.id}`}
            >
              {isApplying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Apply Winner
            </Button>
          )}
        </div>
      )}

      {/* Controls */}
      {(status === 'running' || status === 'paused') && (
        <div className="px-4 py-2.5 border-t border-border flex items-center gap-2 flex-wrap">
          {status === 'running' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRotate({ abTestId: test.id })}
              disabled={isRotating}
              data-testid={`rotate-${test.id}`}
            >
              {isRotating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Rotate now
            </Button>
          )}
          {status === 'running' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPause({ abTestId: test.id })}
              disabled={isPausing}
              data-testid={`pause-${test.id}`}
            >
              {isPausing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Pause className="w-3.5 h-3.5" />
              )}
              Pause
            </Button>
          )}
          {status === 'paused' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResume({ abTestId: test.id })}
              disabled={isResuming}
              data-testid={`resume-${test.id}`}
            >
              {isResuming ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              Resume
            </Button>
          )}
          <Button
            variant={confirmStop ? 'destructive' : 'ghost'}
            size="sm"
            onClick={handleStopClick}
            disabled={isStopping}
            className="ml-auto"
            data-testid={`stop-${test.id}`}
          >
            {isStopping ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
            {confirmStop ? 'Click to confirm' : 'Stop'}
          </Button>
        </div>
      )}
    </div>
  );
}
