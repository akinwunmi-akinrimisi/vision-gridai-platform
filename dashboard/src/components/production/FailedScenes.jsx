import { useState } from 'react';
import { AlertTriangle, RefreshCw, Edit3, SkipForward, ChevronDown, ChevronRight } from 'lucide-react';

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
    <div data-testid="failed-scenes" className="glass-card p-6 mb-6">
      {/* Header with batch actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Failed Scenes ({scenes.length})
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="retry-all-failed"
            onClick={onRetryAll}
            className="
              flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
              bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400
              hover:bg-blue-100 dark:hover:bg-blue-900/30
              border border-blue-200 dark:border-blue-800
              transition-colors duration-200 cursor-pointer
            "
          >
            <RefreshCw className="w-3 h-3" />
            Retry All Failed
          </button>
          <button
            data-testid="skip-all-failed"
            onClick={onSkipAll}
            className="
              flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
              bg-slate-50 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400
              hover:bg-slate-100 dark:hover:bg-white/[0.06]
              border border-slate-200 dark:border-white/[0.06]
              transition-colors duration-200 cursor-pointer
            "
          >
            <SkipForward className="w-3 h-3" />
            Skip All Failed
          </button>
        </div>
      </div>

      {/* Scene list */}
      <div className="space-y-3">
        {scenes.map((scene) => (
          <div
            key={scene.id}
            className="
              px-4 py-3 rounded-xl
              bg-red-50/50 dark:bg-red-900/10
              border border-red-200/60 dark:border-red-800/30
            "
          >
            {/* Scene info row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-semibold text-red-600 dark:text-red-400 shrink-0">
                  Scene {scene.scene_number}
                </span>
                <span className="text-[10px] text-text-muted dark:text-text-muted-dark truncate">
                  {scene.chapter}
                </span>
                <span className="text-xs text-red-500 dark:text-red-400 shrink-0">
                  {friendlyError(scene)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  data-testid={`retry-scene-${scene.id}`}
                  onClick={() => onRetry(scene.id)}
                  className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                  title="Retry"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                </button>
                <button
                  data-testid={`edit-retry-${scene.id}`}
                  onClick={() => handleEditRetry(scene)}
                  className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer"
                  title="Edit & Retry"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                </button>
                <button
                  data-testid={`skip-scene-${scene.id}`}
                  onClick={() => onSkip(scene.id)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                  title="Skip"
                >
                  <SkipForward className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  data-testid={`expand-error-${scene.id}`}
                  onClick={() => toggleError(scene.id)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                  title="Error details"
                >
                  {expandedErrors[scene.id] ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Expandable error details */}
            {expandedErrors[scene.id] && (
              <div className="mt-2 p-2 rounded-lg bg-red-100/50 dark:bg-red-900/20 text-[11px] font-mono text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">
                {scene.error_log || 'No error details available'}
                {scene.image_prompt && (
                  <div className="mt-1 text-slate-500 dark:text-slate-400">
                    Prompt: {scene.image_prompt}
                  </div>
                )}
              </div>
            )}

            {/* Edit & Retry textarea */}
            {editingScene === scene.id && (
              <div className="mt-2 space-y-2">
                <textarea
                  data-testid="edit-prompt-textarea"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  rows={3}
                  className="
                    w-full px-3 py-2 rounded-lg text-xs
                    bg-white dark:bg-white/[0.04]
                    border border-slate-200 dark:border-white/[0.1]
                    text-slate-700 dark:text-slate-300
                    focus:outline-none focus:ring-2 focus:ring-primary/30
                    resize-none
                  "
                  placeholder="Edit image prompt..."
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditRetry(scene)}
                    className="
                      px-3 py-1 rounded-lg text-xs font-medium
                      bg-amber-500 text-white hover:bg-amber-600
                      transition-colors cursor-pointer
                    "
                  >
                    Submit & Retry
                  </button>
                  <button
                    onClick={() => { setEditingScene(null); setEditPrompt(''); }}
                    className="
                      px-3 py-1 rounded-lg text-xs font-medium
                      text-slate-500 hover:text-slate-700 dark:text-slate-400
                      transition-colors cursor-pointer
                    "
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Assembly gate message */}
      <div className="mt-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
        <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
          {scenes.length} failed scene{scenes.length !== 1 ? 's' : ''} must be resolved before assembly
        </p>
      </div>
    </div>
  );
}
