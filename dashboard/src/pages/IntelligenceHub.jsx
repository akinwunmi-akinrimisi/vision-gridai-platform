import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router';
import {
  Users,
  Flame,
  Target,
  DollarSign,
  Plus,
  ExternalLink,
  X,
  Loader2,
  Play,
  Palette,
  Eye,
  Smile,
  Sparkles,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  CheckCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useCompetitorChannels,
  useCompetitorVideos,
  useCompetitorAlerts,
  useStyleProfiles,
  useCompetitorIntelligence,
  useRPMBenchmark,
  useTopicIntelligence,
  useProjectRow,
  useAddCompetitorChannel,
  useDismissAlert,
  useMarkAllAlertsRead,
  useAnalyzeStyleDNA,
  useRunCompetitorMonitor,
  useRunRPMClassify,
  extractChannelIdentifier,
} from '../hooks/useIntelligenceHub';
import PageHeader from '../components/shared/PageHeader';
import KPICard from '../components/shared/KPICard';
import EmptyState from '../components/shared/EmptyState';
import Modal from '../components/ui/Modal';
import {
  OutlierBadge,
  SEOBadge,
  CombinedScoreBadge,
  computeCombinedScore,
} from '../components/topics/IntelligenceBadges';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const VIDEO_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'outliers', label: 'Outliers' },
  { value: 'topic_match', label: 'Topic Matches' },
];

const CLASSIFICATION_STYLES = {
  'blue-ocean': 'bg-info-bg text-info border-info-border',
  'competitive': 'bg-warning-bg text-warning border-warning-border',
  'red-ocean': 'bg-danger-bg text-danger border-danger-border',
  'dead-sea': 'bg-muted text-muted-foreground border-border',
};

const FLAME_EMOJI = '\ud83d\udd25';

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

function formatNumber(n) {
  if (n == null) return '\u2014';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function channelInitial(name) {
  if (!name) return '?';
  const stripped = name.replace(/^@/, '').trim();
  return stripped.charAt(0).toUpperCase() || '?';
}

function firstThreeColors(dna) {
  if (!dna || typeof dna !== 'object') return [];
  const colors = dna.dominant_colors;
  if (!Array.isArray(colors)) return [];
  return colors.slice(0, 3).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/*  Minimal markdown renderer                                          */
/* ------------------------------------------------------------------ */

function renderMarkdown(text) {
  if (!text || typeof text !== 'string') return null;
  const blocks = text.split(/\n\s*\n/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('# ')) {
      return <h3 key={i} className="text-sm font-bold mt-4 mb-2">{trimmed.slice(2)}</h3>;
    }
    if (trimmed.startsWith('## ')) {
      return <h4 key={i} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-4 mb-2">{trimmed.slice(3)}</h4>;
    }
    if (/^[-*]\s/.test(trimmed)) {
      const items = trimmed.split('\n').map((l) => l.replace(/^[-*]\s+/, '')).filter(Boolean);
      return (
        <ul key={i} className="list-disc list-inside space-y-1 my-2 text-sm text-muted-foreground">
          {items.map((it, j) => <li key={j}>{it}</li>)}
        </ul>
      );
    }
    return <p key={i} className="text-sm text-muted-foreground my-2 leading-relaxed">{trimmed}</p>;
  });
}

/* ------------------------------------------------------------------ */
/*  Alert Banner                                                       */
/* ------------------------------------------------------------------ */

function AlertBanner({ alerts, onScrollToFeed, onMarkAllRead, isMarking }) {
  const unread = alerts.filter((a) => !a.is_read && !a.is_dismissed);
  if (unread.length === 0) return null;

  const breakouts = unread.filter((a) => a.alert_type === 'outlier_breakout').length;
  const topicMatches = unread.filter((a) => a.alert_type === 'topic_match').length;
  const styleReady = unread.filter((a) => a.alert_type === 'style_dna_ready').length;

  return (
    <div className="mb-5 rounded-xl border border-warning-border bg-warning-bg/30 px-4 py-3 animate-fade-in">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-base">{FLAME_EMOJI}</span>
          <span className="text-sm font-semibold text-foreground">
            {unread.length} new intelligence {unread.length === 1 ? 'signal' : 'signals'}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {[
            breakouts > 0 ? `${breakouts} competitor breakout${breakouts > 1 ? 's' : ''}` : null,
            topicMatches > 0 ? `${topicMatches} topic match${topicMatches > 1 ? 'es' : ''}` : null,
            styleReady > 0 ? `${styleReady} style DNA ready` : null,
          ].filter(Boolean).join(' \u00B7 ')}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onScrollToFeed}>
            View all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllRead}
            disabled={isMarking}
          >
            {isMarking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
            Mark all read
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Competitor Modal                                               */
/* ------------------------------------------------------------------ */

function AddCompetitorModal({ isOpen, onClose, onSubmit, isPending }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState(null);

  const preview = useMemo(() => extractChannelIdentifier(url), [url]);

  const handleSubmit = async () => {
    setError(null);
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Paste a YouTube channel URL to continue.');
      return;
    }
    try {
      await onSubmit({ channel_url: trimmed });
      toast.success('Channel added \u2014 metadata will populate on the next monitor run.');
      setUrl('');
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to add channel');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Track Competitor Channel">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            YouTube Channel URL
          </label>
          <textarea
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/channel/UC... or https://youtube.com/@handle"
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border
              text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40
              transition-all resize-none"
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Paste a full channel URL. For best results use <code className="px-1 py-0.5 rounded bg-muted text-[10px]">/channel/UC...</code>. Handles will be resolved on the next monitor run.
          </p>
        </div>

        {preview.kind && preview.value && (
          <div className="px-3 py-2 rounded-lg bg-success-bg border border-success-border text-xs text-success">
            Detected {preview.kind === 'channel_id' ? 'channel ID' : 'handle'}: <code className="font-mono">{preview.value}</code>
          </div>
        )}

        {error && (
          <div className="px-3 py-2 rounded-lg bg-danger-bg border border-danger-border text-xs text-danger flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isPending || !url.trim()}>
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Track Channel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Analyze Style DNA Modal                                            */
/* ------------------------------------------------------------------ */

function AnalyzeStyleModal({ isOpen, onClose, onSubmit, isPending }) {
  const [url, setUrl] = useState('');
  const [applyToProject, setApplyToProject] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setError(null);
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Paste a YouTube channel URL to continue.');
      return;
    }
    try {
      const res = await onSubmit({ channel_url: trimmed, apply_to_project: applyToProject });
      if (res?.success === false) {
        setError(res.error || 'Analysis failed');
        return;
      }
      toast.success('Style DNA analysis started. Results appear in ~60s.');
      setUrl('');
      setApplyToProject(false);
      onClose();
    } catch (err) {
      setError(err?.message || 'Analysis failed');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Analyze Channel Style DNA">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Channel URL
          </label>
          <textarea
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/channel/UC..."
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border
              text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40
              transition-all resize-none"
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            We analyze up to 30 recent videos: title formulas, thumbnail DNA, content pillars.
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={applyToProject}
            onChange={(e) => setApplyToProject(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-muted-foreground">Apply this style DNA to the current project</span>
        </label>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-danger-bg border border-danger-border text-xs text-danger flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isPending || !url.trim()}>
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Analyze
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Style Profile Detail Modal                                         */
/* ------------------------------------------------------------------ */

function StyleProfileDetailModal({ profile, onClose }) {
  if (!profile) return null;

  const formulas = Array.isArray(profile.title_formulas) ? profile.title_formulas : [];
  const pillars = Array.isArray(profile.content_pillars) ? profile.content_pillars : [];
  const colors = firstThreeColors(profile.thumbnail_dna);

  return (
    <Modal
      isOpen={!!profile}
      onClose={onClose}
      title={profile.channel_name || 'Style Profile'}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
        {/* Summary */}
        {profile.style_summary && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Summary
            </h4>
            <p className="text-sm leading-relaxed">{profile.style_summary}</p>
          </div>
        )}

        {/* Thumbnail DNA */}
        {profile.thumbnail_dna && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Thumbnail DNA
            </h4>
            <div className="flex items-center gap-2 mb-2">
              {colors.map((c, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-md border border-border shadow-sm"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
            {profile.thumbnail_visual_summary && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {profile.thumbnail_visual_summary}
              </p>
            )}
          </div>
        )}

        {/* Title formulas */}
        {formulas.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Title Formulas
            </h4>
            <div className="space-y-2">
              {formulas.map((f, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted border border-border">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold">{f.pattern_name || `Formula ${i + 1}`}</span>
                    {f.frequency_pct != null && (
                      <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                        {f.frequency_pct}% of uploads
                      </span>
                    )}
                  </div>
                  {f.template && (
                    <code className="text-[11px] text-muted-foreground block mb-1">{f.template}</code>
                  )}
                  {f.example && (
                    <p className="text-xs text-foreground/80 italic">"{f.example}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content pillars */}
        {pillars.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Content Pillars
            </h4>
            <div className="space-y-2">
              {pillars.map((p, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted border border-border">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold">{p.pillar_name}</span>
                    {p.pct_of_uploads != null && (
                      <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                        {p.pct_of_uploads}%
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Replication notes */}
        {profile.replication_notes && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Replication {profile.replication_difficulty && `\u00B7 ${profile.replication_difficulty}`}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{profile.replication_notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Video Row                                                          */
/* ------------------------------------------------------------------ */

function VideoRow({ video, index, onDismiss }) {
  const channel = video.competitor_channels || {};
  const views = video.views_7d ?? video.views_30d ?? video.views_at_discovery;
  const ratio = video.outlier_ratio;
  const youtubeUrl = `https://youtube.com/watch?v=${video.youtube_video_id}`;

  return (
    <div
      className={cn(
        'group flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-card-hover transition-colors',
        `stagger-${Math.min(index + 1, 8)} animate-fade-in`,
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-xs font-bold text-foreground border border-border">
        {channelInitial(channel.channel_name)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-0.5">
          <span className="text-xs text-muted-foreground truncate">
            {channel.channel_name || 'Unknown channel'}
          </span>
          {video.is_outlier && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border bg-warning-bg text-warning border-warning-border tabular-nums">
              <Flame className="w-2.5 h-2.5" />
              Outlier
            </span>
          )}
          {video.topic_pattern_match && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border bg-info-bg text-info border-info-border">
              <Target className="w-2.5 h-2.5" />
              Topic match
            </span>
          )}
          {video.is_shorts && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium border bg-muted text-muted-foreground border-border">
              Short
            </span>
          )}
        </div>
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
        >
          {video.title || 'Untitled video'}
        </a>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
          <span>Published {formatRelativeTime(video.published_at)}</span>
          <span>{'\u00B7'}</span>
          <span>{formatNumber(views)} views</span>
          {ratio != null && (
            <>
              <span>{'\u00B7'}</span>
              <span className={cn(ratio >= 2 ? 'text-warning font-semibold' : '')}>
                {ratio.toFixed(1)}x avg
                {ratio >= 2 && ` ${FLAME_EMOJI}`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Open on YouTube"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={() => toast.info('Adding to topic ideas ships in S6')}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title="Add to topic ideas"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDismiss(video.id)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-danger hover:bg-danger-bg/30 transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function IntelligenceHub() {
  const { id: projectId } = useParams();

  const { data: project } = useProjectRow(projectId);
  const { data: channels = [] } = useCompetitorChannels(projectId);
  const { data: alerts = [] } = useCompetitorAlerts(projectId);
  const { data: styleProfiles = [] } = useStyleProfiles(projectId);
  const { data: weeklyIntel } = useCompetitorIntelligence(projectId);
  const { data: rpmBenchmark } = useRPMBenchmark(project);
  const { data: topics = [] } = useTopicIntelligence(projectId);

  const [videoFilter, setVideoFilter] = useState('all');
  const { data: videos = [], isLoading: videosLoading } = useCompetitorVideos(projectId, {
    filter: videoFilter,
    limit: 20,
  });

  const addChannelMutation = useAddCompetitorChannel(projectId);
  const dismissAlertMutation = useDismissAlert(projectId);
  const markAllReadMutation = useMarkAllAlertsRead(projectId);
  const analyzeStyleMutation = useAnalyzeStyleDNA(projectId);
  const runMonitorMutation = useRunCompetitorMonitor(projectId);
  const runRPMMutation = useRunRPMClassify(projectId);

  const [addOpen, setAddOpen] = useState(false);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);

  /* -- Stats -- */
  const stats = useMemo(() => {
    const activeChannels = channels.filter((c) => c.is_active).length;
    const inactiveChannels = channels.length - activeChannels;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const outlierBreakouts = videos.filter(
      (v) => v.is_outlier && v.published_at && new Date(v.published_at).getTime() > weekAgo,
    ).length;

    const topicCombined = topics
      .map(computeCombinedScore)
      .filter((s) => s != null);
    const topPPS = topicCombined.length > 0 ? Math.max(...topicCombined) : null;

    return { activeChannels, inactiveChannels, outlierBreakouts, topPPS };
  }, [channels, videos, topics]);

  /* -- Top 10 topics by combined score -- */
  const topTopics = useMemo(() => {
    return [...topics]
      .map((t) => ({ ...t, _combined: computeCombinedScore(t) }))
      .filter((t) => t._combined != null)
      .sort((a, b) => b._combined - a._combined)
      .slice(0, 10);
  }, [topics]);

  const unreadAlerts = alerts.filter((a) => !a.is_read && !a.is_dismissed);

  /* -- Handlers -- */
  const handleDismissVideo = async (videoId) => {
    // Soft-dismiss any alerts tied to this video.
    const related = alerts.filter((a) => a.competitor_video_id === videoId && !a.is_dismissed);
    try {
      await Promise.all(related.map((a) => dismissAlertMutation.mutateAsync({ alertId: a.id })));
      toast.success('Dismissed');
    } catch (err) {
      toast.error(err?.message || 'Failed to dismiss');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
      toast.success('All alerts marked read');
    } catch (err) {
      toast.error(err?.message || 'Failed');
    }
  };

  const handleRunMonitor = async () => {
    try {
      const res = await runMonitorMutation.mutateAsync();
      if (res?.success === false) {
        toast.error(res.error || 'Monitor run failed');
      } else {
        toast.success('Competitor monitor running \u2014 results stream in shortly.');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to run monitor');
    }
  };

  const handleRunRPM = async () => {
    try {
      const res = await runRPMMutation.mutateAsync();
      if (res?.success === false) {
        toast.error(res.error || 'Classification failed');
      } else {
        toast.success('Classifying niche RPM\u2026');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed');
    }
  };

  const scrollToFeed = () => {
    const el = document.getElementById('competitor-activity-feed');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const subtitle = `${channels.length} competitor${channels.length === 1 ? '' : 's'} tracked \u00B7 ${unreadAlerts.length} alert${unreadAlerts.length === 1 ? '' : 's'} \u00B7 ${styleProfiles.length} style profile${styleProfiles.length === 1 ? '' : 's'}`;

  /* -- Render -- */
  return (
    <div className="animate-slide-up">
      <PageHeader title="Intelligence Hub" subtitle={subtitle}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRunMonitor}
          disabled={runMonitorMutation.isPending}
        >
          {runMonitorMutation.isPending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />}
          Run Monitor
        </Button>
      </PageHeader>

      {/* Alert banner */}
      <AlertBanner
        alerts={alerts}
        onScrollToFeed={scrollToFeed}
        onMarkAllRead={handleMarkAllRead}
        isMarking={markAllReadMutation.isPending}
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="stagger-1 animate-slide-up">
          <KPICard
            label="Competitors Tracked"
            value={stats.activeChannels}
            delta={stats.inactiveChannels > 0 ? `${stats.inactiveChannels} paused` : undefined}
            icon={Users}
          />
        </div>
        <div className="stagger-2 animate-slide-up">
          <KPICard
            label="Outlier Breakouts (7d)"
            value={stats.outlierBreakouts}
            icon={Flame}
          />
        </div>
        <div className="stagger-3 animate-slide-up">
          <KPICard
            label="Top Topic PPS"
            value={stats.topPPS != null ? stats.topPPS : '\u2014'}
            icon={Target}
          />
        </div>
        <div className="stagger-4 animate-slide-up">
          <KPICard
            label="RPM Range"
            value={
              project?.estimated_rpm_low != null && project?.estimated_rpm_high != null
                ? `$${project.estimated_rpm_low.toFixed(0)}\u2013$${project.estimated_rpm_high.toFixed(0)}`
                : 'Not classified'
            }
            delta={rpmBenchmark?.display_name || undefined}
            icon={DollarSign}
          />
        </div>
      </div>

      {/* Main 60/40 row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
        {/* LEFT: Competitor Activity Feed */}
        <div id="competitor-activity-feed" className="lg:col-span-3">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-wrap">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold">Competitor Activity</h2>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                  {VIDEO_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setVideoFilter(f.value)}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                        videoFilter === f.value
                          ? 'bg-card text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="w-3.5 h-3.5" />
                Add Competitor
              </Button>
            </div>

            {/* Loading */}
            {videosLoading && (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Empty: no channels */}
            {!videosLoading && channels.length === 0 && (
              <EmptyState
                icon={Users}
                title="No competitors tracked yet"
                description="Add a YouTube channel to start tracking uploads, outlier breakouts, and topic overlap in real time."
                action={
                  <Button size="sm" onClick={() => setAddOpen(true)}>
                    <Plus className="w-3.5 h-3.5" />
                    Add your first competitor
                  </Button>
                }
              />
            )}

            {/* Empty: channels exist but no videos yet */}
            {!videosLoading && channels.length > 0 && videos.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  {videoFilter === 'all'
                    ? 'No videos tracked yet. Run the monitor to fetch recent uploads.'
                    : `No ${videoFilter === 'outliers' ? 'outliers' : 'topic matches'} in this window.`}
                </p>
                {videoFilter === 'all' && (
                  <Button variant="outline" size="sm" onClick={handleRunMonitor} disabled={runMonitorMutation.isPending}>
                    {runMonitorMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    Run Monitor Now
                  </Button>
                )}
              </div>
            )}

            {/* Video list */}
            {!videosLoading && videos.length > 0 && (
              <div>
                {videos.map((v, i) => (
                  <VideoRow key={v.id} video={v} index={i} onDismiss={handleDismissVideo} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Niche RPM + Style DNA */}
        <div className="lg:col-span-2 space-y-5">
          {/* Niche RPM */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-accent" />
                Niche RPM
              </h3>
              {project?.niche_rpm_category && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRunRPM}
                  disabled={runRPMMutation.isPending}
                  className="text-[11px] h-7 px-2"
                >
                  {runRPMMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Reclassify
                </Button>
              )}
            </div>

            {!project?.niche_rpm_category ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground mb-3">
                  Niche not classified yet.
                </p>
                <Button size="sm" onClick={handleRunRPM} disabled={runRPMMutation.isPending}>
                  {runRPMMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Target className="w-3.5 h-3.5" />}
                  Classify Niche
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-lg font-bold tracking-tight">
                    {rpmBenchmark?.display_name || project.niche_rpm_category}
                  </div>
                  {rpmBenchmark?.notes && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{rpmBenchmark.notes}</p>
                  )}
                </div>

                {/* RPM range */}
                <div>
                  <div className="flex items-baseline justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    <span>RPM Range</span>
                    <span className="font-mono tabular-nums normal-case">
                      ${project.estimated_rpm_low?.toFixed(0) ?? '?'}\u2013${project.estimated_rpm_high?.toFixed(0) ?? '?'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden relative">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-info via-accent to-success"
                      style={{ width: '100%' }}
                    />
                    {project.estimated_rpm_mid != null && rpmBenchmark && (
                      <div
                        className="absolute inset-y-0 w-0.5 bg-foreground/80"
                        style={{
                          left: `${Math.max(0, Math.min(100,
                            ((project.estimated_rpm_mid - rpmBenchmark.rpm_low) /
                              Math.max(1, rpmBenchmark.rpm_high - rpmBenchmark.rpm_low)) * 100,
                          ))}%`,
                        }}
                        title={`Mid: $${project.estimated_rpm_mid.toFixed(0)}`}
                      />
                    )}
                  </div>
                </div>

                {/* Revenue potential */}
                {project.revenue_potential_score != null && (
                  <div>
                    <div className="flex items-baseline justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      <span>Revenue Potential</span>
                      <span className="font-mono tabular-nums normal-case">
                        {project.revenue_potential_score}/100
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          project.revenue_potential_score >= 75 ? 'bg-success' :
                            project.revenue_potential_score >= 50 ? 'bg-warning' :
                              'bg-muted-foreground/60',
                        )}
                        style={{ width: `${Math.max(0, Math.min(100, project.revenue_potential_score))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Style DNA */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Palette className="w-4 h-4 text-accent" />
                Competitor Style DNA
              </h3>
              <Button size="sm" variant="outline" onClick={() => setAnalyzeOpen(true)}>
                <Sparkles className="w-3.5 h-3.5" />
                Analyze
              </Button>
            </div>

            <div className="max-h-[480px] overflow-y-auto">
              {styleProfiles.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs text-muted-foreground mb-3">
                    No style profiles analyzed yet.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setAnalyzeOpen(true)}>
                    <Sparkles className="w-3.5 h-3.5" />
                    Analyze a channel
                  </Button>
                </div>
              ) : (
                styleProfiles.map((p, i) => {
                  const colors = firstThreeColors(p.thumbnail_dna);
                  const facePresence = p.thumbnail_dna?.face_presence_pct;
                  const topPillar = Array.isArray(p.content_pillars) && p.content_pillars[0];
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        'px-4 py-3 border-b border-border last:border-b-0 hover:bg-card-hover transition-colors',
                        `stagger-${Math.min(i + 1, 8)} animate-fade-in`,
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {p.channel_name || 'Unknown channel'}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Analyzed {formatRelativeTime(p.analyzed_at)}
                            {p.videos_analyzed ? ` \u00B7 ${p.videos_analyzed} videos` : ''}
                          </div>
                        </div>
                        {p.applied_to_project && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium border bg-success-bg text-success border-success-border flex-shrink-0">
                            Applied
                          </span>
                        )}
                      </div>

                      {/* Colors */}
                      {colors.length > 0 && (
                        <div className="flex items-center gap-1.5 mb-2">
                          {colors.map((c, j) => (
                            <div
                              key={j}
                              className="w-5 h-5 rounded border border-border shadow-sm"
                              style={{ backgroundColor: c }}
                              title={c}
                            />
                          ))}
                          {facePresence != null && facePresence > 60 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border bg-info-bg text-info border-info-border ml-1">
                              <Smile className="w-2.5 h-2.5" />
                              Face-forward
                            </span>
                          )}
                        </div>
                      )}

                      {topPillar && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2">
                          <span className="font-medium text-foreground">{topPillar.pillar_name}</span>
                          {topPillar.description ? ` \u00B7 ${topPillar.description}` : ''}
                        </p>
                      )}

                      <button
                        onClick={() => setSelectedProfile(p)}
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary-hover font-medium cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        View details
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Topic Intelligence Scores Table */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            Top Topic Intelligence Scores
          </h2>
          <Link
            to={`/project/${projectId}/topics`}
            className="text-[11px] font-medium text-primary hover:text-primary-hover flex items-center gap-1"
          >
            Open Gate 1
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {topTopics.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              No topics scored yet.
            </p>
            <Link to={`/project/${projectId}/topics`}>
              <Button variant="outline" size="sm">
                Generate topics first
              </Button>
            </Link>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-border bg-card-hover/40">
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-10">#</th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Title</th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-28">Playlist</th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-24">Outlier</th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-20">SEO</th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-20">Combined</th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-32">Classification</th>
                    <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-28">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {topTopics.map((topic, i) => (
                    <tr
                      key={topic.id}
                      className={cn(
                        'border-b border-border last:border-b-0 hover:bg-card-hover transition-colors',
                        `stagger-${Math.min(i + 1, 8)} animate-fade-in`,
                      )}
                    >
                      <td className="px-4 py-3 text-xs font-bold text-muted-foreground tabular-nums font-mono">
                        {topic.topic_number}
                      </td>
                      <td className="px-4 py-3 font-medium max-w-[320px]">
                        <span className="inline-flex items-center gap-1.5">
                          {i < 3 && (
                            <span className="text-accent" title="Top 3">{'\u2605'}</span>
                          )}
                          <span className="truncate block">
                            {topic.seo_title || topic.original_title}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {topic.playlist_angle || '\u2014'}
                      </td>
                      <td className="px-4 py-3"><OutlierBadge topic={topic} /></td>
                      <td className="px-4 py-3"><SEOBadge topic={topic} /></td>
                      <td className="px-4 py-3"><CombinedScoreBadge topic={topic} /></td>
                      <td className="px-4 py-3">
                        {topic.seo_classification ? (
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium border capitalize',
                            CLASSIFICATION_STYLES[topic.seo_classification] || 'bg-muted text-muted-foreground border-border',
                          )}>
                            {topic.seo_classification}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{'\u2014'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/project/${projectId}/topics`}
                          className="text-xs text-primary hover:text-primary-hover font-medium"
                        >
                          Open in Gate 1
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Competitor Intelligence Summary */}
      {weeklyIntel && weeklyIntel.summary_markdown && (
        <div className="mb-6 bg-card border border-border rounded-xl p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold">Weekly Competitor Intelligence</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Week of {new Date(weeklyIntel.week_of).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                {weeklyIntel.videos_analyzed
                  ? ` \u00B7 ${weeklyIntel.videos_analyzed} videos analyzed across ${weeklyIntel.channels_analyzed} channels`
                  : ''}
                {weeklyIntel.outlier_breakouts_count
                  ? ` \u00B7 ${weeklyIntel.outlier_breakouts_count} outlier breakouts`
                  : ''}
              </p>
            </div>
          </div>

          {/* Top clusters */}
          {Array.isArray(weeklyIntel.top_topic_clusters) && weeklyIntel.top_topic_clusters.length > 0 && (
            <div className="mb-4">
              <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                Top Clusters
              </h4>
              <div className="flex items-center flex-wrap gap-1.5">
                {weeklyIntel.top_topic_clusters.map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border bg-muted text-foreground border-border"
                  >
                    {c.cluster_name || `Cluster ${i + 1}`}
                    {c.video_count != null && (
                      <span className="text-muted-foreground tabular-nums">{'\u00B7'} {c.video_count}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Emerging patterns */}
          {Array.isArray(weeklyIntel.emerging_patterns) && weeklyIntel.emerging_patterns.length > 0 && (
            <div className="mb-4">
              <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                Emerging Patterns
              </h4>
              <ul className="space-y-1.5">
                {weeklyIntel.emerging_patterns.map((p, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-accent flex-shrink-0 mt-0.5">{'\u2022'}</span>
                    <div>
                      <span className="font-medium">{p.pattern || 'Pattern'}</span>
                      {p.evidence && (
                        <span className="text-muted-foreground"> \u2014 {p.evidence}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary markdown */}
          <div className="pt-2">
            {renderMarkdown(weeklyIntel.summary_markdown)}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddCompetitorModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={(vars) => addChannelMutation.mutateAsync(vars)}
        isPending={addChannelMutation.isPending}
      />
      <AnalyzeStyleModal
        isOpen={analyzeOpen}
        onClose={() => setAnalyzeOpen(false)}
        onSubmit={(vars) => analyzeStyleMutation.mutateAsync(vars)}
        isPending={analyzeStyleMutation.isPending}
      />
      <StyleProfileDetailModal
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />
    </div>
  );
}
