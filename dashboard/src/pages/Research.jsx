import { useState, useMemo } from 'react';
import {
  Search,
  Play,
  Loader2,
  Layers,
  BarChart3,
  Hash,
  DollarSign,
  Clock,
} from 'lucide-react';
import {
  useLatestRun,
  useCategories,
  useResults,
  useRunResearch,
  useAllRuns,
} from '../hooks/useResearch';
import { useProjects } from '../hooks/useProjects';

import PageHeader from '../components/shared/PageHeader';
import KPICard from '../components/shared/KPICard';
import EmptyState from '../components/shared/EmptyState';
import ResearchProgress from '../components/research/ResearchProgress';
import CategoryCards from '../components/research/CategoryCards';
import SourceTabs from '../components/research/SourceTabs';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCost(cost) {
  if (cost == null || isNaN(cost)) return '$0.00';
  return `$${parseFloat(cost).toFixed(2)}`;
}

function formatRunAge(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// RunHistoryRow
// ---------------------------------------------------------------------------

function RunHistoryRow({ run, isSelected, onSelect }) {
  const projectName = run.projects?.name || run.projects?.niche || 'Unknown';
  const isActive = run.status === 'scraping' || run.status === 'categorizing';

  return (
    <button
      onClick={() => onSelect(run.project_id)}
      className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 transition-colors hover:bg-card-hover ${
        isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{projectName}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {formatRunAge(run.created_at)}
            {isActive && (
              <span className="ml-1.5 text-primary">
                <Loader2 className="w-2.5 h-2.5 inline animate-spin" /> Running
              </span>
            )}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-medium border ${
            run.status === 'complete'
              ? 'bg-success-bg text-success border-success-border'
              : run.status === 'failed'
                ? 'bg-danger-bg text-danger border-danger-border'
                : 'bg-warning-bg text-warning border-warning-border'
          }`}
        >
          {run.status}
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Research Page
// ---------------------------------------------------------------------------

export default function Research() {
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedSource, setSelectedSource] = useState('all');

  // Data hooks
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: latestRun, isLoading: runLoading } = useLatestRun(selectedProjectId);
  const { data: categories } = useCategories(latestRun?.id);
  const { data: results, isLoading: resultsLoading } = useResults(latestRun?.id, selectedSource);
  const { data: allRuns } = useAllRuns();
  const runResearch = useRunResearch();

  // Derived state
  const isRunning = latestRun?.status === 'scraping' || latestRun?.status === 'categorizing';
  const isComplete = latestRun?.status === 'complete';
  const hasRun = !!latestRun;

  // KPI data from completed run
  const kpis = useMemo(() => {
    if (!isComplete || !results) {
      return { totalResults: 0, totalCategories: 0, totalEngagement: 0, cost: 0 };
    }
    return {
      totalResults: results.length,
      totalCategories: categories?.length || 0,
      totalEngagement: results.reduce((sum, r) => sum + (r.engagement_score || 0), 0),
      cost: latestRun?.cost || 0,
    };
  }, [isComplete, results, categories, latestRun]);

  // Auto-select first project if none selected
  if (!selectedProjectId && projects?.length > 0 && !projectsLoading) {
    // Use setTimeout to avoid setting state during render
    setTimeout(() => setSelectedProjectId(projects[0].id), 0);
  }

  const handleRunResearch = () => {
    if (!selectedProjectId) return;
    runResearch.mutate(selectedProjectId);
  };

  const handleUseTopic = (category) => {
    // This would navigate to topic creation or store it as a seed topic.
    // For now, log for development. The n8n webhook integration comes later.
    console.info('[Research] Use topic:', category.label);
  };

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------

  if (projectsLoading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Topic Research" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 h-[88px] animate-pulse" />
          ))}
        </div>
        <div className="bg-card border border-border rounded-xl h-64 animate-pulse" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="animate-slide-up">
      {/* Page Header */}
      <PageHeader
        title="Topic Research"
        subtitle="AI-powered topic intelligence across Reddit, YouTube, TikTok, Google Trends, and Quora"
      >
        {/* Project selector */}
        <Select
          value={selectedProjectId || ''}
          onValueChange={(val) => {
            setSelectedProjectId(val);
            setSelectedSource('all');
          }}
        >
          <SelectTrigger className="w-[200px] h-9 text-xs bg-card border-border">
            <SelectValue placeholder="Select project..." />
          </SelectTrigger>
          <SelectContent>
            {(projects || []).map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {p.name || p.niche}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Run Research button */}
        <Button
          onClick={handleRunResearch}
          disabled={!selectedProjectId || runResearch.isPending || isRunning}
          className="bg-gradient-to-r from-primary to-destructive hover:from-primary-hover hover:to-destructive/90 text-white shadow-glow-primary"
          size="sm"
        >
          {runResearch.isPending || isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Running...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Run Research</span>
              <span className="sm:hidden">Run</span>
            </>
          )}
        </Button>
      </PageHeader>

      {/* No project selected */}
      {!selectedProjectId && (
        <EmptyState
          icon={Search}
          title="Select a project"
          description="Choose a project from the dropdown above to view or start research."
        />
      )}

      {/* Project selected but no runs yet */}
      {selectedProjectId && !hasRun && !runLoading && (
        <EmptyState
          icon={Search}
          title="No research runs yet"
          description="Click 'Run Research' to start scraping Reddit, YouTube, TikTok, Trends, and Quora for topic intelligence."
          action={
            <Button
              onClick={handleRunResearch}
              disabled={runResearch.isPending}
              className="bg-gradient-to-r from-primary to-destructive hover:from-primary-hover hover:to-destructive/90 text-white shadow-glow-primary"
            >
              <Play className="w-4 h-4" />
              Run First Research
            </Button>
          }
        />
      )}

      {/* Loading run */}
      {selectedProjectId && runLoading && (
        <div className="bg-card border border-border rounded-xl p-8 text-center animate-pulse">
          <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Loading research data...</p>
        </div>
      )}

      {/* Active run -- show progress */}
      {hasRun && isRunning && (
        <div className="mb-6 animate-slide-up stagger-1" style={{ opacity: 0 }}>
          <ResearchProgress run={latestRun} />
        </div>
      )}

      {/* Completed run -- show KPIs + categories + results */}
      {hasRun && isComplete && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
            <div className="animate-slide-up stagger-1" style={{ opacity: 0 }}>
              <KPICard
                label="Total Results"
                value={String(kpis.totalResults)}
                icon={Hash}
              />
            </div>
            <div className="animate-slide-up stagger-2" style={{ opacity: 0 }}>
              <KPICard
                label="Categories"
                value={String(kpis.totalCategories)}
                icon={Layers}
              />
            </div>
            <div className="animate-slide-up stagger-3" style={{ opacity: 0 }}>
              <KPICard
                label="Avg Engagement"
                value={
                  kpis.totalResults > 0
                    ? String(Math.round(kpis.totalEngagement / kpis.totalResults))
                    : '0'
                }
                icon={BarChart3}
              />
            </div>
            <div className="animate-slide-up stagger-4" style={{ opacity: 0 }}>
              <KPICard
                label="Run Cost"
                value={formatCost(kpis.cost)}
                icon={DollarSign}
              />
            </div>
          </div>

          {/* Category cards */}
          {categories && categories.length > 0 && (
            <div className="mb-6 animate-slide-up stagger-5" style={{ opacity: 0 }}>
              <CategoryCards categories={categories} onUseTopic={handleUseTopic} />
            </div>
          )}

          {/* Source tabs + results table */}
          <div className="mb-6 animate-slide-up stagger-6" style={{ opacity: 0 }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Raw Results by Source
            </h2>
            <SourceTabs
              selectedSource={selectedSource}
              onSourceChange={setSelectedSource}
              results={results}
              isLoading={resultsLoading}
            />
          </div>

          {/* Run metadata */}
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground py-4 border-t border-border">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Completed {formatRunAge(latestRun.completed_at || latestRun.updated_at)}
            </span>
            {latestRun.duration_ms && (
              <span>
                Duration: {(latestRun.duration_ms / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        </>
      )}

      {/* Failed run */}
      {hasRun && latestRun?.status === 'failed' && (
        <div className="bg-card border border-danger-border rounded-xl p-8 text-center mb-6">
          <p className="text-sm text-danger font-medium mb-2">Research run failed</p>
          <p className="text-xs text-muted-foreground mb-4">
            {latestRun.error || 'An unexpected error occurred during the research run.'}
          </p>
          <Button
            onClick={handleRunResearch}
            disabled={runResearch.isPending}
            variant="outline"
            size="sm"
          >
            Retry Research
          </Button>
        </div>
      )}

      {/* Run history sidebar (shows when there are multiple runs) */}
      {allRuns && allRuns.length > 1 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Recent Research Runs
          </h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
            {allRuns.map((run) => (
              <RunHistoryRow
                key={run.id}
                run={run}
                isSelected={run.project_id === selectedProjectId}
                onSelect={setSelectedProjectId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
