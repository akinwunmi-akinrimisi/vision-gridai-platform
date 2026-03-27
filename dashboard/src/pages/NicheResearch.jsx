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
import PageHeader from '../components/shared/PageHeader';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { SkeletonCard, SkeletonLine } from '../components/ui/SkeletonLoader';
import BlueOceanHero from '../components/research/BlueOceanHero';
import CompetitorCards from '../components/research/CompetitorCards';
import PainPoints from '../components/research/PainPoints';
import KeywordCloud from '../components/research/KeywordCloud';
import PlaylistCards from '../components/research/PlaylistCards';
import RedOceanList from '../components/research/RedOceanList';
import StatusBadge from '../components/shared/StatusBadge';
import { Button } from '@/components/ui/button';

/**
 * Niche Research page -- displays all research results after project research completes.
 * Layout: PageHeader, BlueOceanHero, 2-column (Competitors + PainPoints), PlaylistCards, RedOcean, Keywords.
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
      <div className="animate-slide-up">
        <div className="mb-6">
          <SkeletonLine width="w-1/3" height="h-7" />
          <SkeletonLine width="w-1/2" height="h-4" className="mt-2" />
        </div>
        <SkeletonCard className="h-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard className="h-44" />
          <SkeletonCard className="h-44" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-24" />
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="animate-slide-up">
        <PageHeader title="Niche Research" />
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            {error.message || 'Failed to load research data.'}
          </p>
          <Button onClick={() => window.location.reload()} size="sm">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // --- Research in progress ---
  if (isResearching) {
    return (
      <div className="animate-slide-up">
        <PageHeader
          title={project?.name || 'Niche Research'}
          subtitle={`Researching: ${project?.niche}`}
        />
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">
            Research in progress...
          </p>
          <p className="text-sm text-muted-foreground">
            Auditing competitors, mining pain points, and analyzing blue-ocean opportunities.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2">
            {['Creating project', 'Auditing competitors', 'Mining pain points', 'Blue-ocean analysis', 'Generating prompts'].map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
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
    <div className="animate-slide-up">
      {/* Page Header */}
      <PageHeader
        title="Niche Research"
        subtitle={project?.niche || 'Review niche analysis and blue-ocean opportunities'}
      >
        {project?.status && (
          <StatusBadge status={statusToVariant(project.status)} label={formatStatus(project.status)} />
        )}
      </PageHeader>

      {/* 1. Blue-Ocean Hero (full width, most prominent) */}
      <div className="animate-slide-up stagger-1 mb-6" style={{ opacity: 0 }}>
        <BlueOceanHero
          strategy={project?.niche_blue_ocean_strategy}
          expertiseProfile={project?.niche_expertise_profile}
          valueGaps={blueOcean.value_curve_gaps || blueOcean.unoccupied_angles || []}
        />
      </div>

      {/* 2. Two-column grid: Competitors (left) + PainPoints (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="animate-slide-up stagger-2" style={{ opacity: 0 }}>
          <CompetitorCards competitors={competitors} />
        </div>
        <div className="animate-slide-up stagger-3" style={{ opacity: 0 }}>
          <PainPoints painPoints={painPoints} />
        </div>
      </div>

      {/* 3. Playlist Cards (3 in a row) */}
      <div className="animate-slide-up stagger-4 mb-6" style={{ opacity: 0 }}>
        <PlaylistCards
          playlists={playlists}
          onRegenerate={handleRegeneratePlaylists}
        />
      </div>

      {/* 4. RedOcean (collapsible) */}
      <div className="animate-slide-up stagger-5 mb-6" style={{ opacity: 0 }}>
        <RedOceanList topics={redOceanTopics} />
      </div>

      {/* 5. Keyword Cloud */}
      <div className="animate-slide-up stagger-6 mb-6" style={{ opacity: 0 }}>
        <KeywordCloud keywords={keywords} />
      </div>

      {/* Generate Topics CTA */}
      {canGenerateTopics && (
        <div className="animate-slide-up stagger-7 mb-4" style={{ opacity: 0 }}>
          <Button
            onClick={handleGenerateTopics}
            disabled={generating}
            className="w-full bg-gradient-to-r from-primary to-destructive hover:from-primary-hover hover:to-destructive/90 text-white shadow-glow-primary h-11"
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
          </Button>
        </div>
      )}

      {/* Re-research button */}
      <div className="flex justify-center">
        <button
          onClick={() => setReresearchOpen(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Re-research Niche
        </button>
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

      {/* Topics exist -- generate more confirmation dialog */}
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

function statusToVariant(status) {
  const map = {
    created: 'pending',
    researching: 'active',
    researching_complete: 'approved',
    ready_for_topics: 'approved',
    topics_pending_review: 'review',
    active: 'published',
    paused: 'failed',
  };
  return map[status] || 'pending';
}

function formatStatus(status) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
