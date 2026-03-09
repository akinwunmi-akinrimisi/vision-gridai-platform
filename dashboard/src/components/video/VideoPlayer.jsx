import { Download, Play } from 'lucide-react';

/**
 * Video player component — shows YouTube embed for published videos,
 * Google Drive iframe for review, with download button.
 */
export default function VideoPlayer({ topic }) {
  const isPublished = topic?.status === 'published' && topic?.youtube_video_id;
  const driveFileId = extractDriveId(topic?.drive_video_url);

  return (
    <div className="glass-card rounded-xl overflow-hidden" data-testid="video-player">
      <div className="aspect-video bg-black relative">
        {isPublished ? (
          <iframe
            src={`https://www.youtube.com/embed/${topic.youtube_video_id}`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={topic.seo_title || 'Video preview'}
          />
        ) : driveFileId ? (
          <iframe
            src={`https://drive.google.com/file/d/${driveFileId}/preview`}
            className="absolute inset-0 w-full h-full"
            allow="autoplay"
            title={topic?.seo_title || 'Video preview'}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
            <Play className="w-12 h-12 mb-2 opacity-40" />
            <span className="text-sm">No video available</span>
          </div>
        )}
      </div>

      {driveFileId && !isPublished && (
        <div className="px-4 py-3 border-t border-border/50 dark:border-white/[0.06]">
          <a
            href={`https://drive.google.com/uc?export=download&id=${driveFileId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Video
          </a>
        </div>
      )}
    </div>
  );
}

function extractDriveId(url) {
  if (!url) return null;
  if (!url.includes('/')) return url;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
