import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Play,
  Loader2,
  Clock,
  Eye,
  ThumbsUp,
  MessageSquare,
  Timer,
  XCircle,
  History,
  ExternalLink,
  Microscope,
} from 'lucide-react';
import {
  useNicheTaxonomy,
  useLatestDiscoveryRun,
  useDiscoveryResults,
  useAllDiscoveryRuns,
  useRunDiscovery,
  useCancelDiscovery,
  useAnalyzeVideo,
  useAllAnalyses,
} from '../hooks/useYouTubeDiscovery';
import { useCountryTab } from '../hooks/useCountryTab';
import PageHeader from '../components/shared/PageHeader';
import EmptyState from '../components/shared/EmptyState';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIME_RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '180d', label: '6 months' },
  { value: '1y', label: '1 year' },
  { value: '2y', label: '2 years' },
  { value: '5y', label: '5 years' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(secs) {
  if (!secs) return '--';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatNumber(n) {
  if (n == null) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function formatAge(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ---------------------------------------------------------------------------
// VideoCard
// ---------------------------------------------------------------------------

function VideoCard({ video, onUseForProject, onAnalyze, isAnalyzing, existingAnalysis, onViewAnalysis }) {
  const hasAnalysis = !!existingAnalysis;
  const verdict = existingAnalysis?.analysis?.opportunity_scorecard?.verdict;
  const verdictColors = {
    STRONG_GO: 'bg-success-bg text-success border-success-border',
    CONDITIONAL_GO: 'bg-warning-bg text-warning border-warning-border',
    WEAK: 'bg-[#ff8c00]/10 text-[#ff8c00] border-[#ff8c00]/30',
    NO_GO: 'bg-danger-bg text-danger border-danger-border',
  };
  const verdictLabels = { STRONG_GO: 'Strong Go', CONDITIONAL_GO: 'Conditional', WEAK: 'Weak', NO_GO: 'No-Go' };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-border-hover transition-all">
      <div className="relative">
        <img src={video.thumbnail_url} alt={video.title} className="w-full h-[140px] object-cover bg-muted" loading="lazy" />
        <span className="absolute bottom-2 right-2 bg-background/90 text-foreground text-[10px] font-mono px-1.5 py-0.5 rounded">
          {formatDuration(video.duration_seconds)}
        </span>
        {verdict && (
          <span className={`absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full border ${verdictColors[verdict] || ''}`}>
            {verdictLabels[verdict] || verdict}
          </span>
        )}
      </div>
      <div className="p-3">
        <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold leading-tight line-clamp-2 hover:text-primary transition-colors">
          {video.title}
        </a>
        <p className="text-[10px] text-muted-foreground mt-1 truncate">{video.channel_name}</p>
        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1" title="Views"><Eye className="w-3 h-3" />{formatNumber(video.views)}</span>
          <span className="flex items-center gap-1" title="Likes"><ThumbsUp className="w-3 h-3" />{formatNumber(video.likes)}</span>
          <span className="flex items-center gap-1" title="Comments"><MessageSquare className="w-3 h-3" />{formatNumber(video.comments)}</span>
          <span className="flex items-center gap-1 ml-auto" title="Published"><Clock className="w-3 h-3" />{formatAge(video.published_at)}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/50">
          {hasAnalysis ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] text-success hover:text-success/80 flex-1"
              onClick={() => onViewAnalysis(existingAnalysis.id)}
            >
              <Eye className="w-3 h-3" />
              View Analysis
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] text-accent hover:text-accent/80 flex-1"
              onClick={() => onAnalyze(video)}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Microscope className="w-3 h-3" />}
              Analyze
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-primary hover:text-primary-hover flex-1" onClick={() => onUseForProject(video)}>
            Use for Project
          </Button>
          <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors flex-shrink-0">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function YouTubeDiscovery() {
  const navigate = useNavigate();
  const { country } = useCountryTab();
  const { niches: NICHES, nicheGroups: NICHE_GROUPS, defaultSelectedKeys } = useNicheTaxonomy();
  const [selectedTimeRange, setSelectedTimeRange] = useState('1y');
  const [selectedNiche, setSelectedNiche] = useState('all');
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [justStarted, setJustStarted] = useState(false);
  const [searchNiches, setSearchNiches] = useState(() => new Set(defaultSelectedKeys));

  // Re-seed the search-niche selection when the country tab toggles.
  // For AU this defaults to just the v1 launch spoke (super_au) per
  // Strategy §10.1 — researching future spokes is opt-in.
  useEffect(() => {
    setSearchNiches(new Set(defaultSelectedKeys));
    setSelectedNiche('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  const { data: latestRun, isLoading: runLoading } = useLatestDiscoveryRun();
  const { data: allRuns } = useAllDiscoveryRuns();
  const runDiscovery = useRunDiscovery();
  const cancelDiscovery = useCancelDiscovery();
  const analyzeVideo = useAnalyzeVideo();
  const { data: allAnalyses } = useAllAnalyses();
  const [analyzingVideoId, setAnalyzingVideoId] = useState(null);

  // Map video_id → analysis for quick lookup
  const analysisMap = {};
  if (allAnalyses) {
    for (const a of allAnalyses) {
      if (!analysisMap[a.video_id] || a.status === 'complete') {
        analysisMap[a.video_id] = a;
      }
    }
  }

  const handleViewAnalysis = (analysisId) => {
    navigate(`/youtube-discovery/analysis/${analysisId}`);
  };

  const handleAnalyze = async (video) => {
    setAnalyzingVideoId(video.video_id);
    try {
      const result = await analyzeVideo.mutateAsync(video);
      if (result?.analysisId) {
        navigate(`/youtube-discovery/analysis/${result.analysisId}`);
      }
    } finally {
      setAnalyzingVideoId(null);
    }
  };

  const activeRun = selectedRunId
    ? allRuns?.find((r) => r.id === selectedRunId) || latestRun
    : latestRun;

  const { data: results, isLoading: resultsLoading } = useDiscoveryResults(
    activeRun?.id,
    selectedNiche
  );

  const isSearching = activeRun?.status === 'searching';
  const isComplete = activeRun?.status === 'complete';
  const hasRun = !!activeRun;

  useEffect(() => {
    if (justStarted && hasRun && (isSearching || isComplete)) {
      setJustStarted(false);
    }
    if (!justStarted) return;
    const t = setTimeout(() => setJustStarted(false), 20000);
    return () => clearTimeout(t);
  }, [justStarted, hasRun, isSearching, isComplete]);

  const toggleSearchNiche = (key) => {
    setSearchNiches(prev => {
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

  const toggleAllSearchNiches = () => {
    if (searchNiches.size === NICHES.length) {
      setSearchNiches(new Set([NICHES[0].key]));
    } else {
      setSearchNiches(new Set(NICHES.map(n => n.key)));
    }
  };

  const handleRun = () => {
    setJustStarted(true);
    setSelectedRunId(null);
    setSelectedNiche('all');
    runDiscovery.mutate({ timeRange: selectedTimeRange, niches: [...searchNiches] });
  };

  const handleUseForProject = (video) => {
    const niche = NICHES.find((n) => n.key === video.niche_category);
    navigate('/', {
      state: {
        openCreateModal: true,
        prefillNiche: niche?.label || video.niche_category,
        prefillDescription: video.title + '\n\nChannel: ' + video.channel_name + '\nViews: ' + formatNumber(video.views),
      },
    });
  };

  // Niche counts for tab badges
  const nicheCounts = {};
  if (results && selectedNiche === 'all') {
    for (const r of results) {
      nicheCounts[r.niche_category] = (nicheCounts[r.niche_category] || 0) + 1;
    }
  }

  // For "all" tab, we need unfiltered results to count
  const { data: allNicheResults } = useDiscoveryResults(activeRun?.id, 'all');
  const totalByNiche = {};
  if (allNicheResults) {
    for (const r of allNicheResults) {
      totalByNiche[r.niche_category] = (totalByNiche[r.niche_category] || 0) + 1;
    }
  }

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Niche Research"
        subtitle="Discover top-performing long-form videos across your niches"
      >
        <div className="flex items-center gap-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="text-xs h-9 rounded-md border border-border bg-card px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {TIME_RANGES.map((tr) => (
              <option key={tr.value} value={tr.value}>
                {tr.label}
              </option>
            ))}
          </select>

          <Button
            onClick={handleRun}
            disabled={runDiscovery.isPending || isSearching || justStarted}
            className="bg-gradient-to-r from-primary to-destructive hover:from-primary-hover hover:to-destructive/90 text-white shadow-glow-primary"
            size="sm"
          >
            {runDiscovery.isPending || isSearching || justStarted ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Discover Videos
              </>
            )}
          </Button>
        </div>
      </PageHeader>

      {/* Niche selection for search — grouped by parent niche, wraps to multiple lines */}
      <div className="mb-6 mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Select niches to search</span>
          <button
            onClick={toggleAllSearchNiches}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all cursor-pointer ${
              searchNiches.size === NICHES.length
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'bg-transparent text-muted-foreground border-border hover:border-border-hover'
            }`}
          >
            {searchNiches.size === NICHES.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {NICHE_GROUPS.map((group) => {
            const allChildKeys = group.children.map((c) => c.key);
            const allSelected = allChildKeys.every((k) => searchNiches.has(k));
            const someSelected = allChildKeys.some((k) => searchNiches.has(k));
            return (
              <div key={group.key} className="flex flex-wrap items-center gap-1.5 bg-card/50 border border-border/50 rounded-lg px-2.5 py-1.5">
                <button
                  onClick={() => {
                    setSearchNiches((prev) => {
                      const next = new Set(prev);
                      if (allSelected) {
                        allChildKeys.forEach((k) => next.delete(k));
                        if (next.size === 0) return prev;
                      } else {
                        allChildKeys.forEach((k) => next.add(k));
                      }
                      return next;
                    });
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                    allSelected
                      ? 'text-accent'
                      : someSelected
                        ? 'text-accent/60'
                        : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {group.label}
                </button>
                <span className="text-border/40 text-[10px]">|</span>
                {group.children.map((child) => (
                  <button
                    key={child.key}
                    onClick={() => toggleSearchNiche(child.key)}
                    title={child.v1Focus ? 'v1 launch spoke (Strategy §10.1)' : undefined}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all cursor-pointer inline-flex items-center gap-1 ${
                      searchNiches.has(child.key)
                        ? 'bg-primary/15 text-primary border-primary/30'
                        : 'bg-transparent text-muted-foreground border-border hover:border-border-hover'
                    } ${child.v1Focus ? 'ring-1 ring-accent/40' : ''}`}
                  >
                    {child.label}
                    {child.v1Focus && (
                      <span className="px-1 py-px rounded text-[9px] font-bold bg-accent/20 text-accent uppercase tracking-wider">
                        v1
                      </span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Just started */}
      {justStarted && !isSearching && (
        <div className="bg-card border border-border rounded-xl p-8 text-center mb-6">
          <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Searching YouTube...</p>
          <p className="text-xs text-muted-foreground">
            Scanning {searchNiches.size} niche{searchNiches.size !== 1 ? 's' : ''} with multiple keyword variations. This may take 30-60 seconds.
          </p>
        </div>
      )}

      {/* Searching progress */}
      {hasRun && isSearching && !justStarted && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <div>
              <p className="text-sm font-semibold">Searching YouTube...</p>
              <p className="text-xs text-muted-foreground">
                {activeRun.total_results || 0} videos found so far
              </p>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent animate-pulse rounded-full" style={{ width: '60%' }} />
          </div>
          <div className="flex justify-end mt-2">
            <Button
              onClick={() => cancelDiscovery.mutate(activeRun.id)}
              disabled={cancelDiscovery.isPending}
              variant="outline"
              size="sm"
              className="text-danger border-danger-border hover:bg-danger-bg"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* No runs yet */}
      {!hasRun && !runLoading && !justStarted && (
        <EmptyState
          icon={Play}
          title="No discovery runs yet"
          description="Click 'Discover Videos' to find top-performing long-form YouTube videos across your niches."
        />
      )}

      {/* Run history */}
      {allRuns && allRuns.length > 0 && !justStarted && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <History className="w-3.5 h-3.5" />
            Discovery History
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {allRuns.map((run) => (
              <button
                key={run.id}
                onClick={() => {
                  setSelectedRunId(run.id === latestRun?.id ? null : run.id);
                  setSelectedNiche('all');
                }}
                className={`flex-shrink-0 px-3 py-2 rounded-lg border text-xs transition-all cursor-pointer ${
                  (selectedRunId ? run.id === selectedRunId : run.id === latestRun?.id)
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-card border-border text-muted-foreground hover:border-border-hover'
                }`}
              >
                <span className="font-medium">{run.time_range}</span>
                <span className="mx-1.5 text-border">|</span>
                <span>{run.total_results || 0} videos</span>
                <span className="mx-1.5 text-border">|</span>
                <span>{formatAge(run.created_at)}</span>
                <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                  run.status === 'complete'
                    ? 'bg-success-bg text-success border-success-border'
                    : run.status === 'failed'
                      ? 'bg-danger-bg text-danger border-danger-border'
                      : 'bg-warning-bg text-warning border-warning-border'
                }`}>
                  {run.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results: Niche tabs + video grid */}
      {hasRun && isComplete && (
        <>
          {/* Niche filter tabs — wrapping layout */}
          <div className="flex flex-wrap gap-2 mb-6 mt-2">
            <button
              onClick={() => setSelectedNiche('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                selectedNiche === 'all'
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-transparent text-muted-foreground border-border hover:border-border-hover'
              }`}
            >
              All ({activeRun.total_results || 0})
            </button>
            {NICHE_GROUPS.map((group) => {
              const groupCount = group.children.reduce((sum, c) => sum + (totalByNiche[c.key] || 0), 0);
              const isGroupSelected = group.children.some((c) => c.key === selectedNiche);
              return (
                <span key={group.key} className="contents">
                  <span className={`px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${isGroupSelected ? 'text-accent' : 'text-muted-foreground/60'}`}>
                    {group.label} ({groupCount})
                  </span>
                  {group.children.map((n) => (
                    <button
                      key={n.key}
                      onClick={() => setSelectedNiche(n.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                        selectedNiche === n.key
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'bg-transparent text-muted-foreground border-border hover:border-border-hover'
                      }`}
                    >
                      {n.label} ({totalByNiche[n.key] || 0})
                    </button>
                  ))}
                </span>
              );
            })}
          </div>

          {/* Video grid */}
          {resultsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-card border border-border rounded-xl h-[280px] animate-pulse" />
              ))}
            </div>
          ) : results && results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {results.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onUseForProject={handleUseForProject}
                  onAnalyze={handleAnalyze}
                  isAnalyzing={analyzingVideoId === video.video_id}
                  existingAnalysis={analysisMap[video.video_id]}
                  onViewAnalysis={handleViewAnalysis}
                />
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-xs text-muted-foreground">No videos found for this niche.</p>
            </div>
          )}

          {/* Run metadata */}
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground py-4 mt-4 border-t border-border">
            <span className="flex items-center gap-1">
              <Timer className="w-3 h-3" />
              Time range: {activeRun.time_range}
            </span>
            <span>
              Completed {formatAge(activeRun.completed_at)}
            </span>
            <span>
              {activeRun.total_results} videos found
            </span>
          </div>
        </>
      )}

      {/* Failed run */}
      {hasRun && activeRun?.status === 'failed' && (
        <div className="bg-card border border-danger-border rounded-xl p-8 text-center mb-6">
          <p className="text-sm text-danger font-medium mb-2">Discovery run failed</p>
          <p className="text-xs text-muted-foreground mb-4">
            {Array.isArray(activeRun.error_log) && activeRun.error_log[0]?.error
              ? activeRun.error_log[0].error
              : 'An unexpected error occurred.'}
          </p>
          <Button onClick={handleRun} disabled={runDiscovery.isPending} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
