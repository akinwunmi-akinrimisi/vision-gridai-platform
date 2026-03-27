import { useState, useEffect } from 'react';
import {
  Film,
  Clock,
  Hash,
  CheckCircle2,
  SkipForward,
  Pencil,
  Save,
  X,
  FileText,
  ChevronDown,
  Play,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ViralityBadge from './ViralityBadge';
import StatusBadge from '../shared/StatusBadge';

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const REVIEW_STATUS = {
  pending: { status: 'pending', label: 'Pending' },
  approved: { status: 'approved', label: 'Approved' },
  skipped: { status: 'rejected', label: 'Skipped' },
};

const PRODUCTION_STATUS = {
  pending: { status: 'pending', label: 'Not started' },
  producing: { status: 'active', label: 'In progress' },
  complete: { status: 'assembled', label: 'Complete' },
  uploaded: { status: 'assembled', label: 'Uploaded' },
  failed: { status: 'failed', label: 'Failed' },
  cancelled: { status: 'active', label: 'Cancelled' },
};

function formatDuration(ms) {
  if (!ms) return '--';
  const seconds = Math.round(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Individual clip card for the review grid.
 * Shows virality score, title, narration preview, hashtags, actions.
 * Expands to show full script with original vs rewritten narration.
 */
export default function ClipCard({ clip, topicId, onApprove, onSkip, onSave, isSaving, onProduce, isProducing, onReproduce, onPreview }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [originalScenes, setOriginalScenes] = useState(null);
  const [scenesLoading, setScenesLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(clip.clip_title || '');
  const [editHook, setEditHook] = useState(clip.hook_text || '');
  const [editHashtags, setEditHashtags] = useState(
    (clip.hashtags || []).join(', ')
  );

  // Fetch original scenes when expanded
  useEffect(() => {
    if (!isExpanded || originalScenes || !clip.start_scene || !clip.end_scene) return;
    setScenesLoading(true);
    supabase
      .from('scenes')
      .select('scene_number,narration_text,image_prompt,visual_type,emotional_beat,audio_duration_ms,chapter')
      .eq('topic_id', topicId)
      .gte('scene_number', clip.start_scene)
      .lte('scene_number', clip.end_scene)
      .order('scene_number', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setOriginalScenes(data);
        setScenesLoading(false);
      });
  }, [isExpanded, originalScenes, clip.start_scene, clip.end_scene, topicId]);

  const reviewBadge = REVIEW_STATUS[clip.review_status] || REVIEW_STATUS.pending;
  const productionBadge = PRODUCTION_STATUS[clip.production_status] || PRODUCTION_STATUS.pending;
  const isPending = clip.review_status === 'pending';

  function handleSave() {
    onSave({
      clipId: clip.id,
      updates: {
        clip_title: editTitle,
        hook_text: editHook,
        hashtags: editHashtags.split(',').map((h) => h.trim()).filter(Boolean),
      },
    });
    setIsEditing(false);
  }

  function handleCancel() {
    setEditTitle(clip.clip_title || '');
    setEditHook(clip.hook_text || '');
    setEditHashtags((clip.hashtags || []).join(', '));
    setIsEditing(false);
  }

  return (
    <div className={`bg-card border rounded-xl p-4 transition-all ${
      clip.production_status === 'producing'
        ? 'border-l-2 border-l-info border-border'
        : 'border-border hover:border-border-hover'
    }`}>
      {/* Header: badges + virality */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-2xs font-medium bg-info-bg text-info border border-info-border">
            Clip #{clip.clip_number}
          </span>
          <StatusBadge
            status={reviewBadge.status}
            label={reviewBadge.label}
          />
          {clip.production_status && clip.production_status !== 'pending' && (
            <StatusBadge
              status={productionBadge.status}
              label={productionBadge.label}
            />
          )}
        </div>

        <ViralityBadge score={clip.virality_score} />
      </div>

      {/* Editing mode */}
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
              Title
            </label>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
              Hook Text
            </label>
            <Input
              value={editHook}
              onChange={(e) => setEditHook(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
              Hashtags (comma separated)
            </label>
            <Input
              value={editHashtags}
              onChange={(e) => setEditHashtags(e.target.value)}
              placeholder="#viral, #shorts"
              className="text-sm"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel} className="gap-1.5">
              <X className="w-3.5 h-3.5" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Title */}
          <h4 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">
            {clip.clip_title || 'Untitled clip'}
          </h4>

          {/* Hook text */}
          {clip.hook_text && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2 italic">
              "{clip.hook_text}"
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 text-2xs text-muted-foreground mb-3">
            {clip.start_scene != null && clip.end_scene != null && (
              <span className="flex items-center gap-1">
                <Film className="w-3 h-3" />
                Scenes {clip.start_scene}-{clip.end_scene}
              </span>
            )}
            {clip.estimated_duration_ms && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(clip.estimated_duration_ms)}
              </span>
            )}
            {clip.hashtags && clip.hashtags.length > 0 && (
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {clip.hashtags.length}
              </span>
            )}
          </div>

          {/* Production status indicator */}
          {clip.review_status === 'approved' && clip.production_status && clip.production_status !== 'pending' && (
            <div className="flex items-center gap-2 mb-3">
              {clip.production_status === 'producing' && (
                <span className="flex items-center gap-1.5 text-xs text-info font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Producing...
                  {clip.production_progress && (
                    <span className="text-2xs text-muted-foreground font-normal ml-1">
                      ({clip.production_progress})
                    </span>
                  )}
                </span>
              )}
              {(clip.production_status === 'complete' || clip.production_status === 'uploaded') && (
                <span className="flex items-center gap-1.5 text-xs text-success font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Complete
                  {clip.actual_duration_ms && (
                    <span className="text-2xs text-muted-foreground font-normal ml-1">
                      ({formatDuration(clip.actual_duration_ms)})
                    </span>
                  )}
                </span>
              )}
              {clip.production_status === 'failed' && (
                <div>
                  <span className="flex items-center gap-1.5 text-xs text-danger font-medium">
                    <X className="w-3.5 h-3.5" />
                    Failed
                  </span>
                  {clip.production_progress && (
                    <p className="text-2xs text-danger/80 mt-1 line-clamp-2">
                      {clip.production_progress}
                    </p>
                  )}
                </div>
              )}
              {clip.production_status === 'cancelled' && (
                <span className="flex items-center gap-1.5 text-xs text-warning font-medium">
                  <XCircle className="w-3.5 h-3.5" />
                  Cancelled
                </span>
              )}
              {clip.portrait_drive_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 px-1.5 text-2xs gap-1"
                  onClick={(ev) => { ev.stopPropagation(); onPreview?.(clip); }}
                >
                  <Play className="w-3 h-3" />
                  Preview
                </Button>
              )}
            </div>
          )}

          {/* Virality reason */}
          {clip.virality_reason && (
            <p className="text-2xs text-muted-foreground mb-3 line-clamp-2">
              {clip.virality_reason}
            </p>
          )}

          {/* Hashtags */}
          {clip.hashtags && clip.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {clip.hashtags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="inline-block px-1.5 py-0.5 rounded text-2xs font-medium bg-muted text-muted-foreground"
                >
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
              {clip.hashtags.length > 5 && (
                <span className="text-2xs text-muted-foreground">
                  +{clip.hashtags.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isPending && (
              <>
                <Button size="sm" onClick={() => onApprove(clip.id)} className="gap-1.5 bg-success hover:bg-success/90 text-white">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onSkip(clip.id)} className="gap-1.5">
                  <SkipForward className="w-3.5 h-3.5" />
                  Skip
                </Button>
              </>
            )}
            {clip.review_status === 'approved' && clip.production_status === 'pending' && (
              <Button
                size="sm"
                onClick={() => onProduce(clip.id)}
                disabled={isProducing}
                className="gap-1.5"
              >
                {isProducing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Produce
              </Button>
            )}
            {clip.production_status === 'failed' && (
              <Button
                size="sm"
                onClick={() => onProduce(clip.id)}
                disabled={isProducing}
                className="gap-1.5"
              >
                {isProducing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Retry
              </Button>
            )}
            {['complete', 'uploaded', 'cancelled', 'failed'].includes(clip.production_status) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReproduce?.(clip.id)}
                title="Re-produce clip (full reset)"
                className="gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Re-produce
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Script</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="ml-auto gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          </div>

          {/* Expandable full script view */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-border space-y-3">
              <h5 className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3 h-3" />
                Full Script -- Scenes {clip.start_scene}--{clip.end_scene}
              </h5>

              {scenesLoading && (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Loading scenes...</span>
                </div>
              )}

              {!scenesLoading && originalScenes && (() => {
                const rewriteMap = {};
                (clip.rewritten_narration || []).forEach(r => { rewriteMap[r.scene] = r.text; });
                const emphasisColors = {};
                (clip.emphasis_word_map || []).forEach(e => {
                  if (typeof e === 'object' && e.word) emphasisColors[e.word.toLowerCase()] = e.color || 'yellow';
                });
                const emphasisWords = Object.keys(emphasisColors);

                return originalScenes.map((scene, idx) => (
                  <div key={idx} className="rounded-lg bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xs font-bold text-primary uppercase tracking-wider">
                        Scene {scene.scene_number}
                      </span>
                      {scene.chapter && (
                        <span className="text-2xs text-muted-foreground">
                          | {scene.chapter}
                        </span>
                      )}
                      {scene.audio_duration_ms && (
                        <span className="text-2xs text-muted-foreground ml-auto tabular-nums">
                          {formatDuration(scene.audio_duration_ms)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">
                          Original Script
                        </span>
                        <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
                          {scene.narration_text}
                        </p>
                      </div>

                      {rewriteMap[scene.scene_number] && (
                        <div className="border-l-2 border-primary/30 pl-3">
                          <span className="text-2xs font-medium text-primary uppercase tracking-wider">
                            Short-Form Rewrite
                          </span>
                          <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
                            {rewriteMap[scene.scene_number].split(/(\s+)/).map((word, wi) => {
                              const clean = word.replace(/[^a-zA-Z0-9$%]/g, '').toLowerCase();
                              const matchKey = emphasisWords.find(ew => clean === ew || word.toLowerCase().includes(ew));
                              if (matchKey) {
                                const color = emphasisColors[matchKey];
                                return (
                                  <span key={wi} className={`font-bold ${color === 'red' ? 'text-danger' : 'text-warning'}`}>
                                    {word}
                                  </span>
                                );
                              }
                              return <span key={wi}>{word}</span>;
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()}

              {/* Emphasis words clickable toggle */}
              {(clip.emphasis_word_map || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-2xs text-muted-foreground font-medium">Caption Emphasis:</span>
                  {(clip.emphasis_word_map || []).map((e, i) => {
                    const word = typeof e === 'string' ? e : e.word;
                    const color = typeof e === 'object' ? e.color : 'yellow';
                    return (
                      <button
                        key={i}
                        className={`inline-block px-1.5 py-0.5 rounded text-2xs font-bold cursor-pointer transition-opacity hover:opacity-70 ${
                          color === 'red'
                            ? 'bg-danger-bg text-danger'
                            : 'bg-warning-bg text-warning'
                        }`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          const currentMap = [...(clip.emphasis_word_map || [])];
                          const entry = currentMap[i];
                          const currentColor = (typeof entry === 'object' ? entry.color : 'yellow');
                          if (currentColor === 'yellow') {
                            currentMap[i] = { word, color: 'red' };
                          } else if (currentColor === 'red') {
                            currentMap.splice(i, 1);
                          }
                          onSave({
                            clipId: clip.id,
                            updates: { emphasis_word_map: currentMap },
                          });
                        }}
                        title="Click to cycle color (yellow -> red -> remove)"
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
