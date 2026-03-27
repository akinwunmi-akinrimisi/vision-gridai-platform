import { useState, useMemo } from 'react';
import {
  Pencil,
  CheckCircle,
  XCircle,
  RefreshCw,
  ImageIcon,
  X,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/**
 * MetadataPanel - Sticky left panel showing video metadata with inline editing.
 * Displays title, description, tags, chapters, playlist in view mode.
 * Transforms to editable inputs when Edit Metadata is clicked.
 */
export default function MetadataPanel({
  topic,
  scenes = [],
  isPublished,
  onApprove,
  onReject,
  onRegenThumbnail,
  onUpdateMetadata,
  onRetryUpload,
  isRegenPending,
  isUpdatePending,
  isRetryPending,
}) {
  const [isEditing, setIsEditing] = useState(false);

  const metadata = topic?.script_metadata?.video_metadata || {};
  const tags = metadata.tags || [];

  // Editable fields state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState([]);
  const [editChapters, setEditChapters] = useState([]);
  const [editPlaylist, setEditPlaylist] = useState(1);
  const [editThumbnailPrompt, setEditThumbnailPrompt] = useState('');
  const [newTag, setNewTag] = useState('');

  // Generate chapters from scenes
  const chapters = useMemo(() => {
    if (!scenes.length) return [];
    const chapterMap = new Map();
    for (const scene of scenes) {
      if (scene.chapter && !chapterMap.has(scene.chapter)) {
        chapterMap.set(scene.chapter, scene.start_time_ms || 0);
      }
    }
    return Array.from(chapterMap.entries()).map(([name, ms]) => ({
      name,
      timestamp: formatTimestamp(ms),
      ms,
    }));
  }, [scenes]);

  // Generate description from template
  const description = useMemo(() => {
    const hookLine = topic?.narrative_hook || '';
    const chapterLines = chapters
      .map((ch) => `${ch.timestamp} ${ch.name}`)
      .join('\n');
    const tagLine = tags.length > 0 ? '\n\n' + tags.map((t) => `#${t}`).join(' ') : '';
    return `${hookLine}\n\n${chapterLines}${tagLine}\n\n---\nThis video contains educational content only.`;
  }, [topic, chapters, tags]);

  const startEditing = () => {
    setEditTitle(topic?.seo_title || '');
    setEditDescription(description);
    setEditTags([...tags]);
    setEditChapters(chapters.map((ch) => ({ ...ch })));
    setEditPlaylist(topic?.playlist_group || 1);
    setEditThumbnailPrompt(metadata.thumbnail_prompt || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setNewTag('');
  };

  const handleSave = () => {
    onUpdateMetadata({
      seo_title: editTitle,
      description: editDescription,
      tags: editTags,
      chapters: editChapters,
      playlist_group: editPlaylist,
      thumbnail_prompt: editThumbnailPrompt,
    });
    setIsEditing(false);
    setNewTag('');
  };

  const removeTag = (index) => {
    setEditTags((prev) => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !editTags.includes(trimmed)) {
      setEditTags((prev) => [...prev, trimmed]);
      setNewTag('');
    }
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const isFailed = topic?.publish_progress === 'failed';

  return (
    <div className="bg-card border border-border rounded-xl" data-testid="metadata-panel">
      <div className="p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">
            Title
          </label>
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-sm"
              data-testid="edit-title-input"
            />
          ) : (
            <h2 className="text-sm font-bold leading-snug">
              {topic?.seo_title || topic?.original_title}
            </h2>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">
            Description
          </label>
          {isEditing ? (
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={8}
              className="text-xs font-mono resize-y"
            />
          ) : (
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto scrollbar-thin">
              {description}
            </pre>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">
            Tags
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(isEditing ? editTags : tags).map((tag, i) => (
              <span
                key={i}
                className="rounded-sm bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium inline-flex items-center gap-1"
              >
                {tag}
                {isEditing && (
                  <button
                    onClick={() => removeTag(i)}
                    className="hover:text-danger transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
            {isEditing && (
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tag..."
                className="rounded-sm bg-background border border-dashed border-border px-2.5 py-0.5 text-xs w-24 focus:outline-none focus:border-primary transition-colors"
                data-testid="add-tag-input"
              />
            )}
          </div>
        </div>

        {/* Chapters */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">
            Chapters
          </label>
          <div className="space-y-1">
            {(isEditing ? editChapters : chapters).map((ch, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={ch.timestamp}
                      onChange={(e) => {
                        const updated = [...editChapters];
                        updated[i] = { ...updated[i], timestamp: e.target.value };
                        setEditChapters(updated);
                      }}
                      className="w-16 px-2 py-1 rounded-sm bg-background border border-input text-muted-foreground font-mono text-[11px] focus:outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      value={ch.name}
                      onChange={(e) => {
                        const updated = [...editChapters];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setEditChapters(updated);
                      }}
                      className="flex-1 px-2 py-1 rounded-sm bg-background border border-input text-foreground text-xs focus:outline-none focus:border-primary"
                    />
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground font-mono w-16 flex-shrink-0">
                      {ch.timestamp}
                    </span>
                    <span className="text-foreground/80">{ch.name}</span>
                  </>
                )}
              </div>
            ))}
            {chapters.length === 0 && !isEditing && (
              <span className="text-xs text-muted-foreground italic">No chapters detected</span>
            )}
          </div>
        </div>

        {/* Playlist */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">
            Playlist
          </label>
          {isEditing ? (
            <select
              value={editPlaylist}
              onChange={(e) => setEditPlaylist(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-md text-sm bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value={1}>Playlist 1</option>
              <option value={2}>Playlist 2</option>
              <option value={3}>Playlist 3</option>
            </select>
          ) : (
            <span className="text-sm text-foreground/80">
              Playlist {topic?.playlist_group || '-'}
            </span>
          )}
        </div>

        {/* Thumbnail prompt (edit mode only) */}
        {isEditing && (
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">
              Thumbnail Prompt
            </label>
            <Textarea
              value={editThumbnailPrompt}
              onChange={(e) => setEditThumbnailPrompt(e.target.value)}
              rows={3}
              className="text-xs resize-y"
            />
          </div>
        )}

        {/* Save/Cancel buttons (edit mode) */}
        {isEditing && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Button
              onClick={handleSave}
              disabled={isUpdatePending}
              className="flex-1 gap-2"
              size="sm"
            >
              {isUpdatePending ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={cancelEditing}
              disabled={isUpdatePending}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!isPublished && (
        <div className="p-4 border-t border-border space-y-2">
          {!isEditing && (
            <Button
              variant="secondary"
              className="w-full gap-2"
              size="sm"
              onClick={startEditing}
              data-testid="edit-metadata-btn"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Metadata
            </Button>
          )}

          <Button
            onClick={onApprove}
            className="w-full gap-2 bg-gradient-to-r from-primary to-accent text-accent-foreground shadow-glow-primary hover:shadow-glow-primary-lg transition-all"
            data-testid="approve-btn"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </Button>

          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={onReject}
            data-testid="reject-btn"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </Button>

          {isFailed && (
            <Button
              variant="outline"
              className="w-full gap-2 text-warning border-warning-border hover:bg-warning-bg"
              onClick={onRetryUpload}
              disabled={isRetryPending}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetryPending ? 'animate-spin' : ''}`} />
              Retry Upload
            </Button>
          )}

          <Button
            variant="ghost"
            className="w-full gap-2 text-muted-foreground"
            size="sm"
            onClick={() => onRegenThumbnail(metadata.thumbnail_prompt || '')}
            disabled={isRegenPending}
          >
            {isRegenPending ? (
              <span className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5" />
            )}
            Regenerate Thumbnail
          </Button>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(ms) {
  if (!ms && ms !== 0) return '0:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
