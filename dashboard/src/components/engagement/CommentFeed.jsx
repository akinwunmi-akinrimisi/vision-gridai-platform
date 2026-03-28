import { useState, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Zap,
  Reply,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

import ReplyComposer from './ReplyComposer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// -- Platform config -----------------------------------------------------------

const PLATFORM_CONFIG = {
  youtube: { label: 'YouTube', dotColor: 'bg-danger' },
  tiktok: { label: 'TikTok', dotColor: 'bg-foreground' },
  instagram: { label: 'Instagram', dotColor: 'bg-info' },
};

const SENTIMENT_CONFIG = {
  positive: { icon: ThumbsUp, label: 'Positive', className: 'text-success' },
  negative: { icon: ThumbsDown, label: 'Negative', className: 'text-danger' },
  neutral: { icon: Minus, label: 'Neutral', className: 'text-muted-foreground' },
};

// -- Filter bar ----------------------------------------------------------------

const PLATFORM_OPTIONS = [
  { value: '', label: 'All Platforms' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
];

const SENTIMENT_OPTIONS = [
  { value: '', label: 'All Sentiment' },
  { value: 'positive', label: 'Positive' },
  { value: 'negative', label: 'Negative' },
  { value: 'neutral', label: 'Neutral' },
];

function FilterBar({ platformFilter, setPlatformFilter, sentimentFilter, setSentimentFilter }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Filter className="w-3.5 h-3.5 text-muted-foreground" />

      {/* Platform filter */}
      <div className="flex items-center bg-muted rounded-md p-0.5">
        {PLATFORM_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPlatformFilter(opt.value)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              platformFilter === opt.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Sentiment filter */}
      <div className="flex items-center bg-muted rounded-md p-0.5">
        {SENTIMENT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSentimentFilter(opt.value)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              sentimentFilter === opt.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// -- Relative time helper ------------------------------------------------------

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// -- Single comment row --------------------------------------------------------

function CommentRow({ comment, onReply, replyMutation }) {
  const [showComposer, setShowComposer] = useState(false);

  const platformCfg = PLATFORM_CONFIG[comment.platform] || { label: comment.platform, dotColor: 'bg-muted-foreground' };
  const sentimentCfg = SENTIMENT_CONFIG[comment.sentiment];
  const SentimentIcon = sentimentCfg?.icon;
  const topicTitle = comment.topics?.seo_title || '';
  const intentPercent = comment.intent_score != null ? Math.round(comment.intent_score * 100) : null;

  const handleSend = useCallback(
    async (text) => {
      try {
        await onReply({ commentId: comment.id, replyText: text });
        setShowComposer(false);
        toast.success('Reply saved');
      } catch (err) {
        toast.error(err.message || 'Failed to save reply');
      }
    },
    [comment.id, onReply]
  );

  return (
    <div className="bg-card border border-border rounded-xl p-3 transition-colors hover:border-border-hover">
      {/* Row 1: Platform, author, sentiment, time */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Platform dot */}
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${platformCfg.dotColor}`} />
          <span className="text-xs font-medium text-foreground truncate">
            {comment.author_name || 'Anonymous'}
          </span>
          {SentimentIcon && (
            <SentimentIcon className={`w-3 h-3 flex-shrink-0 ${sentimentCfg.className}`} />
          )}
          {intentPercent != null && intentPercent >= 70 && (
            <span className="flex items-center gap-0.5 flex-shrink-0">
              <Zap className="w-3 h-3 text-warning" />
              <span className="text-[10px] font-bold text-warning tabular-nums">{intentPercent}%</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-shrink-0">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(comment.created_at)}
        </div>
      </div>

      {/* Row 2: Comment text */}
      <p className="text-sm text-foreground/90 mt-1.5 leading-relaxed">
        {comment.comment_text}
      </p>

      {/* Row 3: Topic + actions */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-[10px] text-muted-foreground truncate max-w-[60%]">
          {topicTitle && `on: ${topicTitle}`}
        </p>
        <div className="flex items-center gap-1.5">
          {comment.replied ? (
            <span className="flex items-center gap-1 text-success text-[10px] font-medium">
              <CheckCircle2 className="w-3 h-3" />
              Replied
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComposer(!showComposer)}
              className="text-[10px] gap-1 h-6 px-2"
            >
              <Reply className="w-3 h-3" />
              Reply
            </Button>
          )}
          {comment.external_url && (
            <Button variant="ghost" size="sm" asChild className="h-6 px-1.5">
              <a href={comment.external_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Reply composer (inline) */}
      {showComposer && (
        <ReplyComposer
          onSend={handleSend}
          isSending={replyMutation?.isPending}
          onCancel={() => setShowComposer(false)}
        />
      )}
    </div>
  );
}

// -- Main component ------------------------------------------------------------

/**
 * Scrollable, filterable comment feed.
 *
 * @param {{ comments: Array, onReply: Function, replyMutation: object, onFiltersChange: Function }} props
 */
export default function CommentFeed({ comments = [], onReply, replyMutation, onFiltersChange }) {
  const [platformFilter, setPlatformFilter] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('');

  // Notify parent of filter changes for query refetching
  const handlePlatformChange = useCallback(
    (val) => {
      setPlatformFilter(val);
      onFiltersChange?.({ platform: val || undefined, sentiment: sentimentFilter || undefined });
    },
    [sentimentFilter, onFiltersChange]
  );

  const handleSentimentChange = useCallback(
    (val) => {
      setSentimentFilter(val);
      onFiltersChange?.({ platform: platformFilter || undefined, sentiment: val || undefined });
    },
    [platformFilter, onFiltersChange]
  );

  // Client-side filtering (comments are already fetched)
  const filtered = useMemo(() => {
    let result = comments;
    if (platformFilter) result = result.filter((c) => c.platform === platformFilter);
    if (sentimentFilter) result = result.filter((c) => c.sentiment === sentimentFilter);
    return result;
  }, [comments, platformFilter, sentimentFilter]);

  return (
    <div className="space-y-3">
      {/* Header + filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Comment Feed</h3>
          <Badge variant="secondary" className="text-[10px] tabular-nums">
            {filtered.length}
          </Badge>
        </div>
        <FilterBar
          platformFilter={platformFilter}
          setPlatformFilter={handlePlatformChange}
          sentimentFilter={sentimentFilter}
          setSentimentFilter={handleSentimentChange}
        />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">
            {comments.length === 0
              ? 'No comments synced yet. Click "Sync Comments" to pull from platforms.'
              : 'No comments match the current filters.'}
          </p>
        </div>
      )}

      {/* Comment list */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {filtered.map((comment) => (
          <CommentRow
            key={comment.id}
            comment={comment}
            onReply={onReply}
            replyMutation={replyMutation}
          />
        ))}
      </div>
    </div>
  );
}
