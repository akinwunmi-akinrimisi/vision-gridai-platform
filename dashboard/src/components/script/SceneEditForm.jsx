import { useState, useRef, useEffect } from 'react';
import { Save, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/**
 * Inline scene edit form -- expands in-place below the scene row.
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
      className="flex gap-3 p-3 rounded-lg bg-primary/[0.04] border border-primary/20 animate-fade-in"
      data-testid={`scene-edit-${scene.scene_number}`}
    >
      {/* Line number */}
      <span className="font-mono text-xs text-primary pt-2 select-none flex-shrink-0 w-8 text-right font-semibold">
        {lineNumber}
      </span>

      {/* Edit fields */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Narration textarea */}
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Narration
          </label>
          <Textarea
            ref={narrationRef}
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            rows={3}
            className="bg-muted border-border resize-none text-sm leading-relaxed"
          />
        </div>

        {/* Image prompt textarea */}
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Image Prompt
          </label>
          <Textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            rows={2}
            className="bg-muted border-border resize-none text-sm leading-relaxed"
          />
        </div>

        {/* Visual type + action buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Type
            </label>
            <select
              value={visualType}
              onChange={(e) => setVisualType(e.target.value)}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors cursor-pointer"
            >
              <option value="static_image">Static Image</option>
              <option value="i2v">I2V</option>
              <option value="t2v">T2V</option>
            </select>
          </div>

          <Button
            onClick={handleRegenPrompt}
            variant="outline"
            size="sm"
            className="bg-warning-bg border-warning-border text-warning hover:bg-warning-bg"
            title="Mark for batch prompt regeneration"
          >
            <RefreshCw className="w-3 h-3" />
            Regen Prompt
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Button
              onClick={onCancel}
              variant="secondary"
              size="sm"
            >
              <XCircle className="w-3 h-3" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
            >
              <Save className="w-3 h-3" />
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
