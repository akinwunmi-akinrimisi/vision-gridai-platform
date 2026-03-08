export default function SkeletonLoader({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`
            h-4 rounded-md
            bg-slate-200 dark:bg-slate-700
            animate-pulse
            ${i === lines - 1 ? 'w-3/4' : 'w-full'}
          `}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
