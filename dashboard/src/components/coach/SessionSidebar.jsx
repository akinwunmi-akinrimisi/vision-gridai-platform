import { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Archive,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Focus area config                                                  */
/* ------------------------------------------------------------------ */

const FOCUS_AREAS = [
  { value: 'general', label: 'General' },
  { value: 'growth', label: 'Growth' },
  { value: 'monetization', label: 'Monetization' },
  { value: 'competitors', label: 'Competitors' },
  { value: 'content', label: 'Content' },
];

const FOCUS_STYLES = {
  growth: 'bg-success-bg text-success border-success-border',
  monetization: 'bg-warning-bg text-warning border-warning-border',
  competitors: 'bg-info-bg text-info border-info-border',
  content: 'bg-accent/10 text-accent border-accent/20',
  general: 'bg-muted text-muted-foreground border-border',
};

function focusLabel(focus) {
  if (!focus) return 'General';
  return focus.charAt(0).toUpperCase() + focus.slice(1);
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ */
/*  New session inline form                                            */
/* ------------------------------------------------------------------ */

function NewSessionForm({ onCancel, onCreate, isPending }) {
  const [focus, setFocus] = useState('general');
  const [title, setTitle] = useState('');

  return (
    <div className="p-3 rounded-lg bg-muted border border-border space-y-2 animate-fade-in">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Optional title (auto-derived if blank)"
        className="w-full px-2.5 py-1.5 rounded-md text-xs bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
      />
      <select
        value={focus}
        onChange={(e) => setFocus(e.target.value)}
        className="w-full px-2.5 py-1.5 rounded-md text-xs bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
      >
        {FOCUS_AREAS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => onCreate({ title: title.trim() || null, focusArea: focus })}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Create
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Session list item                                                  */
/* ------------------------------------------------------------------ */

function SessionItem({ session, isSelected, onSelect, onArchive }) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'group relative w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer',
        isSelected
          ? 'bg-accent/10 border-accent/30 shadow-sm'
          : 'bg-card border-border hover:bg-card-hover hover:border-border-hover',
      )}
    >
      <div className="flex items-start gap-2 mb-1">
        <span className="flex-1 text-xs font-semibold text-foreground truncate">
          {session.title || 'Untitled'}
        </span>
        {!session.is_archived && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onArchive(session);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all cursor-pointer text-muted-foreground hover:text-foreground"
            title="Archive"
          >
            <Archive className="w-3 h-3" />
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={cn(
            'inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-medium border',
            FOCUS_STYLES[session.focus_area] || FOCUS_STYLES.general,
          )}
        >
          {focusLabel(session.focus_area)}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {session.message_count || 0} msg
        </span>
        <span className="text-[10px] text-muted-foreground">
          {'\u00B7'} {formatRelativeTime(session.last_message_at || session.created_at)}
        </span>
      </div>

      {session.estimated_cost_usd > 0 && (
        <div className="mt-1 text-[10px] font-mono tabular-nums text-muted-foreground">
          ${session.estimated_cost_usd.toFixed(3)}
        </div>
      )}

      {session.is_archived && (
        <span className="absolute top-1.5 right-1.5 text-[9px] text-muted-foreground italic">
          archived
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  SessionSidebar                                                     */
/* ------------------------------------------------------------------ */

export default function SessionSidebar({
  sessions = [],
  selectedSessionId,
  onSelect,
  onCreate,
  onArchive,
  isCreating,
  isLoading,
}) {
  const [showForm, setShowForm] = useState(false);

  const activeSessions = sessions.filter((s) => !s.is_archived);
  const archivedSessions = sessions.filter((s) => s.is_archived);

  const handleCreate = async ({ title, focusArea }) => {
    await onCreate({ title, focusArea });
    setShowForm(false);
  };

  return (
    <aside className="flex flex-col bg-card border border-border rounded-xl overflow-hidden h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        {showForm ? (
          <NewSessionForm
            onCancel={() => setShowForm(false)}
            onCreate={handleCreate}
            isPending={isCreating}
          />
        ) : (
          <Button
            size="sm"
            className="w-full"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            New Session
          </Button>
        )}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
        {isLoading && (
          <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </div>
        )}

        {!isLoading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center px-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
            </div>
            <h4 className="text-xs font-semibold mb-1">No sessions yet</h4>
            <p className="text-[11px] text-muted-foreground">
              Start a new conversation with your AI coach.
            </p>
          </div>
        )}

        {activeSessions.length > 0 && (
          <>
            {activeSessions.map((s) => (
              <SessionItem
                key={s.id}
                session={s}
                isSelected={s.id === selectedSessionId}
                onSelect={() => onSelect(s.id)}
                onArchive={onArchive}
              />
            ))}
          </>
        )}

        {archivedSessions.length > 0 && (
          <>
            <div className="pt-3 pb-1 px-1">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                Archived
              </span>
            </div>
            {archivedSessions.map((s) => (
              <SessionItem
                key={s.id}
                session={s}
                isSelected={s.id === selectedSessionId}
                onSelect={() => onSelect(s.id)}
                onArchive={onArchive}
              />
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
