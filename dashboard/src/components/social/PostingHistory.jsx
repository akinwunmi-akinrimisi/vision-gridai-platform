import { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Inbox,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import EmptyState from '../shared/EmptyState';

// -- Platform labels + badge colors -------------------------------------------

const PLATFORM_CONFIG = {
  tiktok: {
    label: 'TikTok',
    cls: 'bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))] border border-[hsl(var(--chart-4))]/20',
  },
  instagram: {
    label: 'Instagram',
    cls: 'bg-[hsl(var(--chart-5))]/10 text-[hsl(var(--chart-5))] border border-[hsl(var(--chart-5))]/20',
  },
  youtube_shorts: {
    label: 'YT Shorts',
    cls: 'bg-danger-bg text-danger border border-danger-border',
  },
};

function formatNumber(n) {
  if (n === null || n === undefined) return '--';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * Flatten posted clips into platform-specific rows for the history table.
 */
function flattenPostedClips(clips) {
  const rows = [];
  for (const clip of clips) {
    if (clip.tiktok_published_at) {
      rows.push({
        id: `${clip.id}-tiktok`,
        clipId: clip.id,
        platform: 'tiktok',
        clipTitle: clip.clip_title || `Clip #${clip.clip_number || '?'}`,
        topicTitle: clip.topics?.seo_title || '',
        projectName: clip.topics?.projects?.name || '',
        postedAt: clip.tiktok_published_at,
        views: clip.tiktok_views,
        likes: clip.tiktok_likes,
        comments: clip.tiktok_comments,
        shares: clip.tiktok_shares,
        postId: clip.tiktok_post_id,
      });
    }
    if (clip.instagram_published_at) {
      rows.push({
        id: `${clip.id}-instagram`,
        clipId: clip.id,
        platform: 'instagram',
        clipTitle: clip.clip_title || `Clip #${clip.clip_number || '?'}`,
        topicTitle: clip.topics?.seo_title || '',
        projectName: clip.topics?.projects?.name || '',
        postedAt: clip.instagram_published_at,
        views: clip.instagram_views,
        likes: clip.instagram_likes,
        comments: clip.instagram_comments,
        shares: null,
        postId: clip.instagram_post_id,
      });
    }
    if (clip.youtube_shorts_published_at) {
      rows.push({
        id: `${clip.id}-youtube_shorts`,
        clipId: clip.id,
        platform: 'youtube_shorts',
        clipTitle: clip.clip_title || `Clip #${clip.clip_number || '?'}`,
        topicTitle: clip.topics?.seo_title || '',
        projectName: clip.topics?.projects?.name || '',
        postedAt: clip.youtube_shorts_published_at,
        views: clip.youtube_shorts_views,
        likes: clip.youtube_shorts_likes,
        comments: null,
        shares: null,
        postId: clip.youtube_shorts_video_id,
      });
    }
  }
  return rows;
}

export default function PostingHistory({ postedClips }) {
  const [sortField, setSortField] = useState('postedAt');
  const [sortAsc, setSortAsc] = useState(false);

  const rows = useMemo(() => flattenPostedClips(postedClips || []), [postedClips]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'postedAt') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [rows, sortField, sortAsc]);

  function handleSort(field) {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  function SortableHead({ field, children, className }) {
    return (
      <TableHead className={className}>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground font-medium"
          onClick={() => handleSort(field)}
        >
          {children}
          <ArrowUpDown className="w-3 h-3 ml-1" />
        </Button>
      </TableHead>
    );
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No posts yet"
        description="Published clips will appear here with engagement metrics."
      />
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableHead field="clipTitle">Clip</SortableHead>
            <SortableHead field="platform">Platform</SortableHead>
            <SortableHead field="postedAt">Posted</SortableHead>
            <SortableHead field="views" className="text-right">Views</SortableHead>
            <SortableHead field="likes" className="text-right">Likes</SortableHead>
            <SortableHead field="comments" className="text-right">Comments</SortableHead>
            <SortableHead field="shares" className="text-right">Shares</SortableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => {
            const platformCfg = PLATFORM_CONFIG[row.platform];
            return (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate max-w-[200px]">{row.clipTitle}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{row.projectName}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium ${platformCfg?.cls || ''}`}>
                    {platformCfg?.label || row.platform}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(row.postedAt)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-medium tabular-nums inline-flex items-center gap-1">
                    <Eye className="w-3 h-3 text-muted-foreground" />
                    {formatNumber(row.views)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-medium tabular-nums inline-flex items-center gap-1">
                    <Heart className="w-3 h-3 text-danger" />
                    {formatNumber(row.likes)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-medium tabular-nums inline-flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 text-info" />
                    {formatNumber(row.comments)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-medium tabular-nums inline-flex items-center gap-1">
                    <Share2 className="w-3 h-3 text-success" />
                    {formatNumber(row.shares)}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
