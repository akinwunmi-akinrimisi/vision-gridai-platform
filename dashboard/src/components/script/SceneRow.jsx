import { Eye, EyeOff } from 'lucide-react';

const VISUAL_BADGE = {
  static_image: 'badge badge-blue',
  i2v: 'badge badge-purple',
  t2v: 'badge badge-amber',
};

const VISUAL_LABEL = {
  static_image: 'Image',
  i2v: 'I2V',
  t2v: 'T2V',
};

/**
 * Individual scene display row with line number, narration, visual badge, and hidden prompt.
 * @param {object} props
 * @param {object} props.scene - Scene data
 * @param {boolean} props.isEditing - Whether this scene is in edit mode
 * @param {Function} props.onStartEdit - Callback to enter edit mode
 * @param {Function} props.onTogglePrompt - Toggle image prompt visibility
 * @param {boolean} props.showPrompt - Whether image prompt is visible
 */
export default function SceneRow({ scene, isEditing, onStartEdit, onTogglePrompt, showPrompt }) {
  if (isEditing) return null; // Parent renders SceneEditForm instead

  const lineNumber = String(scene.scene_number).padStart(3, '0');

  return (
    <div
      className="group flex gap-3 px-5 py-3 border-b border-border/20 dark:border-white/[0.03] last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.015] transition-colors duration-150 cursor-pointer"
      onClick={() => onStartEdit(scene.id || scene.scene_id)}
      data-testid={`scene-row-${scene.scene_number}`}
    >
      {/* Line number */}
      <span
        className="font-mono text-xs text-slate-300 dark:text-slate-600 pt-0.5 select-none flex-shrink-0 w-8 text-right"
        data-testid={`line-number-${scene.scene_number}`}
      >
        {lineNumber}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Narration text */}
        <p className="text-sm leading-[1.7] text-slate-700 dark:text-slate-300">
          {scene.narration_text}
        </p>

        {/* Visual type badge + prompt toggle */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className={VISUAL_BADGE[scene.visual_type] || 'badge badge-blue'}>
            {VISUAL_LABEL[scene.visual_type] || scene.visual_type}
          </span>

          {scene.emotional_beat && (
            <span className="text-[10px] text-text-muted dark:text-text-muted-dark italic">
              {scene.emotional_beat}
            </span>
          )}

          {/* Eye icon for image prompt — visible on hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePrompt(scene.id || scene.scene_id);
            }}
            className="ml-auto p-1 rounded-md text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all duration-150 cursor-pointer"
            title={showPrompt ? 'Hide image prompt' : 'Show image prompt'}
          >
            {showPrompt ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Image prompt (hidden by default) */}
        {showPrompt && scene.image_prompt && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-border/20 dark:border-white/[0.04] animate-in">
            <p className="text-[10px] font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider mb-0.5">
              Image Prompt
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {scene.image_prompt}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
