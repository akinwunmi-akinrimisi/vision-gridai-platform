import { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router';
import {
  MessageSquare,
  ThumbsUp,
  Zap,
  MailQuestion,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { useComments, useHighIntentComments, useReplyToComment } from '../hooks/useComments';
import { useEngagementStats } from '../hooks/useEngagement';
import { webhookCall } from '../lib/api';

import PageHeader from '../components/shared/PageHeader';
import KPICard from '../components/shared/KPICard';
import EmptyState from '../components/shared/EmptyState';
import ConversionSignals from '../components/engagement/ConversionSignals';
import CommentFeed from '../components/engagement/CommentFeed';
import SentimentChart from '../components/engagement/SentimentChart';

import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EngagementHub() {
  const { id: projectId } = useParams();

  // -- Data hooks -------------------------------------------------------------

  const [filters, setFilters] = useState({});
  const { data: comments, isLoading: commentsLoading, error: commentsError } = useComments(projectId, filters);
  const { data: highIntent, isLoading: highIntentLoading } = useHighIntentComments(projectId);
  const { data: stats, isLoading: statsLoading } = useEngagementStats(projectId);
  const replyMutation = useReplyToComment(projectId);

  // -- Sync state -------------------------------------------------------------

  const [syncing, setSyncing] = useState(false);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await webhookCall('comments/sync', { project_id: projectId }, { timeoutMs: 60_000 });
      if (result?.success === false) {
        toast.error(result.error || 'Sync failed');
      } else {
        toast.success('Comments synced successfully');
      }
    } catch (err) {
      toast.error(err.message || 'Sync request failed');
    } finally {
      setSyncing(false);
    }
  }, [projectId]);

  // -- Reply handler ----------------------------------------------------------

  const handleReply = useCallback(
    async ({ commentId, replyText }) => {
      await replyMutation.mutateAsync({ commentId, replyText });
    },
    [replyMutation]
  );

  // -- Filter change handler --------------------------------------------------

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  // -- Loading state ----------------------------------------------------------

  const isLoading = commentsLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Engagement Hub"
          subtitle="Monitor comments, sentiment, and conversion signals across platforms."
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[88px] bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-48 bg-card border border-border rounded-lg animate-pulse" />
        <div className="h-64 bg-card border border-border rounded-lg animate-pulse" />
      </div>
    );
  }

  // -- Error state ------------------------------------------------------------

  if (commentsError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Engagement Hub"
          subtitle="Monitor comments, sentiment, and conversion signals across platforms."
        />
        <div className="bg-danger-bg border border-danger-border rounded-lg p-8 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-danger" />
          <p className="text-sm font-medium text-danger">Failed to load comments</p>
          <p className="text-xs text-muted-foreground mt-1">{commentsError.message}</p>
        </div>
      </div>
    );
  }

  // -- Derived data -----------------------------------------------------------

  const engagementStats = stats || {
    total: 0,
    positive: 0,
    negative: 0,
    neutral: 0,
    unanalyzed: 0,
    highIntent: 0,
    unreplied: 0,
    positivePercent: 0,
    byPlatform: {},
  };

  const highIntentComments = highIntent || [];
  const allComments = comments || [];

  // -- Empty state (no comments at all) ---------------------------------------

  if (engagementStats.total === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Engagement Hub"
          subtitle="Monitor comments, sentiment, and conversion signals across platforms."
        >
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="gap-1.5"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync Comments
          </Button>
        </PageHeader>
        <EmptyState
          icon={MessageSquare}
          title="No comments yet"
          description="Click 'Sync Comments' to pull comments from YouTube, TikTok, and Instagram. Sentiment and intent analysis runs automatically."
          action={
            <Button onClick={handleSync} disabled={syncing} className="gap-1.5">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sync Comments
            </Button>
          }
        />
      </div>
    );
  }

  // -- Main render ------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header with sync button */}
      <PageHeader
        title="Engagement Hub"
        subtitle="Monitor comments, sentiment, and conversion signals across platforms."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          className="gap-1.5"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sync Comments
        </Button>
      </PageHeader>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard
          label="Total Comments"
          value={engagementStats.total.toLocaleString()}
          icon={MessageSquare}
        />
        <KPICard
          label="Positive %"
          value={`${engagementStats.positivePercent}%`}
          icon={ThumbsUp}
        />
        <KPICard
          label="High Intent"
          value={engagementStats.highIntent}
          icon={Zap}
        />
        <KPICard
          label="Unreplied"
          value={engagementStats.unreplied}
          icon={MailQuestion}
        />
      </div>

      {/* High-Intent Alerts */}
      <ConversionSignals
        comments={highIntentComments}
        onReply={handleReply}
        replyMutation={replyMutation}
      />

      {/* Main content: Comment Feed + Sentiment Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Comment Feed (takes 2/3 on large screens) */}
        <div className="lg:col-span-2">
          <CommentFeed
            comments={allComments}
            onReply={handleReply}
            replyMutation={replyMutation}
            onFiltersChange={handleFiltersChange}
          />
        </div>

        {/* Sentiment Chart (takes 1/3) */}
        <div>
          <SentimentChart
            positive={engagementStats.positive}
            negative={engagementStats.negative}
            neutral={engagementStats.neutral}
            unanalyzed={engagementStats.unanalyzed}
            total={engagementStats.total}
          />

          {/* Platform breakdown mini-section */}
          <div className="bg-card border border-border rounded-xl p-4 mt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              By Platform
            </h3>
            <div className="space-y-2.5">
              {[
                { key: 'youtube', label: 'YouTube', color: 'bg-danger' },
                { key: 'tiktok', label: 'TikTok', color: 'bg-foreground' },
                { key: 'instagram', label: 'Instagram', color: 'bg-info' },
              ].map(({ key, label, color }) => {
                const count = engagementStats.byPlatform?.[key] || 0;
                const pct = engagementStats.total > 0 ? (count / engagementStats.total) * 100 : 0;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${color}`} />
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </div>
                      <span className="text-xs font-medium tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
