import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Film,
  Flame,
  CheckCircle2,
  SkipForward,
  Pencil,
  Save,
  X,
  Sparkles,
  Clapperboard,
  Clock,
  Hash,
  ChevronRight,
  ChevronDown,
  FileText,
  Zap,
  Loader2,
  Activity,
  Play,
  ExternalLink,
  RefreshCw,
  XCircle,
  StopCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { useProjects } from '../hooks/useProjects';
import { useTopics } from '../hooks/useTopics';
import {
  useShorts,
  useShortsSummary,
  useAnalyzeForClips,
  useApproveClip,
  useSkipClip,
  useBulkApproveClips,
  useUpdateClip,
  useProduceClip,
  useProduceAllApproved,
  useCancelProduction,
  useReproduceClip,
} from '../hooks/useShorts';
import SkeletonCard from '../components/ui/SkeletonCard';
import ClipPreviewModal from '../components/social/ClipPreviewModal';

// ────────────────────────────────────────────────────────
// STATUS helpers
// ────────────────────────────────────────────────────────

const REVIEW_BADGE = {
  pending: { label: 'Pending', cls: 'badge-amber' },
  approved: { label: 'Approved', cls: 'badge-green' },
  skipped: { label: 'Skipped', cls: 'badge-red' },
};

const PRODUCTION_BADGE = {
  pending: { label: 'Not started', cls: 'badge-amber' },
  producing: { label: 'In progress', cls: 'badge-blue' },
  complete: { label: 'Complete', cls: 'badge-green' },
  uploaded: { label: 'Uploaded', cls: 'badge-cyan' },
  failed: { label: 'Failed', cls: 'badge-red' },
  cancelled: { label: 'Cancelled', cls: 'badge-amber' },
};

const TOPIC_STATUS_BADGE = {
  assembled: { label: 'Assembled', cls: 'badge-cyan' },
  published: { label: 'Published', cls: 'badge-green' },
};

function formatDuration(ms) {
  if (!ms) return '--';
  const seconds = Math.round(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ────────────────────────────────────────────────────────
// PRODUCTION PROGRESS PARSER
// ────────────────────────────────────────────────────────

const PRODUCTION_STEPS = [
  { key: 'audio', label: 'Download Audio', weight: 5 },
  { key: 'segments', label: 'Segment Narration', weight: 5 },
  { key: 'images', label: 'Generate Images', weight: 50 },
  { key: 'assembly', label: 'FFmpeg Assembly', weight: 5 },
  { key: 'captions', label: 'Kinetic Captions', weight: 10 },
  { key: 'music', label: 'Background Music', weight: 10 },
  { key: 'upload', label: 'Upload to Drive', weight: 10 },
];

function parseProgress(progressStr, productionStatus) {
  // Default: everything pending
  const result = {
    steps: PRODUCTION_STEPS.map((s) => ({
      ...s,
      status: 'pending', // pending | active | complete | failed
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
    // Mark steps up to where we know it failed
    // If we have progress info, parse it; otherwise just show first step failed
    if (!progressStr) {
      result.steps[0].status = 'failed';
      return result;
    }
  }

  if (!progressStr || productionStatus === 'pending') {
    return result;
  }

  // Parse the progress string
  const [stepKey, countPart] = progressStr.split(':');
  const stepIndex = PRODUCTION_STEPS.findIndex((s) => s.key === stepKey);

  if (stepKey === 'complete') {
    result.steps = result.steps.map((s) => ({ ...s, status: 'complete' }));
    result.percent = 100;
    return result;
  }

  if (stepIndex === -1) {
    // Unknown step, show as in-progress with no detail
    result.detail = progressStr;
    return result;
  }

  // Mark all steps before the active one as complete
  for (let i = 0; i < stepIndex; i++) {
    result.steps[i].status = 'complete';
  }

  // Mark the active step
  if (productionStatus === 'failed') {
    result.steps[stepIndex].status = 'failed';
  } else {
    result.steps[stepIndex].status = 'active';
  }
  result.activeStep = stepKey;

  // Calculate percentage
  // Sum weights of completed steps
  let completedWeight = 0;
  for (let i = 0; i < stepIndex; i++) {
    completedWeight += PRODUCTION_STEPS[i].weight;
  }

  // Add partial weight for images step
  if (stepKey === 'images' && countPart) {
    const [done, total] = countPart.split('/').map(Number);
    if (total > 0) {
      const fraction = done / total;
      completedWeight += PRODUCTION_STEPS[stepIndex].weight * fraction;
      result.steps[stepIndex].detail = `${done}/${total} images`;
    }
  } else {
    // For non-images active step, count it as ~50% through
    completedWeight += PRODUCTION_STEPS[stepIndex].weight * 0.5;
  }

  // Total weight is 95 (sum of all step weights)
  const totalWeight = PRODUCTION_STEPS.reduce((sum, s) => sum + s.weight, 0);
  result.percent = Math.round((completedWeight / totalWeight) * 100);

  // Parse detail for images
  if (countPart) {
    result.detail = countPart;
  }

  return result;
}

// ────────────────────────────────────────────────────────
// PRODUCTION ROW (expandable table row)
// ────────────────────────────────────────────────────────

function ProductionRow({ clip, onProduce, isProducing, onCancel, onReproduce, onPreview }) {
  const [expanded, setExpanded] = useState(false);
  const pBadge = PRODUCTION_BADGE[clip.production_status] || PRODUCTION_BADGE.pending;
  const progress = useMemo(
    () => parseProgress(clip.production_progress, clip.production_status),
    [clip.production_progress, clip.production_status]
  );

  const isExpandable = clip.production_status === 'producing' || clip.production_status === 'complete'
    || clip.production_status === 'uploaded' || clip.production_status === 'failed' || clip.production_status === 'cancelled';

  const statusDisplay = clip.production_status === 'producing'
    ? `${progress.percent}%`
    : pBadge.label;

  return (
    <>
      <tr
        className={`table-row ${isExpandable ? 'cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/[0.02]' : ''}`}
        onClick={() => isExpandable && setExpanded((prev) => !prev)}
      >
        <td className="table-cell">
          <div className="flex items-center gap-1.5">
            {isExpandable && (
              <ChevronDown
                className={`w-3 h-3 text-text-muted dark:text-text-muted-dark transition-transform duration-200 ${
                  expanded ? 'rotate-0' : '-rotate-90'
                }`}
              />
            )}
            <span className="badge badge-blue text-2xs">
              #{clip.clip_number}
            </span>
          </div>
        </td>
        <td className="table-cell text-sm font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
          {clip.clip_title || 'Untitled'}
        </td>
        <td className="table-cell text-sm text-text-muted dark:text-text-muted-dark tabular-nums hidden sm:table-cell">
          {formatDuration(clip.actual_duration_ms || clip.estimated_duration_ms)}
        </td>
        <td className="table-cell">
          {clip.production_status === 'producing' ? (
            <div className="flex items-center gap-2">
              <span className={`badge ${pBadge.cls} text-2xs`}>{statusDisplay}</span>
            </div>
          ) : (
            <span className={`badge ${pBadge.cls} text-2xs`}>{pBadge.label}</span>
          )}
        </td>
        <td className="table-cell hidden md:table-cell">
          {clip.production_status === 'producing' || clip.production_status === 'complete' || clip.production_status === 'uploaded' ? (
            <div className="flex items-center gap-2 min-w-[120px]">
              <div className="flex-1 h-1.5 bg-slate-200/80 dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    progress.percent === 100
                      ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                      : 'bg-gradient-to-r from-primary to-blue-400'
                  }`}
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <span className="text-2xs tabular-nums font-medium text-text-muted dark:text-text-muted-dark w-8 text-right">
                {progress.percent}%
              </span>
            </div>
          ) : clip.production_status === 'failed' ? (
            <span className="text-2xs text-red-500">Failed</span>
          ) : (
            <span className="text-2xs text-text-muted dark:text-text-muted-dark">--</span>
          )}
        </td>
        <td className="table-cell">
          {clip.portrait_drive_url ? (
            <button
              className="btn-ghost btn-sm !py-0.5 !px-1.5"
              onClick={(e) => { e.stopPropagation(); onPreview && onPreview(clip); }}
            >
              <Play className="w-3 h-3" />
              <span className="text-2xs">Preview</span>
            </button>
          ) : (
            <span className="text-2xs text-text-muted dark:text-text-muted-dark">--</span>
          )}
        </td>
        <td className="table-cell">
          {clip.production_status === 'pending' && (
            <button
              onClick={(e) => { e.stopPropagation(); onProduce(clip.id); }}
              disabled={isProducing}
              className="btn-primary btn-sm !py-0.5 !px-2"
            >
              {isProducing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              <span className="text-2xs">Produce</span>
            </button>
          )}
          {clip.production_status === 'producing' && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancel && onCancel(clip.id); }}
              className="btn-ghost btn-sm !py-0.5 !px-2 text-red-500 hover:text-red-600 dark:text-red-400"
              title="Stop production"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span className="text-2xs">Stop</span>
            </button>
          )}
          {(clip.production_status === 'complete' || clip.production_status === 'uploaded') && (
            <div className="flex items-center gap-1">
              {clip.portrait_drive_url && (
                <button
                  className="btn-ghost btn-sm !py-0.5 !px-1.5"
                  onClick={(e) => { e.stopPropagation(); onPreview && onPreview(clip); }}
                >
                  <Play className="w-3 h-3" />
                  <span className="text-2xs">Preview</span>
                </button>
              )}
              {!clip.portrait_drive_url && (
                <span className="flex items-center gap-1 text-2xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  Done
                </span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onReproduce && onReproduce(clip.id); }}
                className="btn-ghost btn-sm !py-0.5 !px-1.5"
                title="Re-produce clip"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="text-2xs">Re-produce</span>
              </button>
            </div>
          )}
          {clip.production_status === 'cancelled' && (
            <button
              onClick={(e) => { e.stopPropagation(); onReproduce && onReproduce(clip.id); }}
              className="btn-ghost btn-sm !py-0.5 !px-2"
              title="Re-produce clip"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="text-2xs">Re-produce</span>
            </button>
          )}
          {clip.production_status === 'failed' && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onProduce(clip.id); }}
                disabled={isProducing}
                className="btn-primary btn-sm !py-0.5 !px-2"
              >
                {isProducing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                <span className="text-2xs">Retry</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onReproduce && onReproduce(clip.id); }}
                className="btn-ghost btn-sm !py-0.5 !px-1.5"
                title="Re-produce clip (full reset)"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="text-2xs">Re-produce</span>
              </button>
            </div>
          )}
        </td>
      </tr>

      {/* Expanded step breakdown */}
      {expanded && isExpandable && (
        <tr className="bg-slate-50/50 dark:bg-white/[0.01]">
          <td colSpan={7} className="px-4 py-3">
            <div className="ml-6 space-y-3">
              {/* Full-width progress bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-200/80 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      progress.percent === 100
                        ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                        : 'bg-gradient-to-r from-primary to-blue-400'
                    }`}
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums font-semibold text-slate-700 dark:text-slate-300 w-10 text-right">
                  {progress.percent}%
                </span>
              </div>

              {/* Step list */}
              <div className="grid gap-1">
                {progress.steps.map((step) => (
                  <div
                    key={step.key}
                    className={`flex items-center gap-2.5 py-1 px-2 rounded-md text-xs ${
                      step.status === 'active'
                        ? 'bg-blue-50/80 dark:bg-blue-500/[0.08]'
                        : ''
                    }`}
                  >
                    {/* Step icon */}
                    {step.status === 'complete' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                    )}
                    {step.status === 'active' && (
                      <Loader2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 animate-spin flex-shrink-0" />
                    )}
                    {step.status === 'pending' && (
                      <Clock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                    )}
                    {step.status === 'failed' && (
                      <XCircle className="w-3.5 h-3.5 text-red-500 dark:text-red-400 flex-shrink-0" />
                    )}

                    {/* Step label */}
                    <span
                      className={`font-medium ${
                        step.status === 'complete'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : step.status === 'active'
                          ? 'text-blue-700 dark:text-blue-300'
                          : step.status === 'failed'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>

                    {/* Step detail */}
                    {step.detail && (
                      <span className="text-2xs text-blue-500 dark:text-blue-400 tabular-nums">
                        {step.detail}
                      </span>
                    )}

                    {/* Status text for completed/failed */}
                    {step.status === 'complete' && (
                      <span className="text-2xs text-emerald-500 dark:text-emerald-500/70 ml-auto">
                        completed
                      </span>
                    )}
                    {step.status === 'pending' && (
                      <span className="text-2xs text-slate-300 dark:text-slate-600 ml-auto">
                        pending
                      </span>
                    )}
                    {step.status === 'failed' && (
                      <span className="text-2xs text-red-500 dark:text-red-400/70 ml-auto">
                        failed
                      </span>
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

// ────────────────────────────────────────────────────────
// ANALYSIS PROGRESS TRACKER — Shows live stage-by-stage progress
// ────────────────────────────────────────────────────────

const ANALYSIS_STAGES = [
  { key: 'fetch_data', label: 'Fetching Data', icon: Film },
  { key: 'claude_analysis', label: 'AI Analysis', icon: Sparkles },
  { key: 'parsing_response', label: 'Parsing Results', icon: FileText },
  { key: 'validating_clips', label: 'Validating Clips', icon: CheckCircle2 },
  { key: 'inserting_shorts', label: 'Saving to DB', icon: Zap },
];

function AnalysisProgressTracker({ topicId }) {
  const [currentStep, setCurrentStep] = useState(null);
  const [stepMessage, setStepMessage] = useState('Starting analysis...');
  const [elapsedSec, setElapsedSec] = useState(0);
  const startTimeRef = useRef(Date.now());

  // Poll production_log for progress updates
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const { data } = await supabase
          .from('production_log')
          .select('action, details, created_at')
          .eq('topic_id', topicId)
          .eq('stage', 'shorts_analysis')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!active || !data || data.length === 0) return;
        const latest = data[0];
        const step = latest.details?.step || null;
        const message = latest.details?.message || latest.action;

        if (step) setCurrentStep(step);
        if (message) setStepMessage(message);
      } catch (e) { /* ignore */ }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [topicId]);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSec(Math.round((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentIndex = ANALYSIS_STAGES.findIndex((s) => s.key === currentStep);
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="w-full max-w-[320px] px-3 py-2.5 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary dark:text-blue-400" />
          <span className="text-2xs font-bold text-primary dark:text-blue-400 uppercase tracking-wider">Analyzing</span>
        </div>
        <span className="text-2xs font-mono tabular-nums text-slate-500 dark:text-slate-400">{formatTime(elapsedSec)}</span>
      </div>

      {/* Stage indicators */}
      <div className="space-y-1">
        {ANALYSIS_STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const isComplete = currentIndex > i;
          const isActive = currentIndex === i;
          const isPending = currentIndex < i;

          return (
            <div key={stage.key} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                isComplete ? 'bg-emerald-500' :
                isActive ? 'bg-primary animate-pulse' :
                'bg-slate-300 dark:bg-slate-600'
              }`}>
                {isComplete ? (
                  <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                ) : isActive ? (
                  <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                )}
              </div>
              <span className={`text-2xs font-medium ${
                isComplete ? 'text-emerald-600 dark:text-emerald-400 line-through' :
                isActive ? 'text-primary dark:text-blue-400' :
                'text-slate-400 dark:text-slate-500'
              }`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current message */}
      <p className="text-2xs text-slate-500 dark:text-slate-400 mt-2 italic truncate">
        {stepMessage}
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// UNIFIED TOPIC BROWSER — All topics from all projects
// ────────────────────────────────────────────────────────

const ALL_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'scripting', label: 'Scripting' },
  { value: 'producing', label: 'Producing' },
  { value: 'assembled', label: 'Assembled' },
  { value: 'published', label: 'Published' },
  { value: 'failed', label: 'Failed' },
];

const FULL_STATUS_BADGE = {
  pending: { label: 'Pending', cls: 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400' },
  approved: { label: 'Approved', cls: 'badge-blue' },
  scripting: { label: 'Scripting', cls: 'badge-purple' },
  script_approved: { label: 'Script OK', cls: 'badge-green' },
  queued: { label: 'Queued', cls: 'badge-amber' },
  producing: { label: 'Producing', cls: 'badge-amber' },
  audio: { label: 'Audio', cls: 'badge-purple' },
  images: { label: 'Images', cls: 'badge-purple' },
  assembling: { label: 'Assembling', cls: 'badge-purple' },
  assembled: { label: 'Assembled', cls: 'badge-cyan' },
  published: { label: 'Published', cls: 'badge-green' },
  failed: { label: 'Failed', cls: 'badge-red' },
  rejected: { label: 'Rejected', cls: 'badge-red' },
};

function AllTopicsBrowser({ projects, onSelectTopic, onAnalyze, analyzeLoading, analyzingTopicId, shortsSummaryAll }) {
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Flatten all topics from all projects
  const allTopics = useMemo(() => {
    if (!projects) return [];
    const result = [];
    for (const p of projects) {
      const topics = p.topics_summary || [];
      for (const t of topics) {
        result.push({ ...t, project_name: p.name || p.niche, project_id: p.id });
      }
    }
    result.sort((a, b) => {
      if (a.project_id !== b.project_id) return (a.project_name || '').localeCompare(b.project_name || '');
      return (a.topic_number || 0) - (b.topic_number || 0);
    });
    return result;
  }, [projects]);

  // Unique projects for filter dropdown
  const projectOptions = useMemo(() => {
    if (!projects) return [];
    return projects.map((p) => ({ value: p.id, label: p.name || p.niche }));
  }, [projects]);

  // Apply filters
  const filteredTopics = useMemo(() => {
    let result = allTopics;
    if (projectFilter) {
      result = result.filter((t) => t.project_id === projectFilter);
    }
    if (statusFilter) {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        (t.seo_title || t.original_title || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [allTopics, projectFilter, statusFilter, search]);

  // Counts
  const totalCount = allTopics.length;
  const readyCount = allTopics.filter((t) => t.status === 'assembled' || t.status === 'published').length;
  const filteredCount = filteredTopics.length;

  function getShortsLabel(topicId) {
    const s = shortsSummaryAll?.[topicId];
    if (!s || s.total === 0) return null;
    if (s.pending > 0 && s.approved === 0 && s.skipped === 0)
      return `${s.total} clips pending`;
    const parts = [];
    if (s.approved > 0) parts.push(`${s.approved} approved`);
    if (s.produced > 0) parts.push(`${s.produced} produced`);
    return parts.join(', ') || `${s.total} clips`;
  }

  function canAnalyze(topic) {
    if (topic.status !== 'assembled' && topic.status !== 'published') return false;
    const s = shortsSummaryAll?.[topic.id];
    return !s || s.total === 0;
  }

  function hasShorts(topicId) {
    const s = shortsSummaryAll?.[topicId];
    return s && s.total > 0;
  }

  if (allTopics.length === 0) {
    return (
      <div className="glass-card p-16 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 flex items-center justify-center mx-auto mb-5">
          <Film className="w-7 h-7 text-primary dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          No topics found
        </h3>
        <p className="text-sm text-text-muted dark:text-text-muted-dark max-w-md mx-auto leading-relaxed">
          Generate topics from the long-form video section first. All generated topics will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="glass-card p-4">
          <p className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Total Topics</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">{totalCount}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Ready for Shorts</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{readyCount}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Projects</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">{projectOptions.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Showing</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">{filteredCount}</p>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <input
            type="text"
            placeholder="Search topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 w-full text-sm"
          />
          <Film className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>

        {/* Project filter */}
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm font-semibold bg-black text-white border border-white/[0.12] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 min-w-[160px] cursor-pointer [&>option]:bg-black [&>option]:text-white [&>option]:font-semibold [&>option:hover]:bg-blue-600 [&>option:checked]:bg-blue-600"
        >
          <option value="">All Projects</option>
          {projectOptions.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm font-semibold bg-black text-white border border-white/[0.12] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 min-w-[140px] cursor-pointer [&>option]:bg-black [&>option]:text-white [&>option]:font-semibold [&>option:hover]:bg-blue-600 [&>option:checked]:bg-blue-600"
        >
          {ALL_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {/* Clear filters */}
        {(projectFilter || statusFilter || search) && (
          <button
            onClick={() => { setProjectFilter(''); setStatusFilter(''); setSearch(''); }}
            className="btn-ghost btn-sm text-2xs"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Topic list */}
      {filteredTopics.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            No topics match your filters.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTopics.map((topic, i) => {
            const statusBadge = FULL_STATUS_BADGE[topic.status] || { label: topic.status, cls: 'badge-amber' };
            const shortsLabel = getShortsLabel(topic.id);
            const isReady = topic.status === 'assembled' || topic.status === 'published';

            return (
              <div
                key={topic.id}
                className={`glass-card p-4 animate-slide-up stagger-${Math.min(i + 1, 8)} ${!isReady ? 'opacity-75' : ''}`}
                style={{ opacity: 0 }}
              >
                <div className="flex items-center gap-3">
                  {/* Topic number */}
                  <span className="badge badge-blue text-2xs flex-shrink-0">
                    #{topic.topic_number}
                  </span>

                  {/* Title + meta */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {topic.seo_title || topic.original_title || `Topic #${topic.topic_number}`}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-2xs text-slate-400 dark:text-slate-500 font-medium">
                        {topic.project_name}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span className={`badge ${statusBadge.cls} text-2xs`}>
                        {statusBadge.label}
                      </span>
                      {shortsLabel && (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-2xs text-emerald-600 dark:text-emerald-400 font-medium">
                            {shortsLabel}
                          </span>
                        </>
                      )}
                      {!isReady && !shortsLabel && (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-2xs text-text-muted dark:text-text-muted-dark italic">
                            Not ready — needs assembly
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {analyzingTopicId === topic.id ? (
                      <AnalysisProgressTracker topicId={topic.id} />
                    ) : canAnalyze(topic) ? (
                      <button
                        onClick={() => onAnalyze(topic.id)}
                        disabled={analyzeLoading}
                        className="btn-primary btn-sm"
                      >
                        {analyzeLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">Analyze</span>
                      </button>
                    ) : null}
                    {hasShorts(topic.id) && (
                      <button
                        onClick={() => onSelectTopic(topic)}
                        className="btn-secondary btn-sm"
                      >
                        <span className="hidden sm:inline">Review Clips</span>
                        <span className="sm:hidden">Review</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────
// LEVEL 3: Clip Review Grid — Gate 4
// ────────────────────────────────────────────────────────

function ClipCard({ clip, topicId, onApprove, onSkip, onSave, isSaving, onProduce, isProducing, onReproduce, onPreview }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [originalScenes, setOriginalScenes] = useState(null);
  const [scenesLoading, setScenesLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(clip.clip_title || '');

  // Fetch original scenes when expanded
  useEffect(() => {
    if (!isExpanded || originalScenes || !clip.start_scene || !clip.end_scene) return;
    setScenesLoading(true);
    supabase
      .from('scenes')
      .select('scene_number,narration_text,image_prompt,visual_type,emotional_beat,audio_duration_ms,chapter')
      .eq('topic_id', topicId)
      .gte('scene_number', clip.start_scene)
      .lte('scene_number', clip.end_scene)
      .order('scene_number', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setOriginalScenes(data);
        setScenesLoading(false);
      });
  }, [isExpanded, originalScenes, clip.start_scene, clip.end_scene, topicId]);
  const [editHook, setEditHook] = useState(clip.hook_text || '');
  const [editHashtags, setEditHashtags] = useState(
    (clip.hashtags || []).join(', ')
  );

  const reviewBadge = REVIEW_BADGE[clip.review_status] || REVIEW_BADGE.pending;
  const productionBadge = PRODUCTION_BADGE[clip.production_status] || PRODUCTION_BADGE.pending;
  const viralityScore = clip.virality_score || 0;
  const isHot = viralityScore >= 8;
  const isPending = clip.review_status === 'pending';

  function handleSave() {
    onSave({
      clipId: clip.id,
      updates: {
        clip_title: editTitle,
        hook_text: editHook,
        hashtags: editHashtags.split(',').map((h) => h.trim()).filter(Boolean),
      },
    });
    setIsEditing(false);
  }

  function handleCancel() {
    setEditTitle(clip.clip_title || '');
    setEditHook(clip.hook_text || '');
    setEditHashtags((clip.hashtags || []).join(', '));
    setIsEditing(false);
  }

  return (
    <div className={`glass-card p-4 relative ${clip.production_status === 'producing' ? 'border-l-4 border-blue-500' : ''}`}>
      {/* Virality score bar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="badge badge-blue text-2xs">
            Clip #{clip.clip_number}
          </span>
          <span className={`badge ${reviewBadge.cls} text-2xs`}>
            {reviewBadge.label}
          </span>
          {clip.production_status && clip.production_status !== 'pending' && (
            <span className={`badge ${productionBadge.cls} text-2xs`}>
              {productionBadge.label}
            </span>
          )}
        </div>

        {/* Virality score */}
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold tabular-nums ${
            isHot
              ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/[0.12] dark:text-orange-400'
              : viralityScore >= 6
                ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/[0.12] dark:text-amber-400'
                : 'bg-slate-100 text-slate-500 dark:bg-white/[0.04] dark:text-slate-400'
          }`}
        >
          {isHot && <Flame className="w-3 h-3" />}
          {viralityScore}/10
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="text-2xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
              Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="input !py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-2xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
              Hook Text
            </label>
            <input
              type="text"
              value={editHook}
              onChange={(e) => setEditHook(e.target.value)}
              className="input !py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-2xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
              Hashtags (comma separated)
            </label>
            <input
              type="text"
              value={editHashtags}
              onChange={(e) => setEditHashtags(e.target.value)}
              className="input !py-2 text-sm"
              placeholder="#viral, #shorts"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={handleSave} disabled={isSaving} className="btn-success btn-sm">
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
            <button onClick={handleCancel} className="btn-ghost btn-sm">
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 line-clamp-2">
            {clip.clip_title || 'Untitled clip'}
          </h4>

          {clip.hook_text && (
            <p className="text-xs text-text-muted dark:text-text-muted-dark mb-2 line-clamp-2 italic">
              "{clip.hook_text}"
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 text-2xs text-text-muted dark:text-text-muted-dark mb-3">
            {clip.start_scene != null && clip.end_scene != null && (
              <span className="flex items-center gap-1">
                <Film className="w-3 h-3" />
                Scenes {clip.start_scene}-{clip.end_scene}
              </span>
            )}
            {clip.estimated_duration_ms && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(clip.estimated_duration_ms)}
              </span>
            )}
            {clip.hashtags && clip.hashtags.length > 0 && (
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {clip.hashtags.length}
              </span>
            )}
          </div>

          {/* Production status indicator */}
          {clip.review_status === 'approved' && clip.production_status && clip.production_status !== 'pending' && (
            <div className="flex items-center gap-2 mb-3">
              {clip.production_status === 'producing' && (
                <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Producing...
                  {clip.production_progress && (
                    <span className="text-2xs text-text-muted dark:text-text-muted-dark font-normal ml-1">
                      ({clip.production_progress})
                    </span>
                  )}
                </span>
              )}
              {(clip.production_status === 'complete' || clip.production_status === 'uploaded') && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Complete
                  {clip.actual_duration_ms && (
                    <span className="text-2xs text-text-muted dark:text-text-muted-dark font-normal ml-1">
                      ({formatDuration(clip.actual_duration_ms)})
                    </span>
                  )}
                </span>
              )}
              {clip.production_status === 'failed' && (
                <div>
                  <span className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
                    <X className="w-3.5 h-3.5" />
                    Failed
                  </span>
                  {clip.production_progress && (
                    <p className="text-2xs text-red-500 dark:text-red-400/80 mt-1 line-clamp-2">
                      {clip.production_progress}
                    </p>
                  )}
                </div>
              )}
              {clip.production_status === 'cancelled' && (
                <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <XCircle className="w-3.5 h-3.5" />
                  Cancelled
                </span>
              )}
              {clip.portrait_drive_url && (
                <button
                  onClick={(ev) => { ev.stopPropagation(); onPreview && onPreview(clip); }}
                  className="btn-ghost btn-sm ml-auto !py-0.5 !px-1.5"
                >
                  <Play className="w-3 h-3" />
                  <span className="text-2xs">Preview</span>
                </button>
              )}
            </div>
          )}

          {/* Virality reason */}
          {clip.virality_reason && (
            <p className="text-2xs text-text-muted dark:text-text-muted-dark mb-3 line-clamp-2">
              {clip.virality_reason}
            </p>
          )}

          {/* Hashtags */}
          {clip.hashtags && clip.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {clip.hashtags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="inline-block px-1.5 py-0.5 rounded text-2xs font-medium bg-slate-100 text-slate-500 dark:bg-white/[0.04] dark:text-slate-400"
                >
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
              {clip.hashtags.length > 5 && (
                <span className="text-2xs text-text-muted dark:text-text-muted-dark">
                  +{clip.hashtags.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isPending && (
              <>
                <button onClick={() => onApprove(clip.id)} className="btn-success btn-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button onClick={() => onSkip(clip.id)} className="btn-ghost btn-sm">
                  <SkipForward className="w-3.5 h-3.5" />
                  Skip
                </button>
              </>
            )}
            {clip.review_status === 'approved' && clip.production_status === 'pending' && (
              <button
                onClick={() => onProduce(clip.id)}
                disabled={isProducing}
                className="btn-primary btn-sm"
              >
                {isProducing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Produce
              </button>
            )}
            {clip.production_status === 'failed' && (
              <button
                onClick={() => onProduce(clip.id)}
                disabled={isProducing}
                className="btn-primary btn-sm"
              >
                {isProducing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Retry
              </button>
            )}
            {(clip.production_status === 'complete' || clip.production_status === 'uploaded' || clip.production_status === 'cancelled' || clip.production_status === 'failed') && (
              <button
                onClick={() => onReproduce && onReproduce(clip.id)}
                className="btn-ghost btn-sm"
                title="Re-produce clip (full reset)"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Re-produce
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="btn-ghost btn-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Script</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="btn-ghost btn-sm ml-auto"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          </div>

          {/* Expandable full script view */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/[0.06] space-y-3">
              <h5 className="text-2xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3 h-3" />
                Full Script — Scenes {clip.start_scene}–{clip.end_scene}
              </h5>

              {scenesLoading && (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-xs text-text-muted dark:text-text-muted-dark">Loading scenes...</span>
                </div>
              )}

              {!scenesLoading && originalScenes && (() => {
                const rewriteMap = {};
                (clip.rewritten_narration || []).forEach(r => { rewriteMap[r.scene] = r.text; });
                const emphasisColors = {};
                (clip.emphasis_word_map || []).forEach(e => {
                  if (typeof e === 'object' && e.word) emphasisColors[e.word.toLowerCase()] = e.color || 'yellow';
                });
                const emphasisWords = Object.keys(emphasisColors);

                return originalScenes.map((scene, idx) => (
                  <div key={idx} className="rounded-lg bg-slate-50/80 dark:bg-white/[0.02] p-3 space-y-2">
                    {/* Scene header */}
                    <div className="flex items-center gap-2">
                      <span className="text-2xs font-bold text-primary dark:text-blue-400 uppercase tracking-wider">
                        Scene {scene.scene_number}
                      </span>
                      {scene.chapter && (
                        <span className="text-2xs text-text-muted dark:text-text-muted-dark">
                          · {scene.chapter}
                        </span>
                      )}
                      {scene.audio_duration_ms && (
                        <span className="text-2xs text-text-muted dark:text-text-muted-dark ml-auto tabular-nums">
                          {formatDuration(scene.audio_duration_ms)}
                        </span>
                      )}
                    </div>

                    {/* Side-by-side narration layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Original full narration */}
                      <div>
                        <span className="text-2xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Original Script
                        </span>
                        <p className="text-sm text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                          {scene.narration_text}
                        </p>
                      </div>

                      {/* Short-form rewrite */}
                      {rewriteMap[scene.scene_number] && (
                        <div className="border-l-2 border-accent/40 dark:border-accent/30 pl-3">
                          <span className="text-2xs font-semibold text-accent dark:text-orange-400 uppercase tracking-wider">
                            Short-Form Rewrite
                          </span>
                          <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                            {rewriteMap[scene.scene_number].split(/(\s+)/).map((word, wi) => {
                              const clean = word.replace(/[^a-zA-Z0-9$%]/g, '').toLowerCase();
                              const matchKey = emphasisWords.find(ew => clean === ew || word.toLowerCase().includes(ew));
                              if (matchKey) {
                                const color = emphasisColors[matchKey];
                                return (
                                  <span key={wi} className={`font-bold ${color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                    {word}
                                  </span>
                                );
                              }
                              return <span key={wi}>{word}</span>;
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()}

              {/* Emphasis words summary (clickable to toggle) */}
              {(clip.emphasis_word_map || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-2xs text-text-muted dark:text-text-muted-dark font-medium">Caption Emphasis (click to toggle):</span>
                  {(clip.emphasis_word_map || []).map((e, i) => {
                    const word = typeof e === 'string' ? e : e.word;
                    const color = typeof e === 'object' ? e.color : 'yellow';
                    return (
                      <button
                        key={i}
                        className={`inline-block px-1.5 py-0.5 rounded text-2xs font-bold cursor-pointer transition-opacity hover:opacity-70 ${color === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-500/[0.15] dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/[0.15] dark:text-amber-400'}`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          // Toggle: cycle yellow -> red -> remove
                          const currentMap = [...(clip.emphasis_word_map || [])];
                          const entry = currentMap[i];
                          const currentColor = (typeof entry === 'object' ? entry.color : 'yellow');
                          if (currentColor === 'yellow') {
                            currentMap[i] = { word, color: 'red' };
                          } else if (currentColor === 'red') {
                            currentMap.splice(i, 1);
                          }
                          onSave({
                            clipId: clip.id,
                            updates: { emphasis_word_map: currentMap },
                          });
                        }}
                        title={`Click to cycle color (yellow -> red -> remove)`}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ClipReview({ topicId, topic, onBack }) {
  const { data: clips = [], isLoading } = useShorts(topicId);
  const approveMutation = useApproveClip(topicId);
  const skipMutation = useSkipClip(topicId);
  const bulkApproveMutation = useBulkApproveClips(topicId);
  const updateMutation = useUpdateClip(topicId);
  const produceClipMutation = useProduceClip(topicId);
  const produceAllMutation = useProduceAllApproved(topicId);
  const cancelMutation = useCancelProduction(topicId);
  const reproduceMutation = useReproduceClip(topicId);
  const [previewClip, setPreviewClip] = useState(null);

  const counts = useMemo(() => {
    const total = clips.length;
    const approved = clips.filter((c) => c.review_status === 'approved').length;
    const skipped = clips.filter((c) => c.review_status === 'skipped').length;
    const pending = clips.filter((c) => c.review_status === 'pending').length;
    const produced = clips.filter(
      (c) => c.production_status === 'complete' || c.production_status === 'uploaded'
    ).length;
    const producing = clips.filter(
      (c) => c.production_status === 'producing'
    ).length;
    const failed = clips.filter(
      (c) => c.production_status === 'failed'
    ).length;
    const cancelled = clips.filter(
      (c) => c.production_status === 'cancelled'
    ).length;
    const producible = clips.filter(
      (c) => c.review_status === 'approved' && c.production_status === 'pending'
    ).length;
    return { total, approved, skipped, pending, produced, producing, failed, cancelled, producible };
  }, [clips]);

  const sortedClips = useMemo(() => {
    return [...clips].sort((a, b) => (b.virality_score || 0) - (a.virality_score || 0));
  }, [clips]);

  const pendingClips = useMemo(() => clips.filter((c) => c.review_status === 'pending'), [clips]);

  const handleApprove = useCallback((clipId) => {
    approveMutation.mutate({ clipId }, {
      onError: (err) => toast.error(err?.message || 'Failed to approve clip'),
    });
  }, [approveMutation]);

  const handleSkip = useCallback((clipId) => {
    skipMutation.mutate({ clipId }, {
      onError: (err) => toast.error(err?.message || 'Failed to skip clip'),
    });
  }, [skipMutation]);

  const handleSave = useCallback((vars) => {
    updateMutation.mutate(vars, {
      onSuccess: () => toast.success('Clip updated'),
      onError: (err) => toast.error(err?.message || 'Failed to update clip'),
    });
  }, [updateMutation]);

  const handleBulkApproveAll = useCallback(() => {
    const ids = pendingClips.map((c) => c.id);
    if (ids.length === 0) return;
    bulkApproveMutation.mutate({ clipIds: ids }, {
      onSuccess: () => toast.success(`Approved all ${ids.length} clips`),
      onError: (err) => toast.error(err?.message || 'Bulk approve failed'),
    });
  }, [pendingClips, bulkApproveMutation]);

  const handleBulkApproveTop10 = useCallback(() => {
    const top10 = sortedClips
      .filter((c) => c.review_status === 'pending')
      .slice(0, 10)
      .map((c) => c.id);
    if (top10.length === 0) return;
    bulkApproveMutation.mutate({ clipIds: top10 }, {
      onSuccess: () => toast.success(`Approved top ${top10.length} clips`),
      onError: (err) => toast.error(err?.message || 'Bulk approve failed'),
    });
  }, [sortedClips, bulkApproveMutation]);

  const handleSkipRemaining = useCallback(() => {
    // Skip all pending clips one by one (no bulk skip endpoint, use individual calls)
    const remaining = pendingClips.map((c) => c.id);
    remaining.forEach((id) => skipMutation.mutate({ clipId: id }));
    if (remaining.length > 0) {
      toast.success(`Skipping ${remaining.length} remaining clips`);
    }
  }, [pendingClips, skipMutation]);

  const handleProduce = useCallback((clipId) => {
    produceClipMutation.mutate({ clipId }, {
      onSuccess: () => toast.success('Production started for clip'),
      onError: (err) => toast.error(err?.message || 'Failed to trigger production'),
    });
  }, [produceClipMutation]);

  const handleProduceAll = useCallback(() => {
    produceAllMutation.mutate(undefined, {
      onSuccess: () => toast.success(`Production triggered for ${counts.producible} clips`),
      onError: (err) => toast.error(err?.message || 'Failed to trigger bulk production'),
    });
  }, [produceAllMutation, counts.producible]);

  const handleCancel = useCallback((clipId) => {
    cancelMutation.mutate({ clipId }, {
      onSuccess: () => toast.success('Production cancelled'),
      onError: (err) => toast.error(err?.message || 'Failed to cancel'),
    });
  }, [cancelMutation]);

  const handleReproduce = useCallback((clipId) => {
    reproduceMutation.mutate({ clipId }, {
      onSuccess: () => toast.success('Re-producing clip'),
      onError: (err) => toast.error(err?.message || 'Failed to re-produce clip'),
    });
  }, [reproduceMutation]);

  // All approved clips for the production table (regardless of production_status)
  const approvedClips = useMemo(() => {
    return clips.filter((c) => c.review_status === 'approved');
  }, [clips]);

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors duration-200 mb-5 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Topics
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {topic?.seo_title || topic?.original_title || 'Clip Review'}
          </h2>
          <p className="text-sm text-text-muted dark:text-text-muted-dark mt-0.5">
            Gate 4 &mdash; Review viral clip candidates
          </p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="glass-card p-4 mb-5">
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
          {[
            { label: 'Total', value: counts.total, color: 'text-slate-900 dark:text-white' },
            { label: 'Pending', value: counts.pending, color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Approved', value: counts.approved, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Skipped', value: counts.skipped, color: 'text-red-500 dark:text-red-400' },
            { label: 'Producible', value: counts.producible, color: 'text-primary dark:text-blue-400' },
            { label: 'Producing', value: counts.producing, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Complete', value: counts.produced, color: 'text-cyan-600 dark:text-cyan-400' },
            { label: 'Failed', value: counts.failed, color: 'text-red-600 dark:text-red-400' },
            { label: 'Cancelled', value: counts.cancelled, color: 'text-amber-500 dark:text-amber-400' },
          ].map((stat) => (
            <div key={stat.label} className="text-center sm:text-left">
              <p className="text-2xs text-text-muted dark:text-text-muted-dark font-medium uppercase tracking-wider">
                {stat.label}
              </p>
              <p className={`text-xl font-bold tabular-nums ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {(counts.pending > 0 || counts.producible > 0) && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {counts.pending > 0 && (
            <>
              <button
                onClick={handleBulkApproveAll}
                disabled={bulkApproveMutation.isPending}
                className="btn-success btn-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve All ({counts.pending})
              </button>
              {counts.pending >= 10 && (
                <button
                  onClick={handleBulkApproveTop10}
                  disabled={bulkApproveMutation.isPending}
                  className="btn-primary btn-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Approve Top 10
                </button>
              )}
              <button
                onClick={handleSkipRemaining}
                disabled={skipMutation.isPending}
                className="btn-ghost btn-sm"
              >
                <SkipForward className="w-3.5 h-3.5" />
                Skip Remaining
              </button>
            </>
          )}
          {counts.producible > 0 && (
            <>
              {counts.pending > 0 && (
                <span className="w-px h-5 bg-slate-200 dark:bg-white/[0.08] mx-1" />
              )}
              <button
                onClick={handleProduceAll}
                disabled={produceAllMutation.isPending}
                className="btn-primary btn-sm"
              >
                {produceAllMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Produce Approved ({counts.producible})
              </button>
            </>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && clips.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Film className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-base font-medium text-slate-600 dark:text-slate-400 mb-1">
            No clips yet
          </p>
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            Run "Analyze for Viral Clips" from the topic list to generate clip candidates.
          </p>
        </div>
      )}

      {/* Clip grid */}
      {!isLoading && sortedClips.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedClips.map((clip, i) => (
            <div
              key={clip.id}
              className={`animate-slide-up stagger-${Math.min(i + 1, 8)}`}
              style={{ opacity: 0 }}
            >
              <ClipCard
                clip={clip}
                topicId={topicId}
                onApprove={handleApprove}
                onSkip={handleSkip}
                onSave={handleSave}
                isSaving={updateMutation.isPending}
                onProduce={handleProduce}
                isProducing={produceClipMutation.isPending}
                onReproduce={handleReproduce}
                onPreview={setPreviewClip}
              />
            </div>
          ))}
        </div>
      )}

      {/* Production status section */}
      {approvedClips.length > 0 && (
        <div className="mt-8">
          <h3 className="section-title mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Production Status
            {counts.producible > 0 && (
              <span className="text-2xs font-normal text-text-muted dark:text-text-muted-dark ml-1">
                ({counts.producible} ready to produce)
              </span>
            )}
          </h3>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/[0.04]">
                    <th className="table-header table-cell">Clip</th>
                    <th className="table-header table-cell">Title</th>
                    <th className="table-header table-cell hidden sm:table-cell">Duration</th>
                    <th className="table-header table-cell">Status</th>
                    <th className="table-header table-cell hidden md:table-cell">Progress</th>
                    <th className="table-header table-cell">Drive</th>
                    <th className="table-header table-cell">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedClips.map((clip) => (
                    <ProductionRow
                      key={clip.id}
                      clip={clip}
                      onProduce={handleProduce}
                      isProducing={produceClipMutation.isPending}
                      onCancel={handleCancel}
                      onReproduce={handleReproduce}
                      onPreview={setPreviewClip}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <ClipPreviewModal
        isOpen={!!previewClip}
        onClose={() => setPreviewClip(null)}
        clip={previewClip}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────

export default function ShortsCreator() {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [analyzingTopicId, setAnalyzingTopicId] = useState(null);

  const { data: projects, isLoading: projectsLoading } = useProjects();
  const analyzeMutation = useAnalyzeForClips();

  // Query ALL shorts across ALL projects for summary counts
  const { data: shortsSummaryAll } = useQuery({
    queryKey: ['shorts-summary-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shorts')
        .select('id, topic_id, review_status, production_status');

      if (error) throw error;

      const byTopic = {};
      for (const s of (data || [])) {
        if (!byTopic[s.topic_id]) {
          byTopic[s.topic_id] = { total: 0, approved: 0, skipped: 0, produced: 0, pending: 0 };
        }
        const bucket = byTopic[s.topic_id];
        bucket.total++;
        if (s.review_status === 'approved') bucket.approved++;
        else if (s.review_status === 'skipped') bucket.skipped++;
        else bucket.pending++;
        if (s.production_status === 'complete' || s.production_status === 'uploaded') bucket.produced++;
      }
      return byTopic;
    },
  });

  // Subscribe to shorts table for live updates on the summary
  // When new shorts are inserted by n8n, this auto-refreshes and the UI updates
  useRealtimeSubscription('shorts', null, [['shorts-summary-all']]);

  // Clear analyzing state when shorts appear for the analyzing topic
  useEffect(() => {
    if (analyzingTopicId && shortsSummaryAll?.[analyzingTopicId]?.total > 0) {
      setAnalyzingTopicId(null);
      toast.success('Analysis complete! 20 viral clips identified. Click "Review Clips" to see them.');
    }
  }, [analyzingTopicId, shortsSummaryAll]);

  const handleAnalyze = useCallback(
    (topicId) => {
      setAnalyzingTopicId(topicId);
      analyzeMutation.mutate(
        { topic_id: topicId },
        {
          onSuccess: () => toast.success('Analysis started — finding 20 viral clips (~2 minutes)...'),
          onError: (err) => {
            setAnalyzingTopicId(null);
            toast.error(err?.message || 'Analysis failed');
          },
        }
      );
    },
    [analyzeMutation]
  );

  const inClipReview = !!selectedTopic;

  return (
    <div className="animate-slide-up">
      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Shorts Creator</h1>
        <p className="page-subtitle">
          {inClipReview
            ? 'Review and approve viral clip candidates'
            : 'Browse all topics across projects — filter by project and status'}
        </p>
      </div>

      {/* Topic browser (default view) */}
      {!inClipReview && (
        <>
          {projectsLoading && (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}
          {!projectsLoading && (
            <AllTopicsBrowser
              projects={projects}
              onSelectTopic={setSelectedTopic}
              onAnalyze={handleAnalyze}
              analyzeLoading={analyzeMutation.isPending}
              analyzingTopicId={analyzingTopicId}
              shortsSummaryAll={shortsSummaryAll}
            />
          )}
        </>
      )}

      {/* Clip review (when a topic is selected) */}
      {inClipReview && (
        <ClipReview
          topicId={selectedTopic.id}
          topic={selectedTopic}
          onBack={() => setSelectedTopic(null)}
        />
      )}
    </div>
  );
}
