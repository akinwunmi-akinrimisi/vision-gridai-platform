import { useRef, useEffect, useState } from 'react';
import {
  MessageCircle,
  Sparkles,
  Edit2,
  Check,
  X,
  Loader2,
  TrendingUp,
  DollarSign,
  Target,
  Zap,
} from 'lucide-react';
import MessageBubble from './MessageBubble';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Starter prompts by focus area                                      */
/* ------------------------------------------------------------------ */

const STARTER_PROMPTS = {
  growth: [
    { icon: TrendingUp, text: "What's dragging down my latest topic PPS?" },
    { icon: TrendingUp, text: "Give me 3 specific growth levers I'm not using yet." },
    { icon: Target, text: "How should I reposition my next video for higher click-through?" },
    { icon: Zap, text: "Which topic angle has the best shot at breakout this week?" },
  ],
  monetization: [
    { icon: DollarSign, text: "Should I push the RPM envelope with a different niche?" },
    { icon: DollarSign, text: "Which topics in my backlog have the highest RPM potential?" },
    { icon: DollarSign, text: "What product integrations would fit my audience?" },
    { icon: Target, text: "Benchmark my CPM against competitors \u2014 am I leaving money on the table?" },
  ],
  competitors: [
    { icon: Target, text: "Who's breaking out in my niche this week?" },
    { icon: Target, text: "What's the common thread in the top competitor outliers?" },
    { icon: Sparkles, text: "Which competitor's style DNA should I study?" },
    { icon: Zap, text: "What topic am I being beaten to market on?" },
  ],
  content: [
    { icon: Edit2, text: "Give me 3 concrete ways to improve my last video's hook." },
    { icon: Sparkles, text: "What chapter structure pattern is winning for long-form right now?" },
    { icon: Target, text: "How tight should my retention beats be for a 2-hour doc?" },
    { icon: Zap, text: "Rewrite my last video title to be more curiosity-driven." },
  ],
  general: [
    { icon: Sparkles, text: "Give me a state-of-the-project report in 5 bullets." },
    { icon: TrendingUp, text: "What should I focus on this week?" },
    { icon: Target, text: "What's the single highest-leverage improvement I can make?" },
    { icon: Zap, text: "What am I doing well that I should double down on?" },
  ],
};

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

/* ------------------------------------------------------------------ */
/*  Session header                                                     */
/* ------------------------------------------------------------------ */

function SessionHeader({ session, onRename, isRenaming }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session?.title || '');

  useEffect(() => {
    setDraft(session?.title || '');
  }, [session?.id, session?.title]);

  if (!session) return null;

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === session.title) {
      setEditing(false);
      return;
    }
    await onRename(trimmed);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 p-4 border-b border-border bg-card/50 backdrop-blur-sm flex-wrap">
      <MessageCircle className="w-4 h-4 text-accent flex-shrink-0" />

      {editing ? (
        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setEditing(false);
            }}
            autoFocus
            className="flex-1 px-2 py-1 rounded-md text-sm bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
          />
          <Button size="sm" variant="ghost" onClick={handleSave} disabled={isRenaming}>
            {isRenaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={isRenaming}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-sm font-semibold text-foreground hover:text-accent transition-colors cursor-pointer flex items-center gap-1.5 group"
          title="Rename session"
        >
          {session.title || 'Untitled'}
          <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}

      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium border',
          FOCUS_STYLES[session.focus_area] || FOCUS_STYLES.general,
        )}
      >
        {focusLabel(session.focus_area)}
      </span>

      <div className="flex-1" />

      <div className="flex items-center gap-3 text-[10px] font-mono tabular-nums text-muted-foreground">
        <span>{session.message_count || 0} msgs</span>
        {(session.total_input_tokens || session.total_output_tokens) && (
          <span>
            {((session.total_input_tokens || 0) + (session.total_output_tokens || 0)).toLocaleString()} tokens
          </span>
        )}
        {session.estimated_cost_usd > 0 && (
          <span>${session.estimated_cost_usd.toFixed(3)}</span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Welcome panel (empty session)                                      */
/* ------------------------------------------------------------------ */

function WelcomePanel({ focus, onStarterClick }) {
  const prompts = STARTER_PROMPTS[focus] || STARTER_PROMPTS.general;

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 border border-accent/30">
        <Sparkles className="w-7 h-7 text-accent" />
      </div>
      <h3 className="text-lg font-bold mb-1">AI Growth Coach</h3>
      <p className="text-sm text-muted-foreground max-w-md text-center mb-8">
        Context-aware advisor that knows your project state, competitor activity, and recent performance.
        Pick a starter or ask your own question.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
        {prompts.map((p, i) => {
          const Icon = p.icon;
          return (
            <button
              key={i}
              onClick={() => onStarterClick(p.text)}
              className={cn(
                'flex items-start gap-2.5 p-3 rounded-lg bg-card border border-border text-left',
                'hover:border-accent/40 hover:bg-card-hover transition-all cursor-pointer',
                `stagger-${Math.min(i + 1, 8)} animate-slide-up`,
              )}
            >
              <Icon className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <span className="text-sm text-foreground leading-snug">{p.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ChatPane                                                           */
/* ------------------------------------------------------------------ */

export default function ChatPane({
  session,
  messages = [],
  isMessagesLoading,
  isSending,
  onRename,
  isRenaming,
  onStarterClick,
  onShowContext,
  children, // MessageInput slot
}) {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages / while sending
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length, isSending]);

  const isEmpty = !isMessagesLoading && messages.length === 0;
  const focus = session?.focus_area || 'general';

  return (
    <section className="flex flex-col bg-card border border-border rounded-xl overflow-hidden h-full">
      {/* Header */}
      {session && (
        <SessionHeader
          session={session}
          onRename={onRename}
          isRenaming={isRenaming}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isMessagesLoading && (
          <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading messages...
          </div>
        )}

        {isEmpty && (
          <WelcomePanel focus={focus} onStarterClick={onStarterClick} />
        )}

        {!isMessagesLoading && messages.length > 0 && (
          <div className="py-2">
            {messages.map((m) => (
              <MessageBubble
                key={m.id || `${m.session_id}-${m.turn_index}`}
                message={m}
                onShowContext={onShowContext}
              />
            ))}
            {isSending && (
              <div className="flex justify-start px-4 py-2 animate-fade-in">
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card border border-border inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Coach is thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input slot */}
      {children}
    </section>
  );
}
