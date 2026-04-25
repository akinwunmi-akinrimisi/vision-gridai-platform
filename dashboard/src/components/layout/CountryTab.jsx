import { useCountryTab } from '@/hooks/useCountryTab';
import { cn } from '@/lib/utils';

/**
 * Compact GENERAL / AU toggle for the Sidebar header. Persists via
 * useCountryTab. Keeps existing nav items visible for the active scope and
 * AU-only items visible only when AU is active.
 */
export default function CountryTab({ collapsed = false }) {
  const { country, setCountry } = useCountryTab();

  const tabs = [
    { value: 'GENERAL', label: 'General', shortLabel: 'GEN' },
    { value: 'AU', label: 'Australia', shortLabel: 'AU' },
  ];

  if (collapsed) {
    return (
      <div className="flex flex-col gap-1 px-2 py-2">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setCountry(t.value)}
            title={t.label}
            className={cn(
              'flex items-center justify-center h-8 rounded-md text-xs font-semibold transition-colors',
              country === t.value
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {t.shortLabel}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-3 pt-3 pb-2">
      <div className="inline-flex w-full rounded-lg bg-muted/50 p-0.5">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setCountry(t.value)}
            className={cn(
              'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
              country === t.value
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
