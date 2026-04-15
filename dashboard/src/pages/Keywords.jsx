import { useState, useMemo } from 'react';
import { useParams } from 'react-router';
import {
  Hash,
  Search,
  Play,
  Loader2,
  Copy,
  TrendingUp,
  TrendingDown,
  Minus,
  MoreVertical,
  Waves,
  Target,
  Activity,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useKeywords, useScanKeywords } from '../hooks/useKeywords';
import PageHeader from '../components/shared/PageHeader';
import KPICard from '../components/shared/KPICard';
import EmptyState from '../components/shared/EmptyState';
import FilterDropdown from '../components/ui/FilterDropdown';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CLASSIFICATION_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'blue-ocean', label: 'Blue Ocean' },
  { value: 'competitive', label: 'Competitive' },
  { value: 'red-ocean', label: 'Red Ocean' },
  { value: 'dead-sea', label: 'Dead Sea' },
];

const COMPETITION_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const SORT_OPTIONS = [
  { value: 'opportunity_desc', label: 'Opportunity' },
  { value: 'volume_desc', label: 'Volume' },
  { value: 'competition_asc', label: 'Competition (low first)' },
  { value: 'recent', label: 'Recent' },
];

const CLASSIFICATION_STYLES = {
  'blue-ocean': 'bg-info-bg text-info border-info-border',
  'competitive': 'bg-warning-bg text-warning border-warning-border',
  'red-ocean': 'bg-danger-bg text-danger border-danger-border',
  'dead-sea': 'bg-muted text-muted-foreground border-border',
};

const COMPETITION_STYLES = {
  low: 'bg-success-bg text-success border-success-border',
  medium: 'bg-warning-bg text-warning border-warning-border',
  high: 'bg-danger-bg text-danger border-danger-border',
};

const TREND_ICONS = {
  rising: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

const TREND_STYLES = {
  rising: 'text-success',
  stable: 'text-muted-foreground',
  declining: 'text-danger',
};

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
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '\u2014';
  }
}

function opportunityColor(score) {
  if (score == null) return 'text-muted-foreground';
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-muted-foreground';
}

function opportunityBarColor(score) {
  if (score == null) return 'bg-muted-foreground/40';
  if (score >= 75) return 'bg-success';
  if (score >= 50) return 'bg-warning';
  return 'bg-muted-foreground/60';
}

function formatNumber(n) {
  if (n == null) return '\u2014';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function KeywordSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-4 w-40 bg-muted rounded" />
        <div className="flex-1" />
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-4 w-16 bg-muted rounded" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row Action Menu                                                    */
/* ------------------------------------------------------------------ */

function RowActionMenu({ keyword, onUse }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        title="Actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-20 min-w-[200px]
            bg-card border border-border rounded-lg shadow-lg py-1 animate-fade-in"
        >
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onUse(keyword);
              setOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left
              text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            Use in Topic Generation
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Keywords Page                                                      */
/* ------------------------------------------------------------------ */

export default function Keywords() {
  const { id: projectId } = useParams();
  const { data: keywords = [], isLoading } = useKeywords(projectId);
  const scanMutation = useScanKeywords(projectId);

  const [seedInput, setSeedInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('all');
  const [competitionFilter, setCompetitionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('opportunity_desc');

  /* -- Stats -- */
  const stats = useMemo(() => {
    const total = keywords.length;
    const blueOcean = keywords.filter((k) => k.seo_classification === 'blue-ocean').length;
    const trending = keywords.filter((k) => k.trend_signal === 'rising').length;
    const scored = keywords.filter((k) => k.opportunity_score != null);
    const avgOpp = scored.length > 0
      ? Math.round(scored.reduce((s, k) => s + k.opportunity_score, 0) / scored.length)
      : 0;
    return { total, blueOcean, avgOpp, trending };
  }, [keywords]);

  /* -- Filter + sort -- */
  const visibleKeywords = useMemo(() => {
    let rows = keywords;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((k) =>
        (k.keyword || '').toLowerCase().includes(q) ||
        (k.normalized_keyword || '').toLowerCase().includes(q)
      );
    }
    if (classificationFilter !== 'all') {
      rows = rows.filter((k) => k.seo_classification === classificationFilter);
    }
    if (competitionFilter !== 'all') {
      rows = rows.filter((k) => k.competition_level === competitionFilter);
    }

    const sorted = [...rows];
    if (sortBy === 'opportunity_desc') {
      sorted.sort((a, b) => (b.opportunity_score ?? -1) - (a.opportunity_score ?? -1));
    } else if (sortBy === 'volume_desc') {
      sorted.sort((a, b) => (b.search_volume_proxy ?? -1) - (a.search_volume_proxy ?? -1));
    } else if (sortBy === 'competition_asc') {
      const rank = { low: 0, medium: 1, high: 2 };
      sorted.sort((a, b) => (rank[a.competition_level] ?? 9) - (rank[b.competition_level] ?? 9));
    } else if (sortBy === 'recent') {
      sorted.sort((a, b) => new Date(b.last_scanned_at || 0) - new Date(a.last_scanned_at || 0));
    }
    return sorted;
  }, [keywords, searchQuery, classificationFilter, competitionFilter, sortBy]);

  /* -- Actions -- */
  const handleScan = async () => {
    const seeds = seedInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await scanMutation.mutateAsync({ seedKeywords: seeds });
      if (res?.success === false) {
        toast.error(res.error || 'Scan failed');
      } else {
        toast.success('Scan started. Results will stream in as they arrive.');
        setSeedInput('');
      }
    } catch (err) {
      toast.error(err?.message || 'Scan failed');
    }
  };

  const handleUseKeyword = async (kw) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(kw.keyword);
      }
      toast.success(`Copied: ${kw.keyword}`);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const subtitle = `${stats.total} scanned \u00B7 ${stats.blueOcean} blue ocean`;

  /* -- Render -- */
  return (
    <div className="animate-slide-up">
      {/* Header */}
      <PageHeader title="Keywords" subtitle={subtitle}>
        {scanMutation.isPending && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Scanning...
          </span>
        )}
      </PageHeader>

      {/* Action bar: seed input + scan button */}
      <div className="bg-card border border-border rounded-xl p-4 mb-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border">
          <Hash className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            placeholder="Seed keywords (comma-separated, optional) - leave blank to derive from niche"
            className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground
              placeholder:text-muted-foreground min-w-0"
            disabled={scanMutation.isPending}
          />
        </div>
        <Button
          size="sm"
          onClick={handleScan}
          disabled={scanMutation.isPending}
          className="flex-shrink-0"
        >
          {scanMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          {scanMutation.isPending ? 'Scanning...' : 'Scan Keywords'}
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="stagger-1 animate-slide-up">
          <KPICard label="Total Keywords" value={stats.total} icon={Hash} />
        </div>
        <div className="stagger-2 animate-slide-up">
          <KPICard label="Blue Ocean" value={stats.blueOcean} icon={Waves} />
        </div>
        <div className="stagger-3 animate-slide-up">
          <KPICard label="Avg Opportunity" value={stats.avgOpp} icon={Target} />
        </div>
        <div className="stagger-4 animate-slide-up">
          <KPICard label="Trending Up" value={stats.trending} icon={Activity} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-muted border border-border
              text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
          />
        </div>
        <FilterDropdown
          label="Classification"
          value={classificationFilter}
          onChange={setClassificationFilter}
          options={CLASSIFICATION_OPTIONS}
        />
        <FilterDropdown
          label="Competition"
          value={competitionFilter}
          onChange={setCompetitionFilter}
          options={COMPETITION_OPTIONS}
        />
        <FilterDropdown
          label="Sort by"
          value={sortBy}
          onChange={setSortBy}
          options={SORT_OPTIONS}
        />
      </div>

      {/* Content */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <KeywordSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && keywords.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <EmptyState
            icon={Sparkles}
            title="No keywords scanned yet"
            description="Scan to mine high-opportunity keywords for this niche. Results stream in as each source resolves."
            action={
              <Button size="sm" onClick={handleScan} disabled={scanMutation.isPending}>
                {scanMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {scanMutation.isPending ? 'Scanning...' : 'Scan Keywords'}
              </Button>
            }
          />
        </div>
      )}

      {!isLoading && keywords.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-card-hover/40">
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Keyword
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-[180px]">
                    Opportunity
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-24">
                    Volume
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-28">
                    Competition
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-32">
                    Classification
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-16">
                    Related
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-24">
                    Scanned
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-12" />
                </tr>
              </thead>
              <tbody>
                {visibleKeywords.map((kw, i) => {
                  const TrendIcon = kw.trend_signal ? TREND_ICONS[kw.trend_signal] : null;
                  const relatedCount = Array.isArray(kw.related_keywords)
                    ? kw.related_keywords.length
                    : 0;
                  return (
                    <tr
                      key={kw.id}
                      className={cn(
                        'border-b border-border last:border-b-0 hover:bg-card-hover transition-colors',
                        `stagger-${Math.min(i + 1, 8)} animate-fade-in`
                      )}
                    >
                      {/* Keyword */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate max-w-[300px]">
                            {kw.keyword}
                          </span>
                          {TrendIcon && (
                            <TrendIcon
                              className={cn('w-3 h-3 flex-shrink-0', TREND_STYLES[kw.trend_signal])}
                            />
                          )}
                        </div>
                        {kw.source && kw.source !== 'keyword_scan' && (
                          <div className="mt-0.5 text-[10px] text-muted-foreground">
                            via {kw.source}
                          </div>
                        )}
                      </td>

                      {/* Opportunity score + bar */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-xs font-bold tabular-nums w-8 text-right',
                              opportunityColor(kw.opportunity_score)
                            )}
                          >
                            {kw.opportunity_score ?? '\u2014'}
                          </span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                opportunityBarColor(kw.opportunity_score)
                              )}
                              style={{ width: `${Math.max(0, Math.min(100, kw.opportunity_score ?? 0))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Volume */}
                      <td className="px-4 py-3 text-right text-xs font-mono tabular-nums text-muted-foreground">
                        {formatNumber(kw.search_volume_proxy)}
                      </td>

                      {/* Competition */}
                      <td className="px-4 py-3">
                        {kw.competition_level ? (
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium border capitalize',
                              COMPETITION_STYLES[kw.competition_level] ||
                                'bg-muted text-muted-foreground border-border'
                            )}
                          >
                            {kw.competition_level}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{'\u2014'}</span>
                        )}
                        {kw.competing_videos_count != null && (
                          <div className="mt-0.5 text-[10px] text-muted-foreground">
                            {formatNumber(kw.competing_videos_count)} videos
                          </div>
                        )}
                      </td>

                      {/* Classification */}
                      <td className="px-4 py-3">
                        {kw.seo_classification ? (
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium border',
                              CLASSIFICATION_STYLES[kw.seo_classification] ||
                                'bg-muted text-muted-foreground border-border'
                            )}
                          >
                            {kw.seo_classification}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{'\u2014'}</span>
                        )}
                      </td>

                      {/* Related count */}
                      <td className="px-4 py-3 text-right text-xs font-mono tabular-nums text-muted-foreground">
                        {relatedCount > 0 ? relatedCount : '\u2014'}
                      </td>

                      {/* Scanned time */}
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {formatRelativeTime(kw.last_scanned_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <RowActionMenu keyword={kw} onUse={handleUseKeyword} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {visibleKeywords.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No keywords match the current filters.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
