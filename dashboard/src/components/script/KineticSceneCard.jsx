import { useState } from 'react';
import { ChevronDown, Clock, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import KineticElementRow from './KineticElementRow';

/**
 * Scene type badge color mapping for kinetic typography.
 */
const SCENE_TYPE_COLORS = {
  hook:       'bg-purple-500/15 text-purple-400 border-purple-500/30',
  intro:      'bg-blue-500/15 text-blue-400 border-blue-500/30',
  list:       'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  stats:      'bg-orange-500/15 text-orange-400 border-orange-500/30',
  comparison: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  quote:      'bg-gray-500/15 text-gray-400 border-gray-500/30',
  callout:    'bg-red-500/15 text-red-400 border-red-500/30',
  transition: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  reveal:     'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
  data:       'bg-teal-500/15 text-teal-400 border-teal-500/30',
  narrative:  'bg-sky-500/15 text-sky-400 border-sky-500/30',
  cta:        'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  chapter:    'bg-violet-500/15 text-violet-400 border-violet-500/30',
  outro:      'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

function formatDuration(ms) {
  if (!ms) return '--';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}m ${sec}s`;
}

/**
 * KineticSceneCard -- Individual scene card for kinetic typography scripts.
 * Shows scene type badge, duration, element count, and expandable element list.
 */
export default function KineticSceneCard({ scene, index }) {
  const [expanded, setExpanded] = useState(false);

  if (!scene) return null;

  const sceneType = scene.scene_type || scene.type || 'narrative';
  const elements = scene.elements || [];
  const duration = scene.duration_ms || scene.duration || 0;
  const narration = scene.narration_text || scene.narration || '';
  const sceneId = scene.scene_id || `scene_${String(index + 1).padStart(3, '0')}`;

  const typeColor = SCENE_TYPE_COLORS[sceneType] || 'bg-muted text-muted-foreground border-border';

  return (
    <div className="border border-border rounded-lg bg-card/50 overflow-hidden transition-colors hover:border-border/80">
      {/* Scene header -- clickable to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
      >
        {/* Scene number */}
        <span className="text-[10px] text-muted-foreground/60 w-8 text-center tabular-nums flex-shrink-0 font-mono">
          {sceneId}
        </span>

        {/* Scene type badge */}
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap flex-shrink-0',
          typeColor
        )}>
          {sceneType}
        </span>

        {/* Narration preview */}
        <span className="flex-1 text-xs text-foreground/70 truncate min-w-0">
          {narration || <span className="italic text-muted-foreground">No narration</span>}
        </span>

        {/* Element count */}
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
          <Layers className="w-3 h-3" />
          {elements.length}
        </span>

        {/* Duration */}
        <span className="flex items-center gap-1 text-[10px] text-accent tabular-nums flex-shrink-0">
          <Clock className="w-3 h-3" />
          {formatDuration(duration)}
        </span>

        {/* Expand chevron */}
        <ChevronDown className={cn(
          'w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 flex-shrink-0',
          expanded && 'rotate-180'
        )} />
      </button>

      {/* Expanded element list */}
      {expanded && elements.length > 0 && (
        <div className="border-t border-border bg-card/30">
          {/* Column headers */}
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border/50">
            <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider w-4 text-right">#</span>
            <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider flex-1">Text</span>
            <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Style</span>
            <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Animation</span>
            <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider w-12 text-right">Delay</span>
            <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider w-12 text-right">Dur</span>
          </div>

          {/* Element rows */}
          <div className="divide-y divide-border/30">
            {elements.map((el, i) => (
              <KineticElementRow key={i} element={el} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Expanded but no elements */}
      {expanded && elements.length === 0 && (
        <div className="border-t border-border p-3">
          <p className="text-xs text-muted-foreground italic text-center">No elements in this scene</p>
        </div>
      )}
    </div>
  );
}

export { SCENE_TYPE_COLORS };
