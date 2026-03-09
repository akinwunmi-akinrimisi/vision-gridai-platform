import { useState } from 'react';
import { Zap } from 'lucide-react';

/**
 * Determine dot color based on scene statuses.
 * Priority: failed > clip_complete > video > image > audio > skipped > pending
 */
function getDotColor(scene) {
  if (scene.skipped) return 'bg-slate-400';
  if (
    scene.audio_status === 'failed' ||
    scene.image_status === 'failed' ||
    scene.video_status === 'failed'
  )
    return 'bg-red-500';
  if (scene.clip_status === 'complete' || scene.clip_status === 'uploaded')
    return 'bg-emerald-500 green';
  if (scene.video_status === 'uploaded' || scene.video_status === 'generated')
    return 'bg-purple-500';
  if (scene.image_status === 'uploaded' || scene.image_status === 'generated')
    return 'bg-cyan-500';
  if (scene.audio_status === 'uploaded' || scene.audio_status === 'generated')
    return 'bg-blue-500';
  return 'bg-slate-200 dark:bg-white/[0.06] gray';
}

/**
 * Scene progress dot grid grouped by chapter.
 * Colors dots by furthest completed stage.
 */
export default function DotGrid({ scenes = [] }) {
  const [hoveredScene, setHoveredScene] = useState(null);

  // Group scenes by chapter
  const chapters = scenes.reduce((acc, scene) => {
    const ch = scene.chapter || 'Unknown Chapter';
    if (!acc[ch]) acc[ch] = [];
    acc[ch].push(scene);
    return acc;
  }, {});

  return (
    <div data-testid="dot-grid" className="glass-card p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Scene-by-Scene Progress
        </h3>
        <span className="text-xs text-text-muted dark:text-text-muted-dark">
          ({scenes.length} scenes)
        </span>
      </div>

      <div className="space-y-3">
        {Object.entries(chapters).map(([chapterName, chapterScenes]) => (
          <div key={chapterName}>
            <div className="text-[10px] uppercase tracking-wider text-text-muted dark:text-text-muted-dark mb-1.5 font-medium">
              {chapterName}
            </div>
            <div className="flex flex-wrap gap-1 relative">
              {chapterScenes.map((scene) => (
                <div
                  key={scene.id}
                  data-testid={`dot-${scene.scene_number}`}
                  className={`w-2.5 h-2.5 rounded-sm transition-colors duration-300 cursor-default ${getDotColor(scene)}`}
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
          className="
            mt-3 px-3 py-2 rounded-lg text-xs
            bg-slate-100 dark:bg-white/[0.06]
            border border-border/50 dark:border-white/[0.06]
            text-slate-700 dark:text-slate-300
          "
        >
          <span className="font-semibold">Scene {hoveredScene.scene_number}</span>
          <span className="block mt-0.5 text-text-muted dark:text-text-muted-dark">
            audio={hoveredScene.audio_status}, image={hoveredScene.image_status},
            video={hoveredScene.video_status}, clip={hoveredScene.clip_status}
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-[10px] text-text-muted dark:text-text-muted-dark flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-slate-200 dark:bg-white/[0.06]" /> Pending
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-blue-500" /> Audio
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-cyan-500" /> Image
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-purple-500" /> Video
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-emerald-500" /> Complete
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-red-500" /> Failed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-slate-400" /> Skipped
        </span>
      </div>
    </div>
  );
}
