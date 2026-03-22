import { useState, useMemo, useCallback } from 'react';
import {
  Share2,
  Scissors,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Pencil,
  Eye,
  Loader2,
  Inbox,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSocialPosts, usePostClip, useAutoScheduleAll } from '../hooks/useSocialPosts';
import ScheduleModal from '../components/social/ScheduleModal';
import ClipPreviewModal from '../components/social/ClipPreviewModal';
import PostingHistory from '../components/social/PostingHistory';
import SkeletonCard from '../components/ui/SkeletonCard';

// ── Status rendering helpers ─────────────────────────

const PLATFORM_STATUS = {
  pending: { label: 'Not scheduled', icon: Clock, cls: 'text-slate-400 dark:text-slate-500' },
  scheduled: { label: 'Scheduled', icon: Calendar, cls: 'text-amber-500 dark:text-amber-400' },
  posting: { label: 'Posting...', icon: Loader2, cls: 'text-blue-500 dark:text-blue-400' },
  published: { label: 'Posted', icon: CheckCircle2, cls: 'text-emerald-500 dark:text-emerald-400' },
  failed: { label: 'Failed', icon: XCircle, cls: 'text-red-500 dark:text-red-400' },
};

function PlatformStatusCell({ status, scheduledAt, publishedAt }) {
  const resolvedStatus = publishedAt ? 'published' : status || 'pending';
  const cfg = PLATFORM_STATUS[resolvedStatus] || PLATFORM_STATUS.pending;
  const Icon = cfg.icon;

  const isAnimated = resolvedStatus === 'posting';

  function formatRelative(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.abs(Math.floor(diffMs / 60_000));

    if (diffMs > 0) {
      // Past
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      // Future
      if (diffMin < 60) return `in ${diffMin}m`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `in ${diffHr}h`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs ${cfg.cls}`}>
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isAnimated ? 'animate-spin' : ''}`} strokeWidth={1.8} />
      <span className="whitespace-nowrap">
        {resolvedStatus === 'published' && publishedAt
          ? formatRelative(publishedAt)
          : resolvedStatus === 'scheduled' && scheduledAt
            ? formatRelative(scheduledAt)
            : cfg.label}
      </span>
    </div>
  );
}

// ── Main page ────────────────────────────────────────

export default function SocialPublisher() {
  const { data, isLoading, error } = useSocialPosts();
  const postClip = usePostClip();
  const autoScheduleAll = useAutoScheduleAll();

  const [scheduleClip, setScheduleClip] = useState(null);
  const [previewClip, setPreviewClip] = useState(null);
  const [activeTab, setActiveTab] = useState('ready'); // 'ready' | 'history'

  const readyClips = data?.readyClips || [];
  const postedClips = data?.postedClips || [];

  const handlePostClip = useCallback(async (payload) => {
    try {
      const result = await postClip.mutateAsync(payload);
      if (result?.success === false) {
        toast.error(result.error || 'Failed to schedule post');
      } else {
        toast.success('Post scheduled successfully');
      }
      setScheduleClip(null);
    } catch (err) {
      toast.error(err.message || 'Failed to schedule post');
    }
  }, [postClip]);

  const handleAutoSchedule = useCallback(async () => {
    const clipIds = readyClips.map((c) => c.id);
    if (clipIds.length === 0) return;

    try {
      const result = await autoScheduleAll.mutateAsync({ clip_ids: clipIds, stagger: true });
      if (result?.success === false) {
        toast.error(result.error || 'Auto-schedule failed');
      } else {
        toast.success(`Scheduled ${clipIds.length} clips across platforms`);
      }
    } catch (err) {
      toast.error(err.message || 'Auto-schedule failed');
    }
  }, [readyClips, autoScheduleAll]);

  // ── Loading state ────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1 className="page-title flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Share2 className="w-5 h-5 text-white" />
            </span>
            Social Media Publisher
          </h1>
          <p className="page-subtitle">Schedule and post shorts across TikTok, Instagram, and YouTube.</p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────

  if (error) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1 className="page-title flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Share2 className="w-5 h-5 text-white" />
            </span>
            Social Media Publisher
          </h1>
        </div>
        <div className="glass-card p-8 text-center">
          <XCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
          <p className="text-sm font-medium text-red-500 dark:text-red-400">
            Failed to load social posts
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Share2 className="w-5 h-5 text-white" />
          </span>
          Social Media Publisher
        </h1>
        <p className="page-subtitle">Schedule and post shorts across TikTok, Instagram, and YouTube.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Ready to Post" value={readyClips.length} color="from-amber-500 to-orange-600" />
        <StatCard label="Posted" value={postedClips.length} color="from-emerald-500 to-teal-600" />
        <StatCard
          label="TikTok Posts"
          value={postedClips.filter((c) => c.tiktok_published_at).length}
          color="from-pink-500 to-rose-600"
        />
        <StatCard
          label="Instagram Posts"
          value={postedClips.filter((c) => c.instagram_published_at).length}
          color="from-fuchsia-500 to-purple-600"
        />
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 dark:bg-white/[0.03] w-fit">
        <TabButton active={activeTab === 'ready'} onClick={() => setActiveTab('ready')} count={readyClips.length}>
          Ready to Post
        </TabButton>
        <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} count={postedClips.length}>
          Posting History
        </TabButton>
      </div>

      {/* Tab content */}
      {activeTab === 'ready' ? (
        <ReadyToPostSection
          clips={readyClips}
          onSchedule={setScheduleClip}
          onPreview={setPreviewClip}
          onAutoSchedule={handleAutoSchedule}
          isAutoScheduling={autoScheduleAll.isPending}
        />
      ) : (
        <PostingHistory postedClips={postedClips} />
      )}

      {/* Modals */}
      <ScheduleModal
        isOpen={!!scheduleClip}
        onClose={() => setScheduleClip(null)}
        clip={scheduleClip}
        onSubmit={handlePostClip}
        isSubmitting={postClip.isPending}
      />

      <ClipPreviewModal
        isOpen={!!previewClip}
        onClose={() => setPreviewClip(null)}
        clip={previewClip}
      />
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────

function StatCard({ label, value, color }) {
  return (
    <div className="glass-card p-4">
      <p className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
        {value}
      </p>
      <div className={`mt-2 h-1 rounded-full bg-gradient-to-r ${color} opacity-60`} />
    </div>
  );
}

// ── Tab Button ───────────────────────────────────────

function TabButton({ active, onClick, children, count }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
        ${active
          ? 'bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}
      `}
    >
      {children}
      {count > 0 && (
        <span className={`
          min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center tabular-nums
          ${active
            ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-400'
            : 'bg-slate-200/60 dark:bg-white/[0.06] text-slate-400 dark:text-slate-500'}
        `}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── Ready to Post Section ────────────────────────────

function ReadyToPostSection({ clips, onSchedule, onPreview, onAutoSchedule, isAutoScheduling }) {
  if (clips.length === 0) {
    return (
      <div className="glass-card p-10 text-center">
        <Scissors className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
          No clips ready to post
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Create shorts first in the Shorts Creator, then schedule posts here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onAutoSchedule}
          className="btn-primary btn-sm"
          disabled={isAutoScheduling || clips.length === 0}
        >
          {isAutoScheduling ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Scheduling...
            </>
          ) : (
            <>
              <Calendar className="w-3.5 h-3.5" />
              Auto-Schedule All
            </>
          )}
        </button>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {clips.length} clip{clips.length !== 1 ? 's' : ''} ready
        </span>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                <th className="text-left px-4 py-3">
                  <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Clip
                  </span>
                </th>
                <th className="text-left px-4 py-3">
                  <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Project
                  </span>
                </th>
                <th className="text-center px-4 py-3">
                  <span className="text-2xs font-semibold text-pink-400 dark:text-pink-400 uppercase tracking-widest">
                    TikTok
                  </span>
                </th>
                <th className="text-center px-4 py-3">
                  <span className="text-2xs font-semibold text-fuchsia-400 dark:text-fuchsia-400 uppercase tracking-widest">
                    Instagram
                  </span>
                </th>
                <th className="text-center px-4 py-3">
                  <span className="text-2xs font-semibold text-red-400 dark:text-red-400 uppercase tracking-widest">
                    YT Shorts
                  </span>
                </th>
                <th className="text-right px-4 py-3">
                  <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {clips.map((clip) => (
                <tr
                  key={clip.id}
                  className="border-b border-slate-50 dark:border-white/[0.03] last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors duration-150"
                >
                  {/* Clip title */}
                  <td className="px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                        {clip.clip_title || `Clip #${clip.clip_number || '?'}`}
                      </p>
                      <p className="text-2xs text-slate-400 dark:text-slate-500 truncate max-w-[200px]">
                        {clip.topics?.seo_title || ''}
                      </p>
                    </div>
                  </td>

                  {/* Project */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[120px] block">
                      {clip.topics?.projects?.name || '--'}
                    </span>
                  </td>

                  {/* TikTok status */}
                  <td className="px-4 py-3 text-center">
                    <PlatformStatusCell
                      status={clip.tiktok_status}
                      scheduledAt={clip.tiktok_scheduled_at}
                      publishedAt={clip.tiktok_published_at}
                    />
                  </td>

                  {/* Instagram status */}
                  <td className="px-4 py-3 text-center">
                    <PlatformStatusCell
                      status={clip.instagram_status}
                      scheduledAt={clip.instagram_scheduled_at}
                      publishedAt={clip.instagram_published_at}
                    />
                  </td>

                  {/* YT Shorts status */}
                  <td className="px-4 py-3 text-center">
                    <PlatformStatusCell
                      status={clip.youtube_shorts_status}
                      scheduledAt={clip.youtube_shorts_scheduled_at}
                      publishedAt={clip.youtube_shorts_published_at}
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSchedule(clip)}
                        className="btn-ghost btn-sm btn-icon"
                        title="Schedule"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onPreview(clip)}
                        className="btn-ghost btn-sm btn-icon"
                        title="Preview"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
