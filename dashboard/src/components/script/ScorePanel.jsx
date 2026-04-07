import { useState, useMemo, useCallback } from 'react';
import { Check, X, RefreshCw, ChevronDown, User, Youtube, BarChart3, Activity, Volume2, ImageIcon, Film, Clock, RotateCcw, Square, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { webhookCall } from '../../lib/api';

const SCORE_DIMENSIONS = [
  { key: 'word_count_compliance', label: 'Word Count', weight: 1.5 },
  { key: 'citation_density', label: 'Citation Density', weight: 1.2 },
  { key: 'narrative_structure', label: 'Narrative Structure', weight: 1.3 },
  { key: 'actionable_specificity', label: 'Actionable Specificity', weight: 1.0 },
  { key: 'retention_engineering', label: 'Retention Engineering', weight: 1.2 },
  { key: 'format_compliance', label: 'Format Compliance', weight: 1.0 },
  { key: 'anti_pattern_compliance', label: 'Anti-Pattern Check', weight: 1.0 },
];

const AVATAR_FIELDS = [
  { key: 'avatar_name_age', label: 'Name & Age' },
  { key: 'occupation_income', label: 'Occupation & Income' },
  { key: 'life_stage', label: 'Life Stage' },
  { key: 'pain_point', label: 'Pain Point' },
  { key: 'spending_profile', label: 'Spending Profile' },
  { key: 'knowledge_level', label: 'Knowledge Level' },
  { key: 'emotional_driver', label: 'Emotional Driver' },
  { key: 'online_hangouts', label: 'Online Hangouts' },
  { key: 'objection', label: 'Objection' },
  { key: 'dream_outcome', label: 'Dream Outcome' },
];

/** Parse progress strings like "done:47/170", "pending", "complete" */
function parseProgress(progressStr) {
  if (!progressStr || progressStr === 'pending') return { done: 0, total: 0, pct: 0, status: 'pending' };
  if (progressStr === 'complete') return { done: 1, total: 1, pct: 100, status: 'complete' };
  const match = progressStr.match(/done:(\d+)\/(\d+)/);
  if (match) {
    const done = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0, status: 'running' };
  }
  return { done: 0, total: 0, pct: 0, status: progressStr };
}

const PIPELINE_STAGES = [
  { key: 'scripting', label: 'Script', match: ['scripting', 'script_approved'] },
  { key: 'audio', label: 'Audio', match: ['audio'] },
  { key: 'images', label: 'Images', match: ['images'] },
  { key: 'assembly', label: 'Assembly', match: ['assembly', 'assembling'] },
  { key: 'assembled', label: 'Done', match: ['assembled', 'review', 'uploading', 'published'] },
];

const PRODUCTION_STATUSES = new Set([
  'audio', 'images', 'video', 'assembly', 'assembled', 'review', 'uploading', 'published',
  'scripting', 'script_approved', 'assembling', 'failed', 'stopped',
]);

function scoreBarColor(score) {
  if (score >= 8) return 'bg-success';
  if (score >= 7) return 'bg-accent';
  return 'bg-danger';
}

/**
 * Collapsible section with chevron toggle.
 */
function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          {Icon && <Icon className="w-3 h-3" />}
          {title}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

/**
 * ScorePanel -- Fixed-width left column for the Script Review split-panel.
 * Displays quality score, 7 dimension bars, metadata, and action buttons.
 */
export default function ScorePanel({ topic, onApprove, onReject, onRefine, isLoading }) {
  const [stageLoading, setStageLoading] = useState(null);

  const triggerStage = useCallback(async (stage) => {
    setStageLoading(stage);
    try {
      const endpoints = {
        audio: 'production/trigger',
        images: 'production/images',
        assembly: 'production/assembly',
        classify: 'classify-scenes',
      };
      const endpoint = endpoints[stage];
      if (!endpoint) throw new Error('Unknown stage: ' + stage);
      await webhookCall(endpoint, { topic_id: topic.id, stage });
      toast.success('Triggered ' + stage + ' stage');
    } catch (e) {
      toast.error('Failed to trigger ' + stage + ': ' + (e.message || 'Unknown error'));
    } finally {
      setStageLoading(null);
    }
  }, [topic?.id]);

  const cancelStage = useCallback(async () => {
    setStageLoading('cancel');
    try {
      await webhookCall('production/trigger', { topic_id: topic.id, action: 'stop' });
      toast.success('Stop signal sent');
    } catch (e) {
      toast.error('Failed to stop: ' + (e.message || 'Unknown error'));
    } finally {
      setStageLoading(null);
    }
  }, [topic?.id]);

  if (!topic) return null;

  const passScores = topic.script_pass_scores;
  const overallScore = topic.script_quality_score ?? null;
  const avatar = topic.avatars?.[0] || {};
  const videoMeta = topic.script_metadata?.video_metadata || {};
  const isApproved = topic.script_review_status === 'approved';
  const buttonsDisabled = isLoading || isApproved || !overallScore;

  const sceneCount = topic.scene_count ?? topic.script_json?.scenes?.length ?? null;

  // Compute average dimensions across all 3 passes (v1.0 format)
  const passes = [passScores?.pass_1, passScores?.pass_2, passScores?.pass_3].filter(Boolean);
  const dimensions = {};
  if (passes.length > 0) {
    for (const dim of SCORE_DIMENSIONS) {
      const values = passes.map(p => {
        const raw = p.scores?.[dim.key];
        return typeof raw === 'object' ? raw?.score : raw;
      }).filter(v => v != null);
      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        // Collect all notes
        const notes = passes.map(p => {
          const raw = p.scores?.[dim.key];
          return typeof raw === 'object' ? raw?.note : null;
        }).filter(Boolean);
        dimensions[dim.key] = { score: Math.round(avg * 10) / 10, note: notes[0] || null };
      }
    }
  }

  // Total attempts across all passes
  const totalAttempts = passes.reduce((sum, p) => sum + (p?.attempts || 1), 0);

  const aboveThreshold = overallScore != null && overallScore >= 7.0;

  return (
    <div className="bg-card/50 p-5 flex flex-col h-full" data-testid="score-panel">
      {/* Quality Score */}
      <div className="mb-5">
        <p className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent" data-testid="overall-score">
          {overallScore != null ? overallScore : '--'}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">/10 quality score</p>
        {overallScore != null && (
          <p className={`text-[10px] mt-1 ${aboveThreshold ? 'text-success' : 'text-danger'}`}>
            {aboveThreshold ? '--- Above threshold (7.0)' : '--- Below threshold (7.0)'}
          </p>
        )}
      </div>

      {/* 7 Dimension Bars */}
      <div className="space-y-2.5" data-testid="dimension-bars">
        {SCORE_DIMENSIONS.map((dim) => {
          // Support both old (flat number) and new (object with score+note) formats
          const raw = dimensions[dim.key];
          const score = typeof raw === 'object' ? raw?.score : raw;
          const note = typeof raw === 'object' ? raw?.note : null;
          const feedback = note || null;
          return (
            <div key={dim.key} data-testid={`dimension-${dim.key}`} className="group relative">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-muted-foreground">
                  {dim.label}
                  {dim.weight !== 1.0 && (
                    <span className="ml-1 text-muted-foreground/50">{dim.weight}x</span>
                  )}
                </span>
                <span className="text-[10px] font-semibold text-accent tabular-nums">
                  {score != null ? score : '--'}
                </span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                {score != null && (
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${scoreBarColor(score)}`}
                    style={{ width: `${(score / 10) * 100}%` }}
                    data-testid={`bar-${dim.key}`}
                  />
                )}
              </div>
              {/* Note text below bar */}
              {note && (
                <p className="text-[9px] text-muted-foreground/70 mt-0.5 leading-tight line-clamp-2">
                  {note}
                </p>
              )}
              {/* Hover tooltip with full evaluator feedback */}
              {feedback && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 hidden group-hover:block">
                  <div className="bg-popover text-popover-foreground text-[10px] rounded-md px-3 py-2 shadow-lg leading-relaxed max-w-[220px] border border-border">
                    {feedback}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats Section */}
      <div className="border-t border-border mt-4 pt-4 space-y-2.5" data-testid="metadata-grid">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Words</span>
          <span className="text-xs font-semibold">
            {topic.word_count ? topic.word_count.toLocaleString() : '--'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Scenes</span>
          <span className="text-xs font-semibold">
            {sceneCount ?? '--'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Total Attempts</span>
          <span className="text-xs font-semibold">
            {totalAttempts} (across 3 passes)
          </span>
        </div>
      </div>

      {/* Production Progress — visible when topic is in production */}
      {PRODUCTION_STATUSES.has(topic.status) && (
        <div className="border-t border-border mt-4 pt-4" data-testid="production-progress">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-3.5 h-3.5 text-accent animate-pulse" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Production</span>
          </div>

          {/* Pipeline stage indicator */}
          {(() => {
            const currentStageIdx = PIPELINE_STAGES.findIndex(s => s.match.includes(topic.status));
            return (
              <>
                <div className="flex items-center gap-1 mb-1.5">
                  {PIPELINE_STAGES.map((stage, i) => {
                    const isCurrent = i === currentStageIdx;
                    const isDone = i < currentStageIdx;
                    return (
                      <div key={stage.key} className="flex-1 flex flex-col items-center gap-0.5">
                        <div
                          className={`w-full h-1.5 rounded-full transition-all duration-300 ${
                            isCurrent ? 'bg-accent animate-pulse' :
                            isDone ? 'bg-success' : 'bg-muted'
                          }`}
                        />
                        <span className={`text-[8px] ${isCurrent ? 'text-accent font-semibold' : isDone ? 'text-success/70' : 'text-muted-foreground/50'}`}>
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">
                  Status: <span className="text-foreground font-semibold capitalize">{topic.status.replace(/_/g, ' ')}</span>
                  {topic.status === 'failed' && <span className="text-danger ml-1">(failed)</span>}
                </p>
              </>
            );
          })()}

          {/* Audio Progress */}
          {(() => {
            const sp = topic._sceneProgress;
            const fallback = parseProgress(topic.audio_progress);
            const totalScenes = sp?.total || sceneCount || fallback.total || 170;
            const audioDone = sp ? sp.audio.done : (fallback.status === 'complete' ? totalScenes : fallback.done);
            const audioPct = totalScenes > 0 ? Math.round((audioDone / totalScenes) * 100) : 0;
            const audioComplete = audioDone >= totalScenes && totalScenes > 0;
            const audioRunning = audioDone > 0 && !audioComplete;
            return (
              <div className="mb-2.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Volume2 className="w-3 h-3" /> Audio
                  </span>
                  <span className="text-[10px] font-semibold tabular-nums">
                    <span className={audioComplete ? 'text-success' : audioDone > 0 ? 'text-accent' : 'text-muted-foreground'}>{audioDone}</span>/{totalScenes}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      audioComplete ? 'bg-success' : audioPct > 0 ? 'bg-accent' : 'bg-muted'
                    }`}
                    style={{ width: `${audioPct}%` }}
                  />
                </div>
                {audioRunning && (
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                    {totalScenes - audioDone} remaining &middot; {audioPct}%
                  </p>
                )}
                {audioComplete && (
                  <p className="text-[9px] text-success/70 mt-0.5">Complete</p>
                )}
              </div>
            );
          })()}

          {/* Images Progress */}
          {(() => {
            const sp = topic._sceneProgress;
            const fallback = parseProgress(topic.images_progress);
            const totalScenes = sp?.total || sceneCount || fallback.total || 170;
            const imagesDone = sp ? sp.images.done : (fallback.status === 'complete' ? totalScenes : fallback.done);
            const imagesPct = totalScenes > 0 ? Math.round((imagesDone / totalScenes) * 100) : 0;
            const imagesComplete = imagesDone >= totalScenes && totalScenes > 0;
            const imagesRunning = imagesDone > 0 && !imagesComplete;
            return (
              <div className="mb-2.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Images
                  </span>
                  <span className="text-[10px] font-semibold tabular-nums">
                    <span className={imagesComplete ? 'text-success' : imagesDone > 0 ? 'text-accent' : 'text-muted-foreground'}>{imagesDone}</span>/{totalScenes}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      imagesComplete ? 'bg-success' : imagesPct > 0 ? 'bg-accent' : 'bg-muted'
                    }`}
                    style={{ width: `${imagesPct}%` }}
                  />
                </div>
                {imagesRunning && (
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                    {totalScenes - imagesDone} remaining &middot; {imagesPct}%
                  </p>
                )}
                {imagesComplete && (
                  <p className="text-[9px] text-success/70 mt-0.5">Complete</p>
                )}
              </div>
            );
          })()}

          {/* Ken Burns Clips Progress */}
          {(() => {
            const sp = topic._sceneProgress;
            const totalScenes = sp?.total || sceneCount || 170;
            const clipsDone = sp?.clips?.done || 0;
            const clipsPct = totalScenes > 0 ? Math.round((clipsDone / totalScenes) * 100) : 0;
            const clipsComplete = clipsDone >= totalScenes && totalScenes > 0;
            const clipsRunning = clipsDone > 0 && !clipsComplete;
            return (
              <div className="mb-2.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Film className="w-3 h-3" /> Ken Burns Clips
                  </span>
                  <span className="text-[10px] font-semibold tabular-nums">
                    <span className={clipsComplete ? 'text-success' : clipsDone > 0 ? 'text-accent' : 'text-muted-foreground'}>{clipsDone}</span>/{totalScenes}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      clipsComplete ? 'bg-success' : clipsPct > 0 ? 'bg-accent' : 'bg-muted'
                    }`}
                    style={{ width: `${clipsPct}%` }}
                  />
                </div>
                {clipsRunning && (
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                    {totalScenes - clipsDone} remaining &middot; {clipsPct}%
                  </p>
                )}
                {clipsComplete && (
                  <p className="text-[9px] text-success/70 mt-0.5">Complete</p>
                )}
              </div>
            );
          })()}

          {/* Assembly Status — derived from observable state */}
          {(() => {
            const assembly = topic.assembly_status;
            const sp = topic._sceneProgress;
            const totalScenes = sp?.total || sceneCount || 170;
            const clipsDone = sp?.clips?.done || 0;
            const clipsAllDone = clipsDone >= totalScenes && totalScenes > 0;
            const isAssembling = topic.status === 'assembling' || topic.status === 'assembly';

            // Derive current step from observable state
            let currentStep = 'Waiting';
            let stepColor = 'text-muted-foreground';
            if (assembly === 'complete') {
              currentStep = 'Complete';
              stepColor = 'text-success';
            } else if (assembly === 'failed') {
              currentStep = 'Failed';
              stepColor = 'text-danger';
            } else if (isAssembling) {
              if (!clipsAllDone) {
                currentStep = 'Building clips (' + clipsDone + '/' + totalScenes + ')';
                stepColor = 'text-accent';
              } else if (topic.drive_video_url) {
                currentStep = 'Uploaded to Drive';
                stepColor = 'text-success';
              } else {
                currentStep = 'Concat + Normalize + Upload';
                stepColor = 'text-accent';
              }
            }

            return (
              <div className="mb-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Film className="w-3 h-3" /> Assembly
                  </span>
                  <span className={'text-[10px] font-semibold ' + stepColor}>
                    {assembly === 'complete' ? '✓ Done' :
                     assembly === 'failed' ? '✗ Failed' :
                     assembly === 'pending' ? 'Waiting' :
                     'In Progress'}
                  </span>
                </div>
                {isAssembling && (
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                    <span className={'inline-block w-1.5 h-1.5 rounded-full ' + (assembly === 'complete' ? 'bg-success' : 'bg-accent animate-pulse')} />
                    {currentStep}
                  </p>
                )}
              </div>
            );
          })()}

          {/* Elapsed time */}
          {topic.last_status_change && (
            <p className="text-[9px] text-muted-foreground/50 mt-2 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              Started {new Date(topic.last_status_change).toLocaleTimeString()}
            </p>
          )}

          {/* Stage Control Buttons */}
          <div className="flex gap-1.5 mt-3" data-testid="stage-controls">
            {(topic.status === 'failed' || topic.status === 'stopped') && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-[10px]"
                  disabled={!!stageLoading}
                  onClick={() => triggerStage('audio')}
                >
                  {stageLoading === 'audio' ? <RotateCcw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  Audio
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-[10px]"
                  disabled={!!stageLoading}
                  onClick={() => triggerStage('images')}
                >
                  {stageLoading === 'images' ? <RotateCcw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  Images
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-[10px]"
                  disabled={!!stageLoading}
                  onClick={() => triggerStage('assembly')}
                >
                  {stageLoading === 'assembly' ? <RotateCcw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  Assembly
                </Button>
              </>
            )}
            {['audio', 'images', 'assembling', 'assembly'].includes(topic.status) && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-[10px] border-danger/30 text-danger hover:bg-danger/10"
                disabled={stageLoading === 'cancel'}
                onClick={cancelStage}
              >
                {stageLoading === 'cancel' ? <RotateCcw className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />}
                Stop
              </Button>
            )}
            {['audio', 'images', 'assembling', 'assembly'].includes(topic.status) && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-[10px]"
                disabled={!!stageLoading}
                onClick={() => triggerStage(topic.status === 'assembling' ? 'assembly' : topic.status)}
              >
                {stageLoading ? <RotateCcw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                Retry
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-border" data-testid="action-buttons">
        <Button
          onClick={onApprove}
          disabled={buttonsDisabled}
          className="w-full"
          data-testid="approve-btn"
        >
          <Check className="w-3.5 h-3.5" /> Approve Script
        </Button>
        <Button
          onClick={onReject}
          disabled={buttonsDisabled}
          variant="outline"
          className="w-full bg-danger-bg border-danger-border text-danger hover:bg-danger-bg hover:text-danger"
          data-testid="reject-btn"
        >
          <X className="w-3.5 h-3.5" /> Reject
        </Button>
        <Button
          onClick={onRefine}
          disabled={buttonsDisabled}
          variant="secondary"
          className="w-full border border-border"
          data-testid="refine-btn"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refine
        </Button>
      </div>

      {/* Collapsible: Customer Avatar */}
      <div className="mt-4">
        <CollapsibleSection title="Customer Avatar" icon={User}>
          <div className="space-y-2">
            {AVATAR_FIELDS.map(({ key, label }) => {
              const value = avatar[key];
              if (!value) return null;
              return (
                <div key={key}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-xs text-foreground/80">{value}</p>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* Collapsible: YouTube Metadata */}
        <CollapsibleSection title="YouTube Metadata" icon={Youtube}>
          <div className="space-y-2">
            {videoMeta.title && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Title</p>
                <p className="text-xs text-foreground/80">{videoMeta.title}</p>
              </div>
            )}
            {videoMeta.description && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Description</p>
                <p className="text-xs text-foreground/80 line-clamp-3">{videoMeta.description}</p>
              </div>
            )}
            {videoMeta.tags && videoMeta.tags.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tags</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {videoMeta.tags.map((tag, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {videoMeta.thumbnail_prompt && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Thumbnail Prompt</p>
                <p className="text-xs text-foreground/80">{videoMeta.thumbnail_prompt}</p>
              </div>
            )}
            {!videoMeta.title && !videoMeta.description && (
              <p className="text-xs text-muted-foreground italic">No metadata available yet</p>
            )}
          </div>
        </CollapsibleSection>

        {/* Collapsible: Per-Pass Breakdown */}
        <CollapsibleSection title="Per-Pass Breakdown" icon={BarChart3}>
          {passScores ? (
            <div className="space-y-4">
              {['pass_1', 'pass_2', 'pass_3'].map((passKey, i) => {
                const pass = passScores[passKey];
                if (!pass) return null;
                return (
                  <div key={passKey}>
                    <p className="text-xs font-semibold mb-2">
                      Pass {i + 1}: <span className="text-accent">{pass.final_score ?? pass.score}/10</span>
                      {pass.verdict === 'FORCE_PASS' && (
                        <span className="ml-2 text-[10px] text-warning font-normal">FORCE PASS</span>
                      )}
                      {pass.attempts > 1 && (
                        <span className="ml-2 text-[10px] text-muted-foreground font-normal">
                          (attempt {pass.attempts}/3)
                        </span>
                      )}
                    </p>
                    <div className="space-y-1.5">
                      {SCORE_DIMENSIONS.map((dim) => {
                        const raw = pass.scores?.[dim.key];
                        const s = typeof raw === 'object' ? raw?.score : raw;
                        return (
                          <div key={dim.key} className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-20 truncate">{dim.label}</span>
                            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                              {s != null && (
                                <div
                                  className={`h-full rounded-full ${scoreBarColor(s)}`}
                                  style={{ width: `${(s / 10) * 100}%` }}
                                />
                              )}
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground tabular-nums w-5 text-right">
                              {s ?? '--'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No pass scores available yet</p>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}
