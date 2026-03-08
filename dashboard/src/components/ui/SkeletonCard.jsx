/**
 * Shimmer placeholder card for topic generation reveal.
 * Mimics the collapsed topic card layout with animated shimmer blocks.
 */
export default function SkeletonCard() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-4">
        {/* Badge placeholder */}
        <div className="animate-shimmer rounded-full h-5 w-24" />
        {/* Status badge placeholder */}
        <div className="animate-shimmer rounded-full h-5 w-16" />
      </div>

      {/* Title line */}
      <div className="animate-shimmer rounded-lg h-5 w-3/4 mb-2" />

      {/* Subtitle line */}
      <div className="animate-shimmer rounded-lg h-4 w-1/2 mb-4" />

      {/* Metric blocks row */}
      <div className="flex items-center gap-3 pt-3 border-t border-border/30 dark:border-white/[0.04]">
        <div className="animate-shimmer rounded-lg h-8 w-20" />
        <div className="animate-shimmer rounded-lg h-8 w-20" />
        <div className="animate-shimmer rounded-lg h-8 w-20" />
      </div>
    </div>
  );
}
