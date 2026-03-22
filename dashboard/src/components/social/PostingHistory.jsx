import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  Inbox,
} from 'lucide-react';

// ── Platform labels + colors ─────────────────────────

const PLATFORM_CONFIG = {
  tiktok: { label: 'TikTok', color: 'badge-pink', badgeCls: 'bg-pink-50 text-pink-700 dark:bg-pink-500/[0.12] dark:text-pink-400 ring-1 ring-inset ring-pink-600/10 dark:ring-pink-400/20' },
  instagram: { label: 'Instagram', color: 'badge-fuchsia', badgeCls: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/[0.12] dark:text-fuchsia-400 ring-1 ring-inset ring-fuchsia-600/10 dark:ring-fuchsia-400/20' },
  youtube_shorts: { label: 'YT Shorts', color: 'badge-red', badgeCls: 'bg-red-50 text-red-700 dark:bg-red-500/[0.12] dark:text-red-400 ring-1 ring-inset ring-red-600/10 dark:ring-red-400/20' },
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

  function SortHeader({ field, children }) {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 text-2xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors duration-200 cursor-pointer"
      >
        {children}
        {isActive && (
          sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        )}
      </button>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <Inbox className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          No posts yet
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Published clips will appear here with engagement metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-100 dark:border-white/[0.06]">
              <th className="text-left px-4 py-3">
                <SortHeader field="clipTitle">Clip</SortHeader>
              </th>
              <th className="text-left px-4 py-3">
                <SortHeader field="platform">Platform</SortHeader>
              </th>
              <th className="text-left px-4 py-3">
                <SortHeader field="postedAt">Posted</SortHeader>
              </th>
              <th className="text-right px-4 py-3">
                <SortHeader field="views">Views</SortHeader>
              </th>
              <th className="text-right px-4 py-3">
                <SortHeader field="likes">Likes</SortHeader>
              </th>
              <th className="text-right px-4 py-3">
                <SortHeader field="comments">Comments</SortHeader>
              </th>
              <th className="text-right px-4 py-3">
                <SortHeader field="shares">Shares</SortHeader>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const platformCfg = PLATFORM_CONFIG[row.platform];
              return (
                <tr
                  key={row.id}
                  className="border-b border-slate-50 dark:border-white/[0.03] last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors duration-150"
                >
                  <td className="px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                        {row.clipTitle}
                      </p>
                      <p className="text-2xs text-slate-400 dark:text-slate-500 truncate max-w-[200px]">
                        {row.projectName}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge text-2xs ${platformCfg?.badgeCls || 'badge-blue'}`}>
                      {platformCfg?.label || row.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {formatDate(row.postedAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-slate-900 dark:text-white tabular-nums flex items-center justify-end gap-1">
                      <Eye className="w-3 h-3 text-slate-400" />
                      {formatNumber(row.views)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-slate-900 dark:text-white tabular-nums flex items-center justify-end gap-1">
                      <Heart className="w-3 h-3 text-red-400" />
                      {formatNumber(row.likes)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-slate-900 dark:text-white tabular-nums flex items-center justify-end gap-1">
                      <MessageCircle className="w-3 h-3 text-blue-400" />
                      {formatNumber(row.comments)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-slate-900 dark:text-white tabular-nums flex items-center justify-end gap-1">
                      <Share2 className="w-3 h-3 text-emerald-400" />
                      {formatNumber(row.shares)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
