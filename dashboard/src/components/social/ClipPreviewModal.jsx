import { ExternalLink, Clock, Hash, Film } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

function formatDuration(ms) {
  if (!ms) return '--';
  const seconds = Math.round(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ClipPreviewModal({ isOpen, onClose, clip }) {
  if (!clip) return null;

  const topicTitle = clip.topics?.seo_title || 'Untitled';
  const projectName = clip.topics?.projects?.name || 'Unknown';
  const hashtags = clip.hashtags || [];
  const driveUrl = clip.portrait_drive_url;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Clip Preview</DialogTitle>
          <DialogDescription className="sr-only">
            Preview of {clip.clip_title || 'clip'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 9:16 video container */}
          <div className="relative mx-auto w-full max-w-[240px] rounded-lg overflow-hidden bg-black border border-border">
            <div className="aspect-[9/16]">
              {driveUrl ? (
                <video
                  src={driveUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain bg-black"
                  preload="metadata"
                >
                  Your browser does not support video playback.
                </video>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Film className="w-10 h-10 mb-2" />
                  <span className="text-xs">Video not available</span>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-3">
            {/* Title */}
            <div>
              <h3 className="text-sm font-semibold leading-snug">
                {clip.clip_title || `Clip #${clip.clip_number || '?'}`}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {projectName} &mdash; {topicTitle}
              </p>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(clip.actual_duration_ms || clip.estimated_duration_ms)}
              </span>
              {clip.virality_score != null && (
                <span className="flex items-center gap-1">
                  <span className={clip.virality_score >= 8 ? 'text-warning' : ''}>
                    {clip.virality_score >= 8 ? '\uD83D\uDD25' : '\u2B50'}
                  </span>
                  {clip.virality_score}/10
                </span>
              )}
            </div>

            {/* Hook text */}
            {clip.hook_text && (
              <div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Hook
                </span>
                <p className="text-xs mt-0.5 leading-relaxed">
                  {clip.hook_text}
                </p>
              </div>
            )}

            {/* Caption */}
            {clip.caption && (
              <div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Caption
                </span>
                <p className="text-xs mt-0.5 leading-relaxed line-clamp-3">
                  {clip.caption}
                </p>
              </div>
            )}

            {/* Hashtags */}
            {hashtags.length > 0 && (
              <div className="flex items-start gap-1.5 flex-wrap">
                <Hash className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                {hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium text-primary"
                  >
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            )}

            {/* Drive link */}
            {driveUrl && (
              <a
                href={driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Open in Google Drive
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
