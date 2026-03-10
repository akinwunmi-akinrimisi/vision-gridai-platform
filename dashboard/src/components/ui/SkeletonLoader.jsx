export function SkeletonLine({ width = 'w-full', height = 'h-4', className = '' }) {
  return (
    <div
      className={`${height} ${width} rounded-lg animate-shimmer ${className}`}
      role="status"
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`rounded-2xl border border-border/50 dark:border-white/[0.06] p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl animate-shimmer" />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="w-1/3" height="h-4" />
          <SkeletonLine width="w-1/2" height="h-3" />
        </div>
      </div>
      <div className="space-y-2.5">
        <SkeletonLine />
        <SkeletonLine />
        <SkeletonLine width="w-3/4" />
      </div>
    </div>
  );
}

export function SkeletonMetric({ className = '' }) {
  return (
    <div className={`rounded-2xl border border-border/50 dark:border-white/[0.06] p-5 ${className}`}>
      <SkeletonLine width="w-1/3" height="h-3" className="mb-3" />
      <SkeletonLine width="w-2/3" height="h-7" className="mb-2" />
      <SkeletonLine width="w-1/2" height="h-3" />
    </div>
  );
}

export default function SkeletonLoader({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          width={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
