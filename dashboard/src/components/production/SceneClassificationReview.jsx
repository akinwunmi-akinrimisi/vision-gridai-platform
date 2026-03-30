import { useState } from 'react';
import {
  Cpu,
  Image,
  Wand2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ArrowRight,
  Check,
  DollarSign,
  TrendingDown,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSceneClassification } from '@/hooks/useSceneClassification';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'fal_ai', label: 'Fal.ai Only' },
  { key: 'remotion', label: 'Remotion Only' },
];

function StatCard({ label, value, icon: Icon, color = 'text-muted-foreground' }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 transition-colors hover:border-border-hover flex-1 min-w-[140px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        {Icon && <Icon className={cn('w-4 h-4', color)} />}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}

function RenderBadge({ method }) {
  if (method === 'fal_ai') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-blue-600/20 text-blue-400 border border-blue-500/30">
        <Image className="w-3 h-3" />
        Fal.ai
      </span>
    );
  }
  if (method === 'remotion') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-purple-600/20 text-purple-400 border border-purple-500/30">
        <Wand2 className="w-3 h-3" />
        Remotion
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-muted text-muted-foreground">
      Pending
    </span>
  );
}

function TemplateBadge({ template }) {
  if (!template) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wide border border-purple-500/20 text-purple-300">
      {template}
    </span>
  );
}

function SceneRow({ scene, onOverride }) {
  const [expanded, setExpanded] = useState(false);

  const narration = scene.narration_text || '';
  const truncated = narration.length > 120 ? narration.slice(0, 120) + '...' : narration;
  const isRemotionScene = scene.render_method === 'remotion';
  const isFalScene = scene.render_method === 'fal_ai';

  const handleOverride = () => {
    if (isRemotionScene) {
      onOverride({
        sceneId: scene.id,
        renderMethod: 'fal_ai',
        remotionTemplate: null,
        dataPayload: null,
      });
    } else {
      onOverride({
        sceneId: scene.id,
        renderMethod: 'remotion',
        remotionTemplate: 'data_visualization',
        dataPayload: null,
      });
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-3 transition-colors hover:border-border-hover group">
      <div className="flex items-start gap-3">
        {/* Scene number badge */}
        <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center">
          <span className="text-xs font-bold tabular-nums text-muted-foreground">
            {scene.scene_number}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <RenderBadge method={scene.render_method} />
            {isRemotionScene && <TemplateBadge template={scene.remotion_template} />}
            {scene.classification_status === 'overridden' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wide bg-warning-bg text-warning border border-warning-border">
                Overridden
              </span>
            )}
          </div>

          {/* Narration text */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1.5 text-left w-full group/expand"
          >
            <p className="text-sm text-foreground/90 leading-relaxed">
              {expanded ? narration : truncated}
            </p>
            {narration.length > 120 && (
              <span className="inline-flex items-center gap-0.5 mt-0.5 text-[10px] text-muted-foreground group-hover/expand:text-primary transition-colors">
                {expanded ? (
                  <>Show less <ChevronUp className="w-3 h-3" /></>
                ) : (
                  <>Show more <ChevronDown className="w-3 h-3" /></>
                )}
              </span>
            )}
          </button>

          {/* Classification reasoning */}
          {scene.classification_reasoning && (
            <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed italic">
              {scene.classification_reasoning}
            </p>
          )}
        </div>

        {/* Override button */}
        <div className="flex-shrink-0">
          <button
            onClick={handleOverride}
            className={cn(
              'px-2.5 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wider transition-all',
              'border opacity-0 group-hover:opacity-100 focus:opacity-100',
              isFalScene
                ? 'border-purple-500/30 text-purple-400 hover:bg-purple-600/20'
                : 'border-blue-500/30 text-blue-400 hover:bg-blue-600/20'
            )}
          >
            {isFalScene ? 'Switch to Remotion' : 'Switch to Fal.ai'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * SceneClassificationReview: Shows after script approval, before image generation.
 * Displays AI classification results and lets the operator review/override render methods.
 * @param {{ topicId: string, projectId: string }} props
 */
export default function SceneClassificationReview({ topicId, projectId }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const {
    scenes,
    stats,
    topicStatus,
    isLoading,
    classifyScenes,
    isClassifying,
    overrideScene,
    acceptClassification,
    isAccepting,
  } = useSceneClassification(topicId);

  const isClassifyingInProgress = topicStatus === 'classifying';
  const canAccept = topicStatus === 'classified' || topicStatus === 'reviewed';

  // Filter scenes
  const filteredScenes = scenes.filter((s) => {
    if (activeFilter === 'all') return true;
    return s.render_method === activeFilter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="ml-3 text-sm text-muted-foreground">Loading classification data...</span>
      </div>
    );
  }

  if (scenes.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <Cpu className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-foreground">No scenes to classify</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Scenes will appear here after script approval.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Summary bar ── */}
      <div className="flex flex-wrap gap-3">
        <StatCard
          label="Total Scenes"
          value={stats.total}
          icon={Cpu}
          color="text-primary"
        />
        <StatCard
          label="Fal.ai"
          value={stats.falAiCount}
          icon={Image}
          color="text-blue-400"
        />
        <StatCard
          label="Remotion"
          value={stats.remotionCount}
          icon={Wand2}
          color="text-purple-400"
        />
        <StatCard
          label="Est. Cost"
          value={`$${stats.estimatedCost.toFixed(2)}`}
          icon={DollarSign}
          color="text-warning"
        />
        <StatCard
          label="Savings"
          value={`$${stats.savings.toFixed(2)}`}
          icon={TrendingDown}
          color="text-success"
        />
      </div>

      {/* ── Classifying progress indicator ── */}
      {isClassifyingInProgress && (
        <div className="relative overflow-hidden bg-info-bg border border-info-border rounded-xl p-4">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 animate-glow-pulse" />
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-info animate-spin flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Classifying scenes...</p>
              <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                {stats.classifiedCount} / {stats.total} complete
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-info transition-all duration-500"
              style={{
                width: stats.total > 0
                  ? `${Math.round((stats.classifiedCount / stats.total) * 100)}%`
                  : '0%',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                isActive
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {tab.key === 'fal_ai' && stats.falAiCount > 0 && (
                <span className="ml-1.5 text-[10px] tabular-nums text-blue-400">
                  {stats.falAiCount}
                </span>
              )}
              {tab.key === 'remotion' && stats.remotionCount > 0 && (
                <span className="ml-1.5 text-[10px] tabular-nums text-purple-400">
                  {stats.remotionCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Scene list ── */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
        {filteredScenes.map((scene) => (
          <SceneRow key={scene.id} scene={scene} onOverride={overrideScene} />
        ))}
        {filteredScenes.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No scenes match this filter.
          </div>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <button
          onClick={() => classifyScenes(topicId)}
          disabled={isClassifying || isClassifyingInProgress}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            'border border-border text-muted-foreground hover:text-foreground hover:border-border-hover',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          <RefreshCw className={cn('w-4 h-4', (isClassifying || isClassifyingInProgress) && 'animate-spin')} />
          Re-classify All
        </button>

        <button
          onClick={() => acceptClassification(topicId)}
          disabled={!canAccept || isAccepting}
          className={cn(
            'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all',
            canAccept
              ? 'bg-success text-white hover:bg-success/90 shadow-glow-success'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {isAccepting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Accept & Proceed to Image Generation
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
