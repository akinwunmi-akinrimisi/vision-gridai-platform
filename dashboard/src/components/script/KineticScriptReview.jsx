import { useState, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  Check,
  X,
  RefreshCw,
  Layers,
  Clock,
  Film,
  Type,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import KineticSceneCard from './KineticSceneCard';
import ConfirmDialog from '../ui/ConfirmDialog';
import ScriptRefinePanel from './ScriptRefinePanel';

/**
 * Derive chapter structure from script_json.
 * Expects script_json.scenes with a `chapter` field per scene.
 */
function groupScenesByChapter(scenes) {
  const chapters = [];
  let currentChapter = null;

  for (const scene of scenes) {
    const chapterName = scene.chapter || 'Ungrouped';
    if (!currentChapter || currentChapter.name !== chapterName) {
      currentChapter = {
        name: chapterName,
        scenes: [],
        totalDuration: 0,
        totalElements: 0,
      };
      chapters.push(currentChapter);
    }
    currentChapter.scenes.push(scene);
    currentChapter.totalDuration += scene.duration_ms || scene.duration || 0;
    currentChapter.totalElements += (scene.elements || []).length;
  }

  return chapters;
}

function formatDuration(ms) {
  if (!ms) return '--';
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec}s`;
}

function formatDurationLong(ms) {
  if (!ms) return '--';
  const totalSec = Math.round(ms / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (hrs > 0) return `${hrs}h ${min}m ${sec}s`;
  return `${min}m ${sec}s`;
}

/**
 * ChapterAccordion -- collapsible section per chapter.
 */
function ChapterAccordion({ chapter, chapterIndex, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card/30">
      {/* Chapter header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors cursor-pointer"
      >
        {/* Chapter number */}
        <span className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
          {chapterIndex + 1}
        </span>

        {/* Chapter name */}
        <span className="flex-1 text-sm font-semibold text-foreground min-w-0 truncate">
          {chapter.name}
        </span>

        {/* Scene count */}
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
          <Film className="w-3 h-3" />
          {chapter.scenes.length} scenes
        </span>

        {/* Element count */}
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
          <Layers className="w-3 h-3" />
          {chapter.totalElements} elements
        </span>

        {/* Duration */}
        <span className="flex items-center gap-1 text-[10px] text-accent tabular-nums flex-shrink-0">
          <Clock className="w-3 h-3" />
          {formatDuration(chapter.totalDuration)}
        </span>

        {/* Expand chevron */}
        <ChevronDown className={cn(
          'w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0',
          open && 'rotate-180'
        )} />
      </button>

      {/* Scenes list */}
      {open && (
        <div className="border-t border-border p-3 space-y-2">
          {chapter.scenes.map((scene, i) => (
            <KineticSceneCard key={scene.scene_id || i} scene={scene} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * KineticScriptReview -- Script review for Kinetic Typography projects.
 * Shows element-level timeline with chapter accordion, scene cards, element rows.
 * Replaces the AI Cinematic ScorePanel + ScriptContent when production_style === 'kinetic_typography'.
 */
export default function KineticScriptReview({ topic, scenes, onApprove, onReject, onRefine, isLoading }) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [showRefinePanel, setShowRefinePanel] = useState(false);

  // Build display scenes from either scenes query or script_json fallback
  const displayScenes = useMemo(() => {
    if (scenes && scenes.length > 0) return scenes;
    return topic?.script_json?.scenes || [];
  }, [scenes, topic]);

  // Group scenes by chapter
  const chapters = useMemo(() => groupScenesByChapter(displayScenes), [displayScenes]);

  // Compute summary stats
  const stats = useMemo(() => {
    const totalScenes = displayScenes.length;
    const totalElements = displayScenes.reduce((sum, s) => sum + (s.elements || []).length, 0);
    const totalDuration = displayScenes.reduce((sum, s) => sum + (s.duration_ms || s.duration || 0), 0);
    const chapterCount = chapters.length;

    // Count scene types
    const typeDistribution = {};
    for (const s of displayScenes) {
      const t = s.scene_type || s.type || 'narrative';
      typeDistribution[t] = (typeDistribution[t] || 0) + 1;
    }

    return { totalScenes, totalElements, totalDuration, chapterCount, typeDistribution };
  }, [displayScenes, chapters]);

  const handleReject = useCallback(() => {
    if (onReject) onReject(rejectFeedback);
    setShowRejectDialog(false);
    setRejectFeedback('');
  }, [onReject, rejectFeedback]);

  const handleRefine = useCallback(
    (instructions) => {
      if (onRefine) onRefine(instructions);
      setShowRefinePanel(false);
    },
    [onRefine]
  );

  const isApproved = topic?.script_review_status === 'approved';
  const buttonsDisabled = isLoading || isApproved;
  const overallScore = topic?.script_quality_score ?? null;

  return (
    <div className="space-y-4">
      {/* Summary stats bar + action buttons */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left: Stats panel */}
        <div className="flex-1 bg-card border border-border rounded-lg p-5" data-testid="kinetic-stats-panel">
          {/* Score */}
          <div className="flex items-center gap-4 mb-4">
            <div>
              <p className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                {overallScore != null ? overallScore : '--'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">/10 quality score</p>
            </div>

            {/* Quick stats */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground tabular-nums">{stats.totalScenes}</p>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                  <Film className="w-3 h-3" /> Scenes
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground tabular-nums">{stats.totalElements}</p>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                  <Type className="w-3 h-3" /> Elements
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground tabular-nums">{stats.chapterCount}</p>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                  <Hash className="w-3 h-3" /> Chapters
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-accent tabular-nums">{formatDurationLong(stats.totalDuration)}</p>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" /> Duration
                </p>
              </div>
            </div>
          </div>

          {/* Scene type distribution */}
          {Object.keys(stats.typeDistribution).length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Scene Types</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(stats.typeDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border"
                    >
                      {type}
                      <span className="text-accent font-bold">{count}</span>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Action buttons */}
        <div className="flex flex-col gap-2 w-full md:w-48 flex-shrink-0" data-testid="kinetic-action-buttons">
          <Button
            onClick={onApprove}
            disabled={buttonsDisabled}
            className="w-full"
            data-testid="kinetic-approve-btn"
          >
            <Check className="w-3.5 h-3.5" /> Approve Script
          </Button>
          <Button
            onClick={() => setShowRejectDialog(true)}
            disabled={buttonsDisabled}
            variant="outline"
            className="w-full bg-danger-bg border-danger-border text-danger hover:bg-danger-bg hover:text-danger"
            data-testid="kinetic-reject-btn"
          >
            <X className="w-3.5 h-3.5" /> Reject
          </Button>
          <Button
            onClick={() => setShowRefinePanel(true)}
            disabled={buttonsDisabled}
            variant="secondary"
            className="w-full border border-border"
            data-testid="kinetic-refine-btn"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refine
          </Button>
        </div>
      </div>

      {/* Chapter accordion */}
      <div className="space-y-3" data-testid="kinetic-chapters">
        {chapters.length > 0 ? (
          chapters.map((chapter, i) => (
            <ChapterAccordion
              key={chapter.name + '-' + i}
              chapter={chapter}
              chapterIndex={i}
              defaultOpen={i === 0}
            />
          ))
        ) : (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-sm text-muted-foreground">No scenes found in this script.</p>
          </div>
        )}
      </div>

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
        loading={isLoading}
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
        isLoading={isLoading}
      />
    </div>
  );
}
