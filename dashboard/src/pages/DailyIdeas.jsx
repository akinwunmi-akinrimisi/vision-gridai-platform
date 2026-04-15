import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Lightbulb,
  Play,
  Loader2,
  Sparkles,
  Target,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useDailyIdeas,
  useDailyIdeasSummary,
  useGenerateDailyIdeas,
  useUpdateIdeaStatus,
  usePromoteIdeaToTopic,
} from '../hooks/useDailyIdeas';
import PageHeader from '../components/shared/PageHeader';
import KPICard from '../components/shared/KPICard';
import EmptyState from '../components/shared/EmptyState';
import IdeaCard from '../components/ideas/IdeaCard';
import IdeasDateFilter from '../components/ideas/IdeasDateFilter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'saved', label: 'Saved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'used', label: 'Used' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatRelativeTime(dateStr) {
  if (!dateStr) return '\u2014';
  try {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '\u2014';
  }
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function IdeaCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-10 bg-muted rounded" />
        <div className="h-5 w-12 bg-muted rounded" />
      </div>
      <div className="h-4 w-full bg-muted rounded mb-2" />
      <div className="h-4 w-3/4 bg-muted rounded mb-3" />
      <div className="space-y-2">
        <div className="h-1.5 bg-muted rounded" />
        <div className="h-1.5 bg-muted rounded" />
        <div className="h-1.5 bg-muted rounded" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DailyIdeas() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  const [dateRange, setDateRange] = useState('today');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyIdeaIds, setBusyIdeaIds] = useState(() => new Set());

  const { data: ideas = [], isLoading } = useDailyIdeas(projectId, {
    dateRange,
    status: statusFilter,
  });
  const { data: summaryRows = [] } = useDailyIdeasSummary(projectId);

  const generateMutation = useGenerateDailyIdeas(projectId);
  const updateStatusMutation = useUpdateIdeaStatus(projectId);
  const promoteMutation = usePromoteIdeaToTopic(projectId);

  /* -- Summary stats (all-time) -- */
  const summary = useMemo(() => {
    const total = summaryRows.length;
    const pending = summaryRows.filter((r) => r.status === 'pending' || !r.status).length;
    const saved = summaryRows.filter((r) => r.status === 'saved').length;
    const used = summaryRows.filter((r) => r.status === 'used').length;

    const pendingScored = summaryRows.filter(
      (r) => (r.status === 'pending' || !r.status) && r.combined_score != null,
    );
    const avgPending = pendingScored.length > 0
      ? Math.round(
        pendingScored.reduce((s, r) => s + r.combined_score, 0) / pendingScored.length,
      )
      : 0;

    const savedOrUsed = saved + used;
    const ratio = total > 0 ? Math.round((savedOrUsed / total) * 100) : 0;

    const mostRecent = summaryRows.reduce((latest, r) => {
      if (!r.created_at) return latest;
      const t = new Date(r.created_at).getTime();
      return t > latest ? t : latest;
    }, 0);

    return {
      total,
      pending,
      saved,
      used,
      avgPending,
      ratio,
      lastRunISO: mostRecent ? new Date(mostRecent).toISOString() : null,
    };
  }, [summaryRows]);

  const subtitle = useMemo(() => {
    const parts = [
      `${summary.pending} pending`,
      `${summary.saved} saved`,
    ];
    if (summary.lastRunISO) {
      parts.push(`Last run ${formatRelativeTime(summary.lastRunISO)}`);
    }
    return parts.join(' \u00B7 ');
  }, [summary]);

  /* -- Mutation helpers -- */
  const markBusy = (id, busy) => {
    setBusyIdeaIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    try {
      const res = await generateMutation.mutateAsync();
      if (res?.success === false) {
        toast.error(res.error || 'Generation failed');
      } else {
        toast.success('Idea generation started. Results will stream in as they resolve.');
      }
    } catch (err) {
      toast.error(err?.message || 'Generation failed');
    }
  };

  const handleStatusChange = async (idea, nextStatus) => {
    markBusy(idea.id, true);
    try {
      await updateStatusMutation.mutateAsync({ ideaId: idea.id, status: nextStatus });
      const label = nextStatus === 'saved'
        ? 'Saved'
        : nextStatus === 'dismissed'
          ? 'Dismissed'
          : 'Moved back to pending';
      toast.success(`${label} \u2014 "${idea.idea_title.slice(0, 60)}${idea.idea_title.length > 60 ? '\u2026' : ''}"`);
    } catch (err) {
      toast.error(err?.message || 'Update failed');
    } finally {
      markBusy(idea.id, false);
    }
  };

  const handlePromote = async (idea, opts = {}) => {
    // If reopening an already-used idea, just navigate to the existing topic
    if (opts.reopen && idea.used_as_topic_id) {
      navigate(`/project/${projectId}/topics/${idea.used_as_topic_id}`);
      return;
    }

    markBusy(idea.id, true);
    try {
      const topic = await promoteMutation.mutateAsync({ idea });
      toast.success('Idea promoted to topic');
      if (topic?.id) {
        navigate(`/project/${projectId}/topics/${topic.id}`);
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to promote idea');
    } finally {
      markBusy(idea.id, false);
    }
  };

  /* -- Render -- */
  const showEmpty = !isLoading && ideas.length === 0;
  const emptyCopyIsToday = dateRange === 'today' && statusFilter === 'all';

  return (
    <div className="animate-slide-up">
      <PageHeader title="Daily Ideas" subtitle={subtitle}>
        {generateMutation.isPending && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Generating...
          </span>
        )}
      </PageHeader>

      {/* Action bar: generate + filters */}
      <div className="bg-card border border-border rounded-xl p-4 mb-5 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="flex-shrink-0"
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {generateMutation.isPending ? 'Generating...' : 'Generate Now'}
          </Button>
          <IdeasDateFilter value={dateRange} onChange={setDateRange} />
          <div className="flex-1" />
        </div>

        {/* Status tabs */}
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted border border-border self-start overflow-x-auto max-w-full">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
                statusFilter === tab.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="stagger-1 animate-slide-up">
          <KPICard label="Total Ideas" value={summary.total} icon={Lightbulb} />
        </div>
        <div className="stagger-2 animate-slide-up">
          <KPICard label="Pending Review" value={summary.pending} icon={Activity} />
        </div>
        <div className="stagger-3 animate-slide-up">
          <KPICard label="Avg Score (Pending)" value={summary.avgPending} icon={Target} />
        </div>
        <div className="stagger-4 animate-slide-up">
          <KPICard
            label="Saved / Used Rate"
            value={`${summary.ratio}%`}
            icon={CheckCircle2}
          />
        </div>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <IdeaCardSkeleton key={i} />
          ))}
        </div>
      )}

      {showEmpty && emptyCopyIsToday && (
        <div className="bg-card border border-border rounded-xl">
          <EmptyState
            icon={Sparkles}
            title="No ideas yet"
            description="Click Generate Now to create your first batch of scored ideas."
            action={
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {generateMutation.isPending ? 'Generating...' : 'Generate Now'}
              </Button>
            }
          />
        </div>
      )}

      {showEmpty && !emptyCopyIsToday && (
        <div className="bg-card border border-border rounded-xl">
          <EmptyState
            icon={Sparkles}
            title="No ideas match these filters"
            description="Try adjusting the date range or status filter above."
          />
        </div>
      )}

      {!isLoading && ideas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ideas.map((idea, i) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              index={i}
              isBusy={busyIdeaIds.has(idea.id)}
              onSave={(it) => handleStatusChange(it, 'saved')}
              onDismiss={(it) => handleStatusChange(it, 'dismissed')}
              onUse={(it, opts) => handlePromote(it, opts)}
              onMarkPending={(it) => handleStatusChange(it, 'pending')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
