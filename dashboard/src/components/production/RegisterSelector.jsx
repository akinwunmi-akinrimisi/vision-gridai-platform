import { useState } from 'react';
import { Film, Clapperboard, AlertTriangle, CheckCircle2, ArrowRight, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRegisterSelector, REGISTER_META } from '../../hooks/useRegisterSelector';
import { cn } from '@/lib/utils';

const COMPAT_LABEL = {
  ideal: { text: 'Ideal match with your mode',  tone: 'good'    },
  default: { text: 'Default for this register',  tone: 'good'    },
  acceptable: { text: 'Works with your mode',    tone: 'neutral' },
  not_recommended: { text: 'Not recommended for your mode', tone: 'warn' },
};

const COMPAT_STYLES = {
  good:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  neutral: 'bg-muted/30 text-muted-foreground border-border',
  warn:    'bg-amber-500/10 text-amber-400 border-amber-500/30',
};

/**
 * RegisterSelector: shown after Cost Calculator submit (pipeline_stage='register_selection').
 * Displays top-2 recommended Production Registers with confidence, reasoning, and
 * compatibility badges vs the Mode picked in Cost Calculator. "Warn but allow" —
 * user can override a "not_recommended" combo; we just flag it.
 */
export default function RegisterSelector({ topicId, projectId }) {
  const [selectedId, setSelectedId] = useState(null);
  const { topic, mode, top2, allRanked, era, recommendations, isAnalyzing, isLoading, confirmSelection, isConfirming } =
    useRegisterSelector(topicId, projectId);

  if (isLoading) {
    return (
      <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-6 sm:p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-3">
          <Clapperboard className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Analyzing script for production register</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Claude is reading the script to recommend the top 2 cinematic registers. Usually under 30 seconds.
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Classifying against Economist / Premium / Noir / Signal / Archive…</span>
        </div>
      </div>
    );
  }

  const handleConfirm = () => {
    if (!selectedId) return;
    confirmSelection({ registerId: selectedId });
  };

  return (
    <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1.5">
          <Clapperboard className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Pick a production register</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Top 2 registers recommended by the classifier for this script.
          {mode && (
            <> Mode selected: <span className="font-medium text-foreground">{mode}</span>.</>
          )}
          {era && (
            <> Era detected: <span className="font-medium text-foreground">{era}</span>.</>
          )}
        </p>
        {recommendations?.notes && (
          <p className="text-xs text-muted-foreground/80 italic mt-2 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{recommendations.notes}</span>
          </p>
        )}
      </div>

      {/* Top-2 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {top2.map((r, idx) => {
          const meta = r.meta || REGISTER_META[r.register_id] || { name: r.register_id, short: '', refs: [], accent: '#888' };
          const compat = r.compat ? COMPAT_LABEL[r.compat] : null;
          const compatStyle = compat ? COMPAT_STYLES[compat.tone] : null;
          const isSelected = selectedId === r.register_id;

          return (
            <button
              key={r.register_id}
              type="button"
              onClick={() => setSelectedId(r.register_id)}
              className={cn(
                'text-left rounded-xl border-2 p-5 transition-all',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-muted/10 hover:border-primary/50 hover:bg-muted/20'
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="inline-block w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: meta.accent }}
                    />
                    <span className="text-xs font-mono text-muted-foreground">
                      {idx === 0 ? 'Top pick' : 'Runner-up'}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold">{meta.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{meta.short}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-semibold tabular-nums">
                    {Math.round((r.confidence || 0) * 100)}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    confidence
                  </div>
                </div>
              </div>

              {compat && (
                <div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border mb-3', compatStyle)}>
                  {compat.tone === 'warn' && <AlertTriangle className="w-3 h-3" />}
                  {compat.tone === 'good' && <CheckCircle2 className="w-3 h-3" />}
                  <span>{compat.text}</span>
                </div>
              )}

              {r.reasoning && (
                <p className="text-sm text-muted-foreground/90 leading-relaxed mb-3">
                  {r.reasoning}
                </p>
              )}

              {r.reference_channels && r.reference_channels.length > 0 && (
                <div className="pt-2 border-t border-border/60">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1">References</div>
                  <div className="text-xs text-muted-foreground">
                    {r.reference_channels.slice(0, 4).join(' · ')}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Optional: all 5 ranked (collapsible) */}
      {allRanked && allRanked.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5" />
            Show all 5 registers ranked
          </summary>
          <div className="mt-3 space-y-1.5">
            {allRanked.map((r) => {
              const meta = REGISTER_META[r.register_id] || { name: r.register_id };
              const isTop2 = top2.some(t => t.register_id === r.register_id);
              return (
                <button
                  key={r.register_id}
                  type="button"
                  onClick={() => setSelectedId(r.register_id)}
                  className={cn(
                    'w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-xs transition-colors',
                    selectedId === r.register_id ? 'bg-primary/10 border border-primary/40' : 'hover:bg-muted/30'
                  )}
                >
                  <span className="w-10 tabular-nums text-muted-foreground">
                    {Math.round((r.confidence || 0) * 100)}%
                  </span>
                  <span className="flex-1 font-medium">{meta.name}</span>
                  {isTop2 && <span className="text-[10px] text-primary">TOP 2</span>}
                  <span className="text-muted-foreground/70 truncate max-w-[40%]">{r.reasoning}</span>
                </button>
              );
            })}
          </div>
        </details>
      )}

      {/* Confirm */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <Button
          onClick={handleConfirm}
          disabled={!selectedId || isConfirming}
          className="gap-1.5"
        >
          {isConfirming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Confirm register
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
