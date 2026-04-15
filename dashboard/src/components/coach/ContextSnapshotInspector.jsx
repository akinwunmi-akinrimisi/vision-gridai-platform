import Modal from '@/components/ui/Modal';
import { Database } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Context section renderer                                           */
/* ------------------------------------------------------------------ */

function Section({ title, value }) {
  if (value == null) return null;

  const isEmpty = Array.isArray(value) ? value.length === 0 : (typeof value === 'object' && Object.keys(value).length === 0);
  if (isEmpty) return null;

  return (
    <div className="mb-4">
      <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        {title}
      </h4>
      <pre className="text-[11px] font-mono leading-relaxed text-foreground bg-muted border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
        {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ContextSnapshotInspector                                           */
/* ------------------------------------------------------------------ */

export default function ContextSnapshotInspector({ message, onClose }) {
  if (!message) return null;
  const snapshot = message.context_snapshot || {};
  const isEmpty = Object.keys(snapshot).length === 0;

  // Try to pull common sections first, fall through to the raw JSON tail
  const known = ['project_state', 'recent_topics', 'competitor_activity', 'pps_trends', 'niche_health', 'pending_ideas'];
  const extras = Object.keys(snapshot).filter((k) => !known.includes(k));

  return (
    <Modal
      isOpen={!!message}
      onClose={onClose}
      title="Context Snapshot"
      maxWidth="max-w-3xl"
    >
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
              <Database className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              No context snapshot was captured for this turn.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-muted-foreground mb-4">
              Read-only snapshot of project state that was injected into the coach prompt at turn {message.turn_index}.
            </p>
            <Section title="Project State" value={snapshot.project_state} />
            <Section title="Recent Topics" value={snapshot.recent_topics} />
            <Section title="Competitor Activity" value={snapshot.competitor_activity} />
            <Section title="PPS Trends" value={snapshot.pps_trends} />
            <Section title="Niche Health" value={snapshot.niche_health} />
            <Section title="Pending Ideas" value={snapshot.pending_ideas} />
            {extras.map((k) => (
              <Section key={k} title={k.replace(/_/g, ' ')} value={snapshot[k]} />
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}
