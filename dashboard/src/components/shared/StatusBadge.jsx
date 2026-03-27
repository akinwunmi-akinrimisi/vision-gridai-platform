import { cn } from '@/lib/utils';

const variants = {
  published: 'bg-success-bg text-success border-success-border',
  active: 'bg-warning-bg text-warning border-warning-border',
  pending: 'bg-muted text-muted-foreground border-border',
  failed: 'bg-danger-bg text-danger border-danger-border',
  review: 'bg-info-bg text-info border-info-border',
  approved: 'bg-success-bg text-success border-success-border',
  rejected: 'bg-danger-bg text-danger border-danger-border',
  scripting: 'bg-info-bg text-info border-info-border',
  assembly: 'bg-warning-bg text-warning border-warning-border',
  uploading: 'bg-info-bg text-info border-info-border',
  assembled: 'bg-success-bg text-success border-success-border',
};

export default function StatusBadge({ status, label, className }) {
  const display = label || status;
  const variant = variants[status] || variants.pending;

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium border',
      variant,
      className
    )}>
      {display}
    </span>
  );
}
