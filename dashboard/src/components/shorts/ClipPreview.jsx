import { Film, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 9:16 aspect ratio video player for finished short-form clips.
 * Shows embedded video with Drive link fallback.
 *
 * @param {{ clip: object, className?: string }} props
 */
export default function ClipPreview({ clip, className }) {
  if (!clip) return null;

  const driveUrl = clip.portrait_drive_url;

  return (
    <div className={className}>
      <div className="relative mx-auto w-full max-w-[240px] rounded-xl overflow-hidden bg-card border border-border">
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

      {/* Metadata below player */}
      {clip.clip_title && (
        <p className="text-sm font-semibold text-foreground text-center mt-3">
          {clip.clip_title}
        </p>
      )}

      {driveUrl && (
        <div className="flex justify-center mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            asChild
          >
            <a href={driveUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3" />
              Open in Drive
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
