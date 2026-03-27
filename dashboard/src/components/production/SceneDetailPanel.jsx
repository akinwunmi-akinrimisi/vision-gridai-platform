import { useState } from 'react';
import {
  Mic,
  Image,
  Film,
  Clock,
  RefreshCw,
  SkipForward,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import SidePanel from '../ui/SidePanel';
import StatusBadge from '../shared/StatusBadge';
import { Button } from '@/components/ui/button';

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

const VISUAL_TYPE_MAP = {
  static_image: { label: 'Static Image', status: 'scripting' },
  i2v: { label: 'I2V', status: 'review' },
  t2v: { label: 'T2V', status: 'assembly' },
};

const STATUS_TO_BADGE = {
  pending: 'pending',
  generated: 'scripting',
  uploaded: 'approved',
  failed: 'failed',
  complete: 'published',
};

/**
 * Collapsible section within the panel.
 */
function PanelSection({ title, icon: Icon, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left cursor-pointer hover:bg-card-hover transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <Icon className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold">{title}</span>
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
 */
export default function SceneDetailPanel({ scene, isOpen, onClose, onRetry, onSkip }) {
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  if (!scene) return <SidePanel isOpen={false} onClose={onClose} title="" />;

  const visualType = VISUAL_TYPE_MAP[scene.visual_type] || { label: scene.visual_type || 'Unknown', status: 'pending' };
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
          <StatusBadge status={visualType.status} label={visualType.label} />
          {isFailed && <StatusBadge status="failed" label="Failed" />}
          {isSkipped && <StatusBadge status="pending" label="Skipped" />}
        </div>

        {/* Chapter & Emotional Beat */}
        {(scene.chapter || scene.emotional_beat) && (
          <div className="space-y-1.5">
            {scene.chapter && (
              <div>
                <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Chapter
                </span>
                <p className="text-sm mt-0.5">
                  {scene.chapter}
                </p>
              </div>
            )}
            {scene.emotional_beat && (
              <div>
                <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Emotional Beat
                </span>
                <p className="text-sm text-foreground/70 mt-0.5 italic">
                  {scene.emotional_beat}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Narration text */}
        {scene.narration_text && (
          <div>
            <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
              Narration
            </span>
            <p className="text-sm text-foreground/70 mt-1 leading-relaxed line-clamp-4">
              {scene.narration_text}
            </p>
          </div>
        )}

        {/* Audio Section */}
        <PanelSection title="Audio" icon={Mic}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs text-muted-foreground">Status</span>
              <StatusBadge status={STATUS_TO_BADGE[scene.audio_status] || 'pending'} label={scene.audio_status} />
            </div>
            {scene.audio_duration_ms != null && (
              <div className="flex items-center justify-between">
                <span className="text-2xs text-muted-foreground">Duration</span>
                <span className="text-xs font-medium tabular-nums">
                  {formatDuration(scene.audio_duration_ms)}
                </span>
              </div>
            )}
            {scene.audio_file_drive_id && (
              <div className="flex items-center justify-between">
                <span className="text-2xs text-muted-foreground">Drive ID</span>
                <span className="text-2xs text-muted-foreground font-mono truncate max-w-[140px]" title={scene.audio_file_drive_id}>
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
              <span className="text-2xs text-muted-foreground">Status</span>
              <StatusBadge status={STATUS_TO_BADGE[scene.image_status] || 'pending'} label={scene.image_status} />
            </div>
            {scene.image_url && (
              <div className="mt-2 rounded-lg overflow-hidden border border-border">
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
                  className="text-2xs font-medium text-primary hover:text-primary-hover transition-colors cursor-pointer"
                >
                  {showFullPrompt ? 'Hide prompt' : 'Show prompt'}
                </button>
                {showFullPrompt && (
                  <p className="text-2xs text-muted-foreground mt-1 leading-relaxed bg-muted p-2 rounded-lg">
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
                <span className="text-2xs text-muted-foreground">Status</span>
                <StatusBadge status={STATUS_TO_BADGE[scene.video_status] || 'pending'} label={scene.video_status} />
              </div>
              {scene.video_url && (
                <div className="mt-2 rounded-lg overflow-hidden border border-border bg-black">
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
                  <span className="text-2xs text-muted-foreground">Drive ID</span>
                  <span className="text-2xs text-muted-foreground font-mono truncate max-w-[140px]" title={scene.video_drive_id}>
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
              <span className="text-2xs text-muted-foreground">Start</span>
              <span className="text-xs font-mono tabular-nums">
                {formatTimestamp(scene.start_time_ms)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xs text-muted-foreground">End</span>
              <span className="text-xs font-mono tabular-nums">
                {formatTimestamp(scene.end_time_ms)}
              </span>
            </div>
            {scene.audio_duration_ms != null && (
              <div className="flex items-center justify-between">
                <span className="text-2xs text-muted-foreground">Duration</span>
                <span className="text-xs font-mono tabular-nums">
                  {formatDuration(scene.audio_duration_ms)}
                </span>
              </div>
            )}
          </div>
        </PanelSection>

        {/* Skip reason */}
        {scene.skipped && scene.skip_reason && (
          <div className="p-3 rounded-lg bg-muted">
            <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
              Skip Reason
            </span>
            <p className="text-xs text-foreground/70 mt-0.5">
              {scene.skip_reason}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button size="sm" onClick={() => onRetry(scene.id)} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Scene
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onSkip(scene.id)} className="gap-1.5">
            <SkipForward className="w-3.5 h-3.5" />
            Skip Scene
          </Button>
        </div>
      </div>
    </SidePanel>
  );
}
