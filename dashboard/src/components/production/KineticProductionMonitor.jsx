import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Film,
  Volume2,
  Layers,
  Upload,
  Square,
  Clock,
  Check,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';
import { webhookCall } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Pipeline stages for Kinetic Typography production.
 * Different from AI Cinematic: Script -> Frames -> TTS -> Mix -> Assembly -> Upload
 */
const PIPELINE_STAGES = [
  { key: 'script',   label: 'Script',   icon: FileText, match: ['scripting', 'script_approved'] },
  { key: 'frames',   label: 'Frames',   icon: Layers,   match: ['rendering_frames', 'frames'] },
  { key: 'tts',      label: 'TTS',      icon: Volume2,  match: ['tts', 'audio'] },
  { key: 'mix',      label: 'Mix',      icon: Activity,  match: ['mixing', 'mix'] },
  { key: 'assembly', label: 'Assembly', icon: Film,     match: ['assembling', 'assembly'] },
  { key: 'upload',   label: 'Upload',   icon: Upload,   match: ['uploading', 'uploaded', 'published', 'assembled'] },
];

function formatDuration(ms) {
  if (!ms && ms !== 0) return '--';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec}s`;
}

/**
 * Progress bar component with label and stats.
 */
function ProgressRow({ icon: Icon, label, done, total, status }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete = done >= total && total > 0;
  const isRunning = done > 0 && !isComplete;
  const isFailed = status === 'failed';

  return (
    <div className="mb-2.5">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Icon className="w-3 h-3" /> {label}
        </span>
        <span className="text-[10px] font-semibold tabular-nums">
          <span className={cn(
            isComplete ? 'text-success' :
            isFailed ? 'text-danger' :
            done > 0 ? 'text-accent' :
            'text-muted-foreground'
          )}>
            {done}
          </span>
          /{total}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isComplete ? 'bg-success' :
            isFailed ? 'bg-danger' :
            pct > 0 ? 'bg-accent' :
            'bg-muted'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isRunning && (
        <p className="text-[9px] text-muted-foreground/60 mt-0.5">
          {total - done} remaining &middot; {pct}%
        </p>
      )}
      {isComplete && (
        <p className="text-[9px] text-success/70 mt-0.5">Complete</p>
      )}
      {isFailed && (
        <p className="text-[9px] text-danger/70 mt-0.5">Failed</p>
      )}
    </div>
  );
}

/**
 * KineticProductionMonitor -- Production progress for Kinetic Typography projects.
 * Different pipeline from AI Cinematic: Script -> Frames -> TTS -> Mix -> Assembly -> Upload.
 * Subscribes to Supabase Realtime on kinetic_jobs and kinetic_scenes tables.
 */
export default function KineticProductionMonitor({ topicId, projectId }) {
  const [cancelling, setCancelling] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Subscribe to kinetic_jobs realtime updates
  useRealtimeSubscription(
    topicId ? 'kinetic_jobs' : null,
    topicId ? `topic_id=eq.${topicId}` : null,
    [['kinetic-job', topicId]]
  );

  // Subscribe to kinetic_scenes realtime updates
  useRealtimeSubscription(
    topicId ? 'kinetic_scenes' : null,
    topicId ? `topic_id=eq.${topicId}` : null,
    [['kinetic-scenes', topicId]]
  );

  // Also subscribe to topics for status changes
  useRealtimeSubscription(
    topicId ? 'topics' : null,
    topicId ? `id=eq.${topicId}` : null,
    [['kinetic-job', topicId], ['kinetic-scenes', topicId]]
  );

  // Fetch the kinetic job for this topic
  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['kinetic-job', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kinetic_jobs')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code === 'PGRST116') return null; // no rows
      if (error) throw error;
      return data;
    },
    enabled: !!topicId,
    refetchInterval: 10000, // also poll every 10s as fallback
  });

  // Fetch kinetic scene progress
  const { data: kineticScenes, isLoading: scenesLoading } = useQuery({
    queryKey: ['kinetic-scenes', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kinetic_scenes')
        .select('id, scene_number, frame_status, audio_status, mix_status')
        .eq('topic_id', topicId)
        .order('scene_number', { ascending: true });

      if (error) {
        // Table may not exist yet -- fall back gracefully
        if (error.code === '42P01' || error.message?.includes('does not exist')) return [];
        throw error;
      }
      return data || [];
    },
    enabled: !!topicId,
    refetchInterval: 10000,
  });

  // Compute progress from kinetic_scenes
  const progress = useMemo(() => {
    if (!kineticScenes || kineticScenes.length === 0) {
      // Fallback: use job-level progress if available
      return {
        total: job?.total_scenes || 0,
        framesRendered: job?.frames_rendered || 0,
        framesTotal: job?.total_frames || 0,
        audioDone: 0,
        mixDone: 0,
        scenesComplete: 0,
      };
    }

    const total = kineticScenes.length;
    const framesRendered = kineticScenes.filter(s => s.frame_status === 'rendered' || s.frame_status === 'complete').length;
    const audioDone = kineticScenes.filter(s => s.audio_status === 'uploaded' || s.audio_status === 'generated' || s.audio_status === 'complete').length;
    const mixDone = kineticScenes.filter(s => s.mix_status === 'mixed' || s.mix_status === 'complete').length;

    return {
      total,
      framesRendered,
      framesTotal: job?.total_frames || total,
      audioDone,
      mixDone,
      scenesComplete: mixDone,
    };
  }, [kineticScenes, job]);

  // Elapsed timer
  useEffect(() => {
    const startTime = job?.started_at || job?.created_at;
    if (!startTime || job?.status === 'complete' || job?.status === 'failed') return;

    const start = new Date(startTime).getTime();
    const tick = () => setElapsed(Date.now() - start);
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [job?.started_at, job?.created_at, job?.status]);

  // Determine current pipeline stage
  const jobStatus = job?.status || 'pending';
  const currentStageIdx = useMemo(() => {
    for (let i = PIPELINE_STAGES.length - 1; i >= 0; i--) {
      if (PIPELINE_STAGES[i].match.includes(jobStatus)) return i;
    }
    // Infer from progress
    if (progress.mixDone > 0) return 3;
    if (progress.audioDone > 0) return 2;
    if (progress.framesRendered > 0) return 1;
    return 0;
  }, [jobStatus, progress]);

  // Cancel handler
  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      await webhookCall('kinetic/cancel', { topic_id: topicId });
      toast.success('Cancel signal sent');
    } catch (e) {
      toast.error('Failed to cancel: ' + (e.message || 'Unknown error'));
    } finally {
      setCancelling(false);
    }
  }, [topicId]);

  const isActive = ['rendering_frames', 'frames', 'tts', 'audio', 'mixing', 'mix', 'assembling', 'assembly'].includes(jobStatus);
  const isComplete = jobStatus === 'complete' || jobStatus === 'uploaded' || jobStatus === 'published';
  const isFailed = jobStatus === 'failed';

  if (jobLoading || scenesLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-5 animate-pulse">
        <div className="h-4 w-48 bg-muted rounded mb-4" />
        <div className="space-y-3">
          <div className="h-2 w-full bg-muted rounded" />
          <div className="h-2 w-3/4 bg-muted rounded" />
          <div className="h-2 w-1/2 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No kinetic production job found for this topic.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Production will start after script approval.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5" data-testid="kinetic-production-monitor">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isActive && <Activity className="w-3.5 h-3.5 text-accent animate-pulse" />}
          {isComplete && <Check className="w-3.5 h-3.5 text-success" />}
          {isFailed && <AlertTriangle className="w-3.5 h-3.5 text-danger" />}
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Kinetic Production
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Elapsed time */}
          {(isActive || isComplete) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="tabular-nums font-mono">{formatDuration(elapsed)}</span>
            </div>
          )}

          {/* Status */}
          <span className={cn(
            'text-[10px] font-semibold capitalize',
            isComplete ? 'text-success' :
            isFailed ? 'text-danger' :
            isActive ? 'text-accent' :
            'text-muted-foreground'
          )}>
            {jobStatus.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Pipeline stage indicator */}
      <div className="flex items-center gap-1 mb-4">
        {PIPELINE_STAGES.map((stage, i) => {
          const isCurrent = i === currentStageIdx;
          const isDone = i < currentStageIdx || isComplete;
          const StageIcon = stage.icon;

          return (
            <div key={stage.key} className="flex-1 flex flex-col items-center gap-1">
              <div className={cn(
                'w-full h-1.5 rounded-full transition-all duration-300',
                isCurrent ? 'bg-accent animate-pulse' :
                isDone ? 'bg-success' :
                'bg-muted'
              )} />
              <div className="flex items-center gap-1">
                <StageIcon className={cn(
                  'w-3 h-3',
                  isCurrent ? 'text-accent' :
                  isDone ? 'text-success/70' :
                  'text-muted-foreground/50'
                )} />
                <span className={cn(
                  'text-[8px]',
                  isCurrent ? 'text-accent font-semibold' :
                  isDone ? 'text-success/70' :
                  'text-muted-foreground/50'
                )}>
                  {stage.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Frame progress (primary metric) */}
      {progress.framesTotal > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-accent" />
              Frame Rendering
            </span>
            <span className="text-sm font-bold tabular-nums text-accent">
              {job?.frames_rendered || progress.framesRendered}/{progress.framesTotal}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                (job?.frames_rendered || progress.framesRendered) >= progress.framesTotal
                  ? 'bg-success'
                  : 'bg-gradient-to-r from-primary to-accent'
              )}
              style={{
                width: `${progress.framesTotal > 0
                  ? Math.round(((job?.frames_rendered || progress.framesRendered) / progress.framesTotal) * 100)
                  : 0}%`
              }}
            />
          </div>
          <p className="text-[9px] text-muted-foreground/60 mt-1">
            {Math.round(((job?.frames_rendered || progress.framesRendered) / Math.max(progress.framesTotal, 1)) * 100)}% complete
          </p>
        </div>
      )}

      {/* Per-stage progress bars */}
      <div className="space-y-1">
        <ProgressRow
          icon={Layers}
          label="Frames Rendered"
          done={progress.framesRendered}
          total={progress.total}
          status={jobStatus}
        />
        <ProgressRow
          icon={Volume2}
          label="TTS Audio"
          done={progress.audioDone}
          total={progress.total}
          status={jobStatus}
        />
        <ProgressRow
          icon={Activity}
          label="Audio Mix"
          done={progress.mixDone}
          total={progress.total}
          status={jobStatus}
        />
      </div>

      {/* Current scene indicator */}
      {job?.current_scene && (
        <div className="mt-3 p-2 rounded-md bg-muted/30 border border-border/50">
          <p className="text-[10px] text-muted-foreground">
            Currently processing: <span className="text-foreground font-medium">Scene {job.current_scene}</span>
            {job.current_chapter && (
              <span className="text-muted-foreground"> ({job.current_chapter})</span>
            )}
          </p>
        </div>
      )}

      {/* Error display */}
      {isFailed && job?.error_message && (
        <div className="mt-3 p-3 rounded-md bg-danger/10 border border-danger/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-danger flex-shrink-0 mt-0.5" />
            <p className="text-xs text-danger">{job.error_message}</p>
          </div>
        </div>
      )}

      {/* Cancel button */}
      {isActive && (
        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px] border-danger/30 text-danger hover:bg-danger/10"
            disabled={cancelling}
            onClick={handleCancel}
          >
            {cancelling ? (
              <span className="w-3 h-3 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
            ) : (
              <Square className="w-3 h-3" />
            )}
            Cancel Job
          </Button>
        </div>
      )}
    </div>
  );
}
