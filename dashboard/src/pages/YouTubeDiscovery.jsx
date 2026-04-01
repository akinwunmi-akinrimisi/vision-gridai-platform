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
} from 'lucide-react';
import {
  NICHES,
  useLatestDiscoveryRun,
  useDiscoveryResults,
  useAllDiscoveryRuns,
  useRunDiscovery,
  useCancelDiscovery,
} from '../hooks/useYouTubeDiscovery';
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

function VideoCard({ video, onUseForProject }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-border-hover transition-all">
      {/* Thumbnail */}
      <div className="relative">
        <img
          src={video.thumbnail_url}
          alt={video.title}
          className="w-full h-[140px] object-cover bg-muted"
          loading="lazy"
        />
        <span className="absolute bottom-2 right-2 bg-background/90 text-foreground text-[10px] font-mono px-1.5 py-0.5 rounded">
          {formatDuration(video.duration_seconds)}
        </span>
      </div>

      {/* Content */}
      <div className="p-3">
        <a
          href={video.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold leading-tight line-clamp-2 hover:text-primary transition-colors"
        >
          {video.title}
        </a>

        <p className="text-[10px] text-muted-foreground mt-1 truncate">
          {video.channel_name}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1" title="Views">
            <Eye className="w-3 h-3" />
            {formatNumber(video.views)}
          </span>
          <span className="flex items-center gap-1" title="Likes">
            <ThumbsUp className="w-3 h-3" />
            {formatNumber(video.likes)}
          </span>
          <span className="flex items-center gap-1" title="Comments">
            <MessageSquare className="w-3 h-3" />
            {formatNumber(video.comments)}
          </span>
          <span className="flex items-center gap-1 ml-auto" title="Published">
            <Clock className="w-3 h-3" />
            {formatAge(video.published_at)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[10px] text-primary hover:text-primary-hover flex-1"
            onClick={() => onUseForProject(video)}
          >
            Use for Project
          </Button>
          <a
            href={video.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors"
          >
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
  const [selectedTimeRange, setSelectedTimeRange] = useState('1y');
  const [selectedNiche, setSelectedNiche] = useState('all');
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [justStarted, setJustStarted] = useState(false);

  const { data: latestRun, isLoading: runLoading } = useLatestDiscoveryRun();
  const { data: allRuns } = useAllDiscoveryRuns();
  const runDiscovery = useRunDiscovery();
  const cancelDiscovery = useCancelDiscovery();

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

  const handleRun = () => {
    setJustStarted(true);
    setSelectedRunId(null);
    setSelectedNiche('all');
    runDiscovery.mutate({ timeRange: selectedTimeRange });
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
        title="YouTube Discovery"
        subtitle="Find top-performing long-form videos (45min+) across 5 niches"
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

      {/* Just started */}
      {justStarted && !isSearching && (
        <div className="bg-card border border-border rounded-xl p-8 text-center mb-6">
          <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Searching YouTube...</p>
          <p className="text-xs text-muted-foreground">
            Scanning 5 niches with multiple keyword variations. This may take 30-60 seconds.
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
          description="Click 'Discover Videos' to find top-performing long-form YouTube videos across 5 niches."
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
          {/* Niche tabs */}
          <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedNiche('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                selectedNiche === 'all'
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-transparent text-muted-foreground border-border hover:border-border-hover'
              }`}
            >
              All ({activeRun.total_results || 0})
            </button>
            {NICHES.map((n) => (
              <button
                key={n.key}
                onClick={() => setSelectedNiche(n.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                  selectedNiche === n.key
                    ? 'bg-primary/15 text-primary border-primary/30'
                    : 'bg-transparent text-muted-foreground border-border hover:border-border-hover'
                }`}
              >
                {n.label} ({totalByNiche[n.key] || 0})
              </button>
            ))}
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
