import { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router';
import {
  CalendarDays,
  CalendarPlus,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { startOfMonth, isSameMonth, format } from 'date-fns';

import {
  useScheduledPosts,
  useCreateSchedule,
  useUpdateSchedule,
  useCancelSchedule,
} from '../hooks/useSchedule';
import { useTopics } from '../hooks/useTopics';

import PageHeader from '../components/shared/PageHeader';
import KPICard from '../components/shared/KPICard';
import EmptyState from '../components/shared/EmptyState';
import CalendarGrid from '../components/calendar/CalendarGrid';
import ScheduleModal from '../components/calendar/ScheduleModal';

import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countByStatus(posts, status) {
  return posts.filter((p) => p.status === status).length;
}

function countThisMonth(posts, month) {
  return posts.filter((p) => {
    if (!p.scheduled_at) return false;
    return isSameMonth(new Date(p.scheduled_at), month);
  }).length;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContentCalendar() {
  const { id: projectId } = useParams();

  // -- Data hooks ---------------------------------------------------------------

  const { data: posts, isLoading, error } = useScheduledPosts(projectId);
  const { data: topics } = useTopics(projectId);
  const createSchedule = useCreateSchedule(projectId);
  const updateSchedule = useUpdateSchedule(projectId);
  const cancelSchedule = useCancelSchedule(projectId);

  // -- Local state --------------------------------------------------------------

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(null);
  const [editingPost, setEditingPost] = useState(null);

  // -- Derived stats ------------------------------------------------------------

  const scheduledPosts = posts || [];

  const stats = useMemo(() => ({
    total: scheduledPosts.length,
    scheduled: countByStatus(scheduledPosts, 'scheduled'),
    published: countByStatus(scheduledPosts, 'published'),
    failed: countByStatus(scheduledPosts, 'failed'),
    thisMonth: countThisMonth(scheduledPosts, currentMonth),
  }), [scheduledPosts, currentMonth]);

  // -- Handlers -----------------------------------------------------------------

  const handleDayClick = useCallback((day) => {
    setSelectedDate(day);
    setEditingPost(null);
    setModalDate(day);
    setModalOpen(true);
  }, []);

  const handlePostClick = useCallback((post) => {
    setEditingPost(post);
    setModalDate(null);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingPost(null);
    setModalDate(null);
  }, []);

  const handleCreate = useCallback(async (payload) => {
    try {
      await createSchedule.mutateAsync(payload);
      toast.success('Post scheduled');
      handleCloseModal();
    } catch (err) {
      toast.error(err.message || 'Failed to schedule post');
    }
  }, [createSchedule, handleCloseModal]);

  const handleUpdate = useCallback(async (payload) => {
    try {
      await updateSchedule.mutateAsync(payload);
      toast.success('Schedule updated');
      handleCloseModal();
    } catch (err) {
      toast.error(err.message || 'Failed to update schedule');
    }
  }, [updateSchedule, handleCloseModal]);

  const handleCancel = useCallback(async (id) => {
    try {
      await cancelSchedule.mutateAsync(id);
      toast.success('Post cancelled');
      handleCloseModal();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel post');
    }
  }, [cancelSchedule, handleCloseModal]);

  const openNewSchedule = useCallback(() => {
    setEditingPost(null);
    setModalDate(new Date());
    setModalOpen(true);
  }, []);

  // -- Loading state ------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Content Calendar" subtitle="Schedule and track content publishing across platforms." />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[88px] bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-[500px] bg-card border border-border rounded-xl animate-pulse" />
      </div>
    );
  }

  // -- Error state --------------------------------------------------------------

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Content Calendar" subtitle="Schedule and track content publishing across platforms." />
        <div className="bg-danger-bg border border-danger-border rounded-lg p-8 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-danger" />
          <p className="text-sm font-medium text-danger">Failed to load calendar data</p>
          <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  // -- Render -------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Content Calendar" subtitle="Schedule and track content publishing across platforms.">
        <Button onClick={openNewSchedule} size="sm">
          <CalendarPlus className="w-3.5 h-3.5" />
          Schedule Post
        </Button>
      </PageHeader>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard
          label="This Month"
          value={stats.thisMonth}
          icon={CalendarDays}
        />
        <KPICard
          label="Scheduled"
          value={stats.scheduled}
          icon={Clock}
        />
        <KPICard
          label="Published"
          value={stats.published}
          icon={CheckCircle2}
        />
        <KPICard
          label="Failed"
          value={stats.failed}
          icon={XCircle}
        />
      </div>

      {/* Calendar grid or empty state */}
      {scheduledPosts.length === 0 && stats.total === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No scheduled posts yet"
          description="Click any day on the calendar or use the Schedule Post button to plan your content."
          action={
            <Button onClick={openNewSchedule} size="sm">
              <CalendarPlus className="w-3.5 h-3.5" />
              Schedule Your First Post
            </Button>
          }
        />
      ) : null}

      {/* Always show the calendar grid */}
      <CalendarGrid
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        posts={scheduledPosts}
        onDayClick={handleDayClick}
        onPostClick={handlePostClick}
        selectedDate={selectedDate}
      />

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-warning" />
          <span className="text-[10px] text-muted-foreground">Scheduled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span className="text-[10px] text-muted-foreground">Published</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-danger" />
          <span className="text-[10px] text-muted-foreground">Failed</span>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-danger/15 border border-danger/25" />
            <span className="text-[10px] text-muted-foreground">YouTube</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-foreground/8 border border-foreground/15" />
            <span className="text-[10px] text-muted-foreground">TikTok</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-[#E1306C]/15 border border-[#E1306C]/25" />
            <span className="text-[10px] text-muted-foreground">Instagram</span>
          </div>
        </div>
      </div>

      {/* Schedule modal */}
      <ScheduleModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        topics={topics || []}
        existingPost={editingPost}
        initialDate={modalDate}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onCancel={handleCancel}
        isSubmitting={
          createSchedule.isPending ||
          updateSchedule.isPending ||
          cancelSchedule.isPending
        }
      />
    </div>
  );
}
