import { cn } from '@/lib/utils';
import { Clock, Youtube, Instagram } from 'lucide-react';

// -- Platform styling config ---------------------------------------------------

const PLATFORM_STYLES = {
  youtube: {
    bg: 'bg-danger/15',
    border: 'border-danger/25',
    text: 'text-danger',
    icon: Youtube,
    label: 'YT',
  },
  tiktok: {
    bg: 'bg-foreground/8',
    border: 'border-foreground/15',
    text: 'text-foreground',
    icon: null, // TikTok icon not in lucide — use text initial
    label: 'TT',
  },
  instagram: {
    bg: 'bg-[#E1306C]/15',
    border: 'border-[#E1306C]/25',
    text: 'text-[#E1306C]',
    icon: Instagram,
    label: 'IG',
  },
};

const STATUS_DOT = {
  scheduled: 'bg-warning',
  published: 'bg-success',
  failed: 'bg-danger',
  cancelled: 'bg-muted-foreground',
  pending: 'bg-muted-foreground',
};

// -- Helpers -------------------------------------------------------------------

function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

function getTopicTitle(post) {
  const topic = post.topics;
  if (!topic) return `Post #${post.id?.slice(0, 6) || '?'}`;
  return topic.seo_title || topic.original_title || 'Untitled';
}

// -- Component -----------------------------------------------------------------

/**
 * Small colored block representing a scheduled post inside a calendar day cell.
 * Shows platform indicator, time, truncated title, and status dot.
 */
export default function ContentBlock({ post, onClick, compact = false }) {
  const platform = PLATFORM_STYLES[post.platform] || PLATFORM_STYLES.youtube;
  const PlatformIcon = platform.icon;
  const statusDot = STATUS_DOT[post.status] || STATUS_DOT.pending;
  const title = getTopicTitle(post);
  const time = formatTime(post.scheduled_at);

  return (
    <button
      type="button"
      onClick={() => onClick?.(post)}
      className={cn(
        'w-full text-left rounded-md border px-1.5 py-1 transition-all',
        'hover:brightness-110 hover:shadow-sm cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        platform.bg,
        platform.border,
        compact ? 'py-0.5' : 'py-1'
      )}
    >
      <div className="flex items-center gap-1 min-w-0">
        {/* Status dot */}
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusDot)} />

        {/* Platform icon or initial */}
        {PlatformIcon ? (
          <PlatformIcon className={cn('w-3 h-3 flex-shrink-0', platform.text)} />
        ) : (
          <span className={cn('text-[9px] font-bold flex-shrink-0', platform.text)}>
            {platform.label}
          </span>
        )}

        {/* Time */}
        {time && (
          <span className="text-[9px] text-muted-foreground tabular-nums flex-shrink-0">
            {time}
          </span>
        )}

        {/* Title (truncated) */}
        {!compact && (
          <span className="text-[10px] truncate min-w-0 text-foreground/80">
            {title}
          </span>
        )}
      </div>
    </button>
  );
}
