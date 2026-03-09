import FilterDropdown from '../ui/FilterDropdown';

const TIME_RANGE_OPTIONS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'All time', value: 'all' },
];

/**
 * Time range filter dropdown for analytics page.
 * @param {{ value: string, onChange: (value: string) => void }} props
 */
export default function TimeRangeFilter({ value, onChange }) {
  return (
    <div data-testid="time-range-filter">
      <FilterDropdown
        label="Period"
        value={value}
        onChange={onChange}
        options={TIME_RANGE_OPTIONS}
      />
    </div>
  );
}
