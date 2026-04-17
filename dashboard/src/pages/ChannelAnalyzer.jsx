import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Radar,
  Search,
  Plus,
  Loader2,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Moon,
  Users,
  Video,
  BarChart3,
  Target,
  Globe,
  ExternalLink,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Sparkles,
  FolderPlus,
  X,
  Check,
  Calendar,
  ArrowUpRight,
  Clock,
  Film,
  BookOpen,
  Palette,
  Lightbulb,
  Shield,
  ShieldAlert,
  ShieldOff,
  AlertTriangle,
  DollarSign,
  Zap,
  Ban,
  CircleDot,
} from 'lucide-react';
import {
  useAnalysisGroups,
  useChannelAnalyses,
  useComparisonReport,
  useStartAnalysis,
  useCreateProjectFromAnalysis,
  useRemoveAnalysis,
  useDiscoveredChannels,
  useNicheViability,
  useConfirmDeepAnalysis,
  useRunViabilityAssessment,
  useCreateProjectFromViability,
} from '../hooks/useChannelAnalyzer';
import PageHeader from '../components/shared/PageHeader';
import EmptyState from '../components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const VERDICT_CONFIG = {
  strong_opportunity: { label: 'Strong Opportunity', color: 'bg-success-bg text-success border-success-border', dot: 'bg-success' },
  moderate_opportunity: { label: 'Moderate', color: 'bg-warning-bg text-warning border-warning-border', dot: 'bg-warning' },
  weak_opportunity: { label: 'Weak', color: 'bg-[#ff8c00]/10 text-[#ff8c00] border-[#ff8c00]/30', dot: 'bg-[#ff8c00]' },
  avoid: { label: 'Avoid', color: 'bg-danger-bg text-danger border-danger-border', dot: 'bg-danger' },
};

const GROWTH_ICONS = {
  accelerating: TrendingUp,
  stable: Minus,
  decelerating: TrendingDown,
  dormant: Moon,
};

const GROWTH_COLORS = {
  accelerating: 'text-success',
  stable: 'text-muted-foreground',
  decelerating: 'text-warning',
  dormant: 'text-danger',
};

function formatNumber(n) {
  if (n == null) return '--';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function formatDuration(secs) {
  if (!secs) return '--';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatAge(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'today';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function generateGroupId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// ChannelCard — card for a single analysis in the grid
// ---------------------------------------------------------------------------

function ChannelCard({ analysis, onViewDetails, onRemove, isRemoving }) {
  const verdictCfg = VERDICT_CONFIG[analysis.verdict] || {};
  const GrowthIcon = GROWTH_ICONS[analysis.growth_trajectory] || Minus;
  const growthColor = GROWTH_COLORS[analysis.growth_trajectory] || 'text-muted-foreground';
  const isPending = analysis.status === 'pending' || analysis.status === 'analyzing';
  const isFailed = analysis.status === 'failed';

  if (isPending) {
    return (
      <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-5 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span>Analyzing channel...</span>
        </div>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="bg-card/80 backdrop-blur border border-danger-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-danger-bg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{analysis.channel_name || 'Unknown'}</p>
            <p className="text-[10px] text-danger">Analysis failed</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {analysis.error_message || 'An unexpected error occurred.'}
        </p>
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[10px] text-danger hover:text-danger/80"
            onClick={() => onRemove(analysis.id)}
            disabled={isRemoving}
          >
            <Trash2 className="w-3 h-3" />
            Remove
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/80 backdrop-blur border border-border rounded-xl overflow-hidden hover:border-border-hover transition-all group">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {analysis.channel_avatar_url ? (
              <img
                src={analysis.channel_avatar_url}
                alt={analysis.channel_name}
                className="w-10 h-10 rounded-full object-cover bg-muted"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate">{analysis.channel_name}</p>
              {analysis.channel_url && (
                <a
                  href={analysis.channel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">
                {formatNumber(analysis.subscriber_count)} subs
              </span>
              <span className="text-border text-[8px]">&bull;</span>
              <span className={cn('flex items-center gap-0.5 text-[10px]', growthColor)}>
                <GrowthIcon className="w-3 h-3" />
                {analysis.growth_trajectory || 'unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Verdict badge */}
        {analysis.verdict && (
          <div className="mt-3 flex items-center gap-2">
            <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border', verdictCfg.color)}>
              {verdictCfg.label}
            </span>
            {analysis.verdict_score != null && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {analysis.verdict_score}/100
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 border-t border-border/50 divide-x divide-border/50">
        <div className="px-3 py-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">Videos</p>
          <p className="text-xs font-semibold tabular-nums">{formatNumber(analysis.video_count)}</p>
        </div>
        <div className="px-3 py-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">Avg Views</p>
          <p className="text-xs font-semibold tabular-nums">{formatNumber(analysis.avg_views_per_video)}</p>
        </div>
        <div className="px-3 py-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">Avg Length</p>
          <p className="text-xs font-semibold tabular-nums">{formatDuration(analysis.avg_video_duration_seconds)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 py-2.5 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2.5 text-[10px] text-primary hover:text-primary-hover flex-1"
          onClick={() => onViewDetails(analysis)}
        >
          <Eye className="w-3 h-3" />
          View Details
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[10px] text-danger hover:text-danger/80"
          onClick={() => onRemove(analysis.id)}
          disabled={isRemoving}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChannelDetailPanel — expanded detail view with tabs
// ---------------------------------------------------------------------------

function ChannelDetailPanel({ analysis, onClose }) {
  if (!analysis) return null;

  const verdictCfg = VERDICT_CONFIG[analysis.verdict] || {};
  const topVideos = analysis.top_videos || [];
  const strengths = analysis.strengths || [];
  const weaknesses = analysis.weaknesses || [];
  const blueOcean = analysis.blue_ocean_opportunities;
  const saturation = analysis.content_saturation_map;
  const titlePatterns = analysis.title_patterns;
  const thumbnailPatterns = analysis.thumbnail_patterns;
  const scriptingDepth = analysis.scripting_depth;

  return (
    <div className="bg-card/80 backdrop-blur border border-border rounded-xl overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-4 p-5 border-b border-border">
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-card-hover text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {analysis.channel_avatar_url ? (
          <img src={analysis.channel_avatar_url} alt="" className="w-12 h-12 rounded-full object-cover bg-muted" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold truncate">{analysis.channel_name}</h2>
            {analysis.channel_url && (
              <a href={analysis.channel_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span>{formatNumber(analysis.subscriber_count)} subscribers</span>
            <span>{formatNumber(analysis.total_view_count)} total views</span>
            {analysis.country && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{analysis.country}</span>}
          </div>
        </div>
        {analysis.verdict && (
          <span className={cn('text-xs font-bold px-3 py-1.5 rounded-full border flex-shrink-0', verdictCfg.color)}>
            {verdictCfg.label} ({analysis.verdict_score}/100)
          </span>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-5 h-auto py-0 gap-0">
          {[
            { value: 'overview', label: 'Overview', icon: BarChart3 },
            { value: 'top-videos', label: 'Top Videos', icon: Film },
            { value: 'content', label: 'Content Analysis', icon: BookOpen },
            { value: 'title-thumbnail', label: 'Title & Thumbnail DNA', icon: Palette },
            { value: 'blue-ocean', label: 'Blue-Ocean Gaps', icon: Target },
            { value: 'scripting', label: 'Scripting Depth', icon: Lightbulb },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2.5 text-xs"
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="p-5 space-y-5">
          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Videos', value: formatNumber(analysis.video_count), icon: Video },
              { label: 'Avg Views', value: formatNumber(analysis.avg_views_per_video), icon: Eye },
              { label: 'Upload Freq', value: analysis.upload_frequency_days ? `${analysis.upload_frequency_days}d` : '--', icon: Calendar },
              { label: 'Monthly Views', value: formatNumber(analysis.estimated_monthly_views), icon: TrendingUp },
            ].map((m) => {
              const MIcon = m.icon;
              return (
                <div key={m.label} className="bg-card border border-border/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  </div>
                  <p className="text-lg font-bold tabular-nums">{m.value}</p>
                </div>
              );
            })}
          </div>

          {/* Verdict reasoning */}
          {analysis.verdict_reasoning && (
            <div className="bg-card border border-border/50 rounded-lg p-4">
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary" />
                Verdict Reasoning
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {analysis.verdict_reasoning}
              </p>
            </div>
          )}

          {/* Strengths / Weaknesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {strengths.length > 0 && (
              <div className="bg-card border border-border/50 rounded-lg p-4">
                <h3 className="text-xs font-semibold mb-2 text-success flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Strengths
                </h3>
                <ul className="space-y-1.5">
                  {strengths.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-success mt-0.5 flex-shrink-0">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {weaknesses.length > 0 && (
              <div className="bg-card border border-border/50 rounded-lg p-4">
                <h3 className="text-xs font-semibold mb-2 text-warning flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Weaknesses
                </h3>
                <ul className="space-y-1.5">
                  {weaknesses.map((w, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-warning mt-0.5 flex-shrink-0">-</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Description / audience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analysis.channel_description && (
              <div className="bg-card border border-border/50 rounded-lg p-4">
                <h3 className="text-xs font-semibold mb-2">Channel Description</h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6">{analysis.channel_description}</p>
              </div>
            )}
            {analysis.target_audience_description && (
              <div className="bg-card border border-border/50 rounded-lg p-4">
                <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  Target Audience
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{analysis.target_audience_description}</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Top Videos tab */}
        <TabsContent value="top-videos" className="p-5">
          {topVideos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No top videos data available.</p>
          ) : (
            <div className="space-y-3">
              {topVideos.map((v, i) => (
                <div key={i} className="flex items-start gap-3 bg-card border border-border/50 rounded-lg p-3 hover:border-border-hover transition-colors">
                  {v.thumbnail_url && (
                    <img src={v.thumbnail_url} alt="" className="w-28 h-16 rounded object-cover bg-muted flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <a
                      href={v.url || `https://www.youtube.com/watch?v=${v.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold line-clamp-2 hover:text-primary transition-colors"
                    >
                      {v.title}
                    </a>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      {v.views != null && <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(v.views)}</span>}
                      {v.likes != null && <span>{formatNumber(v.likes)} likes</span>}
                      {v.published_at && <span>{formatAge(v.published_at)}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">#{i + 1}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Content Analysis tab */}
        <TabsContent value="content" className="p-5 space-y-4">
          {analysis.primary_topics && analysis.primary_topics.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold mb-2">Primary Topics</h3>
              <div className="flex flex-wrap gap-1.5">
                {analysis.primary_topics.map((t, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>
                ))}
              </div>
            </div>
          )}
          {analysis.content_style && (
            <div className="bg-card border border-border/50 rounded-lg p-4">
              <h3 className="text-xs font-semibold mb-2">Content Style</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{analysis.content_style}</p>
            </div>
          )}
          {analysis.posting_schedule && (
            <div className="bg-card border border-border/50 rounded-lg p-4">
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Posting Schedule
              </h3>
              <p className="text-xs text-muted-foreground">{analysis.posting_schedule}</p>
            </div>
          )}
          {saturation && (
            <div className="bg-card border border-border/50 rounded-lg p-4">
              <h3 className="text-xs font-semibold mb-2">Content Saturation Map</h3>
              <RenderJson data={saturation} />
            </div>
          )}
        </TabsContent>

        {/* Title & Thumbnail DNA tab */}
        <TabsContent value="title-thumbnail" className="p-5 space-y-4">
          {titlePatterns && (
            <div className="bg-card border border-border/50 rounded-lg p-4">
              <h3 className="text-xs font-semibold mb-2">Title Patterns</h3>
              <RenderJson data={titlePatterns} />
            </div>
          )}
          {thumbnailPatterns && (
            <div className="bg-card border border-border/50 rounded-lg p-4">
              <h3 className="text-xs font-semibold mb-2">Thumbnail Patterns</h3>
              <RenderJson data={thumbnailPatterns} />
            </div>
          )}
        </TabsContent>

        {/* Blue-Ocean Opportunities tab */}
        <TabsContent value="blue-ocean" className="p-5 space-y-4">
          {blueOcean ? (
            <div className="bg-card border border-border/50 rounded-lg p-4">
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" />
                Blue-Ocean Opportunities
              </h3>
              <RenderJson data={blueOcean} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">No blue-ocean data available for this channel.</p>
          )}
        </TabsContent>

        {/* Scripting Depth tab */}
        <TabsContent value="scripting" className="p-5 space-y-4">
          {scriptingDepth ? (
            <div className="bg-card border border-border/50 rounded-lg p-4">
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-primary" />
                Scripting Depth Analysis
              </h3>
              <RenderJson data={scriptingDepth} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">No scripting depth data available.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RenderJson — recursively render JSONB data in a readable format
// ---------------------------------------------------------------------------

function RenderJson({ data }) {
  if (!data) return null;

  if (typeof data === 'string') {
    return <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{data}</p>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <p className="text-xs text-muted-foreground">None</p>;
    // If array of strings, render as tags
    if (data.every((item) => typeof item === 'string')) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {data.map((item, i) => (
            <Badge key={i} variant="secondary" className="text-[10px]">{item}</Badge>
          ))}
        </div>
      );
    }
    // Array of objects
    return (
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className="bg-background/50 rounded p-2.5 border border-border/30">
            <RenderJson data={item} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    return (
      <dl className="space-y-2">
        {entries.map(([key, value]) => (
          <div key={key}>
            <dt className="text-[10px] font-semibold text-foreground capitalize">
              {key.replace(/_/g, ' ')}
            </dt>
            <dd className="mt-0.5 pl-2">
              <RenderJson data={value} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return <span className="text-xs text-muted-foreground">{String(data)}</span>;
}

// ---------------------------------------------------------------------------
// CombinedIntelligence — shown when 2+ completed analyses
// ---------------------------------------------------------------------------

function CombinedIntelligence({ report, analyses, onCreateProject }) {
  if (!report) return null;

  const verdictCfg = VERDICT_CONFIG[report.overall_verdict] || {};
  const gaps = report.combined_blue_ocean_gaps;
  const pillars = report.recommended_content_pillars || [];

  return (
    <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Combined Intelligence
        </h2>
        {report.overall_verdict && (
          <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border', verdictCfg.color)}>
            {verdictCfg.label} ({report.overall_verdict_score}/100)
          </span>
        )}
      </div>

      {report.overall_verdict_reasoning && (
        <p className="text-xs text-muted-foreground leading-relaxed">{report.overall_verdict_reasoning}</p>
      )}

      {report.differentiation_strategy && (
        <div className="bg-card border border-border/50 rounded-lg p-3">
          <h3 className="text-[10px] font-semibold text-primary mb-1">Differentiation Strategy</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{report.differentiation_strategy}</p>
        </div>
      )}

      {/* Blue-ocean gaps */}
      {gaps && (
        <div className="bg-card border border-border/50 rounded-lg p-3">
          <h3 className="text-[10px] font-semibold text-primary mb-2 flex items-center gap-1.5">
            <Target className="w-3 h-3" />
            Blue-Ocean Gaps
          </h3>
          <RenderJson data={gaps} />
        </div>
      )}

      {/* Content pillars */}
      {pillars.length > 0 && (
        <div>
          <h3 className="text-[10px] font-semibold text-muted-foreground mb-2">Recommended Content Pillars</h3>
          <div className="flex flex-wrap gap-1.5">
            {pillars.map((p, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{p}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Create Project CTA */}
      <Button
        onClick={onCreateProject}
        className="bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent/90 text-white shadow-glow-primary"
        size="sm"
      >
        <FolderPlus className="w-3.5 h-3.5" />
        Create Project from This Research
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DiscoveredCompetitors — grid of discovered channels with depth toggles
// ---------------------------------------------------------------------------

const DEPTH_OPTIONS = [
  { value: 'quick', label: 'Quick', desc: 'Basic stats only' },
  { value: 'medium', label: 'Medium', desc: 'Stats + top videos' },
  { value: 'deep', label: 'Deep', desc: 'Full analysis' },
];

function DiscoveredCompetitors({ channels, onConfirmAnalysis, isAnalyzing }) {
  const [selected, setSelected] = useState(new Set());
  const [depths, setDepths] = useState({});

  if (!channels || channels.length === 0) return null;

  const completedCount = channels.filter(c => c.analysis_status === 'completed').length;
  const analyzingCount = channels.filter(c => c.analysis_status === 'analyzing').length;
  const discoveredCount = channels.filter(c => c.analysis_status === 'discovered').length;

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const discoveredIds = channels
      .filter(c => c.analysis_status === 'discovered')
      .map(c => c.id);
    setSelected(new Set(discoveredIds));
  };

  const setDepth = (id, depth) => {
    setDepths((prev) => ({ ...prev, [id]: depth }));
  };

  const handleConfirm = () => {
    const toAnalyze = channels
      .filter(c => selected.has(c.id) && c.analysis_status === 'discovered')
      .map(c => ({
        id: c.id,
        channel_url: c.channel_url,
        analysis_depth: depths[c.id] || 'medium',
      }));
    if (toAnalyze.length > 0) {
      onConfirmAnalysis(toAnalyze);
      setSelected(new Set());
    }
  };

  return (
    <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Discovered Competitors ({channels.length})
        </h2>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {completedCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              {completedCount} analyzed
            </span>
          )}
          {analyzingCount > 0 && (
            <span className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              {analyzingCount} in progress
            </span>
          )}
          {discoveredCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
              {discoveredCount} pending
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {channels.map((ch) => {
          const isDiscovered = ch.analysis_status === 'discovered';
          const isChecked = selected.has(ch.id);
          const currentDepth = depths[ch.id] || 'medium';
          const statusColor =
            ch.analysis_status === 'completed' ? 'border-success/40' :
            ch.analysis_status === 'analyzing' ? 'border-primary/40' :
            ch.analysis_status === 'failed' ? 'border-danger/40' :
            'border-border';

          return (
            <div
              key={ch.id}
              className={cn(
                'bg-card border rounded-lg p-3 transition-all',
                statusColor,
                isChecked && isDiscovered && 'ring-1 ring-primary/50 bg-primary/5',
              )}
            >
              <div className="flex items-start gap-2 mb-2">
                {isDiscovered && (
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelect(ch.id)}
                    className="mt-0.5 rounded border-border text-primary focus:ring-primary"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{ch.channel_name}</p>
                  {ch.channel_handle && (
                    <p className="text-[10px] text-muted-foreground truncate">{ch.channel_handle}</p>
                  )}
                </div>
                {ch.relevance_score != null && (
                  <span className={cn(
                    'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                    ch.relevance_score >= 80 ? 'bg-success/10 text-success' :
                    ch.relevance_score >= 60 ? 'bg-warning/10 text-warning' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {ch.relevance_score}%
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                <span>{formatNumber(ch.subscriber_count)} subs</span>
                <span className="text-border">&bull;</span>
                <span>{formatNumber(ch.avg_views_per_video)} avg</span>
              </div>

              {/* Status indicator */}
              {ch.analysis_status === 'analyzing' && (
                <div className="flex items-center gap-1.5 text-[10px] text-primary">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Analyzing...</span>
                </div>
              )}
              {ch.analysis_status === 'completed' && (
                <div className="flex items-center gap-1.5 text-[10px] text-success">
                  <Check className="w-3 h-3" />
                  <span>Complete</span>
                </div>
              )}
              {ch.analysis_status === 'failed' && (
                <div className="flex items-center gap-1.5 text-[10px] text-danger">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Failed</span>
                </div>
              )}
              {ch.analysis_status === 'skipped' && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Minus className="w-3 h-3" />
                  <span>Skipped</span>
                </div>
              )}

              {/* Depth toggle — only for discovered channels that are selected */}
              {isDiscovered && isChecked && (
                <div className="mt-2 flex gap-1">
                  {DEPTH_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDepth(ch.id, opt.value)}
                      title={opt.desc}
                      className={cn(
                        'flex-1 text-[9px] py-1 rounded transition-colors',
                        currentDepth === opt.value
                          ? 'bg-primary text-white'
                          : 'bg-card-hover text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action bar */}
      {discoveredCount > 0 && (
        <div className="flex items-center gap-3 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-[10px]"
            onClick={selectAll}
          >
            Select All Pending
          </Button>
          <Button
            size="sm"
            disabled={selected.size === 0 || isAnalyzing}
            onClick={handleConfirm}
            className="bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent/90 text-white shadow-glow-primary"
          >
            {isAnalyzing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Radar className="w-3.5 h-3.5" />
            )}
            Analyze Selected ({selected.size})
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NicheViabilitySection — viability score, factor breakdown, revenue, gaps
// ---------------------------------------------------------------------------

const VIABILITY_COLOR = (score) => {
  if (score >= 75) return { text: 'text-emerald-400', bg: 'bg-emerald-400', ring: 'ring-emerald-400/30', gradient: 'from-emerald-500 to-emerald-600' };
  if (score >= 50) return { text: 'text-yellow-400', bg: 'bg-yellow-400', ring: 'ring-yellow-400/30', gradient: 'from-yellow-500 to-yellow-600' };
  if (score >= 25) return { text: 'text-orange-400', bg: 'bg-orange-400', ring: 'ring-orange-400/30', gradient: 'from-orange-500 to-orange-600' };
  return { text: 'text-red-400', bg: 'bg-red-400', ring: 'ring-red-400/30', gradient: 'from-red-500 to-red-600' };
};

const MOAT_ICONS = {
  high: Shield,
  medium: ShieldAlert,
  low: ShieldOff,
};

function FactorBar({ label, score, weight, icon: Icon, breakdown }) {
  const pct = Math.min(100, Math.max(0, score || 0));
  const color =
    pct >= 75 ? 'bg-emerald-400' :
    pct >= 50 ? 'bg-yellow-400' :
    pct >= 25 ? 'bg-orange-400' : 'bg-red-400';

  return (
    <div className="bg-card border border-border/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-semibold">{label}</span>
          <span className="text-[9px] text-muted-foreground">({weight}%)</span>
        </div>
        <span className="text-xs font-bold tabular-nums">{score ?? '--'}/100</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
      {breakdown && typeof breakdown === 'object' && (
        <div className="mt-2 space-y-1">
          {Object.entries(breakdown).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
              <span className="text-foreground">{typeof v === 'number' ? v : String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NicheViabilitySection({ report, onCreateProject, onRunViability, isRunning }) {
  if (!report) return null;

  const scoreColor = VIABILITY_COLOR(report.viability_score);
  const blueOcean = report.blue_ocean_opportunities || [];
  const saturatedTopics = report.saturated_topics || [];
  const topicsToAvoid = report.topics_to_avoid || [];
  const recommendedPillars = report.recommended_content_pillars || [];
  const revenueProjections = report.revenue_projections || {};
  const recommendedTopics = report.recommended_topics || [];

  const verdictLabel =
    report.viability_verdict === 'strong_opportunity' ? 'Strong Opportunity' :
    report.viability_verdict === 'moderate_opportunity' ? 'Moderate Opportunity' :
    report.viability_verdict === 'weak_opportunity' ? 'Weak Opportunity' : 'Avoid';

  return (
    <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Niche Viability Assessment
        </h2>
      </div>

      {/* Viability Score + Verdict */}
      <div className="flex flex-col sm:flex-row items-start gap-5">
        {/* Big score ring */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className={cn('relative w-28 h-28 rounded-full flex items-center justify-center ring-4', scoreColor.ring)}>
            <svg className="absolute inset-0 w-28 h-28 -rotate-90" viewBox="0 0 112 112">
              <circle cx="56" cy="56" r="48" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
              <circle
                cx="56" cy="56" r="48" fill="none" strokeWidth="6"
                strokeDasharray={`${(report.viability_score / 100) * 301.6} 301.6`}
                strokeLinecap="round"
                className={scoreColor.text}
              />
            </svg>
            <div className="text-center z-10">
              <span className={cn('text-3xl font-black tabular-nums', scoreColor.text)}>{report.viability_score}</span>
              <span className="text-[10px] text-muted-foreground block">/100</span>
            </div>
          </div>
          <span className={cn('text-xs font-bold mt-2', scoreColor.text)}>{verdictLabel}</span>
        </div>

        {/* Verdict reasoning */}
        <div className="flex-1 space-y-3">
          {report.viability_reasoning && (
            <p className="text-xs text-muted-foreground leading-relaxed">{report.viability_reasoning}</p>
          )}
          {report.differentiation_strategy && (
            <div className="bg-card border border-border/50 rounded-lg p-3">
              <h3 className="text-[10px] font-semibold text-primary mb-1">Differentiation Strategy</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{report.differentiation_strategy}</p>
            </div>
          )}
          {report.recommended_angle && (
            <div className="bg-card border border-border/50 rounded-lg p-3">
              <h3 className="text-[10px] font-semibold text-primary mb-1">Recommended Angle</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{report.recommended_angle}</p>
            </div>
          )}
        </div>
      </div>

      {/* 4 Factor Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FactorBar
          label="Monetization Potential"
          score={report.monetization_score}
          weight={30}
          icon={DollarSign}
          breakdown={report.monetization_breakdown}
        />
        <FactorBar
          label="Audience Demand"
          score={report.audience_demand_score}
          weight={25}
          icon={TrendingUp}
          breakdown={report.audience_demand_breakdown}
        />
        <FactorBar
          label="Competition Gap"
          score={report.competition_gap_score}
          weight={25}
          icon={Target}
          breakdown={report.competition_gap_breakdown}
        />
        <FactorBar
          label="Entry Difficulty"
          score={report.entry_difficulty_score}
          weight={20}
          icon={Zap}
          breakdown={report.entry_difficulty_breakdown}
        />
      </div>

      {/* Revenue Projections */}
      {revenueProjections && Object.keys(revenueProjections).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-primary" />
            Revenue Projections (Monthly)
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {['10k', '50k', '100k'].map((tier) => {
              const key = `at_${tier}_subs`;
              const val = revenueProjections[key] || revenueProjections[tier];
              return (
                <div key={tier} className="bg-card border border-border/50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">{tier.toUpperCase()} subs</p>
                  <p className="text-lg font-bold text-emerald-400 tabular-nums">
                    {val != null ? `$${typeof val === 'number' ? val.toLocaleString() : val}` : '--'}
                  </p>
                </div>
              );
            })}
          </div>
          {(report.estimated_rpm_mid != null || report.ad_category) && (
            <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
              {report.estimated_rpm_mid != null && (
                <span>Est. RPM: ${Number(report.estimated_rpm_low || 0).toFixed(0)}-${Number(report.estimated_rpm_high || 0).toFixed(0)}</span>
              )}
              {report.ad_category && <span>Ad Category: {report.ad_category}</span>}
              {report.sponsorship_potential && <span>Sponsorship: {report.sponsorship_potential}</span>}
            </div>
          )}
        </div>
      )}

      {/* Blue-Ocean Opportunities */}
      {blueOcean.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Blue-Ocean Opportunities
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {blueOcean.map((opp, i) => {
              const topic = typeof opp === 'string' ? opp : opp.topic || opp.title || opp.opportunity;
              const demand = typeof opp === 'object' ? opp.demand || opp.demand_level : null;
              const saturation = typeof opp === 'object' ? opp.saturation || opp.saturation_level : null;
              const moatLevel = typeof opp === 'object' ? (opp.moat_defensibility || opp.defensibility || '').toLowerCase() : '';
              const angle = typeof opp === 'object' ? opp.suggested_angle || opp.angle : null;
              const MoatIcon = MOAT_ICONS[moatLevel] || ShieldOff;

              return (
                <div key={i} className="bg-card border border-border/50 rounded-lg p-3">
                  <p className="text-xs font-semibold mb-1.5">{topic}</p>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {demand && (
                      <Badge variant="secondary" className="text-[9px]">
                        <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                        {demand}
                      </Badge>
                    )}
                    {saturation && (
                      <Badge variant="secondary" className="text-[9px]">
                        <BarChart3 className="w-2.5 h-2.5 mr-0.5" />
                        {saturation}
                      </Badge>
                    )}
                    {moatLevel && (
                      <Badge variant="secondary" className="text-[9px]">
                        <MoatIcon className="w-2.5 h-2.5 mr-0.5" />
                        {moatLevel}
                      </Badge>
                    )}
                  </div>
                  {angle && (
                    <p className="text-[10px] text-muted-foreground">{angle}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Topics to AVOID */}
      {(topicsToAvoid.length > 0 || saturatedTopics.length > 0) && (
        <div>
          <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-danger">
            <Ban className="w-3.5 h-3.5" />
            Topics to Avoid (Saturated)
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {topicsToAvoid.map((t, i) => (
              <span key={`avoid-${i}`} className="text-[10px] px-2 py-1 rounded-full border border-danger/30 bg-danger/5 text-danger">
                {t}
              </span>
            ))}
            {saturatedTopics.map((t, i) => {
              const label = typeof t === 'string' ? t : t.topic || t.title;
              return (
                <span key={`sat-${i}`} className="text-[10px] px-2 py-1 rounded-full border border-danger/30 bg-danger/5 text-danger">
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommended Content Pillars */}
      {recommendedPillars.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold mb-2">Recommended Content Pillars</h3>
          <div className="flex flex-wrap gap-1.5">
            {recommendedPillars.map((p, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{p}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Moat Assessment */}
      {report.defensibility_assessment && (
        <div className="bg-card border border-border/50 rounded-lg p-3">
          <h3 className="text-[10px] font-semibold mb-1 flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-primary" />
            Moat Assessment
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{report.defensibility_assessment}</p>
        </div>
      )}

      {/* Script / Title / Thumbnail DNA targets — compact summary */}
      {(report.script_depth_targets || report.title_dna_patterns || report.thumbnail_dna_patterns) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {report.script_depth_targets && (
            <div className="bg-card border border-border/50 rounded-lg p-3">
              <h3 className="text-[10px] font-semibold mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3 h-3 text-primary" />
                Script Targets
              </h3>
              <RenderJson data={report.script_depth_targets} />
            </div>
          )}
          {report.title_dna_patterns && (
            <div className="bg-card border border-border/50 rounded-lg p-3">
              <h3 className="text-[10px] font-semibold mb-1 flex items-center gap-1.5">
                <Palette className="w-3 h-3 text-primary" />
                Title DNA
              </h3>
              <RenderJson data={report.title_dna_patterns} />
            </div>
          )}
          {report.thumbnail_dna_patterns && (
            <div className="bg-card border border-border/50 rounded-lg p-3">
              <h3 className="text-[10px] font-semibold mb-1 flex items-center gap-1.5">
                <Film className="w-3 h-3 text-primary" />
                Thumbnail DNA
              </h3>
              <RenderJson data={report.thumbnail_dna_patterns} />
            </div>
          )}
        </div>
      )}

      {/* Create Project CTA with viability badge */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          onClick={onCreateProject}
          className="bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent/90 text-white shadow-glow-primary"
          size="sm"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          Create Project from This Research
          <span className={cn(
            'ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full',
            report.viability_score >= 75 ? 'bg-emerald-500/20 text-emerald-300' :
            report.viability_score >= 50 ? 'bg-yellow-500/20 text-yellow-300' :
            report.viability_score >= 25 ? 'bg-orange-500/20 text-orange-300' :
            'bg-red-500/20 text-red-300'
          )}>
            {report.viability_score}/100
          </span>
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CreateProjectModal (enhanced with viability data)
// ---------------------------------------------------------------------------

function CreateProjectModal({ open, onOpenChange, report, viabilityReport, analyses, onConfirm, isPending }) {
  const [nicheName, setNicheName] = useState('');
  const [nicheDescription, setNicheDescription] = useState('');
  const [selectedChannels, setSelectedChannels] = useState(new Set());
  const [includeViability, setIncludeViability] = useState(true);
  const [injectTopicsToAvoid, setInjectTopicsToAvoid] = useState(true);

  // Pre-fill when opening
  useMemo(() => {
    if (open && report) {
      setNicheName(report.recommended_niche_description ? report.recommended_niche_description.split('.')[0].slice(0, 60) : '');
      setNicheDescription(report.recommended_niche_description || '');
      setSelectedChannels(new Set((analyses || []).filter(a => a.status === 'completed').map(a => a.id)));
    }
    if (open && viabilityReport) {
      // Override with viability angle if available
      if (viabilityReport.recommended_angle && !nicheName) {
        setNicheDescription(viabilityReport.recommended_angle);
      }
      setIncludeViability(true);
      setInjectTopicsToAvoid(true);
    }
  }, [open, report, viabilityReport, analyses]);

  const completedAnalyses = (analyses || []).filter(a => a.status === 'completed');

  const toggleChannel = (id) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const payload = {
      niche_name: nicheName,
      niche_description: nicheDescription,
      include_viability: includeViability && !!viabilityReport,
      inject_topics_to_avoid: injectTopicsToAvoid && !!viabilityReport,
    };
    if (includeViability && viabilityReport) {
      payload.viability_data = {
        topics_to_avoid: viabilityReport.topics_to_avoid,
        recommended_topics: viabilityReport.recommended_topics,
        recommended_angle: viabilityReport.recommended_angle,
        revenue_projections: viabilityReport.revenue_projections,
        script_depth_targets: viabilityReport.script_depth_targets,
        title_dna_patterns: viabilityReport.title_dna_patterns,
        thumbnail_dna_patterns: viabilityReport.thumbnail_dna_patterns,
      };
    }
    onConfirm(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Project from Analysis</DialogTitle>
          <DialogDescription>
            Pre-load a new project with competitive intelligence from your channel analyses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold mb-1.5 block">Niche Name</label>
            <input
              type="text"
              value={nicheName}
              onChange={(e) => setNicheName(e.target.value)}
              placeholder="e.g. True Crime Documentary"
              className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold mb-1.5 block">Niche Description</label>
            <textarea
              value={nicheDescription}
              onChange={(e) => setNicheDescription(e.target.value)}
              rows={3}
              placeholder="Describe the niche angle you want to pursue..."
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {completedAnalyses.length > 0 && (
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Include as Competitors</label>
              <div className="space-y-1.5">
                {completedAnalyses.map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md border border-border/50 hover:border-border-hover transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedChannels.has(a.id)}
                      onChange={() => toggleChannel(a.id)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    {a.channel_avatar_url ? (
                      <img src={a.channel_avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-muted" />
                    )}
                    <span className="text-xs font-medium">{a.channel_name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{formatNumber(a.subscriber_count)} subs</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Viability toggles — only shown when viability data exists */}
          {viabilityReport && (
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">Viability Intelligence</span>
                <span className={cn(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto',
                  viabilityReport.viability_score >= 75 ? 'bg-emerald-500/10 text-emerald-400' :
                  viabilityReport.viability_score >= 50 ? 'bg-yellow-500/10 text-yellow-400' :
                  viabilityReport.viability_score >= 25 ? 'bg-orange-500/10 text-orange-400' :
                  'bg-red-500/10 text-red-400'
                )}>
                  Score: {viabilityReport.viability_score}/100
                </span>
              </div>
              <label className="flex items-center gap-2.5 px-3 py-2 rounded-md border border-border/50 cursor-pointer hover:border-border-hover transition-colors">
                <input
                  type="checkbox"
                  checked={includeViability}
                  onChange={(e) => setIncludeViability(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-medium">Include viability research</span>
                  <p className="text-[10px] text-muted-foreground">Inject revenue projections, content pillars, and script targets</p>
                </div>
              </label>
              <label className="flex items-center gap-2.5 px-3 py-2 rounded-md border border-border/50 cursor-pointer hover:border-border-hover transition-colors">
                <input
                  type="checkbox"
                  checked={injectTopicsToAvoid}
                  onChange={(e) => setInjectTopicsToAvoid(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-medium">Inject topics to avoid</span>
                  <p className="text-[10px] text-muted-foreground">
                    {(viabilityReport.topics_to_avoid || []).length} saturated topics will be excluded from topic generation
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!nicheName.trim() || isPending}
            onClick={handleConfirm}
            className="bg-gradient-to-r from-primary to-accent text-white"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderPlus className="w-3.5 h-3.5" />}
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ChannelAnalyzer() {
  const navigate = useNavigate();

  // State
  const [channelUrl, setChannelUrl] = useState('');
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Queries
  const { data: groups, isLoading: groupsLoading } = useAnalysisGroups();
  const { data: analyses, isLoading: analysesLoading } = useChannelAnalyses(activeGroupId);
  const { data: comparisonReport } = useComparisonReport(activeGroupId);
  const { data: discoveredChannels } = useDiscoveredChannels(activeGroupId);
  const { data: viabilityReport } = useNicheViability(activeGroupId);

  // Mutations
  const startAnalysis = useStartAnalysis();
  const createProject = useCreateProjectFromAnalysis();
  const createProjectFromViability = useCreateProjectFromViability();
  const removeAnalysis = useRemoveAnalysis();
  const confirmDeepAnalysis = useConfirmDeepAnalysis();
  const runViability = useRunViabilityAssessment();

  // Auto-select latest group if none is active
  useMemo(() => {
    if (!activeGroupId && groups && groups.length > 0) {
      setActiveGroupId(groups[0].analysis_group_id);
    }
  }, [groups, activeGroupId]);

  // Computed
  const completedCount = useMemo(
    () => (analyses || []).filter((a) => a.status === 'completed').length,
    [analyses]
  );
  const showCombinedIntel = completedCount >= 2 && comparisonReport;
  const showDiscoveredChannels = discoveredChannels && discoveredChannels.length > 0;
  const showViability = !!viabilityReport;
  const canRunViability = completedCount >= 2 && !viabilityReport && !runViability.isPending;

  // Handlers
  const handleAnalyze = useCallback(() => {
    if (!channelUrl.trim()) return;

    const groupId = activeGroupId || generateGroupId();
    if (!activeGroupId) setActiveGroupId(groupId);

    startAnalysis.mutate({
      channel_url: channelUrl.trim(),
      analysis_group_id: groupId,
    });
    setChannelUrl('');
  }, [channelUrl, activeGroupId, startAnalysis]);

  const handleNewGroup = useCallback(() => {
    const newId = generateGroupId();
    setActiveGroupId(newId);
    setSelectedDetail(null);
  }, []);

  const handleSelectGroup = useCallback((gid) => {
    setActiveGroupId(gid);
    setSelectedDetail(null);
  }, []);

  const handleRemove = useCallback(
    (id) => {
      removeAnalysis.mutate({ id });
      if (selectedDetail?.id === id) setSelectedDetail(null);
    },
    [removeAnalysis, selectedDetail]
  );

  const handleConfirmDeepAnalysis = useCallback(
    (channelsToAnalyze) => {
      confirmDeepAnalysis.mutate({
        channels: channelsToAnalyze,
        analysisGroupId: activeGroupId,
      });
    },
    [activeGroupId, confirmDeepAnalysis]
  );

  const handleRunViability = useCallback(() => {
    if (!activeGroupId) return;
    runViability.mutate({ analysis_group_id: activeGroupId });
  }, [activeGroupId, runViability]);

  const handleCreateProject = useCallback(
    ({ niche_name, niche_description, include_viability, inject_topics_to_avoid, viability_data }) => {
      const mutation = viability_data ? createProjectFromViability : createProject;
      mutation.mutate(
        {
          analysis_group_id: activeGroupId,
          niche_name,
          niche_description,
          ...(viability_data ? { include_viability, inject_topics_to_avoid, viability_data } : {}),
        },
        {
          onSuccess: (result) => {
            setShowCreateModal(false);
            if (result?.data?.project_id) {
              navigate(`/project/${result.data.project_id}`);
            }
          },
        }
      );
    },
    [activeGroupId, createProject, createProjectFromViability, navigate]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Channel Analyzer"
        subtitle="Analyze YouTube channels to discover blue-ocean opportunities and competitive gaps"
      />

      {/* ── Input bar ── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste a YouTube channel URL (e.g. youtube.com/@MrBeast)"
            className="w-full h-10 rounded-lg border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={!channelUrl.trim() || startAnalysis.isPending}
          className="bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent/90 text-white shadow-glow-primary"
          size="default"
        >
          {startAnalysis.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Radar className="w-4 h-4" />
          )}
          Analyze
        </Button>
      </div>

      {/* ── Analysis groups selector ── */}
      {groups && groups.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Analysis Groups</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px]"
              onClick={handleNewGroup}
            >
              <Plus className="w-3 h-3" />
              New Group
            </Button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {groups.map((g) => {
              const isActive = g.analysis_group_id === activeGroupId;
              return (
                <button
                  key={g.analysis_group_id}
                  onClick={() => handleSelectGroup(g.analysis_group_id)}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all cursor-pointer',
                    isActive
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-card border-border text-muted-foreground hover:border-border-hover'
                  )}
                >
                  {/* Channel avatars stacked */}
                  <div className="flex -space-x-1.5">
                    {g.channels.slice(0, 4).map((ch, i) => (
                      ch.avatar ? (
                        <img key={i} src={ch.avatar} alt="" className="w-5 h-5 rounded-full border border-background object-cover" />
                      ) : (
                        <div key={i} className="w-5 h-5 rounded-full border border-background bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                          {ch.name?.[0] || '?'}
                        </div>
                      )
                    ))}
                  </div>
                  <span className="font-medium">{g.count} channel{g.count !== 1 ? 's' : ''}</span>
                  <span className="text-border text-[8px]">&bull;</span>
                  <span>{formatAge(g.latest_at)}</span>
                  {g.has_pending && (
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Detail panel (when a channel is selected) ── */}
      {selectedDetail && (
        <div className="mb-6">
          <ChannelDetailPanel
            analysis={selectedDetail}
            onClose={() => setSelectedDetail(null)}
          />
        </div>
      )}

      {/* ── Combined Intelligence ── */}
      {!selectedDetail && showCombinedIntel && (
        <div className="mb-6">
          <CombinedIntelligence
            report={comparisonReport}
            analyses={analyses}
            onCreateProject={() => setShowCreateModal(true)}
          />
        </div>
      )}

      {/* ── Discovered Competitors ── */}
      {!selectedDetail && showDiscoveredChannels && (
        <div className="mb-6">
          <DiscoveredCompetitors
            channels={discoveredChannels}
            onConfirmAnalysis={handleConfirmDeepAnalysis}
            isAnalyzing={confirmDeepAnalysis.isPending}
          />
        </div>
      )}

      {/* ── Run Viability Assessment button (when enough data, no report yet) ── */}
      {!selectedDetail && canRunViability && (
        <div className="mb-6 flex items-center gap-3">
          <Button
            onClick={handleRunViability}
            disabled={runViability.isPending}
            className="bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent/90 text-white shadow-glow-primary"
            size="sm"
          >
            {runViability.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Target className="w-3.5 h-3.5" />
            )}
            Run Niche Viability Assessment
          </Button>
          <span className="text-[10px] text-muted-foreground">
            Analyze market opportunity across {completedCount} channels
          </span>
        </div>
      )}

      {/* ── Niche Viability ── */}
      {!selectedDetail && showViability && (
        <div className="mb-6">
          <NicheViabilitySection
            report={viabilityReport}
            onCreateProject={() => setShowCreateModal(true)}
            onRunViability={handleRunViability}
            isRunning={runViability.isPending}
          />
        </div>
      )}

      {/* ── Channel cards grid ── */}
      {!selectedDetail && (
        <>
          {analysesLoading && activeGroupId ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card border border-border rounded-xl h-[200px] animate-pulse" />
              ))}
            </div>
          ) : analyses && analyses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {analyses.map((a) => (
                <ChannelCard
                  key={a.id}
                  analysis={a}
                  onViewDetails={setSelectedDetail}
                  onRemove={handleRemove}
                  isRemoving={removeAnalysis.isPending}
                />
              ))}
            </div>
          ) : activeGroupId && !groupsLoading ? (
            <EmptyState
              icon={Radar}
              title="No channels analyzed yet"
              description="Paste a YouTube channel URL above and click Analyze to start discovering competitive opportunities."
            />
          ) : !groupsLoading ? (
            <EmptyState
              icon={Radar}
              title="Channel Analyzer"
              description="Analyze competing YouTube channels to find blue-ocean gaps and build your competitive advantage. Paste a channel URL above to get started."
            />
          ) : null}
        </>
      )}

      {/* ── Create Project Modal ── */}
      <CreateProjectModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        report={comparisonReport}
        viabilityReport={viabilityReport}
        analyses={analyses}
        onConfirm={handleCreateProject}
        isPending={createProject.isPending || createProjectFromViability.isPending}
      />
    </div>
  );
}
