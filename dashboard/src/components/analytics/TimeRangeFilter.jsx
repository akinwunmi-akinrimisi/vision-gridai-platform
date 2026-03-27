const TIME_RANGES = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: 'All', value: 'all' },
];

/**
 * Inline toggle-button group for selecting analytics time range.
 * Active button uses warning-bg amber style; inactive uses muted-foreground.
 */
export default function TimeRangeFilter({ value, onChange }) {
  return (
    <div
      data-testid="time-range-filter"
      className="bg-muted rounded-lg p-0.5 flex"
    >
      {TIME_RANGES.map((r) => {
        const isActive = value === r.value;
        return (
          <button
            key={r.value}
            onClick={() => onChange(r.value)}
            className={
              isActive
                ? 'bg-warning-bg text-warning rounded-md px-3 py-1 text-xs font-medium transition-colors'
                : 'text-muted-foreground px-3 py-1 text-xs font-medium hover:text-foreground transition-colors'
            }
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
