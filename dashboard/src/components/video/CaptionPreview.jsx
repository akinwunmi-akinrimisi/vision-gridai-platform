import { useState } from 'react';
import { ChevronDown, ChevronUp, Subtitles } from 'lucide-react';

/**
 * Collapsible SRT caption preview built from scenes array.
 */
export default function CaptionPreview({ scenes = [] }) {
  const [expanded, setExpanded] = useState(false);

  if (!scenes.length) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="caption-preview">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-card-hover transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Subtitles className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">
            Captions
          </h3>
          <span className="text-xs text-muted-foreground">
            ({scenes.length} scenes)
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="max-h-64 overflow-y-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed text-muted-foreground scrollbar-thin">
            {scenes.map((scene, i) => (
              <div key={scene.id || i} className="mb-3">
                <div className="text-muted-foreground/60">{i + 1}</div>
                <div className="text-muted-foreground">
                  {formatSrtTime(scene.start_time_ms)} {'-->'} {formatSrtTime(scene.end_time_ms)}
                </div>
                <div className="text-foreground/80">
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
