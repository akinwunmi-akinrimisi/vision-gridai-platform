import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * ForcePassBanner -- Warning banner for force-passed scripts.
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
      className="flex items-center gap-2 bg-warning-bg border border-warning-border rounded-lg p-3 mb-4"
      role="alert"
      data-testid="force-pass-banner"
    >
      <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
      <p className="flex-1 text-warning text-xs">
        <span className="font-semibold">Script force-passed below threshold.</span>{' '}
        Score: {score != null ? `${score}/10` : '--/10'}. Review carefully before approving.
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-1 rounded-md text-warning hover:bg-warning-bg transition-colors"
        aria-label="Dismiss warning"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
