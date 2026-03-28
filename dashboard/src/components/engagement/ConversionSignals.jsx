import { useState, useCallback } from 'react';
import {
  Zap,
  MessageSquare,
  Reply,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

import HeroCard from '../shared/HeroCard';
import ReplyComposer from './ReplyComposer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// -- Platform icons (text-based for simplicity) --------------------------------

const PLATFORM_BADGE = {
  youtube: { label: 'YouTube', className: 'bg-danger/10 text-danger border-danger/20' },
  tiktok: { label: 'TikTok', className: 'bg-foreground/10 text-foreground border-foreground/20' },
  instagram: { label: 'Instagram', className: 'bg-info/10 text-info border-info/20' },
};

function PlatformBadge({ platform }) {
  const cfg = PLATFORM_BADGE[platform] || { label: platform, className: 'bg-muted text-muted-foreground' };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// -- Intent signal badges ------------------------------------------------------

function IntentBadges({ signals }) {
  if (!signals || signals.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {signals.map((signal, i) => (
        <span
          key={i}
          className="inline-flex items-center px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20 text-[10px] font-medium"
        >
          {signal}
        </span>
      ))}
    </div>
  );
}

// -- Single high-intent comment card -------------------------------------------

function HighIntentCard({ comment, onReply, isReplying, replyMutation }) {
  const [showComposer, setShowComposer] = useState(false);
  const topicTitle = comment.topics?.seo_title || 'Unknown topic';
  const intentPercent = Math.round((comment.intent_score || 0) * 100);

  // Parse intent signals from the comment analysis
  const signals = comment.intent_signals
    ? (typeof comment.intent_signals === 'string'
        ? JSON.parse(comment.intent_signals)
        : comment.intent_signals)
    : [];

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
      {/* Header: platform, author, intent score */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <PlatformBadge platform={comment.platform} />
          <span className="text-xs font-medium text-foreground truncate">
            {comment.author_name || 'Anonymous'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Zap className="w-3 h-3 text-warning" />
          <span className="text-xs font-bold text-warning tabular-nums">{intentPercent}%</span>
        </div>
      </div>

      {/* Comment text */}
      <p className="text-sm text-foreground/90 mt-2 leading-relaxed line-clamp-3">
        {comment.comment_text}
      </p>

      {/* Intent signals */}
      <IntentBadges signals={signals} />

      {/* Topic reference */}
      <p className="text-[10px] text-muted-foreground mt-2 truncate">
        on: {topicTitle}
      </p>

      {/* Actions */}
      {comment.replied ? (
        <div className="flex items-center gap-1.5 mt-2 text-success">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Replied</span>
        </div>
      ) : showComposer ? (
        <ReplyComposer
          onSend={handleSend}
          isSending={replyMutation?.isPending}
          onCancel={() => setShowComposer(false)}
        />
      ) : (
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowComposer(true)}
            className="text-xs gap-1.5 h-7"
          >
            <Reply className="w-3 h-3" />
            Reply
          </Button>
          {comment.external_url && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-xs gap-1 h-7"
            >
              <a href={comment.external_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3" />
                View
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// -- Main component ------------------------------------------------------------

/**
 * Shows high-intent comments that need attention — conversion signals.
 * Wrapped in a HeroCard with count badge.
 *
 * @param {{ comments: Array, onReply: Function, replyMutation: object }} props
 */
export default function ConversionSignals({ comments = [], onReply, replyMutation }) {
  if (comments.length === 0) {
    return (
      <HeroCard>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-warning" />
          <h3 className="text-sm font-semibold">High-Intent Comments</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              No high-intent comments detected yet.
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Comments with purchase intent, questions, or requests will appear here.
            </p>
          </div>
        </div>
      </HeroCard>
    );
  }

  return (
    <HeroCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-warning" />
          <h3 className="text-sm font-semibold">High-Intent Comments</h3>
        </div>
        <Badge variant="secondary" className="text-[10px] tabular-nums">
          {comments.length} pending
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {comments.map((comment) => (
          <HighIntentCard
            key={comment.id}
            comment={comment}
            onReply={onReply}
            replyMutation={replyMutation}
          />
        ))}
      </div>
    </HeroCard>
  );
}
