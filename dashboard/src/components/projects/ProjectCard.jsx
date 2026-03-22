import { useMemo, useState, useEffect } from 'react';
import { NavLink } from 'react-router';
import { Folder, CheckCircle2, Circle, Loader2, RotateCcw, ArrowRight } from 'lucide-react';

const STATUS_BADGE = {
  created: 'badge bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400',
  researching: 'badge badge-amber',
  researching_competitors: 'badge badge-amber',
  researching_pain_points: 'badge badge-amber',
  researching_keywords: 'badge badge-amber',
  researching_blue_ocean: 'badge badge-amber',
  researching_prompts: 'badge badge-amber',
  ready_for_topics: 'badge badge-blue',
  topics_pending_review: 'badge badge-purple',
  active: 'badge badge-green',
  in_production: 'badge badge-green',
  paused: 'badge badge-red',
  research_failed: 'badge badge-red',
};

const STATUS_LABEL = {
  created: 'Created',
  researching: 'Researching',
  researching_competitors: 'Researching',
  researching_pain_points: 'Researching',
  researching_keywords: 'Researching',
  researching_blue_ocean: 'Researching',
  researching_prompts: 'Generating Prompts',
  ready_for_topics: 'Ready for Topics',
  topics_pending_review: 'Topics Pending',
  active: 'Active',
  in_production: 'In Production',
  paused: 'Paused',
  research_failed: 'Research Failed',
};

const RESEARCH_STEPS = [
  { key: 'created', label: 'Creating project' },
  { key: 'researching_competitors', label: 'Auditing competitors' },
  { key: 'researching_pain_points', label: 'Mining pain points' },
  { key: 'researching_blue_ocean', label: 'Blue-ocean analysis' },
  { key: 'researching_prompts', label: 'Generating prompts' },
];

const STEP_ORDER = RESEARCH_STEPS.map((s) => s.key);

function getStepStatus(currentStatus, stepKey) {
  const currentIdx = STEP_ORDER.indexOf(currentStatus);
  const stepIdx = STEP_ORDER.indexOf(stepKey);

  if (['ready_for_topics', 'topics_pending_review', 'active', 'in_production'].includes(currentStatus)) {
    return 'done';
  }

  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

function getSmartRoute(status, projectId) {
  if (!status) return `/project/${projectId}`;
  if (status.startsWith('researching')) return `/project/${projectId}/research`;
  if (status === 'ready_for_topics') return `/project/${projectId}/research`;
  if (status === 'topics_pending_review') return `/project/${projectId}/topics`;
  if (status === 'active' || status === 'in_production') return `/project/${projectId}`;
  if (status === 'research_failed') return `/project/${projectId}/research`;
  return `/project/${projectId}`;
}

function isResearching(status) {
  return status && (status.startsWith('researching') || status === 'created');
}

// Icon gradient based on status
function getCardAccent(status) {
  if (status === 'active' || status === 'in_production') return 'from-emerald-500 to-teal-600';
  if (status === 'topics_pending_review') return 'from-violet-500 to-purple-600';
  if (status === 'research_failed') return 'from-red-500 to-rose-600';
  if (status?.startsWith('researching')) return 'from-amber-500 to-orange-500';
  return 'from-primary-500 to-indigo-600';
}

/**
 * Format a relative time string from a date.
 */
function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Parse progress string like "done:45/132" into { done: 45, total: 132 }
 */
function parseProgress(progStr) {
  if (!progStr || progStr === 'pending' || progStr === 'complete') return null;
  const match = progStr.match(/done:(\d+)\/(\d+)/);
  if (match) return { done: parseInt(match[1], 10), total: parseInt(match[2], 10) };
  return null;
}

/**
 * Compute an accurate project status from the topics_summary array.
 * Returns { label: string, badge: string, detail?: string }
 */
function computeProjectStatus(projectStatus, topics) {
  if (!topics || topics.length === 0) {
    const label = STATUS_LABEL[projectStatus] || projectStatus || 'Unknown';
    const badge = STATUS_BADGE[projectStatus] || STATUS_BADGE.created;
    return { label, badge, detail: null, topicCount: 0, publishedCount: 0, totalSpend: 0, totalRevenue: 0 };
  }

  const topicCount = topics.length;

  // Count by status
  const statusCounts = {};
  for (const t of topics) {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  }

  // Count by review status
  const reviewCounts = {};
  for (const t of topics) {
    reviewCounts[t.review_status] = (reviewCounts[t.review_status] || 0) + 1;
  }

  const publishedCount = statusCounts.published || 0;
  const assembledCount = (statusCounts.assembled || 0) + (statusCounts.ready_review || 0);
  const producingTopics = topics.filter((t) =>
    ['producing', 'audio', 'images', 'assembling', 'queued'].includes(t.status)
  );
  const scriptingTopics = topics.filter((t) => t.status === 'scripting');
  const scriptApprovedCount = statusCounts.script_approved || 0;
  const pendingReviewCount = topics.filter((t) => t.review_status === 'pending').length;

  // Aggregate financials
  const totalSpend = topics.reduce((s, t) => s + (parseFloat(t.total_cost) || 0), 0);
  const totalRevenue = topics.reduce((s, t) => s + (parseFloat(t.yt_estimated_revenue) || 0), 0);

  const base = { topicCount, publishedCount, totalSpend, totalRevenue };

  // Priority order: most advanced active state first
  if (publishedCount === topicCount) {
    return { label: 'All Published', badge: 'badge badge-green', detail: `${topicCount} video${topicCount !== 1 ? 's' : ''}`, ...base };
  }
  if (producingTopics.length > 0) {
    const activeTopic = producingTopics.find((t) => t.status === 'producing') || producingTopics[0];
    const topicNum = activeTopic.topic_number;
    let progressDetail = '';
    if (activeTopic.status === 'producing' || activeTopic.status === 'audio' || activeTopic.status === 'images') {
      const imgProg = parseProgress(activeTopic.images_progress);
      const audioProg = parseProgress(activeTopic.audio_progress);
      if (imgProg && imgProg.done < imgProg.total && audioProg && audioProg.done >= audioProg.total) {
        progressDetail = ` (Images ${imgProg.done}/${imgProg.total})`;
      } else if (audioProg && audioProg.done < audioProg.total) {
        progressDetail = ` (Audio ${audioProg.done}/${audioProg.total})`;
      } else if (imgProg) {
        progressDetail = ` (Images ${imgProg.done}/${imgProg.total})`;
      }
    }
    return { label: `Production: Topic #${topicNum}${progressDetail}`, badge: 'badge badge-amber animate-pulse', detail: producingTopics.length > 1 ? `+${producingTopics.length - 1} queued` : null, ...base };
  }
  if (assembledCount > 0) {
    const reviewTopic = topics.find((t) => t.status === 'ready_review' || t.status === 'assembled');
    return { label: 'Video Review Pending (Gate 3)', badge: 'badge badge-purple', detail: reviewTopic ? `Topic #${reviewTopic.topic_number}` : `${assembledCount} topic${assembledCount !== 1 ? 's' : ''}`, ...base };
  }
  if (scriptingTopics.length > 0) {
    const t = scriptingTopics[0];
    return { label: `Script Generation: Topic #${t.topic_number}`, badge: 'badge badge-cyan animate-pulse', detail: scriptingTopics.length > 1 ? `+${scriptingTopics.length - 1} more` : null, ...base };
  }
  if (scriptApprovedCount > 0) {
    return { label: 'Ready for Production', badge: 'badge badge-blue', detail: `${scriptApprovedCount} topic${scriptApprovedCount !== 1 ? 's' : ''} approved`, ...base };
  }
  if (pendingReviewCount > 0 && pendingReviewCount === topicCount) {
    return { label: 'Topics Pending Review (Gate 1)', badge: 'badge badge-purple', detail: `${topicCount} topic${topicCount !== 1 ? 's' : ''}`, ...base };
  }
  if (pendingReviewCount > 0) {
    const approvedCount = reviewCounts.approved || 0;
    return { label: 'Topics Under Review', badge: 'badge badge-purple', detail: `${approvedCount} approved, ${pendingReviewCount} pending`, ...base };
  }
  if (publishedCount > 0) {
    return { label: `${publishedCount} Published`, badge: 'badge badge-green', detail: `of ${topicCount} total`, ...base };
  }

  const label = STATUS_LABEL[projectStatus] || projectStatus || 'Active';
  const badge = STATUS_BADGE[projectStatus] || STATUS_BADGE.created;
  return { label, badge, detail: null, ...base };
}

export default function ProjectCard({ project, onRetry }) {
  const { id, name, niche, status, created_at, updated_at, topics_summary } = project;
  const [, setTick] = useState(0);

  const computedStatus = useMemo(
    () => computeProjectStatus(status, topics_summary),
    [status, topics_summary]
  );

  const route = getSmartRoute(status, id);
  const showResearchProgress = isResearching(status);
  const accent = getCardAccent(status);

  // Auto-refresh relative time every 60s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const relativeTime = formatRelativeTime(updated_at || created_at);

  return (
    <NavLink to={route} className="card-interactive p-6 group block no-underline">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-110 flex-shrink-0`}>
          <Folder className="w-5 h-5 text-white" strokeWidth={1.8} />
        </div>
        <span className={`${computedStatus.badge} text-right max-w-[60%] truncate`}>{computedStatus.label}</span>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 tracking-tight line-clamp-2">
        {name || niche}
      </h3>
      <p className="text-sm text-text-muted dark:text-text-muted-dark mb-1">
        {niche}
      </p>
      {/* Computed status detail */}
      {computedStatus.detail && (
        <p className="text-xs text-text-muted dark:text-text-muted-dark mb-3">
          {computedStatus.detail}
        </p>
      )}

      {/* Research progress */}
      {showResearchProgress && (
        <div className="space-y-1.5 mb-4 mt-3" data-testid="research-progress">
          {RESEARCH_STEPS.map((step) => {
            const stepStatus = getStepStatus(status, step.key);
            return (
              <div key={step.key} className="flex items-center gap-2.5 text-xs">
                {stepStatus === 'done' && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                )}
                {stepStatus === 'active' && (
                  <Loader2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 animate-spin" />
                )}
                {stepStatus === 'pending' && (
                  <Circle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                )}
                <span className={`
                  transition-colors duration-200
                  ${stepStatus === 'done' ? 'text-emerald-600 dark:text-emerald-400' : ''}
                  ${stepStatus === 'active' ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}
                  ${stepStatus === 'pending' ? 'text-slate-400 dark:text-slate-500' : ''}
                `}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      {!showResearchProgress && (
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
          <div>
            <p className="text-2xs text-slate-400 dark:text-slate-500 mb-0.5">Topics</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums font-mono">
              {computedStatus.topicCount ?? project.topic_count ?? 0}
            </p>
          </div>
          <div>
            <p className="text-2xs text-slate-400 dark:text-slate-500 mb-0.5">Published</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums font-mono">
              {computedStatus.publishedCount ?? project.published_count ?? 0}
            </p>
          </div>
          <div>
            <p className="text-2xs text-slate-400 dark:text-slate-500 mb-0.5">Spent</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums font-mono">
              {computedStatus.totalSpend > 0 ? `$${computedStatus.totalSpend.toFixed(0)}` : '--'}
            </p>
          </div>
          <div>
            <p className="text-2xs text-slate-400 dark:text-slate-500 mb-0.5">Revenue</p>
            <p className={`text-sm font-bold tabular-nums font-mono ${computedStatus.totalRevenue > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
              {computedStatus.totalRevenue > 0
                ? `$${computedStatus.totalRevenue.toFixed(0)}${computedStatus.totalSpend > 0 ? ` (${(computedStatus.totalRevenue / computedStatus.totalSpend).toFixed(1)}x)` : ''}`
                : '--'}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-2xs text-slate-400 dark:text-slate-500">
          {relativeTime}
        </p>
        <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-primary dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all duration-200" />
      </div>

      {/* Retry button */}
      {status === 'research_failed' && onRetry && (
        <button
          data-testid={`retry-research-${id}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRetry({ project_id: id });
          }}
          className="mt-3 w-full btn-sm btn text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/[0.08] border border-amber-200/50 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/[0.12]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Retry Research
        </button>
      )}
    </NavLink>
  );
}
