import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Film,
  Sparkles,
  FileText,
  CheckCircle2,
  Zap,
  ChevronRight,
  RefreshCw,
  X,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import KPICard from '../shared/KPICard';
import EmptyState from '../shared/EmptyState';
import StatusBadge from '../shared/StatusBadge';

// ---------------------------------------------------------------------------
// Status badge map for all topic statuses
// ---------------------------------------------------------------------------

const STATUS_MAP = {
  pending: 'pending',
  approved: 'approved',
  scripting: 'scripting',
  script_approved: 'approved',
  queued: 'active',
  producing: 'active',
  audio: 'active',
  images: 'active',
  assembling: 'assembly',
  assembled: 'assembled',
  published: 'published',
  failed: 'failed',
  rejected: 'rejected',
};

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  scripting: 'Scripting',
  script_approved: 'Script OK',
  queued: 'Queued',
  producing: 'Producing',
  audio: 'Audio',
  images: 'Images',
  assembling: 'Assembling',
  assembled: 'Assembled',
  published: 'Published',
  failed: 'Failed',
  rejected: 'Rejected',
};

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

// ---------------------------------------------------------------------------
// Analysis Progress Tracker (shows live stage progress during analysis)
// ---------------------------------------------------------------------------

const ANALYSIS_STAGES = [
  { key: 'fetch_data', label: 'Fetching Script', icon: Film },
  { key: 'claude_analysis', label: 'AI Analysis', icon: Sparkles },
  { key: 'parsing_response', label: 'Parsing Results', icon: FileText },
  { key: 'validating_clips', label: 'Validating Clips', icon: CheckCircle2 },
  { key: 'inserting_shorts', label: 'Saving Clips', icon: Zap },
  { key: 'finalizing', label: 'Finalizing', icon: CheckCircle2 },
];

function AnalysisProgressTracker({ topicId }) {
  const [currentStep, setCurrentStep] = useState(null);
  const [stepMessage, setStepMessage] = useState('Starting analysis...');
  const [elapsedSec, setElapsedSec] = useState(0);
  const startTimeRef = useRef(Date.now());

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

        if (step === 'inserting_shorts' && latest.action === 'completed') {
          setCurrentStep('finalizing');
          setStepMessage('Waiting for clips to appear...');
        } else {
          if (step) setCurrentStep(step);
          if (message) setStepMessage(message);
        }
      } catch { /* ignore */ }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [topicId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSec(Math.round((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentIndex = ANALYSIS_STAGES.findIndex((s) => s.key === currentStep);
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="w-full max-w-[320px] px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span className="text-2xs font-bold text-primary uppercase tracking-wider">Analyzing</span>
        </div>
        <span className="text-2xs font-mono tabular-nums text-muted-foreground">{formatTime(elapsedSec)}</span>
      </div>

      {/* Stage indicators */}
      <div className="space-y-1">
        {ANALYSIS_STAGES.map((stage, i) => {
          const isComplete = currentIndex > i;
          const isActive = currentIndex === i;

          return (
            <div key={stage.key} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                isComplete ? 'bg-success' :
                isActive ? 'bg-primary animate-pulse' :
                'bg-muted'
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
                isComplete ? 'text-success line-through' :
                isActive ? 'text-primary' :
                'text-muted-foreground'
              }`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-2xs text-muted-foreground mt-2 italic truncate">
        {stepMessage}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TopicBrowser: unified topic list across all projects
// ---------------------------------------------------------------------------

export default function TopicBrowser({ projects, onSelectTopic, onAnalyze, analyzeLoading, analyzingTopicId, shortsSummaryAll }) {
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

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

  const projectOptions = useMemo(() => {
    if (!projects) return [];
    return projects.map((p) => ({ value: p.id, label: p.name || p.niche }));
  }, [projects]);

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
    if (analyzingTopicId === topic.id) return false;
    const s = shortsSummaryAll?.[topic.id];
    return !s || s.total === 0;
  }

  function canReAnalyze(topic) {
    if (topic.status !== 'assembled' && topic.status !== 'published') return false;
    if (analyzingTopicId === topic.id) return false;
    const s = shortsSummaryAll?.[topic.id];
    return s && s.total > 0;
  }

  function hasShorts(topicId) {
    const s = shortsSummaryAll?.[topicId];
    return s && s.total > 0;
  }

  if (allTopics.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl">
        <EmptyState
          icon={Film}
          title="No topics found"
          description="Generate topics from the long-form video section first. All generated topics will appear here."
        />
      </div>
    );
  }

  return (
    <div>
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KPICard label="Total Topics" value={totalCount} />
        <KPICard label="Ready for Shorts" value={readyCount} />
        <KPICard label="Projects" value={projectOptions.length} />
        <KPICard label="Showing" value={filteredCount} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Film className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="h-9 px-3 rounded-md text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[160px] cursor-pointer"
        >
          <option value="">All Projects</option>
          {projectOptions.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-md text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[140px] cursor-pointer"
        >
          {ALL_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {(projectFilter || statusFilter || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setProjectFilter(''); setStatusFilter(''); setSearch(''); }}
            className="gap-1"
          >
            <X className="w-3 h-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Topic list */}
      {filteredTopics.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground">No topics match your filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTopics.map((topic, i) => {
            const shortsLabel = getShortsLabel(topic.id);
            const isReady = topic.status === 'assembled' || topic.status === 'published';

            return (
              <div
                key={topic.id}
                className={`bg-card border border-border rounded-xl p-4 transition-all animate-slide-up stagger-${Math.min(i + 1, 8)} ${
                  !isReady ? 'opacity-60' : 'hover:border-border-hover'
                }`}
                style={{ opacity: 0 }}
              >
                <div className="flex items-center gap-3">
                  {/* Topic number badge */}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-2xs font-medium bg-info-bg text-info border border-info-border flex-shrink-0">
                    #{topic.topic_number}
                  </span>

                  {/* Title + meta */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {topic.seo_title || topic.original_title || `Topic #${topic.topic_number}`}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-2xs text-muted-foreground font-medium">
                        {topic.project_name}
                      </span>
                      <span className="text-muted-foreground/40">|</span>
                      <StatusBadge
                        status={STATUS_MAP[topic.status] || 'pending'}
                        label={STATUS_LABELS[topic.status] || topic.status}
                      />
                      {shortsLabel && (
                        <>
                          <span className="text-muted-foreground/40">|</span>
                          <span className="text-2xs text-success font-medium">
                            {shortsLabel}
                          </span>
                        </>
                      )}
                      {!isReady && !shortsLabel && (
                        <>
                          <span className="text-muted-foreground/40">|</span>
                          <span className="text-2xs text-muted-foreground italic">
                            Not ready -- needs assembly
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
                      <Button
                        size="sm"
                        onClick={() => onAnalyze(topic.id)}
                        disabled={analyzeLoading}
                        className="gap-1.5"
                      >
                        {analyzeLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">Analyze</span>
                      </Button>
                    ) : null}
                    {hasShorts(topic.id) && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onSelectTopic(topic)}
                          className="gap-1.5"
                        >
                          <span className="hidden sm:inline">Review Clips</span>
                          <span className="sm:hidden">Review</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                        {canReAnalyze(topic) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (window.confirm('Re-analyze will delete existing clips and generate new ones. Continue?')) {
                                onAnalyze(topic.id);
                              }
                            }}
                            disabled={analyzeLoading}
                            title="Re-analyze for new viral clips"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </>
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
