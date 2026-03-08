export default function TopicSummaryBar({ total, approved, rejected, pending }) {
  return (
    <div className="sticky top-0 z-10 glass-card px-5 py-3 mb-4 flex items-center gap-6 text-sm">
      <span className="font-semibold text-slate-900 dark:text-white">{total} Topics</span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="font-medium text-emerald-600 dark:text-emerald-400">{approved}</span>
        <span className="text-text-muted dark:text-text-muted-dark">Approved</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span className="font-medium text-red-600 dark:text-red-400">{rejected}</span>
        <span className="text-text-muted dark:text-text-muted-dark">Rejected</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span className="font-medium text-amber-600 dark:text-amber-400">{pending}</span>
        <span className="text-text-muted dark:text-text-muted-dark">Pending</span>
      </span>
    </div>
  );
}
