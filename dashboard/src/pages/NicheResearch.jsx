import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowRight,
  RefreshCw,
  Loader2,
  Globe,
  AlertCircle,
} from 'lucide-react';
import { useProject, useNicheProfile } from '../hooks/useNicheProfile';
import { generateTopics, webhookCall } from '../lib/api';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { SkeletonCard, SkeletonLine } from '../components/ui/SkeletonLoader';
import BlueOceanHero from '../components/research/BlueOceanHero';
import CompetitorCards from '../components/research/CompetitorCards';
import PainPoints from '../components/research/PainPoints';
import KeywordCloud from '../components/research/KeywordCloud';
import PlaylistCards from '../components/research/PlaylistCards';
import RedOceanList from '../components/research/RedOceanList';

/**
 * Niche Research page -- displays all research results after project research completes.
 * Two-column layout: Left (blue-ocean hero, playlists, CTA) | Right (competitors, pain points, keywords, red ocean).
 * Route: /project/:id/research
 */
export default function NicheResearch() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  const { data: project, isLoading: projectLoading, error: projectError } = useProject(projectId);
  const { data: profile, isLoading: profileLoading, error: profileError } = useNicheProfile(projectId);

  const [generating, setGenerating] = useState(false);
  const [reresearchOpen, setReresearchOpen] = useState(false);
  const [reresearching, setReresearching] = useState(false);
  const [topicsExistCount, setTopicsExistCount] = useState(null);
  const [generateMoreOpen, setGenerateMoreOpen] = useState(false);

  const isLoading = projectLoading || profileLoading;
  const error = projectError || profileError;

  // Check if research is still in progress
  const isResearching = project?.status?.startsWith('researching');

  // --- Loading skeleton ---
  if (isLoading) {
    return (
      <div className="animate-in">
        <div className="page-header">
          <SkeletonLine width="w-1/3" height="h-7" />
          <SkeletonLine width="w-1/2" height="h-4" className="mt-2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <SkeletonCard className="h-48" />
            <SkeletonCard className="h-36" />
          </div>
          <div className="space-y-6">
            <SkeletonCard className="h-44" />
            <SkeletonCard className="h-32" />
            <SkeletonCard className="h-28" />
          </div>
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="animate-in">
        <div className="page-header">
          <h1 className="page-title">Niche Research</h1>
        </div>
        <div className="glass-card p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            {error.message || 'Failed to load research data.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // --- Research in progress ---
  if (isResearching) {
    return (
      <div className="animate-in">
        <div className="page-header">
          <h1 className="page-title">{project?.name || 'Niche Research'}</h1>
          <p className="page-subtitle">Researching: {project?.niche}</p>
        </div>
        <div className="glass-card p-10 text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Research in progress...
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Auditing competitors, mining pain points, and analyzing blue-ocean opportunities.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2">
            {['Creating project', 'Auditing competitors', 'Mining pain points', 'Blue-ocean analysis', 'Generating prompts'].map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <span className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Extract data ---
  const blueOcean = profile?.blue_ocean_opportunities || {};
  const competitors = profile?.competitor_analysis || {};
  const painPoints = profile?.audience_pain_points || {};
  const keywords = profile?.keyword_research || {};

  const playlists = [
    project?.playlist1_name && { number: 1, name: project.playlist1_name, theme: project.playlist1_theme },
    project?.playlist2_name && { number: 2, name: project.playlist2_name, theme: project.playlist2_theme },
    project?.playlist3_name && { number: 3, name: project.playlist3_name, theme: project.playlist3_theme },
  ].filter(Boolean);

  const redOceanTopics = project?.niche_red_ocean_topics || [];
  const canGenerateTopics = project?.status === 'ready_for_topics';

  // --- Handlers ---
  const handleGenerateTopics = async () => {
    setGenerating(true);
    try {
      const result = await generateTopics(projectId);
      if (result?.topics_exist) {
        setTopicsExistCount(result.count ?? 0);
        setGenerateMoreOpen(true);
        setGenerating(false);
        return;
      }
      navigate(`/project/${projectId}/topics`);
    } catch {
      setGenerating(false);
    }
  };

  const handleConfirmGenerateMore = async () => {
    setGenerating(true);
    try {
      await webhookCall('topics/generate', { project_id: projectId, force: true });
      setGenerateMoreOpen(false);
      navigate(`/project/${projectId}/topics`);
    } catch {
      setGenerating(false);
    }
  };

  const handleReresearch = async () => {
    setReresearching(true);
    try {
      await webhookCall('project/research', { project_id: projectId });
      setReresearchOpen(false);
    } finally {
      setReresearching(false);
    }
  };

  const handleRegeneratePlaylists = async () => {
    await webhookCall('project/regenerate-playlists', { project_id: projectId });
  };

  // --- Main render ---
  return (
    <div className="animate-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="page-title">{project?.name || 'Niche Research'}</h1>
          {project?.niche && (
            <span className="badge badge-purple">
              <Globe className="w-3 h-3" />
              {project.niche}
            </span>
          )}
          {project?.status && (
            <span className={`badge ${statusBadge(project.status)}`}>
              {formatStatus(project.status)}
            </span>
          )}
        </div>
        <p className="page-subtitle">
          Review niche analysis, competitors, and blue-ocean opportunities
        </p>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Blue-Ocean Hero (most prominent) */}
          <BlueOceanHero
            strategy={project?.niche_blue_ocean_strategy}
            expertiseProfile={project?.niche_expertise_profile}
            valueGaps={blueOcean.value_curve_gaps || blueOcean.unoccupied_angles || []}
          />

          {/* Playlist Cards */}
          <PlaylistCards
            playlists={playlists}
            onRegenerate={handleRegeneratePlaylists}
          />

          {/* Generate Topics CTA */}
          {canGenerateTopics && (
            <button
              onClick={handleGenerateTopics}
              disabled={generating}
              className="
                w-full flex items-center justify-center gap-2
                px-6 py-3.5 rounded-xl text-sm font-semibold
                bg-gradient-to-r from-primary to-indigo-600 text-white
                shadow-md shadow-primary/20
                hover:shadow-lg hover:shadow-primary/30
                transition-all duration-200 cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Topics...
                </>
              ) : (
                <>
                  Generate Topics
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          {/* Re-research button */}
          <div className="flex justify-center">
            <button
              onClick={() => setReresearchOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-research Niche
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          <CompetitorCards competitors={competitors} />
          <PainPoints painPoints={painPoints} />
          <KeywordCloud keywords={keywords} />
          <RedOceanList topics={redOceanTopics} />
        </div>
      </div>

      {/* Re-research confirmation dialog */}
      <ConfirmDialog
        isOpen={reresearchOpen}
        onClose={() => setReresearchOpen(false)}
        onConfirm={handleReresearch}
        title="Re-research Niche"
        message="This will overwrite existing research data including competitors, pain points, keywords, and blue-ocean analysis. This action cannot be undone."
        confirmText="Re-research"
        confirmVariant="danger"
        loading={reresearching}
      />

      {/* Topics exist — generate more confirmation dialog */}
      <ConfirmDialog
        isOpen={generateMoreOpen}
        onClose={() => setGenerateMoreOpen(false)}
        onConfirm={handleConfirmGenerateMore}
        title="Topics Already Exist"
        message={`${topicsExistCount} topic${topicsExistCount !== 1 ? 's' : ''} already exist for this project. Generate 25 more?`}
        confirmText="Generate 25 More"
        confirmVariant="primary"
        loading={generating}
      />
    </div>
  );
}

function statusBadge(status) {
  const map = {
    created: 'badge-blue',
    researching: 'badge-amber',
    researching_complete: 'badge-green',
    ready_for_topics: 'badge-green',
    topics_pending_review: 'badge-amber',
    active: 'badge-green',
    paused: 'badge-red',
  };
  return map[status] || 'badge-blue';
}

function formatStatus(status) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
