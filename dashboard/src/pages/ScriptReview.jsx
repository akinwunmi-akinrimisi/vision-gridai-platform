import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, ChevronLeft, ChevronRight, FileText, Sparkles } from 'lucide-react';
import { useScript } from '../hooks/useScript';
import { useScenes } from '../hooks/useScenes';
import { useTopics } from '../hooks/useTopics';
import {
  useGenerateScript,
  useApproveScript,
  useRejectScript,
  useRefineScript,
  useRegenPrompts,
} from '../hooks/useScriptMutations';
import ScorePanel from '../components/script/ScorePanel';
import PassTracker from '../components/script/PassTracker';
import ForcePassBanner from '../components/script/ForcePassBanner';
import ScriptContent from '../components/script/ScriptContent';
import ScriptRefinePanel from '../components/script/ScriptRefinePanel';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const STATUS_BADGE = {
  pending: 'badge badge-amber',
  scripting: 'badge badge-amber animate-shimmer',
  scripting_complete: 'badge badge-blue',
  approved: 'badge badge-green',
  rejected: 'badge badge-red',
};

const SCRIPT_STATUS_BADGE = {
  pending: 'badge badge-amber',
  approved: 'badge badge-green',
  rejected: 'badge badge-red',
  refining: 'badge badge-amber animate-shimmer',
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

  // UI state
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [showRefinePanel, setShowRefinePanel] = useState(false);

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

  // Loading state
  if (isLoading) {
    return (
      <div className="animate-in">
        <div className="page-header">
          <div className="h-6 w-64 bg-slate-200 dark:bg-white/[0.06] rounded-lg animate-pulse" />
          <div className="h-4 w-48 bg-slate-100 dark:bg-white/[0.03] rounded-lg animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 glass-card p-6 h-96 animate-pulse" />
          <div className="lg:col-span-8 glass-card p-6 h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="animate-in">
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-text-muted dark:text-text-muted-dark">Topic not found.</p>
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
    <div className="animate-in">
      {/* Full-width header bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Back arrow */}
        <Link
          to={`/project/${projectId}/topics`}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Back to Topics"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Topic number */}
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 dark:from-white/[0.08] dark:to-white/[0.04] flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">
          {topic.topic_number}
        </span>

        {/* SEO Title */}
        <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex-1 min-w-0 truncate">
          {topic.seo_title || topic.original_title}
        </h1>

        {/* Playlist angle badge */}
        {topic.playlist_angle && (
          <span className="badge badge-blue">
            {topic.playlist_angle}
          </span>
        )}

        {/* Script review status badge */}
        {topic.script_review_status && (
          <span className={SCRIPT_STATUS_BADGE[topic.script_review_status] || 'badge badge-amber'}>
            {topic.script_review_status}
          </span>
        )}

        {/* Prev/Next arrows */}
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => prevTopic && navigate(`/project/${projectId}/topics/${prevTopic.id}/script`)}
            disabled={!prevTopic}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Previous topic"
            data-testid="prev-topic-btn"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] text-text-muted dark:text-text-muted-dark tabular-nums">
            {currentIndex + 1}/{approvedTopics.length}
          </span>
          <button
            onClick={() => nextTopic && navigate(`/project/${projectId}/topics/${nextTopic.id}/script`)}
            disabled={!nextTopic}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Next topic"
            data-testid="next-topic-btn"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Generate Script CTA -- when topic approved but no script */}
      {!hasScript && !isGenerating && topic.review_status === 'approved' && (
        <div className="glass-card p-8 text-center mb-4" data-testid="generate-script-cta">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Generate Script
          </h2>
          <p className="text-sm text-text-muted dark:text-text-muted-dark max-w-md mx-auto mb-5">
            This will generate a 3-pass script (Foundation, Depth, Resolution). Each pass is
            independently scored on 7 dimensions. Estimated time: 8-10 minutes.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generateScript.isPending}
            className="btn-primary btn-lg"
          >
            {generateScript.isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate 3-Pass Script
              </>
            )}
          </button>
        </div>
      )}

      {/* Pass Tracker -- during generation */}
      {isGenerating && !hasScript && (
        <div className="mb-4">
          <PassTracker
            passScores={topic.script_pass_scores}
            status={topic.status}
            attempts={topic.script_attempts || 1}
          />
        </div>
      )}

      {/* Two-column layout -- when script exists */}
      {hasScript && (
        <>
          {/* Force Pass Banner */}
          <ForcePassBanner
            score={topic.script_quality_score}
            isVisible={topic.script_force_passed === true}
          />

          {/* Desktop: two columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Mobile score summary (compact) */}
            <div className="lg:hidden">
              <div className="glass-card p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    {topic.script_quality_score ?? '--'}
                    <span className="text-xs font-normal text-text-muted dark:text-text-muted-dark">/10</span>
                  </span>
                  <span className="text-xs text-text-muted dark:text-text-muted-dark">
                    {topic.word_count?.toLocaleString() || '--'} words
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={anyMutationPending || topic.script_review_status === 'approved'}
                    className="btn-success btn-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setShowRejectDialog(true)}
                    disabled={anyMutationPending || topic.script_review_status === 'approved'}
                    className="btn-danger btn-sm"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setShowRefinePanel(true)}
                    disabled={anyMutationPending || topic.script_review_status === 'approved'}
                    className="btn-secondary btn-sm"
                  >
                    Refine
                  </button>
                </div>
              </div>
            </div>

            {/* Left: Score Panel (sticky, desktop only) */}
            <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-thin">
              <ScorePanel
                topic={topic}
                onApprove={handleApprove}
                onReject={() => setShowRejectDialog(true)}
                onRefine={() => setShowRefinePanel(true)}
                isLoading={anyMutationPending}
              />
            </div>

            {/* Right: Script Content */}
            <div className="lg:col-span-8">
              <ScriptContent
                scenes={displayScenes}
                topic={topic}
                onSceneEdit={handleSceneEdit}
                onRegenPrompts={handleRegenPrompts}
              />
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
        <textarea
          value={rejectFeedback}
          onChange={(e) => setRejectFeedback(e.target.value)}
          rows={3}
          placeholder="Optional feedback for regeneration..."
          className="input mt-3 resize-none"
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
