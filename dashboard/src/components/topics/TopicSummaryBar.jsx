import { cn } from '@/lib/utils';

export default function TopicSummaryBar({ total, approved, rejected, pending }) {
  const approvedPct = total > 0 ? (approved / total) * 100 : 0;
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;
  const rejectedPct = total > 0 ? (rejected / total) * 100 : 0;

  return (
    <div className="mb-5 space-y-2.5">
      {/* Proportional bar */}
      <div className="h-2 rounded-full overflow-hidden flex bg-muted">
        {approvedPct > 0 && (
          <div
            className="bg-success transition-all duration-500 ease-out"
            style={{ width: `${approvedPct}%` }}
          />
        )}
        {pendingPct > 0 && (
          <div
            className="bg-warning transition-all duration-500 ease-out"
            style={{ width: `${pendingPct}%` }}
          />
        )}
        {rejectedPct > 0 && (
          <div
            className="bg-danger transition-all duration-500 ease-out"
            style={{ width: `${rejectedPct}%` }}
          />
        )}
      </div>

      {/* Counts */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
          <span className="font-medium text-success">{approved}</span> Approved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-warning flex-shrink-0" />
          <span className="font-medium text-warning">{pending}</span> Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-danger flex-shrink-0" />
          <span className="font-medium text-danger">{rejected}</span> Rejected
        </span>
      </div>
    </div>
  );
}
