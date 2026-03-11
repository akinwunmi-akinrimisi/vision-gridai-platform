import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Activity, Play, StopCircle, RotateCcw, CheckCircle2 } from 'lucide-react';

import { useTopics } from '../hooks/useTopics';
import { useProductionProgress } from '../hooks/useProductionProgress';
import { useProductionMutations } from '../hooks/useProductionMutations';
import { useProductionLog } from '../hooks/useProductionLog';

import HeroCard from '../components/production/HeroCard';
import DotGrid from '../components/production/DotGrid';
import QueueList from '../components/production/QueueList';
import FailedScenes from '../components/production/FailedScenes';
import ActivityLog from '../components/production/ActivityLog';
import CostEstimateDialog from '../components/production/CostEstimateDialog';
import SupervisorAlert from '../components/production/SupervisorAlert';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function ProductionMonitor() {
  const { id: projectId } = useParams();
  const [searchParams] = useSearchParams();

  const [showCostDialog, setShowCostDialog] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [restartText, setRestartText] = useState('');
  const [supervisorDismissed, setSupervisorDismissed] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const { data: topics = [], isLoading } = useTopics(projectId);
  const mutations = useProductionMutations(projectId);

  const activeTopic = useMemo(() => topics.find((t) => t.status === 'producing'), [topics]);
  const stoppedTopic = useMemo(() => topics.find((t) => t.status === 'stopped'), [topics]);
  const queuedTopics = useMemo(
    () => topics.filter((t) => t.status === 'queued').sort((a, b) => a.topic_number - b.topic_number),
    [topics]
  );
  const completedTopics = useMemo(
    () => topics.filter((t) => t.status === 'assembled').slice(-3).reverse(),
    [topics]
  );
  const scriptApprovedTopics = useMemo(
    () => topics.filter((t) => t.status === 'script_approved'),
    [topics]
  );

  const currentTopic = activeTopic || stoppedTopic;

  const { scenes, stageProgress, failedScenes: hookFailedScenes, isLoading: scenesLoading } =
    useProductionProgress(currentTopic?.id || null);
  const { logs } = useProductionLog(currentTopic?.id || null);

  const failedScenes = useMemo(() => {
    if (hookFailedScenes && hookFailedScenes.length > 0) return hookFailedScenes;
    return scenes.filter(
      (s) => s.audio_status === 'failed' || s.image_status === 'failed' || s.video_status === 'failed'
    );
  }, [hookFailedScenes, scenes]);

  useEffect(() => {
    if (!activeTopic?.last_status_change) { setElapsed(0); return; }
    const start = new Date(activeTopic.last_status_change).getTime();
    const tick = () => setElapsed(Date.now() - start);
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeTopic?.last_status_change]);

  useEffect(() => {
    const trigger = searchParams.get('trigger');
    if (trigger && scriptApprovedTopics.length > 0) setShowCostDialog(true);
  }, [searchParams, scriptApprovedTopics.length]);

  const supervisorAlerted = currentTopic?.supervisor_alerted && !supervisorDismissed;

  const eta = useMemo(() => {
    if (!stageProgress || !elapsed || elapsed <= 0) return null;
    const totalScenes = scenes.length || 1;
    const doneScenes = scenes.filter(
      (s) => s.clip_status === 'complete' || s.clip_status === 'uploaded'
    ).length;
    if (doneScenes === 0) return null;
    return ((totalScenes - doneScenes) / doneScenes) * elapsed;
  }, [stageProgress, elapsed, scenes]);

  // Handlers
  const handleStartProduction = () => {
    if (scriptApprovedTopics.length > 0) {
      const ids = scriptApprovedTopics.map((t) => t.id);
      if (mutations.triggerProductionBatch) {
        mutations.triggerProductionBatch.mutate({ topic_ids: ids });
      } else {
        ids.forEach((id) => mutations.triggerProduction.mutate({ topic_id: id }));
      }
    }
    setShowCostDialog(false);
  };

  const handleStopProduction = () => {
    if (activeTopic) mutations.stopProduction.mutate({ topic_id: activeTopic.id });
    setShowStopDialog(false);
  };

  const handleResumeProduction = () => {
    if (stoppedTopic) mutations.resumeProduction.mutate({ topic_id: stoppedTopic.id });
  };

  const handleRestartProduction = () => {
    if (stoppedTopic && restartText === 'RESTART') {
      if (mutations.restartProduction) mutations.restartProduction.mutate({ topic_id: stoppedTopic.id });
      setRestartText('');
    }
  };

  const handleRemoveFromQueue = (topicId) => {
    mutations.stopProduction.mutate({ topic_id: topicId });
  };

  const handleRetryScene = (sceneId) => {
    mutations.retryScene.mutate({ scene_id: sceneId, topic_id: currentTopic?.id });
  };

  const handleSkipScene = (sceneId) => {
    mutations.skipScene.mutate({ scene_id: sceneId, reason: 'User skipped', topic_id: currentTopic?.id });
  };

  const handleEditRetryScene = (sceneId, imagePrompt) => {
    if (mutations.editAndRetryScene) {
      mutations.editAndRetryScene.mutate({ scene_id: sceneId, image_prompt: imagePrompt, topic_id: currentTopic?.id });
    }
  };

  const handleRetryAllFailed = () => {
    if (mutations.retryAllFailed) mutations.retryAllFailed.mutate({ topic_id: currentTopic?.id });
  };

  const handleSkipAllFailed = () => {
    if (mutations.skipAllFailed) mutations.skipAllFailed.mutate({ topic_id: currentTopic?.id });
  };

  return (
    <div className="animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">Production Monitor</h1>
        <p className="page-subtitle">Real-time pipeline progress with scene-level tracking</p>
      </div>

      {/* Supervisor Alert */}
      {supervisorAlerted && (
        <div data-testid="supervisor-alert">
          <SupervisorAlert visible={true} onDismiss={() => setSupervisorDismissed(true)} />
        </div>
      )}

      {/* ACTIVE / STOPPED PRODUCTION */}
      {currentTopic ? (
        <>
          <HeroCard
            topic={currentTopic}
            stageProgress={stageProgress}
            elapsed={elapsed}
            eta={eta}
            cost={currentTopic.total_cost}
            onStop={activeTopic ? () => setShowStopDialog(true) : undefined}
          />

          {/* Stopped state controls */}
          {stoppedTopic && !activeTopic && (
            <div className="glass-card p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <StopCircle className="w-4 h-4 text-red-500" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Production Stopped</h3>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={handleResumeProduction} className="btn-primary btn-sm">
                  <Play className="w-3.5 h-3.5" />
                  Resume
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={restartText}
                    onChange={(e) => setRestartText(e.target.value)}
                    placeholder="Type RESTART"
                    className="input w-40 !py-1.5 text-xs"
                  />
                  <button
                    onClick={handleRestartProduction}
                    disabled={restartText !== 'RESTART'}
                    className="btn-danger btn-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restart
                  </button>
                </div>
              </div>
            </div>
          )}

          {scenes.length > 0 && <DotGrid scenes={scenes} />}

          {failedScenes && failedScenes.length > 0 && (
            <FailedScenes
              scenes={failedScenes}
              onRetry={handleRetryScene}
              onSkip={handleSkipScene}
              onEditRetry={handleEditRetryScene}
              onRetryAll={handleRetryAllFailed}
              onSkipAll={handleSkipAllFailed}
            />
          )}

          {queuedTopics.length > 0 && (
            <QueueList queuedTopics={queuedTopics} onRemove={handleRemoveFromQueue} />
          )}

          {completedTopics.length > 0 && (
            <div data-testid="recently-completed" className="glass-card p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <h3 className="section-title text-sm">Recently Completed</h3>
              </div>
              <div className="space-y-2">
                {completedTopics.map((t) => (
                  <div
                    key={t.id}
                    className="
                      flex items-center gap-3 px-3 py-2.5 rounded-xl
                      bg-emerald-50/50 dark:bg-emerald-500/[0.04]
                      border border-emerald-200/40 dark:border-emerald-500/10
                    "
                  >
                    <span className="badge badge-green text-2xs">#{t.topic_number}</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-1 truncate">
                      {t.seo_title}
                    </span>
                    {t.total_cost != null && (
                      <span className="text-2xs tabular-nums text-slate-400 dark:text-slate-500">
                        ${t.total_cost.toFixed(2)}
                      </span>
                    )}
                    {t.scene_count && (
                      <span className="text-2xs text-slate-400 dark:text-slate-500">
                        {t.scene_count} scenes
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <ActivityLog logs={logs} />
        </>
      ) : (
        /* EMPTY STATE */
        <div className="glass-card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 dark:from-primary/15 dark:to-accent/15 flex items-center justify-center mx-auto mb-5">
            <Activity className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            No Active Production
          </h2>
          <p className="text-sm text-text-muted dark:text-text-muted-dark mb-6">
            {scriptApprovedTopics.length > 0
              ? `${scriptApprovedTopics.length} topic${scriptApprovedTopics.length !== 1 ? 's' : ''} ready for production`
              : 'Approve topics and scripts to start production'}
          </p>
          {scriptApprovedTopics.length > 0 && (
            <button
              data-testid="start-production-cta"
              onClick={() => setShowCostDialog(true)}
              className="btn-primary btn-lg"
            >
              <Play className="w-5 h-5" />
              Start Production
            </button>
          )}
        </div>
      )}

      <CostEstimateDialog
        isOpen={showCostDialog}
        onClose={() => setShowCostDialog(false)}
        onConfirm={handleStartProduction}
        topics={scriptApprovedTopics}
      />

      <ConfirmDialog
        isOpen={showStopDialog}
        onClose={() => setShowStopDialog(false)}
        onConfirm={handleStopProduction}
        title="Stop Production"
        message={`Are you sure you want to stop production for "${activeTopic?.seo_title}"? Completed scenes will be kept.${activeTopic?.total_cost ? ` $${activeTopic.total_cost.toFixed(2)} already spent.` : ''}`}
        confirmText="Stop Production"
        confirmVariant="danger"
      />
    </div>
  );
}
