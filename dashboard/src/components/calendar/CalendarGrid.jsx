import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  addMonths,
  subMonths,
  getDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ContentBlock from './ContentBlock';

// -- Constants -----------------------------------------------------------------

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// -- Helpers -------------------------------------------------------------------

/**
 * Group posts by date key (YYYY-MM-DD) for O(1) lookup in the grid.
 */
function groupPostsByDate(posts) {
  const map = {};
  for (const post of posts) {
    if (!post.scheduled_at) continue;
    const key = post.scheduled_at.slice(0, 10); // YYYY-MM-DD
    if (!map[key]) map[key] = [];
    map[key].push(post);
  }
  return map;
}

// -- Component -----------------------------------------------------------------

/**
 * Monthly calendar grid showing 5-6 weeks.
 * Each day cell renders ContentBlock items for posts scheduled on that day.
 *
 * @param {Date} currentMonth - The month to display
 * @param {Function} onMonthChange - Callback when navigating months
 * @param {Array} posts - Scheduled posts array
 * @param {Function} onDayClick - Callback when clicking an empty area of a day
 * @param {Function} onPostClick - Callback when clicking a specific post block
 * @param {Date|null} selectedDate - Currently selected date (highlighted)
 */
export default function CalendarGrid({
  currentMonth,
  onMonthChange,
  posts = [],
  onDayClick,
  onPostClick,
  selectedDate,
}) {
  // Build the day grid (start of week containing month start -> end of week containing month end)
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  // Group posts by date for fast lookup
  const postsByDate = useMemo(() => groupPostsByDate(posts), [posts]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header: month name + navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <h2 className="text-sm font-semibold tracking-tight">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              'px-2 py-1.5 text-center text-[10px] uppercase tracking-wider font-medium',
              i === 0 || i === 6 ? 'text-muted-foreground/60' : 'text-muted-foreground'
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayPosts = postsByDate[dateKey] || [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const dayOfWeek = getDay(day);
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          // Max posts to show before "+N more"
          const MAX_VISIBLE = 3;
          const visiblePosts = dayPosts.slice(0, MAX_VISIBLE);
          const overflowCount = dayPosts.length - MAX_VISIBLE;

          return (
            <div
              key={dateKey}
              role="gridcell"
              aria-label={format(day, 'EEEE, MMMM d, yyyy')}
              className={cn(
                'min-h-[100px] border-b border-r border-border p-1.5 transition-colors',
                'cursor-pointer hover:bg-muted/30',
                !inMonth && 'opacity-40',
                isWeekend && inMonth && 'bg-muted/10',
                today && 'border-l-2 border-l-accent',
                selected && 'bg-accent/10 ring-1 ring-accent/40 ring-inset',
                // Remove right border on last column
                (index + 1) % 7 === 0 && 'border-r-0'
              )}
              onClick={(e) => {
                // Only fire day click if the click wasn't on a post block
                if (e.target === e.currentTarget || e.target.closest('[data-day-number]')) {
                  onDayClick?.(day);
                }
              }}
            >
              {/* Day number */}
              <div
                data-day-number
                className={cn(
                  'text-xs tabular-nums mb-1',
                  today
                    ? 'text-accent font-bold'
                    : inMonth
                      ? 'text-foreground/70'
                      : 'text-muted-foreground/50'
                )}
              >
                {format(day, 'd')}
              </div>

              {/* Scheduled posts */}
              <div className="space-y-0.5">
                {visiblePosts.map((post) => (
                  <ContentBlock
                    key={post.id}
                    post={post}
                    onClick={onPostClick}
                    compact={dayPosts.length > 2}
                  />
                ))}

                {overflowCount > 0 && (
                  <button
                    type="button"
                    className="w-full text-center text-[9px] text-muted-foreground hover:text-foreground transition-colors py-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDayClick?.(day);
                    }}
                  >
                    +{overflowCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
