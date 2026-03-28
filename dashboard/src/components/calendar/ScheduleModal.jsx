import { useState, useMemo, useEffect } from 'react';
import { CalendarPlus, Loader2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// -- Platform options ----------------------------------------------------------

const PLATFORMS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'private', label: 'Private' },
];

// -- Helpers -------------------------------------------------------------------

function defaultDateTime(date) {
  const d = date ? new Date(date) : new Date();
  // Round up to next hour
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return {
    date: d.toISOString().slice(0, 10),
    time: d.toTimeString().slice(0, 5),
  };
}

// -- Component -----------------------------------------------------------------

/**
 * Dialog for creating or editing a scheduled post.
 *
 * @param {boolean} isOpen - Whether dialog is visible
 * @param {Function} onClose - Close callback
 * @param {Array} topics - Available topics to schedule (status=published or assembled)
 * @param {Object|null} existingPost - If editing, the post to edit
 * @param {Date|null} initialDate - Pre-selected date when clicking a day cell
 * @param {Function} onCreate - Called with { topicId, platform, scheduledAt, visibility }
 * @param {Function} onUpdate - Called with { id, scheduledAt, status }
 * @param {Function} onCancel - Called with post id to cancel
 * @param {boolean} isSubmitting - Loading state
 */
export default function ScheduleModal({
  isOpen,
  onClose,
  topics = [],
  existingPost = null,
  initialDate = null,
  onCreate,
  onUpdate,
  onCancel,
  isSubmitting = false,
}) {
  const isEditing = !!existingPost;

  // -- Form state ---------------------------------------------------------------

  const defaults = useMemo(() => {
    if (existingPost) {
      const dt = existingPost.scheduled_at
        ? {
            date: existingPost.scheduled_at.slice(0, 10),
            time: new Date(existingPost.scheduled_at).toTimeString().slice(0, 5),
          }
        : defaultDateTime(initialDate);
      return {
        topicId: existingPost.topic_id || '',
        platform: existingPost.platform || 'youtube',
        ...dt,
        visibility: existingPost.visibility || 'unlisted',
      };
    }
    const dt = defaultDateTime(initialDate);
    return {
      topicId: '',
      platform: 'youtube',
      ...dt,
      visibility: 'unlisted',
    };
  }, [existingPost, initialDate]);

  const [topicId, setTopicId] = useState(defaults.topicId);
  const [platform, setPlatform] = useState(defaults.platform);
  const [date, setDate] = useState(defaults.date);
  const [time, setTime] = useState(defaults.time);
  const [visibility, setVisibility] = useState(defaults.visibility);

  // Reset form when modal opens with new data
  useEffect(() => {
    setTopicId(defaults.topicId);
    setPlatform(defaults.platform);
    setDate(defaults.date);
    setTime(defaults.time);
    setVisibility(defaults.visibility);
  }, [defaults]);

  // -- Eligible topics ----------------------------------------------------------

  const eligibleTopics = useMemo(
    () =>
      topics.filter(
        (t) =>
          t.status === 'published' ||
          t.status === 'assembled' ||
          t.status === 'uploading'
      ),
    [topics]
  );

  // -- Handlers -----------------------------------------------------------------

  function handleSubmit() {
    const scheduledAt = new Date(`${date}T${time}`).toISOString();

    if (isEditing) {
      onUpdate?.({
        id: existingPost.id,
        scheduledAt,
        status: existingPost.status === 'cancelled' ? 'scheduled' : undefined,
      });
    } else {
      onCreate?.({
        topicId,
        platform,
        scheduledAt,
        visibility,
      });
    }
  }

  function handleCancel() {
    if (existingPost) {
      onCancel?.(existingPost.id);
    }
  }

  const canSubmit = isEditing
    ? !!date && !!time
    : !!topicId && !!platform && !!date && !!time;

  // -- Existing post title for editing ------------------------------------------

  const existingTitle = useMemo(() => {
    if (!existingPost?.topics) return '';
    return existingPost.topics.seo_title || existingPost.topics.original_title || '';
  }, [existingPost]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Scheduled Post' : 'Schedule Post'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? existingTitle || 'Update the schedule for this post.'
              : 'Select a topic and choose when to publish.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Topic selector (only for new posts) */}
          {!isEditing && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Topic
              </label>
              {eligibleTopics.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No topics are ready for scheduling. Topics must be assembled or published.
                </p>
              ) : (
                <Select value={topicId} onValueChange={setTopicId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select a topic..." />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleTopics.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="truncate">
                          #{t.topic_number} {t.seo_title || t.original_title || 'Untitled'}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Platform selector (only for new posts) */}
          {!isEditing && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Platform
              </label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date and time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Date
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Time
              </label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Visibility (only for new posts) */}
          {!isEditing && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Visibility
              </label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {/* Cancel post button (only when editing an active post) */}
          {isEditing && existingPost.status !== 'cancelled' && existingPost.status !== 'published' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="mr-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Cancel Post
            </Button>
          )}

          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CalendarPlus className="w-3.5 h-3.5" />
                {isEditing ? 'Update Schedule' : 'Schedule'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
