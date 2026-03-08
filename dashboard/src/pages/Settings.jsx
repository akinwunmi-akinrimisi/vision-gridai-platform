import ComingSoon from '../components/ui/ComingSoon';

export default function Settings() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
        Settings
      </h1>
      <ComingSoon phase={6} />
    </div>
  );
}
