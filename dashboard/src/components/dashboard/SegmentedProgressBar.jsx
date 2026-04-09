import { useState } from 'react';

/**
 * Pipeline stage definitions for the segmented progress bar.
 * Each segment maps to a production phase with its own color and weight.
 */
const SEGMENTS = [
  { key: 'script',         label: 'Script',   color: 'bg-info',       weight: 0.10 },
  { key: 'classification', label: 'Classify',  color: 'bg-warning',    weight: 0.08 },
  { key: 'audio',          label: 'Audio',    color: 'bg-primary',    weight: 0.22 },
  { key: 'images',         label: 'Images',   color: 'bg-accent',     weight: 0.22 },
  { key: 'captions',       label: 'Captions', color: 'bg-warning',    weight: 0.18 },
  { key: 'assembly',       label: 'Assembly', color: 'bg-success',    weight: 0.20 },
];

/** Statuses that mean scripting is fully complete */
const POST_SCRIPT_STATUSES = [
  'script_approved', 'classifying', 'queued', 'producing', 'audio', 'images',
  'assembling', 'assembled', 'ready_review', 'video_approved',
  'publishing', 'scheduled', 'published',
];

/** Statuses that mean captions/assembly are fully complete */
const POST_ASSEMBLY_STATUSES = [
  'assembled', 'ready_review', 'video_approved', 'publishing', 'scheduled', 'published',
];

const POST_CAPTIONS_STATUSES = [
  'assembling', ...POST_ASSEMBLY_STATUSES,
];

/**
 * Parse a progress string like "done:47/172" into a percentage.
 */
function parseProgressString(val) {
  if (!val || val === 'pending') return 0;
  if (val === 'complete') return 100;
  const match = val.match?.(/done:(\d+)\/(\d+)/);
  if (match) {
    const [, done, total] = match;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }
  return 0;
}

/**
 * Parse a progress string into a "done/total" display string.
 */
function parseProgressLabel(val) {
  if (!val || val === 'pending') return null;
  if (val === 'complete') return 'Complete';
  const match = val.match?.(/done:(\d+)\/(\d+)/);
  if (match) return `${match[1]}/${match[2]} scenes`;
  return null;
}

/**
 * Compute individual segment fill percentages from topic data.
 */
function computeSegments(topic) {
  const { status, classification_status, audio_progress, images_progress, assembly_status } = topic;

  // Script
  let script = 0;
  if (status === 'scripting') script = 50;
  else if (POST_SCRIPT_STATUSES.includes(status)) script = 100;

  // Classification (after script approval, before production)
  let classification = 0;
  let classLabel = null;
  if (classification_status === 'reviewed') {
    classification = 100;
    classLabel = 'Reviewed';
  } else if (classification_status === 'classified') {
    classification = 100;
    classLabel = 'Classified';
  } else if (classification_status === 'classifying') {
    classification = 50;
    classLabel = 'In progress';
  } else if (POST_SCRIPT_STATUSES.includes(status) && status !== 'script_approved') {
    // If we're past script_approved and into production, classification must be done
    classification = 100;
    classLabel = 'Complete';
  }

  // Audio
  const audio = POST_SCRIPT_STATUSES.includes(status) ? parseProgressString(audio_progress) : 0;

  // Images
  const images = POST_SCRIPT_STATUSES.includes(status) ? parseProgressString(images_progress) : 0;

  // Captions
  let captions = 0;
  if (POST_CAPTIONS_STATUSES.includes(status)) captions = 100;
  else if (status === 'images' || status === 'producing') {
    const mediaComplete = audio === 100 && images === 100;
    captions = mediaComplete ? 50 : 0;
  }

  // Assembly
  let assembly = 0;
  if (assembly_status === 'complete' || POST_ASSEMBLY_STATUSES.includes(status)) assembly = 100;
  else if (status === 'assembling') assembly = 50;

  return {
    script:         { pct: script,         label: script === 100 ? 'Complete' : script > 0 ? 'In progress' : null },
    classification: { pct: classification, label: classLabel },
    audio:          { pct: audio,          label: parseProgressLabel(audio_progress) },
    images:         { pct: images,         label: parseProgressLabel(images_progress) },
    captions:       { pct: captions,       label: captions === 100 ? 'Complete' : captions > 0 ? 'In progress' : null },
    assembly:       { pct: assembly,       label: assembly === 100 ? 'Complete' : assembly > 0 ? 'In progress' : null },
  };
}

/**
 * Compute the overall weighted progress percentage.
 */
export function computeWeightedProgress(topic) {
  const { status } = topic;
  if (['published', 'assembled', 'ready_review', 'video_approved', 'scheduled'].includes(status)) return 100;
  if (status === 'publishing') return 95;
  if (!['scripting', 'script_approved', 'classifying', 'queued', 'producing', 'audio', 'images', 'assembling'].includes(status)) return null;

  const segments = computeSegments(topic);
  let total = 0;
  SEGMENTS.forEach((seg) => {
    total += (segments[seg.key]?.pct || 0) * seg.weight;
  });
  return Math.round(total);
}

/**
 * SegmentedProgressBar - Shows an 8-segment pipeline progress bar.
 * Each segment represents a production stage with independent fill levels.
 * Includes Scene Classification between Script and Audio.
 * Uses Neon Pipeline design tokens.
 *
 * @param {{ topic: object }} props
 */
export default function SegmentedProgressBar({ topic }) {
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const segments = computeSegments(topic);

  return (
    <div className="relative group">
      {/* Segment bar row */}
      <div className="flex gap-px items-center" role="progressbar" aria-label="Pipeline progress">
        {SEGMENTS.map((seg) => {
          const data = segments[seg.key];
          const isActive = data.pct > 0;
          const isComplete = data.pct >= 100;

          return (
            <div
              key={seg.key}
              className="relative"
              style={{ flex: seg.weight }}
              onMouseEnter={() => setHoveredSegment(seg.key)}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              {/* Track */}
              <div className="h-1.5 rounded-full overflow-hidden bg-muted">
                {/* Fill */}
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    isComplete
                      ? seg.color
                      : isActive
                        ? `${seg.color} opacity-70`
                        : ''
                  }`}
                  style={{ width: `${data.pct}%` }}
                />
              </div>

              {/* Tooltip */}
              {hoveredSegment === seg.key && (
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                             px-2.5 py-1.5 rounded-md text-2xs font-medium whitespace-nowrap
                             bg-card text-foreground
                             border border-border
                             shadow-card pointer-events-none animate-fade-in"
                  style={{ animationDuration: '150ms' }}
                >
                  <span className="font-semibold">{seg.label}:</span>{' '}
                  {data.pct}%{data.label ? ` (${data.label})` : ''}
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-card" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
