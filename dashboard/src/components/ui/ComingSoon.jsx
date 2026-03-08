import { Construction } from 'lucide-react';

export default function ComingSoon({ phase = 2 }) {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center bg-card dark:bg-card-dark rounded-xl shadow-md p-10 max-w-sm w-full">
        <Construction className="w-12 h-12 text-text-muted dark:text-text-muted-dark mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          Coming Soon
        </h2>
        <p className="text-text-muted dark:text-text-muted-dark text-sm">
          Built in Phase {phase}
        </p>
      </div>
    </div>
  );
}
