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

/* ─── Status badge config ─────────────────────────────── */
const STATUS_CONFIG = {
  pending:         { label: 'Pending',          cls: 'badge bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400' },
  approved:        { label: 'Approved',         cls: 'badge badge-blue' },
  scripting:       { label: 'Scripting',        cls: 'badge badge-cyan animate-pulse' },
  script_approved: { label: 'Script Approved',  cls: 'badge badge-green' },
  queued:          { label: 'Queued',           cls: 'badge badge-amber' },
  producing:       { label: 'Producing',        cls: 'badge badge-amber animate-pulse' },
  audio:           { label: 'Audio',            cls: 'badge badge-purple animate-pulse' },
  images:          { label: 'Images',           cls: 'badge badge-purple animate-pulse' },
  assembling:      { label: 'Assembling',       cls: 'badge badge-purple animate-pulse' },
  assembled:       { label: 'Assembled',        cls: 'badge badge-blue' },
  ready_review:    { label: 'Ready for Review', cls: 'badge badge-amber' },
  video_approved:  { label: 'Video Approved',   cls: 'badge badge-blue' },
  publishing:      { label: 'Publishing',       cls: 'badge badge-amber animate-pulse' },
  scheduled:       { label: 'Scheduled',        cls: 'badge badge-purple' },
  published:       { label: 'Published',        cls: 'badge badge-green' },
  upload_failed:   { label: 'Upload Failed',    cls: 'badge badge-red' },
  failed:          { label: 'Failed',           cls: 'badge badge-red' },
  stopped:         { label: 'Stopped',          cls: 'badge bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400' },
  rejected:        { label: 'Rejected',         cls: 'badge badge-red' },
};

/* ─── Asset stage definitions ─────────────────────────── */
const ASSET_STAGES = [
  {
    key: 'audio',
    label: 'Audio (TTS)',
    icon: Mic,
    gradient: 'from-blue-500 to-indigo-600',
    shadow: 'shadow-blue-500/20',
    glowVar: 'rgba(37,99,235,0.2)',
    statusField: 'audio_status',
    description: 'Text-to-speech voiceover generation',
    appliesTo: 'all',
  },
  {
    key: 'images',
    label: 'Images',
    icon: Image,
    gradient: 'from-cyan-500 to-teal-600',
    shadow: 'shadow-cyan-500/20',
    glowVar: 'rgba(6,182,212,0.2)',
    statusField: 'image_status',
    description: 'Seedream 4.0 image generation',
    appliesTo: 'all',
  },
  {
    key: 'i2v',
    label: 'Image-to-Video',
    icon: Film,
    gradient: 'from-purple-500 to-violet-600',
    shadow: 'shadow-purple-500/20',
    glowVar: 'rgba(139,92,246,0.2)',
    statusField: 'video_status',
    description: 'Wan 2.5 image-to-video clips',
    appliesTo: 'i2v',
  },
  {
    key: 't2v',
    label: 'Text-to-Video',
    icon: Film,
    gradient: 'from-amber-500 to-orange-600',
    shadow: 'shadow-amber-500/20',
    glowVar: 'rgba(245,158,11,0.2)',
    statusField: 'video_status',
    description: 'Wan 2.5 text-to-video clips',
    appliesTo: 't2v',
  },
  {
    key: 'assembly',
    label: 'Assembly',
    icon: Clapperboard,
    gradient: 'from-emerald-500 to-green-600',
    shadow: 'shadow-emerald-500/20',
    glowVar: 'rgba(16,185,129,0.2)',
    statusField: 'clip_status',
    description: 'FFmpeg clip assembly + final concat',
    appliesTo: 'all',
  },
];

/* ─── Full pipeline roadmap definitions ──────────────── */
const PIPELINE_ROADMAP = [
  { key: 'topic_created',       label: 'Topic Created',          icon: Sparkles,     group: 'setup' },
  { key: 'topic_approved',      label: 'Topic Approved (Gate 1)', icon: CheckCircle2, group: 'setup' },
  { key: 'script_generation',   label: 'Script Generation',      icon: FileText,     group: 'script' },
  { key: 'script_approved',     label: 'Script Approved (Gate 2)', icon: CheckCircle2, group: 'script' },
  { key: 'scene_segmentation',  label: 'Scene Segmentation',     icon: Scissors,     group: 'production' },
  { key: 'audio_generation',    label: 'Audio Generation (TTS)', icon: Mic,          group: 'production', progressKey: 'audio' },
  { key: 'image_generation',    label: 'Image Generation',       icon: Image,        group: 'production', progressKey: 'images' },
  { key: 'i2v_generation',      label: 'Image-to-Video (I2V)',   icon: Film,         group: 'production', progressKey: 'i2v' },
  { key: 't2v_generation',      label: 'Text-to-Video (T2V)',    icon: Film,         group: 'production', progressKey: 't2v' },
  { key: 'caption_generation',  label: 'Caption Generation',     icon: Type,         group: 'production' },
  { key: 'ffmpeg_assembly',     label: 'FFmpeg Assembly',        icon: Clapperboard, group: 'assembly', progressKey: 'clips' },
  { key: 'video_review',        label: 'Video Review (Gate 3)',  icon: Eye,          group: 'publish' },
  { key: 'youtube_upload',      label: 'YouTube Upload',         icon: Youtube,      group: 'publish' },
  { key: 'published',           label: 'Published',              icon: Globe,        group: 'publish' },
];

/* ─── Helpers ─────────────────────────────────────────── */
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

  // Check if prior stages are done to determine 'waiting' vs 'not_started'
  const stageOrder = ['audio', 'images', 'i2v', 't2v', 'assembly'];
  const idx = stageOrder.indexOf(stageKey);
  if (idx > 0) {
    const allPriorComplete = stageOrder.slice(0, idx).every((k) => {
      const p = stageProgress?.[k];
      return !p || p.total === 0 || p.completed >= p.total;
    });
    if (allPriorComplete) return 'waiting'; // Ready to start, prior stages done
  }
  return 'not_started';
}

const LIFECYCLE_BADGES = {
  complete:    { label: 'Complete',     cls: 'badge badge-green', icon: CheckCircle2 },
  in_progress: { label: 'In Progress', cls: 'badge badge-amber animate-pulse', icon: Loader2 },
  waiting:     { label: 'Waiting',     cls: 'badge badge-blue',  icon: Clock },
  not_started: { label: 'Not Started', cls: 'badge bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400', icon: Circle },
  failed:      { label: 'Failed',      cls: 'badge badge-red',   icon: XCircle },
};

/* ─── Determine pipeline step status for roadmap ────── */
function getRoadmapStepStatus(step, topic, stageProgress, scenes) {
  const status = topic?.status;
  const reviewStatus = topic?.review_status;

  // Published states
  if (step.key === 'published') {
    if (status === 'published') return 'done';
    return 'pending';
  }

  if (step.key === 'youtube_upload') {
    if (status === 'published') return 'done';
    if (status === 'publishing') return 'active';
    if (['assembled', 'ready_review', 'video_approved'].includes(status)) return 'pending';
    return 'pending';
  }

  if (step.key === 'video_review') {
    if (status === 'published' || status === 'publishing' || status === 'video_approved') return 'done';
    if (status === 'ready_review') return 'active';
    if (status === 'assembled') return 'pending';
    return 'pending';
  }

  // Assembly
  if (step.key === 'ffmpeg_assembly') {
    if (['assembled', 'ready_review', 'video_approved', 'publishing', 'published'].includes(status)) return 'done';
    if (status === 'assembling') return 'active';
    const sp = stageProgress?.clips;
    if (sp && sp.completed > 0 && sp.completed < sp.total) return 'active';
    return 'pending';
  }

  // Caption generation (no direct progress tracked, infer from assembly status)
  if (step.key === 'caption_generation') {
    if (['assembling', 'assembled', 'ready_review', 'video_approved', 'publishing', 'published'].includes(status)) return 'done';
    return 'pending';
  }

  // Production stages with progress tracking
  if (step.progressKey && stageProgress) {
    const sp = stageProgress[step.progressKey];
    if (sp && sp.total > 0) {
      if (sp.completed >= sp.total) return 'done';
      if (sp.completed > 0) return 'active';
    }
    // Check if total is 0 for i2v/t2v (no scenes of that type)
    if (sp && sp.total === 0 && (step.progressKey === 'i2v' || step.progressKey === 't2v')) return 'skip';
  }

  // Scene segmentation
  if (step.key === 'scene_segmentation') {
    if (scenes.length > 0) return 'done';
    if (['producing', 'audio', 'images', 'assembling', 'assembled', 'ready_review', 'video_approved', 'publishing', 'published'].includes(status)) return 'done';
    return 'pending';
  }

  // Script stages
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

  // Topic stages
  if (step.key === 'topic_approved') {
    if (reviewStatus === 'approved' || ['scripting', 'script_approved', 'queued', 'producing', 'audio', 'images', 'assembling', 'assembled', 'ready_review', 'video_approved', 'publishing', 'published'].includes(status)) return 'done';
    if (reviewStatus === 'rejected') return 'failed';
    return 'pending';
  }

  if (step.key === 'topic_created') {
    return 'done'; // Always done if we have a topic
  }

  return 'pending';
}

/* ─── SceneRow ────────────────────────────────────────── */
function SceneRow({ scene, stage, onRetry, onSkip }) {
  const status = getSceneStageStatus(scene, stage);

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
      <span className="text-2xs font-bold text-slate-400 dark:text-slate-500 tabular-nums w-8 flex-shrink-0">
        #{scene.scene_number}
      </span>
      <span className="flex-1 text-xs text-slate-600 dark:text-slate-400 truncate min-w-0">
        {scene.narration_text
          ? scene.narration_text.slice(0, 80) + (scene.narration_text.length > 80 ? '...' : '')
          : scene.scene_id}
      </span>
      {scene.visual_type && (
        <span className="text-2xs text-slate-400 dark:text-slate-500 uppercase flex-shrink-0">
          {scene.visual_type}
        </span>
      )}
      {scene.audio_duration_ms > 0 && (
        <span className="text-2xs tabular-nums text-slate-400 dark:text-slate-500 flex-shrink-0">
          {formatDuration(scene.audio_duration_ms)}
        </span>
      )}
      {status === 'done' && (
        <span className="badge badge-green text-2xs flex-shrink-0">Done</span>
      )}
      {status === 'in_progress' && (
        <span className="badge badge-amber text-2xs animate-pulse flex-shrink-0">In Progress</span>
      )}
      {status === 'pending' && (
        <span className="badge text-2xs bg-slate-100 text-slate-400 dark:bg-white/[0.04] dark:text-slate-500 flex-shrink-0">
          Pending
        </span>
      )}
      {status === 'failed' && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="badge badge-red text-2xs">Failed</span>
          {onRetry && (
            <button
              onClick={() => onRetry(scene.id)}
              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              aria-label={`Retry scene ${scene.scene_number}`}
              title="Retry"
            >
              <RotateCcw className="w-3 h-3 text-red-500" />
            </button>
          )}
          {onSkip && (
            <button
              onClick={() => onSkip(scene.id)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
              aria-label={`Skip scene ${scene.scene_number}`}
              title="Skip"
            >
              <SkipForward className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
      )}
      {status === 'skipped' && (
        <span className="badge text-2xs bg-slate-100 text-slate-400 dark:bg-white/[0.04] dark:text-slate-500 flex-shrink-0">
          Skipped
        </span>
      )}
    </div>
  );
}

/* ─── AssetCard (revamped with live status + remaining) ─ */
function AssetCard({ stage, scenes, expanded, onToggle, onRetry, onSkip, staggerIndex, stageProgress }) {
  const counts = countByStatus(scenes, stage);
  const pct = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
  const isComplete = counts.done === counts.total && counts.total > 0;
  const hasFailed = counts.failed > 0;
  const remaining = counts.total - counts.done - counts.skipped;
  const lifecycleStatus = getStageLifecycleStatus(counts, stage.key, stageProgress);
  const lifecycleBadge = LIFECYCLE_BADGES[lifecycleStatus];
  const LifecycleIcon = lifecycleBadge.icon;
  const Icon = stage.icon;
  const relevantScenes = getScenesForStage(scenes, stage);
  const panelId = `asset-panel-${stage.key}`;

  return (
    <div
      className={`
        glass-card overflow-hidden transition-all duration-300
        animate-slide-up stagger-${staggerIndex}
        ${expanded ? 'ring-1 ring-primary/20 dark:ring-primary/30' : ''}
        ${lifecycleStatus === 'in_progress' ? 'gradient-border-visible' : ''}
      `}
      style={{ opacity: 0 }}
      data-testid={`asset-card-${stage.key}`}
    >
      {/* Card header */}
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors group"
      >
        <div
          className={`
            flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${stage.gradient} ${stage.shadow}
            shadow-md flex items-center justify-center
            transition-transform duration-300 group-hover:scale-110
            ${lifecycleStatus === 'in_progress' ? 'animate-pulse-slow' : ''}
          `}
          style={{ '--icon-glow': stage.glowVar }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{stage.label}</h3>
            {/* Live status badge */}
            <span className={`${lifecycleBadge.cls} text-2xs`}>
              <LifecycleIcon className={`w-3 h-3 ${lifecycleStatus === 'in_progress' ? 'animate-spin' : ''}`} />
              {lifecycleBadge.label}
            </span>
          </div>
          {/* Live status text with counts */}
          <div className="text-xs text-text-muted dark:text-text-muted-dark">
            {lifecycleStatus === 'in_progress' && (
              <span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{counts.done}</span>
                <span> of </span>
                <span className="font-semibold tabular-nums">{counts.total}</span>
                <span> created</span>
                {remaining > 0 && (
                  <span className="text-slate-400 dark:text-slate-500">
                    {' '} &middot; <span className="font-semibold tabular-nums">{remaining}</span> remaining
                  </span>
                )}
                {hasFailed && (
                  <span className="text-red-500">
                    {' '} &middot; {counts.failed} failed
                  </span>
                )}
              </span>
            )}
            {lifecycleStatus === 'complete' && (
              <span className="text-emerald-600 dark:text-emerald-400">
                All <span className="font-semibold tabular-nums">{counts.total}</span> complete
              </span>
            )}
            {lifecycleStatus === 'waiting' && (
              <span>Starts after prior stages complete</span>
            )}
            {lifecycleStatus === 'not_started' && (
              <span>{stage.description}</span>
            )}
            {lifecycleStatus === 'failed' && (
              <span className="text-red-500">
                <span className="font-semibold tabular-nums">{counts.failed}</span> scenes failed
                {counts.done > 0 && <span> &middot; {counts.done}/{counts.total} done</span>}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Counts */}
          <div className="text-right hidden sm:block">
            <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
              {counts.done}<span className="text-slate-300 dark:text-slate-600">/{counts.total}</span>
            </div>
            {lifecycleStatus === 'in_progress' && remaining > 0 && (
              <div className="text-2xs font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                {remaining} remaining
              </div>
            )}
            {lifecycleStatus !== 'in_progress' && (
              <div className="text-2xs text-text-muted dark:text-text-muted-dark">completed</div>
            )}
          </div>
          {/* Mini progress ring */}
          <div className="relative w-10 h-10" aria-label={`${pct}% complete`}>
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3"
                className="text-slate-100 dark:text-white/[0.06]" />
              <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3"
                strokeDasharray={`${pct * 0.94} 100`}
                strokeLinecap="round"
                className={`transition-all duration-700 ease-out ${
                  isComplete ? 'text-emerald-500' : hasFailed ? 'text-red-500' : 'text-primary'
                }`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-2xs font-bold tabular-nums text-slate-700 dark:text-slate-300">
              {pct}%
            </span>
          </div>
          {/* Expand icon */}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-slate-400" aria-hidden="true" />
            : <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
          }
        </div>
      </button>

      {/* Summary bar */}
      <div className="px-5 pb-3">
        <div className={`${lifecycleStatus === 'in_progress' ? 'progress-bar-lg progress-bar-animated' : 'progress-bar'}`}>
          <div
            className={`progress-bar-fill ${isComplete ? '!bg-emerald-500' : hasFailed ? '!bg-gradient-to-r !from-primary !to-red-500' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center gap-3 sm:gap-4 mt-2 text-2xs text-slate-400 dark:text-slate-500 tabular-nums flex-wrap">
          {counts.done > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {counts.done} done
            </span>
          )}
          {counts.in_progress > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {counts.in_progress} active
            </span>
          )}
          {counts.pending > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              {counts.pending} pending
            </span>
          )}
          {counts.failed > 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {counts.failed} failed
            </span>
          )}
          {counts.skipped > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
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
          className="border-t border-slate-100 dark:border-white/[0.04]"
        >
          {/* Drill-down summary stats */}
          <div className="px-5 py-3 grid grid-cols-5 gap-2 border-b border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01]">
            {[
              { label: 'Done', value: counts.done, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Active', value: counts.in_progress, color: 'text-amber-600 dark:text-amber-400' },
              { label: 'Pending', value: counts.pending, color: 'text-slate-500 dark:text-slate-400' },
              { label: 'Failed', value: counts.failed, color: 'text-red-600 dark:text-red-400' },
              { label: 'Skipped', value: counts.skipped, color: 'text-slate-400 dark:text-slate-500' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={`text-sm font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
                <div className="text-2xs text-slate-400 dark:text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Scene list */}
          <div className="px-3 py-2 max-h-[400px] overflow-y-auto scrollbar-thin">
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
              <p className="text-xs text-text-muted dark:text-text-muted-dark py-4 text-center">
                No scenes for this stage yet.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── PipelineRoadmap (vertical timeline) ────────────── */
function PipelineRoadmap({ topic, stageProgress, scenes }) {
  const groups = [
    { key: 'setup', label: 'Setup' },
    { key: 'script', label: 'Script' },
    { key: 'production', label: 'Production' },
    { key: 'assembly', label: 'Assembly' },
    { key: 'publish', label: 'Publish' },
  ];

  // Find the index of the currently active step
  let foundActive = false;

  return (
    <div
      className="glass-card gradient-border p-5 animate-slide-up stagger-1"
      style={{ opacity: 0 }}
      data-testid="pipeline-roadmap"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent-600 flex items-center justify-center shadow-sm shadow-primary/20">
          <Activity className="w-3.5 h-3.5 text-white" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pipeline Roadmap</h3>
      </div>

      <div className="space-y-0">
        {groups.map((group, gi) => (
          <div key={group.key}>
            {/* Group label */}
            <div className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-8 mb-1.5 mt-3 first:mt-0">
              {group.label}
            </div>

            {PIPELINE_ROADMAP
              .filter((step) => step.group === group.key)
              .map((step, si) => {
                let stepStatus = getRoadmapStepStatus(step, topic, stageProgress, scenes);

                // Skip i2v/t2v if no scenes of that type
                if (stepStatus === 'skip') return null;

                // Determine if this is the current active step
                const isActive = stepStatus === 'active';
                const isDone = stepStatus === 'done';
                const isFailed = stepStatus === 'failed';
                const isPending = stepStatus === 'pending';

                if (isActive) foundActive = true;

                // Get progress info if available
                const sp = step.progressKey ? stageProgress?.[step.progressKey] : null;
                const hasProg = sp && sp.total > 0;
                const progPct = hasProg ? Math.round((sp.completed / sp.total) * 100) : 0;

                const StepIcon = step.icon;

                return (
                  <div key={step.key} className="flex items-start gap-3 relative">
                    {/* Vertical connector line */}
                    <div className="flex flex-col items-center flex-shrink-0 w-5">
                      {/* Icon circle */}
                      <div
                        className={`
                          relative w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                          transition-all duration-300
                          ${isDone ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : ''}
                          ${isActive ? 'bg-primary shadow-[0_0_12px_rgba(37,99,235,0.5)] ring-2 ring-primary/30' : ''}
                          ${isFailed ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : ''}
                          ${isPending ? 'bg-slate-200 dark:bg-white/[0.08]' : ''}
                        `}
                      >
                        {isDone && <CheckCircle2 className="w-3 h-3 text-white" />}
                        {isActive && <Loader2 className="w-3 h-3 text-white animate-spin" />}
                        {isFailed && <XCircle className="w-3 h-3 text-white" />}
                        {isPending && <Circle className="w-3 h-3 text-slate-400 dark:text-slate-500" />}
                      </div>
                      {/* Connector line (except last step globally) */}
                      {!(group.key === 'publish' && step.key === 'published') && (
                        <div
                          className={`w-px flex-1 min-h-[16px] ${
                            isDone ? 'bg-emerald-400/50 dark:bg-emerald-500/30' : 'bg-slate-200 dark:bg-white/[0.06]'
                          }`}
                        />
                      )}
                    </div>

                    {/* Step content */}
                    <div className={`flex-1 min-w-0 pb-3 ${isActive ? '-mt-0.5' : ''}`}>
                      <div className="flex items-center gap-2">
                        <StepIcon className={`w-3.5 h-3.5 flex-shrink-0 ${
                          isDone ? 'text-emerald-500' :
                          isActive ? 'text-primary' :
                          isFailed ? 'text-red-500' :
                          'text-slate-400 dark:text-slate-500'
                        }`} />
                        <span className={`text-xs font-medium ${
                          isDone ? 'text-emerald-600 dark:text-emerald-400' :
                          isActive ? 'text-primary dark:text-blue-400 font-semibold' :
                          isFailed ? 'text-red-600 dark:text-red-400' :
                          'text-slate-400 dark:text-slate-500'
                        }`}>
                          {step.label}
                        </span>
                        {isDone && (
                          <span className="text-2xs text-emerald-500 dark:text-emerald-400/70">Done</span>
                        )}
                      </div>

                      {/* Progress bar for active production stages */}
                      {isActive && hasProg && (
                        <div className="mt-1.5 ml-5">
                          <div className="flex items-center gap-2 text-2xs">
                            <div className="flex-1 progress-bar">
                              <div className="progress-bar-fill" style={{ width: `${progPct}%` }} />
                            </div>
                            <span className="tabular-nums font-semibold text-primary dark:text-blue-400">
                              {sp.completed}/{sp.total}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── TopicDetail (main page) ─────────────────────────── */
export default function TopicDetail() {
  const { id: projectId, topicId } = useParams();
  const [expandedStage, setExpandedStage] = useState(null);

  const { data: topic, isLoading: topicLoading } = useScript(topicId);
  const { scenes, stageProgress, failedScenes, isLoading: scenesLoading } =
    useProductionProgress(topicId);
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

  /* ─── Loading skeleton ──────────────────────────────── */
  if (isLoading) {
    return (
      <div className="animate-in">
        <div className="page-header">
          <div className="h-8 w-64 rounded-lg animate-shimmer" />
          <div className="h-4 w-40 rounded-lg animate-shimmer mt-2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="glass-card p-4 h-[500px] animate-shimmer rounded-2xl" />
          </div>
          <div className="lg:col-span-2 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card p-4 h-20 animate-shimmer" />
              ))}
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card p-6 h-24 animate-shimmer" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Topic not found ───────────────────────────────── */
  if (!topic) {
    return (
      <div className="animate-in">
        <div className="glass-card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/15 dark:to-orange-500/15 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Topic Not Found</h2>
          <p className="text-sm text-text-muted dark:text-text-muted-dark mb-6">
            The requested topic could not be loaded.
          </p>
          <Link
            to={`/project/${projectId}`}
            className="btn-primary btn-sm"
            aria-label="Back to project dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[topic.status] || STATUS_CONFIG.pending;
  const hasScript = topic.script_json || topic.word_count;
  const hasScenes = scenes.length > 0;
  const isInProduction = ['producing', 'audio', 'images', 'assembling', 'queued'].includes(topic.status);

  /* ─── Metric definitions ────────────────────────────── */
  const metricCards = [
    { label: 'Scenes', value: scenes.length || topic.scene_count || '--', icon: Layers, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
    { label: 'Words', value: topic.word_count?.toLocaleString() || '--', icon: FileText, gradient: 'from-cyan-500 to-teal-600', shadow: 'shadow-cyan-500/20' },
    { label: 'Duration', value: totalAudioDuration > 0 ? formatDuration(totalAudioDuration) : '--', icon: Clock, gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/20' },
    { label: 'Score', value: topic.script_quality_score ?? '--', icon: Activity, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
    { label: 'Cost', value: topic.total_cost != null ? `$${Number(topic.total_cost).toFixed(2)}` : '--', icon: DollarSign, gradient: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/20' },
    { label: 'Failed', value: failedScenes?.length || 0, icon: AlertTriangle, gradient: failedScenes?.length > 0 ? 'from-red-500 to-rose-600' : 'from-slate-400 to-slate-500', shadow: failedScenes?.length > 0 ? 'shadow-red-500/20' : '' },
  ];

  return (
    <div className="animate-in" data-testid="topic-detail-page">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={`/project/${projectId}`}
          className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          aria-label="Back to project dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="page-title truncate">{topic.seo_title || topic.original_title || 'Untitled'}</h1>
            <span className="flex-shrink-0 badge badge-blue text-2xs">#{topic.topic_number}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={statusCfg.cls}>{statusCfg.label}</span>
            {topic.playlist_angle && (
              <span className="text-2xs text-text-muted dark:text-text-muted-dark">{topic.playlist_angle}</span>
            )}
          </div>
        </div>
        {/* Quick actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasScript && (
            <Link
              to={`/project/${projectId}/topics/${topicId}/script`}
              className="btn-ghost btn-sm"
              data-testid="view-script-btn"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Script</span>
            </Link>
          )}
          {(topic.status === 'assembled' || topic.status === 'ready_review' || topic.video_review_status === 'approved') && topic.status !== 'published' && (
            <Link
              to={`/project/${projectId}/topics/${topicId}/review`}
              className="btn-primary btn-sm"
              data-testid="review-video-btn"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Review Video</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Main layout: Roadmap sidebar + Content ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pipeline Roadmap */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="lg:sticky lg:top-4">
            <PipelineRoadmap topic={topic} stageProgress={stageProgress} scenes={scenes} />
          </div>
        </div>

        {/* Right: Metrics + Asset Cards + Cost + Logs */}
        <div className="lg:col-span-8 xl:col-span-9">
          {/* ── Key metrics ─────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
            {metricCards.map((m, i) => (
              <div
                key={m.label}
                className={`group glass-card p-4 animate-slide-up stagger-${i + 1}`}
                style={{ opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {m.label}
                  </span>
                  <div className={`metric-card-icon bg-gradient-to-br ${m.gradient} ${m.shadow} shadow-md`}>
                    <m.icon className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                  </div>
                </div>
                <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{m.value}</p>
              </div>
            ))}
          </div>

          {/* ── Visual type distribution ──────────────── */}
          {hasScenes && (
            <div className="glass-card p-4 mb-6 animate-slide-up stagger-7" style={{ opacity: 0 }}>
              <h3 className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                Visual Type Distribution
              </h3>
              <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                {[
                  { label: 'Static Images', count: visualTypeCounts.static_image, color: 'bg-cyan-500' },
                  { label: 'Image-to-Video', count: visualTypeCounts.i2v, color: 'bg-purple-500' },
                  { label: 'Text-to-Video', count: visualTypeCounts.t2v, color: 'bg-amber-500' },
                ].map((v) => (
                  <div key={v.label} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-sm ${v.color}`} />
                    <span className="text-xs text-slate-600 dark:text-slate-400">{v.label}</span>
                    <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white">{v.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Asset stage cards ─────────────────────── */}
          {hasScenes ? (
            <div className="space-y-3 mb-6">
              <h2 className="section-title flex items-center gap-2">
                <Hash className="w-4 h-4 text-primary" />
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
                    staggerIndex={Math.min(stageIdx + 1, 8)}
                    stageProgress={stageProgress}
                  />
                );
              })}
            </div>
          ) : (
            <div className="glass-card p-8 text-center mb-6 animate-slide-up stagger-8" style={{ opacity: 0 }}>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 dark:from-primary/15 dark:to-accent/15 flex items-center justify-center mx-auto mb-5">
                <Layers className="w-7 h-7 text-slate-300 dark:text-slate-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">No Scenes Yet</h3>
              <p className="text-xs text-text-muted dark:text-text-muted-dark max-w-md mx-auto">
                {topic.status === 'pending' || topic.status === 'approved'
                  ? 'Scenes will appear after script generation and approval.'
                  : topic.status === 'scripting'
                    ? 'Script is being generated. Scenes will appear when complete.'
                    : 'Scene data is not yet available for this topic.'}
              </p>
            </div>
          )}

          {/* ── Cost breakdown ────────────────────────── */}
          {topic.cost_breakdown && (
            <div className="glass-card p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-sm shadow-emerald-500/20">
                  <Wallet className="w-3.5 h-3.5 text-white" />
                </div>
                <h3 className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Cost Breakdown
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(topic.cost_breakdown).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                    <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{key}</span>
                    <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                      ${typeof val === 'number' ? val.toFixed(2) : val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Activity log ──────────────────────────── */}
          {logs && logs.length > 0 && <ActivityLog logs={logs} />}
        </div>
      </div>
    </div>
  );
}
