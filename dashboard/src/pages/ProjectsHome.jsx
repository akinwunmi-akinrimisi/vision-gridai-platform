import ComingSoon from '../components/ui/ComingSoon';

export default function ProjectsHome() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
        Projects
      </h1>
      <ComingSoon phase={2} />
    </div>
  );
}
