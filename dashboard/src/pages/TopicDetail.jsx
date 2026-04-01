import { useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import {
  ArrowLeft,
  Mic,
  Image,
  Film,
  Clapperboard,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  SkipForward,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  FileText,
  Eye,
  DollarSign,
  Hash,
  Layers,
  Activity,
  Wallet,
  Loader2,
  Circle,
  Sparkles,
  Scissors,
  Type,
  Youtube,
  Globe,
} from 'lucide-react';

import { useScript } from '../hooks/useScript';
import { useProductionProgress } from '../hooks/useProductionProgress';
import { useProductionLog } from '../hooks/useProductionLog';
import { useProductionMutations } from '../hooks/useProductionMutations';
import ActivityLog from '../components/production/ActivityLog';
import PageHeader from '../components/shared/PageHeader';
import StatusBadge from '../components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/* ------------------------------------------------------------------ */
/*  Status badge config                                                */
/* ------------------------------------------------------------------ */
const STATUS_MAP = {
  pending:         { label: 'Pending',          variant: 'pending' },
  approved:        { label: 'Approved',         variant: 'approved' },
  scripting:       { label: 'Scripting',        variant: 'scripting' },
  script_approved: { label: 'Script Approved',  variant: 'approved' },
  queued:          { label: 'Queued',           variant: 'assembly' },
  producing:       { label: 'Producing',        variant: 'active' },
  audio:           { label: 'Audio',            variant: 'active' },
  images:          { label: 'Images',           variant: 'active' },
  assembling:      { label: 'Assembling',       variant: 'assembly' },
  assembled:       { label: 'Assembled',        variant: 'assembled' },
  ready_review:    { label: 'Ready for Review', variant: 'review' },
  video_approved:  { label: 'Video Approved',   variant: 'approved' },
  publishing:      { label: 'Publishing',       variant: 'uploading' },
  scheduled:       { label: 'Scheduled',        variant: 'scripting' },
  published:       { label: 'Published',        variant: 'published' },
  upload_failed:   { label: 'Upload Failed',    variant: 'failed' },
  failed:          { label: 'Failed',           variant: 'failed' },
  stopped:         { label: 'Stopped',          variant: 'pending' },
  rejected:        { label: 'Rejected',         variant: 'rejected' },
};

/* ------------------------------------------------------------------ */
/*  Asset stage definitions                                            */
/* ------------------------------------------------------------------ */
const ASSET_STAGES = [
  {
    key: 'audio',
    label: 'Audio (TTS)',
    icon: Mic,
    color: 'text-info',
    bgColor: 'bg-info/10',
    statusField: 'audio_status',
    description: 'Text-to-speech voiceover generation',
    appliesTo: 'all',
  },
  {
    key: 'images',
    label: 'Images',
    icon: Image,
    color: 'text-success',
    bgColor: 'bg-success/10',
    statusField: 'image_status',
    description: 'Seedream 4.0 image generation',
    appliesTo: 'all',
  },
  {
    key: 'i2v',
    label: 'Image-to-Video',
    icon: Film,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
    statusField: 'video_status',
    description: 'Wan 2.5 image-to-video clips',
    appliesTo: 'i2v',
  },
  {
    key: 't2v',
    label: 'Text-to-Video',
    icon: Film,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    statusField: 'video_status',
    description: 'Wan 2.5 text-to-video clips',
    appliesTo: 't2v',
  },
  {
    key: 'assembly',
    label: 'Assembly',
    icon: Clapperboard,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    statusField: 'clip_status',
    description: 'FFmpeg clip assembly + final concat',
    appliesTo: 'all',
  },
];

/* ------------------------------------------------------------------ */
/*  Full pipeline roadmap definitions                                  */
/* ------------------------------------------------------------------ */
const PIPELINE_ROADMAP = [
  { key: 'topic_created',       label: 'Created',     icon: Sparkles,     group: 'setup' },
  { key: 'topic_approved',      label: 'Approved',    icon: CheckCircle2, group: 'setup' },
  { key: 'script_generation',   label: 'Script',      icon: FileText,     group: 'script' },
  { key: 'script_approved',     label: 'Evaluated',   icon: CheckCircle2, group: 'script' },
  { key: 'scene_segmentation',  label: 'Segments',    icon: Scissors,     group: 'production' },
  { key: 'audio_generation',    label: 'Audio',       icon: Mic,          group: 'production', progressKey: 'audio' },
  { key: 'image_generation',    label: 'Images',      icon: Image,        group: 'production', progressKey: 'images' },
  { key: 'i2v_generation',      label: 'I2V',         icon: Film,         group: 'production', progressKey: 'i2v' },
  { key: 't2v_generation',      label: 'T2V',         icon: Film,         group: 'production', progressKey: 't2v' },
  { key: 'caption_generation',  label: 'Captions',    icon: Type,         group: 'production' },
  { key: 'ffmpeg_assembly',     label: 'Assembly',    icon: Clapperboard, group: 'assembly',   progressKey: 'clips' },
  { key: 'video_review',        label: 'Review',      icon: Eye,          group: 'publish' },
  { key: 'youtube_upload',      label: 'Upload',      icon: Youtube,      group: 'publish' },
  { key: 'published',           label: 'Published',   icon: Globe,        group: 'publish' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function getScenesForStage(scenes, stage) {
  if (stage.appliesTo === 'all') return scenes;
  return scenes.filter((s) => s.visual_type === stage.appliesTo);
}

function getSceneStageStatus(scene, stage) {
  if (scene.skipped) return 'skipped';
  const val = scene[stage.statusField];
  if (val === 'failed') return 'failed';
  if (val === 'uploaded' || val === 'generated' || val === 'complete') return 'done';
  if (val === 'processing' || val === 'generating') return 'in_progress';
  return 'pending';
}

function countByStatus(scenes, stage) {
  const relevant = getScenesForStage(scenes, stage);
  const counts = { done: 0, pending: 0, failed: 0, skipped: 0, in_progress: 0, total: relevant.length };
  for (const scene of relevant) {
    const s = getSceneStageStatus(scene, stage);
    counts[s] = (counts[s] || 0) + 1;
  }
  return counts;
}

function formatDuration(ms) {
  if (!ms) return '--';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  if (min < 60) return `${min}m ${rem}s`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return `${hr}h ${remMin}m`;
}

/**
 * Determine the live status label for an asset stage.
 * Returns: 'complete' | 'in_progress' | 'waiting' | 'not_started' | 'failed'
 */
function getStageLifecycleStatus(counts, stageKey, stageProgress) {
  if (counts.total === 0) return 'not_started';
  if (counts.done === counts.total) return 'complete';
  if (counts.failed > 0 && counts.in_progress === 0 && counts.done + counts.failed + counts.skipped === counts.total) return 'failed';
  if (counts.in_progress > 0 || counts.done > 0) return 'in_progress';

  const stageOrder = ['audio', 'images', 'i2v', 't2v', 'assembly'];
  const idx = stageOrder.indexOf(stageKey);
  if (idx > 0) {
    const allPriorComplete = stageOrder.slice(0, idx).every((k) => {
      const p = stageProgress?.[k];
      return !p || p.total === 0 || p.completed >= p.total;
    });
    if (allPriorComplete) return 'waiting';
  }
  return 'not_started';
}

/* ------------------------------------------------------------------ */
/*  Determine pipeline step status for roadmap                         */
/* ------------------------------------------------------------------ */
function getRoadmapStepStatus(step, topic, stageProgress, scenes) {
  const status = topic?.status;
  const reviewStatus = topic?.review_status;

  if (step.key === 'published') {
    if (status === 'published') return 'done';
    return 'pending';
  }

  if (step.key === 'youtube_upload') {
    if (status === 'published') return 'done';
    if (status === 'publishing') return 'active';
    return 'pending';
  }

  if (step.key === 'video_review') {
    if (status === 'published' || status === 'publishing' || status === 'video_approved') return 'done';
    if (status === 'ready_review') return 'active';
    return 'pending';
  }

  if (step.key === 'ffmpeg_assembly') {
    if (['assembled', 'ready_review', 'video_approved', 'publishing', 'published'].includes(status)) return 'done';
    if (status === 'assembling') return 'active';
    const sp = stageProgress?.clips;
    if (sp && sp.completed > 0 && sp.completed < sp.total) return 'active';
    return 'pending';
  }

  if (step.key === 'caption_generation') {
    if (['assembling', 'assembled', 'ready_review', 'video_approved', 'publishing', 'published'].includes(status)) return 'done';
    return 'pending';
  }

  if (step.progressKey && stageProgress) {
    const sp = stageProgress[step.progressKey];
    if (sp && sp.total > 0) {
      if (sp.completed >= sp.total) return 'done';
      if (sp.completed > 0) return 'active';
    }
    if (sp && sp.total === 0 && (step.progressKey === 'i2v' || step.progressKey === 't2v')) return 'skip';
  }

  if (step.key === 'scene_segmentation') {
    if (scenes.length > 0) return 'done';
    if (['producing', 'audio', 'images', 'assembling', 'assembled', 'ready_review', 'video_approved', 'publishing', 'published'].includes(status)) return 'done';
    return 'pending';
  }

  if (step.key === 'script_approved') {
    if (['script_approved', 'queued', 'producing', 'audio', 'images', 'assembling', 'assembled', 'ready_review', 'video_approved', 'publishing', 'published'].includes(status)) return 'done';
    return 'pending';
  }

  if (step.key === 'script_generation') {
    if (status === 'scripting') return 'active';
    if (['script_approved', 'queued', 'producing', 'audio', 'images', 'assembling', 'assembled', 'ready_review', 'video_approved', 'publishing', 'published'].includes(status)) return 'done';
    if (topic?.script_json || topic?.word_count) return 'done';
    return 'pending';
  }

  if (step.key === 'topic_approved') {
    if (reviewStatus === 'approved' || ['scripting', 'script_approved', 'queued', 'producing', 'audio', 'images', 'assembling', 'assembled', 'ready_review', 'video_approved', 'publishing', 'published'].includes(status)) return 'done';
    if (reviewStatus === 'rejected') return 'failed';
    return 'pending';
  }

  if (step.key === 'topic_created') {
    return 'done';
  }

  return 'pending';
}

/* ------------------------------------------------------------------ */
/*  SceneRow                                                           */
/* ------------------------------------------------------------------ */
function SceneRow({ scene, stage, onRetry, onSkip }) {
  const status = getSceneStageStatus(scene, stage);

  const dotColor = {
    done: 'bg-success',
    in_progress: 'bg-warning animate-glow-pulse',
    pending: 'bg-muted',
    failed: 'bg-danger',
    skipped: 'bg-muted-foreground',
  }[status] || 'bg-muted';

  return (
    <div className="bg-card border border-border rounded-lg px-4 py-2.5 flex items-center gap-3 hover:border-border-hover transition-colors">
      {/* Scene number */}
      <span className="text-muted-foreground font-mono text-xs tabular-nums w-8 shrink-0">
        #{scene.scene_number}
      </span>

      {/* Status dot */}
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />

      {/* Visual type badge */}
      {scene.visual_type && (
        <StatusBadge
          status={scene.visual_type === 'static_image' ? 'pending' : scene.visual_type === 'i2v' ? 'scripting' : 'assembly'}
          label={scene.visual_type}
          className="shrink-0"
        />
      )}

      {/* Narration text (truncated) */}
      <span className="flex-1 text-xs text-muted-foreground truncate min-w-0">
        {scene.narration_text
          ? scene.narration_text.slice(0, 80) + (scene.narration_text.length > 80 ? '...' : '')
          : scene.scene_id}
      </span>

      {/* Duration */}
      {scene.audio_duration_ms > 0 && (
        <span className="text-2xs tabular-nums text-muted-foreground shrink-0">
          {formatDuration(scene.audio_duration_ms)}
        </span>
      )}

      {/* Status label + actions */}
      {status === 'done' && (
        <Badge variant="outline" className="border-success/20 bg-success-bg text-success text-2xs shrink-0">Done</Badge>
      )}
      {status === 'in_progress' && (
        <Badge variant="outline" className="border-warning/20 bg-warning-bg text-warning text-2xs shrink-0 animate-pulse">Active</Badge>
      )}
      {status === 'pending' && (
        <Badge variant="outline" className="border-border text-muted-foreground text-2xs shrink-0">Pending</Badge>
      )}
      {status === 'failed' && (
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className="border-danger/20 bg-danger-bg text-danger text-2xs">Failed</Badge>
          {onRetry && (
            <button
              onClick={() => onRetry(scene.id)}
              className="p-1 rounded hover:bg-danger/10 transition-colors"
              aria-label={`Retry scene ${scene.scene_number}`}
              title="Retry"
            >
              <RotateCcw className="w-3 h-3 text-danger" />
            </button>
          )}
          {onSkip && (
            <button
              onClick={() => onSkip(scene.id)}
              className="p-1 rounded hover:bg-secondary transition-colors"
              aria-label={`Skip scene ${scene.scene_number}`}
              title="Skip"
            >
              <SkipForward className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
      )}
      {status === 'skipped' && (
        <Badge variant="outline" className="border-border text-muted-foreground text-2xs shrink-0">Skipped</Badge>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AssetCard                                                          */
/* ------------------------------------------------------------------ */
function AssetCard({ stage, scenes, expanded, onToggle, onRetry, onSkip, staggerIndex, stageProgress }) {
  const counts = countByStatus(scenes, stage);
  const pct = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
  const isComplete = counts.done === counts.total && counts.total > 0;
  const hasFailed = counts.failed > 0;
  const remaining = counts.total - counts.done - counts.skipped;
  const lifecycleStatus = getStageLifecycleStatus(counts, stage.key, stageProgress);
  const Icon = stage.icon;
  const relevantScenes = getScenesForStage(scenes, stage);
  const panelId = `asset-panel-${stage.key}`;

  const lifecycleLabel = {
    complete: 'Complete',
    in_progress: 'In Progress',
    waiting: 'Waiting',
    not_started: 'Not Started',
    failed: 'Failed',
  }[lifecycleStatus];

  const lifecycleVariant = {
    complete: 'published',
    in_progress: 'active',
    waiting: 'pending',
    not_started: 'pending',
    failed: 'failed',
  }[lifecycleStatus];

  return (
    <div
      className={`bg-card border rounded-xl overflow-hidden transition-all duration-300 animate-slide-up ${
        lifecycleStatus === 'in_progress' ? 'border-primary/30 shadow-glow-primary' : 'border-border'
      }`}
      style={{ opacity: 0, animationDelay: `${staggerIndex * 50}ms` }}
      data-testid={`asset-card-${stage.key}`}
    >
      {/* Card header */}
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-left hover:bg-card-hover transition-colors group"
      >
        {/* Stage icon */}
        <div className={`shrink-0 w-10 h-10 rounded-lg ${stage.bgColor} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
          <Icon className={`w-5 h-5 ${stage.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold">{stage.label}</h3>
            <StatusBadge status={lifecycleVariant} label={lifecycleLabel} />
          </div>
          {/* Status description */}
          <div className="text-xs text-muted-foreground">
            {lifecycleStatus === 'in_progress' && (
              <span>
                <span className="font-semibold text-warning tabular-nums">{counts.done}</span>
                <span> of </span>
                <span className="font-semibold tabular-nums">{counts.total}</span>
                <span> created</span>
                {remaining > 0 && (
                  <span className="text-muted-foreground"> &middot; <span className="font-semibold tabular-nums">{remaining}</span> remaining</span>
                )}
                {hasFailed && (
                  <span className="text-danger"> &middot; {counts.failed} failed</span>
                )}
              </span>
            )}
            {lifecycleStatus === 'complete' && (
              <span className="text-success">
                All <span className="font-semibold tabular-nums">{counts.total}</span> complete
              </span>
            )}
            {lifecycleStatus === 'waiting' && <span>Starts after prior stages complete</span>}
            {lifecycleStatus === 'not_started' && <span>{stage.description}</span>}
            {lifecycleStatus === 'failed' && (
              <span className="text-danger">
                <span className="font-semibold tabular-nums">{counts.failed}</span> scenes failed
                {counts.done > 0 && <span> &middot; {counts.done}/{counts.total} done</span>}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Counts */}
          <div className="text-right hidden sm:block">
            <div className="text-lg font-bold tabular-nums">
              {counts.done}<span className="text-muted-foreground/40">/{counts.total}</span>
            </div>
            <div className="text-2xs text-muted-foreground">
              {lifecycleStatus === 'in_progress' && remaining > 0
                ? <span className="text-warning tabular-nums">{remaining} remaining</span>
                : 'completed'
              }
            </div>
          </div>

          {/* Mini progress ring */}
          <div className="relative w-10 h-10" aria-label={`${pct}% complete`}>
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3"
                className="text-border" />
              <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3"
                strokeDasharray={`${pct * 0.94} 100`}
                strokeLinecap="round"
                className={`transition-all duration-700 ease-out ${
                  isComplete ? 'text-success' : hasFailed ? 'text-danger' : 'text-primary'
                }`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-2xs font-bold tabular-nums">
              {pct}%
            </span>
          </div>

          {/* Expand icon */}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          }
        </div>
      </button>

      {/* Progress bar */}
      <div className="px-5 pb-3">
        <div className={`w-full h-1.5 rounded-full overflow-hidden ${lifecycleStatus === 'in_progress' ? 'bg-muted h-2' : 'bg-muted'}`}>
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isComplete ? 'bg-success' : hasFailed ? 'bg-gradient-to-r from-primary to-danger' : 'bg-primary'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Mini stat dots */}
        <div className="flex items-center gap-3 sm:gap-4 mt-2 text-2xs text-muted-foreground tabular-nums flex-wrap">
          {counts.done > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              {counts.done} done
            </span>
          )}
          {counts.in_progress > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
              {counts.in_progress} active
            </span>
          )}
          {counts.pending > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
              {counts.pending} pending
            </span>
          )}
          {counts.failed > 0 && (
            <span className="flex items-center gap-1 text-danger">
              <span className="w-1.5 h-1.5 rounded-full bg-danger" />
              {counts.failed} failed
            </span>
          )}
          {counts.skipped > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              {counts.skipped} skipped
            </span>
          )}
        </div>
      </div>

      {/* Expanded scene list */}
      {expanded && (
        <div
          id={panelId}
          role="region"
          aria-label={`${stage.label} scenes`}
          className="border-t border-border"
        >
          {/* Summary stats row */}
          <div className="px-3 sm:px-5 py-3 grid grid-cols-3 sm:grid-cols-5 gap-2 border-b border-border bg-background/50">
            {[
              { label: 'Done', value: counts.done, cls: 'text-success' },
              { label: 'Active', value: counts.in_progress, cls: 'text-warning' },
              { label: 'Pending', value: counts.pending, cls: 'text-muted-foreground' },
              { label: 'Failed', value: counts.failed, cls: 'text-danger' },
              { label: 'Skipped', value: counts.skipped, cls: 'text-muted-foreground' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={`text-sm font-bold tabular-nums ${stat.cls}`}>{stat.value}</div>
                <div className="text-2xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Scene list */}
          <div className="px-3 py-2 max-h-[400px] overflow-y-auto scrollbar-thin space-y-1">
            {relevantScenes.length > 0 ? (
              relevantScenes.map((scene) => (
                <SceneRow
                  key={scene.id}
                  scene={scene}
                  stage={stage}
                  onRetry={onRetry}
                  onSkip={onSkip}
                />
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No scenes for this stage yet.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PipelineRoadmap (horizontal 14-step progress indicator)            */
/* ------------------------------------------------------------------ */
function PipelineRoadmap({ topic, stageProgress, scenes }) {
  return (
    <div
      className="bg-card border border-border rounded-xl p-5 animate-slide-up"
      style={{ opacity: 0, animationDelay: '50ms' }}
      data-testid="pipeline-roadmap"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Activity className="w-3.5 h-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold">Pipeline Roadmap</h3>
      </div>

      {/* Horizontal scrollable roadmap */}
      <div className="overflow-x-auto scrollbar-thin pb-2">
        <div className="flex items-center min-w-max gap-0">
          {PIPELINE_ROADMAP.map((step, i) => {
            const stepStatus = getRoadmapStepStatus(step, topic, stageProgress, scenes);

            if (stepStatus === 'skip') return null;

            const isDone = stepStatus === 'done';
            const isActive = stepStatus === 'active';
            const isFailed = stepStatus === 'failed';

            // Progress info for active production stages
            const sp = step.progressKey ? stageProgress?.[step.progressKey] : null;
            const hasProg = sp && sp.total > 0;
            const progPct = hasProg ? Math.round((sp.completed / sp.total) * 100) : 0;

            const StepIcon = step.icon;

            return (
              <div key={step.key} className="flex items-center">
                {/* Connecting line (before dot, except first) */}
                {i > 0 && (
                  <div className={`w-4 sm:w-6 h-0.5 shrink-0 ${isDone ? 'bg-success' : 'bg-border'}`} />
                )}

                {/* Step dot + label column */}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  {/* Dot */}
                  <div
                    className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isDone ? 'bg-success shadow-glow-success' :
                      isActive ? 'bg-primary shadow-glow-primary animate-glow-pulse' :
                      isFailed ? 'bg-danger' :
                      'bg-muted'
                    }`}
                  >
                    {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    {isActive && <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />}
                    {isFailed && <XCircle className="w-3.5 h-3.5 text-white" />}
                    {!isDone && !isActive && !isFailed && <StepIcon className="w-3 h-3 text-muted-foreground" />}
                  </div>

                  {/* Label */}
                  <span className={`text-2xs font-medium whitespace-nowrap ${
                    isDone ? 'text-success' :
                    isActive ? 'text-primary' :
                    isFailed ? 'text-danger' :
                    'text-muted-foreground'
                  }`}>
                    {step.label}
                  </span>

                  {/* Progress bar for active stages */}
                  {isActive && hasProg && (
                    <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progPct}%` }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TopicDetail (main page)                                            */
/* ------------------------------------------------------------------ */
export default function TopicDetail() {
  const { id: projectId, topicId } = useParams();
  const [expandedStage, setExpandedStage] = useState(null);

  const { data: topic, isLoading: topicLoading } = useScript(topicId);
  const { scenes, stageProgress, failedScenes, isLoading: scenesLoading } =
    useProductionProgress(topicId, topic);
  const { logs } = useProductionLog(topicId);
  const mutations = useProductionMutations(projectId);

  const isLoading = topicLoading || scenesLoading;

  const handleRetryScene = useCallback(
    (sceneId) => {
      mutations.retryScene.mutate({ scene_id: sceneId, topic_id: topicId });
    },
    [mutations.retryScene, topicId]
  );

  const handleSkipScene = useCallback(
    (sceneId) => {
      mutations.skipScene.mutate({ scene_id: sceneId, reason: 'User skipped', topic_id: topicId });
    },
    [mutations.skipScene, topicId]
  );

  const totalAudioDuration = useMemo(() => {
    return scenes.reduce((sum, s) => sum + (s.audio_duration_ms || 0), 0);
  }, [scenes]);

  const visualTypeCounts = useMemo(() => {
    const counts = { static_image: 0, i2v: 0, t2v: 0 };
    for (const s of scenes) {
      if (s.visual_type && counts[s.visual_type] !== undefined) counts[s.visual_type]++;
    }
    return counts;
  }, [scenes]);

  /* ---- Loading skeleton ---- */
  if (isLoading) {
    return (
      <div className="animate-slide-up" style={{ opacity: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-64 rounded bg-muted animate-pulse" />
            <div className="h-3 w-40 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 mb-6 h-24 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 h-20 animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  /* ---- Topic not found ---- */
  if (!topic) {
    return (
      <div className="animate-slide-up" style={{ opacity: 0 }}>
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-14 h-14 rounded-xl bg-warning/10 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-warning" />
          </div>
          <h2 className="text-lg font-bold mb-2">Topic Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            The requested topic could not be loaded.
          </p>
          <Button variant="outline" asChild>
            <Link to={`/project/${projectId}`}>
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_MAP[topic.status] || STATUS_MAP.pending;
  const hasScript = topic.script_json || topic.word_count;
  const hasScenes = scenes.length > 0;
  const isInProduction = ['producing', 'audio', 'images', 'assembling', 'queued'].includes(topic.status);

  /* ---- Key metric cards ---- */
  const metricCards = [
    { label: 'Scenes', value: scenes.length || topic.scene_count || '--', icon: Layers },
    { label: 'Words', value: topic.word_count?.toLocaleString() || '--', icon: FileText },
    { label: 'Duration', value: totalAudioDuration > 0 ? formatDuration(totalAudioDuration) : '--', icon: Clock },
    { label: 'Score', value: topic.script_quality_score ?? '--', icon: Activity },
    { label: 'Cost', value: topic.total_cost != null ? `$${Number(topic.total_cost).toFixed(2)}` : '--', icon: DollarSign },
    { label: 'Failed', value: failedScenes?.length || 0, icon: AlertTriangle, danger: (failedScenes?.length || 0) > 0 },
  ];

  return (
    <div className="animate-slide-up" style={{ opacity: 0 }} data-testid="topic-detail-page">
      {/* ---- Back nav + Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to={`/project/${projectId}`} aria-label="Back to project dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">
                {topic.seo_title || topic.original_title || 'Untitled'}
              </h1>
              <Badge variant="outline" className="shrink-0 text-2xs border-info/20 bg-info-bg text-info">
                #{topic.topic_number}
              </Badge>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={statusCfg.variant} label={statusCfg.label} />
              {topic.playlist_angle && (
                <span className="text-2xs text-muted-foreground">{topic.playlist_angle}</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 shrink-0 pl-10 sm:pl-0">
          {hasScript && (
            <Button variant="ghost" size="sm" asChild>
              <Link
                to={`/project/${projectId}/topics/${topicId}/script`}
                data-testid="view-script-btn"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Script</span>
              </Link>
            </Button>
          )}
          {(topic.status === 'assembled' || topic.status === 'ready_review' || topic.video_review_status === 'approved') && topic.status !== 'published' && (
            <Button size="sm" asChild>
              <Link
                to={`/project/${projectId}/topics/${topicId}/review`}
                data-testid="review-video-btn"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Review Video</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ---- Pipeline Roadmap (horizontal) ---- */}
      <div className="mb-6">
        <PipelineRoadmap topic={topic} stageProgress={stageProgress} scenes={scenes} />
      </div>

      {/* ---- Key metrics row ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {metricCards.map((m, i) => (
          <div
            key={m.label}
            className="bg-card border border-border rounded-lg p-4 transition-colors hover:border-border-hover animate-slide-up"
            style={{ opacity: 0, animationDelay: `${(i + 2) * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {m.label}
              </span>
              <m.icon className={`w-4 h-4 ${m.danger ? 'text-danger' : 'text-muted-foreground'}`} />
            </div>
            <p className={`text-lg font-bold tabular-nums ${m.danger ? 'text-danger' : ''}`}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* ---- Visual type distribution ---- */}
      {hasScenes && (
        <div
          className="bg-card border border-border rounded-xl p-4 mb-6 animate-slide-up"
          style={{ opacity: 0, animationDelay: '400ms' }}
        >
          <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
            Visual Type Distribution
          </h3>
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            {[
              { label: 'Static Images', count: visualTypeCounts.static_image, cls: 'bg-success' },
              { label: 'Image-to-Video', count: visualTypeCounts.i2v, cls: 'bg-info' },
              { label: 'Text-to-Video', count: visualTypeCounts.t2v, cls: 'bg-warning' },
            ].map((v) => (
              <div key={v.label} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-sm ${v.cls}`} />
                <span className="text-xs text-muted-foreground">{v.label}</span>
                <span className="text-xs font-bold tabular-nums">{v.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Asset stage cards ---- */}
      {hasScenes ? (
        <div className="space-y-3 mb-6">
          <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
            <Hash className="w-3.5 h-3.5 text-primary" />
            Asset Pipeline
          </h2>
          {ASSET_STAGES.map((stage, stageIdx) => {
            const relevant = getScenesForStage(scenes, stage);
            if (relevant.length === 0 && (stage.key === 'i2v' || stage.key === 't2v')) return null;
            return (
              <AssetCard
                key={stage.key}
                stage={stage}
                scenes={scenes}
                expanded={expandedStage === stage.key}
                onToggle={() => setExpandedStage(expandedStage === stage.key ? null : stage.key)}
                onRetry={isInProduction || topic.status === 'stopped' ? handleRetryScene : null}
                onSkip={isInProduction || topic.status === 'stopped' ? handleSkipScene : null}
                staggerIndex={stageIdx + 8}
                stageProgress={stageProgress}
              />
            );
          })}
        </div>
      ) : (
        <div
          className="bg-card border border-border rounded-xl p-8 text-center mb-6 animate-slide-up"
          style={{ opacity: 0, animationDelay: '450ms' }}
        >
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-5">
            <Layers className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold mb-2">No Scenes Yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {topic.status === 'pending' || topic.status === 'approved'
              ? 'Scenes will appear after script generation and approval.'
              : topic.status === 'scripting'
                ? 'Script is being generated. Scenes will appear when complete.'
                : 'Scene data is not yet available for this topic.'}
          </p>
        </div>
      )}

      {/* ---- Cost breakdown ---- */}
      {topic.cost_breakdown && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 text-success" />
            </div>
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Cost Breakdown
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(topic.cost_breakdown)
              .map(([key, val]) => {
                // Replace deprecated I2V/T2V with Ken Burns ($0)
                const lk = key.toLowerCase();
                if (lk === 'i2v' || lk === 't2v') return null;
                return [key, val];
              })
              .filter(Boolean)
              .concat([['ken_burns', 0]])
              // Deduplicate ken_burns if it already exists
              .filter(([key], i, arr) => arr.findIndex(([k]) => k === key) === i)
              .map(([key, val]) => (
              <div key={key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-background border border-border">
                <span className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-xs font-bold tabular-nums">
                  ${typeof val === 'number' ? val.toFixed(2) : val}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Activity log ---- */}
      {logs && logs.length > 0 && <ActivityLog logs={logs} />}
    </div>
  );
}
