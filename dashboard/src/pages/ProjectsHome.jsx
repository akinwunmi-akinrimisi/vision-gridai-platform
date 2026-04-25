import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router';
import { Plus, Folder, TrendingUp, DollarSign, Video, Sparkles } from 'lucide-react';
import { useProjects, useRetryResearch, useDeleteProject } from '../hooks/useProjects';
import { useNicheHealthHistoryBatch } from '../hooks/useAnalyticsIntelligence';
import { useCountryTab } from '../hooks/useCountryTab';
import PageHeader from '../components/shared/PageHeader';
import KPICard from '../components/shared/KPICard';
import EmptyState from '../components/shared/EmptyState';
import ProjectCard from '../components/projects/ProjectCard';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import { Button } from '@/components/ui/button';

export default function ProjectsHome() {
  const [modalOpen, setModalOpen] = useState(false);
  const location = useLocation();

  // Auto-open CreateProjectModal when navigated from Research "Use This Topic"
  useEffect(() => {
    if (location.state?.openCreateModal) {
      setModalOpen(true);
      // Clear the state so refreshing doesn't re-open
      window.history.replaceState({}, '');
    }
  }, [location.state]);
  const { data: allProjects, isLoading, error } = useProjects();
  const retryResearchMutation = useRetryResearch();
  const deleteProjectMutation = useDeleteProject();
  const { country } = useCountryTab();

  // Filter projects by active country tab. Projects without country_target
  // (legacy rows) read as 'GENERAL'.
  const projects = useMemo(() => {
    if (!allProjects) return allProjects;
    return allProjects.filter(
      (p) => (p.country_target || 'GENERAL') === country
    );
  }, [allProjects, country]);

  // Sprint S7: batch-fetch niche health history (last 8 weeks) for every
  // project in a single Supabase call — avoids N+1 queries.
  const projectIds = useMemo(() => (projects || []).map((p) => p.id), [projects]);
  const { data: healthHistoryByProject = {} } = useNicheHealthHistoryBatch(
    projectIds,
    { weeks: 8 },
  );

  const totalProjects = projects?.length || 0;
  const publishedCount = projects?.reduce((sum, p) => {
    const ts = p.topics_summary || [];
    return sum + ts.filter((t) => t.status === 'published').length;
  }, 0) || 0;

  // Aggregate financials from topic summaries
  const totalRevenue = projects?.reduce((sum, p) => {
    const ts = p.topics_summary || [];
    return sum + ts.reduce((s, t) => s + (parseFloat(t.yt_estimated_revenue) || 0), 0);
  }, 0) || 0;
  const totalSpend = projects?.reduce((sum, p) => {
    const ts = p.topics_summary || [];
    return sum + ts.reduce((s, t) => s + (parseFloat(t.total_cost) || 0), 0);
  }, 0) || 0;
  const avgRoi = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(1) : '--';

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <PageHeader
        title="Projects"
        subtitle="Manage your AI video production channels"
      >
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-primary to-destructive hover:from-primary-hover hover:to-destructive/90 text-white shadow-glow-primary"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Project</span>
          <span className="sm:hidden">New</span>
        </Button>
      </PageHeader>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 sm:mb-8">
        <div className="animate-slide-up stagger-1" style={{ opacity: 0 }}>
          <KPICard
            label="Total Projects"
            value={String(totalProjects)}
            icon={Folder}
          />
        </div>
        <div className="animate-slide-up stagger-2" style={{ opacity: 0 }}>
          <KPICard
            label="Videos Published"
            value={String(publishedCount)}
            icon={Video}
          />
        </div>
        <div className="animate-slide-up stagger-3" style={{ opacity: 0 }}>
          <KPICard
            label="Total Revenue"
            value={totalRevenue > 0 ? `$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '$0'}
            icon={DollarSign}
            className="[&_.text-2xl]:text-accent"
          />
        </div>
        <div className="animate-slide-up stagger-4" style={{ opacity: 0 }}>
          <KPICard
            label="Avg. ROI"
            value={avgRoi === '--' ? '--' : `${avgRoi}x`}
            icon={TrendingUp}
            className="[&_.text-2xl]:text-success"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-5 min-h-[180px] animate-pulse"
            >
              <div className="h-2 w-full bg-gradient-to-r from-primary to-destructive rounded-full mb-4 opacity-30" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-muted" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
              <div className="h-3 bg-muted rounded w-1/2 mb-3" />
              <div className="flex gap-4">
                <div className="h-3 bg-muted rounded w-1/4" />
                <div className="h-3 bg-muted rounded w-1/4" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="bg-card border border-danger-border rounded-xl p-8 text-center">
          <p className="text-danger font-medium">Failed to load projects</p>
          <p className="text-sm text-muted-foreground mt-1">
            {error.message || 'Please check your connection and try again.'}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && projects?.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title="No projects yet"
          description="Create your first project by entering a niche. The system will research it automatically and generate optimized topics."
          action={
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-gradient-to-r from-primary to-destructive hover:from-primary-hover hover:to-destructive/90 text-white shadow-glow-primary"
            >
              <Plus className="w-5 h-5" />
              Create Your First Project
            </Button>
          }
        />
      )}

      {/* Project grid */}
      {!isLoading && !error && projects?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project, i) => (
            <div
              key={project.id}
              className={`animate-slide-up stagger-${Math.min(i + 1, 8)}`}
              style={{ opacity: 0 }}
            >
              <ProjectCard
                project={project}
                onRetry={retryResearchMutation.mutate}
                onDelete={(projectId) => deleteProjectMutation.mutate(projectId)}
                isDeleting={deleteProjectMutation.isPending}
                healthHistory={healthHistoryByProject[project.id]}
              />
            </div>
          ))}

          {/* Dashed placeholder card */}
          <div
            onClick={() => setModalOpen(true)}
            className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center min-h-[180px] cursor-pointer hover:border-border-hover transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
              <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span className="text-sm text-muted-foreground group-hover:text-primary/80 transition-colors">
              Create new project
            </span>
          </div>
        </div>
      )}

      <CreateProjectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        prefillNiche={location.state?.prefillNiche}
        prefillDescription={location.state?.prefillDescription}
        analysisIds={location.state?.analysisIds}
      />
    </div>
  );
}
