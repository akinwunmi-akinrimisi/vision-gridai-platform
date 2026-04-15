import { Lightbulb, Loader2, Plus, FilePlus2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function demandStyle(score) {
  if (score == null) return 'bg-muted-foreground/60';
  if (score >= 75) return 'bg-success';
  if (score >= 50) return 'bg-warning';
  return 'bg-muted-foreground/60';
}

function SuggestionRow({ suggestion, index, onPromote, onCreate, isPromoting, isCreating }) {
  const title = suggestion?.suggested_title || 'Suggested topic';
  const seed = suggestion?.seed_question;
  const demand = Number(suggestion?.demand_signal);
  const hasDemand = Number.isFinite(demand);
  const pct = hasDemand ? Math.max(0, Math.min(100, demand)) : 0;

  const handlePromote = async () => {
    try {
      await onPromote(suggestion);
      toast.success('Promoted to Daily Ideas');
    } catch (err) {
      toast.error(err?.message || 'Failed to promote');
    }
  };

  const handleCreate = async () => {
    try {
      await onCreate(suggestion);
      toast.success('Topic scaffold created');
    } catch (err) {
      toast.error(err?.message || 'Failed to create topic');
    }
  };

  return (
    <div
      className={cn(
        'p-3 rounded-lg border border-border bg-muted/40 hover:bg-muted/70 transition-colors',
        `stagger-${Math.min(index + 1, 8)} animate-fade-in`,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 text-foreground text-[11px] font-bold flex items-center justify-center tabular-nums border border-border">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug mb-1">
            {title}
          </p>
          {seed && (
            <p className="text-[11px] italic text-muted-foreground leading-relaxed mb-2 line-clamp-2">
              &ldquo;{seed}&rdquo;
            </p>
          )}

          {hasDemand && (
            <div className="mb-2">
              <div className="flex items-baseline justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                <span>Demand Signal</span>
                <span className="font-mono tabular-nums normal-case">{Math.round(demand)}/100</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    demandStyle(demand),
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="sm"
              onClick={handlePromote}
              disabled={isPromoting || isCreating}
              className="h-7 text-[11px]"
            >
              {isPromoting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              Promote to Daily Ideas
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreate}
              disabled={isPromoting || isCreating}
              className="h-7 text-[11px]"
            >
              {isCreating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <FilePlus2 className="w-3 h-3" />
              )}
              Create Topic
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuggestedTopicsCard({
  suggestions,
  onPromote,
  onCreate,
  isPromoting,
  isCreating,
}) {
  const list = Array.isArray(suggestions) ? suggestions.slice(0, 5) : [];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Lightbulb className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold">Audience-Suggested Topics</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
          AI-derived from questions &amp; suggestions
        </span>
      </div>

      {list.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-xs text-muted-foreground">
            No topic suggestions surfaced yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 p-3">
          {list.map((s, i) => (
            <SuggestionRow
              key={i}
              suggestion={s}
              index={i}
              onPromote={onPromote}
              onCreate={onCreate}
              isPromoting={isPromoting}
              isCreating={isCreating}
            />
          ))}
        </div>
      )}
    </div>
  );
}
