import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Activity, Play, StopCircle, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';

import { useTopics } from '../hooks/useTopics';
import { useProductionProgress } from '../hooks/useProductionProgress';
import { useProductionMutations } from '../hooks/useProductionMutations';
import { useProductionLog } from '../hooks/useProductionLog';

import PageHeader from '../components/shared/PageHeader';
import HeroCard from '../components/shared/HeroCard';
import StageProgress from '../components/production/StageProgress';
import DotGrid from '../components/production/DotGrid';
import CostBreakdown from '../components/production/CostBreakdown';
import QueueList from '../components/production/QueueList';
import FailedScenes from '../components/production/FailedScenes';
import ActivityLog from '../components/production/ActivityLog';
import SupervisorAlert from '../components/production/SupervisorAlert';
import SceneDetailPanel from '../components/production/SceneDetailPanel';
import ErrorLogModal from '../components/production/ErrorLogModal';
import CostEstimateDialog from '../components/production/CostEstimateDialog';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function formatElapsed(ms) {
  if (!ms || ms < 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatEta(ms) {
  if (!ms || ms <= 0) return '--';
  const totalMin = Math.ceil(ms / 60000);
  if (totalMin < 60) return `~${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `~${h}h ${m}m`;
}

export default function ProductionMonitor() {
  const { id: projectId } = useParams();
  const [searchParams] = useSearchParams();

  const [showCostDialog, setShowCostDialog] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [restartText, setRestartText] = useState('');
  const [supervisorDismissed, setSupervisorDismissed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [selectedScene, setSelectedScene] = useState(null);
  const [showErrorLog, setShowErrorLog] = useState(false);

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

  // Overall progress
  const overallPct = useMemo(() => {
    if (!scenes.length) return 0;
    const done = scenes.filter(
      (s) => s.clip_status === 'complete' || s.clip_status === 'uploaded'
    ).length;
    return Math.round((done / scenes.length) * 100);
  }, [scenes]);

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
    <div className="animate-slide-up space-y-6">
      <PageHeader
        title="Production Monitor"
        subtitle="Real-time pipeline progress with scene-level tracking"
      />

      {/* Supervisor Alert */}
      {supervisorAlerted && (
        <SupervisorAlert visible={true} onDismiss={() => setSupervisorDismissed(true)} />
      )}

      {/* ACTIVE / STOPPED PRODUCTION */}
      {currentTopic ? (
        <>
          {/* Active Production Hero */}
          <HeroCard>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">
                    Now Producing
                  </span>
                  <span className="text-2xs text-muted-foreground tabular-nums">
                    #{currentTopic.topic_number}
                  </span>
                </div>
                <h2 className="text-base font-bold tracking-tight truncate">
                  {currentTopic.seo_title || 'Untitled Topic'}
                </h2>
              </div>

              {activeTopic && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowStopDialog(true)}
                  className="gap-1.5 flex-shrink-0"
                  data-testid="stop-production-btn"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  Stop
                </Button>
              )}
            </div>

            {/* Overall progress */}
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-xl font-bold text-primary tabular-nums">
                {overallPct}%
              </span>
              <span className="text-xs text-muted-foreground">
                {formatEta(eta)} remaining
              </span>
              <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                {formatElapsed(elapsed)}
              </span>
            </div>

            {/* Stage progress bar */}
            <StageProgress stageProgress={stageProgress} />
          </HeroCard>

          {/* Stopped state controls */}
          {stoppedTopic && !activeTopic && (
            <div className="bg-card border border-danger-border rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-danger-bg flex items-center justify-center">
                  <StopCircle className="w-4 h-4 text-danger" />
                </div>
                <h3 className="text-sm font-bold">Production Stopped</h3>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
                <Button size="sm" onClick={handleResumeProduction} className="gap-1.5">
                  <Play className="w-3.5 h-3.5" />
                  Resume
                </Button>
                <div className="flex items-center gap-2">
                  <Input
                    value={restartText}
                    onChange={(e) => setRestartText(e.target.value)}
                    placeholder="Type RESTART"
                    className="w-32 sm:w-40 h-9 text-xs"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRestartProduction}
                    disabled={restartText !== 'RESTART'}
                    className="gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restart
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* DotGrid */}
          {scenes.length > 0 && (
            <DotGrid scenes={scenes} onSceneClick={setSelectedScene} />
          )}

          {/* Failed Scenes */}
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

          {/* 2-column grid: Cost + Queue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CostBreakdown
              cost={currentTopic.total_cost}
              breakdown={currentTopic.cost_breakdown || {}}
            />
            <QueueList queuedTopics={queuedTopics} onRemove={handleRemoveFromQueue} />
          </div>

          {/* Recently completed */}
          {completedTopics.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 sm:p-6" data-testid="recently-completed">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <h3 className="text-sm font-semibold">Recently Completed</h3>
              </div>
              <div className="space-y-2">
                {completedTopics.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-success-bg border border-success-border"
                  >
                    <span className="text-2xs font-bold text-success tabular-nums">
                      #{t.topic_number}
                    </span>
                    <span className="text-xs font-medium text-foreground/80 flex-1 truncate">
                      {t.seo_title}
                    </span>
                    {t.total_cost != null && (
                      <span className="text-2xs tabular-nums text-muted-foreground">
                        ${t.total_cost.toFixed(2)}
                      </span>
                    )}
                    {t.scene_count && (
                      <span className="text-2xs text-muted-foreground">
                        {t.scene_count} scenes
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Log button */}
          {currentTopic && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowErrorLog(true)}
                className="gap-1.5 text-danger"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Error Log
              </Button>
            </div>
          )}

          {/* Activity log */}
          <ActivityLog logs={logs} />
        </>
      ) : (
        /* EMPTY STATE */
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <Activity className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold mb-2">
            No Active Production
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {scriptApprovedTopics.length > 0
              ? `${scriptApprovedTopics.length} topic${scriptApprovedTopics.length !== 1 ? 's' : ''} ready for production`
              : 'Approve topics and scripts to start production'}
          </p>
          {scriptApprovedTopics.length > 0 && (
            <Button
              data-testid="start-production-cta"
              onClick={() => setShowCostDialog(true)}
              size="lg"
              className="gap-2"
            >
              <Play className="w-5 h-5" />
              Start Production
            </Button>
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

      <SceneDetailPanel
        scene={selectedScene}
        isOpen={!!selectedScene}
        onClose={() => setSelectedScene(null)}
        onRetry={handleRetryScene}
        onSkip={handleSkipScene}
      />

      <ErrorLogModal
        isOpen={showErrorLog}
        onClose={() => setShowErrorLog(false)}
        topicId={currentTopic?.id || null}
      />
    </div>
  );
}
