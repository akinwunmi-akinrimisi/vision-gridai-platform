import { useState } from 'react';
import { ChevronDown, ChevronUp, Subtitles } from 'lucide-react';

/**
 * Collapsible SRT caption preview built from scenes array.
 */
export default function CaptionPreview({ scenes = [] }) {
  const [expanded, setExpanded] = useState(false);

  if (!scenes.length) return null;

  return (
    <div className="glass-card rounded-xl overflow-hidden" data-testid="caption-preview">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Subtitles className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Captions
          </h3>
          <span className="text-xs text-text-muted dark:text-text-muted-dark">
            ({scenes.length} scenes)
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="max-h-64 overflow-y-auto rounded-lg bg-slate-50 dark:bg-white/[0.03] p-3 font-mono text-xs leading-relaxed text-slate-600 dark:text-slate-400 scrollbar-thin">
            {scenes.map((scene, i) => (
              <div key={scene.id || i} className="mb-3">
                <div className="text-slate-400 dark:text-slate-500">{i + 1}</div>
                <div className="text-slate-500 dark:text-slate-400">
                  {formatSrtTime(scene.start_time_ms)} {'-->'} {formatSrtTime(scene.end_time_ms)}
                </div>
                <div className="text-slate-700 dark:text-slate-300">
                  {scene.narration_text || '(no text)'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatSrtTime(ms) {
  if (ms == null) return '00:00:00,000';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const millis = ms % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}
