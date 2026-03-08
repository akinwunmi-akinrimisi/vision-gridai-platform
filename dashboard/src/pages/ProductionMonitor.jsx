import ComingSoon from '../components/ui/ComingSoon';

export default function ProductionMonitor() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
        Production Monitor
      </h1>
      <ComingSoon phase={4} />
    </div>
  );
}
