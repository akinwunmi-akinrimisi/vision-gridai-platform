import { useState, useRef, useEffect } from 'react';
import { Save, XCircle, RefreshCw } from 'lucide-react';

/**
 * Inline scene edit form — expands in-place below the scene row.
 * @param {object} props
 * @param {object} props.scene - Scene data
 * @param {Function} props.onSave - Save callback with { scene_id, narration_text, image_prompt, visual_type }
 * @param {Function} props.onCancel - Cancel edit callback
 * @param {Function} props.onRegenPrompt - Mark this scene for batch prompt regeneration
 */
export default function SceneEditForm({ scene, onSave, onCancel, onRegenPrompt }) {
  // Track edit state locally so Realtime updates don't reset the form
  const [narration, setNarration] = useState(scene.narration_text || '');
  const [imagePrompt, setImagePrompt] = useState(scene.image_prompt || '');
  const [visualType, setVisualType] = useState(scene.visual_type || 'static_image');
  const narrationRef = useRef(null);

  // Auto-focus narration textarea on mount
  useEffect(() => {
    narrationRef.current?.focus();
  }, []);

  // Auto-resize textareas
  const autoResize = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleSave = () => {
    onSave({
      scene_id: scene.id || scene.scene_id,
      narration_text: narration,
      image_prompt: imagePrompt,
      visual_type: visualType,
    });
  };

  const handleRegenPrompt = () => {
    onRegenPrompt(scene.id || scene.scene_id);
  };

  const lineNumber = String(scene.scene_number).padStart(3, '0');

  return (
    <div
      className="flex gap-3 px-5 py-3 border-b border-border/20 dark:border-white/[0.03] bg-primary/[0.02] dark:bg-primary/[0.03] animate-in"
      data-testid={`scene-edit-${scene.scene_number}`}
    >
      {/* Line number */}
      <span className="font-mono text-xs text-primary dark:text-blue-400 pt-2 select-none flex-shrink-0 w-8 text-right font-semibold">
        {lineNumber}
      </span>

      {/* Edit fields */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Narration textarea */}
        <div>
          <label className="block text-[10px] font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider mb-1">
            Narration
          </label>
          <textarea
            ref={narrationRef}
            value={narration}
            onChange={(e) => {
              setNarration(e.target.value);
              autoResize(e.target);
            }}
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none
              bg-white dark:bg-slate-800 border border-border dark:border-slate-700
              text-slate-900 dark:text-white placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
              transition-all duration-200 leading-[1.7]"
          />
        </div>

        {/* Image prompt textarea */}
        <div>
          <label className="block text-[10px] font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider mb-1">
            Image Prompt
          </label>
          <textarea
            value={imagePrompt}
            onChange={(e) => {
              setImagePrompt(e.target.value);
              autoResize(e.target);
            }}
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none
              bg-white dark:bg-slate-800 border border-border dark:border-slate-700
              text-slate-900 dark:text-white placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
              transition-all duration-200 leading-relaxed"
          />
        </div>

        {/* Visual type + action buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-medium text-text-muted dark:text-text-muted-dark uppercase tracking-wider">
              Type
            </label>
            <select
              value={visualType}
              onChange={(e) => setVisualType(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium
                bg-white dark:bg-slate-800 border border-border dark:border-slate-700
                text-slate-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                transition-all duration-200 cursor-pointer"
            >
              <option value="static_image">Static Image</option>
              <option value="i2v">I2V</option>
              <option value="t2v">T2V</option>
            </select>
          </div>

          <button
            onClick={handleRegenPrompt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/[0.08]
              hover:bg-amber-100 dark:hover:bg-amber-500/[0.15]
              transition-colors duration-200 cursor-pointer"
            title="Mark for batch prompt regeneration"
          >
            <RefreshCw className="w-3 h-3" />
            Regen Prompt
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.06]
                hover:bg-slate-200 dark:hover:bg-white/[0.1]
                transition-colors duration-200 cursor-pointer"
            >
              <XCircle className="w-3 h-3" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                text-white bg-primary hover:bg-primary/90
                shadow-sm shadow-primary/20
                transition-all duration-200 cursor-pointer"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
