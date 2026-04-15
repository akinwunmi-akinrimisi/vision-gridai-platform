import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  Sparkles,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useScript } from '../hooks/useScript';
import { useScenes } from '../hooks/useScenes';
import { useTopics } from '../hooks/useTopics';
import { useProject } from '../hooks/useNicheProfile';
import {
  useGenerateScript,
  useApproveScript,
  useRejectScript,
  useRefineScript,
  useRegenPrompts,
} from '../hooks/useScriptMutations';
import { useAnalyzeHooks } from '../hooks/useHookAnalysis';
import ScorePanel from '../components/script/ScorePanel';
import PassTracker from '../components/script/PassTracker';
import ForcePassBanner from '../components/script/ForcePassBanner';
import ScriptContent from '../components/script/ScriptContent';
import ScriptRefinePanel from '../components/script/ScriptRefinePanel';
import HookAnalyzerTab from '../components/script/HookAnalyzerTab';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const SCRIPT_STATUS_MAP = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  refining: 'scripting',
};

export default function ScriptReview() {
  const { id: projectId, topicId } = useParams();
  const navigate = useNavigate();

  // Data hooks
  const { data: topic, isLoading: topicLoading } = useScript(topicId);
  const { data: scenes, isLoading: scenesLoading } = useScenes(topicId);
  const { data: allTopics } = useTopics(projectId);

  // Mutation hooks
  const generateScript = useGenerateScript(topicId);
  const approveScript = useApproveScript(topicId);
  const rejectScript = useRejectScript(topicId);
  const refineScript = useRefineScript(topicId);
  const regenPrompts = useRegenPrompts(topicId);
  const analyzeHooks = useAnalyzeHooks(topicId, projectId);

  // UI state
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [showRefinePanel, setShowRefinePanel] = useState(false);
  const [activeTab, setActiveTab] = useState('script');

  // Prev/Next navigation among approved topics
  const approvedTopics = useMemo(
    () => (allTopics || []).filter((t) => t.review_status === 'approved'),
    [allTopics]
  );

  const currentIndex = useMemo(
    () => approvedTopics.findIndex((t) => t.id === topicId),
    [approvedTopics, topicId]
  );

  const prevTopic = currentIndex > 0 ? approvedTopics[currentIndex - 1] : null;
  const nextTopic = currentIndex < approvedTopics.length - 1 ? approvedTopics[currentIndex + 1] : null;

  // Determine what to show
  const hasScript = !!(topic?.script_json);
  const isGenerating = topic?.status === 'scripting';
  const isLoading = topicLoading || scenesLoading;
  const anyMutationPending =
    approveScript.isPending || rejectScript.isPending || refineScript.isPending;

  // Handlers
  const handleApprove = useCallback(() => {
    approveScript.mutate({ topic_id: topicId });
  }, [approveScript, topicId]);

  const handleReject = useCallback(() => {
    rejectScript.mutate({ topic_id: topicId, feedback: rejectFeedback });
    setShowRejectDialog(false);
    setRejectFeedback('');
  }, [rejectScript, topicId, rejectFeedback]);

  const handleRefine = useCallback(
    (instructions) => {
      refineScript.mutate({ topic_id: topicId, instructions });
      setShowRefinePanel(false);
    },
    [refineScript, topicId]
  );

  const handleGenerate = useCallback(() => {
    generateScript.mutate({ topic_id: topicId });
  }, [generateScript, topicId]);

  const handleSceneEdit = useCallback(
    (editedScene) => {
      // Scene edits are local for now; actual save goes through direct Supabase update
      // For v1, this is tracked client-side until batch regen
    },
    []
  );

  const handleRegenPrompts = useCallback(
    (sceneIds) => {
      regenPrompts.mutate({ topic_id: topicId, scene_ids: sceneIds });
    },
    [regenPrompts, topicId]
  );

  /* -- Sprint S4: Analyze hooks (CF12) -- */
  const handleAnalyzeHooks = useCallback(async () => {
    try {
      const res = await analyzeHooks.mutateAsync({ force: true });
      if (res?.success === false) {
        toast.error(res.error || 'Hook analysis failed');
      } else {
        toast.success('Hook analysis started');
      }
    } catch (err) {
      toast.error(err?.message || 'Hook analysis failed');
    }
  }, [analyzeHooks]);

  // Loading state
  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-5 w-5 rounded bg-muted animate-pulse" />
          <div className="h-6 w-64 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex gap-0">
          <div className="w-[240px] flex-shrink-0 bg-card/50 border-r border-border p-5 h-[calc(100vh-8rem)] animate-pulse rounded-l-lg" />
          <div className="flex-1 bg-card/30 p-5 h-[calc(100vh-8rem)] animate-pulse rounded-r-lg" />
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="animate-fade-in">
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-sm text-muted-foreground">Topic not found.</p>
          <Link
            to={`/project/${projectId}/topics`}
            className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Topics
          </Link>
        </div>
      </div>
    );
  }

  // Build scenes from either the scenes query or script_json fallback
  const displayScenes = scenes && scenes.length > 0 ? scenes : (topic.script_json?.scenes || []);

  return (
    <div className="animate-fade-in">
      {/* Header bar */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
        {/* Back arrow */}
        <Link
          to={`/project/${projectId}/topics`}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Back to Topics"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Topic number */}
        <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
          {topic.topic_number}
        </span>

        {/* SEO Title */}
        <h1 className="text-sm sm:text-base font-bold tracking-tight flex-1 min-w-0 truncate">
          {topic.seo_title || topic.original_title}
        </h1>

        {/* Playlist angle badge */}
        {topic.playlist_angle && (
          <StatusBadge status="scripting" label={topic.playlist_angle} className="hidden sm:inline-flex" />
        )}

        {/* Script review status badge */}
        {topic.script_review_status && (
          <StatusBadge status={SCRIPT_STATUS_MAP[topic.script_review_status] || 'pending'} label={topic.script_review_status} />
        )}

        {/* Prev/Next arrows */}
        <div className="flex items-center gap-1 ml-auto sm:ml-2">
          <button
            onClick={() => prevTopic && navigate(`/project/${projectId}/topics/${prevTopic.id}/script`)}
            disabled={!prevTopic}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous topic"
            data-testid="prev-topic-btn"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {currentIndex + 1}/{approvedTopics.length}
          </span>
          <button
            onClick={() => nextTopic && navigate(`/project/${projectId}/topics/${nextTopic.id}/script`)}
            disabled={!nextTopic}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next topic"
            data-testid="next-topic-btn"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Generate Script CTA -- when topic approved but no script */}
      {!hasScript && !isGenerating && topic.review_status === 'approved' && (
        <div className="bg-card border border-border rounded-lg p-8 text-center mb-4" data-testid="generate-script-cta">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold mb-2">
            Generate Script
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
            This will generate a 3-pass script (Foundation, Depth, Resolution). Each pass is
            independently scored on 7 dimensions. Estimated time: 8-10 minutes.
          </p>
          <Button
            onClick={handleGenerate}
            disabled={generateScript.isPending}
            size="lg"
          >
            {generateScript.isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate 3-Pass Script
              </>
            )}
          </Button>
        </div>
      )}

      {/* Pass Tracker -- during generation */}
      {isGenerating && !hasScript && (
        <div className="mb-4">
          <PassTracker
            passScores={topic.script_pass_scores}
            status={topic.status}
            attempts={topic.script_attempts || 1}
            startedAt={topic.last_status_change}
            forcePass={topic.script_force_passed === true}
          />
        </div>
      )}

      {/* Script Approved → Go to Production Banner */}
      {hasScript && topic.script_review_status === 'approved' && (
        <div className="bg-success/10 border border-success/30 rounded-lg p-4 flex items-center justify-between gap-3 animate-slide-up mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="text-sm font-semibold text-success">Script Approved</p>
              <p className="text-xs text-muted-foreground">
                Production pipeline has been triggered.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate(`/project/${projectId}/production`)}
          >
            View Production →
          </Button>
        </div>
      )}

      {/* Split-panel layout -- when script exists */}
      {hasScript && (
        <>
          {/* Force Pass Banner */}
          <ForcePassBanner
            score={topic.script_quality_score}
            isVisible={topic.script_force_passed === true}
          />

          {/* Mobile score summary */}
          <div className="md:hidden mb-4">
            <div className="bg-card/50 border border-border rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                  {topic.script_quality_score ?? '--'}
                  <span className="text-xs font-normal text-muted-foreground">/10</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {topic.word_count?.toLocaleString() || '--'} words
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleApprove}
                  disabled={anyMutationPending || topic.script_review_status === 'approved'}
                  size="sm"
                >
                  Approve
                </Button>
                <Button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={anyMutationPending || topic.script_review_status === 'approved'}
                  variant="destructive"
                  size="sm"
                >
                  Reject
                </Button>
                <Button
                  onClick={() => setShowRefinePanel(true)}
                  disabled={anyMutationPending || topic.script_review_status === 'approved'}
                  variant="secondary"
                  size="sm"
                >
                  Refine
                </Button>
              </div>
            </div>
          </div>

          {/* Desktop: split-panel flex layout */}
          <div className="flex gap-0 rounded-lg overflow-hidden border border-border bg-card/30">
            {/* Left: Score Panel (fixed width, border-r, hidden on mobile) */}
            <div className="hidden md:flex md:flex-col md:w-[240px] md:flex-shrink-0 border-r border-border overflow-y-auto scrollbar-thin max-h-[calc(100vh-8rem)]">
              <ScorePanel
                topic={topic}
                onApprove={handleApprove}
                onReject={() => setShowRejectDialog(true)}
                onRefine={() => setShowRefinePanel(true)}
                isLoading={anyMutationPending}
              />
            </div>

            {/* Right: Script Content / Hook Analyzer (flex-1, tabbed) */}
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-8rem)] scrollbar-thin">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="px-4 pt-4">
                  <TabsList>
                    <TabsTrigger value="script" data-testid="tab-script">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="ml-1.5">Script</span>
                    </TabsTrigger>
                    <TabsTrigger value="hooks" data-testid="tab-hooks">
                      <Zap className="w-3.5 h-3.5" />
                      <span className="ml-1.5">Hooks</span>
                      {typeof topic?.weak_hook_count === 'number' &&
                        topic.weak_hook_count > 0 && (
                          <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-sm text-[9px] font-bold bg-warning-bg text-warning border border-warning-border tabular-nums">
                            {topic.weak_hook_count}
                          </span>
                        )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="script" className="mt-0">
                  <ScriptContent
                    scenes={displayScenes}
                    topic={topic}
                    onSceneEdit={handleSceneEdit}
                    onRegenPrompts={handleRegenPrompts}
                  />
                </TabsContent>

                <TabsContent value="hooks" className="mt-0 p-4">
                  <HookAnalyzerTab
                    topic={topic}
                    onAnalyze={handleAnalyzeHooks}
                    isAnalyzing={analyzeHooks.isPending}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </>
      )}

      {/* Reject ConfirmDialog */}
      <ConfirmDialog
        isOpen={showRejectDialog}
        onClose={() => {
          setShowRejectDialog(false);
          setRejectFeedback('');
        }}
        onConfirm={handleReject}
        title="Reject Script"
        message="Are you sure you want to reject this script? You can provide optional feedback."
        confirmText="Reject Script"
        confirmVariant="danger"
        loading={rejectScript.isPending}
      >
        <Textarea
          value={rejectFeedback}
          onChange={(e) => setRejectFeedback(e.target.value)}
          rows={3}
          placeholder="Optional feedback for regeneration..."
          className="mt-3 resize-none bg-muted border-border"
        />
      </ConfirmDialog>

      {/* Refine SidePanel */}
      <ScriptRefinePanel
        isOpen={showRefinePanel}
        onClose={() => setShowRefinePanel(false)}
        topic={topic}
        onSubmit={handleRefine}
        isLoading={refineScript.isPending}
      />
    </div>
  );
}
