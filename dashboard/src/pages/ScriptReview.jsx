import ComingSoon from '../components/ui/ComingSoon';

export default function ScriptReview() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
        Script Review
      </h1>
      <ComingSoon phase={3} />
    </div>
  );
}
