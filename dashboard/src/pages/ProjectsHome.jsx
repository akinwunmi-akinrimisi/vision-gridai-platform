import { useState } from 'react';
import { Plus, Folder, TrendingUp, DollarSign, Video } from 'lucide-react';
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

  return (
    <div className="animate-in">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div className="page-header mb-0">
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Manage your AI video production niches</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="
            inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
            text-sm font-semibold text-white
            bg-gradient-to-r from-primary to-indigo-600
            shadow-md shadow-primary/20
            hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5
            transition-all duration-200 cursor-pointer
          "
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
        {[
          { label: 'Total Projects', value: String(totalProjects), icon: Folder, color: 'text-primary' },
          { label: 'Videos Published', value: String(publishedCount), icon: Video, color: 'text-emerald-500' },
          { label: 'Total Revenue', value: '$0', icon: DollarSign, color: 'text-cta' },
          { label: 'Avg. ROI', value: '--', icon: TrendingUp, color: 'text-purple-500' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 lg:p-5">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
            <p className="metric-value text-slate-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="glass-card p-8 text-center">
          <p className="text-red-500 dark:text-red-400 font-medium">
            Failed to load projects
          </p>
          <p className="text-sm text-text-muted dark:text-text-muted-dark mt-1">
            {error.message || 'Please check your connection and try again.'}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && projects?.length === 0 && (
        <div className="glass-card p-12 text-center" data-testid="empty-state">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-500/10 dark:from-primary/20 dark:to-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <Folder className="w-8 h-8 text-primary dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            No projects yet
          </h3>
          <p className="text-sm text-text-muted dark:text-text-muted-dark mb-6 max-w-md mx-auto">
            Create your first project by entering a niche. The system will research it automatically and generate optimized topics.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="
              inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
              text-sm font-semibold text-white
              bg-gradient-to-r from-primary to-indigo-600
              shadow-md shadow-primary/20
              hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5
              transition-all duration-200 cursor-pointer
            "
          >
            <Plus className="w-4 h-4" />
            Create Your First Project
          </button>
        </div>
      )}

      {/* Project cards grid */}
      {!isLoading && !error && projects?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onRetry={retryResearchMutation.mutate}
            />
          ))}

          {/* Add new project placeholder */}
          <button
            onClick={() => setModalOpen(true)}
            className="
              rounded-2xl border-2 border-dashed border-border dark:border-border-dark
              flex flex-col items-center justify-center p-8 min-h-[260px]
              hover:border-primary/40 dark:hover:border-primary/40
              hover:bg-primary/[0.02] dark:hover:bg-primary/[0.03]
              transition-all duration-300 cursor-pointer group
            "
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center mb-3 group-hover:bg-primary/10 dark:group-hover:bg-primary/20 transition-colors duration-300">
              <Plus className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors duration-300" />
            </div>
            <p className="text-sm font-medium text-slate-400 group-hover:text-primary transition-colors duration-300">
              Add New Project
            </p>
          </button>
        </div>
      )}

      {/* Create modal */}
      <CreateProjectModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
