import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clapperboard, ChevronDown, ChevronUp, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { webhookCall } from '../../lib/api';
import { REGISTER_META } from '../../hooks/useRegisterSelector';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Gate 1 register confirmation banner.
 * Shown on TopicReview when any pending topic has register_recommendations
 * but no register_selected_at yet.
 *
 * Topic-stage WF_REGISTER_APPROVE path:
 *   - Does NOT fire scene-classify (script not ready)
 *   - Does NOT touch pipeline_stage
 *   - Only sets production_register + register_selected_at
 */
export default function TopicRegisterGate({ topics, projectId }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [overrides, setOverrides] = useState({}); // topicId -> registerId
  const [confirmingBulk, setConfirmingBulk] = useState(false);

  const eligible = useMemo(() => {
    return (topics || []).filter(
      (t) =>
        t?.review_status === 'pending' &&
        t?.register_recommendations &&
        Array.isArray(t.register_recommendations.top_2) &&
        t.register_recommendations.top_2.length > 0 &&
        !t.register_selected_at
    );
  }, [topics]);

  const confirmMutation = useMutation({
    mutationFn: async ({ topicId, registerId }) => {
      return webhookCall(
        'register/approve',
        { topic_id: topicId, production_register: registerId },
        { timeoutMs: 20_000 }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics', projectId] });
    },
  });

  if (eligible.length === 0) return null;

  const autoPick = (t) => {
    const top = t.register_recommendations?.top_2?.[0];
    return overrides[t.id] || top?.register_id;
  };

  const confirmOne = async (topic) => {
    const registerId = autoPick(topic);
    if (!registerId) return;
    try {
      const r = await confirmMutation.mutateAsync({ topicId: topic.id, registerId });
      if (r?.success === false) {
        toast.error(r.error || 'Failed to confirm register');
      } else {
        toast.success(`Register confirmed for #${topic.topic_number}`);
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to confirm register');
    }
  };

  const confirmAll = async () => {
    setConfirmingBulk(true);
    let ok = 0;
    let fail = 0;
    for (const t of eligible) {
      const registerId = autoPick(t);
      if (!registerId) { fail++; continue; }
      try {
        const r = await confirmMutation.mutateAsync({ topicId: t.id, registerId });
        if (r?.success === false) fail++;
        else ok++;
      } catch {
        fail++;
      }
    }
    setConfirmingBulk(false);
    if (ok > 0) toast.success(`${ok} register${ok > 1 ? 's' : ''} confirmed`);
    if (fail > 0) toast.error(`${fail} failed`);
  };

  return (
    <div className="mb-5 border border-primary/30 bg-primary/5 rounded-xl overflow-hidden animate-fade-in">
      {/* Banner row */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Clapperboard className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">
            {eligible.length} topic{eligible.length > 1 ? 's' : ''} awaiting register confirmation
          </div>
          <div className="text-xs text-muted-foreground">
            Top register auto-picked per topic. Confirm to lock it in before script generation.
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setExpanded((v) => !v)}
          className="gap-1.5 shrink-0"
        >
          Review
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </Button>
        <Button
          size="sm"
          onClick={confirmAll}
          disabled={confirmingBulk}
          className="shrink-0 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {confirmingBulk ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Confirming...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirm all top picks
            </>
          )}
        </Button>
      </div>

      {/* Expanded table */}
      {expanded && (
        <div className="border-t border-primary/20 bg-background/40 divide-y divide-border">
          {eligible.map((t) => {
            const top2 = t.register_recommendations?.top_2 || [];
            const picked = autoPick(t);
            const meta = REGISTER_META[picked] || { name: picked, accent: '#888' };
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20">
                <span className="text-xs font-mono text-muted-foreground w-10 shrink-0 tabular-nums">
                  #{t.topic_number}
                </span>
                <span className="text-sm truncate flex-1 min-w-0">
                  {t.seo_title || t.original_title}
                </span>
                <select
                  value={picked}
                  onChange={(e) =>
                    setOverrides((prev) => ({ ...prev, [t.id]: e.target.value }))
                  }
                  className={cn(
                    'text-xs bg-muted/50 border border-border rounded-md px-2 py-1 shrink-0',
                    'hover:bg-muted focus:outline-none focus:ring-1 focus:ring-primary'
                  )}
                >
                  {top2.map((r) => {
                    const m = REGISTER_META[r.register_id] || { name: r.register_id };
                    return (
                      <option key={r.register_id} value={r.register_id}>
                        {m.name} · {Math.round((r.confidence || 0) * 100)}%
                      </option>
                    );
                  })}
                </select>
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: meta.accent }}
                  title={meta.name}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => confirmOne(t)}
                  disabled={confirmMutation.isPending}
                  className="shrink-0 text-xs h-7"
                >
                  Confirm
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
