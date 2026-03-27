import { useState } from 'react';
import { AlertTriangle, RefreshCw, Edit3, SkipForward, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/**
 * Extract user-friendly error summary from error_log string.
 */
function friendlyError(scene) {
  const log = scene.error_log || '';
  if (log.includes('429')) return 'Rate limit exceeded';
  if (log.includes('500')) return 'Server error';
  if (log.includes('timeout') || log.includes('Timeout')) return 'Request timeout';
  if (log.includes('403')) return 'Access denied';
  if (scene.image_status === 'failed') return 'Image generation failed';
  if (scene.video_status === 'failed') return 'Video generation failed';
  if (scene.audio_status === 'failed') return 'Audio generation failed';
  return 'Unknown error';
}

/**
 * Failed scenes section with per-scene and batch recovery actions.
 * Only renders when scenes.length > 0.
 */
export default function FailedScenes({
  scenes = [],
  onRetry,
  onSkip,
  onEditRetry,
  onRetryAll,
  onSkipAll,
}) {
  const [expandedErrors, setExpandedErrors] = useState({});
  const [editingScene, setEditingScene] = useState(null);
  const [editPrompt, setEditPrompt] = useState('');

  if (scenes.length === 0) return null;

  const toggleError = (sceneId) => {
    setExpandedErrors((prev) => ({ ...prev, [sceneId]: !prev[sceneId] }));
  };

  const handleEditRetry = (scene) => {
    if (editingScene === scene.id) {
      // Submit
      onEditRetry(scene.id, editPrompt);
      setEditingScene(null);
      setEditPrompt('');
    } else {
      setEditingScene(scene.id);
      setEditPrompt(scene.image_prompt || '');
    }
  };

  return (
    <div data-testid="failed-scenes" className="bg-card border border-danger-border rounded-xl p-4 sm:p-6">
      {/* Header with batch actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-danger" />
          <h3 className="text-sm font-semibold">
            Failed Scenes ({scenes.length})
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetryAll}
            className="gap-1.5 text-info border-info-border hover:bg-info-bg"
            data-testid="retry-all-failed"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Retry All Failed</span>
            <span className="sm:hidden">Retry All</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onSkipAll}
            className="gap-1.5"
            data-testid="skip-all-failed"
          >
            <SkipForward className="w-3 h-3" />
            <span className="hidden sm:inline">Skip All Failed</span>
            <span className="sm:hidden">Skip All</span>
          </Button>
        </div>
      </div>

      {/* Scene list */}
      <div className="space-y-3">
        {scenes.map((scene) => (
          <div
            key={scene.id}
            className="px-4 py-3 rounded-lg bg-danger-bg border border-danger-border"
          >
            {/* Scene info row */}
            <div className="flex items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                <span className="text-xs font-semibold text-danger shrink-0">
                  Scene {scene.scene_number}
                </span>
                <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                  {scene.chapter}
                </span>
                <span className="text-xs text-danger/80 shrink-0">
                  {friendlyError(scene)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  data-testid={`retry-scene-${scene.id}`}
                  onClick={() => onRetry(scene.id)}
                  className="p-1.5 rounded-lg hover:bg-info-bg transition-colors cursor-pointer"
                  title="Retry"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-info" />
                </button>
                <button
                  data-testid={`edit-retry-${scene.id}`}
                  onClick={() => handleEditRetry(scene)}
                  className="p-1.5 rounded-lg hover:bg-warning-bg transition-colors cursor-pointer"
                  title="Edit & Retry"
                >
                  <Edit3 className="w-3.5 h-3.5 text-warning" />
                </button>
                <button
                  data-testid={`skip-scene-${scene.id}`}
                  onClick={() => onSkip(scene.id)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  title="Skip"
                >
                  <SkipForward className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  data-testid={`expand-error-${scene.id}`}
                  onClick={() => toggleError(scene.id)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  title="Error details"
                >
                  {expandedErrors[scene.id] ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            {/* Expandable error details */}
            {expandedErrors[scene.id] && (
              <div className="mt-2 p-2 rounded-lg bg-danger-bg/50 text-[11px] font-mono text-danger whitespace-pre-wrap break-all">
                {scene.error_log || 'No error details available'}
                {scene.image_prompt && (
                  <div className="mt-1 text-muted-foreground">
                    Prompt: {scene.image_prompt}
                  </div>
                )}
              </div>
            )}

            {/* Edit & Retry textarea */}
            {editingScene === scene.id && (
              <div className="mt-2 space-y-2">
                <Textarea
                  data-testid="edit-prompt-textarea"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  rows={3}
                  placeholder="Edit image prompt..."
                  className="text-xs resize-none"
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEditRetry(scene)}
                    className="gap-1.5"
                  >
                    Submit & Retry
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditingScene(null); setEditPrompt(''); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Assembly gate message */}
      <div className="mt-4 px-3 py-2 rounded-lg bg-warning-bg border border-warning-border">
        <p className="text-xs text-warning font-medium">
          {scenes.length} failed scene{scenes.length !== 1 ? 's' : ''} must be resolved before assembly
        </p>
      </div>
    </div>
  );
}
