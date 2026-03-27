import { AlertTriangle, X } from 'lucide-react';

/**
 * Warning banner when supervisor detects a stuck production pipeline.
 * Only renders when visible=true.
 */
export default function SupervisorAlert({ visible, onDismiss }) {
  if (!visible) return null;

  return (
    <div
      data-testid="supervisor-alert-banner"
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-warning-bg border border-warning-border text-warning animate-fade-in"
    >
      <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
      <p className="text-sm font-medium flex-1">
        Supervisor detected stuck pipeline. Check failed scenes below.
      </p>
      <button
        data-testid="dismiss-supervisor-alert"
        onClick={onDismiss}
        className="p-1 rounded-lg hover:bg-warning/20 transition-colors duration-200 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
