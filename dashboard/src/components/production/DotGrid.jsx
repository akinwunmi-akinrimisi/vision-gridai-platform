import { useState } from 'react';
import { Zap } from 'lucide-react';

function getDotColor(scene) {
  if (scene.skipped)
    return 'bg-muted-foreground';
  if (scene.audio_status === 'failed' || scene.image_status === 'failed' || scene.video_status === 'failed')
    return 'bg-danger shadow-[0_0_4px_rgba(248,113,113,0.5)]';
  if (scene.clip_status === 'complete' || scene.clip_status === 'uploaded')
    return 'bg-success shadow-[0_0_4px_rgba(52,211,153,0.4)]';
  if (scene.video_status === 'uploaded' || scene.video_status === 'generated')
    return 'bg-info';
  if (scene.image_status === 'uploaded' || scene.image_status === 'generated')
    return 'bg-primary';
  if (scene.audio_status === 'uploaded' || scene.audio_status === 'generated')
    return 'bg-warning';
  return 'bg-muted';
}

function isPartialProgress(scene) {
  if (scene.skipped) return false;
  if (scene.audio_status === 'failed' || scene.image_status === 'failed' || scene.video_status === 'failed') return false;
  if (scene.clip_status === 'complete' || scene.clip_status === 'uploaded') return false;
  const hasAudio = scene.audio_status === 'uploaded' || scene.audio_status === 'generated';
  const hasImage = scene.image_status === 'uploaded' || scene.image_status === 'generated';
  const hasVideo = scene.video_status === 'uploaded' || scene.video_status === 'generated';
  return hasAudio || hasImage || hasVideo;
}

function getDotTooltipStatus(scene) {
  if (scene.skipped) return 'Skipped';
  if (scene.audio_status === 'failed' || scene.image_status === 'failed' || scene.video_status === 'failed') return 'Failed';
  if (scene.clip_status === 'complete' || scene.clip_status === 'uploaded') return 'Complete';
  if (scene.video_status === 'uploaded' || scene.video_status === 'generated') return 'Video done';
  if (scene.image_status === 'uploaded' || scene.image_status === 'generated') return 'Image done';
  if (scene.audio_status === 'uploaded' || scene.audio_status === 'generated') return 'Audio done';
  return 'Pending';
}

const LEGEND = [
  { label: 'Pending', color: 'bg-muted' },
  { label: 'Audio', color: 'bg-warning' },
  { label: 'Image', color: 'bg-primary' },
  { label: 'Video', color: 'bg-info' },
  { label: 'Complete', color: 'bg-success' },
  { label: 'Failed', color: 'bg-danger' },
  { label: 'Skipped', color: 'bg-muted-foreground' },
];

export default function DotGrid({ scenes = [], onSceneClick }) {
  const [hoveredScene, setHoveredScene] = useState(null);

  const chapters = scenes.reduce((acc, scene) => {
    const ch = scene.chapter || 'Unknown Chapter';
    if (!acc[ch]) acc[ch] = [];
    acc[ch].push(scene);
    return acc;
  }, {});

  const completedCount = scenes.filter(
    (s) => s.clip_status === 'complete' || s.clip_status === 'uploaded'
  ).length;
  const failedCount = scenes.filter(
    (s) => s.audio_status === 'failed' || s.image_status === 'failed' || s.video_status === 'failed'
  ).length;
  const pct = scenes.length > 0 ? Math.round((completedCount / scenes.length) * 100) : 0;

  return (
    <div data-testid="dot-grid" className="bg-card border border-border rounded-xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Scene Progress</h3>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-2xs text-muted-foreground tabular-nums">
          <span>{completedCount}/{scenes.length} done</span>
          {failedCount > 0 && (
            <span className="text-danger">{failedCount} failed</span>
          )}
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Chapter groups */}
      <div className="space-y-3">
        {Object.entries(chapters).map(([chapterName, chapterScenes]) => (
          <div key={chapterName}>
            <div className="text-2xs uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
              {chapterName}
            </div>
            <div className="flex flex-wrap gap-[3px]">
              {chapterScenes.map((scene, index) => (
                <div
                  key={scene.id}
                  data-testid={`dot-${scene.scene_number}`}
                  className={`
                    w-[6px] h-[6px] rounded-sm transition-all duration-300
                    ${onSceneClick ? 'cursor-pointer' : 'cursor-default'}
                    hover:scale-[2] hover:z-10 hover:ring-2 hover:ring-foreground/20
                    ${getDotColor(scene)}
                    ${isPartialProgress(scene) ? 'animate-glow-pulse' : ''}
                  `}
                  style={{
                    opacity: 0,
                    animation: `fade-in 0.3s ease-out ${Math.min(index * 8, 500)}ms forwards${isPartialProgress(scene) ? ', glow-pulse 2s ease-in-out infinite' : ''}`,
                  }}
                  onClick={() => onSceneClick?.(scene)}
                  onMouseEnter={() => setHoveredScene(scene)}
                  onMouseLeave={() => setHoveredScene(null)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredScene && (
        <div
          data-testid="dot-tooltip"
          className="mt-3 px-3 py-2 rounded-lg text-xs bg-muted border border-border"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              Scene {hoveredScene.scene_number}
            </span>
            <span className="text-2xs text-muted-foreground">
              {getDotTooltipStatus(hoveredScene)}
            </span>
          </div>
          <span className="text-2xs text-muted-foreground mt-0.5 block">
            audio: {hoveredScene.audio_status} | image: {hoveredScene.image_status} | video: {hoveredScene.video_status}
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border flex-wrap">
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1 text-2xs text-muted-foreground">
            <span className={`w-2 h-2 rounded-[2px] ${item.color}`} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
