import { useState } from 'react';
import { Plus, Folder, TrendingUp, DollarSign, Video, Sparkles } from 'lucide-react';
import { useProjects, useRetryResearch } from '../hooks/useProjects';
import SkeletonCard from '../components/ui/SkeletonCard';
import ProjectCard from '../components/projects/ProjectCard';
import CreateProjectModal from '../components/projects/CreateProjectModal';

export default function ProjectsHome() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: projects, isLoading, error } = useProjects();
  const retryResearchMutation = useRetryResearch();

  const totalProjects = projects?.length || 0;
  const publishedCount = projects?.reduce((sum, p) => sum + (p.published_count || 0), 0) || 0;

  const stats = [
    {
      label: 'Total Projects',
      value: String(totalProjects),
      icon: Folder,
      iconBg: 'from-primary-500 to-primary-600',
      iconShadow: 'shadow-primary/20',
    },
    {
      label: 'Videos Published',
      value: String(publishedCount),
      icon: Video,
      iconBg: 'from-emerald-500 to-emerald-600',
      iconShadow: 'shadow-emerald-500/20',
    },
    {
      label: 'Total Revenue',
      value: '$0',
      icon: DollarSign,
      iconBg: 'from-amber-500 to-orange-500',
      iconShadow: 'shadow-amber-500/20',
    },
    {
      label: 'Avg. ROI',
      value: '--',
      icon: TrendingUp,
      iconBg: 'from-violet-500 to-purple-600',
      iconShadow: 'shadow-violet-500/20',
    },
  ];

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Manage your AI video production niches</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`glass-card p-5 animate-slide-up stagger-${i + 1}`}
            style={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {stat.label}
              </span>
              <div className={`metric-card-icon bg-gradient-to-br ${stat.iconBg} ${stat.iconShadow} shadow-md`}>
                <stat.icon className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
            </div>
            <p className="metric-value text-slate-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="glass-card p-8 text-center">
          <p className="text-red-500 dark:text-red-400 font-medium">Failed to load projects</p>
          <p className="text-sm text-text-muted dark:text-text-muted-dark mt-1">
            {error.message || 'Please check your connection and try again.'}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && projects?.length === 0 && (
        <div className="glass-card p-16 text-center animate-fade-in" data-testid="empty-state">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 flex items-center justify-center mx-auto mb-5">
            <Sparkles className="w-7 h-7 text-primary dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            No projects yet
          </h3>
          <p className="text-sm text-text-muted dark:text-text-muted-dark mb-8 max-w-md mx-auto leading-relaxed">
            Create your first project by entering a niche. The system will research it
            automatically and generate optimized topics.
          </p>
          <button onClick={() => setModalOpen(true)} className="btn-primary btn-lg">
            <Plus className="w-5 h-5" />
            Create Your First Project
          </button>
        </div>
      )}

      {/* Project grid */}
      {!isLoading && !error && projects?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project, i) => (
            <div
              key={project.id}
              className={`animate-slide-up stagger-${Math.min(i + 1, 8)}`}
              style={{ opacity: 0 }}
            >
              <ProjectCard
                project={project}
                onRetry={retryResearchMutation.mutate}
              />
            </div>
          ))}

          {/* Add new placeholder */}
          <button
            onClick={() => setModalOpen(true)}
            className="
              rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/[0.08]
              flex flex-col items-center justify-center p-8 min-h-[260px]
              hover:border-primary/40 dark:hover:border-primary/40
              hover:bg-primary/[0.02] dark:hover:bg-primary/[0.02]
              transition-all duration-300 cursor-pointer group
            "
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center mb-3 group-hover:bg-primary/10 dark:group-hover:bg-primary/15 transition-all duration-300 group-hover:scale-110">
              <Plus className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors duration-300" />
            </div>
            <p className="text-sm font-medium text-slate-400 group-hover:text-primary transition-colors duration-300">
              Add New Project
            </p>
          </button>
        </div>
      )}

      <CreateProjectModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
