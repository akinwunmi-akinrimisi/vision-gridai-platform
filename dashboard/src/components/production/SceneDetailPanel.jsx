import { useState } from 'react';
import {
  Mic,
  Image,
  Film,
  Clock,
  Play,
  RefreshCw,
  SkipForward,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import SidePanel from '../ui/SidePanel';

/**
 * Format milliseconds to human-readable "HH:MM:SS.mmm" timestamp.
 */
function formatTimestamp(ms) {
  if (ms == null) return '--';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const remainder = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(remainder).padStart(3, '0')}`;
}

/**
 * Format milliseconds to short duration "Xs" or "Xm Xs".
 */
function formatDuration(ms) {
  if (!ms) return '--';
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
}

const VISUAL_TYPE_BADGE = {
  static_image: { label: 'Static Image', cls: 'badge-cyan' },
  i2v: { label: 'I2V', cls: 'badge-purple' },
  t2v: { label: 'T2V', cls: 'badge-amber' },
};

const STATUS_BADGE = {
  pending: { label: 'Pending', cls: 'badge-amber' },
  generated: { label: 'Generated', cls: 'badge-blue' },
  uploaded: { label: 'Uploaded', cls: 'badge-green' },
  failed: { label: 'Failed', cls: 'badge-red' },
  complete: { label: 'Complete', cls: 'badge-green' },
};

function StatusBadge({ status }) {
  const badge = STATUS_BADGE[status] || { label: status || 'Unknown', cls: 'badge' };
  return <span className={`badge ${badge.cls} text-2xs`}>{badge.label}</span>;
}

/**
 * Collapsible section within the panel.
 */
function PanelSection({ title, icon: Icon, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200/60 dark:border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        )}
        <Icon className="w-3.5 h-3.5 text-primary dark:text-blue-400" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{title}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Scene detail side panel, shown when a dot is clicked in the DotGrid.
 *
 * @param {object|null} scene - The selected scene data
 * @param {boolean} isOpen - Whether to show the panel
 * @param {Function} onClose - Close callback
 * @param {Function} onRetry - Retry callback (scene_id)
 * @param {Function} onSkip - Skip callback (scene_id)
 */
export default function SceneDetailPanel({ scene, isOpen, onClose, onRetry, onSkip }) {
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  if (!scene) return <SidePanel isOpen={false} onClose={onClose} title="" />;

  const visualBadge = VISUAL_TYPE_BADGE[scene.visual_type] || { label: scene.visual_type || 'Unknown', cls: 'badge' };
  const isFailed = scene.audio_status === 'failed' || scene.image_status === 'failed' || scene.video_status === 'failed';
  const isSkipped = scene.skipped;
  const hasVideo = scene.visual_type === 'i2v' || scene.visual_type === 't2v';

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={`Scene ${scene.scene_number}`}
      width="w-[380px]"
    >
      <div className="space-y-4">
        {/* Header badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge ${visualBadge.cls} text-2xs`}>{visualBadge.label}</span>
          {isFailed && <span className="badge badge-red text-2xs">Failed</span>}
          {isSkipped && <span className="badge text-2xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Skipped</span>}
        </div>

        {/* Chapter & Emotional Beat */}
        {(scene.chapter || scene.emotional_beat) && (
          <div className="space-y-1.5">
            {scene.chapter && (
              <div>
                <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Chapter
                </span>
                <p className="text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                  {scene.chapter}
                </p>
              </div>
            )}
            {scene.emotional_beat && (
              <div>
                <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Emotional Beat
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 italic">
                  {scene.emotional_beat}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Narration text */}
        {scene.narration_text && (
          <div>
            <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Narration
            </span>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed line-clamp-4">
              {scene.narration_text}
            </p>
          </div>
        )}

        {/* Audio Section */}
        <PanelSection title="Audio" icon={Mic}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs text-slate-500 dark:text-slate-400">Status</span>
              <StatusBadge status={scene.audio_status} />
            </div>
            {scene.audio_duration_ms != null && (
              <div className="flex items-center justify-between">
                <span className="text-2xs text-slate-500 dark:text-slate-400">Duration</span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                  {formatDuration(scene.audio_duration_ms)}
                </span>
              </div>
            )}
            {scene.audio_file_drive_id && (
              <div className="flex items-center justify-between">
                <span className="text-2xs text-slate-500 dark:text-slate-400">Drive ID</span>
                <span className="text-2xs text-slate-400 dark:text-slate-500 font-mono truncate max-w-[140px]" title={scene.audio_file_drive_id}>
                  {scene.audio_file_drive_id}
                </span>
              </div>
            )}
            {scene.audio_file_url && (
              <audio
                src={scene.audio_file_url}
                controls
                preload="metadata"
                className="w-full h-8 mt-1"
              />
            )}
          </div>
        </PanelSection>

        {/* Image Section */}
        <PanelSection title="Image" icon={Image}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs text-slate-500 dark:text-slate-400">Status</span>
              <StatusBadge status={scene.image_status} />
            </div>
            {scene.image_url && (
              <div className="mt-2 rounded-lg overflow-hidden border border-slate-200/60 dark:border-white/[0.06]">
                <img
                  src={scene.image_url}
                  alt={`Scene ${scene.scene_number} image`}
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
            )}
            {scene.image_prompt && (
              <div>
                <button
                  onClick={() => setShowFullPrompt(!showFullPrompt)}
                  className="text-2xs font-medium text-primary dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {showFullPrompt ? 'Hide prompt' : 'Show prompt'}
                </button>
                {showFullPrompt && (
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed bg-slate-50 dark:bg-white/[0.02] p-2 rounded-lg">
                    {scene.image_prompt}
                  </p>
                )}
              </div>
            )}
          </div>
        </PanelSection>

        {/* Video Section (only for i2v/t2v) */}
        {hasVideo && (
          <PanelSection title="Video" icon={Film}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xs text-slate-500 dark:text-slate-400">Status</span>
                <StatusBadge status={scene.video_status} />
              </div>
              {scene.video_url && (
                <div className="mt-2 rounded-lg overflow-hidden border border-slate-200/60 dark:border-white/[0.06] bg-black">
                  <video
                    src={scene.video_url}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-auto"
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              )}
              {scene.video_drive_id && (
                <div className="flex items-center justify-between">
                  <span className="text-2xs text-slate-500 dark:text-slate-400">Drive ID</span>
                  <span className="text-2xs text-slate-400 dark:text-slate-500 font-mono truncate max-w-[140px]" title={scene.video_drive_id}>
                    {scene.video_drive_id}
                  </span>
                </div>
              )}
            </div>
          </PanelSection>
        )}

        {/* Timeline */}
        <PanelSection title="Timeline" icon={Clock} defaultOpen={false}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs text-slate-500 dark:text-slate-400">Start</span>
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                {formatTimestamp(scene.start_time_ms)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xs text-slate-500 dark:text-slate-400">End</span>
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                {formatTimestamp(scene.end_time_ms)}
              </span>
            </div>
            {scene.audio_duration_ms != null && (
              <div className="flex items-center justify-between">
                <span className="text-2xs text-slate-500 dark:text-slate-400">Duration</span>
                <span className="text-xs font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                  {formatDuration(scene.audio_duration_ms)}
                </span>
              </div>
            )}
          </div>
        </PanelSection>

        {/* Skip reason */}
        {scene.skipped && scene.skip_reason && (
          <div className="p-3 rounded-lg bg-slate-100/80 dark:bg-white/[0.03]">
            <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Skip Reason
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {scene.skip_reason}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
          <button
            onClick={() => onRetry(scene.id)}
            className="btn-primary btn-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Scene
          </button>
          <button
            onClick={() => onSkip(scene.id)}
            className="btn-ghost btn-sm"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip Scene
          </button>
        </div>
      </div>
    </SidePanel>
  );
}
