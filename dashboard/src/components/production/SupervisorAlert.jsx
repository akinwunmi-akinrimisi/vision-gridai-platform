import { AlertTriangle, X } from 'lucide-react';

/**
 * Amber warning banner when supervisor detects a stuck production pipeline.
 * Only renders when visible=true.
 */
export default function SupervisorAlert({ visible, onDismiss }) {
  if (!visible) return null;

  return (
    <div
      data-testid="supervisor-alert-banner"
      className="
        flex items-center gap-3 px-4 py-3 mb-4 rounded-xl
        bg-amber-50 dark:bg-amber-900/20
        border border-amber-300 dark:border-amber-700
        text-amber-800 dark:text-amber-200
        animate-in
      "
    >
      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
      <p className="text-sm font-medium flex-1">
        Supervisor detected stuck pipeline. Check failed scenes below.
      </p>
      <button
        data-testid="dismiss-supervisor-alert"
        onClick={onDismiss}
        className="
          p-1 rounded-lg
          hover:bg-amber-200/50 dark:hover:bg-amber-800/30
          transition-colors duration-200 cursor-pointer
        "
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
