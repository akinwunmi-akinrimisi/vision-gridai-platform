import { useState } from 'react';
import { Zap } from 'lucide-react';

function getDotColor(scene) {
  if (scene.skipped)
    return 'bg-slate-400 dark:bg-slate-500';
  if (scene.audio_status === 'failed' || scene.image_status === 'failed' || scene.video_status === 'failed')
    return 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]';
  if (scene.clip_status === 'complete' || scene.clip_status === 'uploaded')
    return 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)] green';
  if (scene.video_status === 'uploaded' || scene.video_status === 'generated')
    return 'bg-purple-500';
  if (scene.image_status === 'uploaded' || scene.image_status === 'generated')
    return 'bg-cyan-500';
  if (scene.audio_status === 'uploaded' || scene.audio_status === 'generated')
    return 'bg-blue-500';
  return 'bg-slate-200 dark:bg-white/[0.08] gray';
}

function isPartialProgress(scene) {
  if (scene.skipped) return false;
  if (scene.audio_status === 'failed' || scene.image_status === 'failed' || scene.video_status === 'failed') return false;
  if (scene.clip_status === 'complete' || scene.clip_status === 'uploaded') return false;
  // Partial: has some progress but not fully complete
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
  { label: 'Pending', color: 'bg-slate-200 dark:bg-white/[0.08]' },
  { label: 'Audio', color: 'bg-blue-500' },
  { label: 'Image', color: 'bg-cyan-500' },
  { label: 'Video', color: 'bg-purple-500' },
  { label: 'Complete', color: 'bg-emerald-500' },
  { label: 'Failed', color: 'bg-red-500' },
  { label: 'Skipped', color: 'bg-slate-400' },
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

  return (
    <div data-testid="dot-grid" className="glass-card p-4 sm:p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="section-title text-sm">Scene Progress</h3>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-2xs text-slate-400 dark:text-slate-500 tabular-nums">
          <span>{completedCount}/{scenes.length} done</span>
          {failedCount > 0 && (
            <span className="text-red-500">{failedCount} failed</span>
          )}
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="progress-bar-lg mb-5">
        <div
          className="progress-bar-fill"
          style={{ width: `${scenes.length > 0 ? (completedCount / scenes.length * 100) : 0}%` }}
        />
      </div>

      {/* Chapter groups */}
      <div className="space-y-3">
        {Object.entries(chapters).map(([chapterName, chapterScenes]) => (
          <div key={chapterName}>
            <div className="text-2xs uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 font-semibold">
              {chapterName}
            </div>
            <div className="flex flex-wrap gap-[3px]">
              {chapterScenes.map((scene, index) => (
                <div
                  key={scene.id}
                  data-testid={`dot-${scene.scene_number}`}
                  className={`
                    w-2.5 h-2.5 rounded-[3px] transition-all duration-300
                    ${onSceneClick ? 'cursor-pointer' : 'cursor-default'}
                    hover:scale-150 hover:z-10 hover:ring-2 hover:ring-white/50 dark:hover:ring-white/20
                    ${getDotColor(scene)}
                    ${isPartialProgress(scene) ? 'animate-pulse' : ''}
                  `}
                  style={{
                    opacity: 0,
                    animation: `fadeIn 0.3s ease-out ${Math.min(index * 8, 500)}ms forwards${isPartialProgress(scene) ? ', pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : ''}`,
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
          className="mt-3 px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Scene {hoveredScene.scene_number}
            </span>
            <span className="badge text-2xs">
              {getDotTooltipStatus(hoveredScene)}
            </span>
          </div>
          <span className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5 block">
            audio: {hoveredScene.audio_status} | image: {hoveredScene.image_status} | video: {hoveredScene.video_status}
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex-wrap">
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1 text-2xs text-slate-400 dark:text-slate-500">
            <span className={`w-2 h-2 rounded-[2px] ${item.color}`} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
