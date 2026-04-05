import { cn } from '@/lib/utils';

/**
 * Style badge color mapping for kinetic typography elements.
 */
const STYLE_COLORS = {
  headline:     'bg-purple-500/15 text-purple-400 border-purple-500/30',
  subhead:      'bg-blue-500/15 text-blue-400 border-blue-500/30',
  body:         'bg-slate-500/15 text-slate-400 border-slate-500/30',
  accent:       'bg-amber-500/15 text-amber-400 border-amber-500/30',
  stat:         'bg-orange-500/15 text-orange-400 border-orange-500/30',
  label:        'bg-teal-500/15 text-teal-400 border-teal-500/30',
  quote:        'bg-gray-500/15 text-gray-400 border-gray-500/30',
  caption:      'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  bullet:       'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  emphasis:     'bg-red-500/15 text-red-400 border-red-500/30',
};

const ANIMATION_COLORS = {
  typewriter:   'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  fade_in:      'bg-sky-500/15 text-sky-400 border-sky-500/30',
  slide_up:     'bg-violet-500/15 text-violet-400 border-violet-500/30',
  slide_left:   'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
  slide_right:  'bg-pink-500/15 text-pink-400 border-pink-500/30',
  scale_in:     'bg-lime-500/15 text-lime-400 border-lime-500/30',
  bounce:       'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  pop:          'bg-rose-500/15 text-rose-400 border-rose-500/30',
  wipe:         'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  none:         'bg-muted text-muted-foreground border-border',
};

function StyleBadge({ style }) {
  const colorClass = STYLE_COLORS[style] || 'bg-muted text-muted-foreground border-border';
  return (
    <span className={cn(
      'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border whitespace-nowrap',
      colorClass
    )}>
      {style || 'body'}
    </span>
  );
}

function AnimationBadge({ animation }) {
  const colorClass = ANIMATION_COLORS[animation] || ANIMATION_COLORS.none;
  return (
    <span className={cn(
      'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border whitespace-nowrap',
      colorClass
    )}>
      {animation ? animation.replace(/_/g, ' ') : 'none'}
    </span>
  );
}

/**
 * KineticElementRow -- Compact row within a kinetic scene.
 * Shows: index | text (truncated) | style badge | animation badge | delay ms | duration ms
 */
export default function KineticElementRow({ element, index }) {
  if (!element) return null;

  const text = element.text || '';
  const style = element.style || 'body';
  const animation = element.animation || element.animation_type || 'fade_in';
  const delay = element.delay_ms ?? element.delay ?? 0;
  const duration = element.duration_ms ?? element.duration ?? 500;

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors group">
      {/* Index */}
      <span className="text-[10px] text-muted-foreground/60 w-4 text-right tabular-nums flex-shrink-0">
        {index + 1}
      </span>

      {/* Text preview */}
      <span className="flex-1 text-xs text-foreground/80 truncate min-w-0" title={text}>
        {text || <span className="italic text-muted-foreground">empty</span>}
      </span>

      {/* Style badge */}
      <StyleBadge style={style} />

      {/* Animation badge */}
      <AnimationBadge animation={animation} />

      {/* Timing: delay */}
      <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right flex-shrink-0" title="Delay (ms)">
        {delay}ms
      </span>

      {/* Timing: duration */}
      <span className="text-[10px] text-accent tabular-nums w-12 text-right flex-shrink-0" title="Duration (ms)">
        {duration}ms
      </span>
    </div>
  );
}

export { StyleBadge, AnimationBadge, STYLE_COLORS, ANIMATION_COLORS };
