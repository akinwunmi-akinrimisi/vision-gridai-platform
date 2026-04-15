import { useMemo } from 'react';
import {
  Brain,
  Loader2,
  RefreshCw,
  HelpCircle,
  AlertTriangle,
  Heart,
  Lightbulb,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import EmptyState from '../shared/EmptyState';
import PersonaCard from './PersonaCard';
import RecurringQuestionsCard from './RecurringQuestionsCard';
import ContentComplaintsCard from './ContentComplaintsCard';
import SuggestedTopicsCard from './SuggestedTopicsCard';
import AudienceContextBlock from './AudienceContextBlock';
import {
  useLatestAudienceInsights,
  useRunAudienceIntelligence,
  usePromoteAudienceSuggestion,
  useCreateTopicFromSuggestion,
} from '../../hooks/useAudienceIntelligence';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr) {
  if (!dateStr) return '\u2014';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return '\u2014';
  }
}

function pct(part, total) {
  if (!total || total <= 0) return 0;
  return Math.round((part / total) * 100);
}

/* ------------------------------------------------------------------ */
/*  Mini KPI strip (inline — keeps this file self-contained)           */
/* ------------------------------------------------------------------ */

function MiniKPI({ label, value, total, icon: Icon, tone = 'default' }) {
  const percentage = pct(value, total);
  const toneClass =
    tone === 'primary'
      ? 'text-primary'
      : tone === 'danger'
        ? 'text-danger'
        : tone === 'success'
          ? 'text-success'
          : tone === 'accent'
            ? 'text-accent'
            : 'text-muted-foreground';

  return (
    <div className="bg-card border border-border rounded-lg p-3 transition-colors hover:border-border-hover">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        {Icon && <Icon className={cn('w-3.5 h-3.5', toneClass)} />}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-xl font-bold tracking-tight tabular-nums">{value ?? 0}</span>
        <span className="text-[11px] text-muted-foreground tabular-nums">{percentage}%</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main section                                                       */
/* ------------------------------------------------------------------ */

export default function AudienceInsightsSection({ projectId }) {
  const { data: insight, isLoading } = useLatestAudienceInsights(projectId);
  const runMutation = useRunAudienceIntelligence(projectId);
  const promoteMutation = usePromoteAudienceSuggestion(projectId);
  const createTopicMutation = useCreateTopicFromSuggestion(projectId);

  const handleRun = async () => {
    try {
      const res = await runMutation.mutateAsync();
      if (res?.success === false) {
        toast.error(res.error || 'Audience intelligence run failed');
      } else {
        toast.success('Audience intelligence running \u2014 synthesis streams in shortly.');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to run');
    }
  };

  const handlePromote = async (suggestion) => {
    await promoteMutation.mutateAsync({
      suggestion,
      week_of: insight?.week_of,
    });
  };

  const handleCreateTopic = async (suggestion) => {
    await createTopicMutation.mutateAsync({ suggestion });
  };

  const classifiedTotal = useMemo(() => {
    if (!insight) return 0;
    return (
      (insight.questions_count || 0) +
      (insight.complaints_count || 0) +
      (insight.praise_count || 0) +
      (insight.suggestions_count || 0) +
      (insight.noise_count || 0)
    );
  }, [insight]);

  /* -- Subtitle string -- */
  const classificationSummary = useMemo(() => {
    if (!insight) return null;
    const parts = [];
    if (insight.questions_count) parts.push(`${insight.questions_count} questions`);
    if (insight.complaints_count) parts.push(`${insight.complaints_count} complaints`);
    if (insight.praise_count) parts.push(`${insight.praise_count} praise`);
    if (insight.suggestions_count) parts.push(`${insight.suggestions_count} suggestions`);
    return parts.join(' \u00B7 ') || 'no classified signals';
  }, [insight]);

  /* ---------------- Section header (shared) ---------------- */
  const SectionHeader = ({ showRun }) => (
    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
      <div className="flex items-start gap-2.5">
        <Brain className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-semibold">Audience Memory</h2>
          {insight ? (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Week of {formatDate(insight.week_of)} \u00B7 {insight.comments_analyzed || 0} comment
              {insight.comments_analyzed === 1 ? '' : 's'} analyzed \u00B7 {classificationSummary}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Weekly synthesis of your audience\u2019s questions, complaints, and topic requests.
            </p>
          )}
        </div>
      </div>
      {showRun && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRun}
          disabled={runMutation.isPending}
        >
          {runMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Run Now
        </Button>
      )}
    </div>
  );

  /* ---------------- Loading ---------------- */
  if (isLoading) {
    return (
      <div className="mb-6 animate-fade-in">
        <SectionHeader showRun={false} />
        <div className="bg-card border border-border rounded-xl p-8 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  /* ---------------- Empty ---------------- */
  if (!insight) {
    return (
      <div className="mb-6 animate-fade-in">
        <SectionHeader showRun={false} />
        <div className="bg-card border border-border rounded-xl">
          <EmptyState
            icon={Brain}
            title="No audience intelligence yet"
            description={'Run WF_AUDIENCE_INTELLIGENCE weekly or trigger manually to synthesize this project\u2019s audience questions, complaints, and topic requests.'}
            action={
              <Button size="sm" onClick={handleRun} disabled={runMutation.isPending}>
                {runMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                Run Now
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const objections = Array.isArray(insight.frequent_objections) ? insight.frequent_objections : [];

  /* ---------------- Populated ---------------- */
  return (
    <div className="mb-6 animate-fade-in">
      <SectionHeader showRun />

      {/* Mini KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        <div className="stagger-1 animate-slide-up">
          <MiniKPI
            label="Questions"
            value={insight.questions_count || 0}
            total={classifiedTotal}
            icon={HelpCircle}
            tone="primary"
          />
        </div>
        <div className="stagger-2 animate-slide-up">
          <MiniKPI
            label="Complaints"
            value={insight.complaints_count || 0}
            total={classifiedTotal}
            icon={AlertTriangle}
            tone="danger"
          />
        </div>
        <div className="stagger-3 animate-slide-up">
          <MiniKPI
            label="Praise"
            value={insight.praise_count || 0}
            total={classifiedTotal}
            icon={Heart}
            tone="success"
          />
        </div>
        <div className="stagger-4 animate-slide-up">
          <MiniKPI
            label="Suggestions"
            value={insight.suggestions_count || 0}
            total={classifiedTotal}
            icon={Lightbulb}
            tone="accent"
          />
        </div>
      </div>

      {/* 3-column grid: Persona | Questions | Complaints */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 mb-4">
        <div className="lg:col-span-3 stagger-1 animate-slide-up">
          <PersonaCard insight={insight} />
        </div>
        <div className="lg:col-span-4 stagger-2 animate-slide-up">
          <RecurringQuestionsCard questions={insight.recurring_questions} />
        </div>
        <div className="lg:col-span-3 stagger-3 animate-slide-up">
          <ContentComplaintsCard complaints={insight.content_complaints} />
        </div>
      </div>

      {/* Frequent objections */}
      {objections.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <ShieldAlert className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold">Frequent Objections</h3>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
              Counter-angles needed
            </span>
          </div>
          <ul className="divide-y divide-border">
            {objections.slice(0, 8).map((o, i) => {
              const objection = o?.objection || o?.text || JSON.stringify(o);
              const counter = o?.counter_angle_needed || o?.counter || null;
              return (
                <li
                  key={i}
                  className={cn(
                    'flex items-start gap-3 px-4 py-2.5 hover:bg-card-hover transition-colors border-l-2 border-warning/60',
                    `stagger-${Math.min(i + 1, 8)} animate-fade-in`,
                  )}
                >
                  <span className="text-sm text-foreground font-medium flex-shrink-0">&ldquo;{objection}&rdquo;</span>
                  {counter && (
                    <>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" />
                      <span className="text-xs text-muted-foreground leading-relaxed">{counter}</span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Suggested topics */}
      <div className="mb-4">
        <SuggestedTopicsCard
          suggestions={insight.topic_suggestions}
          onPromote={handlePromote}
          onCreate={handleCreateTopic}
          isPromoting={promoteMutation.isPending}
          isCreating={createTopicMutation.isPending}
        />
      </div>

      {/* {{audience_context}} block (collapsible) */}
      <AudienceContextBlock text={insight.audience_context_block} />
    </div>
  );
}
