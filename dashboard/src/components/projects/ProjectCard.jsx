import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Folder,
  RotateCcw,
  ArrowRight,
  Trash2,
  Heart,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import StatusBadge from '../shared/StatusBadge';
import ConfirmDialog from '../ui/ConfirmDialog';
import ProjectProgressIndicator, { shouldShowProjectProgress } from './ProjectProgressIndicator';
import { useRunNicheHealth } from '../../hooks/useAnalyticsIntelligence';
import { Button } from '@/components/ui/button';

/* ── Status → StatusBadge mapping ─────────────────────────────── */

const STATUS_TO_BADGE = {
  created: 'pending',
  researching: 'active',
  researching_competitors: 'active',
  researching_pain_points: 'active',
  researching_keywords: 'active',
  researching_blue_ocean: 'active',
  researching_prompts: 'active',
  ready_for_topics: 'scripting',
  topics_pending_review: 'review',
  active: 'approved',
  in_production: 'active',
  paused: 'failed',
  research_failed: 'failed',
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

function getSmartRoute(status, projectId) {
  if (!status) return `/project/${projectId}`;
  if (status.startsWith('researching')) return `/project/${projectId}/research`;
  if (status === 'ready_for_topics') return `/project/${projectId}/research`;
  if (status === 'topics_pending_review') return `/project/${projectId}/topics`;
  if (status === 'active' || status === 'in_production') return `/project/${projectId}`;
  if (status === 'research_failed') return `/project/${projectId}/research`;
  return `/project/${projectId}`;
}

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

function parseProgress(progStr) {
  if (!progStr || progStr === 'pending' || progStr === 'complete') return null;
  const match = progStr.match(/done:(\d+)\/(\d+)/);
  if (match) return { done: parseInt(match[1], 10), total: parseInt(match[2], 10) };
  return null;
}

/**
 * Compute an accurate project status from the topics_summary array.
 */
function computeProjectStatus(projectStatus, topics) {
  if (!topics || topics.length === 0) {
    const label = STATUS_LABEL[projectStatus] || projectStatus || 'Unknown';
    const badgeStatus = STATUS_TO_BADGE[projectStatus] || 'pending';
    return { label, badgeStatus, detail: null, topicCount: 0, publishedCount: 0, totalSpend: 0, totalRevenue: 0 };
  }

  const topicCount = topics.length;

  const statusCounts = {};
  for (const t of topics) {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  }

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

  const totalSpend = topics.reduce((s, t) => s + (parseFloat(t.total_cost) || 0), 0);
  const totalRevenue = topics.reduce((s, t) => s + (parseFloat(t.yt_estimated_revenue) || 0), 0);

  const base = { topicCount, publishedCount, totalSpend, totalRevenue };

  if (publishedCount === topicCount) {
    return { label: 'All Published', badgeStatus: 'published', detail: `${topicCount} video${topicCount !== 1 ? 's' : ''}`, ...base };
  }
  if (producingTopics.length > 0) {
    const activeTopic = producingTopics.find((t) => t.status === 'producing') || producingTopics[0];
    const topicNum = activeTopic.topic_number;
    let progressDetail = '';
    if (['producing', 'audio', 'images'].includes(activeTopic.status)) {
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
    return { label: `Production: Topic #${topicNum}${progressDetail}`, badgeStatus: 'active', detail: producingTopics.length > 1 ? `+${producingTopics.length - 1} queued` : null, ...base };
  }
  if (assembledCount > 0) {
    const reviewTopic = topics.find((t) => t.status === 'ready_review' || t.status === 'assembled');
    return { label: 'Video Review (Gate 3)', badgeStatus: 'review', detail: reviewTopic ? `Topic #${reviewTopic.topic_number}` : `${assembledCount} topic${assembledCount !== 1 ? 's' : ''}`, ...base };
  }
  if (scriptingTopics.length > 0) {
    const t = scriptingTopics[0];
    return { label: `Script Gen: Topic #${t.topic_number}`, badgeStatus: 'scripting', detail: scriptingTopics.length > 1 ? `+${scriptingTopics.length - 1} more` : null, ...base };
  }
  if (scriptApprovedCount > 0) {
    return { label: 'Ready for Production', badgeStatus: 'approved', detail: `${scriptApprovedCount} topic${scriptApprovedCount !== 1 ? 's' : ''} approved`, ...base };
  }
  if (pendingReviewCount > 0 && pendingReviewCount === topicCount) {
    return { label: 'Topics Pending Review', badgeStatus: 'review', detail: `${topicCount} topic${topicCount !== 1 ? 's' : ''}`, ...base };
  }
  if (pendingReviewCount > 0) {
    const approvedCount = reviewCounts.approved || 0;
    return { label: 'Topics Under Review', badgeStatus: 'review', detail: `${approvedCount} approved, ${pendingReviewCount} pending`, ...base };
  }
  if (publishedCount > 0) {
    return { label: `${publishedCount} Published`, badgeStatus: 'published', detail: `of ${topicCount} total`, ...base };
  }

  const label = STATUS_LABEL[projectStatus] || projectStatus || 'Active';
  const badgeStatus = STATUS_TO_BADGE[projectStatus] || 'pending';
  return { label, badgeStatus, detail: null, ...base };
}

/* ── Sprint S7: Niche health styling + inline sparkline ───────── */

const HEALTH_STYLES = {
  thriving: { pill: 'bg-success-bg text-success border-success-border', stroke: '#34D399' },
  stable:   { pill: 'bg-accent/20 text-accent border-accent/40',         stroke: '#FBBF24' },
  warning:  { pill: 'bg-warning-bg text-warning border-warning-border',  stroke: '#F59E0B' },
  critical: { pill: 'bg-danger-bg text-danger border-danger-border',     stroke: '#F87171' },
};

/**
 * Inline SVG sparkline (no Recharts — kept lightweight per-card).
 * points = [{ health_score, week_over_week_delta, ... }] oldest-first
 */
function HealthSparkline({ points, stroke }) {
  if (!points || points.length < 2) return null;
  const W = 80;
  const H = 24;
  const pad = 2;
  const xs = points.map((_, i) => (i / (points.length - 1)) * (W - pad * 2) + pad);
  const minY = 0;
  const maxY = 100;
  const ys = points.map(
    (p) => H - pad - ((p.health_score - minY) / (maxY - minY)) * (H - pad * 2),
  );
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const lastX = xs[xs.length - 1];
  const lastY = ys[ys.length - 1];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="flex-shrink-0">
      <path d={d} fill="none" stroke={stroke || '#71717A'} strokeWidth={1.5} />
      <circle cx={lastX} cy={lastY} r={2} fill={stroke || '#71717A'} />
    </svg>
  );
}

/* ── Niche emoji picker ──────────────────────────────────────── */

function getNicheEmoji(niche) {
  if (!niche) return '\uD83D\uDCCA';
  const n = niche.toLowerCase();
  if (n.includes('credit') || n.includes('finance') || n.includes('money')) return '\uD83D\uDCB3';
  if (n.includes('crypto') || n.includes('bitcoin')) return '\u20BF';
  if (n.includes('stoic') || n.includes('philosophy')) return '\uD83E\uDDD8';
  if (n.includes('crime') || n.includes('mystery')) return '\uD83D\uDD0D';
  if (n.includes('space') || n.includes('astro')) return '\uD83D\uDE80';
  if (n.includes('health') || n.includes('fitness')) return '\uD83D\uDCAA';
  if (n.includes('cook') || n.includes('food')) return '\uD83C\uDF73';
  if (n.includes('tech') || n.includes('ai') || n.includes('code')) return '\uD83E\uDD16';
  if (n.includes('travel')) return '\u2708\uFE0F';
  if (n.includes('music')) return '\uD83C\uDFB5';
  if (n.includes('game') || n.includes('gaming')) return '\uD83C\uDFAE';
  if (n.includes('history')) return '\uD83C\uDFDB\uFE0F';
  if (n.includes('science')) return '\uD83E\uDDEC';
  if (n.includes('psych') || n.includes('relationship')) return '\uD83E\uDDE0';
  return '\uD83D\uDCCA';
}

/* ── Component ───────────────────────────────────────────────── */

export default function ProjectCard({ project, onRetry, onDelete, isDeleting, healthHistory }) {
  const navigate = useNavigate();
  const {
    id,
    name,
    niche,
    status,
    created_at,
    updated_at,
    topics_summary,
    // Sprint S7 niche intelligence columns
    niche_health_score,
    niche_health_classification,
    niche_health_last_computed_at,
    estimated_rpm_low,
    estimated_rpm_mid,
    estimated_rpm_high,
  } = project;
  const [, setTick] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const runHealthMut = useRunNicheHealth(id);

  const computedStatus = useMemo(
    () => computeProjectStatus(status, topics_summary),
    [status, topics_summary]
  );

  // Sprint S7 — derive niche health display state
  const healthStyle = niche_health_classification
    ? HEALTH_STYLES[niche_health_classification]
    : null;
  // WoW delta from latest history row
  const latestHealthRow =
    Array.isArray(healthHistory) && healthHistory.length > 0
      ? healthHistory[healthHistory.length - 1]
      : null;
  const wowDelta = latestHealthRow?.week_over_week_delta ?? null;
  const hasHealth = niche_health_score != null && niche_health_last_computed_at != null;
  const hasRPM = estimated_rpm_low != null && estimated_rpm_high != null;

  const handleRefreshHealth = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await runHealthMut.mutateAsync();
      if (res?.success === false) {
        toast.error(res.error || 'Failed to refresh niche health');
      } else {
        toast.success('Niche health refresh queued');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to refresh niche health');
    }
  };

  const route = getSmartRoute(status, id);
  // The new ProjectProgressIndicator decides what to render; we mirror its
  // visibility check here so the metrics row stays hidden whenever the
  // indicator is showing meaningful content.
  const showResearchProgress = shouldShowProjectProgress(status);
  const emoji = getNicheEmoji(niche);

  // Auto-refresh relative time every 60s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const relativeTime = formatRelativeTime(updated_at || created_at);

  // Show delete only on early-stage or failed projects with no topics in production
  const hasTopics = topics_summary && topics_summary.length > 0;
  const hasProductionTopics = hasTopics && topics_summary.some((t) =>
    ['scripting', 'producing', 'audio', 'images', 'assembling', 'assembled', 'published', 'ready_review'].includes(t.status)
  );
  const isDeletableStatus = [
    'created', 'researching', 'researching_competitors', 'researching_pain_points',
    'researching_keywords', 'researching_blue_ocean', 'researching_prompts',
    'research_failed', 'failed',
  ].includes(status);
  const canDelete = onDelete && isDeletableStatus && !hasProductionTopics;

  // Progress ratio for mini bar
  const progressRatio = computedStatus.topicCount > 0
    ? computedStatus.publishedCount / computedStatus.topicCount
    : 0;

  return (
    <div
      onClick={() => navigate(route)}
      className="bg-card border border-border rounded-xl cursor-pointer hover:border-border-hover transition-colors group overflow-hidden"
    >
      {/* Top gradient bar */}
      <div className="h-0.5 bg-gradient-to-r from-primary to-destructive" />

      {/* Card content */}
      <div className="p-5">

      {/* Header: emoji + name + counts + status badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0" role="img" aria-label={niche}>
            {emoji}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold tracking-tight truncate">
              {name || niche}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {computedStatus.topicCount} topics
              {computedStatus.publishedCount > 0 && (
                <span className="text-success"> / {computedStatus.publishedCount} published</span>
              )}
            </p>
          </div>
        </div>
        <StatusBadge
          status={computedStatus.badgeStatus}
          label={computedStatus.label}
          className="flex-shrink-0 max-w-[140px] truncate"
        />
      </div>

      {/* Computed status detail */}
      {computedStatus.detail && (
        <p className="text-xs text-muted-foreground mb-3">{computedStatus.detail}</p>
      )}

      {/* Live progress indicator — replaces the broken substage-based stepper.
          Renders elapsed time + simulated breakdown while research/topic-gen is
          running, a calm confirmation when complete, or null otherwise. */}
      <ProjectProgressIndicator project={project} />

      {/* Metrics row + progress bar (only when not researching) */}
      {!showResearchProgress && (
        <>
          {/* Metrics inline */}
          <div className="flex items-center gap-4 text-xs mb-3">
            <span className="text-accent font-semibold tabular-nums">
              {computedStatus.totalRevenue > 0
                ? `$${computedStatus.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : '$0'}
              <span className="text-muted-foreground font-normal ml-1">rev</span>
            </span>
            {computedStatus.totalSpend > 0 && computedStatus.totalRevenue > 0 && (
              <span className="text-success font-semibold tabular-nums">
                {(computedStatus.totalRevenue / computedStatus.totalSpend).toFixed(1)}x
                <span className="text-muted-foreground font-normal ml-1">ROI</span>
              </span>
            )}
            <span className="tabular-nums">
              {computedStatus.totalSpend > 0
                ? `$${computedStatus.totalSpend.toFixed(0)}`
                : '$0'}
              <span className="text-muted-foreground ml-1">spent</span>
            </span>
          </div>

          {/* Mini progress bar */}
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
              style={{ width: `${Math.max(progressRatio * 100, 0)}%` }}
            />
          </div>
        </>
      )}

      {/* Sprint S7 — Niche health + RPM (hidden while researching) */}
      {!showResearchProgress && (hasHealth || hasRPM) && (
        <div
          className="mt-3 pt-3 border-t border-border flex items-center gap-2.5 flex-wrap"
          data-testid="niche-health-section"
        >
          {hasHealth ? (
            <>
              {/* Badge: score + classification */}
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold tabular-nums ${
                  healthStyle?.pill || 'bg-muted text-muted-foreground border-border'
                }`}
              >
                <Heart className="w-3 h-3" />
                {niche_health_score}/100
                {niche_health_classification && (
                  <span className="capitalize font-normal opacity-80">
                    {niche_health_classification}
                  </span>
                )}
              </span>

              {/* WoW delta */}
              {wowDelta != null && (
                <span
                  className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${
                    wowDelta > 0 ? 'text-success' : wowDelta < 0 ? 'text-danger' : 'text-muted-foreground'
                  }`}
                  title="Week-over-week health delta"
                >
                  {wowDelta > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : wowDelta < 0 ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                  {wowDelta > 0 ? '+' : ''}
                  {wowDelta}
                </span>
              )}

              {/* Sparkline */}
              {Array.isArray(healthHistory) && healthHistory.length >= 2 && (
                <HealthSparkline
                  points={healthHistory}
                  stroke={healthStyle?.stroke}
                />
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] text-muted-foreground border border-border">
              <Heart className="w-3 h-3" />
              Health not yet computed
            </span>
          )}

          {/* RPM range */}
          {hasRPM && (
            <span className="text-[11px] text-muted-foreground tabular-nums ml-auto">
              <span className="font-semibold text-foreground">
                ${parseFloat(estimated_rpm_low).toFixed(2)}&ndash;${parseFloat(estimated_rpm_high).toFixed(2)}
              </span>
              <span className="opacity-70"> / 1K</span>
            </span>
          )}

          {/* Refresh health on demand */}
          <button
            onClick={handleRefreshHealth}
            disabled={runHealthMut.isPending}
            className="p-1 rounded-md text-muted-foreground/60 hover:text-accent hover:bg-accent/10 transition-colors"
            title="Run niche health now"
            data-testid={`refresh-health-${id}`}
          >
            <RefreshCw
              className={`w-3 h-3 ${runHealthMut.isPending ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      )}

      {/* Footer: time + delete + arrow */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <p className="text-2xs text-muted-foreground">{relativeTime}</p>
          {canDelete && (
            <button
              data-testid={`delete-project-${id}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="p-1 rounded-md text-muted-foreground/40 hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
              title="Delete project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
      </div>

      {/* Retry button for failed research */}
      {status === 'research_failed' && onRetry && (
        <Button
          variant="outline"
          size="sm"
          data-testid={`retry-research-${id}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRetry({ project_id: id });
          }}
          className="mt-3 w-full border-danger/30 text-danger hover:bg-danger-bg"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Retry Research
        </Button>
      )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete(id);
          setShowDeleteConfirm(false);
        }}
        title="Delete Project"
        message={`Are you sure you want to delete "${name || niche}"? This will permanently remove the project and all related data (topics, scripts, scenes, research). This action cannot be undone.`}
        confirmText="Delete Project"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
