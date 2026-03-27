import { CheckCircle2, XCircle, X } from 'lucide-react';

export default function TopicBulkBar({ selectedCount, onApprove, onReject, onClearSelection }) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 animate-slide-up">
      <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-card flex items-center gap-3">
        <span className="text-sm font-semibold tabular-nums">
          {selectedCount} selected
        </span>

        <div className="w-px h-5 bg-border" />

        <button
          onClick={onApprove}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            bg-success-bg border border-success-border text-success
            hover:bg-success/20 transition-colors cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Approve All
        </button>

        <button
          onClick={onReject}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            bg-danger-bg border border-danger-border text-danger
            hover:bg-danger/20 transition-colors cursor-pointer"
        >
          <XCircle className="w-3.5 h-3.5" />
          Reject All
        </button>

        <button
          onClick={onClearSelection}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground
            hover:bg-muted transition-colors cursor-pointer"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
