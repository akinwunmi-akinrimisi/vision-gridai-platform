import { cn } from '@/lib/utils';

export default function KPICard({ label, value, delta, deltaType, icon: Icon, className }) {
  return (
    <div className={cn(
      'bg-card border border-border rounded-lg p-4 transition-colors hover:border-border-hover',
      className
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      {delta && (
        <div className={cn(
          'mt-1 text-xs',
          deltaType === 'positive' ? 'text-success' : 'text-danger'
        )}>
          {deltaType === 'positive' ? '\u2191' : '\u2193'} {delta}
        </div>
      )}
    </div>
  );
}
