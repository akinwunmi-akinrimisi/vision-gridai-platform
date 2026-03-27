import { useState } from 'react';
import { Download, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Parse key_segments string into chapter objects.
 * Expects formats like "Chapter 1: Title (20min)" or just "Title - 20min"
 */
function parseChapters(keySegments) {
  if (!keySegments) return [];
  const segments = typeof keySegments === 'string'
    ? keySegments.split(/[;\n]/).map((s) => s.trim()).filter(Boolean)
    : Array.isArray(keySegments) ? keySegments : [];

  return segments.map((seg, i) => {
    // Try to extract duration
    const durMatch = seg.match(/(\d+)\s*min/i);
    const durationMin = durMatch ? parseInt(durMatch[1], 10) : null;
    const title = seg.replace(/\(\d+\s*min\)/i, '').replace(/\d+\s*min/i, '').replace(/^(Chapter\s*\d+\s*[:\-]?\s*)/i, '').trim() || `Segment ${i + 1}`;
    return { title, durationMin, index: i };
  });
}

/**
 * ChapterMarkers - horizontal track with position indicators.
 */
function ChapterMarkers({ chapters }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!chapters || chapters.length === 0) return null;

  const totalDuration = chapters.reduce((s, c) => s + (c.durationMin || 10), 0);
  let cumulative = 0;

  return (
    <div className="mt-3">
      <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Chapters</p>
      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
        {chapters.map((ch, i) => {
          const dur = ch.durationMin || 10;
          const startPct = (cumulative / totalDuration) * 100;
          const widthPct = (dur / totalDuration) * 100;
          cumulative += dur;

          const colors = [
            'bg-info/60', 'bg-primary/60', 'bg-success/60',
            'bg-warning/60', 'bg-info/40', 'bg-danger/60',
          ];

          return (
            <div
              key={i}
              className={`absolute top-0 h-full ${colors[i % colors.length]} hover:opacity-80 transition-opacity cursor-pointer border-r border-background/30`}
              style={{ left: `${startPct}%`, width: `${widthPct}%` }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Hover tooltip */}
              {hoveredIdx === i && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap">
                  <div className="bg-popover text-popover-foreground text-[10px] rounded-md px-2 py-1 shadow-lg border border-border">
                    {ch.title}{ch.durationMin ? ` (${ch.durationMin}min)` : ''}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Legend labels */}
      <div className="flex flex-wrap gap-2 mt-1.5">
        {chapters.map((ch, i) => (
          <span key={i} className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={ch.title}>
            {i + 1}. {ch.title}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Video player component -- shows YouTube embed for published videos,
 * Google Drive iframe for review, with download button and chapter markers.
 */
export default function VideoPlayer({ topic }) {
  const isPublished = topic?.status === 'published' && topic?.youtube_video_id;
  const driveFileId = extractDriveId(topic?.drive_video_url);
  const chapters = parseChapters(topic?.key_segments);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="video-player">
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
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
              <Play className="w-8 h-8 opacity-40" />
            </div>
            <span className="text-sm">No video available</span>
          </div>
        )}
      </div>

      {/* Chapter markers */}
      {chapters.length > 0 && (
        <div className="px-4 py-3 border-t border-border">
          <ChapterMarkers chapters={chapters} />
        </div>
      )}

      {driveFileId && !isPublished && (
        <div className={`px-4 py-3 ${chapters.length > 0 ? '' : 'border-t border-border'}`}>
          <a
            href={`https://drive.google.com/uc?export=download&id=${driveFileId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="sm" className="gap-2 text-primary">
              <Download className="w-4 h-4" />
              Download Video
            </Button>
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
