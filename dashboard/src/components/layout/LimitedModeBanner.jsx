import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Displayed while the dashboard is in "locked-down RLS" mode (Batch 2 of
 * the 2026-04-21 security remediation). All direct Supabase reads from the
 * browser are denied; the five highest-traffic queries are routed through
 * WF_DASHBOARD_READ. Secondary pages (Engagement Hub, Calendar, Keywords,
 * etc.) may show empty data until later batches migrate them.
 */
export default function LimitedModeBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('vg_lm_banner_dismissed') === '1'; } catch (_) { return false; }
  });

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem('vg_lm_banner_dismissed', '1'); } catch (_) { /* noop */ }
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-600 dark:text-amber-400">
      <div className="max-w-[1440px] mx-auto flex items-start gap-3 px-7 py-2.5 text-sm">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
        <div className="flex-1">
          <span className="font-medium">Dashboard partially limited — auth coming.</span>
          {' '}Supabase RLS locked down after security audit 2026-04-21. Core views
          (Projects, Topics, Scenes, Analytics) now poll every 15–60s via authenticated
          webhooks. Secondary pages (Engagement Hub, Calendar, Keywords, Settings
          integrations) may show empty data until migrated.
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss banner"
          className="text-amber-600/60 hover:text-amber-600 dark:text-amber-400/60 dark:hover:text-amber-400 transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
