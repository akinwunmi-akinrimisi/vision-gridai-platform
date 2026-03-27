import { cn } from '@/lib/utils';

export default function HeroCard({ children, className }) {
  return (
    <div className={cn(
      'relative overflow-hidden bg-[rgba(251,191,36,0.04)] border border-border-accent rounded-xl p-5',
      className
    )}>
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-destructive" />
      {children}
    </div>
  );
}
