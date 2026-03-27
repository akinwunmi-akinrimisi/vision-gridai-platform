import { useState, useCallback } from 'react';
import {
  Share2,
  Scissors,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSocialPosts, usePostClip, useAutoScheduleAll } from '../hooks/useSocialPosts';

import PageHeader from '../components/shared/PageHeader';
import KPICard from '../components/shared/KPICard';
import EmptyState from '../components/shared/EmptyState';
import PostTable from '../components/social/PostTable';
import PostingHistory from '../components/social/PostingHistory';
import ScheduleModal from '../components/social/ScheduleModal';
import ClipPreviewModal from '../components/social/ClipPreviewModal';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function SocialPublisher() {
  const { data, isLoading, error } = useSocialPosts();
  const postClip = usePostClip();
  const autoScheduleAll = useAutoScheduleAll();

  const [scheduleClip, setScheduleClip] = useState(null);
  const [previewClip, setPreviewClip] = useState(null);
  const [staggerEnabled, setStaggerEnabled] = useState(true);

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
      const result = await autoScheduleAll.mutateAsync({ clip_ids: clipIds, stagger: staggerEnabled });
      if (result?.success === false) {
        toast.error(result.error || 'Auto-schedule failed');
      } else {
        toast.success(`Scheduled ${clipIds.length} clips across platforms`);
      }
    } catch (err) {
      toast.error(err.message || 'Auto-schedule failed');
    }
  }, [readyClips, autoScheduleAll, staggerEnabled]);

  // -- Loading state ----------------------------------------------------------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Social Publisher" subtitle="Schedule and post shorts across TikTok, Instagram, and YouTube." />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[88px] bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-48 bg-card border border-border rounded-lg animate-pulse" />
      </div>
    );
  }

  // -- Error state ------------------------------------------------------------

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Social Publisher" subtitle="Schedule and post shorts across TikTok, Instagram, and YouTube." />
        <div className="bg-danger-bg border border-danger-border rounded-lg p-8 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-danger" />
          <p className="text-sm font-medium text-danger">Failed to load social posts</p>
          <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  // -- Computed stats ---------------------------------------------------------

  const tiktokPosted = postedClips.filter((c) => c.tiktok_published_at).length;
  const instagramPosted = postedClips.filter((c) => c.instagram_published_at).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Social Publisher" subtitle="Schedule and post shorts across TikTok, Instagram, and YouTube." />

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Ready to Post" value={readyClips.length} icon={Calendar} />
        <KPICard label="Posted" value={postedClips.length} icon={Share2} />
        <KPICard label="TikTok Posts" value={tiktokPosted} />
        <KPICard label="Instagram Posts" value={instagramPosted} />
      </div>

      {/* Tabs: Ready to Post / Posting History */}
      <Tabs defaultValue="ready">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="ready" className="gap-1.5">
              Ready to Post
              {readyClips.length > 0 && (
                <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {readyClips.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              Posting History
              {postedClips.length > 0 && (
                <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {postedClips.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Ready to Post */}
        <TabsContent value="ready" className="mt-4 space-y-4">
          {readyClips.length === 0 ? (
            <EmptyState
              icon={Scissors}
              title="No clips ready to post"
              description="Create shorts first in the Shorts Creator, then schedule posts here."
            />
          ) : (
            <>
              {/* Bulk actions bar */}
              <div className="flex items-center gap-4 flex-wrap bg-card border border-border rounded-lg p-3">
                <Button
                  onClick={handleAutoSchedule}
                  disabled={autoScheduleAll.isPending || readyClips.length === 0}
                  size="sm"
                >
                  {autoScheduleAll.isPending ? (
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
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (readyClips.length > 0) setScheduleClip(readyClips[0]);
                  }}
                >
                  Post All Now
                </Button>

                <div className="flex items-center gap-2 ml-auto">
                  <Switch
                    checked={staggerEnabled}
                    onCheckedChange={setStaggerEnabled}
                    id="stagger-toggle"
                  />
                  <label htmlFor="stagger-toggle" className="text-xs text-muted-foreground cursor-pointer select-none">
                    Cross-platform stagger
                  </label>
                </div>

                <span className="text-xs text-muted-foreground">
                  {readyClips.length} clip{readyClips.length !== 1 ? 's' : ''} ready
                </span>
              </div>

              {/* Post table */}
              <PostTable
                clips={readyClips}
                onSchedule={setScheduleClip}
                onPreview={setPreviewClip}
                onEditCaption={setScheduleClip}
              />
            </>
          )}
        </TabsContent>

        {/* Posting History */}
        <TabsContent value="history" className="mt-4">
          <PostingHistory postedClips={postedClips} />
        </TabsContent>
      </Tabs>

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
