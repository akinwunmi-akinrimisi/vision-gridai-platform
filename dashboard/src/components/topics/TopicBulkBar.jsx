import { CheckCircle2, XCircle, X } from 'lucide-react';

export default function TopicBulkBar({ selectedCount, onApprove, onReject, onClearSelection }) {
  if (selectedCount === 0) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 transform transition-transform duration-300 ease-out"
      style={{ transform: selectedCount > 0 ? 'translateY(0)' : 'translateY(100%)' }}
    >
      <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <div className="glass-card px-3 sm:px-5 py-3 flex items-center justify-between shadow-xl">
          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
            {selectedCount} selected
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onApprove}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold
                text-white bg-emerald-500 hover:bg-emerald-600 transition-colors cursor-pointer min-h-[44px]"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve
            </button>
            <button
              onClick={onReject}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold
                text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/[0.08]
                hover:bg-red-100 dark:hover:bg-red-500/[0.12] transition-colors cursor-pointer min-h-[44px]"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </button>
            <button
              onClick={onClearSelection}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
                hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
