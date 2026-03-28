import { Eye, EyeOff } from 'lucide-react';
import StatusBadge from '../shared/StatusBadge';

const VISUAL_BADGE = {
  static_image: { status: 'approved', label: 'Image' },
  i2v: { status: 'scripting', label: 'I2V' },
  t2v: { status: 'scripting', label: 'T2V' },
};

const COLOR_MOOD_DOT = {
  cold_desat: 'bg-blue-400',
  cool_neutral: 'bg-slate-400',
  dark_mono: 'bg-zinc-600',
  warm_sepia: 'bg-amber-600',
  warm_gold: 'bg-amber-400',
  full_natural: 'bg-green-400',
  muted_selective: 'bg-purple-400',
};

const ZOOM_ICON = {
  zoom_in: '\u2197',     // ↗
  zoom_out: '\u2199',    // ↙
  pan_left: '\u2190',    // ←
  pan_right: '\u2192',   // →
  pan_up: '\u2191',      // ↑
  static: '~',
};

/**
 * Individual scene display row with scene_id, visual badge, narration, and hidden prompt.
 * @param {object} props
 * @param {object} props.scene - Scene data
 * @param {boolean} props.isEditing - Whether this scene is in edit mode
 * @param {Function} props.onStartEdit - Callback to enter edit mode
 * @param {Function} props.onTogglePrompt - Toggle image prompt visibility
 * @param {boolean} props.showPrompt - Whether image prompt is visible
 */
export default function SceneRow({ scene, isEditing, onStartEdit, onTogglePrompt, showPrompt }) {
  if (isEditing) return null; // Parent renders SceneEditForm instead

  const sceneId = scene.scene_id || `scene_${String(scene.scene_number).padStart(3, '0')}`;
  const badge = VISUAL_BADGE[scene.visual_type] || { status: 'scripting', label: scene.visual_type };

  return (
    <div
      className="bg-muted/30 border border-border rounded-lg p-3 group hover:border-border-hover transition-colors cursor-pointer"
      onClick={() => onStartEdit(scene.id || scene.scene_id)}
      data-testid={`scene-row-${scene.scene_number}`}
    >
      {/* Top row: scene_id + visual_type badge + cinematic fields + emotional_beat */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] text-muted-foreground" data-testid={`line-number-${scene.scene_number}`}>
          {sceneId}
        </span>
        <StatusBadge status={badge.status} label={badge.label} />
        {/* Cinematic field badges */}
        {scene.color_mood && (
          <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground" title={`Color: ${scene.color_mood}`}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${COLOR_MOOD_DOT[scene.color_mood] || 'bg-muted-foreground'}`} />
            {scene.color_mood.replace(/_/g, ' ')}
          </span>
        )}
        {scene.zoom_direction && (
          <span className="text-[9px] text-muted-foreground font-mono" title={`Zoom: ${scene.zoom_direction}`}>
            {ZOOM_ICON[scene.zoom_direction] || scene.zoom_direction}
          </span>
        )}
        {scene.composition_prefix && (
          <span className="text-[9px] text-muted-foreground/60 bg-muted px-1 py-0.5 rounded" title={`Composition: ${scene.composition_prefix}`}>
            {scene.composition_prefix}
          </span>
        )}
        {scene.emotional_beat && (
          <span className="text-[9px] text-muted-foreground italic ml-auto truncate max-w-[120px]">
            {scene.emotional_beat}
          </span>
        )}
        {/* Eye icon for image prompt -- visible on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePrompt(scene.id || scene.scene_id);
          }}
          className="p-1 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-muted transition-all duration-150"
          title={showPrompt ? 'Hide image prompt' : 'Show image prompt'}
        >
          {showPrompt ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Narration text */}
      <p className="text-xs text-foreground/80 leading-relaxed mt-2">
        {scene.narration_text}
      </p>

      {/* Image prompt (hidden by default) */}
      {showPrompt && scene.image_prompt && (
        <div className="mt-2 px-3 py-2 rounded-md bg-muted border border-border animate-fade-in">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
            Image Prompt
          </p>
          <p className="text-xs text-foreground/60 leading-relaxed">
            {scene.image_prompt}
          </p>
        </div>
      )}
    </div>
  );
}
