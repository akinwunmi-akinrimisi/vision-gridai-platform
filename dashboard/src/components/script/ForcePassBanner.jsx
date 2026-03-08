import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * ForcePassBanner -- Amber warning banner for force-passed scripts.
 * Displayed when a script scored below 7.0 after 3 generation attempts.
 *
 * @param {object} props
 * @param {number} props.score - The script's quality score
 * @param {boolean} props.isVisible - Whether the banner should render (topic.script_force_passed)
 */
export default function ForcePassBanner({ score, isVisible }) {
  const [dismissed, setDismissed] = useState(false);

  if (!isVisible || dismissed) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/[0.08] border border-amber-200 dark:border-amber-500/20 mb-4"
      role="alert"
      data-testid="force-pass-banner"
    >
      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <p className="flex-1 text-sm text-amber-800 dark:text-amber-300">
        <span className="font-semibold">Force-passed after 3 attempts.</span>{' '}
        Score: {score != null ? `${score}/10` : '--/10'}. Review carefully.
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-1 rounded-lg text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/[0.15] transition-colors"
        aria-label="Dismiss warning"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
