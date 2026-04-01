import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  Play,
  Loader2,
  Layers,
  BarChart3,
  Hash,
  DollarSign,
  Clock,
  Filter,
  History,
  XCircle,
} from 'lucide-react';
import {
  useLatestRun,
  useCategories,
  useResults,
  useRunResearch,
  useAllRuns,
  useRunById,
  useCancelResearch,
} from '../hooks/useResearch';

import PageHeader from '../components/shared/PageHeader';
import KPICard from '../components/shared/KPICard';
import EmptyState from '../components/shared/EmptyState';
import ResearchProgress from '../components/research/ResearchProgress';
import CategoryCards from '../components/research/CategoryCards';
import SourceTabs from '../components/research/SourceTabs';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_PLATFORMS = ['reddit', 'youtube', 'tiktok', 'trends', 'quora'];
const PLATFORM_LABELS = {
  reddit: 'Reddit',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  trends: 'Google Trends',
  quora: 'Quora',
};
const TIME_RANGES = [
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '1d', label: '1d' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'custom', label: 'Custom' },
];

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
  const label = run.niche_input || run.projects?.name || run.projects?.niche || 'Unknown';
  const isActive = run.status === 'scraping' || run.status === 'categorizing';
  const platforms = run.platforms || ALL_PLATFORMS;
  const timeRange = run.time_range || '7d';

  return (
    <button
      onClick={() => onSelect(run)}
      className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 transition-colors hover:bg-card-hover cursor-pointer ${
        isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">{label}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground">
              {formatRunAge(run.created_at)}
            </span>
            <div className="flex gap-0.5">
              {ALL_PLATFORMS.map((p) => (
                <span
                  key={p}
                  className={`w-1.5 h-1.5 rounded-full ${
                    platforms.includes(p) ? 'bg-primary' : 'bg-border'
                  }`}
                  title={PLATFORM_LABELS[p]}
                />
              ))}
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {timeRange}
            </span>
            {run.total_results > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {run.total_results} results
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isActive && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
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
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Research Page
// ---------------------------------------------------------------------------

export default function Research() {
  const navigate = useNavigate();
  const [nicheInput, setNicheInput] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedPlatforms, setSelectedPlatforms] = useState(new Set(ALL_PLATFORMS));
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [justStarted, setJustStarted] = useState(false);

  // Data hooks
  const { data: latestRun, isLoading: runLoading } = useLatestRun();
  const { data: allRuns } = useAllRuns();
  const runResearch = useRunResearch();
  const cancelResearch = useCancelResearch();
  const { data: historicalRun } = useRunById(selectedRunId);

  // Use historical run if selected, otherwise latest
  const activeRun = selectedRunId && historicalRun ? historicalRun : latestRun;
  const isViewingHistory = !!selectedRunId && !!historicalRun;

  const { data: categories } = useCategories(activeRun?.id);
  const { data: results, isLoading: resultsLoading } = useResults(activeRun?.id, selectedSource);

  // Derived state
  const isRunning = activeRun?.status === 'scraping' || activeRun?.status === 'categorizing';
  const isComplete = activeRun?.status === 'complete';
  const hasRun = !!activeRun;

  // Clear justStarted when a run appears or after timeout
  useEffect(() => {
    if (!justStarted) return;
    if (hasRun && (isRunning || isComplete)) {
      setJustStarted(false);
      return;
    }
    const timer = setTimeout(() => setJustStarted(false), 15000);
    return () => clearTimeout(timer);
  }, [justStarted, hasRun, isRunning, isComplete]);

  // KPI data from completed run
  const kpis = useMemo(() => {
    if (!isComplete || !results) {
      return { totalResults: 0, totalCategories: 0, totalEngagement: 0, cost: 0 };
    }
    return {
      totalResults: results.length,
      totalCategories: categories?.length || 0,
      totalEngagement: results.reduce((sum, r) => sum + (r.engagement_score || 0), 0),
      cost: activeRun?.cost || 0,
    };
  }, [isComplete, results, categories, activeRun]);

  const allPlatformsSelected = selectedPlatforms.size === ALL_PLATFORMS.length;

  const togglePlatform = (key) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (allPlatformsSelected) {
      setSelectedPlatforms(new Set([ALL_PLATFORMS[0]]));
    } else {
      setSelectedPlatforms(new Set(ALL_PLATFORMS));
    }
  };

  const handleRunResearch = () => {
    const timeRange =
      selectedTimeRange === 'custom'
        ? { start: customRange.start, end: customRange.end }
        : selectedTimeRange;
    setJustStarted(true);
    setSelectedRunId(null);
    runResearch.mutate({
      niche: nicheInput.trim() || undefined,
      platforms: [...selectedPlatforms],
      timeRange,
    });
  };

  const handleCancel = () => {
    if (activeRun && isRunning) {
      cancelResearch.mutate(activeRun.id);
    }
  };

  const handleUseTopic = (category) => {
    // Navigate to Projects page with category data in URL state for CreateProjectModal
    navigate('/', {
      state: {
        openCreateModal: true,
        prefillNiche: category.label,
        prefillDescription: category.summary + (category.top_video_title ? '\n\nSuggested video: ' + category.top_video_title : ''),
      },
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="animate-slide-up">
      {/* Page Header */}
      <PageHeader
        title="Topic Research"
        subtitle="Enter a niche to discover trending topics across Reddit, YouTube, TikTok, Google Trends, and Quora"
      >
        {/* Niche input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={nicheInput}
            onChange={(e) => setNicheInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRunResearch()}
            placeholder="Optional: narrow by niche (e.g. credit cards, AI tools)"
            className="text-xs h-9 w-[320px] rounded-md border border-border bg-card px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {/* Run Research button */}
          <Button
            onClick={handleRunResearch}
            disabled={runResearch.isPending || justStarted}
            className="bg-gradient-to-r from-primary to-destructive hover:from-primary-hover hover:to-destructive/90 text-white shadow-glow-primary"
            size="sm"
          >
            {runResearch.isPending || justStarted ? (
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
        </div>
      </PageHeader>

      {/* Platform + Time Range config row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
          <button
            onClick={toggleAll}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
              allPlatformsSelected
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'bg-transparent text-muted-foreground border-border hover:border-border-hover'
            }`}
          >
            All
          </button>
          {ALL_PLATFORMS.map((key) => (
            <button
              key={key}
              onClick={() => togglePlatform(key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                selectedPlatforms.has(key)
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-transparent text-muted-foreground border-border hover:border-border-hover'
              }`}
            >
              {PLATFORM_LABELS[key]}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.value}
              onClick={() => setSelectedTimeRange(tr.value)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                selectedTimeRange === tr.value
                  ? 'bg-accent/15 text-accent border-accent/30'
                  : 'bg-transparent text-muted-foreground border-border hover:border-border-hover'
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date range picker */}
      {selectedTimeRange === 'custom' && (
        <div className="flex items-center gap-3 mb-6 pl-6">
          <label className="text-[11px] text-muted-foreground">From</label>
          <input
            type="datetime-local"
            value={customRange.start}
            onChange={(e) => setCustomRange((r) => ({ ...r, start: e.target.value }))}
            className="input text-xs h-8 w-auto"
          />
          <label className="text-[11px] text-muted-foreground">To</label>
          <input
            type="datetime-local"
            value={customRange.end}
            onChange={(e) => setCustomRange((r) => ({ ...r, end: e.target.value }))}
            className="input text-xs h-8 w-auto"
          />
        </div>
      )}

      {/* Viewing historical run banner */}
      {isViewingHistory && (
        <div className="flex items-center justify-between mb-4 px-4 py-2.5 bg-info-bg border border-info-border rounded-lg">
          <span className="text-xs text-info font-medium">
            Viewing run from {formatRunAge(activeRun.created_at)} — {activeRun.niche_input || activeRun.projects?.name || 'Unknown'}
          </span>
          <button
            onClick={() => setSelectedRunId(null)}
            className="text-xs font-medium text-info hover:text-info/80 underline underline-offset-2 cursor-pointer"
          >
            Back to Latest
          </button>
        </div>
      )}

      {/* Just started — waiting for run to appear */}
      {justStarted && !isRunning && (
        <div className="bg-card border border-border rounded-xl p-8 text-center mb-6">
          <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Starting research...</p>
          <p className="text-xs text-muted-foreground">
            {nicheInput.trim()
              ? `Deriving keywords for "${nicheInput}" and initializing`
              : 'Discovering trending topics on'}{' '}
            {[...selectedPlatforms].map((p) => PLATFORM_LABELS[p]).join(', ')}
          </p>
        </div>
      )}

      {/* Active run -- show progress with cancel button */}
      {hasRun && isRunning && !justStarted && (
        <div className="mb-6">
          <ResearchProgress run={activeRun} />
          <div className="flex justify-end mt-2">
            <Button
              onClick={handleCancel}
              disabled={cancelResearch.isPending}
              variant="outline"
              size="sm"
              className="text-danger border-danger-border hover:bg-danger-bg"
            >
              <XCircle className="w-3.5 h-3.5" />
              {cancelResearch.isPending ? 'Cancelling...' : 'Cancel Run'}
            </Button>
          </div>
        </div>
      )}

      {/* No runs yet and not starting */}
      {!hasRun && !runLoading && !justStarted && (
        <EmptyState
          icon={Search}
          title="No research runs yet"
          description="Enter a niche above and click 'Run Research' to discover trending topics across 5 platforms."
        />
      )}

      {/* Loading */}
      {runLoading && !justStarted && (
        <div className="bg-card border border-border rounded-xl p-8 text-center animate-pulse">
          <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Loading research data...</p>
        </div>
      )}

      {/* Research History — always visible when there are runs */}
      {allRuns && allRuns.length > 0 && !justStarted && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <History className="w-3.5 h-3.5" />
            Research History
          </h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden max-h-[280px] overflow-y-auto">
            {allRuns.map((run) => (
              <RunHistoryRow
                key={run.id}
                run={run}
                isSelected={selectedRunId ? run.id === selectedRunId : run.id === activeRun?.id}
                onSelect={(r) => {
                  setSelectedRunId(r.id);
                  setSelectedSource('all');
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed run -- show KPIs + categories + results */}
      {hasRun && isComplete && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
            <KPICard label="Total Results" value={String(kpis.totalResults)} icon={Hash} />
            <KPICard label="Categories" value={String(kpis.totalCategories)} icon={Layers} />
            <KPICard
              label="Avg Engagement"
              value={kpis.totalResults > 0 ? String(Math.round(kpis.totalEngagement / kpis.totalResults)) : '0'}
              icon={BarChart3}
            />
            <KPICard label="Run Cost" value={formatCost(kpis.cost)} icon={DollarSign} />
          </div>

          {categories && categories.length > 0 && (
            <div className="mb-6">
              <CategoryCards categories={categories} onUseTopic={handleUseTopic} />
            </div>
          )}

          <div className="mb-6">
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

          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground py-4 border-t border-border">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Completed {formatRunAge(activeRun.completed_at || activeRun.updated_at)}
            </span>
            {activeRun.duration_ms && (
              <span>Duration: {(activeRun.duration_ms / 1000).toFixed(1)}s</span>
            )}
          </div>
        </>
      )}

      {/* Failed run */}
      {hasRun && activeRun?.status === 'failed' && (
        <div className="bg-card border border-danger-border rounded-xl p-8 text-center mb-6">
          <p className="text-sm text-danger font-medium mb-2">Research run failed</p>
          <p className="text-xs text-muted-foreground mb-4">
            {Array.isArray(activeRun.error_log) && activeRun.error_log[0]?.error
              ? activeRun.error_log[0].error
              : 'An unexpected error occurred during the research run.'}
          </p>
          <Button
            onClick={handleRunResearch}
            disabled={!nicheInput.trim() || runResearch.isPending}
            variant="outline"
            size="sm"
          >
            Retry Research
          </Button>
        </div>
      )}
    </div>
  );
}
